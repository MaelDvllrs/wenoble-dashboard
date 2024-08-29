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

    const SQL = 'SELECT id_page_blog, page_blog_name, status, page_blog_create_date, page_blog_update_date, page_blog_publish_date FROM blog_page WHERE id_blog = ?'
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
  
  const SQL = 'SELECT tab_field, name_field, id_config, id_collection_ref FROM blog_config WHERE id_blog = ?'
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

router.get('/getCollectionRef', (req, res) => {
  const sentIdCollectionRef = req.query.id_collection_ref

  const SQL = 'SELECT id_page_blog, page_blog_name FROM blog_page WHERE id_blog = ?'
  const Values = [sentIdCollectionRef]

  db.query(SQL, Values, (err, results) => {
    if (err) {
      res.send({ error: err })
      console.log("erreur" + err);
      return;
    }
    const collectionRef = results
    res.send(collectionRef)
  })
});


const storageImage = multer.diskStorage({
  destination: function (req, file, cb) {
      cb(null, path.join(__dirname, '..', 'images', 'blog_image'));
  },
  filename: function (req, file, cb) {
      const fileExtension = path.extname(file.originalname);
      const uniqueName = uuidv4() + fileExtension;
      cb(null, uniqueName);
  }
});

const uploadImage = multer({ storage: storageImage });

router.post('/createImagesBlog', uploadImage.single('image'), (req, res) => {

  if (!req.file) {
    console.error('Aucune image n\'a été téléchargée.');
    return res.status(400).send('Aucune image n\'a été téléchargée.');
  }

  const id_photo = path.basename(req.file.filename, path.extname(req.file.filename));
  const id_blog_page = req.body.id_blog_page;
  const id_config = req.body.id_config;
  const name = req.body.name;
  const alt = req.body.alt;
  const size = req.body.size;
  const extension = path.extname(req.file.filename);
  
  const src_image = id_photo + extension;

  const SQL = 'INSERT INTO blog_field_image (id_image, id_blog_page, id_config, src_image, name_image, alt_image, size) VALUES (?, ?, ?, ?, ?, ?, ?)';
  const Values = [id_photo, id_blog_page, id_config, src_image, name, alt, size];

  db.query(SQL, Values, (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).send({ error: err });
    }

    res.status(200).send('Image sauvegardée avec succès');
  });
})


const storageVideo = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname,  '..', 'images', 'blog_video'));
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const uploadVideo = multer({ storage: storageVideo });



router.post('/createVideoBlog', uploadVideo.single('video'), (req, res) => {

  if (!req.file) {
    console.error('Aucune image n\'a été téléchargée.');
    return res.status(400).send('Aucune image n\'a été téléchargée.');
  }


  const id_video = req.body.id_video;
  const id_blog_page = req.body.id_blog_page;
  const id_config = req.body.id_config;
  const name = req.body.name;
  const alt = req.body.alt;
  const size = req.body.size;

  const src_video = id_video + '.mp4';

  const SQL = 'INSERT INTO blog_field_video (id_video, id_blog_page, id_config, src_video, name_video, alt_video, size) VALUES (?, ?, ?, ?, ?, ?, ?)';
  const Values = [id_video, id_blog_page, id_config, src_video, name, alt, size];

  db.query(SQL, Values, (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).send({ error: err });
    }

    res.status(200).send('video sauvegardée avec succès');
  });
})



