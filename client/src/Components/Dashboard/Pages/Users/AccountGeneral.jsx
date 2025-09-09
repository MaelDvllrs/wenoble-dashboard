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
    try {
      const localUrl = URL.createObjectURL(file);
      setUser(prev => ({ ...prev, imageUrl: localUrl }));
      const form = new FormData();
      form.append('image', file);
      form.append('username', draft.username || user.username);
      await Axios.post(`${apiUrl}/uploadProfileImage`, form, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      showSnackbar('success', 'Photo de profil mise à jour');
    } catch (e) {
      console.error('uploadProfileImage failed:', e);
      showSnackbar('error', 'Échec de la mise à jour de la photo');
    }
  };

  const saveProfile = async () => {
    try {
      if (draft.username && draft.username !== user.username) {
        await Axios.post(`${apiUrl}/users/update-username`, { username: draft.username }, { headers: { 'Authorization': `Bearer ${token}` } });
      }
      // Optional: API calls for first_name/last_name if backend exists
      showSnackbar('success', 'Profil enregistré');
    } catch (e) {
      console.error('saveProfile failed:', e);
      showSnackbar('error', "Échec de l'enregistrement");
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
