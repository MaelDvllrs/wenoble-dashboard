import React, { useState, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import { DefaultButton } from '../../../../Theme/element';
import { useSnackbar } from '../../../../Theme/snackbar';
import { supabase } from '../../../../service/supabaseAuth';
import Axios from '../../../../service/AxiosConfig';
import Cookies from 'js-cookie';
import config from '../../../../config';

const AccountEmail = () => {
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const currentUser = data?.user;
      const current = currentUser?.email;
      const pending = currentUser?.new_email || currentUser?.user_metadata?.new_email || '';
      if (mounted) {
        if (current) setEmail(current);
        if (pending) setPendingEmail(pending);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const apiUrl = config.apiUrl;
  const token = Cookies.get('token');

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (!email || !/\S+@\S+\.\S+/.test(email)) {
        showSnackbar('error', 'Email invalide');
        return;
      }
      if (!currentPassword) {
        showSnackbar('error', 'Entrez votre mot de passe actuel');
        return;
      }
  const res = await Axios.post(`${apiUrl}/user/change-email`, {
        newEmail: email,
        currentPassword
      }, { headers: { 'Authorization': `Bearer ${token}` } });
  const p = res?.data?.pendingEmail;
  if (p) setPendingEmail(p);
  showSnackbar('success', `Un email de confirmation a été envoyé à ${email}`);
      setCurrentPassword('');
    } catch (e) {
      console.error('email change failed:', e);
      const msg = e?.message?.toLowerCase().includes('invalid login') ? 'Mot de passe incorrect' : 'Échec de la modification';
      showSnackbar('error', msg);
    }
  };

  return (
    <div className='email-form'>
      <div className='profile-form-row' style={{ backgroundColor: theme.palette.primary.main, boxShadow: theme.palette.shadow.main }}>
        <h3 className='titlePage'>Email & Notifications</h3>
        <div className='line-sidebar'/>
        <h4 className='account-setting-title'>Email</h4>
        <form onSubmit={submit} style={{ width: '100%' }}>
          <div className='input-container'>
            <p className='blogField_name collection_edit_name'>Nouvel email</p>
            <input className='input_text_blog' type='email' value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {pendingEmail && (
            <div className='input-container'>
              <p className='account-settings-subtitle'>En attente de confirmation: {pendingEmail}</p>
            </div>
          )}
          <div className='input-container'>
            <p className='blogField_name collection_edit_name'>Mot de passe actuel</p>
            <input className='input_text_blog' type='password' value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>
          <DefaultButton type='submit'>Enregistrer</DefaultButton>
        </form>
      </div>
    </div>
  );
};

export default AccountEmail;
