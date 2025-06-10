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
        console.log('Notification créée :', response.data);
      } catch (error) {
        console.error('Erreur lors de la création de la notification :', error);
      }
    } catch (error) {
      console.error('Erreur lors de la création de la notification :', error);
    }
  }
};



// Récupérer les collections (blogs) d'un utilisateur
router.get('/getCollection', authenticateToken, async (req, res) => {

  try {
    const userId = req.user.idUser;
    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);

    const { data, error } = await supabase
      .from('collection')
      .select('id, collection_name')
      .eq('user_id', userId);
    
    if (error) throw error;
    
    const blogCrypt = jwt.sign({ blog: data }, secretKey);
    res.send(blogCrypt);
  } catch (error) {
    console.error('Erreur lors de la récupération des collections:', error);
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
    
    // Vérifier les droits d'accès
    const { data: blogData, error: blogError } = await supabase
      .from('collection')
      .select('user_id')
      .eq('id', sentIdBlog)
      .single();
      
    if (blogError) throw blogError;

    
    if (userId !== blogData.user_id) {
      return res.status(403).send('Vous n\'avez pas les droits pour accéder à ce blog.');
    }
    
    // Récupérer la liste des pages
    const { data, error } = await supabase
      .from('collection_element')
      .select('id, collection_element_name, collection_element_status, collection_element_create_date, collection_element_update_date, collection_element_publish_date')
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
    const sentIdBlog = req.query.IdBlog;
    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);

    
    const { data, error } = await supabase
      .from('collection_config')
      .select('id, tab_field, name_field, description_field, collection_id_ref, multiline_text')
      .eq('collection_id', sentIdBlog)
      .order('id', { ascending: true });
      
    if (error) throw error;
    
    const blogConfigCrypt = jwt.sign({ blogConfig: data }, secretKey);
    res.send(blogConfigCrypt);
  } catch (error) {
    console.error('Erreur lors de la récupération de la configuration du blog:', error);
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

    const id = req.body.params.id;
    const title = req.body.params.mainText[0].value;
    const slug = req.body.params.mainText[1].value;
    const date = new Date(req.body.params.date).toISOString();
    const status = req.body.params.status;
    
    let publishDate = null;
    if (status === 1) {
      publishDate = date;
    }
    
    // Insérer la nouvelle page
    const { data, error } = await supabase
      .from('collection_element')
      .insert({
        collection_id: id, 
        collection_element_name: title,
        collection_element_slug: slug,
        collection_element_status: status,
        collection_element_create_date: date,
        collection_element_update_date: date,
        collection_element_publish_date: publishDate
      })
      .select('id');
      
    if (error) throw error;
    
    // Créer des notifications si la page est publiée
    if (status === 1) {
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

    
    
    // Traiter toutes les insertions en parallèle
    const insertPromises = texts.map(item => {
      return supabase
        .from('collection_field_text')
        .insert({
          collection_element_id: id, // Ajout du lien via UUID
          id_config: item.id_config,
          text: item.value
        })
    });

    
    // Attendre que toutes les promesses soient résolues
    Promise.all(insertPromises).then(results => {
      results.forEach(({ error }, i) => {
        if (error) {
          console.error(`Erreur à l'insertion ${i}:`, error.message);
        }
      });
    });
    
    res.status(200).send('Tous les textes ont été créés avec succès');
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

    const { data } = supabaseServer.storage
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

      // ✅ Insertion dans SUPABASE
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

      if (insertError) {
        throw new Error('Erreur Supabase DB: ' + insertError.message);
      }
    }

    res.status(200).send('RichText enregistré avec succès dans Supabase');
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: error.message });
  }
});



