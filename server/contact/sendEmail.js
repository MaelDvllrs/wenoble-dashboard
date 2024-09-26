const express = require('express');
const cors = require('cors');
const axios = require('axios');
const db = require('../db');
const {Resend} = require('resend');
const router = express.Router();

router.use(cors());
router.use(express.json());


require('dotenv').config();


const resend = new Resend(process.env.RESEND_EMAIL_KEY);


const apiKeyMiddleware = (req, res, next) => {
    const apiKey = req.headers['api_key'];
    const emailSender = req.headers['email_sender'];
    const subject = req.headers['subject'];
    const html = req.headers['html'];
    
    
    if (!apiKey) {
        return res.status(401).json({ message: 'Clé API ou ID de data manquant.' });
    }

    const SQL = 'SELECT id_user FROM users WHERE cle_api = ?'

    const Values = [apiKey]

    db.query(SQL, Values, (err, results)=>{
        if(err){
            res.send({error: err})
        }
        if(results.length  > 0){
            req.apiKey = apiKey;
            req.subject = subject;
            req.html = html;
            req.emailSender = emailSender;
            next();
        }else{
            return res.status(403).json({ message: 'Clé API invalide pour emails.' });
        }
    })
};



router.get('/sendEmail', apiKeyMiddleware, async (req, res) => {
        const apiKey = req.apiKey;
        const subject = req.subject;
        const html = req.html;
        const emailSender = req.emailSender;
        const dateSend = new Date();
        console.log('dateSendEmail', dateSend);

        const serverUrl = process.env.SERVER_URL;
        console.log('serverUrl', serverUrl);

        const SQL = 'SELECT email, id_user FROM users WHERE cle_api = ?'
        const Values = [apiKey] 

        db.query(SQL, Values, async (err, results)=>{
            if(err){
                res.send({error: err})
            }
            const to = results[0].email;
            const idUser = results[0].id_user;
            
            const SQL = 'INSERT INTO contact_website (id_user, mail_sender, subject, html, date) VALUES (?, ?, ?, ?, ?)'
            const Values = [idUser, emailSender, subject, html, dateSend]

            db.query(SQL, Values, async (err, results)=>{
                if(err){
                    res.send({error: err})
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
            })

            const { data, error }  = await resend.emails.send({
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


module.exports = router;