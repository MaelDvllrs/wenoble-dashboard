const express = require('express')
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const cors = require('cors')
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');


const axios = require('axios');

const { supabaseServer } = require('../supabase');
const { authenticateToken } = require('../middleware/authToken');
const { checkUserWebsiteAccess } = require('../website/website');
const { id } = require('date-fns/locale/id');
const { da } = require('date-fns/locale/da');


const router = express.Router();

router.use(cors())
router.use(express.json());

require('dotenv').config();
const secretKey = process.env.SECRET_KEY; 

const idBlogArticleArray = process.env.idBlogArticle ? process.env.idBlogArticle.split(',') : [];

const checkIdInArray = (id) => {
  return idBlogArticleArray.includes(id);
};

// Fonction helper pour récupérer le website_id d'une collection
const getCollectionWebsiteId = async (supabase, collectionId) => {
  const { data, error } = await supabase
    .from('collection')
    .select('website_id')
    .eq('id', collectionId)
    .single();
    
  if (error) {
    console.log('getCollectionWebsiteId - error:', error);
    if (error.code === 'PGRST116') {
      console.log('getCollectionWebsiteId - collection not found (PGRST116)');
      return null;
    }
    throw error;
  }
  
  return data.website_id;
};


const createNotification = async (id, title, dateSend, slug) => {
  const serverUrl = process.env.SERVER_URL;

  if (checkIdInArray(id)) {
    try {
      // Utilisation de Supabase pour récupérer tous les IDs utilisateurs
      const { data: users, error } = await supabaseServer
        .from('users') // ou 'public.users' selon la structure
        .select('id');
      if (error) {
        console.error('Erreur Supabase lors de la récupération des utilisateurs:', error);
        return;
      }
      const idUsers = users.map(user => user.id);

      try {
        const response = await axios({
          url: `${serverUrl}/createNotification`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          data: {
            IdUsers: idUsers,
            Type: 'actu',
            Date: dateSend,
            Message: `${title}`,
            IdElement: slug
          }
        });
      } catch (error) {
        console.error('Erreur lors de la création de la notification :', error);
      }
    } catch (error) {
      console.error('Erreur lors de la création de la notification :', error);
    }
  }
};



// ========== ENDPOINTS POUR LA GESTION DES COLLECTIONS ==========


// Récupérer les collections d'un utilisateur (via ses sites web)
router.get('/getCollection', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.idUser;
    const websiteId = req.query.websiteId; // Le site web sélectionné par l'utilisateur
    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);

    if (!websiteId) {
      return res.status(400).send({ error: 'websiteId est requis' });
    }

    // Vérifier l'accès de l'utilisateur au site web
    const { hasAccess } = await checkUserWebsiteAccess(supabase, userId, websiteId);
    if (!hasAccess) {
      return res.status(403).send({ error: 'Vous n\'avez pas accès à ce site web' });
    }

    // Récupérer les collections du site web
    const { data, error } = await supabase
      .from('collection')
      .select('id, collection_name')
  .eq('website_id', websiteId)
  .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    const blogCrypt = jwt.sign({ blog: data }, secretKey);
    res.send(blogCrypt);
  } catch (error) {
    console.error('Erreur lors de la récupération des collections:', error);
    res.status(500).send({ error: error.message });
  }
});

// Récupérer le nombre de collections pour un site web
router.get('/getCollectionCount', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.idUser;
    const websiteId = req.query.websiteId;
    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);

    if (!websiteId) {
      return res.status(400).send({ error: 'websiteId est requis' });
    }

    // Vérifier l'accès de l'utilisateur au site web
    const { hasAccess } = await checkUserWebsiteAccess(supabase, userId, websiteId);
    if (!hasAccess) {
      return res.status(403).send({ error: 'Vous n\'avez pas accès à ce site web' });
    }

    // Compter les collections du site web
    const { count, error } = await supabase
      .from('collection')
      .select('*', { count: 'exact', head: true })
      .eq('website_id', websiteId);
    
    if (error) throw error;
    
    res.send({ count: count || 0 });
  } catch (error) {
    console.error('Erreur lors de la récupération du nombre de collections:', error);
    res.status(500).send({ error: error.message });
  }
});

// Récupérer la liste des pages d'un blog
router.get('/getListeCollection', authenticateToken, async (req, res) => {
  try {
    const sentIdBlog = req.query.IdBlog;
    const userId = req.user.idUser;
    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);
    
    // Récupérer le website_id de la collection et vérifier les droits d'accès
    const websiteId = await getCollectionWebsiteId(supabase, sentIdBlog);
    if (!websiteId) {
      return res.status(404).send('Collection non trouvée.');
    }

    const { hasAccess } = await checkUserWebsiteAccess(supabase, userId, websiteId);
    if (!hasAccess) {
      return res.status(403).send('Vous n\'avez pas les droits pour accéder à cette collection.');
    }
    
    // Récupérer la liste des pages
    const { data, error } = await supabase
      .from('collection_element')
      .select('id, collection_element_name, collection_element_status_text, collection_element_create_date, collection_element_update_date, collection_element_publish_date')
      .eq('collection_id', sentIdBlog)
      .order('collection_element_create_date', { ascending: false });
      
    if (error) throw error;
    
    const blogListCrypt = jwt.sign({ blogList: data }, secretKey);
    res.send(blogListCrypt);
  } catch (error) {
    console.error('Erreur lors de la récupération de la liste des blogs:', error);
    res.status(500).send({ error: error.message });
  }
});




// Récupérer la configuration d'un blog
router.get('/getConfigCollection', authenticateToken, async (req, res) => {
  try {
    const collectionId = req.query.collectionId || req.query.IdBlog; // Support des deux paramètres pour compatibilité
    const userId = req.user.idUser;
    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);


    if (!collectionId) {
      return res.status(400).send({ error: 'collectionId est requis' });
    }

    // Récupérer le website_id de la collection et vérifier les droits d'accès
    const websiteId = await getCollectionWebsiteId(supabase, collectionId);
    if (!websiteId) {
      return res.status(404).send({ error: 'Collection non trouvée' });
    }

    const { hasAccess } = await checkUserWebsiteAccess(supabase, userId, websiteId);
    if (!hasAccess) {
      return res.status(403).send({ error: 'Vous n\'avez pas les droits pour accéder à cette collection' });
    }

    // Récupérer la configuration des champs
    const { data, error } = await supabase
      .from('collection_config')
      .select('id, tab_field, name_field, description_field, collection_id_ref, multiline_text')
      .eq('collection_id', collectionId)
      .order('id', { ascending: true });
      
    if (error) throw error;
    
    // Retourner les données directement pour compatibilité avec editCollection.jsx
    res.send({ data });
  } catch (error) {
    console.error('Erreur lors de la récupération de la configuration du blog:', error);
    res.status(500).send({ error: error.message });
  }
});

// Récupérer une collection par son ID
router.get('/getCollectionById', authenticateToken, async (req, res) => {
  try {
    const collectionId = req.query.collectionId;
    const userId = req.user.idUser;
    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);

    if (!collectionId) {
      return res.status(400).send({ error: 'collectionId est requis' });
    }

    // Récupérer le website_id de la collection et vérifier les droits d'accès
    const websiteId = await getCollectionWebsiteId(supabase, collectionId);
    if (!websiteId) {
      return res.status(404).send({ error: 'Collection non trouvée' });
    }

    const { hasAccess } = await checkUserWebsiteAccess(supabase, userId, websiteId);
    if (!hasAccess) {
      return res.status(403).send({ error: 'Collection non trouvée ou accès non autorisé' });
    }

    // Récupérer la collection
    const { data, error } = await supabase
      .from('collection')
      .select('id, collection_name, collection_slug, website_id, created_at, updated_at')
      .eq('id', collectionId)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).send({ error: 'Collection non trouvée' });
      }
      throw error;
    }
    
    res.send({ data });
  } catch (error) {
    console.error('Erreur lors de la récupération de la collection:', error);
    res.status(500).send({ error: error.message });
  }
});

