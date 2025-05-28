const express = require('express')
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const cors = require('cors')
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { supabaseServer } = require('../supabase');
const { authenticateToken } = require('../middleware/authToken');



const router = express.Router();

router.use(cors())
router.use(express.json());

require('dotenv').config();
const secretKey = process.env.SECRET_KEY; 

router.get('/getPage',authenticateToken, async (req, res) => {
  const sentUserId = req.user.idUser;
  try {
    // On suppose que sentUserId est le user_id (UUID) de Supabase
    const { data, error } = await supabaseServer
      .from('page')
      .select('id, page_name')
      .eq('user_id', sentUserId);
    if (error) throw error;
    const pageCrypt = jwt.sign({ page: data }, secretKey);
    res.send(pageCrypt);
  } catch (error) {
    res.send({ error: error.message });
  }
});

// GET page details by id (id_page devient id)
router.get('/getPageDetail',authenticateToken, async (req, res) => {
  const pageId = req.query.IdPage;
  try {
    const { data, error } = await supabaseServer
      .from('page')
      .select('*')
      .eq('id', pageId)
      .single();
    if (error) throw error;
    const pageCrypt = jwt.sign({ page: [data] }, secretKey);
    res.send(pageCrypt);
  } catch (error) {
    res.send({ error: error.message });
  }
});

// GET config for a page (id_page devient id)
router.get('/getConfigPage',authenticateToken, async (req, res) => {

  const pageId = req.query.IdPage;
  try {
    const { data, error } = await supabaseServer
      .from('page_config')
      .select('*')
      .eq('id_page', pageId);
    if (error) throw error;
    const pageCrypt = jwt.sign({ page: data }, secretKey);
    res.send(pageCrypt);
  } catch (error) {
    res.send({ error: error.message });
  }
});

// GET images for a page (id_page devient id)
router.get('/getImagePage',authenticateToken, async (req, res) => {
  const sentIdPage = req.query.IdPage;
  const sentIdConfig = req.query.IdConfig;

  try {
    const { data, error } = await supabaseServer
      .from('page_photo')
      .select('id_config, src_image, name_image, alt_image, size')
      .eq('id_page', sentIdPage)
      .eq('id_config', sentIdConfig);
    if (error) throw error;
    const imagesData = (data || []).map(image => ({
      id_config: image.id_config,
      name: image.name_image || 'default_name',
      src: image.src_image || 'default.jpg',
      alt: image.alt_image || 'default_alt',
      size: image.size,
      create: true
    }));
    res.status(200).json(imagesData);
  } catch (error) {
    console.error('Erreur lors de la récupération des images :', error);
    res.status(500).send({ error: error.message });
    
  }
});

