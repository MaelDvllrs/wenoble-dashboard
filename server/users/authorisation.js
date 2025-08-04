const express = require('express');
const cors = require('cors')

const { supabaseServer } = require('../supabase');
const { authenticateToken } = require('../middleware/authToken');
const { checkUserWebsiteAccess } = require('../website/website');





require('dotenv').config();
const secretKey = process.env.SECRET_KEY; 

const router = express.Router();

router.use(cors())
router.use(express.json());

router.post('/getAuthorisation', authenticateToken, async (req, res) => {
    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);   

    const { type, websiteId } = req.body;
    const userId = req.user.idUser;

    if (!type) {
        return res.status(400).json({ success: false, message: 'Type d\'autorisation requis' });
    }

    if (!websiteId) {
        return res.status(400).json({ success: false, message: 'Website ID requis' });
    }

    try {
        // Vérifier l'accès de l'utilisateur au site web
        const { hasAccess, role } = await checkUserWebsiteAccess(supabase, userId, websiteId);
        
        if (!hasAccess) {
            return res.status(403).json({ 
                success: false, 
                message: 'Accès refusé au site web' 
            });
        }

        // Vérifier d'abord si l'utilisateur est admin
        const { data: userData } = await supabase
            .from('users')
            .select('is_admin')
            .eq('id', userId)
            .single();
            
        // Les admins ont toutes les autorisations
        if (userData && userData.is_admin) {
            return res.status(200).json({ 
                success: true, 
                authorisation: true 
            });
        }

        // Pour les non-admins, vérifier les fonctionnalités du site web dans website_feature
        const { data, error } = await supabase
            .from('website_feature')
            .select(type)
            .eq('website_id', websiteId)
            .single();


        // Si la table n'existe pas ou si aucune entrée n'est trouvée pour ce website_id
        if (error && error.code === 'PGRST116') {
            // Aucune entrée trouvée pour ce website_id, créer une entrée par défaut
            console.log('Aucune entrée trouvée pour ce website_id, création d\'une entrée par défaut');
            console.log('websiteId', websiteId);
            
            const defaultFeatures = {
                website_id: websiteId,
                auth_portfolio: false,
                auth_page: false,
                auth_blog: false,
                auth_ecom: false,
                auth_newsletter: false
            };

            const { data: insertData, error: insertError } = await supabase
                .from('website_feature')
                .insert(defaultFeatures)
                .select()
                .single();

            if (insertError) {
                console.error('Erreur lors de la création de l\'entrée par défaut:', insertError);
                return res.status(500).json({ success: false, message: 'Erreur lors de la création des fonctionnalités' });
            }

            return res.status(200).json({ 
                success: true, 
                authorisation: insertData?.[type] || false,
                role: role
            });
        } else if (error) {
            console.error('Erreur lors de la récupération des fonctionnalités du site:', error);
            return res.status(500).json({ success: false, message: 'Erreur de base de données' });
        }

        return res.status(200).json({ 
            success: true, 
            authorisation: data?.[type] || false,
            role: role
        });
    } catch (error) {
        console.error('Erreur interne:', error);
        return res.status(500).json({ success: false });
    }
});

module.exports = router;

