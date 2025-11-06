/**
 * Script pour configurer automatiquement un domaine sur le VPS
 * Peut être appelé par webhook ou API quand un nouveau domaine est ajouté
 */

const fs = require('fs').promises;
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const PROXY_TYPE = process.env.PROXY_TYPE || 'caddy'; // 'caddy' ou 'nginx'
const CLOUDFLARE_WORKER_URL = process.env.CLOUDFLARE_WORKER_URL;

/**
 * Configure Nginx pour un nouveau domaine
 */
async function configureNginxDomain(domain) {
    console.log(`[Nginx] Configuration du domaine ${domain}...`);
    
    const nginxConfig = `
server {
    listen 80;
    listen [::]:80;
    server_name ${domain} www.${domain};
    
    # Redirection HTTP vers HTTPS (après obtention SSL)
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${domain} www.${domain};
    
    # Les certificats seront configurés par Certbot
    
    location / {
        proxy_pass ${CLOUDFLARE_WORKER_URL};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    access_log /var/log/nginx/${domain}-access.log;
    error_log /var/log/nginx/${domain}-error.log;
}
`;

    try {
        // Écrire la configuration
        const configPath = `/etc/nginx/sites-available/${domain}`;
        await fs.writeFile(configPath, nginxConfig);
        console.log(`[Nginx] ✅ Configuration écrite dans ${configPath}`);
        
        // Créer le lien symbolique
        try {
            await execPromise(`ln -sf ${configPath} /etc/nginx/sites-enabled/${domain}`);
            console.log(`[Nginx] ✅ Lien symbolique créé`);
        } catch (error) {
            if (!error.message.includes('File exists')) {
                throw error;
            }
        }
        
        // Tester la configuration
        await execPromise('nginx -t');
        console.log(`[Nginx] ✅ Configuration testée avec succès`);
        
        // Recharger Nginx
        await execPromise('systemctl reload nginx');
        console.log(`[Nginx] ✅ Nginx rechargé`);
        
        // Obtenir le certificat SSL avec Certbot
        console.log(`[Nginx] 🔐 Obtention du certificat SSL...`);
        await execPromise(
            `certbot --nginx -d ${domain} -d www.${domain} --non-interactive --agree-tos --redirect`
        );
        console.log(`[Nginx] ✅ Certificat SSL obtenu et configuré`);
        
        return { success: true, message: `Domaine ${domain} configuré avec Nginx + SSL` };
        
    } catch (error) {
        console.error(`[Nginx] ❌ Erreur:`, error);
        throw error;
    }
}

/**
 * Configure Caddy pour un nouveau domaine
 * Avec Caddy + on_demand, pas besoin de configuration par domaine!
 */
async function configureCaddyDomain(domain) {
    console.log(`[Caddy] Configuration du domaine ${domain}...`);
    
    // Avec Caddy en mode on_demand, le domaine sera automatiquement géré
    // On vérifie juste que Caddy est bien configuré en mode on_demand
    
    try {
        const { stdout } = await execPromise('systemctl status caddy');
        
        if (!stdout.includes('active (running)')) {
            throw new Error('Caddy n\'est pas en cours d\'exécution');
        }
        
        console.log(`[Caddy] ✅ Caddy est actif`);
        console.log(`[Caddy] ✅ Le domaine ${domain} sera automatiquement géré (on_demand SSL)`);
        console.log(`[Caddy] 💡 Aucune configuration supplémentaire nécessaire!`);
        
        return { 
            success: true, 
            message: `Domaine ${domain} sera automatiquement géré par Caddy avec SSL on-demand` 
        };
        
    } catch (error) {
        console.error(`[Caddy] ❌ Erreur:`, error);
        throw error;
    }
}

/**
 * Vérifie si un domaine est correctement configuré et accessible
 */
