const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors')
const multer  = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { supabaseServer } = require('../supabase');
const { authenticateToken } = require('../middleware/authToken');





const router = express.Router();

router.use(cors())
router.use(express.json());

require('dotenv').config();
const secretKey = process.env.SECRET_KEY; 



// Route avec authentification
router.get('/getUserInfoBasic', authenticateToken, async (req, res) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];

    console.log('Token:', token);
    const userId = req.user.idUser;
    const supabase = supabaseServer(token);
    
    // 1. Récupérer les informations de base de l'utilisateur depuis auth.users
    const { data: authUser, error: authError } = await supabase.auth.getUser(token);
    
    if (authError) throw authError;

    console.log('authUser:', authUser);

    console.log('userId:', userId);
    // 2. Récupérer les informations complémentaires depuis public.users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('username, website, api_key')
      .eq('id', userId)
      .single();

  
    
    if (userError) throw userError;

    
    // 3. Récupérer l'image de profil (si stockée dans une table séparée)
    const { data: imageData, error: imageError } = await supabase
      .from('profile_images')
      .select('src_profile_image')
      .eq('user_id', userId)
      .maybeSingle();
    
    // Combiner toutes les informations

    const user = [{
      email: authUser.user.email,
      username: userData.username,
      id_user: userId,
      website: userData.website || ''
    }];
    
    const image = imageData ? [{ src_profile_image: imageData.src_profile_image }] : [];
    
    // Chiffrer la réponse avec JWT comme dans l'ancien code
    const userCrypt = jwt.sign({
      user: user,
      image: image
    }, secretKey);
    
    res.send(userCrypt);
  } catch (error) {
    console.error('Erreur lors de la récupération des infos utilisateur:', error);
    res.status(500).json({ error: error.message });
  }
});


  //router.get('/getUserInfo', (req, res)=>{
//
  //  const id_user = req.user.idUser 
//
  //  const SQL = 'SELECT website FROM users_info WHERE id_user = ?'
  //  const Values = [id_user]
  //  db.query(SQL,Values, (err, results)=>{
  //      if(err){
  //          res.send({error: err})
  //      }
  //      res.send(results)
  //  })
  //});


  const uploadProfile = multer({ dest: '../images/uploads/' });

  router.post('/uploadProfileImage', uploadProfile.single('image'), (req, res) => {
    if (!req.file) {
      return res.status(400).send('Aucune image n\'a été téléchargée.');
    }
  
    const tempFilePath = req.file.path;
    const originalFileName = req.file.originalname;
    const fileExtension = path.extname(originalFileName);
  
    const username = req.headers.username; 

    const newFileName = `profile_${username}${fileExtension}`;
  
    const newFilePath = path.join(__dirname, '..',  'images', 'profile_image', newFileName);
    
    fs.rename(tempFilePath, newFilePath, (err) => {
      if (err) {
        console.error('Erreur lors du déplacement du fichier :', err);
        return res.status(500).send('Une erreur s\'est produite lors du téléchargement de l\'image.');
      }
  
      res.status(200).send('L\'image a été téléchargée avec succès.');
    });
  });


  router.get('/getProfileImages', (req, res) => {
    const imagePrefix = req.query.imagePrefix;
    if (!imagePrefix) {
      return res.status(400).send('Le préfixe d\'image est manquant.');
    }
  
    const imageDirectory = path.join(__dirname, '..', 'images', 'profile_image');
  
    fs.readdir(imageDirectory, (err, files) => {
      if (err) {
        console.error('Erreur lors de la lecture du répertoire d\'images :', err);
        return res.status(500).send('Une erreur s\'est produite lors de la récupération des images.');
      }
  
      const matchingImages = files.filter(file => file.startsWith(imagePrefix));
  
      // Renvoyer les images au client
      const imagesData = [];
      matchingImages.forEach(imageName => {
        const imagePath = path.join(imageDirectory, imageName);
        const imageData = fs.readFileSync(imagePath);
        imagesData.push({
          name: imageName,
          data: imageData.toString('base64') // Convertir les données binaires en base64
        });
      });
      res.status(200).json(imagesData);
    });
  });


  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, '..', 'images', 'profile_image')); // Répertoire de destination pour les fichiers téléchargés
    },
    filename: function (req, file, cb) {
      const fileExtension = path.extname(file.originalname);
      const uniqueName = uuidv4() + fileExtension;
      cb(null, uniqueName);
    }
  });


  const upload = multer({ storage: storage });

  router.post('/updateInfoUser', upload.single('image'), (req, res) => {
    const idUser = req.user.idUser;


    const { email=null } = JSON.parse(req.body.data);
    const image = req.file ? req.file.filename : null;

    if(email){
      const SQLEmail = 'UPDATE users SET email = ? WHERE id_user = ?';
      const ValuesEmail = [email, idUser];
      db.query(SQLEmail, ValuesEmail, (err, result) => {
        if (err) {
          console.error('Erreur lors de la mise à jour de l\'email:', err);
          return res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'email' });
        }
        res.status(200).json({ message: 'Email mis à jour avec succès' });
      });
    }

    if (image) {

      const SQLSelect = 'SELECT src_profile_image FROM users_info WHERE id_user = ?';
      const ValuesSelect = [idUser];

      db.query(SQLSelect, ValuesSelect, (err, results) => {
        if (err) {
          console.error('Erreur lors de la récupération de l\'image de profil:', err);
          return res.status(500).json({ message: 'Erreur lors de la récupération de l\'image de profil' });
        }
        if (results.length !== 0) {
          const oldImage = results[0].src_profile_image;
          if (oldImage) {
            fs.unlink(path.join(__dirname, '..', 'images', 'profile_image', oldImage), (err) => {
              if (err) {
                console.error('Erreur lors de la suppression de l\'ancienne image de profil:', err);
              }
            });
          }
        }

        const SQL = 'UPDATE users_info SET src_profile_image = ? WHERE id_user = ?';
        const Values = [image, idUser];

        db.query(SQL, Values, (err, result) => {
          if (err) {
            console.error('Erreur lors de la mise à jour de l\'image de profil:', err);
            return res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'image de profil' });
          }
          res.status(200).json({ message: 'Image de profil mise à jour avec succès' });
        });
      });
    }
  });
  


  router.get('/getTotalSize', (req, res) => {

    const token = req.query.token
    const decoded = jwt.verify(token, secretKey);


    IdUser = decoded.idUser

    const SQL = 'SELECT id_portfolio FROM portfolio WHERE id_user = ?'
    const Values = [IdUser]

    db.query(SQL, Values, (err, results) => {
      if(err){
        res.send({error: err})
      }

      const portfolios = results

      portfolios.forEach(portfolio => {
        const SQL = 'SELECT size FROM photo_portfolio WHERE id_portfolio = ?'
        const Values = [portfolio.id_portfolio]

        db.query(SQL, Values, (err, results) => {
          if(err){
            res.send({error: err})
          }

          const sizes = results

          const totalSize = sizes.reduce((acc, size) => acc + size.size, 0)

          res.send({totalSize: totalSize})
        })
      })
    })
  });

  module.exports = router;