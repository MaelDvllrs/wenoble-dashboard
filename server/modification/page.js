const express = require('express')
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const cors = require('cors')
const db = require('../db')
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');




const router = express.Router();

router.use(cors())
router.use(express.json());

require('dotenv').config();
const secretKey = process.env.SECRET_KEY; 

router.get('/getPage', (req, res) => {
  const sentIdUser = req.query.IdUser
  const SQL = 'SELECT id_page, page_name FROM page WHERE id_user = ?'
  const Values = [sentIdUser]

  db.query(SQL, Values, (err, results) => {
    if (err) {
      res.send({ error: err })
      return;
    }
    const page = results
    const pageCrypt = jwt.sign({ page: page }, secretKey)
    res.send(pageCrypt)
  })
})

router.get('/getPageDetail', (req, res) => {
  const pageId = req.query.IdPage;
  const SQL = 'SELECT * FROM page WHERE id_page = ?'
  const Values = [pageId]

  db.query(SQL, Values, (err, results) => {
    if (err) {
      res.send({ error: err })
      return;
    }

    const page = results
    const pageCrypt = jwt.sign({ page: page }, secretKey)
    res.send(pageCrypt)
  })
})


router.get('/getConfigPage', (req, res) => {
  const pageId = req.query.IdPage;
  const SQL = 'SELECT * FROM page_config WHERE id_page = ?'
  const Values = [pageId]


  db.query(SQL, Values, (err, results) => {
    if (err) {
      res.send({ error: err })
      return;
    }

    const page = results
    const pageCrypt = jwt.sign({ page: page }, secretKey)
    res.send(pageCrypt)
  })
})


router.get('/getImagePage', (req, res) => {
  const sentIdBlogPage = req.query.IdPage;
  const sentIdConfig = req.query.IdConfig;


  const SQL = 'SELECT id_config, src_image, name_image, alt_image, size FROM page_photo WHERE id_page = ? AND id_config = ?'
  const Values = [sentIdBlogPage, sentIdConfig]

  db.query(SQL, Values, (err, results) => {
    if (err) {
      console.log("erreur" + err);
      res.send({ error: err })
      return;
    }

    const image = results;

    const imageDirectory = path.join(__dirname, '..', 'images', 'page_image')
    const imagesData = image.map(image => {
      const imagePath = path.join(imageDirectory, image.src_image);
      try {
        const imageData = fs.readFileSync(imagePath);
        const imageDataBase64 = Buffer.from(imageData).toString('base64');
        return {
          id_config: image.id_config,
          name: image.name_image,
          data: 'data:image/jpeg;base64,' + imageDataBase64,
          alt: image.alt_image,
          size: image.size,
          create: true
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

  const pageId = req.query.IdPage;
  const idConfig = req.query.IdConfig;

  
  if (!pageId) {
      return res.status(400).send('L\'id de la page est manquant.');
  }

  const SQL = 'SELECT text, id_text, id_config FROM page_text WHERE id_page = ? AND id_config = ?';
  const values = [pageId, idConfig];

  db.query(SQL, values, (err, results) => {
      if (err) {
          console.log('erreur bdd');
          return res.status(500).send({error: err});   
      }

      const pageTexte = results;


      res.status(200).json(pageTexte);
  });
});

router.get('/getPageRichText', (req, res) => {

  const pageId = req.query.IdPage;
  const idConfig = req.query.IdConfig;

  
  if (!pageId) {
      return res.status(400).send('L\'id de la page est manquant.');
  }

  const SQL = 'SELECT text_json, id_richText, id_config FROM page_richtext WHERE id_page = ? AND id_config = ?';
  const values = [pageId, idConfig];

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


router.post('/updateTextPage', (req, res) => {
  if (!req.body) {
    return res.status(400).send('Aucun texte n\'a été envoyé.');
  }

  const id_page = req.body.params.idPage;
  const text = req.body.params.text;


  const queries = text.map(text => {
    const id_config = text.id_config;
    const value = text.value;

    const SQL = 'UPDATE page_text SET text = ? WHERE id_config = ? AND id_page = ?';
    const Values = [value, id_config, id_page];

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

router.post('/updateRichTextPage', (req, res) => {
  if (!req.body) {
    return res.status(400).send('Aucun texte n\'a été envoyé.');
  }

  const id_page = req.body.params.idPage;
  const richtext = req.body.params.richtext;



  const queries = richtext.map(richtext => {
    const id_config = richtext.id_config;
    const value = richtext.richText;


    const SQL = 'UPDATE page_richtext SET text_json = ? WHERE id_config = ? AND id_page = ?';
    const Values = [value, id_config, id_page];

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


const uploadUpdateImage = multer({ storage: storageImage });

router.post('/updateImagesPage', uploadUpdateImage.single('image'), (req, res) => {

  if (!req.file) {
    console.error('Aucune image n\'a été téléchargée.');
    return res.status(400).send('Aucune image n\'a été téléchargée.');
  }
  const id_photo =  path.basename(req.file.filename, path.extname(req.file.filename));
  const id_page = req.body.id_page;
  const id_config = req.body.id_config;
  const name = req.body.name;
  const alt = req.body.alt;
  const size = req.body.size;
  const extension = path.extname(req.file.filename);
  
  const src_image = id_photo + extension;

  const SQL = 'SELECT src_image FROM page_photo WHERE id_page = ? AND 	id_config = ?';
  const Values = [id_page, id_config];

  db.query(SQL, Values, (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).send({ error: err });
    }

    console.log(results);

    if (results.src_image != null) {
      const imageDirectory = path.join(__dirname, '..', 'images', 'blog_image');
      const imagePath = path.join(imageDirectory, results[0].src_image);

      fs.unlink(imagePath, (err) => {
        if (err) {
          console.error('Erreur lors de la suppression de l\'image :', err);
        }
      });
    }

    const SQL = 'UPDATE page_photo SET  src_image = ?, name_image = ?, alt_image = ?, size = ?  WHERE id_page = ? AND 	id_config = ?';
    const Values = [src_image, name, alt, size, id_page, id_config];
  
    db.query(SQL, Values, (err, results) => {
      if (err) {
        console.error('Database query error:', err);
        return res.status(500).send({ error: err });
      }
  
      res.status(200).send('Image sauvegardée avec succès');
    });
  });
});

module.exports = router;