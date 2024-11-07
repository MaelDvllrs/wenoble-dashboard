const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db'); 
const cors = require('cors')



require('dotenv').config();
const secretKey = process.env.SECRET_KEY; 

const router = express.Router();

router.use(cors())
router.use(express.json());

router.post('/getAuthorisation', (req, res) => {
    const token = req.body.token;
    const type = req.body.type;

    

    try {
        const decoded = jwt.verify(token, secretKey);
        const user = decoded.idUser;

        const SQL = `SELECT ${type} FROM users_authorisation WHERE id_user = ?`;

        db.query(SQL, user, (err, result)=>{
            if(err){
                res.send({error: err})
            }
            const authorisation = result[0][type];
            return res.status(200).json({ success: true, authorisation: authorisation });
        });
    } catch (error) {
        res.json({ success: false });
    }
});

module.exports = router;

