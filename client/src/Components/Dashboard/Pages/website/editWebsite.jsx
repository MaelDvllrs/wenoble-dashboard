import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { CircularProgress, MenuItem, Popper, Grow, ClickAwayListener, Box } from '@mui/material';
import { Menu } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Cookies from 'js-cookie';
import './website.css';

// Internal imports
import config from '../../../../config';
import Axios from '../../../../service/AxiosConfig';
import { useSnackbar } from '../../../../Theme/snackbar';
import { WebsiteContext } from '../../../../Context/WebsiteContext';
import { WorkspaceContext } from '../../../../Context/WorkspaceContext';
import { DefaultButton, SecondaryButton, RedButton, SelectField } from '../../../../Theme/element';
// Reuse static site generation util from collection pages
import { generateStaticSite } from '../modification_site/Collection/apiCollection';
// API Tokens Manager component
import APITokensManager from './APITokensManager';

// Small local badge component for publishing steps
const StatusBadge = ({ label, active }) => {
  return (
    <span
      style={{
        background: active ? '#4caf50' : '#888',
        color: '#fff',
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '12px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'background .3s'
      }}
    >
      {active ? '✓' : '…'} {label}
    </span>
  );
};

const EditWebsite = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const token = Cookies.get('token');
  const apiUrl = config.apiUrl;
  const { showSnackbar } = useSnackbar();
  const { websites, selectedWebsite, updateWebsite, deleteWebsite } = useContext(WebsiteContext);
  const { workspaces } = useContext(WorkspaceContext);
  
  // États pour les données du site
  const [website, setWebsite] = useState(null);
  const [websiteData, setWebsiteData] = useState({
    website_name: '',
    website_slug: '',
    analytics_id: '',
    visibility: 'workspace'
  });
  
  // États pour les utilisateurs
  const [users, setUsers] = useState([]);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [newUserRole, setNewUserRole] = useState('viewer');
  
  // États pour les modales
  // État pour le menu de publication
  const [anchorEl, setAnchorEl] = useState(null);
  const [showDomainDialog, setShowDomainDialog] = useState(false);
  const [publishType, setPublishType] = useState('publish'); // 'publish' ou 'all'
  const [publishCustomDomain, setPublishCustomDomain] = useState(false);
  const publishBtnRef = useRef(null);
  const [deleteUserModal, setDeleteUserModal] = useState({ open: false, userId: null });
  const [deleteWebsiteModal, setDeleteWebsiteModal] = useState(false);
  const [editUserModal, setEditUserModal] = useState({ open: false, userId: null, role: '' });
  
  // États de chargement
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  // Publication state
  const [isPublishing, setIsPublishing] = useState(false);
  const [dataRetrievalStatus, setDataRetrievalStatus] = useState(false);
  const [pageGenerationStatus, setPageGenerationStatus] = useState(false);
  const [sitePublishingStatus, setSitePublishingStatus] = useState(false);
  
  // États pour l'abonnement et les droits admin
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [isAdminUser, setIsAdminUser] = useState(false);

  // Charger les données du site web
  useEffect(() => {
    if (websites && selectedWebsite?.id) {
      // Use the selectedWebsite from context as the canonical source of truth
      const currentWebsite = websites.find(w => w.id === selectedWebsite.id) || selectedWebsite;
      if (currentWebsite) {
        setWebsite(currentWebsite);
        setWebsiteData({
          website_name: currentWebsite.website_name || '',
          website_slug: currentWebsite.website_slug || '',
          analytics_id: currentWebsite.analytics_id || '',
          visibility: currentWebsite.visibility || 'workspace'
        });
        loadWebsiteUsers();
        loadWorkspaceMembers();
        setInitialLoading(false);
      }
    }
  }, [websites, selectedWebsite]);

  // Recharger les membres disponibles quand les utilisateurs changent
  useEffect(() => {
    if (website && users.length >= 0) {
      loadWorkspaceMembers();
    }
  }, [users, website]);

  // Vérifier si l'utilisateur est admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const response = await Axios.get(`${config.apiUrl}/user-admin`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setIsAdminUser(response.data?.isAdmin || false);
      } catch (error) {
        console.error('Erreur lors de la vérification du statut admin:', error);
        setIsAdminUser(false);
      }
    };
    if (token) {
      checkAdminStatus();
    }
  }, [token]);

  // Récupérer l'abonnement et la feature custom_domain
  useEffect(() => {
    const fetchSubscriptionAndFeature = async () => {
      if (!website?.id) return;
      try {
        // Vérifier la feature custom_domain
        let customDomain = false;
        const authRes = await Axios.get(`${config.apiUrl}/custom-domain-authorisation/${website.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        customDomain = !!authRes.data.authorisation;

        // Récupérer le plan d'abonnement
        let planName = null;
        try {
          const subRes = await Axios.get(`${config.apiUrl}/subscription-status/${website.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (subRes.data?.success && subRes.data.subscription) {
            planName = subRes.data.subscription.plan_name || null;
          }
        } catch (e) {
          // ignore
        }

        setSubscriptionInfo({ custom_domain: customDomain, plan_name: planName });
      } catch (e) {
        setSubscriptionInfo(null);
      }
    };
    fetchSubscriptionAndFeature();
  }, [website, token]);


  // Charger les utilisateurs du site web
  const loadWebsiteUsers = async () => {
    if (!website?.id) return;
    
    try {
      const response = await Axios.get(`${apiUrl}/getUsersWebsite?websiteId=${website?.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.data) {
        setUsers(response.data.users || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
      showSnackbar('Erreur lors du chargement des utilisateurs', 'error');
    }
  };

  // Charger les membres du workspace
  const loadWorkspaceMembers = async () => {
    if (!website?.workspace_id) return;
    
    try {
      const response = await Axios.get(`${apiUrl}/getWorkspaceMembers?workspaceId=${website.workspace_id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.data) {
        // Filtrer les membres qui ne sont pas déjà ajoutés au site
        const availableMembers = response.data.members?.filter(member => 
          !users.some(user => user.user_id === member.id)
        ) || [];
        setWorkspaceMembers(availableMembers);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des membres du workspace:', error);
      showSnackbar('Erreur lors du chargement des membres', 'error');
    }
  };

  // Sauvegarder les informations générales
  const handleSaveWebsiteInfo = async () => {
    if (!websiteData.website_name.trim() || !websiteData.website_slug.trim()) {
      showSnackbar('Le nom et le slug du site sont requis', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await Axios.post(`${apiUrl}/updateWebsite`, {
        website_id: website?.id,
        ...websiteData
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.data) {
        updateWebsite(response.data.website);
        showSnackbar('Informations du site mises à jour avec succès', 'success');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Erreur lors de la mise à jour';
      showSnackbar(errorMessage, 'error');
    }
    setLoading(false);
  };

  // Ajouter un utilisateur
  const handleAddUser = async () => {

    if (!selectedUserId) {
      showSnackbar('error','Veuillez sélectionner un utilisateur');
      return;
    }
    
    // Trouver l'utilisateur sélectionné pour récupérer son email
    const selectedUser = workspaceMembers.find(member => member.id === selectedUserId);
    if (!selectedUser) {
      showSnackbar('error', 'Utilisateur sélectionné non trouvé');
      return;
    }
    
    setLoading(true);
    try {
      await Axios.post(`${apiUrl}/addUserToWebsite`, {
        website_id: website?.id,
        user_email: selectedUser.email,
        role: newUserRole
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setSelectedUserId('');
      setNewUserRole('viewer');
      loadWebsiteUsers();
      loadWorkspaceMembers(); // Recharger pour mettre à jour la liste des membres disponibles
      showSnackbar('success', 'Utilisateur ajouté avec succès');
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Erreur lors de l\'ajout de l\'utilisateur';
      console.log(error)
      showSnackbar('error', errorMessage);
    }
    setLoading(false);
  };

  // Modifier le rôle d'un utilisateur
  const handleUpdateUserRole = async () => {
    setLoading(true);
    try {
      await Axios.put(`${apiUrl}/updateUserRoleWebsite`, {
        userWebsiteId: editUserModal.userId,
        website_id: website?.id,
        role: editUserModal.role
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      loadWebsiteUsers();
      setEditUserModal({ open: false, userId: null, role: '' });
      showSnackbar('Rôle mis à jour avec succès', 'success');
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Erreur lors de la mise à jour du rôle';
      showSnackbar(errorMessage, 'error');
    }
    setLoading(false);
  };

  // Supprimer un utilisateur
  const handleDeleteUser = async () => {
    setLoading(true);
    try {
      await Axios.delete(`${apiUrl}/deleteUserWebsite`, {
        data: { 
          userWebsiteId: deleteUserModal.userId,
          website_id: website?.id 
        },
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      loadWebsiteUsers();
      setDeleteUserModal({ open: false, userId: null });
      showSnackbar('Utilisateur supprimé avec succès', 'success');
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Erreur lors de la suppression de l\'utilisateur';
      showSnackbar(errorMessage, 'error');
    }
    setLoading(false);
  };

  // Supprimer le site web
  const handleDeleteWebsite = async () => {
    setLoading(true);
    try {
      await Axios.delete(`${apiUrl}/deleteWebsite?websiteId=${website?.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      deleteWebsite(website?.id);
      navigate('/dashboard/websites');
      showSnackbar('Site web supprimé avec succès', 'success');
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Erreur lors de la suppression du site web';
      showSnackbar(errorMessage, 'error');
    }
    setLoading(false);
    setDeleteWebsiteModal(false);
  };

  // Fonction pour gérer la publication avec sélection de domaine
  const handlePublishWithDomain = async () => {
    setShowDomainDialog(false);
    setIsPublishing(true);
    setDataRetrievalStatus(true);
    setPageGenerationStatus(false);
    setSitePublishingStatus(false);

    try {
      setTimeout(() => setPageGenerationStatus(true), 800);
      
      // Déterminer si on publie sur le custom domain
      const customDomain = !!((subscriptionInfo?.custom_domain || isAdminUser) && publishCustomDomain);
      
      // Appel API avec le type de publication et le domaine
      const res = await generateStaticSite(token, website.id, publishType, customDomain);
      
      setTimeout(() => setSitePublishingStatus(true), 1600);
      await new Promise(r => setTimeout(r, 2600));
      
      if (res?.success === false) {
        showSnackbar('warning', "La génération du site a rencontré un problème partiel");
      } else {
        const message = publishType === 'all' ? 'Site généré (toutes pages) avec succès' : 'Site généré avec succès';
        showSnackbar('success', message);
      }
    } catch (e) {
      console.error('Erreur publication site:', e);
      showSnackbar('error', 'Erreur lors de la génération du site');
    } finally {
      setDataRetrievalStatus(false);
      setPageGenerationStatus(false);
      setSitePublishingStatus(false);
      setIsPublishing(false);
      setPublishCustomDomain(false);
    }
  };

  if (initialLoading || !website) {
    return (
      <div className="outlet">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <CircularProgress />
        </div>
      </div>
    );
  }

  // Vérifier les permissions - seuls les admins peuvent accéder aux paramètres
  if (website.user_role !== 'admin') {
    return (
      <div className="outlet-box">
        <div className="title_section">
          <div className="breadCrumbs">
            <NavLink 
              className={'breadCrumbsLink'}
              to="/dashboard/home"
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              Dashboard
            </NavLink>
            <span> / </span>
            <NavLink 
              className={'breadCrumbsLink'}
              to="/dashboard/websites"
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              Sites Web
            </NavLink>
            <span className="breadcrumb-separator" style={{ color: theme.palette.text.secondary }}> / </span>
            <span className="breadcrumb-item-active" style={{ color: theme.palette.text.primary }}>
              Paramètres - {website.website_name}
            </span>
          </div>
        </div>
        <div className="dashboard_case_empty edit-case_empty" style={{display: 'flex', alignItems: 'center'}}>
          <div style={{ 
            textAlign: 'center', 
            padding: '3rem', 
            color: theme.palette.text.secondary 
          }}>
            <h3 style={{ color: theme.palette.error.main, marginBottom: '1rem' }}>
              Accès non autorisé
            </h3>
            <p style={{ marginBottom: '2rem' }}>
              Vous devez être administrateur de ce site pour accéder aux paramètres.
            </p>
            <SecondaryButton
              onClick={() => navigate('/dashboard/websites')}
            >
              Retour aux sites web
            </SecondaryButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="outlet-box">
      {/* Section titre avec breadcrumb */}

      {/* Section principale */}
      <div className="dashboard_case_empty edit-case_empty">
          <div className="create-website-wrapper">
            <div className="creation-website-header">
              <h3 className="titlePage">Paramètres du site</h3>
              <div className="actions-section">
                
                <SecondaryButton
                  variant="outlined"
                  onClick={() => navigate('/dashboard/websites')}
                  disabled={loading}
                >
                  Retour
                </SecondaryButton>
                {/* Nouveau bouton principal avec menu popup pour publier/publier tout */}
                <div>
                  <span ref={publishBtnRef} style={{ display: 'inline-block' }}>
                    <DefaultButton
                      aria-controls={Boolean(anchorEl) ? 'publish-menu' : undefined}
                      aria-haspopup="true"
                      onClick={(e) => setAnchorEl(e.currentTarget)}
                      disabled={loading || isPublishing}
                      size="large"
                    >
                      <div className="button-popup-box">Publier <div className="button-popup-line"></div><KeyboardArrowDownIcon fontSize="small"/></div>
                    </DefaultButton>
                  </span>
                  <Menu
                    id="publish-menu"
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={() => setAnchorEl(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    PaperProps={{
                      sx: {
                        backgroundColor: theme.palette.primary.main,
                        color: theme.palette.primary.contrastText,
                        borderRadius: 1,
                        marginTop: "0.5rem",
                        boxShadow: theme.palette.shadow.main
                      }
                    }}
                    MenuListProps={{ sx: { paddingY: 0 } }}
                  >
                    <MenuItem sx={{ fontSize: "0.95rem", '&:hover': { backgroundColor: theme.palette.primary.third } }}
                      onClick={() => {
                        setAnchorEl(null);
                        if (isPublishing) return;
                        setPublishType('publish');
                        setShowDomainDialog(true);
                      }}
                    >
                      Publier
                    </MenuItem>
                    <MenuItem sx={{ fontSize: "0.95rem", '&:hover': { backgroundColor: theme.palette.primary.third } }}
                      onClick={() => {
                        setAnchorEl(null);
                        if (isPublishing) return;
                        setPublishType('all');
                        setShowDomainDialog(true);
                      }}
                    >
                      Publier tout
                    </MenuItem>
                  </Menu>
                </div>
              </div>
            </div>

            {/* Publication status badges */}
            {isPublishing && (
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <StatusBadge label="Récupération des données" active={dataRetrievalStatus} />
                <StatusBadge label="Génération des pages" active={pageGenerationStatus} />
                <StatusBadge label="Publication du site" active={sitePublishingStatus} />
              </div>
            )}

            <div className="creation-site-wrapper-info">
              {/* Informations générales */}
              <div className="input-container">
                <h4 className='titlePage'>Informations générales</h4>
                <p className="blogField_description">Configuration de base de votre site web</p>
              </div>

              <div className="input-container">
                <p className='blogField_name collection_edit_name'>Nom du site *</p>
                <input
                  type="text"
                  className="input_text_blog"
                  value={websiteData.website_name}
                  onChange={(e) => setWebsiteData({ ...websiteData, website_name: e.target.value })}
                  required
                />
              </div>

              <div className="input-container">
                <p className="blogField_name collection_edit_name">Slug du site *</p>
                <input
                  type="text"
                  className="input_text_blog"
                  value={websiteData.website_slug}
                  onChange={(e) => setWebsiteData({ ...websiteData, website_slug: e.target.value })}
                  required
                />
              </div>

              <div className="input-container">
                <p className="blogField_name collection_edit_name">ID Analytics</p>
                <input
                  type="text"
                  className="input_text_blog"
                  value={websiteData.analytics_id}
                  onChange={(e) => setWebsiteData({ ...websiteData, analytics_id: e.target.value })}
                  placeholder="G-XXXXXXXXXX"
                />
              </div>

              <div className="input-container">
                <p className="blogField_name collection_edit_name">Lien preview du site</p>
                <input
                  type="url"
                  className="input_text_blog"
                  value={websiteData.preview_url || ''}
                  onChange={e => setWebsiteData({ ...websiteData, website_preview: e.target.value })}
                  placeholder="https://votre-site-preview.com"
                />
              </div>

              <div className="input-container">
                <p className="blogField_name collection_edit_name">Visibilité *</p>
                <SelectField
                  value={websiteData.visibility}
                  onChange={(e) => setWebsiteData({ ...websiteData, visibility: e.target.value })}
                  required
                  sx={{ width: '100%' }}
                >
                  <MenuItem value="workspace">Tous les membres du workspace</MenuItem>
                  <MenuItem value="restricted">Utilisateurs ajoutés seulement</MenuItem>
                </SelectField>
              </div>

              <div className="input-container">
                <DefaultButton 
                  onClick={handleSaveWebsiteInfo}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={12} sx={{ color: 'white' }} /> : undefined}
                >
                  Enregistrer
                </DefaultButton>
              </div>

              <div className="line_horizontal is_big_margin" style={{backgroundColor: theme.palette.primary.third}}></div>

              {/* Gestion des utilisateurs */}
              <div className="input-container">
                <h4 className='titlePage'>Gestion des utilisateurs</h4>
                <p className="blogField_description">Ajoutez, modifiez ou supprimez les utilisateurs du site</p>
              </div>

              <div className="input-container">
                <p className="blogField_name collection_edit_name">Ajouter un utilisateur</p>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1', minWidth: '200px' }}>
                    <SelectField
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      displayEmpty
                      sx={{ width: '100%' }}
                    >
                      <MenuItem value="" disabled>
                        {workspaceMembers.length === 0 ? 'Aucun membre disponible' : 'Sélectionner un membre'}
                      </MenuItem>
                      {workspaceMembers.map((member) => (
                        <MenuItem key={member.id} value={member.id}>
                          {member.username} ({member.email})
                        </MenuItem>
                      ))}
                    </SelectField>
                  </div>
                  <div style={{ flex: '0 0 150px' }}>
                    <SelectField
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value)}
                      sx={{ width: '100%' }}
                    >
                      <MenuItem value="viewer">Viewer</MenuItem>
                      <MenuItem value="editor">Editor</MenuItem>
                      <MenuItem value="admin">Admin</MenuItem>
                    </SelectField>
                  </div>
                  <div style={{ flex: '0 0 auto' }}>
                    <DefaultButton 
                      onClick={handleAddUser}
                      disabled={loading || !selectedUserId || workspaceMembers.length === 0}
                      startIcon={loading ? <CircularProgress size={12} sx={{ color: 'white' }} /> : undefined}
                    >
                      Ajouter
                    </DefaultButton>
                  </div>
                </div>
              </div>

              {/* Liste des utilisateurs */}
              {users.length > 0 && (
                <div className="input-container">
                  <p className="blogField_name collection_edit_name">Utilisateurs du site</p>
                  <div className="table_container">
                    <table className="data_table">
                      <thead>
                        <tr>
                          <th>Email</th>
                          <th>Nom</th>
                          <th>Rôle</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <tr key={user.id}>
                            <td className='website-user-td'>{user.email}</td>
                            <td className='website-user-td'>{user.first_name} {user.last_name}</td>
                            <td className='website-user-td'>
                              <span className={`website-selector-role ${user.role}`}>
                                {user.role}
                              </span>
                            </td>
                            <td>
                              <div className="action_buttons">
                                <SecondaryButton
                                  onClick={() => setEditUserModal({ 
                                    open: true, 
                                    userId: user.id, 
                                    role: user.role 
                                  })}
                                >
                                  Modifier
                                </SecondaryButton>
                                <RedButton
                                  onClick={() => setDeleteUserModal({ open: true, userId: user.id })}
                                >
                                  Supprimer
                                </RedButton>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="line_horizontal is_big_margin" style={{backgroundColor: theme.palette.primary.third}}></div>

              {/* Gestion des tokens API */}

              <div className="input-container" style={{ padding: 0 }}>
                <APITokensManager websiteId={website?.id} />
              </div>

              <div className="line_horizontal is_big_margin" style={{backgroundColor: theme.palette.primary.third}}></div>

              {/* Zone de danger */}
              <div className="input-container">
                <RedButton
                  onClick={() => setDeleteWebsiteModal(true)}
                >
                  Supprimer
                </RedButton>
              </div>
            </div>
          </div>
      </div>

      {/* Modales */}
      {/* Popup de sélection de domaine pour la publication */}
      <Popper
        open={showDomainDialog}
        anchorEl={publishBtnRef.current}
        transition
        placement="bottom-end"
        style={{ zIndex: 1300 }}
      >
        {({ TransitionProps }) => (
          <ClickAwayListener onClickAway={() => setShowDomainDialog(false)}>
            <Grow {...TransitionProps} timeout={350}>
              <div style={{
                marginTop: '0.5rem',
                background: theme.palette.primary.main,
                boxShadow: theme.palette.shadow.main,
                padding: '1rem',
                maxWidth: '350px',
                width: '60vw',
                borderRadius: '0.5rem'
              }}>
                <Box sx={{ mb: 1 }}>
                  <h4 style={{ margin: 0, color: theme.palette.text.primary }}>Publication du site</h4>
                </Box>
                <div className='line-sidebar'></div>
                <Box sx={{ mb: 1 }}>
                  {/* Domaine preview (toujours activé) */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.8rem' }}>
                    <label className="custom-checkbox" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="checkbox" checked disabled style={{ accentColor: theme.palette.primary.main }} />
                      <span className="checkmark"></span>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <span style={{ color: theme.palette.text.secondary, fontSize: '0.85rem', lineHeight: 1 }}>
                          Domaine preview
                        </span>
                        <span style={{ fontSize: '0.85rem', lineHeight: 1.2 }}>
                          <b>{website?.website_preview || 'Non configuré'}</b>
                        </span>
                      </div>
                    </label>
                    {website?.website_preview && (
                      <button
                        className='download-button'
                        title="Voir le site preview"
                        onClick={() => window.open(`https://${website.website_preview}`, '_blank')}
                      >
                        <OpenInNewIcon fontSize='tiny' />
                      </button>
                    )}
                  </div>
                  <div className='line-sidebar'></div>
                  {/* Domaine personnalisé (si abonnement ou admin) */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.8rem' }}>
                    <label className="custom-checkbox" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={!!((subscriptionInfo?.custom_domain || isAdminUser) && publishCustomDomain)}
                        onChange={e => setPublishCustomDomain(e.target.checked)}
                        disabled={!subscriptionInfo?.custom_domain && !isAdminUser}
                        style={{ accentColor: theme.palette.primary.main }}
                      />
                      <span className="checkmark"></span>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <span style={{ color: theme.palette.text.secondary, fontSize: '0.85rem', lineHeight: 1 }}>
                          Domaine personnalisé {isAdminUser && <span style={{ color: theme.palette.primary.main }}>(Admin)</span>}
                        </span>
                        <span style={{ fontSize: '0.85rem', lineHeight: 1.2 }}>
                          {subscriptionInfo?.custom_domain || isAdminUser ? (
                            <b>{website?.website_slug || 'Non configuré'}</b>
                          ) : (
                            <NavLink to={`/dashboard/website/subscription`} style={{ color: theme.palette.text.primary, marginLeft: 0, fontSize: 12 }}>
                              Ajouter un domaine personnalisé
                            </NavLink>
                          )}
                        </span>
                      </div>
                    </label>
                    {website?.custom_domain && (
                      <button
                        className='download-button'
                        title="Voir le site custom"
                        onClick={() => window.open(`https://${website.custom_domain}`, '_blank')}
                      >
                        <OpenInNewIcon fontSize='tiny' />
                      </button>
                    )}
                  </div>
                </Box>
                <div className='line-sidebar'></div>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                  <SecondaryButton
                    variant="outlined"
                    size="small"
                    onClick={() => setShowDomainDialog(false)}
                  >
                    Annuler
                  </SecondaryButton>
                  <DefaultButton
                    onClick={handlePublishWithDomain}
                    disabled={isPublishing}
                  >
                    Publier le site
                  </DefaultButton>
                </Box>
              </div>
            </Grow>
          </ClickAwayListener>
        )}
      </Popper>

      {deleteUserModal.open && (
        <div className="modal_overlay" onClick={() => setDeleteUserModal({ open: false, userId: null })}>
          <div className="modal_content" onClick={(e) => e.stopPropagation()}>
            <h3>Supprimer l'utilisateur</h3>
            <p>Êtes-vous sûr de vouloir supprimer cet utilisateur du site web ?</p>
            <div className="modal_actions">
              <SecondaryButton onClick={() => setDeleteUserModal({ open: false, userId: null })}>
                Annuler
              </SecondaryButton>
              <RedButton onClick={handleDeleteUser} disabled={loading}>
                {loading ? <CircularProgress size={20} /> : 'Supprimer'}
              </RedButton>
            </div>
          </div>
        </div>
      )}

      {editUserModal.open && (
        <div className="modal_overlay" onClick={() => setEditUserModal({ open: false, userId: null, role: '' })}>
          <div className="modal_content" onClick={(e) => e.stopPropagation()}>
            <h3>Modifier le rôle</h3>
            <div style={{ margin: '1rem 0' }}>
              <SelectField
                value={editUserModal.role}
                onChange={(e) => setEditUserModal({ ...editUserModal, role: e.target.value })}
                sx={{ width: '100%' }}
              >
                <MenuItem value="viewer">Viewer</MenuItem>
                <MenuItem value="editor">Editor</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </SelectField>
            </div>
            <div className="modal_actions">
              <SecondaryButton onClick={() => setEditUserModal({ open: false, userId: null, role: '' })}>
                Annuler
              </SecondaryButton>
              <DefaultButton onClick={handleUpdateUserRole} disabled={loading}>
                {loading ? <CircularProgress size={20} /> : 'Sauvegarder'}
              </DefaultButton>
            </div>
          </div>
        </div>
      )}

      {deleteWebsiteModal && (
        <div className="modal_overlay" onClick={() => setDeleteWebsiteModal(false)}>
          <div className="modal_content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ color: '#f44336' }}>Supprimer le site web</h3>
            <p>
              Êtes-vous sûr de vouloir supprimer définitivement ce site web ? 
              Cette action supprimera toutes les données associées et ne peut pas être annulée.
            </p>
            <div className="modal_actions">
              <SecondaryButton onClick={() => setDeleteWebsiteModal(false)}>
                Annuler
              </SecondaryButton>
              <RedButton onClick={handleDeleteWebsite} disabled={loading}>
                {loading ? <CircularProgress size={20} /> : 'Supprimer définitivement'}
              </RedButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditWebsite;
