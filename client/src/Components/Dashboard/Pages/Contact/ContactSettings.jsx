import React, { useState, useEffect } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { CircularProgress, FormControlLabel } from '@mui/material';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import AddIcon from '@mui/icons-material/Add';
import EmailIcon from '@mui/icons-material/Email';
import Cookies from 'js-cookie';

// Internal imports
import config from '../../../../config';
import Axios from '../../../../service/AxiosConfig';
import { useSnackbar } from '../../../../Theme/snackbar';
import { useWebsite } from '../../../../Context/WebsiteContext';
import { DefaultButton, SecondaryButton, RedButton, DefaultSwitch } from '../../../../Theme/element';
import '../modification_site/Collection/collection.css';
import './Contact.css';
import './ContactSettings.css';

const ContactSettings = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const token = Cookies.get('token');
  const apiUrl = config.apiUrl;
  const { showSnackbar } = useSnackbar();
  const { selectedWebsite, loading: websiteLoading } = useWebsite();
  
  // États
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [addingEmail, setAddingEmail] = useState(false);

  // Charger les emails du site web
  const fetchEmails = async () => {
    if (!selectedWebsite?.id || websiteLoading) {
      setEmails([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await Axios.get(`${apiUrl}/getWebsiteEmails`, {
        params: { websiteId: selectedWebsite.id },
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setEmails(response.data.emails || []);
    } catch (error) {
      console.error('Erreur lors du chargement des emails:', error);
      showSnackbar('Erreur lors du chargement des emails', 'error');
      setEmails([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEmails();
  }, [selectedWebsite, websiteLoading]);

  // Ajouter un nouvel email
  const handleAddEmail = async () => {
    if (!newEmail.trim()) {
      showSnackbar('Veuillez saisir un email valide', 'error');
      return;
    }

    // Validation simple de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      showSnackbar('Format d\'email invalide', 'error');
      return;
    }

    if (!selectedWebsite?.id) {
      showSnackbar('Aucun site web sélectionné', 'error');
      return;
    }

    setAddingEmail(true);
    try {
      await Axios.post(`${apiUrl}/addWebsiteEmail`, {
        websiteId: selectedWebsite.id,
        email: newEmail.trim(),
        isPrimary: emails.length === 0 // Premier email = principal par défaut
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      setNewEmail('');
      await fetchEmails();
      showSnackbar('Email ajouté avec succès', 'success');
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Erreur lors de l\'ajout de l\'email';
      showSnackbar(errorMessage, 'error');
    }
    setAddingEmail(false);
  };

  // Supprimer un email
  const handleDeleteEmail = async (emailId) => {
    if (!selectedWebsite?.id) {
      showSnackbar('Aucun site web sélectionné', 'error');
      return;
    }

    try {
      await Axios.delete(`${apiUrl}/deleteWebsiteEmail`, {
        params: { emailId, websiteId: selectedWebsite.id },
        headers: { 'Authorization': `Bearer ${token}` }
      });

      await fetchEmails();
      showSnackbar('Email supprimé avec succès', 'success');
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Erreur lors de la suppression de l\'email';
      showSnackbar(errorMessage, 'error');
    }
  };

  // Définir un email comme principal
  const handleSetPrimary = async (emailId) => {
    if (!selectedWebsite?.id) {
      showSnackbar('Aucun site web sélectionné', 'error');
      return;
    }

    setSaving(true);
    try {
      await Axios.put(`${apiUrl}/setPrimaryEmail`, {
        emailId,
        websiteId: selectedWebsite.id
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      await fetchEmails();
      showSnackbar('Email principal mis à jour', 'success');
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Erreur lors de la mise à jour';
      showSnackbar(errorMessage, 'error');
    }
    setSaving(false);
  };

  // Activer/désactiver un email
  const handleToggleActive = async (emailId, isActive) => {
    if (!selectedWebsite?.id) {
      showSnackbar('Aucun site web sélectionné', 'error');
      return;
    }

    try {
      await Axios.put(`${apiUrl}/toggleEmailActive`, {
        emailId,
        websiteId: selectedWebsite.id,
        isActive: !isActive
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      await fetchEmails();
      showSnackbar(`Email ${!isActive ? 'activé' : 'désactivé'}`, 'success');
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Erreur lors de la mise à jour';
      showSnackbar(errorMessage, 'error');
    }
  };

  if (!selectedWebsite && !websiteLoading) {
    return (
      <div className="outlet-box">
        <div className="dashboard_case_empty edit-case_empty">
          <div className="empty_state">
            <h3 style={{ color: theme.palette.text.secondary }}>
              Aucun site web sélectionné
            </h3>
            <p style={{ color: theme.palette.text.secondary }}>
              Veuillez sélectionner un site web pour configurer les emails de contact
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="outlet-box">
      {/* Section titre avec breadcrumb */}
      <div className="title_section">
        <div className="breadCrumbs">
          <NavLink 
            className={'breadCrumbsLink'}
            to="/dashboard/home"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            Dashboard
          </NavLink>
          <span className="breadcrumb-separator" style={{ color: theme.palette.text.secondary }}> / </span>
          <NavLink 
            className={'breadCrumbsLink'}
            to="/dashboard/website"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            {selectedWebsite?.website_name || 'Site'}
          </NavLink>
          <span className="breadcrumb-separator" style={{ color: theme.palette.text.secondary }}> / </span>
          <NavLink 
            className={'breadCrumbsLink'}
            to="/dashboard/website/contact"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            Contacts
          </NavLink>
          <span className="breadcrumb-separator" style={{ color: theme.palette.text.secondary }}> / </span>
          <span className="breadcrumb-item-active" style={{ color: theme.palette.text.primary }}>
            Paramètres
          </span>
        </div>
      </div>

      <div className="dashboard_case_empty edit-case_empty">
        <div className='contact-settings-wrapper'>
          <div className="header_modification header_page_modification">
            <div className="content_page_header_left">
              <h3 className="heading_h3">Paramètres de Contact</h3>
              <p style={{ color: theme.palette.text.secondary, margin: '0.5rem 0', fontSize:'0.8rem' }}>
                Configurez les adresses email qui recevront les demandes de contact pour <strong>{selectedWebsite?.website_name}</strong>
              </p>
            </div>
            <div className="content_page_header_right">
              <SecondaryButton onClick={() => navigate('/dashboard/contact')}>
                Retour
              </SecondaryButton>
            </div>
          </div>

          {/* Section d'ajout d'email */}
          <div className="contact-settings-section" style={{ 
            backgroundColor: theme.palette.primary.main, 
            padding: '1rem',
            borderRadius: '0.5rem',
            marginBottom: '1.5rem'
          }}>
            <h4 style={{ color: theme.palette.text.primary, margin:'0', marginBottom:'1rem' }}>
              Ajouter un nouvel email
            </h4>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <input
                  type="email"
                  className="input_text_blog"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="exemple@domaine.com"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddEmail();
                    }
                  }}
                />
              <DefaultButton 
                onClick={handleAddEmail}
                disabled={addingEmail || !newEmail.trim()}
              >
                {addingEmail ? 'Ajout...' : 'Ajouter'}
              </DefaultButton>
            </div>
          </div>

          {/* Liste des emails */}
          <div className="contact-settings-section" style={{ 
            backgroundColor: theme.palette.primary.main, 
            padding: '1rem',
            borderRadius: '0.5rem'
          }}>
            <h4 style={{ color: theme.palette.text.primary, margin:'0', marginBottom:'1rem' }}>
              Emails configurés ({emails.length})
            </h4>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <CircularProgress />
              </div>
            ) : emails.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '2rem', 
                color: theme.palette.text.secondary 
              }}>
                <EmailIcon style={{ fontSize: '3rem', marginBottom: '1rem' }} />
                <p>Aucun email configuré</p>
                <p>Ajoutez un email pour recevoir les demandes de contact</p>
              </div>
            ) : (
              <div className="emails-list">
                {emails.map((email) => (
                  <div 
                    key={email.id}
                    className="email-item"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.8rem',
                      marginBottom: '0.5rem',
                      backgroundColor: theme.palette.primary.secondary,
                      borderRadius: '0.5rem',
                      border: `0.5px solid ${theme.palette.primary.third}`
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                      <EmailIcon style={{ color: theme.palette.text.secondary }} />
                      <div>
                        <div style={{ 
                          color: theme.palette.text.primary, 
                          display: 'flex',
                          alignItems:'center',
                          gap:'1rem'
                        }}>
                          {email.email}
                          {email.is_primary && (
                            <span  className='contact-settings-principal'>
                              Principal
                            </span>
                          )}
                        </div>
                        <div style={{ 
                          color: theme.palette.text.secondary, 
                          fontSize: '0.8rem' 
                        }}>
                          Ajouté le {new Date(email.created_at).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      {/* Switch actif/inactif */}
                      <FormControlLabel
                        control={
                          <DefaultSwitch
                            checked={email.is_active}
                            onChange={() => handleToggleActive(email.id, email.is_active)}
                          />
                        }
                        label={email.is_active ? 'Actif' : 'Inactif'}
                        style={{ color: theme.palette.text.secondary }}
                      />

                      {/* Bouton définir comme principal */}
                      {!email.is_primary && (
                        <SecondaryButton
                          size="small"
                          onClick={() => handleSetPrimary(email.id)}
                          disabled={saving}
                        >
                          Définir comme principal
                        </SecondaryButton>
                      )}

                      {/* Bouton supprimer */}
                      <RedButton
                        size="small"
                        onClick={() => handleDeleteEmail(email.id)}
                        startIcon={<DeleteOutlineOutlinedIcon />}
                      >
                        Supprimer
                      </RedButton>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactSettings;
