const express = require('express');
const cors = require('cors');
const db = require('../db');
const axios = require('axios');
const { is } = require('date-fns/locale/is');

const router = express.Router();

router.use(cors());
router.use(express.json());

require('dotenv').config();

router.post('/updateCache', async (req, res) => {
    const { key, id_blog, isDelete } = req.body.params;

    if (!id_blog) {
        return res.status(400).send({ error: 'Les paramètres key et id_blog sont requis.' });
    }

    try {
        const SQL = 'SELECT slug_blog FROM blog WHERE id_blog = ?';
        const Values = [id_blog];

        db.query(SQL, Values, async (err, results) => {
            if (err) {
                console.error('Erreur SQL:', err);
                return res.status(500).send({ error: 'Erreur interne du serveur.' });
            }

            if (!results || results.length === 0) {
                return res.status(404).send({ error: 'Blog non trouvé.' });
            }

            const fullUrl = results[0].slug_blog;
            
            try {
                const urlObj = new URL(fullUrl);
                const baseUrl = urlObj.origin;
                const pathParts = urlObj.pathname.split('/').filter(Boolean);
                const collectionKey = pathParts.length > 0 ? pathParts[0] : '';
            
                let responseTemplate = null; // Initialisation
            
                // Invalidation du cache de la collection si collectionKey existe
                let responseCollection = null;
                if (collectionKey) {
                    responseCollection = await axios.post(`${baseUrl}/api/cache/update/${collectionKey}`);
                }
            
                // Invalidation du cache du template si isDelete est faux
                if (!isDelete) {
                    responseTemplate = await axios.post(`${baseUrl}/api/cache/update/template-${key}`);
                }
            
                return res.send({
                    success: true,
                    templateCache: responseTemplate ? responseTemplate.data : null,
                    collectionCache: responseCollection ? responseCollection.data : null
                });
            
            } catch (axiosError) {
                console.error('Erreur lors de l\'invalidation du cache:', axiosError.message);
                return res.status(500).send({
                    success: false,
                    error: axiosError.message
                });
            }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération du blog:', error.message);
        return res.status(500).send({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
