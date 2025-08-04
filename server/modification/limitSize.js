const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { supabaseServer } = require('../supabase');
const { authenticateToken } = require('../middleware/authToken');
const { checkUserWebsiteAccess } = require('../website/website');

require('dotenv').config();


const router = express.Router();

router.use(cors())
router.use(express.json());

const secretKey = process.env.SECRET_KEY;


router.get('/getSizeItem',authenticateToken, async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const supabase = supabaseServer(token);

    const websiteId = req.query.websiteId;
    const userId = req.user.idUser;


    if (!websiteId) {
        return res.status(400).json({ error: 'Website ID is required' });
    }

    try {
        // Vérifier l'accès de l'utilisateur au site web
        const hasAccess = await checkUserWebsiteAccess(supabase, userId, websiteId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Accès non autorisé à ce site web' });
        }

        // Portfolio images
        const { data: portfolioPhotos } = await supabase
            .from('photo_portfolio')
            .select('size, portfolio:id_portfolio')
            .in('portfolio', (
                (await supabase.from('portfolio').select('id_portfolio').eq('website_id', websiteId)).data?.map(p => p.id_portfolio) || []
            ));
        
        // Page images
        const { data: pagePhotos } = await supabase
            .from('page_photo')
            .select('size, page:id_page')
            .in('page', (
                (await supabase.from('page').select('id').eq('website_id', websiteId)).data?.map(p => p.id) || []
            ));
        
        // Collection images
        const { data: collectionImages } = await supabase
            .from('collection_field_image')
            .select('size, collection_element_id')
            .in('collection_element_id', (
                (await supabase
                    .from('collection_element')
                    .select('id, collection_id')
                    .in('collection_id', (
                        (await supabase.from('collection').select('id').eq('website_id', websiteId)).data?.map(c => c.id) || []
                    ))
                ).data?.map(ce => ce.id) || []
            ));
        // Collection vidéos
        const { data: collectionVideos } = await supabase
            .from('collection_field_video')
            .select('size, collection_element_id')
            .in('collection_element_id', (
                (await supabase
                    .from('collection_element')
                    .select('id, collection_id')
                    .in('collection_id', (
                        (await supabase.from('collection').select('id').eq('website_id', websiteId)).data?.map(c => c.id) || []
                    ))
                ).data?.map(ce => ce.id) || []
            ));
        // Collection galleries
        const { data: collectionGalleries } = await supabase
            .from('collection_field_gallery')
            .select('size, collection_element_id')
            .in('collection_element_id', (
                (await supabase
                    .from('collection_element')
                    .select('id, collection_id')
                    .in('collection_id', (
                        (await supabase.from('collection').select('id').eq('website_id', websiteId)).data?.map(c => c.id) || []
                    ))
                ).data?.map(ce => ce.id) || []
            ));
        // Collection richtext
        const { data: collectionRichText } = await supabase
            .from('collection_field_richText')
            .select('size, collection_element_id')
            .in('collection_element_id', (
                (await supabase
                    .from('collection_element')
                    .select('id, collection_id')
                    .in('collection_id', (
                        (await supabase.from('collection').select('id').eq('website_id', websiteId)).data?.map(c => c.id) || []
                    ))
                ).data?.map(ce => ce.id) || []
            ));

        // Additionner toutes les tailles
        const sum = arr => Array.isArray(arr) ? arr.reduce((acc, v) => acc + (v.size || 0), 0) : 0;
        const totalSize =
            sum(portfolioPhotos) +
            sum(pagePhotos) +
            sum(collectionImages) +
            sum(collectionVideos) +
            sum(collectionGalleries) +
            sum(collectionRichText);


        res.send({ totalSize });
    } catch (err) {
        console.error('Erreur lors de la récupération de la taille:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;