// Récupérer les références de collection
router.get('/getCollectionRef', authenticateToken, async (req, res) => {
  try {
    const sentIdCollectionRef = req.query.id_collection_ref;
    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);
    
    const { data, error } = await supabase
      .from('collection_element')
      .select('id, collection_element_name')
      .eq('collection_id', sentIdCollectionRef);
      
    if (error) throw error;

    
    res.send(data);
  } catch (error) {
    console.error('Erreur lors de la récupération des références de collection:', error);
    res.status(500).send({ error: error.message });
  }
});
//
//
//
//
//



// Créer une page de blog
router.post('/createCollectionElement', authenticateToken, async (req, res) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);
    const userId = req.user.idUser;

    const id = req.body.params.id;
    const title = req.body.params.mainText[0].value;
    const slug = req.body.params.mainText[1].value;
    const date = new Date(req.body.params.date).toISOString();
    const status = req.body.params.status;


    // Support string statuses during migration. We will NOT write a numeric status
    // from here because the numeric column is being deprecated and cannot accept
    // a '2' value for queued states. Only compute statusText for storage.
    const normalizeStatusText = (s) => {
      if (!s && s !== 0) return null;
      if (typeof s === 'string') return s.toLowerCase();
      if (typeof s === 'number') {
        if (s === 1) return 'publish';
        if (s === 0) return 'draft';
        // do not map 2 (queue) to numeric column; prefer text 'wait'
        return null;
      }
      const lowered = String(s).toLowerCase();
      if (lowered === 'publish' || lowered === 'published') return 'publish';
      if (lowered === 'draft') return 'draft';
      if (lowered === 'wait' || lowered === 'queued') return 'wait';
      return null;
    };

    const statusText = normalizeStatusText(status);

    let publishDate = null;
    let publishedBy = null;
    if (status === 1 || status === 'publish' || status === 'published') {
      publishDate = date;
      publishedBy = userId;
    }

    // Insérer la nouvelle page — write only the text status (numeric column is deprecated)
    const insertData = {
      collection_id: id,
      collection_element_name: title,
      collection_element_slug: slug,
      collection_element_status_text: statusText,
      collection_element_create_date: date,
      collection_element_update_date: date,
      collection_element_publish_date: publishDate,
      created_by: userId,
      updated_by: userId,
      published_by: publishedBy
    };

    const { data, error } = await supabase
      .from('collection_element')
      .insert(insertData)
      .select('id');
      
    if (error) throw error;
    
    // Créer des notifications si la page est publiée
    if (status === 1 || status === 'publish' || status === 'published') {
      createNotification(id, title, publishDate, slug);
    }
    
    res.status(200).send({ message: 'Collection_element créée avec succès', id: data[0].id });
  } catch (error) {
    console.error('Erreur lors de la création de collection_element:', error);
    res.status(500).send({ error: error.message });
  }
});
//
//
//
//
//
//
//
// Configuration du stockage pour Multer (stockage temporaire avant upload vers Supabase)
const storageImage = multer.diskStorage({
  destination: function (req, file, cb) {
    const tempDir = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    const fileExtension = path.extname(file.originalname);
    const uniqueName = uuidv4() + fileExtension;
    cb(null, uniqueName);
  }
});

const uploadImage = multer({ storage: storageImage });

// Créer une image de blog
router.post('/createImagesCollection', authenticateToken, uploadImage.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('Aucune image n\'a été téléchargée.');
    }

    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);

    const id_photo = uuidv4();
    const id_blog_page = req.body.id_blog_page;
    const id_config = req.body.id_config;
    const name = req.body.name;
    const alt = req.body.alt;
    const size = parseInt(req.body.size, 10);
    const extension = path.extname(req.file.filename);
    
    const src_image = id_photo + extension;
    const filePath = req.file.path;
    
    // Lire le fichier en buffer plutôt qu'en stream
    const fileBuffer = fs.readFileSync(filePath);
    
    // Upload du fichier vers Supabase Storage avec buffer au lieu de stream
    const { data, error } = await supabase.storage
      .from('collection-images')
      .upload(src_image, fileBuffer, {
        contentType: req.file.mimetype
      });
      
    if (error) throw error;
    
    // Enregistrer les métadonnées dans la base de données
    const { error: insertError } = await supabase
      .from('collection_field_image')
      .insert({
        id: id_photo,
        collection_element_id: id_blog_page,
        id_config,
        src_image,
        name_image: name,
        alt_image: alt,
        size
      });
      
    if (insertError) throw insertError;
    
    // Suppression du fichier temporaire
    fs.unlinkSync(filePath);
    
    res.status(200).send('Image sauvegardée avec succès');
  } catch (error) {
    console.error('Erreur lors de la création de l\'image:', error);
    res.status(500).send({ error: error.message });
  }
});







const storageGallery = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'temp/'); // Temp folder
  },
  filename: function (req, file, cb) {
    const fileExtension = path.extname(file.originalname);
    const uniqueName = uuidv4() + fileExtension;
    cb(null, uniqueName);
  }
});

const uploadGallery = multer({ storage: storageGallery });

router.post('/createGalleryCollection', uploadGallery.array('gallery'), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    console.error('Aucune image n\'a été téléchargée.');
    return res.status(400).send('Aucune image n\'a été téléchargée.');
  }

  const token = req.headers['authorization']?.split(' ')[1];
  const supabase = supabaseServer(token);

  const id_blog_page = req.body.id_blog_page;
  const id_config = req.body.id_config;

  const filesInfo = [];
  let totalsize = 0;

  try {
    for (let index = 0; index < req.files.length; index++) {
      const file = req.files[index];
      const alt = req.body[`alt_${index}`];

      const storagePath = `${file.filename}`;

      // Lire le fichier en buffer plutôt qu'en stream
      const fileBuffer = fs.readFileSync(file.path);

      // Upload vers Supabase avec buffer au lieu de stream
      const { data, error: uploadError } = await supabase.storage
        .from('collection-gallery')
        .upload(storagePath, fileBuffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      // Supprimer le fichier temporaire
      fs.unlinkSync(file.path);

      if (uploadError) {
        console.error('Erreur d\'upload Supabase détaillée:', uploadError);
        return res.status(500).send({ 
          error: uploadError.message || 'Erreur lors de l\'upload de l\'image.',
          details: uploadError.details
        });
      }

      const sizeKb = Math.round(file.size / 1024);
      totalsize += sizeKb;

      filesInfo.push({
        src_photo: file.filename,
        name: file.originalname,
        alt,
        size: sizeKb,
      });
    }

    // Insérer les infos dans la BDD
    const filesInfoJson = JSON.stringify(filesInfo);

    // CORRECTION: Utiliser supabaseServer au lieu de supabase
    const { error: insertError } = await supabase
      .from('collection_field_gallery')
      .insert([{
        collection_element_id: id_blog_page,
        id_config,
        gallery: filesInfoJson,
        size: totalsize
      }]);

    if (insertError) {
      console.error('Erreur BDD détaillée:', insertError);
      return res.status(500).send({ 
        error: insertError.message || 'Erreur lors de l\'insertion en base de données.',
        details: insertError.details
      });
    }

    res.status(200).send({
      success: true,
      message: 'Images sauvegardées avec succès',
      filesInfo
    });

  } catch (err) {
    console.error('Erreur serveur complète:', err);
    res.status(500).send({ 
      error: err.message || 'Erreur serveur non spécifiée',
      status: false
    });
  }
});








const storageVideo = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'temp/'); // Dossier temporaire
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // On conserve le nom d'origine
  }
});

const uploadVideo = multer({ storage: storageVideo });

