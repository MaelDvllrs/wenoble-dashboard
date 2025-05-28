const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { supabaseServer } = require('../supabase');
const { authenticateToken } = require('../middleware/authToken');

require('dotenv').config();


const router = express.Router();

router.use(cors())
router.use(express.json());

const secretKey = process.env.SECRET_KEY; 

router.get('/getSizeItem',authenticateToken, async (req, res) => {
    const idUser = req.user.idUser;
    if (!idUser) {
        return res.status(400).send({ error: 'Le paramètre id_user est requis.' });
    }
    try {
        // Portfolio images
        const { data: portfolioPhotos } = await supabaseServer
            .from('photo_portfolio')
            .select('size, portfolio:id_portfolio')
            .in('portfolio', (
                (await supabaseServer.from('portfolio').select('id_portfolio').eq('user_id', idUser)).data?.map(p => p.id_portfolio) || []
            ));
        // Page images
        const { data: pagePhotos } = await supabaseServer
            .from('page_photo')
            .select('size, page:id_page')
            .in('page', (
                (await supabaseServer.from('page').select('id_page').eq('user_id', idUser)).data?.map(p => p.id_page) || []
            ));
        // Collection images
        const { data: collectionImages } = await supabaseServer
            .from('collection_field_image')
            .select('size, collection_element_id')
            .in('collection_element_id', (
                (await supabaseServer
                    .from('collection_element')
                    .select('id, collection_id')
                    .in('collection_id', (
                        (await supabaseServer.from('collection').select('id').eq('user_id', idUser)).data?.map(c => c.id) || []
                    ))
                ).data?.map(ce => ce.id) || []
            ));
        // Collection vidéos
        const { data: collectionVideos } = await supabaseServer
            .from('collection_field_video')
            .select('size, collection_element_id')
            .in('collection_element_id', (
                (await supabaseServer
                    .from('collection_element')
                    .select('id, collection_id')
                    .in('collection_id', (
                        (await supabaseServer.from('collection').select('id').eq('user_id', idUser)).data?.map(c => c.id) || []
                    ))
                ).data?.map(ce => ce.id) || []
            ));
        // Collection galleries
        const { data: collectionGalleries } = await supabaseServer
            .from('collection_field_gallery')
            .select('size, collection_element_id')
            .in('collection_element_id', (
                (await supabaseServer
                    .from('collection_element')
                    .select('id, collection_id')
                    .in('collection_id', (
                        (await supabaseServer.from('collection').select('id').eq('user_id', idUser)).data?.map(c => c.id) || []
                    ))
                ).data?.map(ce => ce.id) || []
            ));
        // Collection richtext
        const { data: collectionRichText } = await supabaseServer
            .from('collection_field_richText')
            .select('size, collection_element_id')
            .in('collection_element_id', (
                (await supabaseServer
                    .from('collection_element')
                    .select('id, collection_id')
                    .in('collection_id', (
                        (await supabaseServer.from('collection').select('id').eq('user_id', idUser)).data?.map(c => c.id) || []
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
        console.log(err);
        res.send({ error: err.message });
    }
});

module.exports = router;