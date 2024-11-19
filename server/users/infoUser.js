const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db'); // Assurez-vous que le chemin est correct
const cors = require('cors')
const multer  = require('multer');
const path = require('path');
const fs = require('fs');




const router = express.Router();

router.use(cors())
router.use(express.json());

require('dotenv').config();
const secretKey = process.env.SECRET_KEY; 



router.get('/getUserInfoBasic', (req, res)=>{


    const id_user = req.user.idUser 

    const SQL = 'SELECT email, username, id_user, website FROM users WHERE id_user = ?'

    const Values = [id_user]

    db.query(SQL, Values, (err, results)=>{
        if(err){
            res.send({error: err})
        }

        const SQL_image = 'SELECT src_profile_image FROM users_info WHERE id_user = ?'
        const Values_image = [id_user]

        db.query(SQL_image, Values_image, (err, results_image)=>{
            if(err){
                res.send({error: err})
            }

            const user = results
            const image = results_image

            const userCrypt = jwt.sign({
              user : user,
              image : image
            }, secretKey);


            res.send(userCrypt)
        })
      }) 
  });


  router.get('/getUserInfo', (req, res)=>{

    const id_user = req.user.idUser 

    const SQL = 'SELECT website FROM users_info WHERE id_user = ?'
    const Values = [id_user]
    db.query(SQL,Values, (err, results)=>{
        if(err){
            res.send({error: err})
        }
        res.send(results)
    })
  });


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


  router.post('/updatedInfo', (req, res) => {
    const sentIdUser = req.body.IdUser
    const sentUsername = req.body.Username

    const SQL = 'SELECT email, username, id_user, website FROM users WHERE username = ? && id_user = ?'

    const Values = [sentUsername, sentIdUser]
  })


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