router.post('/createVideoCollection', uploadVideo.single('video'), async (req, res) => {
  if (!req.file) {
    console.error('Aucune vidéo n\'a été téléchargée.');
    return res.status(400).send('Aucune vidéo n\'a été téléchargée.');
  }


  const token = req.headers['authorization']?.split(' ')[1];
  const supabase = supabaseServer(token);

  const id_video = req.body.id_video || uuidv4();
  const id_blog_page = req.body.id_blog_page;
  const id_config = req.body.id_config;
  const name = req.body.name || req.file.originalname;
  const alt = req.body.alt || '';
  const size = Math.round(req.file.size / 1024);

  // Stocker directement à la racine, sans le sous-dossier videos/
  const storagePath = `${req.file.originalname}`;
  const filePath = req.file.path;

  try {
    // Lire le fichier en buffer plutôt qu'en stream
    const fileBuffer = fs.readFileSync(filePath);
    
    const { data, error: uploadError } = await supabase.storage
      .from('collection-video')
      .upload(storagePath, fileBuffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    // Supprimer le fichier temporaire
    fs.unlinkSync(filePath);



    if (uploadError) {
      console.error('Erreur d\'upload Supabase détaillée:', uploadError);
      return res.status(500).send({ 
        error: uploadError.message || 'Erreur lors de l\'upload de la vidéo.',
        details: uploadError.details
      });
    }

    // Utiliser directement le nom du fichier sans préfixe de dossier
    const src_video = req.file.originalname;

    const { error: insertError } = await supabase
      .from('collection_field_video')
      .insert([{
        id: id_video,
        collection_element_id: id_blog_page,
        id_config,
        src_video,
        name_video: name,
        alt_video: alt,
        size
      }]);

    if (insertError) {
      console.error('Erreur BDD détaillée:', insertError);
      return res.status(500).send({ 
        error: insertError.message || 'Erreur lors de l\'insertion en base de données.',
        details: insertError.details
      });
    }


    res.status(200).send({
      success: true,
      message: 'Vidéo sauvegardée avec succès',
      videoId: id_video
    });

  } catch (err) {
    console.error('Exception complète:', err);
    res.status(500).send({ 
      error: err.message || 'Erreur serveur non spécifiée',
      status: false
    });
  }
});





router.post('/createTextCollection', authenticateToken, async (req, res) => {
  try {
    const id = req.body.params.id;
    const texts = req.body.params.otherText;
    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);
    for (const item of texts) {
      // Vérifier si la ligne existe déjà
      const { data: existing, error: selectError } = await supabase
        .from('collection_field_text')
        .select('id_text')
        .eq('collection_element_id', id)
        .eq('id_config', item.id_config)
        .maybeSingle();
      if (selectError) throw selectError;
      if (existing) {
        // Update si existe
        const { error: updateError } = await supabase
          .from('collection_field_text')
          .update({ text: item.value })
          .eq('id_text', existing.id_text);
        if (updateError) throw new Error('Erreur Supabase DB: ' + updateError.message);
      } else {
        // Insert sinon
        const { error: insertError } = await supabase
          .from('collection_field_text')
          .insert([
            {
              collection_element_id: id,
              id_config: item.id_config,
              text: item.value,
            },
          ]);
        if (insertError) throw new Error('Erreur Supabase DB: ' + insertError.message);
      }
    }
    res.status(200).send('Tous les textes ont été créés ou mis à jour avec succès');
  } catch (error) {
    console.error('Erreur lors de la création des textes:', error);
    res.status(500).send({ error: error.message });
  }
});



router.post('/createRichTextCollection', async (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];
  const supabase = supabaseServer(token);
  const richtext = req.body.params.infoRichText;
  const id_blog_page = req.body.params.id;
  const saveImageToSupabase = async (base64Data) => {
    const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches || matches.length !== 3) throw new Error('Base64 invalide');
    const imageExtension = matches[1];
    const imageBuffer = Buffer.from(matches[2], 'base64');
    const imageName = `${uuidv4()}.${imageExtension}`;
    const storagePath = `${imageName}`;
    const { error: uploadError } = await supabase.storage
      .from('collection-richtext-images')
      .upload(storagePath, imageBuffer, {
        contentType: `image/${imageExtension}`,
        upsert: false,
      });
    if (uploadError) throw new Error('Erreur Supabase : ' + uploadError.message);
    const { data } = supabase.storage
      .from('collection-richtext-images')
      .getPublicUrl(storagePath);
    const fileSizeInKB = Math.round(Buffer.byteLength(imageBuffer) / 1024);
    return { url: data.publicUrl, size: fileSizeInKB };
  };
  try {
    for (const item of richtext) {
      const id_config = item.id_config;
      let richTextJSON = item.richText;
      const content = JSON.parse(richTextJSON);
      const entityMap = content.entityMap;
      const imageKeys = Object.keys(entityMap).filter(
        (key) => entityMap[key].type === 'IMAGE' && entityMap[key].data.src.startsWith('data:image/')
      );
      for (const key of imageKeys) {
        const result = await saveImageToSupabase(entityMap[key].data.src);
        entityMap[key].data.src = result.url;
        entityMap[key].data.size = result.size;
      }
      richTextJSON = JSON.stringify(content);
      const totalSize = Object.keys(entityMap).reduce((acc, key) => {
        return acc + (entityMap[key].data.size || 0);
      }, 0);
      // Vérifier si la ligne existe déjà
      const { data: existing, error: selectError } = await supabase
        .from('collection_field_richtext')
        .select('id_richtext')
        .eq('collection_element_id', id_blog_page)
        .eq('id_config', id_config)
        .maybeSingle();
      if (selectError) throw selectError;
      if (existing) {
        // Update si existe
        const { error: updateError } = await supabase
          .from('collection_field_richtext')
          .update({ text_json: richTextJSON, size: totalSize })
          .eq('id_richtext', existing.id_richtext);
        if (updateError) throw new Error('Erreur Supabase DB: ' + updateError.message);
      } else {
        // Insert sinon
        const { error: insertError } = await supabase
          .from('collection_field_richtext')
          .insert([
            {
              collection_element_id: id_blog_page,
              id_config,
              text_json: richTextJSON,
              size: totalSize,
            },
          ]);
        if (insertError) throw new Error('Erreur Supabase DB: ' + insertError.message);
      }
    }
    res.status(200).send('RichText enregistré avec succès dans Supabase');
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: error.message });
  }
});



router.post('/createMultiReferenceCollection', authenticateToken, async (req, res) => {
  try {

    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);

     

    const id = req.body.params.id;
    const multiReference = req.body.params.multiReference;
    // multiReference est un objet { id_config, value }


    await supabase
      .from('collection_field_multireference')
      .insert({
        collection_element_id: id,
        id_config: multiReference.id_config,
        info_ref: multiReference.value
      });
    res.status(200).send('MultiReference créée avec succès');
  } catch (error) {
    console.error('Erreur lors de la création du MultiReference:', error);
    res.status(500).send({ error: error.message });
  }
});





//
router.get('/getCollectionElement', authenticateToken, async (req, res) => {
  try {
    const sentIdBlogPage = req.query.IdBlogPage;
    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);

    // Utilisation de Supabase pour récupérer les données avec les informations utilisateur
    const { data, error } = await supabase
      .from('collection_element')
      .select(`
        collection_element_name, 
        collection_element_slug, 
        collection_element_status_text,
        collection_element_create_date, 
        collection_element_update_date, 
        collection_element_publish_date,
        created_by,
        updated_by,
        published_by,
        creator:created_by(username),
        updater:updated_by(username),
        publisher:published_by(username)
      `)
      .eq('id', sentIdBlogPage)
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') throw error;
    
    // Si aucun résultat n'est trouvé
    if (!data) {
      return res.status(404).send({ error: 'Page non trouvée' });
    }
    
    // Formater la réponse pour correspondre à l'ancienne structure (pour compatibilité)
    const blogPage = [{
      page_blog_name: data.collection_element_name,
      page_blog_slug: data.collection_element_slug,
      status: data.collection_element_status_text,
      page_blog_create_date: data.collection_element_create_date,
      page_blog_update_date: data.collection_element_update_date,
      page_blog_publish_date: data.collection_element_publish_date,
      created_by_username: data.creator?.username || 'Utilisateur inconnu',
      updated_by_username: data.updater?.username || 'Utilisateur inconnu',
      published_by_username: data.publisher?.username || null
    }];
    
    const blogPageCrypt = jwt.sign({ blogPage }, secretKey);
    res.send(blogPageCrypt);
  } catch (error) {
    console.error('Erreur lors de la récupération de la page:', error);
    res.status(500).send({ error: error.message });
  }
});
//
//





