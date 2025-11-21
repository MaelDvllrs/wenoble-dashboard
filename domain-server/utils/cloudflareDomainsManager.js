const axios = require('axios');

/**
 * Configuration automatique des Custom Domains Cloudflare Pages
 */
class CloudflareDomainsManager {
  constructor() {
    this.apiToken = process.env.CLOUDFLARE_API_TOKEN;
    this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    this.baseURL = 'https://api.cloudflare.com/client/v4';
  }

  /**
   * Crée un nouveau projet Cloudflare Pages
   */
  async createPagesProject(projectName) {
    try {
      console.log(`[Cloudflare] Création du projet Pages: ${projectName}`);

      const response = await axios.post(
        `${this.baseURL}/accounts/${this.accountId}/pages/projects`,
        {
          name: projectName,
          production_branch: 'main'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        console.log(`[Cloudflare] ✅ Projet ${projectName} créé avec succès`);
        return {
          success: true,
          project: response.data.result
        };
      } else {
        console.error(`[Cloudflare] ❌ Erreur création projet:`, response.data.errors);
        return { 
          success: false, 
          error: 'Erreur lors de la création du projet',
          details: response.data.errors 
        };
      }

    } catch (error) {
      // Si le projet existe déjà (code 8000007), on considère que c'est un succès
      if (error.response?.data?.errors?.[0]?.code === 8000007) {
        console.log(`[Cloudflare] ℹ️ Projet ${projectName} existe déjà`);
        return { success: true, already_exists: true };
      }

      console.error(`[Cloudflare] ❌ Exception création projet:`, error.message);
      return { 
        success: false, 
        error: error.response?.data?.errors?.[0]?.message || error.message 
      };
    }
  }

  /**
   * Vérifie si un projet existe
   */
  async projectExists(projectName) {
    try {
      const response = await axios.get(
        `${this.baseURL}/accounts/${this.accountId}/pages/projects/${projectName}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.success;
    } catch (error) {
      if (error.response?.status === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Ajoute automatiquement un custom domain à un projet Cloudflare Pages
   */
  async addCustomDomain(projectName, customDomain) {
    try {
      console.log(`[Cloudflare] Configuration custom domain ${customDomain} pour projet ${projectName}`);

      const response = await axios.post(
        `${this.baseURL}/accounts/${this.accountId}/pages/projects/${projectName}/domains`,
        {
          name: customDomain
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        console.log(`[Cloudflare] ✅ Custom domain ${customDomain} ajouté avec succès`);
        
        // Informations de configuration DNS
        const domainInfo = response.data.result;
        console.log(`[Cloudflare] Configuration DNS requise:`, domainInfo.verification_data);
        
        return {
          success: true,
          domain: customDomain,
          project: projectName,
          verification: domainInfo.verification_data,
          status: domainInfo.status
        };
      } else {
        console.error(`[Cloudflare] ❌ Erreur lors de l'ajout du domaine:`, response.data.errors);
        return { success: false, errors: response.data.errors };
      }

    } catch (error) {
      console.error(`[Cloudflare] ❌ Exception lors de l'ajout du custom domain:`, error.message);
      
      if (error.response?.data?.errors) {
        // Domaine déjà configuré
        if (error.response.data.errors.some(e => e.code === 8000)) {
          console.log(`[Cloudflare] ℹ️ Domaine ${customDomain} déjà configuré`);
          return { success: true, alreadyExists: true };
        }
      }
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Vérifie le statut d'un custom domain
   */
  async checkDomainStatus(projectName, customDomain) {
    try {
      const response = await axios.get(
        `${this.baseURL}/accounts/${this.accountId}/pages/projects/${projectName}/domains`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        const domains = response.data.result;
        const domain = domains.find(d => d.name === customDomain);
        
        if (domain) {
          return {
            success: true,
            status: domain.status,
            verification: domain.verification_data
          };
        } else {
          return { success: false, error: 'Domaine non trouvé' };
        }
      }

    } catch (error) {
      console.error(`[Cloudflare] Erreur vérification statut domaine:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Supprime un custom domain (si nécessaire)
   */
  async removeCustomDomain(projectName, customDomain) {
    try {
      const response = await axios.delete(
        `${this.baseURL}/accounts/${this.accountId}/pages/projects/${projectName}/domains/${customDomain}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        console.log(`[Cloudflare] ✅ Custom domain ${customDomain} supprimé`);
        return { success: true };
      }

    } catch (error) {
      console.error(`[Cloudflare] Erreur suppression domaine:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Auto-configuration lors de la création d'un website
   */
  async autoConfigureWebsite(website) {
    const { website_slug, folder_project } = website;
    
    // Vérifier si c'est un domaine custom (pas ngrok, pas pages.dev)
    if (this.isCustomDomain(website_slug)) {
      console.log(`[Auto-Config] Configuration automatique pour ${website_slug}`);
      
      const result = await this.addCustomDomain(folder_project, website_slug);
      
      if (result.success) {
        // Mettre à jour la base avec les infos de configuration
        return {
          success: true,
          domain: website_slug,
          cloudflare_configured: true,
          dns_instructions: result.verification
        };
      }
    }
    
    return { success: false, reason: 'Pas un domaine custom' };
  }

  /**
   * Vérifie si c'est un domaine custom (pas ngrok, pas pages.dev)
   */
  isCustomDomain(domain) {
    const excludePatterns = [
      '.ngrok.io',
      '.ngrok-free.app',
      '.pages.dev',
      'localhost',
      '127.0.0.1'
    ];
    
    return !excludePatterns.some(pattern => domain.includes(pattern));
  }
}

module.exports = CloudflareDomainsManager;