const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { supabaseServer } = require('../supabase');
const { authenticateToken } = require('../middleware/authToken');
const multer = require('multer');

require('dotenv').config();
const secretKey = process.env.SECRET_KEY;

const router = express.Router();

router.use(cors());
router.use(express.json());

// Configuration multer pour les images de profil (stockage en mémoire pour Supabase Storage)
const upload = multer({ 
  storage: multer.memoryStorage(), // Stockage en mémoire pour upload vers Supabase
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

// ===========================
// ROUTES DE CONSULTATION
// ===========================

// Récupérer les informations de base de l'utilisateur (format chiffré JWT)
router.get('/getUserInfoBasic', authenticateToken, async (req, res) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    const userId = req.user.idUser;
    const supabase = supabaseServer(token);
    
    // 1. Récupérer les informations de base de l'utilisateur depuis auth.users
    const { data: authUser, error: authError } = await supabase.auth.getUser(token);
    
    if (authError) throw authError;

    // 2. Récupérer les informations complémentaires depuis public.users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('username, first_name, last_name')
      .eq('id', userId)
      .single();
    
    if (userError) throw userError;
    
    // 3. Récupérer l'image de profil
    const { data: imageData, error: imageError } = await supabase
      .from('profile_images')
      .select('src_profile_image')
      .eq('user_id', userId)
      .maybeSingle();
    
    // Combiner toutes les informations
    const user = [{
      email: authUser.user.email,
      username: userData.username,
      first_name: userData.first_name || '',
      last_name: userData.last_name || '',
      id_user: userId,
    }];
    
    const image = imageData ? [{ src_profile_image: imageData.src_profile_image }] : [];
    
    // Chiffrer la réponse avec JWT
    const userCrypt = jwt.sign({
      user: user,
      image: image
    }, secretKey);
    
    res.send(userCrypt);
  } catch (error) {
    console.error('Erreur lors de la récupération des infos utilisateur:', error);
    res.status(500).json({ error: error.message });
  }
});

// Note: Les images de profil sont maintenant stockées dans Supabase Storage (bucket: profile-image)
// et sont accessibles directement via leur URL publique retournée par getUserInfoBasic et /profile

// ===========================
// ROUTES DE MODIFICATION
// ===========================

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

// Route pour upload d'image de profil vers Supabase Storage
router.post('/uploadProfileImage', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const userId = req.user.idUser;
    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);

    if (!req.file) {
      return res.status(400).json({ error: 'Aucune image n\'a été téléchargée' });
    }

    console.log('Upload image profil pour user:', userId, 'type:', req.file.mimetype);

    // Supprimer l'ancienne image s'il y en a une
    const { data: oldImage } = await supabase
      .from('profile_images')
      .select('src_profile_image')
      .eq('user_id', userId)
      .maybeSingle();

    if (oldImage?.src_profile_image) {
      // Le nom du fichier est déjà stocké directement (pas d'URL)
      const oldFileName = oldImage.src_profile_image;
      console.log('Suppression ancienne image:', oldFileName);
      
      const { error: deleteError } = await supabase.storage
        .from('profile-image')
        .remove([oldFileName]);
      
      if (deleteError) {
        console.warn('Erreur suppression ancienne image (non bloquant):', deleteError);
      }
    }

    // Générer un nom de fichier unique
    const fileExtension = req.file.originalname.split('.').pop();
    const fileName = `${userId}_${Date.now()}.${fileExtension}`;

    console.log('Upload vers Supabase Storage:', fileName);

    // Upload vers Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('profile-image')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (uploadError) {
      console.error('Erreur upload Supabase Storage:', uploadError);
      return res.status(500).json({ 
        success: false,
        error: 'Erreur lors de l\'upload de l\'image: ' + uploadError.message 
      });
    }

    console.log('Image uploadée avec succès:', uploadData);

    // Vérifier si l'utilisateur a déjà une image de profil
    const { data: existingImage } = await supabase
      .from('profile_images')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    let dbData, dbError;
    
    if (existingImage) {
      // Mettre à jour l'enregistrement existant
      const result = await supabase
        .from('profile_images')
        .update({
          src_profile_image: fileName, // Stocker uniquement le nom du fichier
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select();
      
      dbData = result.data;
      dbError = result.error;
    } else {
      // Créer un nouvel enregistrement
      const result = await supabase
        .from('profile_images')
        .insert({
          user_id: userId,
          src_profile_image: fileName, // Stocker uniquement le nom du fichier
          updated_at: new Date().toISOString()
        })
        .select();
      
      dbData = result.data;
      dbError = result.error;
    }

    if (dbError) {
      console.error('Erreur enregistrement en base:', dbError);
      // Tenter de supprimer le fichier uploadé
      await supabase.storage.from('profile-image').remove([fileName]);
      
      return res.status(500).json({ 
        success: false,
        error: 'Erreur lors de l\'enregistrement de l\'image: ' + dbError.message 
      });
    }

    console.log('Image profil enregistrée avec succès:', dbData);
    res.json({ 
      success: true, 
      message: 'Image de profil mise à jour avec succès',
      filename: fileName // Retourner le nom du fichier au lieu de l'URL
    });

  } catch (error) {
    console.error('Erreur serveur upload image:', error);
    console.error('Stack trace:', error.stack);
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