const express = require('express')
const app = express()
const mysql = require('mysql')
const cors = require('cors')
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const multer  = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./db')

const apiRouter = require('./api/portfolio_api');



const secretKey = crypto.randomBytes(32).toString('hex');
const bodyParser = require('body-parser');


app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));


app.use(express.json())
app.use(cors())

app.listen(3002, ()=>{
    console.log('Server is running on port 3002')
})

app.post('/login', (req, res)=>{
    const sentLoginUsername = req.body.LoginUserName
    const sentLoginPassword = req.body.LoginPassword

    const SQL = 'SELECT username, id_user, admin FROM users WHERE username = ? && password = ?'

    const Values = [sentLoginUsername, sentLoginPassword]

    db.query(SQL, Values, (err, results)=>{
        if(err){
            res.send({error: err})
        }
        if(results.length  > 0){

            const user = results[0];

            const idUser = user.id_user
            const admin = user.admin === 1;

            const token = jwt.sign({ 
                idUser: idUser,
                username: sentLoginUsername, 
                isAdmin: admin 
            }, secretKey);

            res.send({ token })

        }
        else{
            res.send({message: 'Utilisateur introuvable'})
        }
    })


})

app.post('/api/auth/verify', (req, res) => {
    const token = req.body.token;
  

  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {

    const decoded = jwt.verify(token, secretKey);
    return res.status(200).json({ success: true, user: decoded });
  } catch (error) {

    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
});


  app.post('/UserInfo', (req, res)=>{
    
    const sentIdUser = req.body.IdUser
    const sentUsername = req.body.Username

    const SQL = 'SELECT email, username, id_user, website FROM users WHERE username = ? && id_user = ?'

    const Values = [sentUsername, sentIdUser]

    db.query(SQL, Values, (err, results)=>{
        if(err){
            res.send({error: err})
        }

        const user = results

        const userCrypt = jwt.sign({
            user : user
        }, secretKey);

        res.send(userCrypt)
    }) 
  });


  const uploadProfile = multer({ dest: 'images/uploads/' });

  app.post('/uploadProfileImage', uploadProfile.single('image'), (req, res) => {
    if (!req.file) {
      return res.status(400).send('Aucune image n\'a été téléchargée.');
    }
  
    const tempFilePath = req.file.path;
    const originalFileName = req.file.originalname;
    const fileExtension = path.extname(originalFileName);
  
    const username = req.headers.username; 

    const newFileName = `profile_${username}${fileExtension}`;
  
    const newFilePath = path.join(__dirname, 'images', 'profile_image', newFileName);
    
    fs.rename(tempFilePath, newFilePath, (err) => {
      if (err) {
        console.error('Erreur lors du déplacement du fichier :', err);
        return res.status(500).send('Une erreur s\'est produite lors du téléchargement de l\'image.');
      }
  
      res.status(200).send('L\'image a été téléchargée avec succès.');
    });
  });


  app.get('/getProfileImages', (req, res) => {
    const imagePrefix = req.query.imagePrefix;
    if (!imagePrefix) {
      return res.status(400).send('Le préfixe d\'image est manquant.');
    }
  
    const imageDirectory = path.join(__dirname, 'images', 'profile_image');
  
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


  app.post('/updatedInfo', (req, res) => {
    const sentIdUser = req.body.IdUser
    const sentUsername = req.body.Username

    const SQL = 'SELECT email, username, id_user, website FROM users WHERE username = ? && id_user = ?'

    const Values = [sentUsername, sentIdUser]
  })


  app.use('/api', apiRouter);


  app.get('/getPortfolio', (req, res)=>{
    
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

  app.get('/getPorfolioImages', (req, res) => {
    const portfolioId = req.query.portfolioId;
    if (!portfolioId) {
        return res.status(400).send('L\'id du portfolio est manquant.');
    }

    const SQL = 'SELECT id_photo, src_photo, alt_photo, order_photo FROM photo_portfolio WHERE id_portfolio = ? ORDER BY order_photo';
    const values = [portfolioId];

    db.query(SQL, values, (err, results) => {
        if (err) {
            return res.status(500).send({error: err});
        }

        const image_portfolio = results;

        const imageDirectory = path.join(__dirname, 'images', 'portfolio_image');

        // Récupérer les noms de fichier, l'ordre et le texte alternatif des images depuis la base de données
        const imagesData = image_portfolio.map(image => {
            const imagePath = path.join(imageDirectory, image.src_photo);
            try {
                const imageData = fs.readFileSync(imagePath);
                return {
                    id_photo: image.id_photo,
                    name: image.src_photo,
                    data: `data:image/jpeg;base64,${imageData.toString('base64')}`,
                    alt: image.alt_photo,
                    order: image.order_photo
                };
            } catch (error) {
                console.error('Erreur lors de la lecture de l\'image :', error);
                return null;
            }
        }).filter(Boolean); 

        res.status(200).json(imagesData);
    });
});

app.post('/saveImages', (req, res) => {
  if (!req.body) {
    return res.status(400).send('Aucune image n\'a été téléchargée.');
  }

  const directory = req.body.params.directory;

  const id_photo = req.body.params.fields.id_photo;
  const id_portfolio = req.body.params.fields.id_portfolio;
  const data = req.body.params.fields.data;
  const name = req.body.params.fields.name;
  const alt = req.body.params.fields.alt;

  const SQL = 'INSERT INTO photo_portfolio (id_photo, id_portfolio, src_photo, alt_photo) VALUES (?, ?, ?, ?)';
  const Values = [id_photo, id_portfolio, name, alt];

  db.query(SQL, Values, (err, results) => {
    if (err) {
        console.error('Database query error:', err);
        return res.status(500).send({ error: err });
    }
    saveImageAsync(data, name, directory, (err) => {
        if (err) {
            console.error('Error saving image:', err);
            return res.status(500).send({ error: 'Erreur lors de la sauvegarde de l\'image.' });
        }
        res.status(200).send('Image sauvegardée avec succès');
    });
  });
});

const saveImageAsync = (base64Data, fileName, directory, callback) => {
  const imagePath = path.join(__dirname, 'images', directory, fileName);

  const parts = base64Data.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const data = parts[1];


  // Convertissez la chaîne base64 en données binaires
  const buffer = Buffer.from(data, 'base64');

  // Enregistrez les données binaires dans un fichier
  try {
    // Enregistrez les données binaires dans un fichier
    fs.writeFileSync(imagePath, buffer);
    callback(null);
  } catch (err) {
    console.error('Error writing file:', err);
    callback(err);
  }
};


app.post('/deleteImage', (req, res) => {
  console.log('deleteImage called');
  if (!req.body) {
    console.log('No body in the request');
    return res.status(400).send('Aucune image n\'a été téléchargée.');
  }
  let ImageFolder = '';
  const id_photo = req.body.params.id_photo;
  const type_photo = req.body.params.type_photo;
  const imageName = req.body.params.imageName;

  console.log(`id_photo: ${id_photo}, type_photo: ${type_photo}, imageName: ${imageName}`);

  if (type_photo === 'portfolio_image') {
    ImageFolder = 'photo_portfolio';
  
  } else if (type_photo === 'page_image') {
    ImageFolder = 'photo_page';
  };

  console.log(`ImageFolder: ${ImageFolder}`);

  const SQL = `DELETE FROM ${ImageFolder} WHERE id_photo = ?`;
  const Values = [id_photo];

  db.query(SQL, Values, (err, results) => {
    if (err) {
        console.log('Error in db query', err);
        return res.status(500).send({ error: err });
    }
    console.log('Image deleted from database');
    const imagePath = path.join(__dirname,'images', type_photo, imageName);
    console.log(`imagePath: ${imagePath}`);
    fs.unlink(imagePath, (err) => {
      if (err) {
        console.log('Error in fs.unlink', err);
        return res.status(500).send({ error: err });
      }
      console.log('Image file deleted');
      res.status(200).send('Image supprimée avec succès');
    });
  });
});

app.post('/orderPortfolio' , (req, res) => {
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

  


