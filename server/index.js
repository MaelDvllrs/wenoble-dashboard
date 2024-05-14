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
  
    // Lire le répertoire contenant les images
    fs.readdir(imageDirectory, (err, files) => {
      if (err) {
        console.error('Erreur lors de la lecture du répertoire d\'images :', err);
        return res.status(500).send('Une erreur s\'est produite lors de la récupération des images.');
      }
  
      // Filtrer les fichiers dont le nom commence par le préfixe spécifié
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
        }).filter(Boolean); // Filtre pour supprimer les éléments nuls s'il y a eu des erreurs lors de la lecture des images

        res.status(200).json(imagesData);
    });
});

app.post('/savePorfolioImages', (req, res) => {
  if (!req.body) {
    return res.status(400).send('Aucune image n\'a été téléchargée.');
  }

  const id_portfolio = req.body.params.fields.id_portfolio;
  const id_photo = req.body.params.fields.id_photo;
  const data = req.body.params.fields.data;
  const name = req.body.params.fields.name;
  const alt = req.body.params.fields.alt;

  const SQL = 'INSERT INTO '



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

  


