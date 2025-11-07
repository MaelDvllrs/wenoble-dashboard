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

// === SYSTÈME ANTI-BOT ===
const emailLocks = new Set();
const ipLocks = new Map(); // Track submissions by IP
const suspiciousIPs = new Map(); // Track suspicious behavior

const EMAIL_LOCK_TIMEOUT = 60 * 1000; // 1 minute entre chaque email
const IP_LOCK_TIMEOUT = 30 * 1000; // 30 secondes entre submissions par IP
const MAX_SUBMISSIONS_PER_HOUR = 5; // Maximum 5 soumissions par heure par IP
const MIN_SUBMIT_TIME = 1000; // Minimum 1 secondes pour remplir le formulaire

// Fonction pour vérifier les patterns de spam
function isSpamContent(text) {
    if (!text || typeof text !== 'string') return false;
    
    const spamPatterns = [
        /viagra|cialis|pharmacy|casino|poker|lottery|winner|prize/i,
        /(http:\/\/|https:\/\/|www\.)[^\s]{50,}/g,
        /(.)\1{10,}/g,
        /<script|<iframe|javascript:|onclick|onerror/i,
        /\b(buy now|click here|limited time|act now)\b/i,
    ];
    
    return spamPatterns.some(pattern => pattern.test(text));
}

// Fonction pour obtenir l'IP du client
function getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0].trim() || 
           req.headers['x-real-ip'] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress;
}

// Nettoyer les anciennes entrées de IP tracking
setInterval(() => {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    // Nettoyer les soumissions anciennes
    for (const [ip, submissions] of ipLocks.entries()) {
        const recentSubmissions = submissions.filter(time => time > oneHourAgo);
        if (recentSubmissions.length === 0) {
            ipLocks.delete(ip);
        } else {
            ipLocks.set(ip, recentSubmissions);
        }
    }
    
    // Nettoyer les IPs suspectes anciennes
    for (const [ip, data] of suspiciousIPs.entries()) {
        if (data.lastSeen < oneHourAgo) {
            suspiciousIPs.delete(ip);
        }
    }
}, 10 * 60 * 1000); // Nettoyer toutes les 10 minutes

router.post('/sendEmail', apiKeyMiddleware, async (req, res) => {
    const apiKey = req.apiKey;
    const websiteId = req.websiteId;
    const workspaceId = req.workspaceId;
    const subject = req.subject;
    const html = req.html;
    const emailSender = req.emailSender;
    const dateSend = new Date();
    
    // Nouvelles données anti-bot
    const formData = req.body.formData || {};
    const submitTime = req.body.submitTime || 0;
    const userAgent = req.body.userAgent || '';
    const clientIP = getClientIP(req);

    // === VALIDATIONS ANTI-BOT CÔTÉ SERVEUR ===
    
    // 1. Vérifier si l'IP est déjà bloquée
    if (suspiciousIPs.has(clientIP)) {
        const suspiciousData = suspiciousIPs.get(clientIP);
        if (suspiciousData.blocked && suspiciousData.lastSeen > Date.now() - 3600000) {
            console.warn(`IP bloquée: ${clientIP}`);
            return res.status(403).json({ message: 'Trop de tentatives. Veuillez réessayer plus tard.' });
        }
    }
    
    // 2. Rate limiting par email
    if (emailLocks.has(emailSender)) {
        console.warn(`Rate limit email: ${emailSender}`);
        return res.status(429).json({ message: 'Vous avez déjà envoyé un email. Veuillez patienter.' });
    }
    
    // 3. Rate limiting par IP
    const ipSubmissions = ipLocks.get(clientIP) || [];
    const recentSubmissions = ipSubmissions.filter(time => time > Date.now() - 3600000);
    
    if (recentSubmissions.length >= MAX_SUBMISSIONS_PER_HOUR) {
        console.warn(`Rate limit IP: ${clientIP} - ${recentSubmissions.length} soumissions`);
        
        // Marquer cette IP comme suspecte
        suspiciousIPs.set(clientIP, {
            count: (suspiciousIPs.get(clientIP)?.count || 0) + 1,
            lastSeen: Date.now(),
            blocked: true
        });
        
        return res.status(429).json({ message: 'Trop de soumissions. Veuillez réessayer dans une heure.' });
    }
    
    // 4. Vérifier le temps de soumission (protection contre soumission instantanée)
    if (submitTime < MIN_SUBMIT_TIME) {
        console.warn(`Soumission trop rapide: ${submitTime}ms depuis IP ${clientIP}`);
        
        // Marquer comme suspect
        const suspiciousData = suspiciousIPs.get(clientIP) || { count: 0, lastSeen: 0 };
        suspiciousIPs.set(clientIP, {
            count: suspiciousData.count + 1,
            lastSeen: Date.now(),
            blocked: suspiciousData.count >= 2 // Bloquer après 3 tentatives suspectes
        });
        
        return res.status(400).json({ message: 'Soumission invalide.' });
    }
    
    // 5. Vérifier le contenu pour spam
    const allContent = Object.values(formData).join(' ') + ' ' + subject;
    if (isSpamContent(allContent)) {
        console.warn(`Contenu spam détecté depuis ${clientIP}`);
        
        // Marquer comme suspect
        const suspiciousData = suspiciousIPs.get(clientIP) || { count: 0, lastSeen: 0 };
        suspiciousIPs.set(clientIP, {
            count: suspiciousData.count + 2, // Plus sévère pour spam
            lastSeen: Date.now(),
            blocked: true
        });
        
        return res.status(400).json({ message: 'Contenu rejeté.' });
    }
    
    // 6. Vérifier le User-Agent (bot detection basique)
    if (!userAgent || userAgent.length < 10) {
        console.warn(`User-Agent suspect: ${userAgent} depuis ${clientIP}`);
        return res.status(400).json({ message: 'Client non autorisé.' });
    }
    
    // Ajouter les locks
    emailLocks.add(emailSender);
    recentSubmissions.push(Date.now());
    ipLocks.set(clientIP, recentSubmissions);

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