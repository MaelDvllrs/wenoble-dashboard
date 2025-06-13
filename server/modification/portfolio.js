const express = require('express')
const app = express()
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const cors = require('cors')
const { supabaseServer } = require('../supabase');
const { authenticateToken } = require('../middleware/authToken');
const multer = require('multer');



const router = express.Router();

router.use(cors())
router.use(express.json());

require('dotenv').config();
const secretKey = process.env.SECRET_KEY; 

router.get('/getPortfolio',authenticateToken, async (req, res) => {
  
  const token = req.headers.authorization?.split(' ')[1];
  const supabase = supabaseServer(token);

  const sentIdUser = req.user.idUser;
  try {
    const { data, error } = await supabase
      .from('portfolio')
      .select('id_portfolio, portfolio_name')
      .eq('user_id', sentIdUser);
    if (error) throw error;
    const portfolioCrypt = jwt.sign({ portfolio: data }, secretKey);
    res.send(portfolioCrypt);
  } catch (err) {
    console.error('Erreur lors de la récupération du portfolio :', err);
    res.send({ error: err.message });
  }
});

router.get('/getPorfolioImages',authenticateToken, async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const supabase = supabaseServer(token);

  const portfolioId = req.query.portfolioId;
  const idUser = req.user.idUser;
  if (!portfolioId || !idUser) {
    return res.status(400).send("L'id du portfolio est manquant.");
  }
  try {
    // Vérifier que le portfolio appartient à l'utilisateur
    const { data: portfolio, error: errPortfolio } = await supabase
      .from('portfolio')
      .select('user_id')
      .eq('id_portfolio', portfolioId)
      .maybeSingle();
    if (errPortfolio) throw errPortfolio;
    if (!portfolio || portfolio.user_id != idUser) {
      return res.status(403).send("Vous n'avez pas les droits pour accéder à ces images");
    }
    // Récupérer les images
    const { data: image_portfolio, error: errImages } = await supabase
      .from('photo_portfolio')
      .select('id_photo, src_photo, alt_photo, size, order_photo')
      .eq('id_portfolio', portfolioId)
      .order('order_photo', { ascending: true });
    if (errImages) throw errImages;
    // Générer les URLs publiques Supabase pour chaque image
    const imagesData = await Promise.all(
      image_portfolio.map(async image => {
        const { data: publicUrlData } = supabase.storage
          .from('portfolio-image')
          .getPublicUrl(image.src_photo);
        return {
          id_photo: image.id_photo,
          name: image.src_photo,
          url: publicUrlData?.publicUrl || '',
          alt: image.alt_photo,
          order: image.order_photo,
          size: image.size
        };
      })
    );
    res.status(200).json(imagesData);
  } catch (err) {
    console.error('Erreur lors de la récupération des images du portfolio :', err);
    res.status(500).send({ error: err.message });
  }
});

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, path.join(__dirname,  '..', 'images', 'portfolio_image'));
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

router.post('/saveImagesPortfolio', authenticateToken, upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send("Aucune image n'a été téléchargée.");
  }

  const token = req.headers.authorization?.split(' ')[1];
  const supabase = supabaseServer(token);


  const id_photo = req.body.id_photo;
  const id_portfolio = req.body.id_portfolio;
  const name = req.body.name;
  const alt = req.body.alt;
  const size = req.body.size;
  const src_photo = req.file.originalname;
  try {
    // Upload dans le bucket Supabase
    const fileBuffer = fs.readFileSync(req.file.path);
    const { error: uploadError } = await supabase.storage
      .from('portfolio-image')
      .upload(src_photo, fileBuffer, { upsert: true, contentType: req.file.mimetype });
    if (uploadError) throw uploadError;
    // Insertion des métadonnées
    const { error } = await supabase
      .from('photo_portfolio')
      .insert({
        id_photo,
        id_portfolio,
        src_photo,
        name_photo: name,
        alt_photo: alt,
        size
      });
    if (error) throw error;
    // Nettoyer le fichier temporaire
    fs.unlinkSync(req.file.path);
    res.status(200).send('Image sauvegardée avec succès');
  } catch (err) {
    console.error('Erreur lors de la sauvegarde de l\'image du portfolio :', err);
    res.status(500).send({ error: err.message });
  }
});

router.post('/orderPortfolio',authenticateToken, async (req, res) => {
  if (!req.body) {
    return res.status(400).send("Aucune image n'a été téléchargée.");
  }

  const token = req.headers.authorization?.split(' ')[1];
  const supabase = supabaseServer(token);

  const id_photo = req.body.id_photo;
  const order_photo = req.body.order;
  try {
    const { error } = await supabase
      .from('photo_portfolio')
      .update({ order_photo })
      .eq('id_photo', id_photo);
    if (error) throw error;
    res.status(200).send('Ordre mis à jour avec succès');
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

router.post('/deleteImage',authenticateToken, async (req, res) => {
  if (!req.body) {
    return res.status(400).send("Aucune image n'a été téléchargée.");
  }

  const token = req.headers.authorization?.split(' ')[1];
  const supabase = supabaseServer(token);

  const id_photo = req.body.params.id_photo;
  const type_photo = req.body.params.type_photo;
  try {
    // Récupérer le nom du fichier
    const { data, error: errSelect } = await supabase
      .from('photo_portfolio')
      .select('src_photo')
      .eq('id_photo', id_photo)
      .maybeSingle();
    if (errSelect) throw errSelect;
    const imageName = data?.src_photo;
    // Supprimer la ligne
    const { error: errDelete } = await supabase
      .from('photo_portfolio')
      .delete()
      .eq('id_photo', id_photo);
    if (errDelete) throw errDelete;
    // Supprimer le fichier du bucket Supabase
    const { error: storageError } = await supabase.storage
      .from('portfolio-image')
      .remove([imageName]);
    if (storageError) {
      return res.status(500).send({ error: storageError.message });
    }
    res.status(200).send('Image supprimée avec succès');
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

module.exports = router;