import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import Avatar from '@mui/material/Avatar';
import Axios from '../../../../service/AxiosConfig';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';
import { DefaultButton } from '../../../../Theme/element';
import { useSnackbar } from '../../../../Theme/snackbar';
import config from '../../../../config';

const AccountGeneral = () => {
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const apiUrl = config.apiUrl;
  const token = Cookies.get('token');
  const fileInputRef = useRef(null);

  const [user, setUser] = useState({ email: '', username: '', imageUrl: '' });
  const [draft, setDraft] = useState({ first_name: '', last_name: '', username: '' });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await Axios.get(`${apiUrl}/getUserInfoBasic`, { headers: { 'Authorization': `Bearer ${token}` } });
        const payload = jwtDecode(res.data);
        const u = payload?.user?.[0];
        const img = payload?.image?.[0]?.src_profile_image;
        if (mounted && u) {
          setUser({ email: u.email || '', username: u.username || '', imageUrl: img ? `${apiUrl}/media/profile/${img}` : '' });
          setDraft({ first_name: u.first_name || '', last_name: u.last_name || '', username: u.username || '' });
        }
      } catch (e) {
        console.error('getUserInfoBasic failed:', e);
      }
    })();
    return () => { mounted = false; };
  }, [apiUrl, token]);

  const onPickImage = () => fileInputRef.current?.click();
  const onFileChange = async (file) => {
    if (!file) return;
    
    console.log('🔄 Début upload image:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });

    // Sauvegarder l'URL précédente pour la restaurer en cas d'erreur
    const previousImageUrl = user.imageUrl;
    
    try {
      const localUrl = URL.createObjectURL(file);
      setUser(prev => ({ ...prev, imageUrl: localUrl }));
      
      const form = new FormData();
      form.append('image', file);
      
      console.log('📤 Envoi de la requête d\'upload...');
      const response = await Axios.post(`${apiUrl}/uploadProfileImage`, form, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      
      console.log('📥 Réponse serveur:', response.data);
      
      // Gérer les deux formats de réponse : JSON {success: true} ou string de succès
      const isSuccess = 
        (response.data && response.data.success) || 
        (typeof response.data === 'string' && response.data.includes('succès'));
      
      if (isSuccess) {
        showSnackbar('success', 'Photo de profil mise à jour avec succès');
        // Nettoyer l'URL temporaire
        URL.revokeObjectURL(localUrl);
      } else {
        console.error('❌ Réponse serveur invalide:', response.data);
        throw new Error(response.data?.error || 'Réponse serveur invalide');
      }
    } catch (e) {
      console.error('❌ Erreur upload image:', e);
      console.error('❌ Détails erreur:', {
        message: e.message,
        response: e.response?.data,
        status: e.response?.status,
        statusText: e.response?.statusText
      });
      
      const errorMessage = e.response?.data?.error || e.message || 'Échec de la mise à jour de la photo';
      showSnackbar('error', errorMessage);
      
      // Restaurer l'image précédente
      setUser(prev => ({ ...prev, imageUrl: previousImageUrl }));
    }
  };

  const saveProfile = async () => {
    try {
      // Utiliser la nouvelle route pour mettre à jour tous les champs en une fois
      const updateData = {};
      
      if (draft.first_name !== undefined) updateData.first_name = draft.first_name;
      if (draft.last_name !== undefined) updateData.last_name = draft.last_name;
      if (draft.username && draft.username !== user.username) updateData.username = draft.username;

      if (Object.keys(updateData).length > 0) {
        const response = await Axios.post(`${apiUrl}/update-profile`, updateData, { 
          headers: { 'Authorization': `Bearer ${token}` } 
        });
        
        if (response.data.success) {
          // Mettre à jour l'état local avec les nouvelles données
          setUser(prev => ({ 
            ...prev, 
            username: updateData.username || prev.username 
          }));
          showSnackbar('success', 'Profil enregistré avec succès');
        } else {
          throw new Error(response.data.error || 'Erreur inconnue');
        }
      } else {
        showSnackbar('info', 'Aucune modification à enregistrer');
      }
    } catch (e) {
      console.error('saveProfile failed:', e);
      const errorMessage = e.response?.data?.error || e.message || "Échec de l'enregistrement";
      showSnackbar('error', errorMessage);
    }
  };

  return (
    <div className='profile-form'>
      
      <div className='profile-form-row' style={{ backgroundColor: theme.palette.primary.main, boxShadow: theme.palette.shadow.main }}>
        <h3 className='titlePage'>Informations générales</h3>
        <div className='line-sidebar'/> 
        <h4 className='account-setting-title'>Avatar</h4>
        <div className='profile-avatar'>
          {user.imageUrl ? (
            <img src={user.imageUrl} alt='avatar' className='profile_photo account_photo' />
          ) : (
            <Avatar className='profile_photo account_photo' />
          )}
          <input type='file' ref={fileInputRef} style={{ display: 'none' }} onChange={(e) => onFileChange(e.target.files[0])} />
          <div className='profile-avatar-info'>
            <DefaultButton onClick={onPickImage}>Modifier l'avatar</DefaultButton>
            <p className='account-settings-subtitle'>
                Importer une image de profile
            </p>
          </div>
          
        </div>
        <div className='line-sidebar'/>
        <h4 className='account-setting-title'>Informations générales</h4>
        <div className='profile-fields'>
          <div className='input-container'>
            <p className='blogField_name collection_edit_name'>Nom</p>
            <input className='input_text_blog' type='text' value={draft.first_name} onChange={(e) => setDraft(prev => ({ ...prev, first_name: e.target.value }))} />
          </div>
          <div className='input-container'>
            <p className='blogField_name collection_edit_name'>Prénom</p>
            <input className='input_text_blog' type='text' value={draft.last_name} onChange={(e) => setDraft(prev => ({ ...prev, last_name: e.target.value }))} />
          </div>
          <div className='input-container'>
            <p className='blogField_name collection_edit_name'>Nom d'utilisateur</p>
            <input className='input_text_blog' type='text' value={draft.username} onChange={(e) => setDraft(prev => ({ ...prev, username: e.target.value }))} />
          </div>
          <div className='profile-actions'>
            <DefaultButton onClick={saveProfile}>Enregistrer</DefaultButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountGeneral;
