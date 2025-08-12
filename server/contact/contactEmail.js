const express = require('express');
const cors = require('cors');
const { supabaseServer } = require('../supabase');
const { authenticateToken } = require('../middleware/authToken');
const { checkUserWebsiteAccess } = require('../website/website');

const router = express.Router();

router.use(cors());
router.use(express.json());

// GET - Récupérer les emails d'un site web
router.get('/getWebsiteEmails', authenticateToken, async (req, res) => {
    try {
        const { websiteId } = req.query;
        const userId = req.user.idUser;
        const token = req.headers.authorization?.split(' ')[1];
        const supabase = supabaseServer(token);

        if (!websiteId) {
            return res.status(400).json({ error: 'websiteId est requis' });
        }

        // Vérifier l'accès de l'utilisateur au site web
        const { hasAccess } = await checkUserWebsiteAccess(supabase, userId, websiteId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Accès refusé au site web' });
        }

        // Récupérer les emails du site web
        const { data, error } = await supabase
            .from('website_email')
            .select('id, email, is_primary, is_active, created_at, updated_at')
            .eq('website_id', websiteId)
            .order('is_primary', { ascending: false })
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Erreur lors de la récupération des emails:', error);
            return res.status(500).json({ error: 'Erreur lors de la récupération des emails' });
        }

        res.json({ emails: data || [] });
    } catch (error) {
        console.error('Erreur lors de la récupération des emails:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

// POST - Ajouter un email à un site web
router.post('/addWebsiteEmail', authenticateToken, async (req, res) => {
    try {
        const { websiteId, email, isPrimary = false } = req.body;
        const userId = req.user.idUser;
        const token = req.headers.authorization?.split(' ')[1];
        const supabase = supabaseServer(token);

        console.log(websiteId, email, isPrimary);

        if (!websiteId || !email) {
            return res.status(400).json({ error: 'websiteId et email sont requis' });
        }

        // Validation de l'email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Format d\'email invalide' });
        }

        // Vérifier que l'utilisateur a les droits admin ou editor sur ce site web
        const { data: websiteCheck, error: websiteError } = await supabase
            .from('user_websites')
            .select('role')
            .eq('user_id', userId)
            .eq('website_id', websiteId)
            .in('role', ['admin', 'editor'])
            .maybeSingle();

        if (websiteError || !websiteCheck) {
            return res.status(403).json({ error: 'Droits d\'administration ou d\'édition requis' });
        }

        // Vérifier si l'email existe déjà pour ce site web
        const { data: existingEmail, error: existingError } = await supabase
            .from('website_email')
            .select('id')
            .eq('website_id', websiteId)
            .eq('email', email)
            .maybeSingle();

        if (existingError) {
            console.error('Erreur lors de la vérification de l\'email existant:', existingError);
            return res.status(500).json({ error: 'Erreur lors de la vérification' });
        }

        if (existingEmail) {
            return res.status(400).json({ error: 'Cet email est déjà configuré pour ce site web' });
        }

        // Si isPrimary est true, mettre tous les autres emails comme non-principaux
        if (isPrimary) {
            const { error: updateError } = await supabase
                .from('website_email')
                .update({ is_primary: false })
                .eq('website_id', websiteId);

            if (updateError) {
                console.error('Erreur lors de la mise à jour des emails principaux:', updateError);
                return res.status(500).json({ error: 'Erreur lors de la mise à jour' });
            }
        }

        // Ajouter le nouvel email
        const { data: newEmail, error: insertError } = await supabase
            .from('website_email')
            .insert({
                website_id: websiteId,
                email: email,
                is_primary: isPrimary,
                is_active: true
            })
            .select()
            .single();

        if (insertError) {
            console.error('Erreur lors de l\'ajout de l\'email:', insertError);
            return res.status(500).json({ error: 'Erreur lors de l\'ajout de l\'email' });
        }

        res.status(201).json({ 
            message: 'Email ajouté avec succès',
            email: newEmail
        });
    } catch (error) {
        console.error('Erreur lors de l\'ajout de l\'email:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

// DELETE - Supprimer un email
router.delete('/deleteWebsiteEmail', authenticateToken, async (req, res) => {
    try {
        const { emailId, websiteId } = req.query;
        const userId = req.user.idUser;
        const token = req.headers.authorization?.split(' ')[1];
        const supabase = supabaseServer(token);

        if (!emailId || !websiteId) {
            return res.status(400).json({ error: 'emailId et websiteId sont requis' });
        }

        // Vérifier que l'utilisateur a les droits admin ou editor sur ce site web
        const { data: websiteCheck, error: websiteError } = await supabase
            .from('user_websites')
            .select('role')
            .eq('user_id', userId)
            .eq('website_id', websiteId)
            .in('role', ['admin', 'editor'])
            .maybeSingle();

        if (websiteError || !websiteCheck) {
            return res.status(403).json({ error: 'Droits d\'administration ou d\'édition requis' });
        }

        // Vérifier que l'email appartient au bon site web
        const { data: emailCheck, error: emailError } = await supabase
            .from('website_email')
            .select('is_primary')
            .eq('id', emailId)
            .eq('website_id', websiteId)
            .maybeSingle();

        if (emailError || !emailCheck) {
            return res.status(404).json({ error: 'Email non trouvé' });
        }

        // Empêcher la suppression du dernier email principal actif
        if (emailCheck.is_primary) {
            const { data: activeEmails, error: countError } = await supabase
                .from('website_email')
                .select('id', { count: 'exact' })
                .eq('website_id', websiteId)
                .eq('is_active', true);

            if (countError) {
                console.error('Erreur lors du comptage des emails actifs:', countError);
                return res.status(500).json({ error: 'Erreur lors de la vérification' });
            }

            if (activeEmails && activeEmails.length <= 1) {
                return res.status(400).json({ 
                    error: 'Impossible de supprimer le dernier email actif. Ajoutez un autre email avant de supprimer celui-ci.' 
                });
            }
        }

        // Supprimer l'email
        const { error: deleteError } = await supabase
            .from('website_email')
            .delete()
            .eq('id', emailId)
            .eq('website_id', websiteId);

        if (deleteError) {
            console.error('Erreur lors de la suppression de l\'email:', deleteError);
            return res.status(500).json({ error: 'Erreur lors de la suppression' });
        }

        res.json({ message: 'Email supprimé avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'email:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

// PUT - Définir un email comme principal
router.put('/setPrimaryEmail', authenticateToken, async (req, res) => {
    try {
        const { emailId, websiteId } = req.body;
        const userId = req.user.idUser;
        const token = req.headers.authorization?.split(' ')[1];
        const supabase = supabaseServer(token);

        if (!emailId || !websiteId) {
            return res.status(400).json({ error: 'emailId et websiteId sont requis' });
        }

        // Vérifier que l'utilisateur a les droits admin ou editor sur ce site web
        const { data: websiteCheck, error: websiteError } = await supabase
            .from('user_websites')
            .select('role')
            .eq('user_id', userId)
            .eq('website_id', websiteId)
            .in('role', ['admin', 'editor'])
            .maybeSingle();

        if (websiteError || !websiteCheck) {
            return res.status(403).json({ error: 'Droits d\'administration ou d\'édition requis' });
        }

        // Vérifier que l'email appartient au bon site web
        const { data: emailCheck, error: emailError } = await supabase
            .from('website_email')
            .select('id')
            .eq('id', emailId)
            .eq('website_id', websiteId)
            .maybeSingle();

        if (emailError || !emailCheck) {
            return res.status(404).json({ error: 'Email non trouvé' });
        }

        // Mettre tous les emails comme non-principaux
        const { error: updateAllError } = await supabase
            .from('website_email')
            .update({ is_primary: false })
            .eq('website_id', websiteId);

        if (updateAllError) {
            console.error('Erreur lors de la mise à jour des emails principaux:', updateAllError);
            return res.status(500).json({ error: 'Erreur lors de la mise à jour' });
        }

        // Définir le nouvel email principal
        const { error: updatePrimaryError } = await supabase
            .from('website_email')
            .update({ is_primary: true })
            .eq('id', emailId)
            .eq('website_id', websiteId);

        if (updatePrimaryError) {
            console.error('Erreur lors de la définition de l\'email principal:', updatePrimaryError);
            return res.status(500).json({ error: 'Erreur lors de la mise à jour' });
        }

        res.json({ message: 'Email principal mis à jour avec succès' });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'email principal:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

// PUT - Activer/désactiver un email
router.put('/toggleEmailActive', authenticateToken, async (req, res) => {
    try {
        const { emailId, websiteId, isActive } = req.body;
        const userId = req.user.idUser;
        const token = req.headers.authorization?.split(' ')[1];
        const supabase = supabaseServer(token);

        if (!emailId || !websiteId || typeof isActive !== 'boolean') {
            return res.status(400).json({ error: 'emailId, websiteId et isActive sont requis' });
        }

        // Vérifier que l'utilisateur a les droits admin ou editor sur ce site web
        const { data: websiteCheck, error: websiteError } = await supabase
            .from('user_websites')
            .select('role')
            .eq('user_id', userId)
            .eq('website_id', websiteId)
            .in('role', ['admin', 'editor'])
            .maybeSingle();

        if (websiteError || !websiteCheck) {
            return res.status(403).json({ error: 'Droits d\'administration ou d\'édition requis' });
        }

        // Vérifier que l'email appartient au bon site web
        const { data: emailCheck, error: emailError } = await supabase
            .from('website_email')
            .select('is_primary, is_active')
            .eq('id', emailId)
            .eq('website_id', websiteId)
            .maybeSingle();

        if (emailError || !emailCheck) {
            return res.status(404).json({ error: 'Email non trouvé' });
        }

        // Empêcher la désactivation du dernier email actif
        if (!isActive) {
            const { data: activeEmails, error: countError } = await supabase
                .from('website_email')
                .select('id', { count: 'exact' })
                .eq('website_id', websiteId)
                .eq('is_active', true);

            if (countError) {
                console.error('Erreur lors du comptage des emails actifs:', countError);
                return res.status(500).json({ error: 'Erreur lors de la vérification' });
            }

            if (activeEmails && activeEmails.length <= 1) {
                return res.status(400).json({ 
                    error: 'Impossible de désactiver le dernier email actif. Activez un autre email avant de désactiver celui-ci.' 
                });
            }
        }

        // Mettre à jour le statut de l'email
        const { error: updateError } = await supabase
            .from('website_email')
            .update({ is_active: isActive })
            .eq('id', emailId)
            .eq('website_id', websiteId);

        if (updateError) {
            console.error('Erreur lors de la mise à jour du statut:', updateError);
            return res.status(500).json({ error: 'Erreur lors de la mise à jour' });
        }

        res.json({ message: `Email ${isActive ? 'activé' : 'désactivé'} avec succès` });
    } catch (error) {
        console.error('Erreur lors de la mise à jour du statut de l\'email:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

module.exports = router;
