const express = require('express')
const app = express()
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const cors = require('cors')
const db = require('../db')
const multer = require('multer');



const router = express.Router();

router.use(cors())
router.use(express.json());

require('dotenv').config();
const secretKey = process.env.SECRET_KEY; 

router.get('/getPortfolio', (req, res)=>{
    
  const sentIdUser = req.query.IdUser

  const SQL = 'SELECT id_portfolio, portfolio_name FROM portfolio WHERE id_user = ?'

  const Values = [sentIdUser]

  db.query(SQL, Values, (err, results)=>{
      if(err){
          res.send({error: err})
      }

      const portfolio = results

      const portfolioCrypt = jwt.sign({
        portfolio : portfolio
      }, secretKey);

      res.send(portfolioCrypt)
  }) 
});



router.get('/getPorfolioImages', (req, res) => {
    const portfolioId = req.query.portfolioId;
    const idUser = req.query.idUser;


    if (!portfolioId || !idUser) {
        return res.status(400).send('L\'id du portfolio est manquant.');
    }

    const SQL_verif = 'SELECT id_user FROM portfolio WHERE id_portfolio = ?';
    const Values_verif = [portfolioId];

    db.query(SQL_verif, Values_verif, (err, results) => {

      if (err) {
        console.log('Error in db query', err);
        return res.status(500).send({error: err});
      }

      if(results[0].id_user != idUser){
        return res.status(403).send('Vous n\'avez pas les droits pour accéder à ces images');
      }

      const SQL = 'SELECT id_photo, src_photo, alt_photo, size, order_photo FROM photo_portfolio WHERE id_portfolio = ? ORDER BY order_photo';
      const values = [portfolioId];

      db.query(SQL, values, (err, results) => {
        if (err) {
            return res.status(500).send({error: err});
        }
        const image_portfolio = results;
        const imageDirectory = path.join(__dirname, '..', 'images', 'portfolio_image');
        // Récupérer les noms de fichier, l'ordre et le texte alternatif des images depuis la base de données
        const imagesData = image_portfolio.map(image => {
            const imagePath = path.join(imageDirectory, image.src_photo);
            try {
              const imageData = fs.readFileSync(imagePath);
              const imageDataBase64 = Buffer.from(imageData).toString('base64');
              return {
                id_photo: image.id_photo,
                name: image.src_photo,
                data: 'data:image/jpeg;base64,' + imageDataBase64,
                alt: image.alt_photo,
                order: image.order_photo,
                size: image.size
              };
            } catch (error) {
              console.error('Erreur lors de la lecture de l\'image :', error);
              return null;
            }
          }).filter(Boolean); 
        
          res.status(200).json(imagesData);
        });
      });
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

router.post('/saveImagesPortfolio', upload.single('image'), (req, res) => {

    if (!req.file) {
      return res.status(400).send('Aucune image n\'a été téléchargée.');
    }

  
    const id_photo = req.body.id_photo;
    const id_portfolio = req.body.id_portfolio;
    const name = req.body.name;
    const alt = req.body.alt;
    const size = req.body.size;
  
    const SQL = 'INSERT INTO photo_portfolio (id_photo, id_portfolio, src_photo, name_photo, alt_photo, size) VALUES (?, ?, ?, ?, ?, ?)';
    const Values = [id_photo, id_portfolio, id_photo, name, alt, size];
  
    db.query(SQL, Values, (err, results) => {
      if (err) {
        console.error('Database query error:', err);
        return res.status(500).send({ error: err });
      }
  
      res.status(200).send('Image sauvegardée avec succès');
    });
  });


router.post('/orderPortfolio' , (req, res) => {
  if (!req.body) {
    return res.status(400).send('Aucune image n\'a été téléchargée.');
  }

  const id_photo = req.body.id_photo
  const order_photo = req.body.order

  const SQL = 'UPDATE photo_portfolio SET order_photo = ? WHERE id_photo = ?'
  const Values = [order_photo, id_photo]

  db.query(SQL, Values, (err, results)=>{
    if (err) {
      return res.status(500).send({ error: err });
    }
    res.status(200).send('Ordre mis à jour avec succès');
  })

});

router.post('/deleteImage', (req, res) => {
  if (!req.body) {
    console.log('No body in the request');
    return res.status(400).send('Aucune image n\'a été téléchargée.');
  }
  const id_photo = req.body.params.id_photo;
  const type_photo = req.body.params.type_photo;



  const SQLSelect = `SELECT src_photo FROM photo_portfolio WHERE id_photo = ?`;
  const ValuesSelect = [id_photo];

  db.query(SQLSelect, ValuesSelect, (err, results) => {
    if (err) {
      console.log('Error in db query', err);
      return res.status(500).send({ error: err });
    }

    // Assuming imageName is the column name in your table
    const imageName = results[0].src_photo;

    const SQLDelete = `DELETE FROM photo_portfolio WHERE id_photo = ?`;
    const ValuesDelete = [id_photo];

    db.query(SQLDelete, ValuesDelete, (err, results) => {
      if (err) {
        console.log('Error in db query', err);
        return res.status(500).send({ error: err });
      }

      const imagePath = path.join(__dirname, '..', 'images', type_photo, imageName);
      fs.unlink(imagePath, (err) => {
        if (err) {
          console.log('Error in fs.unlink', err);
          return res.status(500).send({ error: err });
        }
        res.status(200).send('Image supprimée avec succès');
      });
    });
  });
});

module.exports = router;