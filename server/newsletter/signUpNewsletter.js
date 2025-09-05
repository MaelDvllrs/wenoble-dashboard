const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const router = express.Router();

// Une seule instance Supabase avec les bons droits

const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } }
);

const apiKeyMiddleware = async (req, res, next) => {


    const apiKey = req.body.apiKey;
    const mail = req.body.mail;
    
    if (!apiKey) {
        return res.status(401).json({ message: 'Clé API ou ID de data manquant.' });
    }
    
    try {
        // Vérification de la clé API
        const { data, error } = await supabase
            .from('users')
            .select('id')
            .eq('api_key', apiKey)
            .maybeSingle();
            
        if (error) {
            console.error('Erreur lors de la vérification de la clé API:', error);
            return res.status(500).json({ error: error.message });
        }
        
        if (data) {
            req.apiKey = apiKey;
            req.mail = mail;
            next();
        } else {
            console.log('Clé API invalide:', apiKey);
            return res.status(403).json({ message: 'Clé API invalide.' });
        }
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

router.post('/signUpNewsletter',apiKeyMiddleware, async (req, res) => {
    const apiKey = req.apiKey;
    const mail = req.mail;
    const dateSend = new Date();
    
    try {
        // Récupérer l'utilisateur par api_key
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('api_key', apiKey)
            .maybeSingle();
            
        if (userError || !userData) {
            console.error('Erreur lors de la récupération de l\'utilisateur:', userError);
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }
        
        const user_id = userData.id;
        
        // Vérifier si le mail existe déjà
        const { data: existing, error: existError } = await supabase
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
        const { error: insertError } = await supabase
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