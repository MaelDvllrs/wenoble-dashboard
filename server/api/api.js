const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const { stateToHTML } = require('draft-js-export-html');
const { convertFromRaw } = require('draft-js');

const db = require('../db');


const apiKeyMiddleware = (req, res, next) => {
    const apiKey = req.headers['api_key'];
    const id_data = req.headers['id_data']

    console.log('authentification api');
    
    if (!apiKey || !id_data) {
        return res.status(401).json({ message: 'Clé API ou ID de data manquant.' });
    }

    const SQL = 'SELECT id_user FROM users WHERE cle_api = ?'

    const Values = [apiKey]

    db.query(SQL, Values, (err, results)=>{
        if(err){
            res.send({error: err})
        }
        if(results.length  > 0){
            req.id_data = id_data;
            next();
        }else{
            return res.status(403).json({ message: 'Clé API invalide.' });
        }
    })
};

router.use(apiKeyMiddleware);


// Endpoint pour envoyer une photo
router.get('/sendPhoto', (req, res) => {

    const id_portfolio = req.id_data;

    const SQL = 'SELECT src_photo, alt_photo FROM photo_portfolio WHERE id_portfolio = ? ORDER BY order_photo'
    const Values = [id_portfolio]

    db.query(SQL, Values, (err, results)=>{
        if (err) {
            res.status(500).send({ error: err });
        }
        if (results.length === 0) {
            return res.status(403).json({ message: 'Aucune photo trouvée' });
        }

        const base64Images = results.map(photo => {
            const imagePath = path.join(__dirname, '..', 'images', 'portfolio_image', photo.src_photo);
            const imageData = fs.readFileSync(imagePath);
            return imageData.toString('base64');
        });


        res.json({ images: base64Images });
    })

});



router.get('/sendBlog', (req, res) => {
    const id_blog = req.id_data;

    const SQL = 'SELECT * FROM blog_page WHERE id_blog = ? AND status = 1';
    const Values = [id_blog];

    db.query(SQL, Values, (err, results) => {
        if (err) {
            res.status(500).send({ error: err });
        }
        if (results.length === 0) {
            return res.status(403).json({ message: 'Aucun blog trouvé' });
        }

        return res.json({ blog: results });
            
    });
});

router.get('/sendBlogInfo', (req, res) => {
    const id_blog_page = req.id_data;

    const SQL = 'SELECT * FROM blog_page WHERE id_page_blog = ? AND status = 1';
    const Values = [id_blog_page];

    db.query(SQL, Values, (err, results) => {
        if (err) {
            res.status(500).send({ error: err });
        }
        if (results.length === 0) {
            return res.status(403).json({ message: 'Aucun blog trouvé' });
        }

        return res.json({ blog: results });
            
    });
});



router.get('/sendBlogRichText', (req, res) => {
    const id_blog_page = req.id_data;

    const SQL = 'SELECT id_config, text_json FROM blog_field_richText WHERE id_blog_page = ?';
    const Values = [id_blog_page];

    db.query(SQL, Values, (err, results) => {
        if (err) {
            return res.status(500).send({ error: err });
        }
        if (results.length === 0) {
            return res.status(403).json({ message: 'Aucun texte riche trouvé' });
        }

        // Convertir chaque text_json de Draft.js en HTML
        const convertedResults = results.map(result => {
            const contentState = convertFromRaw(JSON.parse(result.text_json));
            const html = stateToHTML(contentState);
            return { id_config: result.id_config, text_html: html };        
        });

        return res.json({ richText: convertedResults });
    });
});


router.get('/sendBlogText', (req, res) => {
    const id_blog_page = req.id_data;

    const SQL = 'SELECT id_config, text FROM blog_field_text WHERE id_blog_page = ?';
    const Values = [id_blog_page];

    db.query(SQL, Values, (err, results) => {
        if (err) {
            res.status(500).send({ error: err });
        }
        if (results.length === 0) {
            return res.status(403).json({ message: 'Aucun texte trouvé' });
        }

        return res.json({ text: results });
            
    });
});

router.get('/sendBlogImage', (req, res) => {
    const id_blog_page = req.id_data;

    const SQL = 'SELECT id_config, src_image, alt_image FROM blog_field_image WHERE id_blog_page = ?';
    const Values = [id_blog_page];

    db.query(SQL, Values, (err, results) => {
        if (err) {
            res.status(500).send({ error: err });
        }
        if (results.length === 0) {
            return res.status(403).json({ message: 'Aucune image trouvée' });
        }

        console.log(results);

        const base64Images = results.map(image => {
            const imagePath = path.join(__dirname, '..', 'images', 'blog_image', image.src_image);
            const imageData = fs.readFileSync(imagePath);
            return { id_config: image.id_config, alt_image: image.alt_image, data: imageData.toString('base64') };
        });

        return res.json({ images: base64Images });
            
    });
});


router.get('/sendBlogVideo', (req, res) => {
    const id_blog_page = req.id_data;

    const SQL = 'SELECT id_config, src_video FROM blog_field_video WHERE id_blog_page = ?';
    const Values = [id_blog_page];

    db.query(SQL, Values, (err, results) => {
        if (err) {
            res.status(500).send({ error: err });
        }
        if (results.length === 0) {
            return res.status(403).json({ message: 'Aucune vidéo trouvée' });
        }

        return res.json({ video: results });
            
    });
});


router.get('/streamVideo/:videoName', (req, res) => {
    const videoName = req.id_data;
    const videoDirectory = path.join(__dirname, '..', 'images', 'blog_video');
    const videoPath = path.join(videoDirectory, videoName);
  
    fs.stat(videoPath, (err, stats) => {
      if (err) {
        console.log("Erreur lors de l'accès au fichier vidéo :", err);
        res.status(404).send('Vidéo non trouvée');
        return;
      }
  
      const fileSize = stats.size;
      const range = req.headers.range;
  
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize-1;
  
        const chunksize = (end-start)+1;
        const file = fs.createReadStream(videoPath, {start, end});
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'video/mp4',
        };
  
        res.writeHead(206, head);
        file.pipe(res);
      } else {
        const head = {
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4',
        };
        res.writeHead(200, head);
        fs.createReadStream(videoPath).pipe(res);
      }
    });
  });


    





module.exports = router; 