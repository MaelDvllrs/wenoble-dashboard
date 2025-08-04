const express = require('express');
const cors = require('cors');
const { supabaseServer } = require('../supabase');
const { authenticateToken } = require('../middleware/authToken');
const { checkUserWebsiteAccess } = require('../website/website');

const router = express.Router();
const jwt = require('jsonwebtoken');

require('dotenv').config();
const secretKey = process.env.SECRET_KEY; 

router.use(cors());
router.use(express.json());


router.get('/getMessage',authenticateToken, async (req, res) => {
    const userId = req.user.idUser;
    const websiteId = req.query.websiteId;
    const token = req.headers.authorization?.split(' ')[1];
    const supabase = supabaseServer(token);

    if (!websiteId) {
        return res.status(400).json({ error: 'Website ID requis' });
    }

    try {
        // Vérifier l'accès de l'utilisateur au site web
        const { hasAccess } = await checkUserWebsiteAccess(supabase, userId, websiteId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Accès refusé au site web' });
        }

        const { data, error } = await supabase
            .from('contact_website')
            .select('id_message, mail_sender, subject, date')
            .eq('website_id', websiteId)
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
    const userId = req.user.idUser;
    const websiteId = req.query.websiteId;

    const token = req.headers.authorization?.split(' ')[1];
    const supabase = supabaseServer(token);

    if (!websiteId) {
        return res.status(400).json({ error: 'Website ID requis' });
    }

    try {
        // Vérifier l'accès de l'utilisateur au site web
        const { hasAccess } = await checkUserWebsiteAccess(supabase, userId, websiteId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Accès refusé au site web' });
        }

        const { data, error } = await supabase
            .from('contact_website')
            .select('mail_sender, subject, html, date')
            .eq('id_message', idMessage)
            .eq('website_id', websiteId)
            .maybeSingle();
        if (error) throw error;
        const messageCrypt = jwt.sign({ message: data ? [data] : [] }, secretKey);
        res.send(messageCrypt);
    } catch (err) {
        res.send({ error: err.message });
    }
});


router.delete('/deleteMessage', authenticateToken, async (req, res) => {
    let idMessage = req.query.idMessage;
    const userId = req.user.idUser;
    const websiteId = req.query.websiteId;
    const token = req.headers.authorization?.split(' ')[1];
    const supabase = supabaseServer(token);

    if (!websiteId) {
        return res.status(400).json({ error: 'Website ID requis' });
    }

    // Supporte la suppression multiple : idMessage = "1,2,3"
    const ids = idMessage ? idMessage.split(',').map(id => id.trim()).filter(Boolean) : [];
    if (ids.length === 0) {
        return res.status(400).send({ error: 'Aucun idMessage fourni.' });
    }

    try {
        // Vérifier l'accès de l'utilisateur au site web
        const { hasAccess } = await checkUserWebsiteAccess(supabase, userId, websiteId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Accès refusé au site web' });
        }

        const { data, error } = await supabase
            .from('contact_website')
            .delete()
            .in('id_message', ids)
            .eq('website_id', websiteId);
        if (error) throw error;
        res.send({ message: 'Messages deleted successfully' });
    } catch (err) {
        console.error('Error deleting message(s):', err);
        res.send({ error: err.message });
    }
});

module.exports = router;
