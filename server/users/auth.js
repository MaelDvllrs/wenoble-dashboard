const express = require('express');
const jwt = require('jsonwebtoken');
const mysql = require('mysql');
const db = require('../db'); 
const cors = require('cors')
const crypto = require('crypto');
const CryptoJS = require("crypto-js");
const bcrypt = require('bcryptjs');
const axios = require('axios');
const { format } = require('date-fns');




require('dotenv').config();
const secretKey = process.env.SECRET_KEY; 





const router = express.Router();

router.use(cors())
router.use(express.json());



const getIpAddress = (req) => {
  return req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;
};


const getGeoLocation = async (ip) => {
  try {
      const response = await axios.get(`http://ipinfo.io/${ip}/json`);
      return response.data;
  } catch (error) {
      console.error("Error fetching geolocation:", error);
      return null;
  }
};

const logConnectionAttempt = async (req) => {
  const ip = getIpAddress(req);
  const geoLocation = await getGeoLocation(ip);

  console.log(getFormattedDate(Date.now()) + " | Connection attempt from " + ip + " with username " + req.body.LoginUserName);

  if (geoLocation) {
      console.log("Location: " + geoLocation.city + ", " + geoLocation.region + ", " + geoLocation.country);
  }
};

const getFormattedDate = () => {
  return format(new Date(), 'dd/MM/yyyy HH:mm:ss');
};





router.post('/login', async (req, res) => {

  await logConnectionAttempt(req);
  const sentLoginUsername = req.body.LoginUserName;
  const sentLoginPassword = req.body.LoginPassword;
  const salt = req.body.salt


  // Utilisez le buffer comme sel pour crypto.pbkdf2
  const key = CryptoJS.PBKDF2(sentLoginUsername, salt, { keySize: 256 / 32, iterations: 1000 });
  
  const keyString = key.toString(CryptoJS.enc.Base64);
  const decrypted = CryptoJS.AES.decrypt(sentLoginPassword, keyString, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7
  }).toString(CryptoJS.enc.Utf8);
  
  


  const SQL = 'SELECT username, id_user, admin, password FROM users WHERE username = ?';
  const Values = [sentLoginUsername];

  db.query(SQL, Values, (err, results) => {
    if (err) {
      return res.send({ error: err });
    }

    if (results && results.length > 0) {
      const user = results[0];


      bcrypt.compare(decrypted, user.password, function(err, result) {
        if (result == true) {
          const idUser = user.id_user;
          const admin = user.admin === 1;

          const token = jwt.sign(
            { idUser: idUser, username: sentLoginUsername, isAdmin: admin },
            secretKey
          );


          res.send({ token });
        } else {
          res.send({ message: 'Utilisateur ou mot de passe incorrect' });
        }
      });
    } else {
      res.send({ message: 'Utilisateur ou mot de passe incorrect' });
    }
  });
});

router.post('/auth/verify', (req, res) => {
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