router.get('/getTextCollection', authenticateToken, async (req, res) => {
  try {
    const sentIdBlogPage = req.query.IdBlogPage;
    const sentIdConfig = req.query.IdConfig;

    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);


    // Utilisation de Supabase pour récupérer les données
    const { data, error } = await supabase
      .from('collection_field_text')
      .select('id_config, text')
      .eq('collection_element_id', sentIdBlogPage)
      .eq('id_config', sentIdConfig);

    if (error) throw error;

    // Ajout du flag create à chaque résultat comme dans le code original
    const results = data && data.length > 0
      ? data.map(result => ({ ...result, create: true }))
      : [];

    res.send(results);
  } catch (error) {
    console.error('Erreur lors de la récupération du texte:', error);
    res.status(500).send({ error: error.message });
  }
});
//
//
router.get('/getRichTextCollection', authenticateToken, async (req, res) => {
  try {
    const sentIdBlogPage = req.query.IdBlogPage;
    const sentIdConfig = req.query.IdConfig;

    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);

    // Utilisation de Supabase pour récupérer les données
    const { data, error } = await supabase
      .from('collection_field_richtext')
      .select('id_config, text_json')
      .eq('collection_element_id', sentIdBlogPage)
      .eq('id_config', sentIdConfig);

    if (error) throw error;

    // Ajout du flag create à chaque résultat comme dans le code original
    const results = data && data.length > 0
      ? data.map(result => ({ ...result, create: true }))
      : [];

    res.send(results);
  } catch (error) {
    console.error('Erreur lors de la récupération du richtext:', error);
    res.status(500).send({ error: error.message });
  }
});
//
//
router.get('/getImageCollection', authenticateToken, async (req, res) => {
  try {
    const sentIdBlogPage = req.query.IdBlogPage;
    const sentIdConfig = req.query.IdConfig;

    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);

    // Utilisation de Supabase pour récupérer les données
    const { data, error } = await supabase
      .from('collection_field_image')
      .select('id_config, src_image, name_image, alt_image, size')
      .eq('collection_element_id', sentIdBlogPage)
      .eq('id_config', sentIdConfig);

    if (error) throw error;

    const imagesData = data && data.length > 0
      ? data.map(image => ({
          id_config: image.id_config,
          name: image.name_image,
          src: image.src_image,
          alt: image.alt_image,
          size: image.size,
          create: true
        }))
      : [];
    res.status(200).json(imagesData);
  } catch (error) {
    console.error('Erreur lors de la récupération des images:', error);
    res.status(500).send({ error: error.message });
  }
});
//
//
router.get('/getGalleryCollection', authenticateToken, async (req, res) => {
  try {
    const sentIdBlogPage = req.query.IdBlogPage;
    const sentIdConfig = req.query.IdConfig;

    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);

    // Utilisation de Supabase pour récupérer les données
    const { data, error } = await supabase
      .from('collection_field_gallery')
      .select('id_config, gallery, size')
      .eq('collection_element_id', sentIdBlogPage)
      .eq('id_config', sentIdConfig);

    if (error) throw error;

    // Ajoutez le booléen `create` à chaque résultat
    const gallery_blog = data && data.length > 0
      ? data.map(result => ({ ...result, create: true }))
      : [];

    res.status(200).json(gallery_blog);
  } catch (error) {
    console.error('Erreur lors de la récupération de la galerie:', error);
    res.status(500).send({ error: error.message });
  }
});
//
//
router.get('/getVideoCollection', authenticateToken, async (req, res) => {
  try {
    const sentIdBlogPage = req.query.IdBlogPage;
    const sentIdConfig = req.query.IdConfig;

    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);

    // Utilisation de Supabase pour récupérer les données
    const { data, error } = await supabase
      .from('collection_field_video')
      .select('id_config, src_video, name_video, alt_video, size')
      .eq('collection_element_id', sentIdBlogPage)
      .eq('id_config', sentIdConfig);

    if (error) throw error;

    const videoData = data && data.length > 0
      ? data.map(video => ({
          id_config: video.id_config,
          src: video.src_video,
          name: video.name_video,
          alt: video.alt_video,
          size: video.size,
          create: true
        }))
      : [];
    res.status(200).json(videoData);
  } catch (error) {
    console.error('Erreur lors de la récupération des vidéos:', error);
    res.status(500).send({ error: error.message });
  }
});
//
//
router.get('/getMultiReferenceCollection', authenticateToken, async (req, res) => {
  try {
    const sentIdBlogPage = req.query.IdBlogPage;
    const sentIdConfig = req.query.IdConfig;

    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);

    // Utilisation de Supabase pour récupérer les données
    const { data, error } = await supabase
      .from('collection_field_multireference')
      .select('id_config, info_ref')
      .eq('collection_element_id', sentIdBlogPage)
      .eq('id_config', sentIdConfig);

    if (error) throw error;

    const updatedResults = data && data.length > 0
      ? data.map(result => ({ ...result, create: true }))
      : [];

    res.send(updatedResults);
  } catch (error) {
    console.error('Erreur lors de la récupération des multi-références:', error);
    res.status(500).send({ error: error.message });
  }
});



// Met à jour une page de collection (équivalent blog_page)
router.post('/updateCollectionElement', authenticateToken, async (req, res) => {
  try {
    const id = req.body.params.id;
    const title = req.body.params.mainText[0].value;
    const slug = req.body.params.mainText[1].value;
    const date = req.body.params.date;
    const status = req.body.params.status;
    const setPublishDate = req.body.params.setpublishDate;


    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);
    const userId = req.user.idUser;

    // Read current row to determine previous status
    const { data: existingRows, error: selectError } = await supabase
      .from('collection_element')
      .select('id, collection_element_status_text, collection_element_publish_date')
      .eq('id', id)
      .limit(1);

    if (selectError) throw selectError;
    const existing = existingRows && existingRows.length > 0 ? existingRows[0] : null;

    // Normalize incoming status to text (we will prefer text column and avoid writing numeric '2')
    const normalizeToText = (s) => {
      if (s === undefined || s === null) return null;
      if (typeof s === 'string') return s.toLowerCase();
      if (typeof s === 'number') {
        if (s === 1) return 'publish';
        if (s === 0) return 'draft';
        if (s === 2) return 'wait';
        return null;
      }
      const lowered = String(s).toLowerCase();
      if (lowered === 'publish' || lowered === 'published') return 'publish';
      if (lowered === 'draft') return 'draft';
      if (lowered === 'wait' || lowered === 'queued') return 'wait';
      return null;
    };

    const targetText = normalizeToText(status);
    const prevText = existing?.collection_element_status_text ? String(existing.collection_element_status_text).toLowerCase() : null;

    // Build update fields: write textual status only (avoid numeric 2 and avoid writing numeric column when possible)
    const updateFields = {
      collection_element_name: title,
      collection_element_slug: slug,
      collection_element_status_text: targetText,
      collection_element_update_date: date,
      updated_by: userId
    };

    // Handle publish date and published_by
    if (setPublishDate === 1) {
      if (targetText === 'publish') {
        updateFields.collection_element_publish_date = date;
        updateFields.published_by = userId;
      } else {
        // clearing publish date when switching away from publish
        updateFields.collection_element_publish_date = null;
        updateFields.published_by = null;
      }
    } else {
      // Si on passe de draft à publish/wait ou de wait à publish sans date de publication existante
      const isTransitionNeedingPublishDate = (
        (prevText === 'draft' && (targetText === 'publish' || targetText === 'wait')) ||
        (prevText === 'wait' && targetText === 'publish')
      );
      
      if (isTransitionNeedingPublishDate && !existing?.collection_element_publish_date) {
        updateFields.collection_element_publish_date = date;
        if (targetText === 'publish') {
          updateFields.published_by = userId;
        }
      }
    }

    const { error: updateError } = await supabase
      .from('collection_element')
      .update(updateFields)
      .eq('id', id);

    if (updateError) throw updateError;

    // Decide whether client should regenerate the static site
    // Regenerate when:
    // - target is 'publish' (new publish)
    // - or previous was 'publish' and target is not 'publish' (depublish)
    // - or previous was 'wait' and target is 'publish' (wait -> publish)
    const needRegenerate = (targetText === 'publish') || (prevText === 'publish' && targetText !== 'publish') || (prevText === 'wait' && targetText === 'publish');

    // Optionally: create notification when publishing
    if (targetText === 'publish') {
      try {
        createNotification(id, title, date, slug);
      } catch (e) {
        console.warn('Notification creation failed (non-fatal):', e);
      }
    }

    res.status(200).send({ message: 'Page modifiée avec succès', needRegenerate });
  } catch (error) {
    console.error('Erreur lors de la modification de la page:', error);
    res.status(500).send({ error: error.message });
  }
});

