import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, NavLink } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { CircularProgress, MenuItem } from '@mui/material';
import Cookies from 'js-cookie';
import './website.css';

// Internal imports
import config from '../../../../config';
import Axios from '../../../../service/AxiosConfig';
import { useSnackbar } from '../../../../Theme/snackbar';
import { WebsiteContext } from '../../../../Context/WebsiteContext';
import { WorkspaceContext } from '../../../../Context/WorkspaceContext';
import { DefaultButton, SecondaryButton, RedButton, SelectField, DefaultSwitch } from '../../../../Theme/element';
// Reuse static site generation util from collection pages
import { generateStaticSite } from '../modification_site/Collection/apiCollection';

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
  const { id } = useParams();
  const navigate = useNavigate();
  const token = Cookies.get('token');
  const apiUrl = config.apiUrl;
  const { showSnackbar } = useSnackbar();
  const { websites, updateWebsite, deleteWebsite } = useContext(WebsiteContext);
  const { workspaces } = useContext(WorkspaceContext);
  
  // États pour les données du site
  const [website, setWebsite] = useState(null);
  const [websiteData, setWebsiteData] = useState({
    website_name: '',
    website_slug: '',
    analytics_id: '',
    visibility: 'workspace'
  });
  
  // États pour les features
  const [features, setFeatures] = useState({
    auth_portfolio: false,
    auth_page: false,
    auth_blog: false,
    auth_ecom: false,
    auth_newsletter: false
  });
  
  // États pour les utilisateurs
  const [users, setUsers] = useState([]);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [newUserRole, setNewUserRole] = useState('viewer');
  
  // États pour les modales
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

  // Charger les données du site web
  useEffect(() => {
    if (websites && id) {
      const currentWebsite = websites.find(w => w.id === id);
      if (currentWebsite) {
        setWebsite(currentWebsite);
        setWebsiteData({
          website_name: currentWebsite.website_name || '',
          website_slug: currentWebsite.website_slug || '',
          analytics_id: currentWebsite.analytics_id || '',
          visibility: currentWebsite.visibility || 'workspace'
        });
        loadWebsiteFeatures();
        loadWebsiteUsers();
        loadWorkspaceMembers();
        setInitialLoading(false);
      }
    }
  }, [websites, id]);

  // Recharger les membres disponibles quand les utilisateurs changent
  useEffect(() => {
    if (website && users.length >= 0) {
      loadWorkspaceMembers();
    }
  }, [users, website]);

  // Charger les features du site web
  const loadWebsiteFeatures = async () => {
    try {
      const response = await Axios.get(`${apiUrl}/getFeaturesWebsite?websiteId=${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.data) {
        setFeatures(response.data.features || {});
      }
    } catch (error) {
      console.error('Erreur lors du chargement des features:', error);
      showSnackbar('Erreur lors du chargement des fonctionnalités', 'error');
    }
  };

  // Charger les utilisateurs du site web
  const loadWebsiteUsers = async () => {
    try {
      const response = await Axios.get(`${apiUrl}/getUsersWebsite?websiteId=${id}`, {
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
        website_id: id,
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

  // Sauvegarder les features
  const handleSaveFeatures = async () => {
    setLoading(true);
    try {
      await Axios.put(`${apiUrl}/website-features/${id}`, 
        { features },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      showSnackbar('Fonctionnalités mises à jour avec succès', 'success');
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Erreur lors de la mise à jour des fonctionnalités';
      showSnackbar(errorMessage, 'error');
    }
    setLoading(false);
  };

  // Ajouter un utilisateur
  const handleAddUser = async () => {
    if (!selectedUserId) {
      showSnackbar('Veuillez sélectionner un utilisateur', 'error');
      return;
    }
    
    // Trouver l'utilisateur sélectionné pour récupérer son email
    const selectedUser = workspaceMembers.find(member => member.id === selectedUserId);
    if (!selectedUser) {
      showSnackbar('Utilisateur sélectionné non trouvé', 'error');
      return;
    }
    
    setLoading(true);
    try {
      await Axios.post(`${apiUrl}/addUserToWebsite`, {
        website_id: id,
        user_email: selectedUser.email,
        role: newUserRole
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setSelectedUserId('');
      setNewUserRole('viewer');
      loadWebsiteUsers();
      loadWorkspaceMembers(); // Recharger pour mettre à jour la liste des membres disponibles
      showSnackbar('Utilisateur ajouté avec succès', 'success');
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Erreur lors de l\'ajout de l\'utilisateur';
      showSnackbar(errorMessage, 'error');
    }
    setLoading(false);
  };

  // Modifier le rôle d'un utilisateur
  const handleUpdateUserRole = async () => {
    setLoading(true);
    try {
      await Axios.put(`${apiUrl}/updateUserRoleWebsite`, {
        userWebsiteId: editUserModal.userId,
        website_id: id,
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
          website_id: id 
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
      await Axios.delete(`${apiUrl}/deleteWebsite?websiteId=${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      deleteWebsite(id);
      navigate('/dashboard/websites');
      showSnackbar('Site web supprimé avec succès', 'success');
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Erreur lors de la suppression du site web';
      showSnackbar(errorMessage, 'error');
    }
    setLoading(false);
  setDeleteWebsiteModal(false);
};  if (initialLoading || !website) {
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
      <div className="outlet">
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
    <div className="outlet">
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
                <DefaultButton
                  onClick={async () => {
                    if (isPublishing) return;
                    setIsPublishing(true);
                    setDataRetrievalStatus(true);
                    try {
                      // Simulate step progression similar to collection element publishing
                      setTimeout(() => setPageGenerationStatus(true), 800);
                      const res = await generateStaticSite(token, website.id);
                      setTimeout(() => setSitePublishingStatus(true), 1600);
                      // Give user time to view all green statuses
                      await new Promise(r => setTimeout(r, 2600));
                      if (res?.success === false) {
                        showSnackbar('warning', "La génération du site a rencontré un problème partiel");
                      } else {
                        showSnackbar('success', 'Site généré avec succès');
                      }
                    } catch (e) {
                      console.error('Erreur publication site:', e);
                      showSnackbar('error', 'Erreur lors de la génération du site');
                    } finally {
                      setDataRetrievalStatus(false);
                      setPageGenerationStatus(false);
                      setSitePublishingStatus(false);
                      setIsPublishing(false);
                    }
                  }}
                  disabled={loading || isPublishing}
                  startIcon={isPublishing ? <CircularProgress size={12} sx={{ color: 'white' }} /> : undefined}
                >
                  {isPublishing ? 'Publication...' : 'Publier'}
                </DefaultButton>
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

              {/* Fonctionnalités du site */}
              <div className="input-container">
                <h4 className='titlePage'>Fonctionnalités</h4>
                <p className="blogField_description">Activez ou désactivez les fonctionnalités de votre site</p>
              </div>

              <div className="input-container">
                <div className="features_grid">
                  <div className="feature_item">
                    <label className="switch_container">
                      <DefaultSwitch
                        checked={features.auth_portfolio || false}
                        onChange={(e) => setFeatures({ ...features, auth_portfolio: e.target.checked })}
                      />
                      <span className="switch_label">Portfolio</span>
                    </label>
                  </div>
                  <div className="feature_item">
                    <label className="switch_container">
                      <DefaultSwitch
                        checked={features.auth_page || false}
                        onChange={(e) => setFeatures({ ...features, auth_page: e.target.checked })}
                      />
                      <span className="switch_label">Pages</span>
                    </label>
                  </div>
                  <div className="feature_item">
                    <label className="switch_container">
                      <DefaultSwitch
                        checked={features.auth_blog || false}
                        onChange={(e) => setFeatures({ ...features, auth_blog: e.target.checked })}
                      />
                      <span className="switch_label">Blog</span>
                    </label>
                  </div>
                  <div className="feature_item">
                    <label className="switch_container">
                      <DefaultSwitch
                        checked={features.auth_ecom || false}
                        onChange={(e) => setFeatures({ ...features, auth_ecom: e.target.checked })}
                      />
                      <span className="switch_label">E-commerce</span>
                    </label>
                  </div>
                  <div className="feature_item">
                    <label className="switch_container">
                      <DefaultSwitch
                        checked={features.auth_newsletter || false}
                        onChange={(e) => setFeatures({ ...features, auth_newsletter: e.target.checked })}
                      />
                      <span className="switch_label">Newsletter</span>
                    </label>
                  </div>
                </div>
                <div style={{ marginTop: '2rem' }}>
                  <DefaultButton 
                    onClick={handleSaveFeatures}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={12} sx={{ color: 'white' }} /> : undefined}
                  >
                    Enregistrer
                  </DefaultButton>
                </div>
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
