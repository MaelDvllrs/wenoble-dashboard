const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const { stateToHTML } = require('draft-js-export-html');
const { convertFromRaw } = require('draft-js');

const db = require('../db');
const { ca } = require('date-fns/locale/ca');


const apiKeyMiddleware = (req, res, next) => {
    const apiKey = req.headers['api_key'];
    const id_data = req.headers['id_data']
    const ids = req.headers['ids']
    
    if (!apiKey) {
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
            req.ids = ids;
            next();
        }else{
            return res.status(403).json({ message: 'Clé API invalide pour api.' });
        }
    })
};



router.get('/sendPhoto',apiKeyMiddleware, (req, res) => {

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


router.get('/sendPhotoPortfolio',apiKeyMiddleware, (req, res) => {

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

        res.json({ images: results });

    })

});




//------------------- API pour les blogs -------------------//



// Récupérer toutes les pages de blogs

router.get('/sendBlog',apiKeyMiddleware, (req, res) => {
    const ids = req.ids; // IDs des blogs passés en paramètre de requête
    const order = req.query.order || 'DESC'; // Par défaut, l'ordre est decroissant
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;
    const colone = req.query.colone || 'page_blog_publish_date'; // Par défaut, on trie par date de publication
    const joinTable = req.query.joinTable || 'blog_page'; // Par défaut, on joint la table blog_page
    const configs = req.query.configs || null; // Configs des blogs passés en paramètre de requête 

    let SQL;
    let Values;

    if (ids) {
        const idArray = ids.split(',').map(id => parseInt(id, 10)); // Convertir les IDs en tableau de nombres
        const placeholders = idArray.map(() => '?').join(','); // Créer des placeholders pour la requête SQL

        if (configs === null) {
            SQL = `SELECT * FROM blog_page WHERE id_blog IN (${placeholders}) AND status = 1 ORDER BY ${colone} ${order}`;
            Values = [...idArray];
        } else {
            const configArray = configs.split(',').map(config => parseInt(config, 10)); // Convertir les configs en tableau de nombres
            
            
            if (joinTable === 'blog_page') {
                SQL = `SELECT * FROM blog_page WHERE id_blog IN (${placeholders}) AND status = 1 ORDER BY ${colone} ${order}`;
                Values = [...idArray];
            } else {
                SQL = `SELECT blog_page.* FROM blog_page INNER JOIN ${joinTable} ON blog_page.id_page_blog = ${joinTable}.id_blog_page WHERE blog_page.id_blog IN (${placeholders}) AND ${joinTable}.id_config IN (${placeholders}) AND blog_page.status = 1 ORDER BY ${joinTable}.${colone} ${order} `;
                Values = [...idArray, ...configArray];
            }
        }
    } else {
        const id_blog = req.id_data;
        SQL = `SELECT * FROM blog_page WHERE id_blog = ? AND status = 1 ORDER BY ${colone} ${order}`;
        Values = [id_blog];
    }

    if (limit !== null) {
        SQL += ' LIMIT ?';
        Values.push(limit);
    }

    db.query(SQL, Values, (err, results) => {
        if (err) {
            return res.status(500).send({ error: err });
        }
        if (results.length === 0) {
            return res.status(200).json({ message: 'Aucun blog trouvé' });
        }

        return res.json({ blog: results });
    });
});


