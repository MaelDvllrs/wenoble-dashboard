const express = require('express');
const db = require('../db');
const router = express.Router();



const apiKeyMiddleware = (req, res, next) => {
    const apiKey = req.body.apiKey;
    const mail = req.body.mail;

    
    if (!apiKey) {
        return res.status(401).json({ message: 'Clé API ou ID de data manquant.' });
    }

    const SQL = 'SELECT id_user FROM users WHERE cle_api = ?';
    const Values = [apiKey];

    db.query(SQL, Values, (err, results) => {
        if (err) {
            res.send({ error: err });
        }

        if (results.length > 0) {
            req.apiKey = apiKey;
            req.mail = mail;
            next();
        } else {
            return res.status(403).json({ message: 'Clé API invalide.' });
        }
    });
};

router.post ('/signUpNewsletter', apiKeyMiddleware, async (req, res) => {
    const apiKey = req.apiKey;
    const mail = req.mail
    const dateSend = new Date();

    const SQL = 'SELECT id_user FROM users WHERE cle_api = ?';
    const Values = [apiKey];

    db.query(SQL, Values, async (err, results) => {
        if (err) {
            return res.send({ error: err });
        }
        const idUser = results[0].id_user;

        console.log('Mail:', mail, 'ID User:', idUser);

        const verifySQL = 'SELECT * FROM newsletter_website WHERE mail = ? AND id_user = ?';
        const verifyValues = [mail, idUser];

        db.query(verifySQL, verifyValues, (err, results) => {
            if (err) {
                return res.send({ error: err });
            }

            if (results.length > 0) {
                return res.status(409).json({ message: 'mail déjà enregistré.' });
            }

            const insertSQL = 'INSERT INTO newsletter_website (id_user, mail, date) VALUES (?, ?, ?)';
            const insertValues = [idUser, mail, dateSend];

            db.query(insertSQL, insertValues, (err, results) => {
                if (err) {
                    return res.send({ error: err });
                }

                res.status(200).json({ message: 'mail enregistré' });
            });
        });
    });
});


module.exports = router;