// GET page text (Supabase)
router.get('/getPageTexte',authenticateToken, async (req, res) => {
  const pageId = req.query.IdPage;
  const idConfig = req.query.IdConfig;
  if (!pageId) {
    return res.status(400).send("L'id de la page est manquant.");
  }
  try {
    const { data, error } = await supabaseServer
      .from('page_text')
      .select('text, id_text, id_config')
      .eq('id_page', pageId)
      .eq('id_config', idConfig);
    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// GET page richtext (Supabase)
router.get('/getPageRichText',authenticateToken, async (req, res) => {
  
  const pageId = req.query.IdPage;
  const idConfig = req.query.IdConfig;
  

  if (!pageId) {
    return res.status(400).send("L'id de la page est manquant.");
  }
  try {
    const { data, error } = await supabaseServer
      .from('page_richtext')
      .select('text_json, id_richtext, id_config')
      .eq('id_page', pageId)
      .eq('id_config', idConfig);
    if (error) throw error;
    res.send(data);
  } catch (error) {
    console.error('Erreur lors de la récupération du richtext :', error);
    res.status(500).send({ error: error.message });
  }
});



//const storage = multer.diskStorage({
//  destination: function (req, file, cb) {
//    cb(null, path.join(__dirname,  '..', 'images', 'page_image'));
//  },
//  filename: function (req, file, cb) {
//    cb(null, file.originalname);
//  }
//});
//
//const upload = multer({ storage: storage });

//router.post('/saveImagesPage', upload.single('image'), (req, res) => {
//
//  if (!req.file || !req.body) {
//    return res.status(400).send('Aucune image n\'a été téléchargée.');
//  }
//  const id_photo = req.body.id_photo 
//  const alt = req.body.alt;
//  const name = req.body.name;
//  const src = req.body.src;
//     
//  const SQL = 'SELECT src_photo FROM photo_page WHERE id_photo = ?';
//
//  db.query(SQL, [id_photo], (err, results) => {
//    if (err) {
//      throw err;  
//    }
//    const oldImageName = results[0].src_photo;
//    const oldImagePath = path.join(__dirname, '..', 'images', 'page_image', oldImageName);
//    fs.unlink(oldImagePath, (err) => {
//      if (err) {
//        throw err;
//      }
//      const SQL = 'UPDATE photo_page SET src_photo = ?, name_photo = ?, alt_photo = ? WHERE id_photo = ?';
//      const Values = [src, name, alt, id_photo];
//      db.query(SQL, Values, (err, results) => {
//        if (err) {
//          throw err;
//        }
//        res.status(200).send('Image sauvegardée avec succès');
//      });
//    });
//  });
//
//});



//router.post('/saveAltPage', (req, res) => {
//  if (!req.body) {
//    return res.status(400).send('Aucun Alt n\'a été envoyé.');
//  }
//
//  const field = req.body.params.fields;
//  const id_photo = field.id;
//  const alt = field.alt;
//  const SQL = 'UPDATE photo_page SET alt_photo = ? WHERE id_photo = ?';
//  const Values = [alt, id_photo];
//  db.query(SQL, Values, (err, results) => {
//    if (err) {
//      throw err;
//    }
//    res.status(200).send('Alt mis à jour avec succès');
//  });
//});

// Update page text (Supabase)
router.post('/updateTextPage',authenticateToken, async (req, res) => {
  if (!req.body) {
    return res.status(400).send("Aucun texte n'a été envoyé.");
  }
  const id_page = req.body.params.idPage;
  const text = req.body.params.text;
  try {
    const updatePromises = text.map(item =>
      supabaseServer
        .from('page_text')
        .update({ text: item.value })
        .eq('id_config', item.id_config)
        .eq('id_page', id_page)
    );
    await Promise.all(updatePromises);
    res.status(200).send('Textes mis à jour avec succès');
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// Update page richtext (Supabase)
router.post('/updateRichTextPage',authenticateToken, async (req, res) => {
  if (!req.body) {
    return res.status(400).send("Aucun texte n'a été envoyé.");
  }
  const id_page = req.body.params.idPage;
  const richtext = req.body.params.richtext;
  try {
    const updatePromises = richtext.map(item =>
      supabaseServer
        .from('page_richtext')
        .update({ text_json: item.richText })
        .eq('id_config', item.id_config)
        .eq('id_page', id_page)
    );
    await Promise.all(updatePromises);
    res.status(200).send('Textes mis à jour avec succès');
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});



const storageImage = multer.diskStorage({
  destination: function (req, file, cb) {
      cb(null, path.join(__dirname, '..', 'images', 'page_image'));
  },
  filename: function (req, file, cb) {
      const fileExtension = path.extname(file.originalname);
      const uniqueName = uuidv4() + fileExtension;
      cb(null, uniqueName);
  }
});

// Update image for a page (Supabase storage + table update)
const uploadUpdateImage = multer({ storage: storageImage });

router.post('/updateImagesPage',authenticateToken, uploadUpdateImage.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send("Aucune image n'a été téléchargée.");
  }
  const id_page = req.body.id_page;
  const id_config = req.body.id_config;
  const name = req.body.name;
  const alt = req.body.alt;
  const size = req.body.size;
  const extension = path.extname(req.file.filename);
  const id_photo = path.basename(req.file.filename, extension);
  const src_image = id_photo + extension;
  const filePath = req.file.path;
  try {
    // Récupérer l'ancienne image (si existe)
    const { data: oldData, error: oldError } = await supabaseServer
      .from('page_photo')
      .select('src_image')
      .eq('id_page', id_page)
      .eq('id_config', id_config)
      .single();
    if (oldError && oldError.code !== 'PGRST116') throw oldError;
    if (oldData && oldData.src_image) {
      await supabaseServer.storage.from('page-image').remove([oldData.src_image]);
    }
    // Upload nouvelle image
    const fileBuffer = fs.readFileSync(filePath);
    const { error: uploadError } = await supabaseServer.storage
      .from('page-image')
      .upload(src_image, fileBuffer, {
        contentType: req.file.mimetype
      });
    if (uploadError) throw uploadError;
    // Update metadata
    const { error: updateError } = await supabaseServer
      .from('page_photo')
      .update({ src_image, name_image: name, alt_image: alt, size })
      .eq('id_page', id_page)
      .eq('id_config', id_config);
    if (updateError) throw updateError;
    fs.unlinkSync(filePath);
    res.status(200).send('Image sauvegardée avec succès');
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Delete page data (Supabase version)
router.delete('/deletePageData',authenticateToken, async (req, res) => {
  const id_page = req.body.id_page;
  const data = req.body.data;
  try {
    for (const element of data) {
      const id_config = element.id_config;
      const type = element.type;
      if (type === 'images') {
        // Récupérer l'image à supprimer
        const { data: imgData, error: imgError } = await supabaseServer
          .from('page_photo')
          .select('src_image')
          .eq('id_page', id_page)
          .eq('id_config', id_config)
          .single();
        if (imgError && imgError.code !== 'PGRST116') throw imgError;
        if (imgData && imgData.src_image) {
          await supabaseServer.storage.from('page-image').remove([imgData.src_image]);
        }
        // Mettre à jour la ligne pour supprimer les infos image
        const { error: updateError } = await supabaseServer
          .from('page_photo')
          .update({ src_image: null, name_image: null, alt_image: null, size: null })
          .eq('id_page', id_page)
          .eq('id_config', id_config);
        if (updateError) throw updateError;
      } else if (type === 'video') {
        // Supprimer la vidéo (suppression de la ligne)
        const { error: delError } = await supabaseServer
          .from('page_video')
          .delete()
          .eq('id_page', id_page)
          .eq('id_config', id_config);
        if (delError) throw delError;
      }
    }
    res.status(200).send('Données supprimées avec succès');
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

module.exports = router;