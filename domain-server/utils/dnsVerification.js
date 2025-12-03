const dns = require('dns').promises;

/**
 * Vérifie si un domaine pointe vers notre VPS
 */
async function verifyDomainPointsToVPS(domain) {
  try {
    const vpsIP = process.env.VPS_IP;
    
    if (!vpsIP) {
      console.warn('[DNS] VPS_IP non configuré dans les variables d\'environnement');
      return { verified: false, reason: 'VPS_IP non configuré' };
    }

    console.log(`[DNS] Vérification du domaine ${domain} vers ${vpsIP}...`);

    // Résoudre le domaine principal
    const addresses = await dns.resolve4(domain);
    console.log(`[DNS] ${domain} pointe vers:`, addresses);

    const pointsToVPS = addresses.includes(vpsIP);

    if (pointsToVPS) {
      console.log(`[DNS] ✅ ${domain} pointe correctement vers le VPS (${vpsIP})`);
    } else {
      console.log(`[DNS] ❌ ${domain} ne pointe pas vers le VPS. Attendu: ${vpsIP}, Reçu: ${addresses.join(', ')}`);
    }

    // Vérifier aussi le sous-domaine www
    let wwwVerified = null;
    try {
      const wwwAddresses = await dns.resolve4(`www.${domain}`);
      const wwwPointsToVPS = wwwAddresses.includes(vpsIP);
      wwwVerified = {
        addresses: wwwAddresses,
        pointsToVPS: wwwPointsToVPS
      };
      console.log(`[DNS] www.${domain} pointe vers: ${wwwAddresses.join(', ')} (${wwwPointsToVPS ? '✅' : '❌'})`);
    } catch (wwwError) {
      console.log(`[DNS] www.${domain} non configuré ou erreur:`, wwwError.message);
    }

    return {
      verified: pointsToVPS,
      domain,
      vpsIP,
      resolvedIPs: addresses,
      www: wwwVerified,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error(`[DNS] Erreur lors de la vérification de ${domain}:`, error.message);
    
    return {
      verified: false,
      domain,
      error: error.message,
      reason: 'Erreur DNS ou domaine non résolu',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Vérifie la configuration DNS d'un domaine (version simplifiée pour logs)
 */
async function quickDNSCheck(domain) {
  try {
    const addresses = await dns.resolve4(domain);
    const vpsIP = process.env.VPS_IP;
    return {
      domain,
      addresses,
      pointsToVPS: vpsIP ? addresses.includes(vpsIP) : false
    };
  } catch (error) {
    return {
      domain,
      error: error.message,
      pointsToVPS: false
    };
  }
}

module.exports = {
  verifyDomainPointsToVPS,
  quickDNSCheck
};