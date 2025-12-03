import React, { useState, useEffect } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { CircularProgress, MenuItem } from '@mui/material';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';
import './website.css'

// Internal imports
import config from '../../../../config';
import Axios from '../../../../service/AxiosConfig';
import { useSnackbar } from '../../../../Theme/snackbar';
import { useWebsite } from '../../../../Context/WebsiteContext';
import { useWorkspace } from '../../../../Context/WorkspaceContext';
import { DefaultButton, SecondaryButton, SelectField } from '../../../../Theme/element';

const CreateWebsite = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const token = Cookies.get('token');
    const apiUrl = config.apiUrl;
    const { showSnackbar } = useSnackbar();
    const { refreshWebsites } = useWebsite();
    const { workspaces, selectedWorkspace, loading: workspaceLoading } = useWorkspace();

    // États
    const [websiteName, setWebsiteName] = useState('');
    const [websiteDescription, setWebsiteDescription] = useState('');
    const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('');
    const [visibility, setVisibility] = useState('workspace');
    const [loading, setLoading] = useState(false);

    // Initialiser le workspace sélectionné
    useEffect(() => {
        if (selectedWorkspace && !selectedWorkspaceId) {
            setSelectedWorkspaceId(selectedWorkspace.id.toString());
        }
    }, [selectedWorkspace, selectedWorkspaceId]);

    // Vérifier si l'utilisateur est admin du workspace sélectionné
    const isAdminOfSelectedWorkspace = () => {
        if (!selectedWorkspaceId) return false;
        const workspace = workspaces.find(w => w.id.toString() === selectedWorkspaceId);
        return workspace?.user_role === 'admin';
    };

    const handleCreateWebsite = async () => {
        if (!websiteName.trim()) {
            showSnackbar('error', 'Le nom du site web est requis');
            return;
        }

        if (!selectedWorkspaceId) {
            showSnackbar('error', 'Veuillez sélectionner un workspace');
            return;
        }

        setLoading(true);

        try {
            const response = await Axios.post(`${apiUrl}/createWebsite`, {
                website_name: websiteName,
                workspace_id: selectedWorkspaceId,
                visibility: visibility
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            showSnackbar('success', 'Site web créé avec succès !');
            
            // Rafraîchir la liste des sites web
            await refreshWebsites();
            
            // Rediriger vers la liste des sites web
            navigate('/dashboard/home');
            
        } catch (error) {
            console.error('Erreur lors de la création du site web :', error);
            const errorMessage = error.response?.data?.error || 'Erreur lors de la création du site web';
            showSnackbar('error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

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
                        Créer un site
                    </span>
                </div>

            </div>

            {/* Section principale */}
            <div className="dashboard_case_empty edit-case_empty">
                    <div className="create-website-wrapper">
                            <div className="creation-website-header">
                                <h3 className="titlePage">Créer un site</h3>
                                <div className="actions-section">
                                    <SecondaryButton
                                        variant="outlined"
                                        onClick={() => navigate('/dashboard/websites')}
                                        disabled={loading}
                                    >
                                        Annuler
                                    </SecondaryButton>
                                    <DefaultButton
                                        variant="contained"
                                        onClick={handleCreateWebsite}
                                        disabled={loading || !websiteName.trim() || !selectedWorkspaceId || !isAdminOfSelectedWorkspace()}
                                        startIcon={loading ? <CircularProgress size={12} sx={{ color: 'white' }} /> : undefined}
                                    >
                                        Créer
                                    </DefaultButton>
                                </div>
                            </div>
                    <div className="creation-site-wrapper-info">
                        <div className="input-container">
                            <p className='blogField_name collection_edit_name'>Nom du site web *</p>
                            <input
                                type="text"
                                className="input_text_blog"
                                value={websiteName}
                                onChange={(e) => setWebsiteName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="input-container">
                            <p className="blogField_name collection_edit_name">Workspace *</p>
                            <SelectField
                                value={selectedWorkspaceId}
                                onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                                required
                                disabled={workspaceLoading}
                                displayEmpty
                                sx={{ width: '100%' }}
                            >
                                <MenuItem value="">Sélectionner un workspace</MenuItem>
                                {workspaces.map((workspace) => (
                                    <MenuItem key={workspace.id} value={workspace.id}>
                                        {workspace.workspace_name} {workspace.is_default ? '(Par défaut)' : ''}
                                        {workspace.user_role !== 'admin' && ' - Non admin'}
                                    </MenuItem>
                                ))}
                            </SelectField>
                            {selectedWorkspaceId && !isAdminOfSelectedWorkspace() && (
                                <div style={{ 
                                    fontSize: '0.875rem', 
                                    color: theme.palette.error.main, 
                                    marginTop: '0.5rem',
                                    padding: '0.5rem',
                                    backgroundColor: theme.palette.error.light + '20',
                                    borderRadius: '4px',
                                    border: `1px solid ${theme.palette.error.light}`
                                }}>
                                    ⚠️ Vous devez être administrateur de ce workspace pour créer un site web.
                                </div>
                            )}
                        </div>

                        <div className="input-container">
                            <p className="blogField_name collection_edit_name">Visibilité *</p>
                            <SelectField
                                value={visibility}
                                onChange={(e) => setVisibility(e.target.value)}
                                required
                                sx={{ width: '100%' }}
                            >
                                <MenuItem value="workspace">Tous les membres du workspace</MenuItem>
                                <MenuItem value="restricted">Utilisateurs ajoutés seulement</MenuItem>
                            </SelectField>
                            <div style={{ 
                                fontSize: '0.875rem', 
                                color: theme.palette.text.secondary, 
                                marginTop: '0.5rem' 
                            }}>
                                {visibility === 'workspace' 
                                    ? 'Ce site sera visible par tous les membres du workspace sélectionné'
                                    : 'Ce site sera visible seulement par les utilisateurs que vous ajouterez explicitement'
                                }
                            </div>
                        </div>

                        </div>
                    </div>
            </div>
        </div>
    );
};

export default CreateWebsite;
