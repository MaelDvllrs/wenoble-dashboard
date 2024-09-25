const express = require('express');
const cors = require('cors');
const db = require('../db');
const router = express.Router();
const jwt = require('jsonwebtoken');

require('dotenv').config();
const secretKey = process.env.SECRET_KEY; 

router.use(cors());
router.use(express.json());


router.get('/getMessage', async (req, res) => {
    const iduser = req.query.idUser

    const SQL = 'SELECT id_message, mail_sender, subject, date FROM contact_website WHERE id_user = ?'
    const Values = [iduser]

    db.query(SQL, Values, (err, results)=>{
        if (err) {
            res.send({ error: err })
            return;
        }
        const message = results
        const messageCrypt = jwt.sign({ message: message }, secretKey)
        res.send(messageCrypt)
    })
});

router.get('/getMessageDetail', async (req, res) => {
    const idMessage = req.query.idMessage
    const idUser = req.query.idUser

    const SQL = 'SELECT mail_sender, subject, html, date  FROM contact_website WHERE id_message = ? AND id_user = ?'
    const Values = [idMessage, idUser]

    db.query(SQL, Values, (err, results)=>{
        if (err) {
            res.send({ error: err })
            return;
        }
        const message = results
        const messageCrypt = jwt.sign({ message: message }, secretKey)
        res.send(messageCrypt)
    })
});

module.exports = router;