router.post('/createBlogPage', (req, res) => {
  const id = req.body.params.id;
  const title = req.body.params.mainText[0].value;
  const slug = req.body.params.mainText[1].value;
  const date = req.body.params.date;
  const status = req.body.params.status;
  let publishDate;
  if (status === 1) {
    publishDate = date;
  }

  const SQL = 'INSERT INTO blog_page (id_blog, page_blog_name, page_blog_slug, status, page_blog_create_date, page_blog_update_date, page_blog_publish_date) VALUES (?, ?, ?, ?, ?, ?, ?)';
  const VALUES = [id, title, slug, status, date, date, publishDate];

  db.query(SQL, VALUES, (err, results) => {
    if (err) {
      console.log('Database query error:', err);
      return res.status(500).send({ error: err });
    }

    const insertedId = results.insertId;

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

router.post('/createMultiReferenceBlog', (req, res) => {

  const id = req.body.params.id;
  const multiReference = req.body.params.multiReference;
  
  const SQL = 'INSERT INTO blog_field_multiReference (id_blog_page, id_config, info_ref) VALUES (?, ?, ?)';
  const VALUES = [id, multiReference.id_config, multiReference.value];

  db.query(SQL, VALUES, (err, results) => {
    if (err) {
      console.log('Database query error:', err);
      return res.status(500).send({ error: err });
    }

    res.status(200).send('MultiReference créée avec succès');
  });
});



router.get('/getBlogPage', (req, res) => {
  const sentIdBlogPage = req.query.IdBlogPage

  const SQL = 'SELECT page_blog_name, page_blog_slug, status, page_blog_create_date, page_blog_update_date, page_blog_publish_date FROM blog_page WHERE id_page_blog = ?'
  const Values = [sentIdBlogPage]

  db.query(SQL, Values, (err, results) => {
    if (err) {
      res.send({ error: err })
      return;
    }

    const blogPage = results;
    const blogPageCrypt = jwt.sign({ blogPage: blogPage }, secretKey)
    res.send(blogPageCrypt)
  })
});


router.get('/getTextBlog', (req, res) => {
  const sentIdBlogPage = req.query.IdBlogPage;
  const sentIdConfig = req.query.IdConfig;

  const SQL = 'SELECT id_config, text FROM blog_field_text WHERE id_blog_page = ? AND id_config = ?'
  const Values = [sentIdBlogPage, sentIdConfig]

  db.query(SQL, Values, (err, results) => {
    if (err) {
      res.send({ error: err })
      return;
    }

    if (results.length > 0) {
      results = results.map(result => ({ ...result, create: true }));
  };
    const text = results
    res.send(text)

  })
});


router.get('/getRichTextBlog', (req, res) => {
  const sentIdBlogPage = req.query.IdBlogPage;
  const sentIdConfig = req.query.IdConfig;

  const SQL = 'SELECT id_config, text_json FROM blog_field_richText WHERE id_blog_page = ? AND id_config = ?'
  const Values = [sentIdBlogPage, sentIdConfig]

  db.query(SQL, Values, (err, results) => {
    if (err) {
      res.send({ error: err })
      return;
    }
      if (results.length > 0) {

        results = results.map(result => ({ ...result, create: true }));
      };
      const richText = results

      res.send(richText)

  })
});


router.get('/getImageBlog', (req, res) => {
  const sentIdBlogPage = req.query.IdBlogPage;
  const sentIdConfig = req.query.IdConfig;


  const SQL = 'SELECT id_config, src_image, name_image, alt_image, size FROM blog_field_image WHERE id_blog_page = ? AND id_config = ?'
  const Values = [sentIdBlogPage, sentIdConfig]

  db.query(SQL, Values, (err, results) => {
    if (err) {
      console.log("erreur" + err);
      res.send({ error: err })
      return;
    }

    const image_blog = results;

    const imageDirectory = path.join(__dirname, '..', 'images', 'blog_image')
    const imagesData = image_blog.map(image => {
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


router.get('/getVideoBlog', (req, res) => {
  const sentIdBlogPage = req.query.IdBlogPage;
  const sentIdConfig = req.query.IdConfig;


  const SQL = 'SELECT id_config, src_video, name_video, alt_video, size FROM blog_field_video WHERE id_blog_page = ? AND id_config = ?'
  const Values = [sentIdBlogPage, sentIdConfig]

  db.query(SQL, Values, (err, results) => {
    if (err) {
      console.log("erreur" + err);
      res.send({ error: err })
      return;
    }

    const video_blog = results;


    const videoData = video_blog.map(video => {
     
        return {
          id_config: video.id_config,
          src: video.src_video,
          name: video.name_video,
          alt: video.alt_video,
          size: video.size,
          create: true

        };

      }).filter(Boolean); 

    
    res.status(200).json(videoData);

  });
});


router.get('/streamVideo/:videoName', (req, res) => {
  const videoName = req.params.videoName;
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


router.get('/getMultiReferenceBlog', (req, res) => {
  const sentIdBlogPage = req.query.IdBlogPage;
  const sentIdConfig = req.query.IdConfig;

  const SQL = 'SELECT id_config, info_ref FROM blog_field_multiReference WHERE id_blog_page = ? AND id_config = ?'
  const Values = [sentIdBlogPage, sentIdConfig]

  db.query(SQL, Values, (err, results) => {
    if (err) {
      console.log("erreur" + err);
      res.send({ error: err })
      return;
    }

    const updatedResults = results.map(result => {
      return {
        ...result,
        create: true
      };
    });

    res.send(updatedResults);
  })
});



router.post('/updateBlogPage', (req, res) => {
  
  const id = req.body.params.id;
  
  const title = req.body.params.mainText[0].value;
  const slug = req.body.params.mainText[1].value;
  const date = req.body.params.date;
  const status = req.body.params.status;
  const setPublishDate = req.body.params.setpublishDate;

  let SQL;
  let VALUES;

  if (setPublishDate === 1) {
      SQL = 'UPDATE blog_page SET page_blog_name = ?, page_blog_slug = ?, status = ?, page_blog_update_date = ?, page_blog_publish_date = ? WHERE id_page_blog = ?';
    if (status === 1) {
      VALUES = [title, slug, status, date, date, id];
    } else {
      VALUES = [title, slug, status, date, null, id];
    }
  } else { 
    SQL = 'UPDATE blog_page SET page_blog_name = ?, page_blog_slug = ?, status = ?, page_blog_update_date = ? WHERE id_page_blog = ?';
    VALUES = [title, slug, status, date, id];
  }

  db.query(SQL, VALUES, (err, results) => {
    if (err) {
      console.log('Database query error:', err);
      return res.status(500).send({ error: err });
    }

    res.status(200).send({ message: 'Page modifiée avec succès'});
  });

})



router.post('/updateTextBlog', (req, res) => {
  const id = req.body.params.id;
  const text = req.body.params.otherText;

  
  // Convertir chaque opération de base de données en une promesse
  const insertPromises = text.map((item) => {
    return new Promise((resolve, reject) => {
      const valueText = item.value;
      const id_config = item.id_config;
      const SQL = 'UPDATE blog_field_text SET text = ? WHERE id_config = ? AND id_blog_page = ?';
      const VALUES = [valueText, id_config, id];

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


router.post('/updateRichTextBlog', (req, res) => {
  const id = req.body.params.id;
  const richtext = req.body.params.infoRichText;

  const queries = richtext.map((item) => {

    return new Promise((resolve, reject) => {

      const richTextJSON = item.richText;
      const id_config = item.id_config;
      
      const SQL = 'UPDATE blog_field_richText SET  text_json = ? WHERE 	id_config = ? AND id_blog_page = ?';
      const VALUES = [richTextJSON,id_config, id];
      
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


const uploadUpdateImage = multer({ storage: storageImage });

router.post('/updateImagesBlog', uploadUpdateImage.single('image'), (req, res) => {

  if (!req.file) {
    console.error('Aucune image n\'a été téléchargée.');
    return res.status(400).send('Aucune image n\'a été téléchargée.');
  }
  const id_photo =  path.basename(req.file.filename, path.extname(req.file.filename));
  const id_blog_page = req.body.id_blog_page;
  const id_config = req.body.id_config;
  const name = req.body.name;
  const alt = req.body.alt;
  const size = req.body.size;
  const extension = path.extname(req.file.filename);
  
  const src_image = id_photo + extension;

  const SQL = 'SELECT src_image FROM blog_field_image WHERE id_blog_page = ? AND 	id_config = ?';
  const Values = [id_blog_page, id_config];

  db.query(SQL, Values, (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).send({ error: err });
    }

    const imageDirectory = path.join(__dirname, '..', 'images', 'blog_image');
    const imagePath = path.join(imageDirectory, results[0].src_image);

    fs.unlink(imagePath, (err) => {
      if (err) {
        console.error('Erreur lors de la suppression de l\'image :', err);
      }
    });

    const SQL = 'UPDATE blog_field_image SET  src_image = ?, name_image = ?, alt_image = ?, size = ?  WHERE id_blog_page = ? AND 	id_config = ?';
    const Values = [src_image, name, alt, size, id_blog_page, id_config];
  
    db.query(SQL, Values, (err, results) => {
      if (err) {
        console.error('Database query error:', err);
        return res.status(500).send({ error: err });
      }
  
      res.status(200).send('Image sauvegardée avec succès');
    });
  });
});




const uploadUpdateVideo = multer({ storage: storageVideo });

router.post('/updateVideoBlog', uploadUpdateVideo.single('video'), (req, res) => {

  if (!req.file) {
    console.error('Aucune image n\'a été téléchargée.');
    return res.status(400).send('Aucune image n\'a été téléchargée.');
  }

  const id_video = req.body.id_video;
  const id_blog_page = req.body.id_blog_page;
  const id_config = req.body.id_config;
  const name = req.body.name;
  const alt = req.body.alt;
  const src_video = id_video + '.mp4';
  const size = req.body.size;


  const SQL = 'SELECT src_video FROM blog_field_video WHERE id_blog_page = ? AND 	id_config = ?';
  const Values = [id_blog_page, id_config];

  db.query(SQL, Values, (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).send({ error: err });
    }

    const imageDirectory = path.join(__dirname, '..', 'images', 'blog_video');
    const imagePath = path.join(imageDirectory, results[0].src_video);

    fs.unlink(imagePath, (err) => {
      if (err) {
        console.error('Erreur lors de la suppression de la video :', err);
      }
    });

    const SQL = 'UPDATE blog_field_video SET  src_video = ?, name_video = ?, alt_video = ?, size = ?  WHERE id_blog_page = ? AND 	id_config = ?';
    const Values = [src_video, name, alt, size, id_blog_page, id_config];
  
    db.query(SQL, Values, (err, results) => {
      if (err) {
        console.error('Database query error:', err);
        return res.status(500).send({ error: err });
      }
  
      res.status(200).send('video sauvegardée avec succès');
    });
  });
});


//router.delete('/deleteBlogData', (req, res) => {
//  const id_blog_page = req.body.id_blog_page;
//
//  req.body.data.forEach((data) => {
//
//    const id_config = data.id_config;
//    const type = data.type;
//
//    switch(type) {
//      case 'images':
//        const SQLImage = `SELECT src_image FROM blog_field_image WHERE id_blog_page = ? AND id_config = ?`;
//        const VALUESImage = [id_blog_page, id_config];
//
//        db.query(SQLImage, VALUESImage, (err, results) => {
//          if (err) {
//            console.log('Database query error:', err);
//            return res.status(500).send({ error: err });
//          }
//          if (!results[0]) {
//            return;
//          }
//
//          fs.unlink(path.join(__dirname, '..', 'images', 'blog_image', results[0].src_image), (err) => {
//            if (err) {
//              console.error('Erreur lors de la suppression de l\'image :', err);
//            }
//          });
//        });
//
//        const SQLdeleteImage = `DELETE FROM blog_field_image WHERE id_blog_page = ? AND id_config = ?`;
//
//        db.query(SQLdeleteImage, VALUESImage, (err, results) => {
//          if (err) {
//            console.log('Database query error:', err);
//            return res.status(500).send({ error: err });
//          }
//        });
//        break;
//      case 'video':
//        const SQLVideo = `SELECT src_video FROM blog_field_video WHERE id_blog_page = ? AND id_config = ?`;
//        const VALUESVideo = [id_blog_page, id_config];
//        db.query(SQLVideo, VALUESVideo, (err, results) => {
//          if (err) {
//            console.log('Database query error:', err);
//            return res.status(500).send({ error: err });
//          }
//          if (!results[0]) {
//            return;
//          }
//
//          fs.unlink(path.join(__dirname, '..', 'images', 'blog_video', results[0].src_video), (err) => {
//            if (err) {
//              console.error('Erreur lors de la suppression de la video :', err);
//            }
//          });
//        });
//
//        const SQLdeleteVideo = `DELETE FROM blog_field_video WHERE id_blog_page = ? AND id_config = ?`;
//
//        db.query(SQLdeleteVideo, VALUESVideo, (err, results) => {
//          if (err) {
//            console.log('Database query error:', err);
//            return res.status(500).send({ error: err });
//          }
//        });
//        break;
//    }
//  });
//  res.status(200).send({ message: 'Données supprimées avec succès'});
//});



router.delete('/deleteBlogPage', (req, res) => {
  const idBlogPage = req.query.IdBlogPage;
  const idBlog = req.query.Id;
  const SQL = 'SELECT tab_field, id_config FROM blog_config WHERE id_blog = ?';
  const VALUES = [idBlog];

  db.query(SQL, VALUES, (err, results) => {
    if (err) {
      console.log('Database query error:', err);
      return res.status(500).send({ error: err });
    }

    console.log(results);

    const deletePromises = results.map((field) => {
      return new Promise((resolve, reject) => {
        let SQL;
        let VALUES;

        switch (field.tab_field) {
          case 'text':
            SQL = `DELETE FROM blog_field_text WHERE id_blog_page = ? AND id_config = ?`;
            VALUES = [idBlogPage, field.id_config];
            break;

          case 'richText':
            SQL = `DELETE FROM blog_field_richText WHERE id_blog_page = ? AND id_config = ?`;
            VALUES = [idBlogPage, field.id_config];
            break;

          case 'multiReference':
            SQL = `DELETE FROM blog_field_multiReference WHERE id_blog_page = ? AND id_config = ?`;
            VALUES = [idBlogPage, field.id_config];
            break;

          case 'image':
            const SQLImage = `SELECT src_image FROM blog_field_image WHERE id_blog_page = ? AND id_config = ?`;
            const VALUESImage = [idBlogPage, field.id_config];

            db.query(SQLImage, VALUESImage, (err, results) => {
              if (err) {
                console.log('Database query error:', err);
                return reject(err);
              }
              if (results[0]) {
                fs.unlink(path.join(__dirname, '..', 'images', 'blog_image', results[0].src_image), (err) => {
                  if (err) {
                    console.error('Erreur lors de la suppression de l\'image :', err);
                  }
                });
              }
            });

            SQL = `DELETE FROM blog_field_image WHERE id_blog_page = ? AND id_config = ?`;
            VALUES = [idBlogPage, field.id_config];
            break;

          case 'video':
            const SQLVideo = `SELECT src_video FROM blog_field_video WHERE id_blog_page = ? AND id_config = ?`;
            const VALUESVideo = [idBlogPage, field.id_config];
            db.query(SQLVideo, VALUESVideo, (err, results) => {
              if (err) {
                console.log('Database query error:', err);
                return reject(err);
              }
              if (results[0]) {
                fs.unlink(path.join(__dirname, '..', 'images', 'blog_video', results[0].src_video), (err) => {
                  if (err) {
                    console.error('Erreur lors de la suppression de la video :', err);
                  }
                });
              }
            });
            SQL = `DELETE FROM blog_field_video WHERE id_blog_page = ? AND id_config = ?`;
            VALUES = [idBlogPage, field.id_config];
            break;
        }

        db.query(SQL, VALUES, (err, results) => {
          if (err) {
            console.log('Database query error:', err);
            return reject(err);
          }
          resolve();
        });
      });
    });

    Promise.all(deletePromises)
      .then(() => {
        const SQL = `DELETE FROM blog_page WHERE id_page_blog = ?`;
        const VALUES = [idBlogPage];
        db.query(SQL, VALUES, (err, results) => {
          if (err) {
            console.log('Database query error:', err);
            return res.status(500).send({ error: err });
          }
          res.status(200).send({ message: 'Page supprimée avec succès' });
        });
      })
      .catch((err) => {
        res.status(500).send({ error: err });
      });
  });
});


router.post('/updateMultiReferenceBlog', (req, res) => {
  const id = req.body.params.id;
  const multiReference = req.body.params.multiReference;

  const SQL = 'UPDATE blog_field_multiReference SET info_ref = ? WHERE id_blog_page = ? AND id_config = ?';
  const VALUES = [multiReference.value, id, multiReference.id_config];

  db.query(SQL, VALUES, (err, results) => {
    if (err) {
      console.log('Database query error:', err);
      return res.status(500).send({ error: err });
    }

    res.status(200).send('MultiReference modifiée avec succès');
  });
});


module.exports = router;