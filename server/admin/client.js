const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors')
const bcrypt = require('bcryptjs');
const saltRounds = 10;
const crypto = require('crypto');



const db = require('../db');

const router = express.Router();

router.use(cors())
router.use(express.json());


router.get('/getClients', (req, res) => {
  const SQL = 'SELECT id_user, username, website FROM users where admin = 0'
  db.query(SQL, (err, results) => {
    if (err) {
      res.send({ error: err })
      return;
    }
    res.send(results)
  })
});

router.post('/SaveClient', (req, res) => {
  
  console.log(req.body.params.fields)
  const fields = req.body.params.fields

  const cle_api = 'API' + Date.now() + fields.username

  const password = crypto.randomBytes(8).toString('hex');

  bcrypt.hash(password, saltRounds, function(err, hash) {
    if (err) {
      res.send({ error: err });
      return;
    }

    const hashPassword = hash;
    console.log("mot de passe : " + password)

    const SQL = 'INSERT INTO users (username, email, website, password, admin, cle_api) VALUES (?, ?, ?, ?, ?, ?)';

    const values = [fields.username, fields.email, fields.website, hashPassword, fields.isAdmin, cle_api];

    db.query(SQL, values, (err, results) => {
      if (err) {
        res.send({ error: err });
        return;
      }
      res.send(results)
    });

  });

});

module.exports = router;



