const express = require('express')
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const cors = require('cors')
const db = require('../db')
const multer = require('multer');



const router = express.Router();

router.use(cors())
router.use(express.json());

const secretKey = 'AUBUKBSAKBDKUDKUADUBYDKUABDAKUDNKAUBDYKAUDNAKUDBAK'


router.get('/getPage', (req, res)=>{
    
  const sentIdUser = req.query.IdUser

  const SQL = 'SELECT id_page, page_name FROM page WHERE id_user = ?'

  const Values = [sentIdUser]

  db.query(SQL, Values, (err, results)=>{
      if(err){
          res.send({error: err})
      }

      const page = results

      const pageCrypt = jwt.sign({
        page : page
      }, secretKey);

      res.send(pageCrypt)
  }) 
});


router.get('/getPageImages', (req, res) => {
  const pageId = req.query.pageId;

  if (!pageId) {
      return res.status(400).send('L\'id du portfolio est manquant.');
  }

  const SQL = 'SELECT id_photo, src_photo, alt_photo FROM photo_page WHERE id_page = ?';
  const values = [pageId];

  db.query(SQL, values, (err, results) => {
      if (err) {
          return res.status(500).send({error: err});
      }

      const image_page = results;

      const imageDirectory = path.join(__dirname, '..',  'images', 'page_image');

      const imagesData = image_page.map(image => {
          const imagePath = path.join(imageDirectory, image.src_photo);
          try {
              const imageData = fs.readFileSync(imagePath);
              return {
                  id_photo: image.id_photo,
                  name: image.src_photo,
                  data: `data:image/jpeg;base64,${imageData.toString('base64')}`,
                  alt: image.alt_photo,
              };
          } catch (error) {
              console.error('Erreur lors de la lecture de l\'image :', error);
              return null;
          }
      }).filter(Boolean); 

      res.status(200).json(imagesData);
  });
});

router.get('/getPageTexte', (req, res) => {

  const pageId = req.query.pageId;

  
  if (!pageId) {
      return res.status(400).send('L\'id de la page est manquant.');
  }

  const SQL = 'SELECT text, id_text, id_page FROM text_page WHERE id_page = ?';
  const values = [pageId];

  db.query(SQL, values, (err, results) => {
      if (err) {
          console.log('erreur bdd');
          return res.status(500).send({error: err});   
      }

      const pageTexte = results;


      res.status(200).json(pageTexte);
  });
});



const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname,  '..', 'images', 'page_image'));
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

router.post('/saveImagesPage', upload.single('image'), (req, res) => {

  if (!req.file || !req.body) {
    return res.status(400).send('Aucune image n\'a été téléchargée.');
  }
  console.log(req.body)
  const id_photo = req.body.id_photo 
  const alt = req.body.alt;
  const name = req.body.name;
  const src = req.body.src;
     
  const SQL = 'SELECT src_photo FROM photo_page WHERE id_photo = ?';

  db.query(SQL, [id_photo], (err, results) => {
    if (err) {
      throw err;  
    }
    const oldImageName = results[0].src_photo;
    const oldImagePath = path.join(__dirname, '..', 'images', 'page_image', oldImageName);
    fs.unlink(oldImagePath, (err) => {
      if (err) {
        throw err;
      }
      const SQL = 'UPDATE photo_page SET src_photo = ?, name_photo = ?, alt_photo = ? WHERE id_photo = ?';
      const Values = [src, name, alt, id_photo];
      db.query(SQL, Values, (err, results) => {
        if (err) {
          throw err;
        }
        res.status(200).send('Image sauvegardée avec succès');
      });
    });
  });

});



router.post('/saveAltPage', (req, res) => {
  if (!req.body) {
    return res.status(400).send('Aucun Alt n\'a été envoyé.');
  }

  const field = req.body.params.fields;
  console.log(req.body.params.fields);
  const id_photo = field.id;
  const alt = field.alt;
  const SQL = 'UPDATE photo_page SET alt_photo = ? WHERE id_photo = ?';
  const Values = [alt, id_photo];
  db.query(SQL, Values, (err, results) => {
    if (err) {
      throw err;
    }
    res.status(200).send('Alt mis à jour avec succès');
  });
});


router.post('/saveTextPage', (req, res) => {
  if (!req.body) {
    return res.status(400).send('Aucun texte n\'a été envoyé.');
  }

  const fields = req.body.params.fields;
  console.log(req.body.params.fields);

  const queries = fields.map(field => {
    const id_text = field.id;
    const text = field.text;

    const SQL = 'UPDATE text_page SET text = ? WHERE id_text = ?';
    const Values = [text, id_text];

    return new Promise((resolve, reject) => {
      db.query(SQL, Values, (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      });
    });
  });

  Promise.all(queries)
    .then(() => res.status(200).send('Textes mis à jour avec succès'))
    .catch(err => res.status(500).send({ error: err }));
});

module.exports = router;