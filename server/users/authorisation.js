const express = require('express');
const cors = require('cors')

const { supabaseServer } = require('../supabase');
const { authenticateToken } = require('../middleware/authToken');



require('dotenv').config();
const secretKey = process.env.SECRET_KEY; 

const router = express.Router();

router.use(cors())
router.use(express.json());

router.post('/getAuthorisation', authenticateToken, async (req, res) => {
    const { type } = req.body;
    const userId = req.user.idUser;

    if (!type) {
        return res.status(400).json({ success: false, message: 'Type d\'autorisation requis' });
    }

    try {
        // Vérifier d'abord si l'utilisateur est admin
        const { data: userData } = await supabaseServer
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

        // Pour les non-admins, vérifier les autorisations spécifiques
        const { data, error } = await supabaseServer
            .from('users_authorisation')
            .select(type)
            .eq('user_id', userId)
            .single();

        if (error) {
            console.error('Erreur lors de la récupération des autorisations:', error);
            return res.status(500).json({ success: false, message: 'Erreur de base de données' });
        }

        return res.status(200).json({ 
            success: true, 
            authorisation: data?.[type] || false
        });
    } catch (error) {
        console.error('Erreur interne:', error);
        return res.status(500).json({ success: false });
    }
});

module.exports = router;

