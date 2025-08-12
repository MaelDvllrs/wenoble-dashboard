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
        return res.status(401).json({ message: 'Clé API manquante.' });
    }

    // Supabase : vérification de la clé API dans la table websites
    const { data, error } = await supabase
        .from('websites')
        .select('id, workspace_id')
        .eq('api_key', apiKey)
        .maybeSingle();
    
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    
    if (data) {
        req.apiKey = apiKey;
        req.websiteId = data.id;
        req.workspaceId = data.workspace_id;
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
    const websiteId = req.websiteId;
    const workspaceId = req.workspaceId;
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
        // Récupérer les emails configurés pour le site web
        const { data: emailsData, error: emailsError } = await supabase
            .from('website_email')
            .select('email')
            .eq('website_id', websiteId)
            .eq('is_active', true)
            .order('is_primary', { ascending: false })
            .order('created_at', { ascending: true });

        if (emailsError) {
            emailLocks.delete(emailSender);
            console.error('Erreur lors de la récupération des emails:', emailsError);
            return res.status(500).json({ error: 'Erreur lors de la récupération des emails configurés' });
        }

        if (!emailsData || emailsData.length === 0) {
            emailLocks.delete(emailSender);
            console.error('Aucun email configuré pour ce site web');
            return res.status(404).json({ error: 'Aucun email destinataire configuré pour ce site web' });
        }

        // Récupérer tous les emails actifs pour ce site web
        const recipientEmails = emailsData.map(row => row.email);

        // Insérer le message dans contact_website
        const { error: insertError, data: insertData } = await supabase
            .from('contact_website')
            .insert({
                website_id: websiteId,
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

        // Récupérer tous les utilisateurs ayant accès à ce site web avec les rôles admin ou editor
        const { data: usersData, error: usersError } = await supabase
            .from('user_workspaces')
            .select('user_id')
            .eq('workspace_id', workspaceId)
            .in('role', ['admin', 'editor']);

        if (usersError) {
            console.error('Erreur lors de la récupération des utilisateurs:', usersError);
        }

        const userIds = usersData ? usersData.map(row => row.user_id) : [];

        // Notification pour tous les utilisateurs admin/editor ayant accès au workspace du site web
        if (userIds.length > 0) {
            await axios(`${serverUrl}/createNotification`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                data: {
                    IdUsers: userIds,
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
        }

        // Envoi de l'email à tous les destinataires configurés
        const { data, error } = await resend.emails.send({
            from: process.env.EMAIL_WEBSITE,
            to: recipientEmails,
            subject: subject,
            html: html,
        });

        if (error) {
            emailLocks.delete(emailSender);
            return res.status(400).json({ error });
        }

        emailLocks.delete(emailSender);
        res.status(200).json({ 
            message: 'Email sent successfully', 
            data,
            recipients: recipientEmails.length 
        });
    } catch (err) {
        emailLocks.delete(emailSender);
        console.error('Erreur lors de l\'envoi de l\'email:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;