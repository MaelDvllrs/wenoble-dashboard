const express = require('express');
const router = express.Router();
const db = require('./db'); 
const axios = require('axios');
const resend = require('resend'); 

const apiKeyMiddleware = (req, res, next) => {
    const apiKey = req.body.apiKey;
    const emailSender = req.body.emailSender;
    const subject = req.body.subject;
    const html = req.body.html;
    
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
            req.subject = subject;
            req.html = html;
            req.emailSender = emailSender;
            next();
        } else {
            return res.status(403).json({ message: 'Clé API invalide.' });
        }
    });
};

router.post('/sendEmail', apiKeyMiddleware, async (req, res) => {
    const apiKey = req.apiKey;
    const subject = req.subject;
    const html = req.html;
    const emailSender = req.emailSender;
    const dateSend = new Date();

    const serverUrl = process.env.SERVER_URL;

    const SQL = 'SELECT email, id_user FROM users WHERE cle_api = ?';
    const Values = [apiKey];

    db.query(SQL, Values, async (err, results) => {
        if (err) {
            return res.send({ error: err });
        }
        const to = results[0].email;
        const idUser = results[0].id_user;

        const insertSQL = 'INSERT INTO contact_website (id_user, mail_sender, subject, html, date) VALUES (?, ?, ?, ?, ?)';
        const insertValues = [idUser, emailSender, subject, html, dateSend];

        db.query(insertSQL, insertValues, async (err, results) => {
            if (err) {
                return res.send({ error: err });
            }
            await axios(`${serverUrl}/createNotification`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: {
                    IdUser: idUser,
                    Type: 'message',
                    Date: dateSend,
                    Message: `Message de ${emailSender} - ${subject}`,
                    IdElement: results.insertId
                }
            }).then((response) => {
                console.log('Notification créée :', response.data);
            }).catch((error) => {
                console.error('Erreur lors de la création de la notification :', error);
            });

            const { data, error } = await resend.emails.send({
                from: process.env.EMAIL_WEBSITE,
                to: [to],
                subject: subject,
                html: html,
            });

            if (error) {
                return res.status(400).json({ error });
            }

            res.status(200).json({ message: 'Email sent successfully', data });
        });
    });
});

module.exports = router;