// Met à jour les textes d'une page de collection
router.post('/updateTextCollection', authenticateToken, async (req, res) => {
  try {
    const id = req.body.params.id;
    const texts = req.body.params.otherText;
    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);

    const updatePromises = texts.map(item =>
      supabase
        .from('collection_field_text')
        .update({ text: item.value })
        .eq('collection_element_id', id)
        .eq('id_config', item.id_config)
    );
    await Promise.all(updatePromises);
    res.status(200).send('Tous les textes ont été modifiés avec succès');
  } catch (error) {
    console.error('Erreur lors de la modification des textes:', error);
    res.status(500).send({ error: error.message });
  }
});

// Met à jour les RichText d'une page de collection
router.post('/updateRichTextCollection', authenticateToken, async (req, res) => {
  const richtext = req.body.params.infoRichText;
  const id_blog_page = req.body.params.id;

  const token = req.headers['authorization']?.split(' ')[1];
  const supabase = supabaseServer(token);

  const saveImageToSupabase = async (base64Data) => {
    const matches = base64Data.match(/^data:image\/([A-Za-z-+/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) throw new Error('Base64 invalide');
    const imageExtension = matches[1];
    const imageBuffer = Buffer.from(matches[2], 'base64');
    const imageName = `${uuidv4()}.${imageExtension}`;
    const storagePath = `${imageName}`;
    const { error: uploadError } = await supabase.storage
      .from('collection-richtext-images')
      .upload(storagePath, imageBuffer, {
        contentType: `image/${imageExtension}`,
        upsert: false,
      });

    if (uploadError) throw new Error('Erreur Supabase : ' + uploadError.message);

    const { data } = supabase.storage
      .from('collection-richtext-images')
      .getPublicUrl(storagePath);

    const fileSizeInKB = Math.round(Buffer.byteLength(imageBuffer) / 1024);
    return { url: data.publicUrl, size: fileSizeInKB };
  };

  try {
    for (const item of richtext) {
      const id_config = item.id_config;
      let richTextJSON = item.richText;

      const content = JSON.parse(richTextJSON);
      const entityMap = content.entityMap;

      const imageKeys = Object.keys(entityMap).filter(
        (key) => entityMap[key].type === 'IMAGE' && entityMap[key].data.src.startsWith('data:image/')
      );

      for (const key of imageKeys) {
        const result = await saveImageToSupabase(entityMap[key].data.src);
        entityMap[key].data.src = result.url;
        entityMap[key].data.size = result.size;
      }

      richTextJSON = JSON.stringify(content);
      const totalSize = Object.keys(entityMap).reduce((acc, key) => {
        return acc + (entityMap[key].data.size || 0);
      }, 0);

      // Vérifier si la ligne existe déjà
      const { data: existing, error: selectError } = await supabase
        .from('collection_field_richtext')
        .select('id_richtext')
        .eq('collection_element_id', id_blog_page)
        .eq('id_config', id_config)
        .maybeSingle();
      if (selectError) throw selectError;
      
      if (existing) {
        // Update si existe
        const { error: updateError } = await supabase
          .from('collection_field_richtext')
          .update({ text_json: richTextJSON, size: totalSize })
          .eq('id_richtext', existing.id_richtext);
        if (updateError) throw new Error('Erreur Supabase DB: ' + updateError.message);
      } else {
        // Insert sinon
        const { error: insertError } = await supabase
          .from('collection_field_richtext')
          .insert([
            {
              collection_element_id: id_blog_page,
              id_config,
              text_json: richTextJSON,
              size: totalSize,
            },
          ]);
        if (insertError) throw new Error('Erreur Supabase DB: ' + insertError.message);
      }
    }

    res.status(200).send('RichText enregistré avec succès dans Supabase');
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: error.message });
  }
});

// Met à jour une image d'une page de collection
router.post('/updateImageCollection', authenticateToken, uploadImage.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('Aucune image n\'a été téléchargée.');
    }
    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);

    const id_photo = path.basename(req.file.filename, path.extname(req.file.filename));
    const id_blog_page = req.body.id_blog_page;
    const id_config = req.body.id_config;
    const name = req.body.name;
    const alt = req.body.alt;
    const size = parseInt(req.body.size, 10);
    const extension = path.extname(req.file.filename);
    const src_image = id_photo + extension;
    const filePath = req.file.path;
    // Upload nouvelle image
    const fileBuffer = fs.readFileSync(filePath);
    const { error: uploadError } = await supabase.storage
      .from('collection-images')
      .upload(src_image, fileBuffer, {
        contentType: req.file.mimetype
      });
    if (uploadError) throw new Error('Erreur upload Supabase: ' + uploadError.message);
    // Update metadata
    const { error: updateError } = await supabase
      .from('collection_field_image')
      .update({ src_image, name_image: name, alt_image: alt, size })
      .eq('collection_element_id', id_blog_page)
      .eq('id_config', id_config);
    if (updateError) throw new Error('Erreur update BDD: ' + updateError.message);
    fs.unlinkSync(filePath);
    res.status(200).send('Image modifiée avec succès');
  } catch (error) {
    console.error('Erreur lors de la modification de l\'image:', error);
    res.status(500).send({ error: error.message });
  }
});


router.post('/updateImageAltCollection', authenticateToken, async (req, res) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);

    // Correction : récupérer les paramètres dans req.body.params
    const id_blog_page = req.body.params?.id_blog_page;
    const id_config = req.body.params?.id_config;
    const alt = req.body.params?.alt;

    if (!id_blog_page || !id_config) {
      return res.status(400).send({ error: 'id_blog_page et id_config sont requis' });
    }

    const { error } = await supabase
      .from('collection_field_image')
      .update({ alt_image: alt })
      .eq('collection_element_id', id_blog_page)
      .eq('id_config', id_config);
    if (error) throw error;
    res.status(200).send('Alt de l\'image modifiée avec succès');
  } catch (error) { 
    console.error('Erreur lors de la modification de l\'alt de l\'image:', error);
    res.status(500).send({ error: error.message });
  }
});



