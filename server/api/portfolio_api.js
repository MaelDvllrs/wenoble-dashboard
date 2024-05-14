const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const db = require('../db');


const apiKeyMiddleware = (req, res, next) => {
    const apiKey = req.headers['api_key'];
    const id_portfolio = req.headers['id_portfolio']

    console.log('authentification api');
    
    if (!apiKey || !id_portfolio) {
        return res.status(401).json({ message: 'Clé API ou ID de portfolio manquant.' });
    }

    const SQL = 'SELECT id_user FROM users WHERE cle_api = ?'

    const Values = [apiKey]

    db.query(SQL, Values, (err, results)=>{
        if(err){
            res.send({error: err})
        }
        if(results.length  > 0){
            req.id_portfolio = id_portfolio;
            next();
        }else{
            return res.status(403).json({ message: 'Clé API invalide.' });
        }
    })
};

router.use(apiKeyMiddleware);


// Endpoint pour envoyer une photo
router.get('/sendPhoto', (req, res) => {

    const id_portfolio = req.id_portfolio;

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

module.exports = router; 