const express = require('express');
const { supabaseServer } = require('../supabase');
const router = express.Router();



const apiKeyMiddleware = async (req, res, next) => {
    const apiKey = req.body.apiKey;
    const mail = req.body.mail;
    if (!apiKey) {
        return res.status(401).json({ message: 'Clé API ou ID de data manquant.' });
    }
    // Supabase : vérification de la clé API
    const { data, error } = await supabaseServer
        .from('users')
        .select('id')
        .eq('api_key', apiKey)
        .maybeSingle();
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    if (data) {
        req.apiKey = apiKey;
        req.mail = mail;
        next();
    } else {
        return res.status(403).json({ message: 'Clé API invalide.' });
    }
};

router.post('/signUpNewsletter', apiKeyMiddleware, async (req, res) => {
    const apiKey = req.apiKey;
    const mail = req.mail;
    const dateSend = new Date();
    try {
        // Récupérer l'utilisateur par api_key
        const { data: userData, error: userError } = await supabaseServer
            .from('users')
            .select('id')
            .eq('api_key', apiKey)
            .maybeSingle();
        if (userError || !userData) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }
        const user_id = userData.id;
        // Vérifier si le mail existe déjà
        const { data: existing, error: existError } = await supabaseServer
            .from('newsletter_website')
            .select('id_newsletter')
            .eq('mail', mail)
            .eq('user_id', user_id);
        if (existError) {
            return res.status(500).json({ error: existError.message });
        }
        if (existing && existing.length > 0) {
            return res.status(409).json({ message: 'mail déjà enregistré.' });
        }
        // Insérer le mail
        const { error: insertError } = await supabaseServer
            .from('newsletter_website')
            .insert({ user_id, mail, date: dateSend });
        if (insertError) {
            return res.status(500).json({ error: insertError.message });
        }
        res.status(200).json({ message: 'mail enregistré' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


module.exports = router;
