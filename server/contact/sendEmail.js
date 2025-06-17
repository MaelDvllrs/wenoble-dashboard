const express = require('express');
const router = express.Router();
const axios = require('axios');
const {Resend} = require('resend');

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);


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
    const { data, error } = await supabase
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


const EMAIL_LOCK_TIMEOUT = 10 * 1000;

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

    setTimeout(() => {
        emailLocks.delete(emailSender);
    }, EMAIL_LOCK_TIMEOUT);

    const serverUrl = process.env.SERVER_URL;

    try {
        // Récupérer l'utilisateur par cle_api
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('api_key', apiKey)
            .maybeSingle();
        if (userError || !userData) {
            emailLocks.delete(emailSender);
            console.error('Erreur lors de la récupération de l\'utilisateur:', userError);
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }
        const user_id = userData.id;

        // Récupérer l'email via l'API Auth Admin
        const { data: authData, error: authError } = await supabase.auth.admin.getUserById(user_id);
            
        if (authError || !authData || !authData.user) {
            emailLocks.delete(emailSender);
            console.error('Erreur lors de la récupération de l\'email:', authError);
            return res.status(404).json({ error: 'Email utilisateur non trouvé' });
        }
        
        const to = authData.user.email;

        // Insérer le message dans contact_website
        const { error: insertError, data: insertData } = await supabase
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