// Met à jour la galerie d'une page de collection
router.post('/updateGalleryCollection', authenticateToken, uploadGallery.array('gallery'), async (req, res) => {
  // On ne bloque plus si !req.files, car il peut n'y avoir que des anciennes images

  const token = req.headers['authorization']?.split(' ')[1];
  const supabase = supabaseServer(token);

  const id_blog_page = req.body.id_blog_page;
  const id_config = req.body.id_config;
  const galleryLength = parseInt(req.body.gallery_length, 10); // à envoyer côté client
  const finalGallery = [];
  let fileIndex = 0;
  let totalSize = 0;


  try {
    for (let i = 0; i < galleryLength; i++) {
      const existing = req.body[`existing_${i}`];
      if (existing) {
        // Ancienne image, on la garde
        const parsed = JSON.parse(existing);
        finalGallery.push(parsed);
        totalSize += parseInt(parsed.size, 10) || 0;
      } else {
        // Nouvelle image uploadée
        const file = req.files[fileIndex];
        if (file) {
          const id_photo = path.basename(file.filename, path.extname(file.filename));
          const extension = path.extname(file.filename);
          const src_photo = id_photo + extension;
          const name = file.originalname;
          const alt = req.body[`alt_${i}`] || '';
          const size = Math.round(file.size / 1024);
          const fileBuffer = fs.readFileSync(file.path);
          // Upload image
          const { error: uploadError } = await supabase.storage
            .from('collection-gallery')
            .upload(src_photo, fileBuffer, {
              contentType: file.mimetype
            });
          if (uploadError) throw new Error('Erreur upload Supabase: ' + uploadError.message);
          finalGallery.push({ src_photo, name, alt, size });
          totalSize += size;
          fs.unlinkSync(file.path);
          fileIndex++;
        }
      }
    }
    // Update BDD
    const filesInfoJson = JSON.stringify(finalGallery);
    const { error: updateError } = await supabase
      .from('collection_field_gallery')
      .update({ gallery: filesInfoJson, size: totalSize })
      .eq('collection_element_id', id_blog_page)
      .eq('id_config', id_config);
    if (updateError) throw new Error('Erreur update BDD: ' + updateError.message);
    res.status(200).send({ success: true, message: 'Galerie modifiée avec succès', filesInfo: finalGallery });
  } catch (err) {
    console.error('Erreur lors de la modification de la galerie:', err);
    res.status(500).send({ error: err.message });
  }
});

// Met à jour une vidéo d'une page de collection
router.post('/updateVideoCollection', authenticateToken, uploadVideo.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('Aucune vidéo n\'a été téléchargée.');
    }

    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);

    const id_video = req.body.id_video;
    const id_blog_page = req.body.id_blog_page;
    const id_config = req.body.id_config;
    const name = req.body.name || req.file.originalname;
    const alt = req.body.alt || '';
    const size = Math.round(req.file.size / 1024);
    const src_video = id_video + '.mp4';
    const fileBuffer = fs.readFileSync(req.file.path);
    // Upload vidéo
    const { error: uploadError } = await supabase.storage
      .from('collection-video')
      .upload(src_video, fileBuffer, {
        contentType: req.file.mimetype
      });
    if (uploadError) throw new Error('Erreur upload Supabase: ' + uploadError.message);
    // Update metadata
    const { error: updateError } = await supabase
      .from('collection_field_video')
      .update({ src_video, name_video: name, alt_video: alt, size })
      .eq('collection_element_id', id_blog_page)
      .eq('id_config', id_config);
    if (updateError) throw new Error('Erreur update BDD: ' + updateError.message);
    fs.unlinkSync(req.file.path);
    res.status(200).send('Vidéo modifiée avec succès');
  } catch (error) {
    console.error('Erreur lors de la modification de la vidéo:', error);
    res.status(500).send({ error: error.message });
  }
});

// Met à jour une multi-référence d'une page de collection
router.post('/updateMultiReferenceCollection', authenticateToken, async (req, res) => {
  try {

    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);

    const id = req.body.params.id;
    const multiReference = req.body.params.multiReference;


    const { error } = await supabase
      .from('collection_field_multireference')
      .update({ info_ref: multiReference.value })
      .eq('collection_element_id', id)
      .eq('id_config', multiReference.id_config);
    if (error) throw error;
    res.status(200).send('MultiReference modifiée avec succès');
  } catch (error) {
    console.error('Erreur lors de la modification du MultiReference:', error);
    res.status(500).send({ error: error.message });
  }
});