// Récupérer les informations de chaque blog avec l'ID de la page de blog
router.get('/sendBlogInfo',apiKeyMiddleware, (req, res) => {
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



// Récupérer les informations de chaque blog avec le slug de la page de blog
router.get('/sendBlogInfoSlug',apiKeyMiddleware, (req, res) => {
    const slug = req.headers.slug;
    let id_blog = req.headers.id_blog;


    // Vérifiez si id_blog contient plusieurs identifiants séparés par des virgules
    if (typeof id_blog === 'string' && id_blog.includes(',')) {
        id_blog = id_blog.split(',').map(id => id.trim());
    } else {
        id_blog = [id_blog];
    }


    const SQL = `SELECT * FROM blog_page WHERE page_blog_slug = ? AND id_blog IN (?) AND status = 1`;
    const Values = [slug, id_blog];

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




// Récupérer les richTexts d'une page de blog avec l'ID de la page de blog
router.get('/sendBlogRichText',apiKeyMiddleware, (req, res) => {
    const id_blog_page = req.id_data;

    const SQL = 'SELECT id_config, text_json FROM blog_field_richText WHERE id_blog_page = ?';
    const Values = [id_blog_page];

    db.query(SQL, Values, (err, results) => {
        if (err) {
            return res.status(500).send({ error: err });
        }
        if (results.length === 0) {
            return res.status(200).json({ message: 'Aucun texte riche trouvé' });
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


// Récupérer les textes d'une page de blog avec l'ID de la page de blog 
router.get('/sendBlogText',apiKeyMiddleware, (req, res) => {
    const id_blog_page = req.id_data;

    const SQL = 'SELECT id_config, text FROM blog_field_text WHERE id_blog_page = ?';
    const Values = [id_blog_page];

    db.query(SQL, Values, (err, results) => {
        if (err) {
            res.status(500).send({ error: err });
        }
        if (results.length === 0) {
            return res.status(200).json({ message: 'Aucun texte trouvé' });
        }

        return res.json({ text: results });
            
    });
});


// Récupérer les images d'une page de blog avec l'ID de la page de blog
router.get('/sendBlogImage',apiKeyMiddleware, (req, res) => {
    const id_blog_page = req.id_data;

    const SQL = 'SELECT id_config, src_image, alt_image FROM blog_field_image WHERE id_blog_page = ?';
    const Values = [id_blog_page];

    db.query(SQL, Values, (err, results) => {
        if (err) {
            return res.status(500).send({ error: err });
        }
        if (results.length === 0) {
            return res.status(200).json({ message: 'Aucune image trouvée' });
        }


        const base64Images = results.map(image => {
            const imagePath = path.join(__dirname, '..', 'images', 'blog_image', image.src_image);
            const imageData = fs.readFileSync(imagePath);
            return { id_config: image.id_config, alt_image: image.alt_image, data: imageData.toString('base64') };
        });

        return res.json({ images: base64Images });
    });
});



// Récupérer les informations des images d'une page de blog avec l'ID de la page de blog 
router.get('/sendBlogInfoImage',apiKeyMiddleware, (req, res) => {
    const id_blog_page = req.id_data;

    const SQL = 'SELECT id_config, src_image, alt_image FROM blog_field_image WHERE id_blog_page = ?';
    const Values = [id_blog_page];
    db.query(SQL, Values, (err, results) => {
        if (err) {
            return res.status(500).send({ error: err });
        }
        if (results.length === 0) {
            return res.status(200).json({ message: 'Aucune image trouvée' });
        }

        return res.json({ images: results });
    });
});


// Récupérer les informations des gallery d'une page de blog avec l'ID de la page de blog
router.get('/sendBlogInfoGallery', apiKeyMiddleware, (req, res) =>{
    const id_blog_page = req.id_data;

    const SQL = 'SELECT id_config, gallery FROM blog_field_gallery WHERE id_blog_page = ?';
    const Values = [id_blog_page];
    db.query(SQL, Values, (err, results) => {
        if (err) {
            return res.status(500).send({ error: err });
        }
        if (results.length === 0) {
            return res.status(200).json({ message: 'Aucune gallery trouvée' });
        }

        return res.json({ gallery: results });
    });
})




// Récupérer les informations des videos d'une page de blog avec l'ID de la page de blog 
router.get('/sendBlogVideo',apiKeyMiddleware, (req, res) => {
    const id_blog_page = req.id_data;

    const SQL = 'SELECT id_config, src_video FROM blog_field_video WHERE id_blog_page = ?';
    const Values = [id_blog_page];

    db.query(SQL, Values, (err, results) => {
        if (err) {
            res.status(500).send({ error: err });
        }
        if (results.length === 0) {
            return res.status(200).json({ message: 'Aucune vidéo trouvée' });
        }

        return res.json({ video: results });
            
    });
});


router.get('/streamVideo/:videoName',apiKeyMiddleware, (req, res) => {
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




router.get('/sendMultiReference', apiKeyMiddleware, (req, res) => {
    const id_blog_page = req.id_data;
  
    const SQL = 'SELECT id_config, info_ref FROM blog_field_multiReference WHERE id_blog_page = ?';
    const Values = [id_blog_page];
  
    db.query(SQL, Values, (err, results) => {
      if (err) {
        return res.status(500).send({ error: err });
      }
      if (results.length === 0) {
        return res.status(200).json({ message: 'Aucune référence trouvée' });
      }
  
      // Parse each reference and add id_config to each object
      const references = results.flatMap(result => {
        const parsedRefs = JSON.parse(result.info_ref);
        return parsedRefs.map(ref => ({
          ...ref,
          id_config: result.id_config
        }));
      });
  
      return res.json({ references });
    });
  });




  router.get('/sendBlogContent', apiKeyMiddleware, async (req, res) => {
    const id_blog_page = req.headers.id_blog_page;
    const id_blog = req.headers.id_blog;

    const SQL = 'SELECT * FROM blog_config WHERE id_blog = ?';
    const Values = [id_blog];

    try {
        const configResults = await new Promise((resolve, reject) => {
            db.query(SQL, Values, (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });



        if (configResults.length === 0) {
            return res.status(200).json({ message: 'Aucun contenu trouvé' });
        }


        const contentPromises = configResults.map(result => {
            switch (result.tab_field) {
                case 'text':
                    const SQLText = 'SELECT id_config, text FROM blog_field_text WHERE id_blog_page = ?';
                    return new Promise((resolve, reject) => {
                        db.query(SQLText, [id_blog_page], (err, results) => {
                            if (err) return reject(err);
                            resolve({ type: 'text', data: results });
                        });
                    });
                case 'richText':
                    const SQLRichText = 'SELECT id_config, text_json FROM blog_field_richText WHERE id_blog_page = ?';
                    return new Promise((resolve, reject) => {
                        db.query(SQLRichText, [id_blog_page], (err, results) => {
                            if (err) return reject(err);
                            const convertedResults = results.map(result => {
                                const contentState = convertFromRaw(JSON.parse(result.text_json));
                                const html = stateToHTML(contentState);
                                return { id_config: result.id_config, text_html: html };
                            });
                            resolve({ type: 'richText', data: convertedResults });
                        });
                    });
                case 'image':
                    const SQLImage = 'SELECT id_config, src_image, alt_image FROM blog_field_image WHERE id_blog_page = ?';
                    return new Promise((resolve, reject) => {
                        db.query(SQLImage, [id_blog_page], (err, results) => {
                            if (err) return reject(err);
                            resolve({ type: 'image', data: results });
                        });
                    });
                case 'video':
                    const SQLVideo = 'SELECT id_config, src_video FROM blog_field_video WHERE id_blog_page = ?';
                    return new Promise((resolve, reject) => {
                        db.query(SQLVideo, [id_blog_page], (err, results) => {
                            if (err) return reject(err);
                            resolve({ type: 'video', data: results });
                        });
                    });
                case 'gallery':
                    const SQLGallery = 'SELECT id_config, gallery FROM blog_field_gallery WHERE id_blog_page = ?';
                    return new Promise((resolve, reject) => {
                        db.query(SQLGallery, [id_blog_page], (err, results) => {
                            if (err) return reject(err);

                            resolve({ type: 'gallery', data: results });
                        });
                    });
                case 'multiReference':
                    const SQLMultiReference = 'SELECT id_config, info_ref FROM blog_field_multiReference WHERE id_blog_page = ?';
                    return new Promise((resolve, reject) => {
                        db.query(SQLMultiReference, [id_blog_page], (err, results) => {
                            if (err) return reject(err);
                            const references = results.flatMap(result => {
                                const parsedRefs = JSON.parse(result.info_ref);
                                return parsedRefs.map(ref => ({
                                    ...ref,
                                    id_config: result.id_config
                                }));
                            });
                            resolve({ type: 'multiReference', data: references });
                        });
                    });
                default:
                    return Promise.resolve({ type: 'unknown', data: [] });
            }
        });

        const contentResults = await Promise.all(contentPromises);

        const combinedResults = contentResults.reduce((acc, result) => {
            acc[result.type] = result.data;
            return acc;
        }, {});

        return res.json({ content : combinedResults });
    } catch (err) {
        console.log(err);
        return res.status(500).send({ error: err });
    }
});



//------------------- API pour les pages -------------------//


router.get('/sendPage',apiKeyMiddleware, (req, res) => {
    const id = req.id_data;
    const SQL = 'SELECT * FROM page WHERE id_page = ?';
    const Values = [id];

    db.query(SQL, Values, (err, results) => {
        if (err) {
            res.status(500).send({ error: err });
        }
        if (results.length === 0) {
            return res.status(403).json({ message: 'Aucune page trouvée' });
        }

        return res.json({ page: results });
    });
});


router.get('/sendPageImage',apiKeyMiddleware, (req, res) => {
    const id = req.id_data;

    const SQL = 'SELECT id_config, src_image, alt_image FROM page_photo WHERE id_page = ?';
    const Values = [id];
    db.query(SQL, Values, (err, results) => {
        if (err) {
            return res.status(500).send({ error: err });
        }
        if (results.length === 0) {
            return res.status(200).json({ message: 'Aucune image trouvée' });
        }

        return res.json({ images: results });
    });
});


router.get('/sendPageRichText',apiKeyMiddleware, (req, res) => {
    const id = req.id_data;

    const SQL = 'SELECT id_config, text_json FROM page_richtext WHERE id_page = ?';
    const Values = [id];
    db.query(SQL, Values, (err, results) => {
        if (err) {
            return res.status(500).send({ error: err });
        }
        if (results.length === 0) {
            return res.status(200).json({ message: 'Aucun texte riche trouvé' });
        }

        const convertedResults = results.map(result => {
            if (result.text_json === null) {
                return { id_config: result.id_config, text_html: '' };
            }
            const contentState = convertFromRaw(JSON.parse(result.text_json));
            const html = stateToHTML(contentState);
            return { id_config: result.id_config, text_html: html };        
        });

        return res.json({ richText: convertedResults });
    });
});


router.get('/sendPageText',apiKeyMiddleware, (req, res) => {
    const id = req.id_data;
    const SQL = 'SELECT id_config, text FROM page_text WHERE id_page = ?';
    const Values = [id];
    db.query(SQL, Values, (err, results) => {
        if (err) {
            res.status(500).send({ error: err });
        }
        if (results.length === 0) {
            return res.status(200).json({ message: 'Aucun texte trouvé' });
        }

        return res.json({ text: results });
    });
});


router.get('/sendBlogAuteur',apiKeyMiddleware, (req, res) => {
    const id_blog = req.id_data;

    const SQL = 'SELECT id_user FROM blog WHERE id_blog = ?';
    const Values = [id_blog];
    db.query(SQL, Values, (err, results) => {
        if (err) {
            return res.status(500).send({ error: err });
        }
        if (results.length === 0) {
            return res.status(200).json({ message: 'Aucun auteur trouvée' });
        }

        const id_user = results[0].id_user;

        const SQL = 'SELECT username FROM users WHERE id_user = ?';
        const Values = [id_user];
        db.query(SQL, Values, (err, results) => {
            if (err) {
                return res.status(500).send({ error: err });
            }
            if (results.length === 0) {
                return res.status(200).json({ message: 'Aucun auteur trouvé' });
            }

            const name = results[0];

            const SQL = 'SELECT src_profile_image FROM users_info WHERE id_user = ?';
            const Values = [id_user];

            db.query(SQL, Values, (err, results) => {
                if (err) {
                    return res.status(500).send({ error: err });
                }

                if (results.length === 0) {
                    return res.status(200).json({ message: 'Aucune image de profil trouvée' });
                }
                
                const author = { username: name.username, src_profile_image: results[0].src_profile_image };

                return res.json({ author });
            }
        );


        });
    });
});






    





module.exports = router; 