const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const { Resend } = require('resend');
const router = express.Router();

require('dotenv').config();

const serverUrl = process.env.SERVER_URL;
const resend = new Resend(process.env.RESEND_EMAIL_KEY);

// Une seule instance Supabase avec les bons droits
const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } }
);

const apiKeyMiddleware = async (req, res, next) => {


    const apiKey = req.body.apiKey;
    const mail = req.body.mail;
    
    if (!apiKey) {
        return res.status(401).json({ message: 'Clé API ou ID de data manquant.' });
    }
    
    try {
        // Vérification de la clé API dans la table websites
        const { data, error } = await supabase
            .from('websites')
            .select('id, workspace_id')
            .eq('api_key', apiKey)
            .maybeSingle();
            
        if (error) {
            console.error('Erreur lors de la vérification de la clé API:', error);
            return res.status(500).json({ error: error.message });
        }
        
        if (data) {
            req.apiKey = apiKey;
            req.mail = mail;
            req.websiteId = data.id;
            req.workspaceId = data.workspace_id;
            next();
        } else {
            console.log('Clé API invalide:', apiKey);
            return res.status(403).json({ message: 'Clé API invalide.' });
        }
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

router.post('/signUpNewsletter',apiKeyMiddleware, async (req, res) => {
    const apiKey = req.apiKey;
    const websiteId = req.websiteId;
    const workspaceId = req.workspaceId;
    const mail = req.mail;
    const dateSend = new Date();
    
    try {
        // Vérifier si le mail existe déjà pour ce site web
        const { data: existing, error: existError } = await supabase
            .from('newsletter_website')
            .select('id_newsletter')
            .eq('mail', mail)
            .eq('website_id', websiteId);
            
        if (existError) {
            return res.status(500).json({ error: existError.message });
        }
        
        if (existing && existing.length > 0) {
            return res.status(409).json({ message: 'mail déjà enregistré.' });
        }
        
        // Insérer le mail pour ce site web
        const { error: insertError, data: insertData } = await supabase
            .from('newsletter_website')
            .insert({ website_id: websiteId, mail, date: dateSend })
            .select();
            
        if (insertError) {
            return res.status(500).json({ error: insertError.message });
        }

        const insertedId = insertData && insertData[0] && insertData[0].id_newsletter;

        // Récupérer tous les utilisateurs ayant accès à ce workspace avec les rôles admin ou editor
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
                    Type: 'newsletter',
                    Date: dateSend,
                    Message: `Nouvelle inscription à la newsletter : ${mail}`,
                    IdElement: insertedId
                }
            }).then((response) => {
                console.log('Notification créée :', response.data);
            }).catch((error) => {
                console.error('Erreur lors de la création de la notification :', error);
            });
        }

        // Récupérer les emails configurés pour les notifications de ce site web
        const { data: emailRecipients, error: recipientsError } = await supabase
            .from('website_email')
            .select('email')
            .eq('website_id', websiteId)
            .eq('is_active', true)
            .order('is_primary', { ascending: false })
            .order('created_at', { ascending: true });

        if (recipientsError) {
            console.error('Erreur lors de la récupération des destinataires:', recipientsError);
        }

        const recipientEmails = emailRecipients && emailRecipients.length > 0
            ? emailRecipients.map(r => r.email)
            : [];

        // Envoi de l'email aux destinataires configurés si il y en a
        if (recipientEmails.length > 0) {
            const emailSubject = `Nouvelle inscription à la newsletter`;
            const emailHtml = `
                <!DOCTYPE html>
                <html lang="fr">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Nouvelle inscription à la newsletter</title>
                </head>
                <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f4;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4; padding: 20px 0;">
                        <tr>
                            <td align="center">
                                <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                    <!-- Header -->
                                    <tr>
                                        <td style="background: linear-gradient(135deg, #2ec96d 0%, #1fafa8ff 100%); padding: 30px; text-align: center;">
                                            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">
                                                Nouvelle inscription
                                            </h1>
                                            <p style="color: #ffffff; margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">
                                                Newsletter
                                            </p>
                                        </td>
                                    </tr>
                                    
                                    <!-- Content -->
                                    <tr>
                                        <td style="padding: 40px 30px;">
                                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                                Bonjour,
                                            </p>
                                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                                                Vous avez reçu une nouvelle inscription à votre newsletter.
                                            </p>
                                            
                                            <!-- Info Box -->
                                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8f9fa; border-left: 4px solid #2ec96d; border-radius: 4px; margin: 20px 0;">
                                                <tr>
                                                    <td style="padding: 20px;">
                                                        <table width="100%" cellpadding="8" cellspacing="0" border="0">
                                                            <tr>
                                                                <td style="color: #666666; font-size: 14px; font-weight: 600; width: 140px;">
                                                                    Email
                                                                </td>
                                                                <td style="color: #333333; font-size: 14px;">
                                                                    ${mail}
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td style="color: #666666; font-size: 14px; font-weight: 600; padding-top: 8px;">
                                                                    Date d'inscription
                                                                </td>
                                                                <td style="color: #333333; font-size: 14px; padding-top: 8px;">
                                                                    ${new Date(dateSend).toLocaleDateString('fr-FR', { 
                                                                        weekday: 'long', 
                                                                        year: 'numeric', 
                                                                        month: 'long', 
                                                                        day: 'numeric',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit'
                                                                    })}
                                                                </td>
                                                            </tr>
                                                        </table>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    
                                    <!-- Footer -->
                                    <tr>
                                        <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e9ecef;">
                                            <p style="color: #666666; font-size: 12px; margin: 0; line-height: 1.5;">
                                                Cette notification a été envoyée automatiquement depuis votre site web.<br>
                                                Pour gérer vos abonnés à la newsletter, connectez-vous à votre tableau de bord.
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `;

            try {
                const { data: emailData, error: emailError } = await resend.emails.send({
                    from: process.env.EMAIL_WEBSITE,
                    to: recipientEmails,
                    subject: emailSubject,
                    html: emailHtml,
                });

                if (emailError) {
                    console.error('Erreur lors de l\'envoi de l\'email:', emailError);
                } else {
                    console.log('Email de notification envoyé:', emailData);
                }
            } catch (emailErr) {
                console.error('Erreur lors de l\'envoi de l\'email:', emailErr);
            }
        }
        
        res.status(200).json({ message: 'mail enregistré' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;