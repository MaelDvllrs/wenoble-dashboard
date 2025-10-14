const express = require('express');
const cors = require('cors');
const { supabaseServer } = require('../supabase');
const { authenticateToken } = require('../middleware/authToken');

const router = express.Router();

router.use(cors());
router.use(express.json());

// Récupérer les statistiques globales de l'utilisateur
router.get('/getUserStats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.idUser;
        const token = req.headers['authorization']?.split(' ')[1];
        const supabase = supabaseServer(token);

        // 1. Nombre de sites web de l'utilisateur via user_websites
        const { data: websitesData, error: websitesError } = await supabase
            .from('user_websites')
            .select('website_id')
            .eq('user_id', userId);
        
        if (websitesError) throw websitesError;
        
        const websiteCount = websitesData?.length || 0;
        const websiteIds = websitesData?.map(w => w.website_id) || [];

        // 2. Nombre total de collections pour tous les sites de l'utilisateur
        let totalCollections = 0;
        if (websiteIds.length > 0) {
            const { count: collectionsCount, error: collectionsError } = await supabase
                .from('collection')
                .select('*', { count: 'exact', head: true })
                .in('website_id', websiteIds);
            
            if (collectionsError) throw collectionsError;
            totalCollections = collectionsCount || 0;
        }

        // 3. Nombre total de messages pour tous les sites de l'utilisateur
        let totalMessages = 0;
        if (websiteIds.length > 0) {
            const { count: messagesCount, error: messagesError } = await supabase
                .from('contact_website')
                .select('*', { count: 'exact', head: true })
                .in('website_id', websiteIds);
            
            if (messagesError) throw messagesError;
            totalMessages = messagesCount || 0;
        }

        res.json({
            websites: websiteCount,
            collections: totalCollections,
            messages: totalMessages
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques utilisateur:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
    }
});

module.exports = router;
