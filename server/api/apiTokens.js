const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { supabaseServer } = require('../supabase');
const { authenticateToken } = require('../middleware/authToken');
const { checkUserWebsiteAccess } = require('../website/website');

const router = express.Router();

router.use(cors());
router.use(express.json());

require('dotenv').config();
const secretKey = process.env.SECRET_KEY;

// Créer un nouveau token API
router.post('/createAPIToken', authenticateToken, async (req, res) => {
  try {
    const { websiteId, tokenName, permissions = ['cms'] } = req.body;
    const userId = req.user.idUser;
    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);

    if (!websiteId || !tokenName) {
      return res.status(400).json({ 
        error: 'websiteId et tokenName sont requis' 
      });
    }

    // Vérifier les droits d'accès au site
    const { hasAccess } = await checkUserWebsiteAccess(supabase, userId, websiteId);
    if (!hasAccess) {
      return res.status(403).json({ 
        error: 'Vous n\'avez pas les droits pour créer des tokens API sur ce site' 
      });
    }

    // Générer un token API unique
    const tokenId = uuidv4();
    const apiToken = jwt.sign(
      { 
        tokenId,
        userId,
        websiteId,
        type: 'api_token',
        permissions,
        iat: Math.floor(Date.now() / 1000)
      }, 
      secretKey,
      { expiresIn: '10y' } // Token valide 10 ans
    );

    // Stocker les informations du token en base
    const { data: tokenData, error: insertError } = await supabase
      .from('api_tokens')
      .insert({
        id: tokenId,
        website_id: websiteId,
        created_by: userId,
        token_name: tokenName,
        permissions: JSON.stringify(permissions),
        token_hash: apiToken.substring(0, 32), // Stocker seulement le début pour identification
        created_at: new Date().toISOString(),
        last_used_at: null,
        is_active: true
      })
      .select()
      .single();

    if (insertError) throw insertError;

    res.status(201).json({
      success: true,
      message: 'Token API créé avec succès',
      token: {
        id: tokenData.id,
        name: tokenData.token_name,
        permissions: JSON.parse(tokenData.permissions),
        created_at: tokenData.created_at,
        apiToken: apiToken // Retourner le token complet seulement à la création
      }
    });

  } catch (error) {
    console.error('Erreur lors de la création du token API:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors de la création du token API',
      details: error.message 
    });
  }
});

// Récupérer les tokens API d'un site
router.get('/getAPITokens', authenticateToken, async (req, res) => {
  try {
    const { websiteId } = req.query;
    const userId = req.user.idUser;
    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);

    if (!websiteId) {
      return res.status(400).json({ 
        error: 'websiteId est requis' 
      });
    }

    // Vérifier les droits d'accès au site
    const { hasAccess } = await checkUserWebsiteAccess(supabase, userId, websiteId);
    if (!hasAccess) {
      return res.status(403).json({ 
        error: 'Vous n\'avez pas les droits pour voir les tokens API de ce site' 
      });
    }

    // Récupérer les tokens avec les informations du créateur
    const { data: tokens, error: selectError } = await supabase
      .from('api_tokens')
      .select(`
        id,
        token_name,
        permissions,
        created_at,
        last_used_at,
        is_active,
        created_by,
        creator:created_by(username)
      `)
      .eq('website_id', websiteId)
      .order('created_at', { ascending: false });

    if (selectError) throw selectError;

    // Formater les données pour le front
    const formattedTokens = tokens.map(token => ({
      id: token.id,
      name: token.token_name,
      permissions: JSON.parse(token.permissions || '[]'),
      created_at: token.created_at,
      last_used_at: token.last_used_at,
      is_active: token.is_active,
      created_by: token.creator?.username || 'Utilisateur inconnu'
    }));

    res.status(200).json({
      success: true,
      tokens: formattedTokens
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des tokens API:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors de la récupération des tokens API',
      details: error.message 
    });
  }
});

// Supprimer un token API
router.delete('/deleteAPIToken', authenticateToken, async (req, res) => {
  try {
    const { tokenId, websiteId } = req.body;
    const userId = req.user.idUser;
    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);

    if (!tokenId || !websiteId) {
      return res.status(400).json({ 
        error: 'tokenId et websiteId sont requis' 
      });
    }

    // Vérifier les droits d'accès au site
    const { hasAccess } = await checkUserWebsiteAccess(supabase, userId, websiteId);
    if (!hasAccess) {
      return res.status(403).json({ 
        error: 'Vous n\'avez pas les droits pour supprimer des tokens API sur ce site' 
      });
    }

    // Supprimer le token
    const { error: deleteError } = await supabase
      .from('api_tokens')
      .delete()
      .eq('id', tokenId)
      .eq('website_id', websiteId);

    if (deleteError) throw deleteError;

    res.status(200).json({
      success: true,
      message: 'Token API supprimé avec succès'
    });

  } catch (error) {
    console.error('Erreur lors de la suppression du token API:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors de la suppression du token API',
      details: error.message 
    });
  }
});

// Désactiver/réactiver un token API
router.put('/toggleAPIToken', authenticateToken, async (req, res) => {
  try {
    const { tokenId, websiteId, isActive } = req.body;
    const userId = req.user.idUser;
    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);

    if (!tokenId || !websiteId || typeof isActive !== 'boolean') {
      return res.status(400).json({ 
        error: 'tokenId, websiteId et isActive sont requis' 
      });
    }

    // Vérifier les droits d'accès au site
    const { hasAccess } = await checkUserWebsiteAccess(supabase, userId, websiteId);
    if (!hasAccess) {
      return res.status(403).json({ 
        error: 'Vous n\'avez pas les droits pour modifier des tokens API sur ce site' 
      });
    }

    // Mettre à jour le statut du token
    const { error: updateError } = await supabase
      .from('api_tokens')
      .update({ is_active: isActive })
      .eq('id', tokenId)
      .eq('website_id', websiteId);

    if (updateError) throw updateError;

    res.status(200).json({
      success: true,
      message: `Token API ${isActive ? 'activé' : 'désactivé'} avec succès`
    });

  } catch (error) {
    console.error('Erreur lors de la modification du token API:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors de la modification du token API',
      details: error.message 
    });
  }
});

module.exports = router;