const express = require('express');
const router = express.Router();
const { supabaseServer } = require('../supabase'); 
const axios = require('axios');
const {Resend} = require('resend'); 


require('dotenv').config();
const resend = new Resend(process.env.RESEND_EMAIL_KEY);

const apiKeyMiddleware = async (req, res, next) => {
    const apiKey = req.body.apiKey;
    const emailSender = req.body.emailSender;
    const subject = req.body.subject;
    const html = req.body.html;

    if (!apiKey) {
        return res.status(401).json({ message: 'Clé API ou ID de data manquant.' });
    }

    // Supabase : vérification de la clé API
    const { data, error } = await supabaseServer
        .from('users')
        .select('id')
        .eq('api_key', apiKey)
        .maybeSingle();
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    if (data) {
        req.apiKey = apiKey;
        req.subject = subject;
        req.html = html;
        req.emailSender = emailSender;
        next();
    } else {
        return res.status(403).json({ message: 'Clé API invalide.' });
    }
};

const emailLocks = new Set();

router.post('/sendEmail', apiKeyMiddleware, async (req, res) => {
    const apiKey = req.apiKey;
    const subject = req.subject;
    const html = req.html;
    const emailSender = req.emailSender;
    const dateSend = new Date();

    if (emailLocks.has(emailSender)) {
        return res.status(429).json({ message: 'Vous avez déjà envoyé un email. Veuillez patienter.' });
    }

    emailLocks.add(emailSender);

    const serverUrl = process.env.SERVER_URL;

    try {
        // Récupérer l'utilisateur par cle_api
        const { data: userData, error: userError } = await supabaseServer
            .from('users')
            .select('email, id')
            .eq('api_key', apiKey)
            .maybeSingle();
        if (userError || !userData) {
            emailLocks.delete(emailSender);
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }
        const to = userData.email;
        const user_id = userData.id;

        // Insérer le message dans contact_website
        const { error: insertError, data: insertData } = await supabaseServer
            .from('contact_website')
            .insert({
                user_id,
                mail_sender: emailSender,
                subject,
                html,
                date: dateSend
            })
            .select();
        if (insertError) {
            emailLocks.delete(emailSender);
            return res.status(500).json({ error: insertError.message });
        }
        const insertedId = insertData && insertData[0] && insertData[0].id_message;

        // Notification
        await axios(`${serverUrl}/createNotification`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            data: {
                IdUsers: [user_id],
                Type: 'message',
                Date: dateSend,
                Message: `Message de ${emailSender} - ${subject}`,
                IdElement: insertedId
            }
        }).then((response) => {
            console.log('Notification créée :', response.data);
        }).catch((error) => {
            console.error('Erreur lors de la création de la notification :', error);
        });

        // Envoi de l'email
        const { data, error } = await resend.emails.send({
            from: process.env.EMAIL_WEBSITE,
            to: [to],
            subject: subject,
            html: html,
        });

        if (error) {
            emailLocks.delete(emailSender);
            return res.status(400).json({ error });
        }

        emailLocks.delete(emailSender);
        res.status(200).json({ message: 'Email sent successfully', data });
    } catch (err) {
        emailLocks.delete(emailSender);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;