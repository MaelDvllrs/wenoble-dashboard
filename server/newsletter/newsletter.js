const express = require('express');
const cors = require('cors');
const { supabaseServer } = require('../supabase');
const { authenticateToken } = require('../middleware/authToken');
const { checkUserWebsiteAccess } = require('../website/website');

const router = express.Router();
const jwt = require('jsonwebtoken');
const { createObjectCsvWriter } = require('csv-writer');
const path = require('path');
const fs = require('fs');

require('dotenv').config();
const secretKey = process.env.SECRET_KEY; 

router.use(cors());
router.use(express.json());


router.get('/getNewsletter',authenticateToken, async (req, res) => {
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
            .from('newsletter_website')
            .select('id_newsletter, mail, date')
            .eq('website_id', websiteId)
            .order('date', { ascending: false });
        if (error) throw error;
        const messageCrypt = jwt.sign({ mail: data }, secretKey);
        res.send(messageCrypt);
    } catch (err) {
        res.send({ error: err.message });
    }
});

router.get('/exportNewsletter',authenticateToken, async (req, res) => {
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
            .from('newsletter_website')
            .select('mail, date')
            .eq('website_id', websiteId);
        if (error) throw error;
        if (!data || data.length === 0) {
            return res.status(404).json({ error: 'Aucune newsletter trouvée' });
        }
        const csvWriter = createObjectCsvWriter({
            path: path.join(__dirname, `newsletters-website-#${websiteId}.csv`),
            header: [
                { id: 'date', title: 'Date' },
                { id: 'mail', title: 'Email' },
            ],
        });
        await csvWriter.writeRecords(data);
        res.download(path.join(__dirname, `newsletters-website-#${websiteId}.csv`), `newsletters-website-#${websiteId}.csv`, (err) => {
            if (err) {
                return res.status(500).json({ error: 'Erreur lors du téléchargement du fichier' });
            }
            fs.unlinkSync(path.join(__dirname, `newsletters-website-#${websiteId}.csv`));
        });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la création ou du téléchargement du fichier CSV' });
    }
});

router.delete('/deleteNewsletter',authenticateToken, async (req, res) => {
    const idNewsletter = req.body.id_newsletter;
    const userId = req.user.idUser;
    const websiteId = req.body.websiteId;

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

        const { error, count } = await supabase
            .from('newsletter_website')
            .delete({ count: 'exact' })
            .eq('website_id', websiteId)
            .eq('id_newsletter', idNewsletter);
        if (error) throw error;
        if (!count) {
            return res.status(404).json({ error: 'Newsletter non trouvée ou utilisateur non autorisé' });
        }
        res.status(200).json({ message: 'Suppression réussie' });
    } catch (err) {
        res.send({ error: err.message });
    }
});

module.exports = router;