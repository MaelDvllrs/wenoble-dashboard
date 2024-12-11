const jwt = require('jsonwebtoken');
require('dotenv').config();

const secretKey = process.env.SECRET_KEY;

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];  

  if (token == null) return res.sendStatus(401); // Si aucun token n'est fourni

  console.log("token" ,token);
  jwt.verify(token, secretKey, (err, user) => {
    if (err) return res.sendStatus(403); // Si le token est invalide
    req.user = user;
    next(); // Passe à la route suivante
  });
};

module.exports = authenticateToken;