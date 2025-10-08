import config from '../config';

/**
 * Génère l'URL publique d'une image de profil depuis Supabase Storage
 * @param {string} filename - Le nom du fichier (ex: "550e8400_1704736800000.jpg")
 * @returns {string|null} - L'URL publique ou null si pas de fichier
 */
export const getProfileImageUrl = (filename) => {
  if (!filename) return null;
  
  // Si c'est déjà une URL complète (ancienne version), la retourner telle quelle
  if (filename.startsWith('http://') || filename.startsWith('https://')) {
    return filename;
  }
  
  // Générer l'URL publique en utilisant l'URL du bucket depuis config
  return `${config.urlBucketProfileImage}${filename}`;
};

/**
 * Récupère l'URL d'une image de profil avec fallback vers une image par défaut
 * @param {string} filename - Le nom du fichier
 * @param {string} defaultImage - URL de l'image par défaut (optionnel)
 * @returns {string} - L'URL de l'image ou l'image par défaut
 */
export const getProfileImageUrlWithFallback = (filename, defaultImage = '/default-avatar.png') => {
  const url = getProfileImageUrl(filename);
  return url || defaultImage;
};

/**
 * Upload une image de profil
 * @param {File} file - Le fichier image à uploader
 * @param {string} token - Le token d'authentification
 * @returns {Promise<{success: boolean, filename?: string, error?: string}>}
 */
export const uploadProfileImage = async (file, token) => {
  const formData = new FormData();
  formData.append('image', file);
  
  try {
    const response = await fetch(`${config.apiUrl}/uploadProfileImage`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erreur upload image:', error);
    return { success: false, error: error.message };
  }
};
