/**
 * Générateur d'instructions DNS personnalisées par hébergeur
 */
class DNSConfigurationGenerator {
  
  /**
   * Génère les instructions DNS complètes pour un domaine
   */
  static generateInstructions(domain, targetCNAME, userAgent = '') {
    const config = {
      domain,
      target: targetCNAME,
      type: 'CNAME',
      ttl: 300
    };

    // Détecter l'hébergeur potentiel
    const detectedProvider = this.detectProvider(domain, userAgent);

    return {
      basic_config: {
        type: 'CNAME',
        name: '@',
        content: targetCNAME,
        ttl: 300
      },
      
      providers: this.generateProviderInstructions(config),
      
      detected_provider: detectedProvider,
      
      verification: {
        commands: [
          `nslookup ${domain} 8.8.8.8`,
          `dig ${domain} @1.1.1.1 CNAME`
        ],
        online_tools: [
          `https://dnschecker.org/all-dns-records-of-domain.php?query=${domain}&rtype=CNAME`,
          `https://whatsmydns.net/#CNAME/${domain}`
        ]
      },

      expected_propagation: {
        minimum: '15 minutes',
        maximum: '4 heures',
        average: '30 minutes'
      }
    };
  }

  /**
   * Instructions spécifiques par hébergeur
   */
  static generateProviderInstructions(config) {
    return {
      hostinger: {
        name: 'Hostinger',
        logo: '🟠',
        steps: [
          'Connectez-vous à votre Panel Hostinger',
          'Allez dans "Domaines" > "Gestion DNS"',
          `Recherchez votre domaine "${config.domain}"`,
          'Cliquez "Gérer"',
          'Supprimez les anciens enregistrements A si présents',
          'Cliquez "Ajouter un nouvel enregistrement"',
          'Sélectionnez Type: "CNAME"',
          'Nom/Host: "@" (ou laissez vide)',
          `Pointe vers: "${config.target}"`,
          'TTL: "300" ou "Auto"',
          'Cliquez "Ajouter l\'enregistrement"'
        ],
        propagation_time: '15-60 minutes'
      },

      ovh: {
        name: 'OVH',
        logo: '🔵',
        steps: [
          'Connectez-vous à votre Manager OVH',
          'Allez dans "Domaines" > "Zone DNS"',
          `Sélectionnez "${config.domain}"`,
          'Supprimez les enregistrements A existants',
          'Cliquez "Ajouter une entrée"',
          'Choisissez "CNAME"',
          'Sous-domaine: (laissez vide pour @)',
          `Cible: "${config.target}."`,
          'TTL: "300"',
          'Validez et appliquez'
        ],
        propagation_time: '30 minutes - 4 heures'
      },

      cloudflare: {
        name: 'Cloudflare',
        logo: '🟡',
        steps: [
          'Connectez-vous à votre Dashboard Cloudflare',
          'Sélectionnez votre domaine',
          'Allez dans l\'onglet "DNS"',
          'Supprimez les enregistrements A existants',
          'Cliquez "Ajouter un enregistrement"',
          'Type: "CNAME"',
          'Nom: "@"',
          `Contenu: "${config.target}"`,
          'Proxy: ✅ (Orange, Proxied)',
          'TTL: "Auto"',
          'Cliquez "Sauvegarder"'
        ],
        propagation_time: '5-15 minutes'
      },

      namecheap: {
        name: 'Namecheap',
        logo: '🟢',
        steps: [
          'Connectez-vous à votre compte Namecheap',
          'Allez dans "Account" > "Domain List"',
          `Trouvez "${config.domain}" et cliquez "Manage"`,
          'Onglet "Advanced DNS"',
          'Supprimez les Host Records de type "A"',
          'Cliquez "Add New Record"',
          'Type: "CNAME Record"',
          'Host: "@"',
          `Value: "${config.target}"`,
          'TTL: "Automatic"',
          'Sauvegardez'
        ],
        propagation_time: '30 minutes - 2 heures'
      },

      godaddy: {
        name: 'GoDaddy',
        logo: '⚫',
        steps: [
          'Connectez-vous à GoDaddy',
          'Allez dans "Mes Produits"',
          `Trouvez "${config.domain}" et cliquez "DNS"`,
          'Supprimez les enregistrements A',
          'Cliquez "Ajouter"',
          'Type: "CNAME"',
          'Nom: "@"',
          `Valeur: "${config.target}"`,
          'TTL: "1 Heure"',
          'Enregistrez'
        ],
        propagation_time: '1-4 heures'
      },

      generic: {
        name: 'Autre hébergeur',
        logo: '🌐',
        steps: [
          'Connectez-vous à votre panneau de gestion DNS',
          `Trouvez la zone DNS pour "${config.domain}"`,
          'Supprimez tous les enregistrements A existants',
          'Créez un nouvel enregistrement:',
          '  • Type: CNAME',
          '  • Nom/Host: @ (domaine racine)',
          `  • Valeur/Target: ${config.target}`,
          '  • TTL: 300 secondes (5 minutes)',
          'Sauvegardez les modifications',
          'Attendez la propagation DNS'
        ],
        propagation_time: '15 minutes - 4 heures'
      }
    };
  }

  /**
   * Détecte l'hébergeur potentiel basé sur le domaine ou user-agent
   */
  static detectProvider(domain, userAgent = '') {
    // Analyse des serveurs DNS pour détecter l'hébergeur
    const commonProviders = [
      { name: 'hostinger', keywords: ['hostinger', 'hostinger.com'] },
      { name: 'ovh', keywords: ['ovh', 'ovh.net', 'ovh.com'] },
      { name: 'cloudflare', keywords: ['cloudflare', 'cloudflare.com'] },
      { name: 'namecheap', keywords: ['namecheap', 'registrar-servers.com'] },
      { name: 'godaddy', keywords: ['godaddy', 'domaincontrol.com'] }
    ];

    const searchText = (domain + ' ' + userAgent).toLowerCase();
    
    for (const provider of commonProviders) {
      if (provider.keywords.some(keyword => searchText.includes(keyword))) {
        return provider.name;
      }
    }

    return 'generic';
  }

  /**
   * Génère le HTML d'aide pour l'utilisateur
   */
  static generateHTML(instructions) {
    const provider = instructions.providers[instructions.detected_provider] || instructions.providers.generic;
    
    return `
      <div class="dns-configuration">
        <div class="config-summary">
          <h3>📋 Configuration DNS Requise</h3>
          <div class="config-box">
            <strong>Type:</strong> ${instructions.basic_config.type}<br>
            <strong>Nom:</strong> ${instructions.basic_config.name}<br>
            <strong>Valeur:</strong> ${instructions.basic_config.content}<br>
            <strong>TTL:</strong> ${instructions.basic_config.ttl} secondes
          </div>
        </div>

        <div class="provider-instructions">
          <h4>${provider.logo} Instructions ${provider.name}</h4>
          <ol>
            ${provider.steps.map(step => `<li>${step}</li>`).join('')}
          </ol>
          <p><strong>⏱️ Temps de propagation:</strong> ${provider.propagation_time}</p>
        </div>

        <div class="verification-tools">
          <h4>🔍 Vérification</h4>
          <p>Utilisez ces commandes pour vérifier:</p>
          <code>${instructions.verification.commands[0]}</code><br>
          <p>Ou ces outils en ligne:</p>
          <a href="${instructions.verification.online_tools[0]}" target="_blank">DNS Checker</a>
        </div>
      </div>
    `;
  }
}

module.exports = DNSConfigurationGenerator;