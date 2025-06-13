const express = require('express');
const cors = require('cors');
const { supabaseServer } = require('../supabase');
const { authenticateToken } = require('../middleware/authToken');

const router = express.Router();
const jwt = require('jsonwebtoken');

require('dotenv').config();
const secretKey = process.env.SECRET_KEY; 

router.use(cors());
router.use(express.json());


router.get('/getMessage',authenticateToken, async (req, res) => {
    const iduser = req.user.idUser;
    const token = req.headers.authorization?.split(' ')[1];
    const supabase = supabaseServer(token);
    try {
        const { data, error } = await supabase
            .from('contact_website')
            .select('id_message, mail_sender, subject, date')
            .eq('user_id', iduser)
            .order('date', { ascending: false });
        if (error) throw error;
        const messageCrypt = jwt.sign({ message: data }, secretKey);
        res.send(messageCrypt);
    } catch (err) {
        res.send({ error: err.message });
    }
});

router.get('/getMessageDetail',authenticateToken, async (req, res) => {
    const idMessage = req.query.idMessage;
    const idUser = req.user.idUser;

    const token = req.headers.authorization?.split(' ')[1];
    const supabase = supabaseServer(token);
    try {
        const { data, error } = await supabase
            .from('contact_website')
            .select('mail_sender, subject, html, date')
            .eq('id_message', idMessage)
            .eq('user_id', idUser)
            .maybeSingle();
        if (error) throw error;
        const messageCrypt = jwt.sign({ message: data ? [data] : [] }, secretKey);
        res.send(messageCrypt);
    } catch (err) {
        res.send({ error: err.message });
    }
});

module.exports = router;
