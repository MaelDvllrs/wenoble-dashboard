const express = require('express');
const cors = require('cors');
const db = require('../db');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { createObjectCsvWriter } = require('csv-writer');
const path = require('path');
const fs = require('fs');

require('dotenv').config();
const secretKey = process.env.SECRET_KEY; 

router.use(cors());
router.use(express.json());


router.get('/getNewsletter', async (req, res) => {
    const iduser = req.user.idUser
    const SQL = 'SELECT id_newsletter, mail, date FROM newsletter_website WHERE id_user = ? ORDER BY date DESC'
    const Values = [iduser]

    db.query(SQL, Values, (err, results)=>{
        if (err) {
            res.send({ error: err })
            return;
        }

        const mail = results
        const messageCrypt = jwt.sign({ mail: mail }, secretKey)
        res.send(messageCrypt)

    })
});

router.get('/exportNewsletter', async (req, res) => {
    const iduser = req.user.idUser
    const SQL = 'SELECT mail, date FROM newsletter_website WHERE id_user = ?'
    const Values = [iduser]

    db.query(SQL, Values, (err, results) => {
        if (err) {
          return res.status(500).json({ error: 'Erreur lors de la récupération des newsletters' });
        }
    
        if (results.length === 0) {
          return res.status(404).json({ error: 'Aucune newsletter trouvée' });
        }
    
        const csvWriter = createObjectCsvWriter({
          path: path.join(__dirname, `newsletters-website-#${iduser}.csv`),
          header: [
            { id: 'date', title: 'Date' },
            { id: 'mail', title: 'Email' },
          ],
        });
    
        csvWriter.writeRecords(results)
          .then(() => {
            res.download(path.join(__dirname, `newsletters-website-#${iduser}.csv`), `newsletters-website-#${iduser}.csv`, (err) => {
              if (err) {
                return res.status(500).json({ error: 'Erreur lors du téléchargement du fichier' });
              }
    
              // Supprimer le fichier après téléchargement
              fs.unlinkSync(path.join(__dirname, `newsletters-website-#${iduser}.csv`));
            });
          })
          .catch((error) => {
            res.status(500).json({ error: 'Erreur lors de la création du fichier CSV' });
          });
      });
});

router.delete('/deleteNewsletter', async (req, res) => {

    const idNewsletter = req.body.id_newsletter
    const idUser =  req.user.idUser
    const SQL = 'DELETE FROM newsletter_website WHERE id_user = ? AND id_newsletter = ?'
    const Values = [idUser, idNewsletter]

    db.query(SQL, Values, (err, results)=>{
        if (err) {
            res.send({ error: err })
            return;
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Newsletter non trouvée ou utilisateur non autorisé' });
        }
        res.status(200).json({ message: 'Suppression réussie' });
    })
})

module.exports = router;