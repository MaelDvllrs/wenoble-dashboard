const express = require('express')
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const cors = require('cors')
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { supabaseServer, supabaseServerAdmin } = require('../supabase');
const { authenticateToken } = require('../middleware/authToken');
const { checkUserWebsiteAccess } = require('../website/website');



const router = express.Router();

router.use(cors())
router.use(express.json());

require('dotenv').config();
const secretKey = process.env.SECRET_KEY; 

router.get('/getPage',authenticateToken, async (req, res) => {
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

    // Récupérer les pages du site web
    const { data, error } = await supabase
      .from('page')
      .select('id, page_name, website_id')
      .eq('website_id', websiteId);
    
    if (error) throw error;
    
    const pageCrypt = jwt.sign({ page: data }, secretKey);
    res.send(pageCrypt);
  } catch (error) {
    console.error('Erreur lors de la récupération des pages:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET page details by id
router.get('/getPageDetail',authenticateToken, async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const supabase = supabaseServer(token);

  const pageId = req.query.IdPage;
  const userId = req.user.idUser;

  if (!pageId) {
    return res.status(400).json({ error: 'Page ID is required' });
  }

  try {
    // Récupérer la page avec son website_id
    const { data: pageData, error: pageError } = await supabase
      .from('page')
      .select('*, website_id')
      .eq('id', pageId)
      .single();
    
    if (pageError) throw pageError;
    if (!pageData) {
      return res.status(404).json({ error: 'Page non trouvée' });
    }

    // Vérifier l'accès de l'utilisateur au site web de cette page
    const hasAccess = await checkUserWebsiteAccess(supabase, userId, pageData.website_id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Accès non autorisé à cette page' });
    }

    const pageCrypt = jwt.sign({ page: [pageData] }, secretKey);
    res.send(pageCrypt);
  } catch (error) {
    res.send({ error: error.message });
  }
});

// GET config for a page
router.get('/getConfigPage',authenticateToken, async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const supabase = supabaseServer(token);

  const pageId = req.query.IdPage;
  const userId = req.user.idUser;

  if (!pageId) {
    return res.status(400).json({ error: 'Page ID is required' });
  }

  try {
    // Récupérer la page pour vérifier le website_id
    const { data: pageData, error: pageError } = await supabase
      .from('page')
      .select('website_id')
      .eq('id', pageId)
      .single();

    if (pageError) throw pageError;
    if (!pageData) {
      return res.status(404).json({ error: 'Page non trouvée' });
    }

    // Vérifier l'accès de l'utilisateur au site web
    const hasAccess = await checkUserWebsiteAccess(supabase, userId, pageData.website_id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Accès non autorisé à cette page' });
    }

    // Récupérer la config
    const { data, error } = await supabase
      .from('page_config')
      .select('*')
      .eq('id_page', pageId)
      .order('id_config', { ascending: true });
    if (error) throw error;
    
    console.log('Config data retrieved:', data);
    
    const pageCrypt = jwt.sign({ page: data }, secretKey);
    res.send(pageCrypt);
  } catch (error) {
    console.error('Erreur lors de la récupération de la configuration de la page :', error);
    res.send({ error: error.message });
  }
});

// GET images for a page
router.get('/getImagePage',authenticateToken, async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const supabase = supabaseServer(token);

  const sentIdPage = req.query.IdPage;
  const sentIdConfig = req.query.IdConfig;
  const userId = req.user.idUser;

  if (!sentIdPage) {
    return res.status(400).json({ error: 'Page ID is required' });
  }

  try {
    // Récupérer la page pour vérifier le website_id
    const { data: pageData, error: pageError } = await supabase
      .from('page')
      .select('website_id')
      .eq('id', sentIdPage)
      .single();

    if (pageError) throw pageError;
    if (!pageData) {
      return res.status(404).json({ error: 'Page non trouvée' });
    }

    // Vérifier l'accès de l'utilisateur au site web
    const hasAccess = await checkUserWebsiteAccess(supabase, userId, pageData.website_id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Accès non autorisé à cette page' });
    }

    // Utiliser le client admin pour les tables d'éléments uniquement
    const supabaseAdmin = supabaseServerAdmin();

    const { data, error } = await supabaseAdmin
      .from('page_photo')
      .select('id_config, src_image, name_image, alt_image, size')
      .eq('id_page', sentIdPage)
      .eq('id_config', sentIdConfig);
    if (error) throw error;
    
    console.log('Fetched image data for page', sentIdPage, 'config', sentIdConfig, ':', data);
    
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
  const token = req.headers.authorization?.split(' ')[1];
  const supabase = supabaseServer(token);

  const pageId = req.query.IdPage;
  const idConfig = req.query.IdConfig;
  const userId = req.user.idUser;

  console.log('Fetching text for page ID:', pageId, '(type:', typeof pageId, ') and config ID:', idConfig, '(type:', typeof idConfig, ')');

  if (!pageId) {
    return res.status(400).send("L'id de la page est manquant.");
  }

  try {
    // Récupérer la page pour vérifier le website_id
    const { data: pageData, error: pageError } = await supabase
      .from('page')
      .select('website_id')
      .eq('id', pageId)
      .single();

    if (pageError) throw pageError;
    if (!pageData) {
      return res.status(404).json({ error: 'Page non trouvée' });
    }

    // Vérifier l'accès de l'utilisateur au site web
    const hasAccess = await checkUserWebsiteAccess(supabase, userId, pageData.website_id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Accès non autorisé à cette page' });
    }

    // Utiliser le client admin pour les tables d'éléments uniquement
    const supabaseAdmin = supabaseServerAdmin();

    // Vérifier d'abord toutes les entrées pour cette page
    const { data: allPageText, error: allError } = await supabaseAdmin
      .from('page_text')
      .select('*')
      .eq('id_page', pageId);
    
    console.log('All text entries for page:', allPageText);

    const { data, error } = await supabaseAdmin
      .from('page_text')
      .select('text, id_text, id_config')
      .eq('id_page', pageId)
      .eq('id_config', idConfig);
    if (error) throw error;

    console.log('Fetched text data for id_config', idConfig, ':', data);
    res.status(200).json(data);
  } catch (error) {
    console.error('Erreur lors de la récupération du texte :', error);
    res.status(500).send({ error: error.message });
  }
});

// GET page richtext (Supabase)
router.get('/getPageRichText',authenticateToken, async (req, res) => {
  
  const pageId = req.query.IdPage;
  const idConfig = req.query.IdConfig;
  const userId = req.user.idUser;

  const token = req.headers.authorization?.split(' ')[1];
  const supabase = supabaseServer(token);
  

  if (!pageId) {
    return res.status(400).send("L'id de la page est manquant.");
  }

  try {
    // Récupérer la page pour vérifier le website_id
    const { data: pageData, error: pageError } = await supabase
      .from('page')
      .select('website_id')
      .eq('id', pageId)
      .single();

    if (pageError) throw pageError;
    if (!pageData) {
      return res.status(404).json({ error: 'Page non trouvée' });
    }

    // Vérifier l'accès de l'utilisateur au site web
    const hasAccess = await checkUserWebsiteAccess(supabase, userId, pageData.website_id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Accès non autorisé à cette page' });
    }

    // Utiliser le client admin pour les tables d'éléments uniquement
    const supabaseAdmin = supabaseServerAdmin();

    const { data, error } = await supabaseAdmin
      .from('page_richtext')
      .select('text_json, id_richtext, id_config')
      .eq('id_page', pageId)
      .eq('id_config', idConfig);
    if (error) throw error;
    
    console.log('Fetched richtext data for page', pageId, 'config', idConfig, ':', data);
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
  const token = req.headers.authorization?.split(' ')[1];
  const supabase = supabaseServer(token);

  const id_page = req.body.params.idPage;
  const text = req.body.params.text;
  const userId = req.user.idUser;

  if (!id_page) {
    return res.status(400).json({ error: 'ID de page requis' });
  }

  console.log(id_page)

  try {
    // Récupérer la page pour vérifier le website_id
    const { data: pageData, error: pageError } = await supabase
      .from('page')
      .select('website_id')
      .eq('id', id_page)
      .single();

    if (pageError) throw pageError;
    if (!pageData) {
      return res.status(404).json({ error: 'Page non trouvée' });
    }

    // Vérifier l'accès de l'utilisateur au site web
    const hasAccess = await checkUserWebsiteAccess(supabase, userId, pageData.website_id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Accès non autorisé à cette page' });
    }
    
    // Utiliser le client admin pour les tables d'éléments uniquement
    const supabaseAdmin = supabaseServerAdmin();
    
    console.log('updating text for page id:', id_page)
    console.log('items to update:', text)
    
    // Mettre à jour chaque texte individuellement
    for (const item of text) {
      const { error: updateError } = await supabaseAdmin
        .from('page_text')
        .update({ text: item.value })
        .eq('id_config', item.id_config)
        .eq('id_page', id_page);
      
      if (updateError) {
        console.error('Erreur lors de la mise à jour du texte:', updateError);
        throw updateError;
      }
    }
    
    console.log('text mis a jour')
    res.status(200).send('Textes mis à jour avec succès');
  } catch (err) {
    console.error('Erreur lors de la mise à jour du texte de la page :', err);
    res.status(500).send({ error: err.message });
  }
});

// Update page richtext (Supabase)
router.post('/updateRichTextPage',authenticateToken, async (req, res) => {
  if (!req.body) {
    return res.status(400).send("Aucun texte n'a été envoyé.");
  }

  const token = req.headers.authorization?.split(' ')[1];
  const supabase = supabaseServer(token);

  const id_page = req.body.params.idPage;
  const richtext = req.body.params.richtext;
  const userId = req.user.idUser;

  if (!id_page) {
    return res.status(400).json({ error: 'ID de page requis' });
  }

  try {
    // Récupérer la page pour vérifier le website_id
    const { data: pageData, error: pageError } = await supabase
      .from('page')
      .select('website_id')
      .eq('id', id_page)
      .single();

    if (pageError) throw pageError;
    if (!pageData) {
      return res.status(404).json({ error: 'Page non trouvée' });
    }

    // Vérifier l'accès de l'utilisateur au site web
    const hasAccess = await checkUserWebsiteAccess(supabase, userId, pageData.website_id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Accès non autorisé à cette page' });
    }

    // Utiliser le client admin pour les tables d'éléments uniquement
    const supabaseAdmin = supabaseServerAdmin();

    // Mettre à jour chaque richtext individuellement
    for (const item of richtext) {
      const { error: updateError } = await supabaseAdmin
        .from('page_richtext')
        .update({ text_json: item.richText })
        .eq('id_config', item.id_config)
        .eq('id_page', id_page);
      
      if (updateError) {
        console.error('Erreur lors de la mise à jour du richtext:', updateError);
        throw updateError;
      }
    }
    
    res.status(200).send('Textes mis à jour avec succès');
  } catch (err) {
    console.error('Erreur lors de la mise à jour du richtext de la page :', err);
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

  const token = req.headers.authorization?.split(' ')[1];
  const supabase = supabaseServer(token);

  const id_page = req.body.id_page;
  const id_config = req.body.id_config;
  const name = req.body.name;
  const alt = req.body.alt;
  const size = req.body.size;
  const userId = req.user.idUser;
  
  const extension = path.extname(req.file.filename);
  const id_photo = path.basename(req.file.filename, extension);
  const src_image = id_photo + extension;
  const filePath = req.file.path;

  if (!id_page) {
    return res.status(400).json({ error: 'ID de page requis' });
  }

  try {
    // Récupérer la page pour vérifier le website_id
    const { data: pageData, error: pageError } = await supabase
      .from('page')
      .select('website_id')
      .eq('id', id_page)
      .single();

    if (pageError) throw pageError;
    if (!pageData) {
      return res.status(404).json({ error: 'Page non trouvée' });
    }

    // Vérifier l'accès de l'utilisateur au site web
    const hasAccess = await checkUserWebsiteAccess(supabase, userId, pageData.website_id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Accès non autorisé à cette page' });
    }

    // Utiliser le client admin pour les tables d'éléments uniquement
    const supabaseAdmin = supabaseServerAdmin();

    // Récupérer l'ancienne image (si existe)
    const { data: oldData, error: oldError } = await supabaseAdmin
      .from('page_photo')
      .select('src_image')
      .eq('id_page', id_page)
      .eq('id_config', id_config)
      .single();
    if (oldError && oldError.code !== 'PGRST116') throw oldError;
    if (oldData && oldData.src_image) {
      await supabaseAdmin.storage.from('page-image').remove([oldData.src_image]);
    }
    // Upload nouvelle image
    const fileBuffer = fs.readFileSync(filePath);
    const { error: uploadError } = await supabaseAdmin.storage
      .from('page-image')
      .upload(src_image, fileBuffer, {
        contentType: req.file.mimetype
      });
    if (uploadError) throw uploadError;
    // Update metadata
    const { error: updateError } = await supabaseAdmin
      .from('page_photo')
      .update({ src_image, name_image: name, alt_image: alt, size })
      .eq('id_page', id_page)
      .eq('id_config', id_config);
    if (updateError) throw updateError;
    fs.unlinkSync(filePath);
    res.status(200).send('Image sauvegardée avec succès');
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'image :', error);
    res.status(500).send({ error: error.message });
  }
});


router.post('/updateAltPage' ,authenticateToken, async (req, res) => {

  if (!req.body) {
    return res.status(400).send("Aucun Alt n'a été envoyé.");
  }
  const token = req.headers.authorization?.split(' ')[1];
  const supabase = supabaseServer(token);

  const id_page = req.body.params.pageId;
  const alt = req.body.params.alt;
  const id_config = req.body.params.id_config;
  const userId = req.user.idUser;

  if (!id_page) {
    return res.status(400).json({ error: 'ID de page requis' });
  }

  try {
    // Récupérer la page pour vérifier le website_id
    const { data: pageData, error: pageError } = await supabase
      .from('page')
      .select('website_id')
      .eq('id', id_page)
      .single();

    if (pageError) throw pageError;
    if (!pageData) {
      return res.status(404).json({ error: 'Page non trouvée' });
    }

    // Vérifier l'accès de l'utilisateur au site web
    const hasAccess = await checkUserWebsiteAccess(supabase, userId, pageData.website_id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Accès non autorisé à cette page' });
    }

    // Utiliser le client admin pour les tables d'éléments uniquement
    const supabaseAdmin = supabaseServerAdmin();

    const { error } = await supabaseAdmin
      .from('page_photo')
      .update({ alt_image: alt })
      .eq('id_page', id_page)
      .eq('id_config', id_config);
    if (error) throw error;
    res.status(200).send('Alt mis à jour avec succès');
  } catch (err) {
    console.error('Erreur lors de la mise à jour de l\'alt de l\'image :', err);
    res.status(500).send({ error: err.message });
  }
}); 


// Delete page data (Supabase version)
router.delete('/deletePageData',authenticateToken, async (req, res) => {
  const id_page = req.body.id_page;
  const data = req.body.data;
  const userId = req.user.idUser;

  const token = req.headers.authorization?.split(' ')[1];
  const supabase = supabaseServer(token);

  if (!id_page) {
    return res.status(400).json({ error: 'ID de page requis' });
  }

  try {
    // Récupérer la page pour vérifier le website_id
    const { data: pageData, error: pageError } = await supabase
      .from('page')
      .select('website_id')
      .eq('id', id_page)
      .single();

    if (pageError) throw pageError;
    if (!pageData) {
      return res.status(404).json({ error: 'Page non trouvée' });
    }

    // Vérifier l'accès de l'utilisateur au site web
    const hasAccess = await checkUserWebsiteAccess(supabase, userId, pageData.website_id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Accès non autorisé à cette page' });
    }

    // Utiliser le client admin pour les tables d'éléments uniquement
    const supabaseAdmin = supabaseServerAdmin();

    for (const element of data) {
      const id_config = element.id_config;
      const type = element.type;
      if (type === 'images') {
        // Récupérer l'image à supprimer
        const { data: imgData, error: imgError } = await supabaseAdmin
          .from('page_photo')
          .select('src_image')
          .eq('id_page', id_page)
          .eq('id_config', id_config)
          .single();
        if (imgError && imgError.code !== 'PGRST116') throw imgError;
        if (imgData && imgData.src_image) {
          await supabaseAdmin.storage.from('page-image').remove([imgData.src_image]);
        }
        // Mettre à jour la ligne pour supprimer les infos image
        const { error: updateError } = await supabaseAdmin
          .from('page_photo')
          .update({ src_image: null, name_image: null, alt_image: null, size: null })
          .eq('id_page', id_page)
          .eq('id_config', id_config);
        if (updateError) throw updateError;
      } else if (type === 'video') {
        // Supprimer la vidéo (suppression de la ligne)
        const { error: delError } = await supabaseAdmin
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

// CREATE new page
router.post('/createPage', authenticateToken, async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const supabase = supabaseServer(token);

  const { page_name, page_slug, website_id, config_fields } = req.body;
  const userId = req.user.idUser;

  if (!page_name || !page_slug || !website_id) {
    return res.status(400).json({ error: 'Nom de page, slug et website ID sont requis' });
  }

  try {
    // Vérifier l'accès de l'utilisateur au site web
    const hasAccess = await checkUserWebsiteAccess(supabase, userId, website_id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Accès non autorisé à ce site web' });
    }

    // Vérifier que le slug est unique pour ce site web
    const { data: existingPage, error: checkError } = await supabase
      .from('page')
      .select('id')
      .eq('page_slug', page_slug)
      .eq('website_id', website_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') throw checkError;
    if (existingPage) {
      return res.status(400).json({ error: 'Ce slug existe déjà pour ce site web' });
    }

    // Créer la page principale avec le client utilisateur
    const { data: pageData, error: pageError } = await supabase
      .from('page')
      .insert({
        page_name,
        page_slug,
        website_id,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (pageError) throw pageError;

    // Créer la configuration des champs si fournie
    if (config_fields && config_fields.length > 0) {
      const configInserts = config_fields.map((field, index) => ({
        id_page: pageData.id,
        id_config: index + 1,
        name_field: field.name_field,
        description_field: field.description_field || '',
        tab_field: field.tab_field,
        type: field.type || 'text',
        multiline_text: field.multiline_text || false
      }));

      // Utiliser le client utilisateur pour page_config
      const { error: configError } = await supabase
        .from('page_config')
        .insert(configInserts);

      if (configError) throw configError;

      // Utiliser le client admin uniquement pour les tables d'éléments
      const supabaseAdmin = supabaseServerAdmin();

      // Créer les entrées initiales pour les textes, photos et richtexts
      for (const field of config_fields) {
        const id_config = config_fields.indexOf(field) + 1;
        
        // Créer une entrée vide dans page_text pour chaque config
        const { error: textError } = await supabaseAdmin
          .from('page_text')
          .insert({
            id_page: pageData.id,
            id_config: id_config,
            text: ''
          });
        
        if (textError) console.error('Erreur création page_text:', textError);

        // Créer une entrée vide dans page_richtext pour chaque config
        const { error: richTextError } = await supabaseAdmin
          .from('page_richtext')
          .insert({
            id_page: pageData.id,
            id_config: id_config,
            text_json: null
          });
        
        if (richTextError) console.error('Erreur création page_richtext:', richTextError);

        // Créer une entrée vide dans page_photo pour chaque config
        const { error: photoError } = await supabaseAdmin
          .from('page_photo')
          .insert({
            id_page: pageData.id,
            id_config: id_config,
            src_image: null,
            name_image: null,
            alt_image: null,
            size: null
          });
        
        if (photoError) console.error('Erreur création page_photo:', photoError);
      }
    }

    res.status(201).json({ 
      message: 'Page créée avec succès', 
      page: pageData 
    });

  } catch (error) {
    console.error('Erreur lors de la création de la page:', error);
    res.status(500).json({ error: error.message });
  }
});

// UPDATE page
router.post('/updatePage', authenticateToken, async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const supabase = supabaseServer(token);

  const { page_id, page_name, page_slug } = req.body;
  const userId = req.user.idUser;

  if (!page_id || !page_name || !page_slug) {
    return res.status(400).json({ error: 'ID de page, nom et slug sont requis' });
  }

  try {
    // Récupérer la page pour vérifier le website_id
    const { data: pageData, error: pageError } = await supabase
      .from('page')
      .select('website_id')
      .eq('id', page_id)
      .single();

    if (pageError) throw pageError;
    if (!pageData) {
      return res.status(404).json({ error: 'Page non trouvée' });
    }

    // Vérifier l'accès de l'utilisateur au site web
    const hasAccess = await checkUserWebsiteAccess(supabase, userId, pageData.website_id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Accès non autorisé à cette page' });
    }

    // Vérifier que le nouveau slug est unique (si différent)
    const { data: existingPage, error: checkError } = await supabase
      .from('page')
      .select('id')
      .eq('page_slug', page_slug)
      .eq('website_id', pageData.website_id)
      .neq('id', page_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') throw checkError;
    if (existingPage) {
      return res.status(400).json({ error: 'Ce slug existe déjà pour ce site web' });
    }

    // Mettre à jour la page
    const { error: updateError } = await supabase
      .from('page')
      .update({
        page_name,
        page_slug,
        updated_at: new Date().toISOString()
      })
      .eq('id', page_id);

    if (updateError) throw updateError;

    res.status(200).json({ message: 'Page mise à jour avec succès' });

  } catch (error) {
    console.error('Erreur lors de la mise à jour de la page:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE page
router.delete('/deletePage', authenticateToken, async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const supabase = supabaseServer(token);

  const { page_id } = req.body;
  const userId = req.user.idUser;

  if (!page_id) {
    return res.status(400).json({ error: 'ID de page requis' });
  }

  try {
    // Récupérer la page pour vérifier le website_id
    const { data: pageData, error: pageError } = await supabase
      .from('page')
      .select('website_id')
      .eq('id', page_id)
      .single();

    if (pageError) throw pageError;
    if (!pageData) {
      return res.status(404).json({ error: 'Page non trouvée' });
    }

    // Vérifier l'accès de l'utilisateur au site web
    const hasAccess = await checkUserWebsiteAccess(supabase, userId, pageData.website_id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Accès non autorisé à cette page' });
    }

    // Supprimer d'abord les données liées (images, textes, etc.)
    // Images
    const { data: images, error: imgSelectError } = await supabase
      .from('page_photo')
      .select('src_image')
      .eq('id_page', page_id);

    if (imgSelectError && imgSelectError.code !== 'PGRST116') throw imgSelectError;

    if (images && images.length > 0) {
      const imagesToDelete = images.filter(img => img.src_image).map(img => img.src_image);
      if (imagesToDelete.length > 0) {
        await supabase.storage.from('page-image').remove(imagesToDelete);
      }
      
      const { error: imgDeleteError } = await supabase
        .from('page_photo')
        .delete()
        .eq('id_page', page_id);
      
      if (imgDeleteError) throw imgDeleteError;
    }

    // Supprimer les textes
    const { error: textDeleteError } = await supabase
      .from('page_text')
      .delete()
      .eq('id_page', page_id);
    
    if (textDeleteError && textDeleteError.code !== 'PGRST116') throw textDeleteError;

    // Supprimer les textes riches
    const { error: richTextDeleteError } = await supabase
      .from('page_richtext')
      .delete()
      .eq('id_page', page_id);
    
    if (richTextDeleteError && richTextDeleteError.code !== 'PGRST116') throw richTextDeleteError;

    // Supprimer les vidéos
    const { error: videoDeleteError } = await supabase
      .from('page_video')
      .delete()
      .eq('id_page', page_id);
    
    if (videoDeleteError && videoDeleteError.code !== 'PGRST116') throw videoDeleteError;

    // Supprimer la configuration
    const { error: configDeleteError } = await supabase
      .from('page_config')
      .delete()
      .eq('id_page', page_id);
    
    if (configDeleteError && configDeleteError.code !== 'PGRST116') throw configDeleteError;

    // Enfin, supprimer la page elle-même
    const { error: pageDeleteError } = await supabase
      .from('page')
      .delete()
      .eq('id', page_id);

    if (pageDeleteError) throw pageDeleteError;

    res.status(200).json({ message: 'Page supprimée avec succès' });

  } catch (error) {
    console.error('Erreur lors de la suppression de la page:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
