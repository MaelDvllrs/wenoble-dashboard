const express = require('express')
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const cors = require('cors')
const db = require('../db')
const multer = require('multer');
const { log } = require('console');



const router = express.Router();

router.use(cors())
router.use(express.json());

require('dotenv').config();
const secretKey = process.env.SECRET_KEY; 


router.get('/getBlog', (req, res) => {
  const sentIdUser = req.query.IdUser
  const SQL = 'SELECT id_blog, blog_name FROM blog WHERE id_user = ?'
  const Values = [sentIdUser]

  db.query(SQL, Values, (err, results) => {
    if (err) {
      res.send({ error: err })
      return;
    }

    const blog = results
    const blogCrypt = jwt.sign({ blog: blog }, secretKey)
    res.send(blogCrypt)
  })
});

router.get('/getListeBlog', (req, res) => {

  const sentIdBlog = req.query.IdBlog;
  const idUser = req.query.idUser;

  const SQL_verif = 'SELECT id_user FROM blog WHERE id_blog = ?';
  const Values_verif = [sentIdBlog];

  db.query(SQL_verif, Values_verif, (err, results) => {
    if (err) {
      console.log("erreur" + err);
      return res.status(500).send({ error: err });
      
    }

    if (idUser != results[0].id_user) {
      return res.status(403).send('Vous n\'avez pas les droits pour accéder à ce blog.');
    }

    const SQL = 'SELECT id_page_blog, page_blog_name, page_blog_create_date, page_blog_update_date FROM blog_page WHERE id_blog = ?'
    const Values = [sentIdBlog]

    db.query(SQL, Values, (err, results) => {
      if (err) {
        console.log("erreur" + err);
        res.send({ error: err })
        
        return;
      }

      const blogList = results
      const blogListCrypt = jwt.sign({ blogList: blogList }, secretKey)
      res.send(blogListCrypt)
    });
  });
});


  router.get('/getConfigBlog', (req, res) => {
    const sentIdBlog = req.query.IdBlog
    
    const SQL = 'SELECT tab_field, name_field, id_config FROM blog_config WHERE id_blog = ?'
    const Values = [sentIdBlog]
  
    db.query(SQL, Values, (err, results) => {
      if (err) {
        res.send({ error: err })
        return;
      }
  
      const blogConfig = results
      const blogConfigCrypt = jwt.sign({ blogConfig: blogConfig }, secretKey)
      res.send(blogConfigCrypt)
    })
  });



  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, path.join(__dirname,  '..', 'images', 'blog_image'));
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

router.post('/createImagesBlog', upload.single('image'), (req, res) => {

  if (!req.file) {
    console.error('Aucune image n\'a été téléchargée.');
    return res.status(400).send('Aucune image n\'a été téléchargée.');
  }


  console.log(req.body);
  const id_photo = req.body.id_photo;
  const id_blog_page = req.body.id_blog_page;
  const id_config = req.body.id_config;
  const name = req.body.name;
  const alt = req.body.alt;

  const SQL = 'INSERT INTO blog_field_image (id_image, id_blog_page, id_config, src_image, name_image, alt_image) VALUES (?, ?, ?, ?, ?, ?)';
  const Values = [id_photo, id_blog_page, id_config, id_photo, name, alt];

  db.query(SQL, Values, (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).send({ error: err });
    }

    res.status(200).send('Image sauvegardée avec succès');
  });
})



router.post('/createBlogPage', (req, res) => {
  const id = req.body.params.id;
  const title = req.body.params.mainText[0].value;
  const slug = req.body.params.mainText[1].value;
  const date = req.body.params.date;

  const SQL = 'INSERT INTO blog_page (id_blog, page_blog_name, page_blog_slug, page_blog_create_date, page_blog_update_date) VALUES (?, ?, ?, ?, ?)';
  const VALUES = [id, title, slug, date, date];

  db.query(SQL, VALUES, (err, results) => {
    if (err) {
      console.log('Database query error:', err);
      return res.status(500).send({ error: err });
    }

    const insertedId = results.insertId;

    console.log("insertid :" + insertedId)

    res.status(200).send({ message: 'Page créée avec succès', id: insertedId });
  });

})


router.post('/createTextBlog', (req, res) => {
  const id = req.body.params.id;
  const text = req.body.params.otherText;
  
  // Convertir chaque opération de base de données en une promesse
  const insertPromises = text.map((item) => {
    return new Promise((resolve, reject) => {
      const valueText = item.value;
      const id_config = item.id_config;
      const SQL = 'INSERT INTO blog_field_text (id_blog_page, id_config, text) VALUES (?, ?, ?)';
      const VALUES = [id, id_config, valueText];

      db.query(SQL, VALUES, (err, results) => {
        if (err) {
          console.log('Database query error:', err);
          return reject(err);
        }
        resolve('Texte créé avec succès');
      });
    });
  });

  // Attendre que toutes les promesses soient résolues
  Promise.all(insertPromises)
    .then((results) => {
      res.status(200).send('Tous les textes ont été créés avec succès');
    })
    .catch((error) => {
      res.status(500).send({ error: error });
    });
});

router.post('/createRichTextBlog', (req, res) => {
  const id = req.body.params.id;
  const richtext = req.body.params.infoRichText;

  const queries = richtext.map((item) => {

    return new Promise((resolve, reject) => {

      const richTextJSON = item.richText;
      const id_config = item.id_config;
      
      const SQL = 'INSERT INTO blog_field_richText (id_blog_page, id_config, text_json) VALUES (?, ?, ?)';
      const VALUES = [id, id_config, richTextJSON];
      
      db.query(SQL, VALUES, (err, results) => {
        if (err) {
          console.log('Database query error:', err);
          reject(err);
        } else {
          resolve('RichTexte créé avec succès');
        }
      });
    });
  });

  Promise.all(queries)
    .then((results) => {
      res.status(200).send('Tous les RichTextes ont été créés avec succès');
    })
    .catch((error) => {
      res.status(500).send({ error: error.message });
    });
});





router.get('/getBlogPage', (req, res) => {
  const sentIdBlogPage = req.query.IdBlogPage

  const SQL = 'SELECT * FROM blog_page WHERE id_page_blog = ?'
  const Values = [sentIdBlogPage]

  db.query(SQL, Values, (err, results) => {
    if (err) {
      res.send({ error: err })
      return;
    }

    const blogPage = results
    const blogPageCrypt = jwt.sign({ blogPage: blogPage }, secretKey)
    res.send(blogPageCrypt)
  })
});


 
module.exports = router;