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
      const SQL = 'SELECT id_user FROM users';
      db.query(SQL, async (err, results) => {
        if (err) {
          console.log("Erreur:", err);
          return;
        }
        const idUsers = results.map(result => result.id_user);

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
      });
    } catch (error) {
      console.error('Erreur lors de la création de la notification :', error);
    }
  }
};



// Récupérer les collections (blogs) d'un utilisateur
router.get('/getCollection', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.idUser;
    
    const { data, error } = await supabaseServer
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
    
    // Vérifier les droits d'accès
    const { data: blogData, error: blogError } = await supabaseServer
      .from('collection')
      .select('user_id')
      .eq('id', sentIdBlog)
      .single();
      
    if (blogError) throw blogError;

    
    if (userId !== blogData.user_id) {
      return res.status(403).send('Vous n\'avez pas les droits pour accéder à ce blog.');
    }
    
    // Récupérer la liste des pages
    const { data, error } = await supabaseServer
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
//
//
// Récupérer la configuration d'un blog
router.get('/getConfigCollection', authenticateToken, async (req, res) => {
  try {
    const sentIdBlog = req.query.IdBlog;

    
    const { data, error } = await supabaseServer
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
//


// Récupérer les références de collection
router.get('/getCollectionRef', authenticateToken, async (req, res) => {
  try {
    const sentIdCollectionRef = req.query.id_collection_ref;
    
    const { data, error } = await supabaseServer
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
    const { data, error } = await supabaseServer
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
    const { data, error } = await supabaseServer.storage
      .from('collection-images')
      .upload(src_image, fileBuffer, {
        contentType: req.file.mimetype
      });
      
    if (error) throw error;
    
    // Enregistrer les métadonnées dans la base de données
    const { error: insertError } = await supabaseServer
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
      const { data, error: uploadError } = await supabaseServer.storage
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
    const { error: insertError } = await supabaseServer
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
    
    const { data, error: uploadError } = await supabaseServer.storage
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

    const { error: insertError } = await supabaseServer
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
    
    // Traiter toutes les insertions en parallèle
    const insertPromises = texts.map(item => {
      return supabaseServer
        .from('collection_field_text')
        .insert({
          collection_element_id: id, // Ajout du lien via UUID
          id_config: item.id_config,
          text: item.value
        });
    });
    
    // Attendre que toutes les promesses soient résolues
    await Promise.all(insertPromises);
    
    res.status(200).send('Tous les textes ont été créés avec succès');
  } catch (error) {
    console.error('Erreur lors de la création des textes:', error);
    res.status(500).send({ error: error.message });
  }
});







router.post('/createRichTextCollection', async (req, res) => {
  const richtext = req.body.params.infoRichText;
  const id_blog_page = req.body.params.id;

  const saveImageToSupabase = async (base64Data) => {
    const matches = base64Data.match(/^data:image\/([A-Za-z-+/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) throw new Error('Base64 invalide');

    const imageExtension = matches[1];
    const imageBuffer = Buffer.from(matches[2], 'base64');
    const imageName = `${uuidv4()}.${imageExtension}`;
    const storagePath = `${imageName}`;

    const { error: uploadError } = await supabaseServer.storage
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
      const { error: insertError } = await supabaseServer
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









//
router.get('/getCollectionElement', authenticateToken, async (req, res) => {
  try {
    const sentIdBlogPage = req.query.IdBlogPage;

    // Utilisation de Supabase pour récupérer les données
    const { data, error } = await supabaseServer
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

    console.log('sentIdBlogPage:', sentIdBlogPage);
    console.log('sentIdConfig:', sentIdConfig);

    // Utilisation de Supabase pour récupérer les données
    const { data, error } = await supabaseServer
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

    // Utilisation de Supabase pour récupérer les données
    const { data, error } = await supabaseServer
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

    // Utilisation de Supabase pour récupérer les données
    const { data, error } = await supabaseServer
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

    // Utilisation de Supabase pour récupérer les données
    const { data, error } = await supabaseServer
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

    // Utilisation de Supabase pour récupérer les données
    const { data, error } = await supabaseServer
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

    // Utilisation de Supabase pour récupérer les données
    const { data, error } = await supabaseServer
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
//
//
//
//router.post('/updateBlogPage', (req, res) => {
//  
//  const id = req.body.params.id;
//  
//  const title = req.body.params.mainText[0].value;
//  const slug = req.body.params.mainText[1].value;
//  const date = req.body.params.date;
//  const status = req.body.params.status;
//  const setPublishDate = req.body.params.setpublishDate;
//
//  let SQL;
//  let VALUES;
//
//  let setCreateNotification = false;
//
//  if (setPublishDate === 1) {
//      SQL = 'UPDATE blog_page SET page_blog_name = ?, page_blog_slug = ?, status = ?, page_blog_update_date = ?, page_blog_publish_date = ? WHERE id_page_blog = ?';
//    if (status === 1) {
//      VALUES = [title, slug, status, date, date, id];
//      setCreateNotification = true;
//    } else {
//      VALUES = [title, slug, status, date, null, id];
//    }
//  } else { 
//    SQL = 'UPDATE blog_page SET page_blog_name = ?, page_blog_slug = ?, status = ?, page_blog_update_date = ? WHERE id_page_blog = ?';
//    VALUES = [title, slug, status, date, id];
//  }
//
//  db.query(SQL, VALUES, (err, results) => {
//    if (err) {
//      console.log('Database query error:', err);
//      return res.status(500).send({ error: err });
//    }
//
//    if (setCreateNotification) {
//      SQL = 'SELECT id_blog FROM blog_page WHERE id_page_blog = ?';
//      VALUES = [id];
//      db.query(SQL, VALUES, (err, results) => {
//        if (err) {
//          console.log('Database query error:', err);
//          return res.status(500).send({ error: err });
//        }
//        const idBlog = results[0].id_blog;
//        const idBlogString = idBlog.toString();
//
//        createNotification(idBlogString, title, date, slug);
//      }); 
//    }
//
//    res.status(200).send({ message: 'Page modifiée avec succès'});
//  });
//
//})
//
//
//
//router.post('/updateTextBlog', (req, res) => {
//  const id = req.body.params.id;
//  const text = req.body.params.otherText;
//
//  
//  // Convertir chaque opération de base de données en une promesse
//  const insertPromises = text.map((item) => {
//    return new Promise((resolve, reject) => {
//      const valueText = item.value;
//      const id_config = item.id_config;
//      const SQL = 'UPDATE blog_field_text SET text = ? WHERE id_config = ? AND id_blog_page = ?';
//      const VALUES = [valueText, id_config, id];
//
//      db.query(SQL, VALUES, (err, results) => {
//        if (err) {
//          console.log('Database query error:', err);
//          return reject(err);
//        }
//        resolve('Texte créé avec succès');
//      });
//    });
//  });
//
//  // Attendre que toutes les promesses soient résolues
//  Promise.all(insertPromises)
//    .then((results) => {
//      res.status(200).send('Tous les textes ont été créés avec succès');
//    })
//    .catch((error) => {
//      res.status(500).send({ error: error });
//    });
//});
//
//
//
//
//
//
//router.post('/updateRichTextBlog', (req, res) => {
//  const id = req.body.params.id;
//  const richtext = req.body.params.infoRichText;
//
//  const saveImage = (base64Data, callback) => {
//    const matches = base64Data.match(/^data:image\/([A-Za-z-+/]+);base64,(.+)$/);
//    if (!matches || matches.length !== 3) {
//      return callback(new Error('Invalid base64 data'));
//    }
//
//    const imageBuffer = Buffer.from(matches[2], 'base64');
//    const imageExtension = matches[1];
//    const imageName = `${uuidv4()}.${imageExtension}`;
//    const imagePath = path.join(__dirname, '..', 'images', 'richtext_blog_images', imageName);
//
//    fs.writeFile(imagePath, imageBuffer, (err) => {
//      if (err) {
//        console.error('Erreur lors de l\'écriture de l\'image :', err);
//        return callback(err);
//      }
//
//      // Obtenir la taille du fichier en octets
//      const fileSizeInBytes = Buffer.byteLength(imageBuffer);
//      // Convertir la taille en kilo-octets
//      const fileSizeInKB = fileSizeInBytes / 1024;
//
//      callback(null, `${process.env.SERVER_URL}/media/blog/richText/${imageName}`, fileSizeInKB);
//    });
//  };
//
//  const queries = richtext.map((item) => {
//    return new Promise((resolve, reject) => {
//      let richTextJSON = item.richText;
//      const id_config = item.id_config;
//
//      // Parse the JSON to find and replace base64 images
//      const content = JSON.parse(richTextJSON);
//      const entityMap = content.entityMap;
//
//      const imagePromises = Object.keys(entityMap).map((key) => {
//        const entity = entityMap[key];
//        if (entity.type === 'IMAGE' && entity.data.src.startsWith('data:image/')) {
//          return new Promise((resolveImage, rejectImage) => {
//            saveImage(entity.data.src, (err, imageUrl, fileSizeInKB) => {
//              if (err) {
//                return rejectImage(err);
//              }
//              entity.data.src = imageUrl; // Remplacez les données encodées en base64 par l'URL de l'image
//              entity.data.size = fileSizeInKB; // Ajoutez la taille de l'image en Ko
//              resolveImage();
//            });
//          });
//        }
//        return Promise.resolve();
//      });
//
//      Promise.all(imagePromises)
//        .then(() => {
//          const SQL_old = 'SELECT text_json FROM blog_field_richText WHERE id_blog_page = ? AND id_config = ?';
//          const VALUES_old = [id, id_config];
//
//          db.query(SQL_old, VALUES_old, (err, results) => {
//            if (err) {
//              console.log('Database query error:', err);
//              return reject(err);
//            }
//            const oldContent = JSON.parse(results[0].text_json);
//            const oldEntityMap = oldContent.entityMap;
//
//            // Trouver les images à supprimer
//            const oldImages = Object.keys(oldEntityMap)
//              .filter(key => oldEntityMap[key].type === 'IMAGE')
//              .map(key => oldEntityMap[key].data.src);
//
//            const newImages = Object.keys(entityMap)
//              .filter(key => entityMap[key].type === 'IMAGE')
//              .map(key => entityMap[key].data.src);
//
//            const imagesToDelete = oldImages.filter(src => !newImages.includes(src));
//
//            // Supprimer les images qui ne sont plus utilisées
//            imagesToDelete.forEach(src => {
//              const imagePath = path.join(__dirname, '..', 'images', 'richtext_blog_images', path.basename(src));
//              fs.unlink(imagePath, (err) => {
//                if (err) {
//                  console.error('Erreur lors de la suppression de l\'image :', err);
//                } else {
//                  console.log('Image supprimée :', imagePath);
//                }
//              });
//            });
//
//            richTextJSON = JSON.stringify(content);
//            const totalSize = Object.keys(entityMap).reduce((acc, key) => {
//              const entity = entityMap[key];
//              return acc + (entity.data.size || 0);
//            }, 0);
//            const SQL = 'UPDATE blog_field_richText SET text_json = ?, size = ? WHERE id_config = ? AND id_blog_page = ?';
//            const VALUES = [richTextJSON, totalSize, id_config, id];
//
//            db.query(SQL, VALUES, (err, results) => {
//              if (err) {
//                console.log('Database query error:', err);
//                reject(err);
//              } else {
//                resolve('RichTexte modifié avec succès');
//              }
//            });
//          });
//        })
//        .catch((error) => {
//          reject(error);
//        });
//    });
//  });
//
//  Promise.all(queries)
//    .then((results) => {
//      res.status(200).send('Tous les RichTextes ont été modifiés avec succès');
//    })
//    .catch((error) => {
//      res.status(500).send({ error: error.message });
//    });
//});
//
//
//
//const uploadUpdateImage = multer({ storage: storageImage });
//
//router.post('/updateImagesBlog', uploadUpdateImage.single('image'), (req, res) => {
//
//  if (!req.file) {
//    console.error('Aucune image n\'a été téléchargée.');
//    return res.status(400).send('Aucune image n\'a été téléchargée.');
//  }
//  const id_photo =  path.basename(req.file.filename, path.extname(req.file.filename));
//  const id_blog_page = req.body.id_blog_page;
//  const id_config = req.body.id_config;
//  const name = req.body.name;
//  const alt = req.body.alt;
//  const size = req.body.size;
//  const extension = path.extname(req.file.filename);
//  
//  const src_image = id_photo + extension;
//
//  const SQL = 'SELECT src_image FROM blog_field_image WHERE id_blog_page = ? AND 	id_config = ?';
//  const Values = [id_blog_page, id_config];
//
//  db.query(SQL, Values, (err, results) => {
//    if (err) {
//      console.error('Database query error:', err);
//      return res.status(500).send({ error: err });
//    }
//
//    const imageDirectory = path.join(__dirname, '..', 'images', 'blog_image');
//    const imagePath = path.join(imageDirectory, results[0].src_image);
//
//    fs.unlink(imagePath, (err) => {
//      if (err) {
//        console.error('Erreur lors de la suppression de l\'image :', err);
//      }
//    });
router.delete('/deleteBlogPage', authenticateToken, async (req, res) => {
  try {
    const idBlogPage = req.query.IdBlogPage;
    const idBlog = req.query.Id;
    // Récupérer la config des champs de la collection
    const { data: configData, error: configError } = await supabaseServer
      .from('collection_config')
      .select('tab_field, id_config')
      .eq('id_collection', idBlog);
    if (configError) throw configError;
    for (const field of configData) {
      const id_config = field.id_config;
      const type = field.tab_field;
      if (type === 'text') {
        await supabaseServer
          .from('collection_field_text')
          .delete()
          .eq('collection_element_id', idBlogPage)
          .eq('id_config', id_config);
      } else if (type === 'richText') {
        // Supprimer les images du richtext
        const { data: richData, error: richError } = await supabaseServer
          .from('collection_field_richtext')
          .select('text_json')
          .eq('collection_element_id', idBlogPage)
          .eq('id_config', id_config)
          .single();
        if (richError) throw richError;
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
        await supabaseServer
          .from('collection_field_richtext')
          .delete()
          .eq('collection_element_id', idBlogPage)
          .eq('id_config', id_config);
      } else if (type === 'multiReference') {
        await supabaseServer
          .from('collection_field_multireference')
          .delete()
          .eq('collection_element_id', idBlogPage)
          .eq('id_config', id_config);
      } else if (type === 'image') {
        const { data: imgData, error: imgError } = await supabaseServer
          .from('collection_field_image')
          .select('src_image')
          .eq('collection_element_id', idBlogPage)
          .eq('id_config', id_config)
          .single();
        if (imgError) throw imgError;
        if (imgData && imgData.src_image) {
          await supabaseServer.storage.from('collection-images').remove([imgData.src_image]);
        }
        await supabaseServer
          .from('collection_field_image')
          .delete()
          .eq('collection_element_id', idBlogPage)
          .eq('id_config', id_config);
      } else if (type === 'video') {
        const { data: vidData, error: vidError } = await supabaseServer
          .from('collection_field_video')
          .select('src_video')
          .eq('collection_element_id', idBlogPage)
          .eq('id_config', id_config)
          .single();
        if (vidError) throw vidError;
        if (vidData && vidData.src_video) {
          await supabaseServer.storage.from('collection-video').remove([vidData.src_video]);
        }
        await supabaseServer
          .from('collection_field_video')
          .delete()
          .eq('collection_element_id', idBlogPage)
          .eq('id_config', id_config);
      } else if (type === 'gallery') {
        const { data: galData, error: galError } = await supabaseServer
          .from('collection_field_gallery')
          .select('gallery')
          .eq('collection_element_id', idBlogPage)
          .eq('id_config', id_config)
          .single();
        if (galError) throw galError;
        if (galData && galData.gallery) {
          let galleryArr = [];
          try { galleryArr = JSON.parse(galData.gallery); } catch {}
          for (const img of galleryArr) {
            await supabaseServer.storage.from('collection-gallery').remove([img.src_photo]);
          }
        }
        await supabaseServer
          .from('collection_field_gallery')
          .delete()
          .eq('collection_element_id', idBlogPage)
          .eq('id_config', id_config);
      }
    }
    // Supprimer la page elle-même
    await supabaseServer
      .from('collection_element')
      .delete()
      .eq('id', idBlogPage);
    res.status(200).send({ message: 'Page supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la page:', error);
    res.status(500).send({ error: error.message });
  }
});
//
//
router.post('/createMultiReferenceCollection', authenticateToken, async (req, res) => {
  try {
    const id = req.body.params.id;
    const multiReference = req.body.params.multiReference;
    // multiReference est un objet { id_config, value }
    await supabaseServer
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



module.exports = router;