router.post('/createMultiReferenceCollection', authenticateToken, async (req, res) => {
  console.log("createMultireference")
  try {

    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);

     

    const id = req.body.params.id;
    const multiReference = req.body.params.multiReference;
    // multiReference est un objet { id_config, value }

    console.log("id", id)
    console.log("multiReference", multiReference)

    await supabase
      .from('collection_field_multireference')
      .insert({
        collection_element_id: id,
        id_config: multiReference.id_config,
        info_ref: multiReference.value
      });
    console.log("MultiReference insérée avec succès");
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

    // Utilisation de Supabase pour récupérer les données
    const { data, error } = await supabase
      .from('collection_element')
      .select(`
        collection_element_name, 
        collection_element_slug, 
        collection_element_status,
        collection_element_create_date, 
        collection_element_update_date, 
        collection_element_publish_date
      `)
      .eq('id', sentIdBlogPage)
      .single();
      
    if (error) throw error;
    
    // Si aucun résultat n'est trouvé
    if (!data) {
      return res.status(404).send({ error: 'Page non trouvée' });
    }
    
    // Formater la réponse pour correspondre à l'ancienne structure (pour compatibilité)
    const blogPage = [{
      page_blog_name: data.collection_element_name,
      page_blog_slug: data.collection_element_slug,
      status: data.collection_element_status,
      page_blog_create_date: data.collection_element_create_date,
      page_blog_update_date: data.collection_element_update_date,
      page_blog_publish_date: data.collection_element_publish_date
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

    let updateFields = {
      collection_element_name: title,
      collection_element_slug: slug,
      collection_element_status: status,
      collection_element_update_date: date
    };
    if (setPublishDate === 1) {
      updateFields.collection_element_publish_date = (status === 1) ? date : null;
    }

    const { error } = await supabase
      .from('collection_element')
      .update(updateFields)
      .eq('id', id);

    if (error) throw error;

    // Optionnel: notification (à adapter si besoin)
    // if (setPublishDate === 1 && status === 1) {
    //   await createNotification(id, title, date, slug);
    // }

    res.status(200).send({ message: 'Page modifiée avec succès' });
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
      // Update dans SUPABASE
      const { error: updateError } = await supabase
        .from('collection_field_richtext')
        .update({ text_json: richTextJSON, size: totalSize })
        .eq('collection_element_id', id_blog_page)
        .eq('id_config', id_config);
      if (updateError) throw new Error('Erreur Supabase DB: ' + updateError.message);
    }
    res.status(200).send('Tous les RichText ont été modifiés avec succès');
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

// Met à jour la galerie d'une page de collection
router.post('/updateGalleryCollection', authenticateToken, uploadGallery.array('gallery'), async (req, res) => {
  if (!req.files) {
    return res.status(400).send('Aucune image n\'a été téléchargée.');
  }

  const token = req.headers['authorization']?.split(' ')[1];
  const supabase = supabaseServer(token);

  const id_blog_page = req.body.id_blog_page;
  const id_config = req.body.id_config;
  const filesInfo = [];
  let totalSize = 0;
  try {
    for (let index = 0; index < req.files.length; index++) {
      const file = req.files[index];
      const id_photo = path.basename(file.filename, path.extname(file.filename));
      const extension = path.extname(file.filename);
      const src_photo = id_photo + extension;
      const name = file.originalname;
      const alt = req.body[`alt_${index}`] || '';
      const size = Math.round(file.size / 1024);
      const fileBuffer = fs.readFileSync(file.path);
      // Upload image
      const { error: uploadError } = await supabase.storage
        .from('collection-gallery')
        .upload(src_photo, fileBuffer, {
          contentType: file.mimetype
        });
      if (uploadError) throw new Error('Erreur upload Supabase: ' + uploadError.message);
      filesInfo.push({ src_photo, name, alt, size });
      totalSize += size;
      fs.unlinkSync(file.path);
    }
    // Update BDD
    const filesInfoJson = JSON.stringify(filesInfo);
    const { error: updateError } = await supabase
      .from('collection_field_gallery')
      .update({ gallery: filesInfoJson, size: totalSize })
      .eq('collection_element_id', id_blog_page)
      .eq('id_config', id_config);
    if (updateError) throw new Error('Erreur update BDD: ' + updateError.message);
    res.status(200).send({ success: true, message: 'Galerie modifiée avec succès', filesInfo });
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
  const id_blog_page = req.body.id_blog_page;
  const dataArray = req.body.data;

  const token = req.headers['authorization']?.split(' ')[1];
  const supabase = supabaseServer(token);

   console.log("idBlogPage" + id_blog_page);
   console.log("data" + dataArray);
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
          .eq('id_config', id_config)
          .single();
        if (imgError) throw imgError;
        if (imgData && imgData.src_image) {
          await supabase.storage.from('collection-images').remove([imgData.src_image]);
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
          .eq('id_config', id_config)
          .single();
        if (vidError) throw vidError;
        if (vidData && vidData.src_video) {
          await supabase.storage.from('collection-video').remove([vidData.src_video]);
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
          .eq('id_config', id_config)
          .single();
        if (richError && richError.code !== 'PGRST116') throw richError;
        if (richData && richData.text_json) {
          let entityMap = {};
          try {
            const content = JSON.parse(richData.text_json);
            entityMap = content.entityMap || {};
          } catch {}
          const images = Object.keys(entityMap)
            .filter(key => entityMap[key].type === 'IMAGE')
            .map(key => entityMap[key].data.src);
          for (const url of images) {
            const name = url.split('/').pop();
            await supabaseServer.storage.from('collection-richtext-images').remove([name]);
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
          .single();
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
          .single();
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
          .single();
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
    // Supprimer la page elle-même
    await supabase
      .from('collection_element')
      .delete()
      .eq('id', idBlogPage);
    res.status(200).send({ message: 'Page supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la page:', error);
    res.status(500).send({ error: error.message });
  }
});





module.exports = router;
