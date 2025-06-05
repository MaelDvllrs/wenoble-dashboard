const { supabaseServer } = require('../supabase');

// Middleware pour vérifier le token et extraire l'ID utilisateur
const authenticateToken = async (req, res, next) => {
  // Récupérer le token de l'en-tête Authorization
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Format "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ error: 'Accès refusé. Token manquant.' });
  }

  try {
    const supabase = supabaseServer(token);
    // Vérifier le token avec Supabase
    const { data, error } = await supabase.auth.getUser(token);
    
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