const express = require('express');
const router = express.Router();

const { stateToHTML } = require('draft-js-export-html');
const { convertFromRaw } = require('draft-js');

const { ca } = require('date-fns/locale/ca');
const { createClient } = require('@supabase/supabase-js');
const e = require('express');

require('dotenv').config();

// Création d'une instance Supabase avec la clé de service pour accès administrateur
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);


const apiKeyMiddleware = async (req, res, next) => {
    const apiKey = req.headers['api_key'];
    const id_data = req.headers['id_data'];
    const ids = req.headers['ids'];
    
    if (!apiKey) {
        return res.status(401).json({ message: 'Clé API ou ID de data manquant.' });
    }
    
    try {
        // Vérification de la clé API avec l'instance Supabase service
        const { data, error } = await supabase
            .from('users')
            .select('id')
            .eq('api_key', apiKey)
            .maybeSingle();
            
        if (error) throw error;
        
        if (!data) {
            return res.status(403).json({ message: 'Clé API invalide pour api.' });
        }
        
        req.id_data = id_data;
        req.ids = ids;
        next();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};



//------------------- API pour le portfolio -------------------//

// Images portfolio : renvoie les URLs publiques Supabase
router.get('/sendPhoto', apiKeyMiddleware, async (req, res) => {
    const id_portfolio = req.id_data;
    try {
        const { data, error } = await supabase
            .from('photo_portfolio')
            .select('src_photo, alt_photo')
            .eq('id_portfolio', id_portfolio)
            .order('order_photo', { ascending: true });
        if (error) throw error;
        if (!data || data.length === 0) return res.status(403).json({ message: 'Aucune photo trouvée' });
        // Générer les URLs publiques Supabase pour chaque image
        const images = data.map(photo => {
            const { data: publicUrlData } = supabase.storage
                .from('portfolio-image')
                .getPublicUrl(photo.src_photo);
            return {
                src_photo: photo.src_photo,
                alt_photo: photo.alt_photo,
                url: publicUrlData?.publicUrl || ''
            };
        });
        res.json({ images });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});

router.get('/sendPhotoPortfolio', apiKeyMiddleware, async (req, res) => {
    const id_portfolio = req.id_data;
    try {
        const { data, error } = await supabase
            .from('photo_portfolio')
            .select('src_photo, alt_photo')
            .eq('id_portfolio', id_portfolio)
            .order('order_photo', { ascending: true });
        if (error) throw error;
        if (!data || data.length === 0) return res.status(403).json({ message: 'Aucune photo trouvée' });
        res.json({ images: data });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});

//------------------- API pour les blogs (collections) -------------------//

// Récupérer toutes les pages de blogs (collections)
router.get('/sendBlog', apiKeyMiddleware, async (req, res) => {
    const ids = req.ids;
    const order = req.query.order || 'DESC';
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;
    const colone = req.query.colone || 'collection_element_publish_date';
    const joinTable = req.query.joinTable || 'collection_element';
    const configs = req.query.configs || null;


    try {
        let query = supabase
            .from('collection_element')
            .select('*')
            .eq('collection_element_status', true)
            .order(colone, { ascending: false });
        if (ids) {
            const idArray = ids.split(',').map(id => id.trim());
            query = query.in('collection_id', idArray);
        } else if (req.id_data) {
            query = query.eq('collection_id', req.id_data);
        }
        if (limit) query = query.limit(limit);
        const { data, error } = await query;
        if (error) throw error;
        if (!data || data.length === 0) return res.status(200).json({ message: 'Aucun blog trouvé' });

        return res.json({ blog: data });
    } catch (err) {
        console.error('Erreur lors de la récupération des blogs :', err);
        res.status(500).send({ error: err.message });
    }
});

// Récupérer les infos d'une page de blog (collection_element)
router.get('/sendBlogInfo', apiKeyMiddleware, async (req, res) => {
    const id_blog_page = req.id_data;
    try {
        const { data, error } = await supabase
            .from('collection_element')
            .select('*')
            .eq('id', id_blog_page)
            .maybeSingle();
        if (error) throw error;
        if (!data) return res.status(403).json({ message: 'Aucun blog trouvé' });
        return res.json({ blog: [data] });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});

// Récupérer les infos d'une page de blog par slug
router.get('/sendBlogInfoSlug', apiKeyMiddleware, async (req, res) => {
    const slug = req.headers.slug;
    let id_blog = req.headers.id_blog;
    if (typeof id_blog === 'string' && id_blog.includes(',')) {
        id_blog = id_blog.split(',').map(id => id.trim());
    } else {
        id_blog = [id_blog];
    }
    try {
        const { data, error } = await supabase
            .from('collection_element')
            .select('*')
            .eq('collection_element_slug', slug)
            .in('collection_id', id_blog);
        if (error) throw error;
        if (!data || data.length === 0) return res.status(403).json({ message: 'Aucun blog trouvé' });
        return res.json({ blog: data });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});

// RichText d'une page de blog (collection)
router.get('/sendBlogRichText', apiKeyMiddleware, async (req, res) => {
    const id_blog_page = req.id_data;
    try {
        const { data, error } = await supabase
            .from('collection_field_richtext')
            .select('id_config, text_json')
            .eq('collection_element_id', id_blog_page);
        if (error) throw error;
        if (!data || data.length === 0) return res.status(200).json({ message: 'Aucun texte riche trouvé' });
        const convertedResults = data.map(result => {
            if (!result.text_json) return { id_config: result.id_config, text_html: '' };
            let rawContent;
            if (typeof result.text_json === 'string') {
                try {
                    rawContent = JSON.parse(result.text_json);
                } catch (e) {
                    console.error('Erreur lors du parsing JSON sendPageRichText:', e, result.text_json);
                    return { id_config: result.id_config, text_html: '' };
                }
            } else {
                rawContent = result.text_json;
            }
            const contentState = convertFromRaw(rawContent);
            const html = stateToHTML(contentState);
            return { id_config: result.id_config, text_html: html };
        });
        return res.json({ richText: convertedResults });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});

// Textes d'une page de blog (collection)
router.get('/sendBlogText', apiKeyMiddleware, async (req, res) => {
    const id_blog_page = req.id_data;
    try {
        const { data, error } = await supabase
            .from('collection_field_text')
            .select('id_config, text')
            .eq('collection_element_id', id_blog_page);
        if (error) throw error;
        if (!data || data.length === 0) return res.status(200).json({ message: 'Aucun texte trouvé' });
        return res.json({ text: data });
    } catch (err) {
        console.error('Erreur lors de la récupération des textes de la page de blog :', err);
        res.status(500).send({ error: err.message });
    }
});

// Images d'une page de blog (collection)
router.get('/sendBlogImage', apiKeyMiddleware, async (req, res) => {
    const id_blog_page = req.id_data;
    try {
        const { data, error } = await supabase
            .from('collection_field_image')
            .select('id_config, src_image, alt_image')
            .eq('collection_element_id', id_blog_page);
        if (error) throw error;
        if (!data || data.length === 0) return res.status(200).json({ message: 'Aucune image trouvée' });
        // Générer les URLs publiques Supabase pour chaque image
        const images = data.map(image => {
            const { data: publicUrlData } = supabase.storage
                .from('collection-images')
                .getPublicUrl(image.src_image);
            return {
                id_config: image.id_config,
                alt_image: image.alt_image,
                url: publicUrlData?.publicUrl || ''
            };
        });
        return res.json({ images });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});

// Infos images d'une page de blog (collection)
router.get('/sendBlogInfoImage', apiKeyMiddleware, async (req, res) => {
    const id_blog_page = req.id_data;
    try {
        const { data, error } = await supabase
            .from('collection_field_image')
            .select('id_config, src_image, alt_image')
            .eq('collection_element_id', id_blog_page);
        if (error) throw error;
        if (!data || data.length === 0) return res.status(200).json({ message: 'Aucune image trouvée' });
        return res.json({ images: data });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});

// Gallery d'une page de blog (collection)
router.get('/sendBlogInfoGallery', apiKeyMiddleware, async (req, res) => {
    const id_blog_page = req.id_data;
    try {
        const { data, error } = await supabase
            .from('collection_field_gallery')
            .select('id_config, gallery')
            .eq('collection_element_id', id_blog_page);
        if (error) throw error;
        if (!data || data.length === 0) return res.status(200).json({ message: 'Aucune gallery trouvée' });
        return res.json({ gallery: data });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});

// Vidéos d'une page de blog (collection)
router.get('/sendBlogVideo', apiKeyMiddleware, async (req, res) => {
    const id_blog_page = req.id_data;
    try {
        const { data, error } = await supabase
            .from('collection_field_video')
            .select('id_config, src_video')
            .eq('collection_element_id', id_blog_page);
        if (error) throw error;
        if (!data || data.length === 0) return res.status(200).json({ message: 'Aucune vidéo trouvée' });
        return res.json({ video: data });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});

// MultiReference d'une page de blog (collection)
router.get('/sendMultiReference', apiKeyMiddleware, async (req, res) => {
    const id_blog_page = req.id_data;
    try {
        const { data, error } = await supabase
            .from('collection_field_multireference')
            .select('id_config, info_ref')
            .eq('collection_element_id', id_blog_page);
        if (error) throw error;
        if (!data || data.length === 0) return res.status(200).json({ message: 'Aucune référence trouvée' });
        // Parse chaque référence et ajoute id_config à chaque objet
        const references = data.flatMap(result => {
            const parsedRefs = JSON.parse(result.info_ref);
            return parsedRefs.map(ref => ({ ...ref, id_config: result.id_config }));
        });
        return res.json({ references });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});

// Blog content (tous les champs dynamiques d'une page de collection)
router.get('/sendBlogContent', apiKeyMiddleware, async (req, res) => {
    const id_blog_page = req.headers.id_blog_page;
    const id_blog = req.headers.id_blog;

    
    
    try {
        // Récupérer la config des champs dynamiques
        const { data: configData, error: configError } = await supabase
            .from('collection_config')
            .select('tab_field, id')
            .eq('collection_id', id_blog);
        if (configError) {
            console.error('Erreur lors de la récupération de la config des champs dynamiques :', configError);
            return res.status(500).send({ error: configError.message });
        }


        if (!configData || configData.length === 0) return res.status(200).json({ message: 'Aucun contenu trouvé' });
        // Pour chaque champ, récupérer la data correspondante
        const contentPromises = configData.map(async (field) => {
            switch (field.tab_field) {
                case 'text': {
                    const { data, error } = await supabase
                        .from('collection_field_text')
                        .select('id_config, text')
                        .eq('collection_element_id', id_blog_page)
                        .eq('id_config', field.id);

                    if (error) {
                     console.error('Erreur lors de la récupération des blogs :', error.message);
                     // Tu peux aussi afficher un message à l'utilisateur ou gérer l'erreur autrement
                     return;
                    }
                    return { type: 'text', data };
                }
                case 'richText': {
                    const { data } = await supabase
                        .from('collection_field_richtext')
                        .select('id_config, text_json')
                        .eq('collection_element_id', id_blog_page)
                        .eq('id_config', field.id);
                    const convertedResults = (data || []).map(result => {
                        if (!result.text_json) return { id_config: result.id_config, text_html: '' };
                        let rawContent;
                        if (typeof result.text_json === 'string') {
                            try {
                                rawContent = JSON.parse(result.text_json);
                            } catch (e) {
                                console.error('Erreur lors du parsing JSON richText:', e, result.text_json);
                                return { id_config: result.id_config, text_html: '' };
                            }
                        } else {
                            rawContent = result.text_json;
                        }
                        const contentState = convertFromRaw(rawContent);
                        const html = stateToHTML(contentState);
                        return { id_config: result.id_config, text_html: html };
                    });
                    return { type: 'richText', data: convertedResults };
                }
                case 'image': {
                    const { data } = await supabase
                        .from('collection_field_image')
                        .select('id_config, src_image, alt_image')
                        .eq('collection_element_id', id_blog_page)
                        .eq('id_config', field.id);
                    const images = (data || []).map(image => {
                        const { data: publicUrlData } = supabase.storage
                            .from('collection-images')
                            .getPublicUrl(image.src_image);

                        return {
                            id_config: image.id_config,
                            alt_image: image.alt_image,
                            url: publicUrlData?.publicUrl || ''
                        };
                        
                    });
                    return { type: 'image', data: images };

                }
                case 'video': {
                    const { data, error } = await supabase
                        .from('collection_field_video')
                        .select('id_config, src_video')
                        .eq('collection_element_id', id_blog_page)
                        .eq('id_config', field.id);

                    if (error) {
                        console.error('Erreur lors de la récupération des vidéos :', error.message);
                        return;
                    }
                    return { type: 'video', data };
                }
                case 'gallery': {
                    const { data, error } = await supabase
                        .from('collection_field_gallery')
                        .select('id_config, gallery')
                        .eq('collection_element_id', id_blog_page)
                        .eq('id_config', field.id);
                    if (error) {
                        console.error('Erreur lors de la récupération de la gallery :', error.message);
                        return;
                    }
                    return { type: 'gallery', data };
                }
                case 'multiReference': {
                   // 1. Récupérer la ligne multireference
                   const { data } = await supabase
                       .from('collection_field_multireference')
                       .select('id_config, info_ref')
                       .eq('collection_element_id', id_blog_page)
                       .eq('id_config', field.id)
                       .maybeSingle();

                   let references = [];
                   if (data && data.info_ref) {
                        let parsedRefs;
                        if (typeof data.info_ref === 'string') {
                            try {
                                parsedRefs = JSON.parse(data.info_ref); // tableau d'objets
                            } catch (e) {
                                console.error('Erreur lors du parsing JSON multiReference:', e, data.info_ref);
                                parsedRefs = [];
                            }
                        } else {
                            parsedRefs = data.info_ref;
                        }
                        // Pour récupérer tous les value :
                        const values = parsedRefs.map(ref => ref.value);

                       
                       
                       let collection_ids = [];
                       if (Array.isArray(values) && values.length > 0) {
                           const { data: configData, error: configError } = await supabase
                               .from('collection_element')
                               .select('collection_id, id')
                               .in('id', values);
                           if (configError) {
                               console.error('Erreur lors de la récupération des collection_id :', configError.message);
                               return;
                           }
                           // Associer chaque value à son collection_id
                           // Exemple : [{value: ..., collection_id: ...}, ...]
                           collection_ids = values.map(val => {
                               const found = configData.find(row => row.id === val);
                               return found ? found.collection_id : null;
                           });
                       } else if (values) {
                           const { data: configData, error: configError } = await supabase
                               .from('collection_element')
                               .select('collection_id')
                               .eq('id', values)
                               .maybeSingle();
                           if (configError) {
                               console.error('Erreur lors de la récupération de la collection_id :', configError.message);
                               return;
                           }
                           if (configData) {
                               collection_ids = [configData.collection_id];
                           }
                       }
                   
                       references = parsedRefs.map((ref, i) => ({
                           ...ref,
                           id_config: data.id_config,
                           collection_id: collection_ids[i] // Ajout du collection_id récupéré
                       }));
                   }
                   return { type: 'multiReference', data: references };
                }
                default:
                    return { type: field.tab_field, data: [] };
            }
        });
        
        const contentResults = await Promise.all(contentPromises);
        
        const combinedResults = contentResults.reduce((acc, result) => {
            if (!acc[result.type]) {
                acc[result.type] = [];
            }
            acc[result.type] = acc[result.type].concat(result.data || []);
            return acc;
        }, {});
        return res.json({ content: combinedResults });
    } catch (err) {
        console.error('Erreur lors de la récupération du contenu du blog :', err);
        res.status(500).send({ error: err.message });
    }
});

//------------------- API pour les pages -------------------//

// PAGE : Utilise Supabase (structure inchangée)
router.get('/sendPage', apiKeyMiddleware, async (req, res) => {
    const id = req.id_data;
    try {
        const { data, error } = await supabase
            .from('page')
            .select('*')
            .eq('id_page', id)
            .maybeSingle();
        if (error) throw error;
        if (!data) return res.status(403).json({ message: 'Aucune page trouvée' });
        return res.json({ page: [data] });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});

router.get('/sendPageImage', apiKeyMiddleware, async (req, res) => {
    const id = req.id_data;
    console.log('ID de la page:', id);

    try {
        const { data, error } = await supabase
            .from('page_photo')
            .select('id_config, src_image, alt_image')
            .eq('id_page', id);
        if (error) throw error;
        if (!data || data.length === 0) return res.status(200).json({ message: 'Aucune image trouvée' });
        return res.json({ images: data });
    } catch (err) {
        console.error('Erreur lors de la récupération des images de la page :', err);
        res.status(500).send({ error: err.message });
    }
});

router.get('/sendPageRichText', apiKeyMiddleware, async (req, res) => {
    const id = req.id_data;
    console.log('ID de la page pour RichText:', id);
    try {
        const { data, error } = await supabase
            .from('page_richtext')
            .select('id_config, text_json')
            .eq('id_page', id);
        if (error) throw error;
        if (!data || data.length === 0) return res.status(200).json({ message: 'Aucun texte riche trouvé' });
        const convertedResults = data.map(result => {
            if (!result.text_json) return { id_config: result.id_config, text_html: '' };
            let rawContent;
            if (typeof result.text_json === 'string') {
                try {
                    rawContent = JSON.parse(result.text_json);
                } catch (e) {
                    console.error('Erreur lors du parsing JSON sendPageRichText:', e, result.text_json);
                    return { id_config: result.id_config, text_html: '' };
                }
            } else {
                rawContent = result.text_json;
            }
            const contentState = convertFromRaw(rawContent);
            const html = stateToHTML(contentState);
            return { id_config: result.id_config, text_html: html };
        });
        return res.json({ richText: convertedResults });
    } catch (err) {
        console.error('Erreur lors de la récupération du RichText de la page :', err);
        res.status(500).send({ error: err.message });
    }
});

router.get('/sendPageText', apiKeyMiddleware, async (req, res) => {
    const id = req.id_data;
    try {
        const { data, error } = await supabase
            .from('page_text')
            .select('id_config, text')
            .eq('id_page', id);
        if (error) throw error;
        if (!data || data.length === 0) return res.status(200).json({ message: 'Aucun texte trouvé' });
        return res.json({ text: data });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});

// BLOG AUTEUR : Adapté à la nouvelle structure (collection.js)
router.get('/sendBlogAuteur', apiKeyMiddleware, async (req, res) => {
    const id_blog = req.id_data;
    try {
        // 1. Récupérer l'user_id du blog (table blog)
        const { data: blogData, error: blogError } = await supabase
            .from('collection')
            .select('user_id')
            .eq('id', id_blog)
            .maybeSingle();
        if (blogError) throw blogError;
        if (!blogData) return res.status(200).json({ message: 'Aucun auteur trouvé' });
        const user_id = blogData.user_id;
        // 2. Récupérer le username (table users)
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('username')
            .eq('id', user_id)
            .maybeSingle();
        if (userError) throw userError;
        if (!userData) return res.status(200).json({ message: 'Aucun auteur trouvé' });
        // 3. Récupérer la photo de profil (table profile_images)
        const { data: imageData, error: imageError } = await supabase
            .from('profile_images')
            .select('src_profile_image')
            .eq('user_id', user_id)
            .maybeSingle();
        if (imageError) throw imageError;
        const author = {
            username: userData.username,
            src_profile_image: imageData ? imageData.src_profile_image : null
        };
        return res.json({ author });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});






    





module.exports = router;