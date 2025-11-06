/**
 * Script de test pour la configuration des domaines Cloudflare
 * Usage: node test-cloudflare-config.js
 */

require('dotenv').config();
const { addCustomDomain, listCustomDomains, getDomainStatus } = require('./cloudflare/cloudflareDomains');

// Couleurs pour le terminal
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m'
};

function log(color, message) {
    console.log(`${color}${message}${colors.reset}`);
}

async function testCloudflareConfig() {
    console.log('\n=== Test de Configuration Cloudflare ===\n');

    // 1. Vérifier les variables d'environnement
    log(colors.blue, '1. Vérification des variables d\'environnement...');
    
    if (!process.env.CLOUDFLARE_ACCOUNT_ID) {
        log(colors.red, '❌ CLOUDFLARE_ACCOUNT_ID manquant dans .env');
        return;
    }
    log(colors.green, `✅ CLOUDFLARE_ACCOUNT_ID: ${process.env.CLOUDFLARE_ACCOUNT_ID.substring(0, 8)}...`);

    if (!process.env.CLOUDFLARE_API_TOKEN) {
        log(colors.red, '❌ CLOUDFLARE_API_TOKEN manquant dans .env');
        return;
    }
    log(colors.green, `✅ CLOUDFLARE_API_TOKEN: ${process.env.CLOUDFLARE_API_TOKEN.substring(0, 8)}...`);

    // 2. Demander le nom du projet à tester
    console.log('\n' + colors.yellow + 'Pour tester la configuration, vous avez besoin:' + colors.reset);
    console.log('  - Un nom de projet Cloudflare Pages existant');
    console.log('  - Un domaine de test (peut être invalide pour ce test)');
    console.log('\nExemple: node test-cloudflare-config.js mon-site-test test.example.com\n');

    const projectName = process.argv[2];
    const testDomain = process.argv[3];

    if (!projectName || !testDomain) {
        log(colors.yellow, 'Usage: node test-cloudflare-config.js <project-name> <test-domain>');
        log(colors.yellow, 'Exemple: node test-cloudflare-config.js mon-site test.example.com');
        return;
    }

    log(colors.blue, `\n2. Test avec le projet "${projectName}" et domaine "${testDomain}"...`);

    try {
        // 3. Lister les domaines existants
        log(colors.blue, '\n3. Liste des domaines actuels...');
        const listResult = await listCustomDomains(projectName);
        if (listResult.domains.length > 0) {
            log(colors.green, `✅ Domaines trouvés (${listResult.domains.length}):`);
            listResult.domains.forEach(d => {
                console.log(`   - ${d.name} (status: ${d.status || 'unknown'})`);
            });
        } else {
            log(colors.yellow, '⚠️  Aucun domaine configuré pour ce projet');
        }

        // 4. Tenter d'ajouter le domaine de test
        log(colors.blue, '\n4. Tentative d\'ajout du domaine de test...');
        log(colors.yellow, '⚠️  Attention: Ceci va réellement ajouter le domaine à Cloudflare!');
        log(colors.yellow, '   Annulez avec Ctrl+C si vous ne voulez pas continuer...');
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const addResult = await addCustomDomain(projectName, testDomain);
        log(colors.green, `✅ Domaine ajouté avec succès!`);
        console.log('   Résultat:', JSON.stringify(addResult, null, 2));

        // 5. Vérifier le statut
        log(colors.blue, '\n5. Vérification du statut du domaine...');
        const statusResult = await getDomainStatus(projectName, testDomain);
        log(colors.green, '✅ Statut récupéré:');
        console.log('   ', JSON.stringify(statusResult.status, null, 2));

        log(colors.green, '\n✅ Tous les tests ont réussi!');
        log(colors.yellow, '\n⚠️  N\'oubliez pas de supprimer le domaine de test si nécessaire.');

    } catch (error) {
        log(colors.red, `\n❌ Erreur: ${error.message}`);
        console.error('\nDétails:', error);
        
        if (error.message.includes('Project not found')) {
            log(colors.yellow, '\n💡 Le projet n\'existe pas dans Cloudflare Pages.');
            log(colors.yellow, '   Vérifiez le nom exact dans votre dashboard Cloudflare.');
        } else if (error.message.includes('Variables d\'environnement')) {
            log(colors.yellow, '\n💡 Configurez CLOUDFLARE_ACCOUNT_ID et CLOUDFLARE_API_TOKEN dans .env');
        } else if (error.message.includes('Invalid request')) {
            log(colors.yellow, '\n💡 Vérifiez que votre API token a les bonnes permissions.');
            log(colors.yellow, '   Permission requise: Account > Cloudflare Pages > Edit');
        }
    }
}

// Exécuter les tests
testCloudflareConfig().catch(error => {
    log(colors.red, `\n❌ Erreur fatale: ${error.message}`);
    console.error(error);
    process.exit(1);
});