router.delete('/deleteCollectionData', authenticateToken, async (req, res) => {
  console.log('Requête de suppression reçue:', req.body);
  const id_blog_page = req.body.id_blog_page;
  const dataArray = req.body.data;

  const token = req.headers['authorization']?.split(' ')[1];
  const supabase = supabaseServer(token);

  try {
    for (const data of dataArray) {
      const id_config = data.id_config;
      const type = data.type;
      if (type === 'images') {
        // Récupérer le nom de l'image
        const { data: imgData, error: imgError } = await supabase
          .from('collection_field_image')
          .select('src_image')
          .eq('collection_element_id', id_blog_page)
          .eq('id_config', id_config);
        if (imgError) throw imgError;
        if (imgData && imgData.length > 0) {
          for (const img of imgData) {
            if (img.src_image) {
              await supabase.storage.from('collection-images').remove([img.src_image]);
            }
          }
        }
        await supabase
          .from('collection_field_image')
          .delete()
          .eq('collection_element_id', id_blog_page)
          .eq('id_config', id_config);
      } else if (type === 'video') {
        // Récupérer le nom de la vidéo
        const { data: vidData, error: vidError } = await supabase
          .from('collection_field_video')
          .select('src_video')
          .eq('collection_element_id', id_blog_page)
          .eq('id_config', id_config);
        if (vidError) throw vidError;
        if (vidData && vidData.length > 0) {
          for (const vid of vidData) {
            if (vid.src_video) {
              await supabase.storage.from('collection-video').remove([vid.src_video]);
            }
          }
        }
        await supabase
          .from('collection_field_video')
          .delete()
          .eq('collection_element_id', id_blog_page)
          .eq('id_config', id_config);
      }
    }
    res.status(200).send({ message: 'Données supprimées avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression des données:', error);
    res.status(500).send({ error: error.message });
  }
});



router.delete('/deleteCollectionElement', authenticateToken, async (req, res) => {
  console.log('Requête de suppression de l\'élément de collection reçue:', req.query);
  try {

    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);

    const idBlogPage = req.query.IdBlogPage;
    const idBlog = req.query.Id;

    // Récupérer la config des champs de la collection
    const { data: configData, error: configError } = await supabase
      .from('collection_config')
      .select('tab_field, id')
      .eq('collection_id', idBlog);
    if (configError) throw configError;
    for (const field of configData) {


      const id_config = field.id;
      const type = field.tab_field;
      if (type === 'text') {
        const { error: delError } = await supabase
          .from('collection_field_text')
          .delete()
          .eq('collection_element_id', idBlogPage)
          .eq('id_config', id_config);
        if (delError && delError.code !== 'PGRST116') throw delError;
      } else if (type === 'richText') {
        const { data: richData, error: richError } = await supabase
          .from('collection_field_richtext')
          .select('text_json')
          .eq('collection_element_id', idBlogPage)
          .eq('id_config', id_config);
        if (richError && richError.code !== 'PGRST116') throw richError;
        if (richData && richData.length > 0) {
          for (const richItem of richData) {
            if (richItem.text_json) {
              let entityMap = {};
              try {
                const content = JSON.parse(richItem.text_json);
                entityMap = content.entityMap || {};
              } catch {}
              const images = Object.keys(entityMap)
                .filter(key => entityMap[key].type === 'IMAGE')
                .map(key => entityMap[key].data.src);
              for (const url of images) {
                const name = url.split('/').pop();
                await supabase.storage.from('collection-richtext-images').remove([name]);
              }
            }
          }
        }
        const { error: delError } = await supabase
          .from('collection_field_richtext')
          .delete()
          .eq('collection_element_id', idBlogPage)
          .eq('id_config', id_config);
        if (delError && delError.code !== 'PGRST116') throw delError;
      } else if (type === 'multiReference') {
        const { error: delError } = await supabase
          .from('collection_field_multireference')
          .delete()
          .eq('collection_element_id', idBlogPage)
          .eq('id_config', id_config);
        if (delError && delError.code !== 'PGRST116') throw delError;
      } else if (type === 'image') {
        const { data: imgData, error: imgError } = await supabase
          .from('collection_field_image')
          .select('src_image')
          .eq('collection_element_id', idBlogPage)
          .eq('id_config', id_config)
          .maybeSingle();
        if (imgError && imgError.code !== 'PGRST116') throw imgError;
        if (imgData && imgData.src_image) {
          await supabase.storage.from('collection-images').remove([imgData.src_image]);
        }
        const { error: delError } = await supabase
          .from('collection_field_image')
          .delete()
          .eq('collection_element_id', idBlogPage)
          .eq('id_config', id_config);
        if (delError && delError.code !== 'PGRST116') throw delError;
      } else if (type === 'video') {
        const { data: vidData, error: vidError } = await supabase
          .from('collection_field_video')
          .select('src_video')
          .eq('collection_element_id', idBlogPage)
          .eq('id_config', id_config)
          .maybeSingle();
        if (vidError && vidError.code !== 'PGRST116') throw vidError;
        if (vidData && vidData.src_video) {
          await supabase.storage.from('collection-video').remove([vidData.src_video]);
        }
        const { error: delError } = await supabase
          .from('collection_field_video')
          .delete()
          .eq('collection_element_id', idBlogPage)
          .eq('id_config', id_config);
        if (delError && delError.code !== 'PGRST116') throw delError;
      } else if (type === 'gallery') {
        const { data: galData, error: galError } = await supabase
          .from('collection_field_gallery')
          .select('gallery')
          .eq('collection_element_id', idBlogPage)
          .eq('id_config', id_config)
          .maybeSingle();
        if (galError && galError.code !== 'PGRST116') throw galError;
        if (galData && galData.gallery) {
          let galleryArr = [];
          try { galleryArr = JSON.parse(galData.gallery); } catch {}
          for (const img of galleryArr) {
            await supabase.storage.from('collection-gallery').remove([img.src_photo]);
          }
        }
        const { error: delError } = await supabase
          .from('collection_field_gallery')
          .delete()
          .eq('collection_element_id', idBlogPage)
          .eq('id_config', id_config);
        if (delError && delError.code !== 'PGRST116') throw delError;
      }
    }
    // Supprimer la page elle-même (après avoir supprimé tous les enfants)
    const { error: deleteError } = await supabase
      .from('collection_element')
      .delete()
      .eq('id', idBlogPage);
    if (deleteError && deleteError.code !== 'PGRST116') throw deleteError;

    console.log('Suppression réussie de la page de collection avec ID:', idBlogPage);
    res.status(200).send({ message: 'Page supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la page:', error);
    res.status(500).send({ error: error.message });
  }
});




// Créer une nouvelle collection principale (supporte config_fields optionnel)
router.post('/createCollectionMain', authenticateToken, async (req, res) => {
  try {
    const { collection_name, collection_slug, website_id: rawWebsiteId, websiteId: altWebsiteId, config_fields } = req.body;
    const website_id = rawWebsiteId || altWebsiteId; // tolérer les deux clés
    if (!website_id) {
      return res.status(400).send({ error: "website_id (ou websiteId) est requis" });
    }
    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);
    const userId = req.user.idUser;

    // Vérifier droits d'accès
    const { hasAccess } = await checkUserWebsiteAccess(supabase, userId, website_id);
    if (!hasAccess) {
      return res.status(403).send({ error: "Vous n'avez pas les droits pour créer une collection sur ce site web" });
    }

    // Slug unique sur ce site
    const { data: existing, error: checkError } = await supabase
      .from('collection')
      .select('id')
      .eq('collection_slug', collection_slug)
      .eq('website_id', website_id)
      .maybeSingle();
    if (checkError) throw checkError;
    if (existing) {
      return res.status(400).send({ error: 'Une collection avec ce slug existe déjà sur ce site web' });
    }

    // Créer la collection
    const { data: created, error: createError } = await supabase
      .from('collection')
      .insert({
        collection_name,
        collection_slug,
        website_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    if (createError) throw createError;

    let insertedConfig = [];
    if (Array.isArray(config_fields) && config_fields.length > 0) {
      try {
        const configToInsert = config_fields.map((field, index) => ({
          collection_id: created.id,
            tab_field: field.tab_field,
            name_field: field.name_field,
            description_field: field.description_field || '',
            collection_id_ref: field.collection_id_ref || null,
            multiline_text: field.multiline_text || false,
            field_order: index
        }));
        const { data: cfg, error: cfgError } = await supabase
          .from('collection_config')
          .insert(configToInsert)
          .select();
        if (cfgError) throw cfgError;
        insertedConfig = cfg;
      } catch (cfgErr) {
        // rollback collection si config échoue
        await supabase.from('collection').delete().eq('id', created.id);
        throw cfgErr;
      }
    }

    res.send({ message: 'Collection créée avec succès', id: created.id, config_inserted: insertedConfig.length, config_fields: insertedConfig });
  } catch (error) {
    console.error('Erreur lors de la création de la collection:', error);
    res.status(500).send({ error: error.message });
  }
});

// Créer la configuration d'une collection
router.post('/createCollectionConfig', authenticateToken, async (req, res) => {
  try {
    const { collection_id, config_fields } = req.body;
    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);
    const userId = req.user.idUser;

    // Récupérer le website_id de la collection et vérifier les droits d'accès
    const websiteId = await getCollectionWebsiteId(supabase, collection_id);
    if (!websiteId) {
      return res.status(404).send({ error: 'Collection non trouvée' });
    }

    const { hasAccess } = await checkUserWebsiteAccess(supabase, userId, websiteId);
    if (!hasAccess) {
      return res.status(403).send({ error: 'Vous n\'avez pas les droits pour configurer cette collection' });
    }

    // Insérer la configuration des champs
    const configToInsert = config_fields.map((field, index) => ({
      collection_id: parseInt(collection_id),
      tab_field: field.tab_field,
      name_field: field.name_field,
      description_field: field.description_field || '',
      collection_id_ref: field.collection_id_ref || null,
      multiline_text: field.multiline_text || false,
      field_order: index
    }));

    const { data, error } = await supabase
      .from('collection_config')
      .insert(configToInsert)
      .select();
      
    if (error) throw error;
    
    res.send({ message: 'Configuration créée avec succès', data });
  } catch (error) {
    console.error('Erreur lors de la création de la configuration:', error);
    res.status(500).send({ error: error.message });
  }
});



// Récupérer la configuration d'une collection par son ID
router.get('/getCollectionConfigById', authenticateToken, async (req, res) => {
  try {
    const collectionId = req.query.collectionId;
    const userId = req.user.idUser;
    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);

    if (!collectionId) {
      return res.status(400).send({ error: 'collectionId est requis' });
    }

    // Récupérer le website_id de la collection et vérifier les droits d'accès
    const websiteId = await getCollectionWebsiteId(supabase, collectionId);
    if (!websiteId) {
      return res.status(404).send({ error: 'Collection non trouvée' });
    }

    const { hasAccess } = await checkUserWebsiteAccess(supabase, userId, websiteId);
    if (!hasAccess) {
      return res.status(403).send({ error: 'Vous n\'avez pas les droits pour accéder à cette collection' });
    }
    
    // Récupérer la configuration des champs
    const { data, error } = await supabase
      .from('collection_config')
      .select('id, tab_field, name_field, description_field, collection_id_ref, multiline_text')
      .eq('collection_id', collectionId)
      .order('id', { ascending: true });
      
    if (error) throw error;
    
    res.send({ config_fields: data });
  } catch (error) {
    console.error('Erreur lors de la récupération de la configuration de la collection:', error);
    res.status(500).send({ error: error.message });
  }
});

