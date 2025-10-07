import React, { useState, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import { DefaultButton, SecondaryButton } from '../../../../Theme/element';
import { useSnackbar } from '../../../../Theme/snackbar';
import { supabase, changeEmail } from '../../../../service/supabaseAuth';
import { CircularProgress } from '@mui/material';
import Cookies from 'js-cookie';
import config from '../../../../config';
import '../website/website.css'; // Import pour les styles des modales

const AccountEmail = () => {
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const [currentEmail, setCurrentEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');  
  const [pendingEmail, setPendingEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadUserData = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const currentUser = data?.user;
        const current = currentUser?.email;
        const pending = currentUser?.new_email || currentUser?.user_metadata?.new_email || '';
        
        if (mounted) {
          if (current) {
            setCurrentEmail(current);
            setNewEmail(current); // Pré-remplir avec l'email actuel
          }
          if (pending) setPendingEmail(pending);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données utilisateur:', error);
        if (mounted) {
          showSnackbar('error', 'Erreur lors du chargement des informations');
        }
      }
    };
    
    loadUserData();
    return () => { mounted = false; };
  }, [showSnackbar]);

  const apiUrl = config.apiUrl;
  const token = Cookies.get('token');

  // Validation et affichage de la popup de confirmation
  const validateAndShowConfirmation = (e) => {
    e.preventDefault();
    
    if (!newEmail || !/\S+@\S+\.\S+/.test(newEmail)) {
      showSnackbar('error', 'Adresse email invalide');
      return;
    }
    
    if (newEmail === currentEmail) {
      showSnackbar('info', 'Cette adresse email est déjà la vôtre');
      return;
    }
    
    if (!currentPassword) {
      showSnackbar('error', 'Veuillez saisir votre mot de passe actuel pour confirmer');
      return;
    }
    
    // Afficher la popup de confirmation
    setShowConfirmDialog(true);
  };

  // Exécution du changement d'email
  const executeEmailChange = async () => {
    setLoading(true);
    
    try {
      console.log('Changement d\'email de', currentEmail, 'vers', newEmail);
      
      const result = await changeEmail(newEmail, currentPassword);
      console.log('Résultat changement email:', result);
      
      // Mettre à jour les états
      setPendingEmail(newEmail);
      setCurrentPassword('');
      setShowConfirmDialog(false);
      
      showSnackbar('success', `Un email de confirmation a été envoyé à ${newEmail}. Vérifiez votre boîte de réception pour confirmer le changement.`);
      
    } catch (error) {
      console.error('Erreur changement email:', error);
      setShowConfirmDialog(false);
      
      let errorMessage = 'Erreur lors du changement d\'email';
      
      if (error.message?.includes('incorrect')) {
        errorMessage = 'Mot de passe actuel incorrect';
      } else if (error.message?.includes('already')) {
        errorMessage = 'Cette adresse email est déjà utilisée';
      } else if (error.message?.includes('invalid')) {
        errorMessage = 'Adresse email invalide';
      }
      
      showSnackbar('error', errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  // Annuler le changement d'email
  const cancelEmailChange = () => {
    setShowConfirmDialog(false);
    showSnackbar('info', 'Changement d\'email annulé');
  };

  return (
    <div className='email-form'>
      <div className='profile-form-row' style={{ backgroundColor: theme.palette.primary.main, boxShadow: theme.palette.shadow.main }}>
        <h3 className='titlePage'>Email & Notifications</h3>
        <div className='line-sidebar'/>
        
        <h4 className='account-setting-title'>Adresse Email</h4>
        
        {/* Email actuel */}
        <div className='input-container'>
          <p className='blogField_name collection_edit_name'>Email actuel</p>
          <input 
            className='input_text_blog' 
            type='email' 
            value={currentEmail} 
            disabled 
            style={{ 
              backgroundColor: theme.palette.background.secondary + '40',
              color: theme.palette.text.secondary,
              cursor: 'not-allowed'
            }}
          />
        </div>

        {/* Email en attente de confirmation */}
        {pendingEmail && pendingEmail !== currentEmail && (
          <div className='input-container'>
            <p className='blogField_name collection_edit_name' style={{ color: theme.palette.warning.main }}>
              ⏳ En attente de confirmation
            </p>
            <input 
              className='input_text_blog' 
              type='email' 
              value={pendingEmail} 
              disabled 
              style={{ 
                backgroundColor: 'rgba(255, 193, 7, 0.1)',
                color: theme.palette.warning.main,
                border: `1px solid ${theme.palette.warning.main}`,
                cursor: 'not-allowed'
              }}
            />
            <p className='account-settings-subtitle' style={{ 
              color: theme.palette.warning.main, 
              fontSize: '0.85rem',
              marginTop: '0.5rem' 
            }}>
              Vérifiez votre boîte de réception et cliquez sur le lien de confirmation pour finaliser le changement.
            </p>
          </div>
        )}
        
        <form onSubmit={validateAndShowConfirmation} style={{ width: '100%' }}>
          <div className='input-container'>
            <p className='blogField_name collection_edit_name'>Nouvelle adresse email</p>
            <input 
              className='input_text_blog' 
              type='email' 
              value={newEmail} 
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Saisissez votre nouvelle adresse email"
              disabled={loading}
            />
          </div>
          
          <div className='input-container'>
            <p className='blogField_name collection_edit_name'>Mot de passe actuel (pour confirmation)</p>
            <input 
              className='input_text_blog' 
              type='password' 
              value={currentPassword} 
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Saisissez votre mot de passe actuel"
              disabled={loading}
            />
          </div>
          
          <DefaultButton 
            type='submit' 
            disabled={loading || !newEmail || !currentPassword}
          >
            Changer l'adresse email
          </DefaultButton>
        </form>

        {/* Popup de confirmation */}
        {showConfirmDialog && (
          <div className="modal_overlay" onClick={cancelEmailChange}>
            <div className="modal_content" onClick={(e) => e.stopPropagation()} style={{
              backgroundColor: theme.palette.background.secondary,
              color: theme.palette.text.primary,
              maxWidth: '500px'
            }}>
              <h3 style={{ marginBottom: '1rem', color: theme.palette.text.primary }}>
                📧 Confirmer le changement d'email
              </h3>
              <p style={{ 
                marginBottom: '1rem', 
                color: theme.palette.text.secondary,
                lineHeight: '1.4'
              }}>
                Vous êtes sur le point de changer votre adresse email :
              </p>
              <div style={{ 
                backgroundColor: theme.palette.background.paper,
                padding: '1rem',
                borderRadius: '6px',
                marginBottom: '1rem',
                border: `1px solid ${theme.palette.divider}`
              }}>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: theme.palette.text.secondary }}>
                  <strong>De :</strong> {currentEmail}
                </p>
                <p style={{ margin: '0', fontSize: '0.9rem', color: theme.palette.text.secondary }}>
                  <strong>Vers :</strong> {newEmail}
                </p>
              </div>
              <p style={{ 
                marginBottom: '1.5rem', 
                color: theme.palette.text.secondary,
                fontSize: '0.9rem',
                lineHeight: '1.4'
              }}>
                Un email de confirmation sera envoyé à la nouvelle adresse. Vous devrez cliquer sur le lien dans cet email pour finaliser le changement.
              </p>
              <p style={{ 
                marginBottom: '1.5rem', 
                color: theme.palette.warning.main,
                fontSize: '0.85rem',
                padding: '0.75rem',
                backgroundColor: 'rgba(255, 193, 7, 0.1)',
                borderRadius: '4px',
                border: `1px solid ${theme.palette.warning.main}`
              }}>
                ⚠️ Assurez-vous d'avoir accès à cette nouvelle adresse email avant de continuer.
              </p>
              
              <div className="modal_actions" style={{ gap: '1rem' }}>
                <SecondaryButton 
                  onClick={cancelEmailChange}
                  disabled={loading}
                >
                  Annuler
                </SecondaryButton>
                <DefaultButton
                  onClick={executeEmailChange}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={12} sx={{ color: 'white' }} /> : undefined}
                >
                  {loading ? 'Envoi...' : 'Confirmer le changement'}
                </DefaultButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountEmail;
