const express = require('express');
const jwt = require('jsonwebtoken');
const mysql = require('mysql');
const db = require('../db'); // Assurez-vous que le chemin est correct
const cors = require('cors')

const router = express.Router();

router.use(cors())
router.use(express.json());


const secretKey = 'AUBUKBSAKBDKUDKUADUBYDKUABDAKUDNKAUBDYKAUDNAKUDBAK'; // Remplacez par votre clé secrète

router.post('/login', (req, res) => {

  console.log(req.body);
  const sentLoginUsername = req.body.LoginUserName;
  const sentLoginPassword = req.body.LoginPassword;

  const SQL = 'SELECT username, id_user, admin FROM users WHERE username = ? && password = ?';
  const Values = [sentLoginUsername, sentLoginPassword];

  db.query(SQL, Values, (err, results) => {
    if (err) {
      res.send({ error: err });
    }
    if (results.length > 0) {
      const user = results[0];
      const idUser = user.id_user;
      const admin = user.admin === 1;
      console.log("utilisateur trouvé")

      const token = jwt.sign(
        { idUser: idUser, username: sentLoginUsername, isAdmin: admin },
        secretKey
      );

      res.send({ token });
    } else {
      res.send({ message: 'Utilisateur introuvable' });
    }
  });
});

router.post('/api/auth/verify', (req, res) => {
  const token = req.body.token;

  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, secretKey);
    return res.status(200).json({ success: true, user: decoded });
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

module.exports = router;