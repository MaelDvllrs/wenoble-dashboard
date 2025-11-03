const { supabaseServer } = require('../supabase');

// Middleware pour vérifier le token et extraire l'ID utilisateur
const authenticateToken = async (req, res, next) => {
  // Ignorer l'authentification pour les routes de l'API externe
  if (req.path.startsWith('/external-api') || req.originalUrl.includes('/external-api')) {
    console.log('Ignoring auth for external API route:', req.path);
    return next();
  }

  // Ignorer aussi si c'est une requête avec une clé API (headers x-api-key ou api-key)
  if (req.headers['x-api-key'] || req.headers['api-key']) {
    console.log('Ignoring auth for API key request');
    return next();
  }

  // Récupérer le token de l'en-tête Authorization
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Format "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ error: 'Accès refusé. Token manquant.' });
  }

  try {
    const supabase = supabaseServer(token);
    // Vérifier le token avec Supabase
    const { data, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Erreur de vérification du token:', error);
      return res.status(401).json({ error: 'Token invalide ou expiré.' });
    }
    
    // Ajouter les informations utilisateur à l'objet req pour utilisation dans les routes
    req.user = { 
      idUser: data.user.id,
      email: data.user.email
    };
    
    // Continuer avec la requête
    next();
  } catch (error) {
    console.error('Erreur d\'authentification:', error);
    return res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
};

module.exports = {
  authenticateToken
};