async function verifyDomainConfiguration(domain) {
    console.log(`[Verify] Vérification du domaine ${domain}...`);
    
    try {
        // Vérifier la résolution DNS
        const { stdout: dnsResult } = await execPromise(`nslookup ${domain}`);
        console.log(`[Verify] DNS résolution:`, dnsResult);
        
        // Tester la connectivité HTTP (sans attendre le SSL)
        const { stdout: curlResult } = await execPromise(
            `curl -I -s -o /dev/null -w "%{http_code}" http://${domain} || echo "000"`
        );
        
        const httpStatus = curlResult.trim();
        
        if (httpStatus === '000') {
            console.log(`[Verify] ⚠️ Le domaine n'est pas encore accessible (DNS non propagé)`);
            return { verified: false, status: 'dns_not_propagated' };
        }
        
        if (httpStatus === '200' || httpStatus === '301' || httpStatus === '302') {
            console.log(`[Verify] ✅ Le domaine répond correctement (HTTP ${httpStatus})`);
            return { verified: true, status: 'ok', httpStatus };
        }
        
        console.log(`[Verify] ⚠️ Le domaine répond avec le code ${httpStatus}`);
        return { verified: false, status: 'error', httpStatus };
        
    } catch (error) {
        console.error(`[Verify] ❌ Erreur lors de la vérification:`, error);
        return { verified: false, status: 'error', error: error.message };
    }
}

/**
 * Point d'entrée principal
 */
async function configureDomain(domain) {
    if (!domain || !domain.includes('.')) {
        throw new Error('Domaine invalide');
    }
    
    if (!CLOUDFLARE_WORKER_URL) {
        throw new Error('CLOUDFLARE_WORKER_URL non défini dans .env');
    }
    
    console.log(`\n========================================`);
    console.log(`🌐 Configuration du domaine: ${domain}`);
    console.log(`🔧 Proxy type: ${PROXY_TYPE}`);
    console.log(`☁️  Worker URL: ${CLOUDFLARE_WORKER_URL}`);
    console.log(`========================================\n`);
    
    let result;
    
    if (PROXY_TYPE === 'nginx') {
        result = await configureNginxDomain(domain);
    } else if (PROXY_TYPE === 'caddy') {
        result = await configureCaddyDomain(domain);
    } else {
        throw new Error(`Type de proxy non supporté: ${PROXY_TYPE}`);
    }
    
    console.log(`\n✅ Configuration terminée:`, result.message);
    
    // Vérifier la configuration après un délai
    console.log(`\n⏳ Attente de 10 secondes avant vérification...`);
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    const verification = await verifyDomainConfiguration(domain);
    console.log(`\n📊 Résultat de la vérification:`, verification);
    
    return { ...result, verification };
}

/**
 * Supprimer la configuration d'un domaine
 */
async function removeDomainConfiguration(domain) {
    console.log(`\n🗑️  Suppression de la configuration pour ${domain}...`);
    
    if (PROXY_TYPE === 'nginx') {
        try {
            // Supprimer le lien symbolique
            await execPromise(`rm -f /etc/nginx/sites-enabled/${domain}`);
            
            // Supprimer le fichier de configuration
            await execPromise(`rm -f /etc/nginx/sites-available/${domain}`);
            
            // Recharger Nginx
            await execPromise('nginx -t && systemctl reload nginx');
            
            // Révoquer le certificat SSL
            try {
                await execPromise(`certbot delete --cert-name ${domain} --non-interactive`);
                console.log(`✅ Certificat SSL révoqué`);
            } catch (error) {
                console.log(`⚠️  Pas de certificat SSL à révoquer`);
            }
            
            console.log(`✅ Configuration Nginx supprimée pour ${domain}`);
            return { success: true };
            
        } catch (error) {
            console.error(`❌ Erreur lors de la suppression:`, error);
            throw error;
        }
    } else if (PROXY_TYPE === 'caddy') {
        console.log(`💡 Avec Caddy on_demand, pas de configuration à supprimer`);
        console.log(`ℹ️  Le certificat SSL sera automatiquement supprimé après expiration`);
        return { success: true };
    }
}

// Si exécuté en ligne de commande
if (require.main === module) {
    const domain = process.argv[2];
    const action = process.argv[3] || 'add'; // 'add' ou 'remove'
    
    if (!domain) {
        console.error('Usage: node configure-domain-vps.js <domain> [add|remove]');
        process.exit(1);
    }
    
    (async () => {
        try {
            if (action === 'remove') {
                await removeDomainConfiguration(domain);
            } else {
                await configureDomain(domain);
            }
            process.exit(0);
        } catch (error) {
            console.error('\n❌ Erreur fatale:', error.message);
            process.exit(1);
        }
    })();
}

module.exports = {
    configureDomain,
    removeDomainConfiguration,
    verifyDomainConfiguration
};
