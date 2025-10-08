const express = require('express');
const { supabaseServer } = require('../supabase');
const { authenticateToken } = require('../middleware/authToken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Configuration multer pour les images de profil
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '..', 'images', 'profile_image');
    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Utiliser l'ID utilisateur comme nom de fichier
    const userId = req.user.idUser;
    const extension = path.extname(file.originalname);
    cb(null, `profile_${userId}${extension}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  },
  fileFilter: function (req, file, cb) {
    // Vérifier que c'est une image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Seules les images sont autorisées'), false);
    }
  }
});

// Route pour mettre à jour les informations de profil utilisateur
router.post('/update-profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.idUser;
    const { first_name, last_name, username } = req.body;
    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);

    console.log('Mise à jour profil pour user:', userId, { first_name, last_name, username });

    // Préparer les données à mettre à jour
    const updateData = {};
    if (first_name !== undefined) updateData.first_name = first_name;
    if (last_name !== undefined) updateData.last_name = last_name;
    if (username !== undefined) updateData.username = username;

    // Vérifier qu'il y a au moins un champ à mettre à jour
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
    }

    // Vérifier que le username n'est pas déjà pris (si on le modifie)
    if (username) {
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .neq('id', userId)
        .single();

      if (existingUser) {
        console.error('Username déjà pris:', username);
        return res.status(409).json({ error: 'Ce nom d\'utilisateur est déjà pris' });
      }
    }

    // Mettre à jour les informations
    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select();

    if (error) {
      console.error('Erreur mise à jour profil:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('Profil mis à jour avec succès:', data);
    res.json({ success: true, message: 'Profil mis à jour avec succès', data: data[0] });

  } catch (error) {
    console.error('Erreur serveur mise à jour profil:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la mise à jour du profil' });
  }
});

// Route pour mettre à jour spécifiquement le nom d'utilisateur (compatibilité avec l'ancien code)
router.post('/update-username', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.idUser;
    const { username } = req.body;
    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);

    if (!username) {
      return res.status(400).json({ error: 'Le nom d\'utilisateur est requis' });
    }

    // Vérifier que le username n'est pas déjà pris
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .neq('id', userId)
      .single();

    if (existingUser) {
      return res.status(409).json({ error: 'Ce nom d\'utilisateur est déjà pris' });
    }

    // Mettre à jour le username
    const { data, error } = await supabase
      .from('users')
      .update({ username })
      .eq('id', userId)
      .select();

    if (error) {
      console.error('Erreur mise à jour username:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, message: 'Nom d\'utilisateur mis à jour avec succès' });

  } catch (error) {
    console.error('Erreur serveur mise à jour username:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la mise à jour du nom d\'utilisateur' });
  }
});

// Route pour upload d'image de profil
router.post('/uploadProfileImage', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const userId = req.user.idUser;
    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);

    if (!req.file) {
      return res.status(400).json({ error: 'Aucune image n\'a été téléchargée' });
    }

    console.log('Upload image profil pour user:', userId, 'fichier:', req.file.filename);

    // Enregistrer ou mettre à jour l'information dans la base de données
    console.log('Tentative d\'enregistrement en base:', {
      user_id: userId,
      src_profile_image: req.file.filename
    });

    const { data, error } = await supabase
      .from('profile_images')
      .upsert({
        user_id: userId,
        src_profile_image: req.file.filename,
        updated_at: new Date().toISOString()
      })
      .select();

    if (error) {
      console.error('Erreur enregistrement image profil:', error);
      // Supprimer le fichier en cas d'erreur DB
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Erreur suppression fichier:', unlinkError);
      }
      return res.status(500).json({ 
        success: false,
        error: 'Erreur lors de l\'enregistrement de l\'image: ' + error.message 
      });
    }

    console.log('Image profil enregistrée avec succès:', data);
    res.json({ 
      success: true, 
      message: 'Image de profil mise à jour avec succès',
      filename: req.file.filename 
    });

  } catch (error) {
    console.error('Erreur serveur upload image:', error);
    console.error('Stack trace:', error.stack);
    // Supprimer le fichier en cas d'erreur
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
        console.log('Fichier supprimé après erreur:', req.file.path);
      } catch (unlinkError) {
        console.error('Erreur suppression fichier:', unlinkError);
      }
    }
    res.status(500).json({ 
      success: false,
      error: `Erreur serveur lors de l'upload de l'image: ${error.message}` 
    });
  }
});

// Route pour récupérer les informations de profil étendues
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.idUser;
    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);

    // Récupérer les informations utilisateur
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, username, first_name, last_name, website, is_admin')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Erreur récupération profil:', userError);
      return res.status(500).json({ error: userError.message });
    }

    // Récupérer l'image de profil
    const { data: imageData } = await supabase
      .from('profile_images')
      .select('src_profile_image')
      .eq('user_id', userId)
      .single();

    const profile = {
      ...userData,
      profile_image: imageData?.src_profile_image || null
    };

    res.json({ success: true, profile });

  } catch (error) {
    console.error('Erreur serveur récupération profil:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération du profil' });
  }
});

module.exports = router;