// Mettre à jour une collection
router.post('/updateCollection', authenticateToken, async (req, res) => {
  try {
    const { collectionId, collection_name, collection_slug } = req.body;
    const userId = req.user.idUser;
    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);

    if (!collectionId) {
      return res.status(400).send({ error: 'collectionId est requis' });
    }

    // Récupérer le website_id de la collection et vérifier les droits d'accès
    const websiteId = await getCollectionWebsiteId(supabase, collectionId);
    if (!websiteId) {
      return res.status(404).send({ error: 'Collection non trouvée' });
    }

    const { hasAccess } = await checkUserWebsiteAccess(supabase, userId, websiteId);
    if (!hasAccess) {
      return res.status(403).send({ error: 'Vous n\'avez pas les droits pour modifier cette collection' });
    }

    // Mettre à jour la collection
    const { data, error } = await supabase
      .from('collection')
      .update({
        collection_name,
        collection_slug,
        updated_at: new Date().toISOString()
      })
      .eq('id', collectionId)
      .select();
      
    if (error) throw error;
    
    res.send({ message: 'Collection mise à jour avec succès', data });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la collection:', error);
    res.status(500).send({ error: error.message });
  }
});

// Mettre à jour la configuration d'une collection
router.post('/updateCollectionConfig', authenticateToken, async (req, res) => {
  try {
    const { collectionId, config_fields } = req.body;
    const userId = req.user.idUser;
    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);

    if (!collectionId) {
      return res.status(400).send({ error: 'collectionId est requis' });
    }

    // Récupérer le website_id de la collection et vérifier les droits d'accès
    const websiteId = await getCollectionWebsiteId(supabase, collectionId);
    if (!websiteId) {
      return res.status(404).send({ error: 'Collection non trouvée' });
    }

    const { hasAccess } = await checkUserWebsiteAccess(supabase, userId, websiteId);
    if (!hasAccess) {
      return res.status(403).send({ error: 'Vous n\'avez pas les droits pour modifier cette collection' });
    }

    // Récupérer la configuration actuelle
    const { data: existingFields, error: fetchError } = await supabase
      .from('collection_config')
      .select('*')
      .eq('collection_id', collectionId);
      
    if (fetchError) throw fetchError;

    const existingFieldsMap = new Map(existingFields.map(field => [field.id, field]));
    const newFieldIds = new Set(config_fields.filter(field => field.id && !field.id.toString().startsWith('field_')).map(field => field.id));
    
    // 1. Supprimer les champs qui ne sont plus présents
    const fieldsToDelete = existingFields.filter(field => !newFieldIds.has(field.id));
    for (const field of fieldsToDelete) {
      const { error: deleteError } = await supabase
        .from('collection_config')
        .delete()
        .eq('id', field.id);
      if (deleteError) throw deleteError;
    }

    // 2. Traiter chaque champ de la nouvelle configuration
    const updatedFields = [];
    for (const field of config_fields) {
      const fieldData = {
        collection_id: collectionId,
        tab_field: field.tab_field,
        name_field: field.name_field,
        description_field: field.description_field || '',
        collection_id_ref: field.collection_id_ref || null,
        multiline_text: field.multiline_text || false,
      };

      if (field.id && !field.id.toString().startsWith('field_') && existingFieldsMap.has(field.id)) {
        // Champ existant - mise à jour
        const { data: updatedField, error: updateError } = await supabase
          .from('collection_config')
          .update(fieldData)
          .eq('id', field.id)
          .select()
          .single();
        if (updateError) throw updateError;
        updatedFields.push(updatedField);
      } else {
        // Nouveau champ - insertion
        const { data: newField, error: insertError } = await supabase
          .from('collection_config')
          .insert(fieldData)
          .select()
          .single();
        if (insertError) throw insertError;
        updatedFields.push(newField);
      }
    }
    
    res.send({ message: 'Configuration mise à jour avec succès', data: updatedFields });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la configuration:', error);
    res.status(500).send({ error: error.message });
  }
});

// Vérifier si un champ est utilisé par des éléments de collection
router.get('/checkFieldUsage', authenticateToken, async (req, res) => {
  const { collectionId, fieldId } = req.query;
  const token = req.headers['authorization']?.split(' ')[1];
  const supabase = supabaseServer(token);

  if (!collectionId || !fieldId) {
    return res.status(400).json({ error: 'collectionId et fieldId sont requis' });
  }

  try {
    // D'abord, récupérer le type de champ pour savoir dans quelle table chercher
    const { data: fieldConfig, error: fieldError } = await supabase
      .from('collection_config')
      .select('tab_field')
      .eq('id', fieldId)
      .single();

    if (fieldError) {
      console.error('Erreur lors de la récupération du type de champ:', fieldError);
      return res.status(500).json({ error: 'Erreur lors de la récupération du type de champ' });
    }

    if (!fieldConfig) {
      return res.status(404).json({ error: 'Champ non trouvé' });
    }

    const fieldType = fieldConfig.tab_field;
    let elementsWithField = [];
    let tableName = '';

    // Vérifier dans la table appropriée selon le type de champ
    switch (fieldType) {
      case 'text':
        tableName = 'collection_field_text';
        const { data: textData, error: textError } = await supabase
          .from('collection_field_text')
          .select('collection_element_id')
          .eq('id_config', fieldId);
        if (textError) throw textError;
        elementsWithField = textData || [];
        break;

      case 'richText':
        tableName = 'collection_field_richtext';
        const { data: richTextData, error: richTextError } = await supabase
          .from('collection_field_richtext')
          .select('collection_element_id')
          .eq('id_config', fieldId);
        if (richTextError) throw richTextError;
        elementsWithField = richTextData || [];
        break;

      case 'image':
        tableName = 'collection_field_image';
        const { data: imageData, error: imageError } = await supabase
          .from('collection_field_image')
          .select('collection_element_id')
          .eq('id_config', fieldId);
        if (imageError) throw imageError;
        elementsWithField = imageData || [];
        break;

      case 'gallery':
        tableName = 'collection_field_gallery';
        const { data: galleryData, error: galleryError } = await supabase
          .from('collection_field_gallery')
          .select('collection_element_id')
          .eq('id_config', fieldId);
        if (galleryError) throw galleryError;
        elementsWithField = galleryData || [];
        break;

      case 'video':
        tableName = 'collection_field_video';
        const { data: videoData, error: videoError } = await supabase
          .from('collection_field_video')
          .select('collection_element_id')
          .eq('id_config', fieldId);
        if (videoError) throw videoError;
        elementsWithField = videoData || [];
        break;

      case 'multiReference':
        tableName = 'collection_field_multireference';
        const { data: multiRefData, error: multiRefError } = await supabase
          .from('collection_field_multireference')
          .select('collection_element_id')
          .eq('id_config', fieldId);
        if (multiRefError) throw multiRefError;
        elementsWithField = multiRefData || [];
        break;

      default:
        return res.status(400).json({ 
          error: `Type de champ non supporté: ${fieldType}` 
        });
    }

    const hasUsage = elementsWithField && elementsWithField.length > 0;
    const elementCount = hasUsage ? elementsWithField.length : 0;

    res.json({
      hasUsage,
      elementCount,
      fieldType,
      tableName,
      message: hasUsage 
        ? `${elementCount} élément(s) de collection utilise(nt) ce champ dans la table ${tableName}`
        : `Aucun élément ne fait référence à ce champ (vérification dans ${tableName})`
    });

  } catch (error) {
    console.error('Erreur lors de la vérification du champ:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la vérification du champ' });
  }
});

module.exports = router;
