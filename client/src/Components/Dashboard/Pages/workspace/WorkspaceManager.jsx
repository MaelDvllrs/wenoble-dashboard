import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';
import Axios from '../../../../service/AxiosConfig';

import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { PiGearSixBold } from "react-icons/pi";


// Internal imports
import { useWorkspace } from '../../../../Context/WorkspaceContext';
import { DefaultButton, SecondaryButton, RedButton, SelectField } from '../../../../Theme/element';
import { useSnackbar } from '../../../../Theme/snackbar';
import config from '../../../../config';
import './workspace.css'; 
import '../modification_site/Collection/collection.css';
import '../modification_site/Fields/Field.css'; 

const WorkspaceManager = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const { 
        workspaces, 
        selectedWorkspace, 
        selectWorkspace, 
        createWorkspace, 
        updateWorkspace, 
        deleteWorkspace,
        getWorkspaceMembers,
        addUserToWorkspace,
        loading 
    } = useWorkspace();
    const { showSnackbar } = useSnackbar();

    // États pour les modales
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [membersModalOpen, setMembersModalOpen] = useState(false);
    const [addUserModalOpen, setAddUserModalOpen] = useState(false);

    // États pour les formulaires
    const [workspaceForm, setWorkspaceForm] = useState({
        workspace_name: '',
        workspace_description: ''
    });
    const [editingWorkspace, setEditingWorkspace] = useState(null);
    const [deletingWorkspace, setDeletingWorkspace] = useState(null);
    const [members, setMembers] = useState([]);
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserRole, setNewUserRole] = useState('member');
    const [currentWorkspaceForMembers, setCurrentWorkspaceForMembers] = useState(null);

    // Récupérer le token et l'ID utilisateur
    const token = Cookies.get('token');
    const currentUserId = jwtDecode(token).idUser;
    const apiUrl = config.apiUrl;

    // Gestionnaires de formulaires
    const handleCreateWorkspace = async () => {
        try {
            await createWorkspace(workspaceForm);
            setCreateModalOpen(false);
            setWorkspaceForm({ workspace_name: '', workspace_description: '' });
        } catch (error) {
            // L'erreur est déjà gérée dans le contexte
        }
    };

    const handleEditWorkspace = async () => {
        try {
            await updateWorkspace({
                workspace_id: editingWorkspace.id,
                workspace_name: workspaceForm.workspace_name,
                workspace_description: workspaceForm.workspace_description
            });
            setEditModalOpen(false);
            setEditingWorkspace(null);
            setWorkspaceForm({ workspace_name: '', workspace_description: '' });
        } catch (error) {
            // L'erreur est déjà gérée dans le contexte
        }
    };

    const handleDeleteWorkspace = async () => {
        try {
            await deleteWorkspace(deletingWorkspace.id);
            setDeleteModalOpen(false);
            setDeletingWorkspace(null);
        } catch (error) {
            // L'erreur est déjà gérée dans le contexte
        }
    };

    const handleLoadMembers = async (workspace) => {
        try {
            const membersData = await getWorkspaceMembers(workspace.id);
            setMembers(membersData);
            setCurrentWorkspaceForMembers(workspace);
            setMembersModalOpen(true);
        } catch (error) {
            showSnackbar('error', 'Erreur lors du chargement des membres');
        }
    };

    const handleAddUser = async () => {
        try {
            await addUserToWorkspace(currentWorkspaceForMembers.id, newUserEmail, newUserRole);
            setAddUserModalOpen(false);
            setNewUserEmail('');
            setNewUserRole('member');
            // Recharger les membres
            const membersData = await getWorkspaceMembers(currentWorkspaceForMembers.id);
            setMembers(membersData);
        } catch (error) {
            // L'erreur est déjà gérée dans le contexte
        }
    };

    // Changer le rôle d'un utilisateur
    const handleChangeUserRole = async (userId, newRole) => {
        try {
            console.log(`Changement du rôle de l'utilisateur ${userId} à ${newRole}`);
            // Appel API pour changer le rôle
            const response = await Axios.post(`${apiUrl}/updateUserWorkspaceRole`, {
                workspace_id: currentWorkspaceForMembers.id,
                user_id: userId,
                role: newRole
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            showSnackbar('success', 'Rôle modifié avec succès');
            // Recharger les membres
            const membersData = await getWorkspaceMembers(currentWorkspaceForMembers.id);
            setMembers(membersData);
        } catch (error) {
            console.error('Erreur lors de la modification du rôle:', error);
            if (error.response?.data?.error) {
                showSnackbar('error', error.response.data.error);
            } else {
                showSnackbar('error', 'Erreur lors de la modification du rôle');
            }
        }
    };

    // Ouvrir la modale d'édition
    const openEditModal = (workspace) => {
        setEditingWorkspace(workspace);
        setWorkspaceForm({
            workspace_name: workspace.workspace_name,
            workspace_description: workspace.workspace_description || ''
        });
        setEditModalOpen(true);
    };

    // Ouvrir la modale de suppression
    const openDeleteModal = (workspace) => {
        setDeletingWorkspace(workspace);
        setDeleteModalOpen(true);
    };

    if (loading) {
        return (
            <div className="outlet">
                <div className="title_section">
                    <div className="breadcrumb">
                        <span 
                            className="breadcrumb-item" 
                            onClick={() => navigate('/dashboard')}
                            style={{ cursor: 'pointer', color: theme.palette.text.secondary }}
                        >
                            Dashboard
                        </span>
                        <span className="breadcrumb-separator" style={{ color: theme.palette.text.secondary }}> / </span>
                        <span className="breadcrumb-item-active" style={{ color: theme.palette.text.primary }}>
                            Workspaces
                        </span>
                    </div>
                </div>
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    height: '200px',
                    color: theme.palette.text.primary 
                }}>
                    Chargement...
                </div>
            </div>
        );
    }

    return (
        <div className="outlet">
            {/* Section titre avec breadcrumb */}
            <div className="title_section">
                <div className="breadcrumb">
                    <span 
                        className="breadcrumb-item" 
                        onClick={() => navigate('/dashboard')}
                        style={{ cursor: 'pointer', color: theme.palette.text.secondary }}
                    >
                        Dashboard
                    </span>
                    <span className="breadcrumb-separator" style={{ color: theme.palette.text.secondary }}> / </span>
                    <span className="breadcrumb-item-active" style={{ color: theme.palette.text.primary }}>
                        Workspaces
                    </span>
                </div>
            </div>

            {/* Section principale */}
            <div className="dashboard_case_empty edit-case_empty">
                <div className="header_modification header_page_modification">
                    <h3 className="titlePage">Gestion des Workspaces</h3>
                    <div className="actions-section">
                        <DefaultButton
                            variant="contained"
                            onClick={() => setCreateModalOpen(true)}
                            sx={{ backgroundColor: theme.palette.primary.main }}
                        >
                            Créer un Workspace
                        </DefaultButton>
                    </div>
                </div>

                <div className="workspace-list">
                    {workspaces.length === 0 ? (
                        <div style={{ 
                            textAlign: 'center', 
                            padding: '2rem',
                            color: theme.palette.text.primary 
                        }}>
                            <h4>Aucun workspace trouvé</h4>
                            <p>Créez votre premier workspace pour commencer.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {workspaces.map((workspace) => (
                                <div 
                                    key={workspace.id}
                                    className={`workspace-item ${selectedWorkspace?.id === workspace.id ? 'active' : ''}`}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ flex: 1 }}>
                                            <h4 style={{ 
                                                color: theme.palette.text.primary,
                                                margin: '0 0 0.5rem 0',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem'
                                            }}>
                                                {workspace.workspace_name}
                                                {workspace.is_default && (
                                                    <span style={{
                                                        fontSize: '0.75rem',
                                                        backgroundColor: theme.palette.primary.third,
                                                        color: theme.palette.text.primary,
                                                        padding: '0.25rem 0.5rem',
                                                        borderRadius: '12px'
                                                    }}>
                                                        Par défaut
                                                    </span>
                                                )}
                                                {selectedWorkspace?.id === workspace.id && (
                                                    <span className='workspace-selector-current'>
                                                        Actuel
                                                    </span>
                                                )}
                                            </h4>
                                            <p style={{ 
                                                color: theme.palette.text.secondary,
                                                margin: '0 0 1rem 0'
                                            }}>
                                                {workspace.workspace_description || 'Aucune description'}
                                            </p>
                                            <div style={{ 
                                                fontSize: '0.875rem',
                                                color: theme.palette.text.secondary 
                                            }}>
                                                Rôle: {workspace.user_role} • 
                                                Créé le {new Date(workspace.created_at).toLocaleDateString('fr-FR')}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            {selectedWorkspace?.id !== workspace.id && (
                                                <SecondaryButton
                                                    variant="outlined"
                                                    onClick={() => selectWorkspace(workspace)}
                                                    size="small"
                                                >
                                                    Sélectionner
                                                </SecondaryButton>
                                            )}
                                            <SecondaryButton
                                                variant="outlined"
                                                onClick={() => handleLoadMembers(workspace)}
                                                size="small"
                                            >
                                                <GroupOutlinedIcon fontSize="small" />
                                            </SecondaryButton>
                                            {workspace.user_role === 'admin' && (
                                                <>
                                                    <SecondaryButton
                                                        variant="outlined"
                                                        onClick={() => openEditModal(workspace)}
                                                        size="small"
                                                    >
                                                        <PiGearSixBold className='action_icon' />

                                                    </SecondaryButton>
                                                    {!workspace.is_default && (
                                                        <RedButton
                                                            variant="outlined"
                                                            onClick={() => openDeleteModal(workspace)}
                                                            size="small"
                                                        >
                                                            Supprimer
                                                        </RedButton>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modale de création */}
            <Dialog 
                open={createModalOpen} 
                onClose={() => setCreateModalOpen(false)} 
                maxWidth="sm" 
                fullWidth 
                sx={{
                    '& .MuiPaper-root': {
                        backgroundColor: theme.palette.primary.main,
                        color: theme.palette.text.primary,
                        border: `1px solid ${theme.palette.primary.third}`,
                    }
                }}
            >
                <DialogTitle style={{ color: theme.palette.text.primary }}>
                    Créer un nouveau workspace
                </DialogTitle>
                <DialogContent>
                    <div className="input-group">
                        <div className="input-container">
                            <p className='blogField_name collection_edit_name'>Nom du workspace *</p>
                            <input
                                autoFocus
                                className="input_text_blog"
                                value={workspaceForm.workspace_name}
                                onChange={(e) => setWorkspaceForm(prev => ({ ...prev, workspace_name: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="input-container">
                            <p className='blogField_name collection_edit_name'>Description (optionnel)</p>
                            <textarea
                                className="input_text_blog"
                                rows={3}
                                value={workspaceForm.workspace_description}
                                onChange={(e) => setWorkspaceForm(prev => ({ ...prev, workspace_description: e.target.value }))}
                                style={{ resize: 'vertical', fontFamily: 'inherit' }}
                            />
                        </div>
                    </div>
                </DialogContent>
                <DialogActions>
                    <SecondaryButton onClick={() => setCreateModalOpen(false)}>
                        Annuler
                    </SecondaryButton>
                    <DefaultButton 
                        onClick={handleCreateWorkspace}
                        disabled={!workspaceForm.workspace_name.trim()}
                    >
                        Créer
                    </DefaultButton>
                </DialogActions>
            </Dialog>

            {/* Modale d'édition */}
            <Dialog 
                open={editModalOpen} 
                onClose={() => setEditModalOpen(false)} 
                maxWidth="sm" 
                fullWidth
                sx={{
                    '& .MuiPaper-root': {
                        backgroundColor: theme.palette.primary.main,
                        color: theme.palette.text.primary,
                        border: `1px solid ${theme.palette.primary.third}`,
                    }
                }}
            >
                <DialogTitle style={{ color: theme.palette.text.primary }}>
                    Modifier le workspace
                </DialogTitle>
                <DialogContent>
                    <div className="input-group">
                        <div className="input-container">
                            <p className='blogField_name collection_edit_name'>Nom du workspace *</p>
                            <input
                                autoFocus
                                className="input_text_blog"
                                value={workspaceForm.workspace_name}
                                onChange={(e) => setWorkspaceForm(prev => ({ ...prev, workspace_name: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="input-container">
                            <p className='blogField_name collection_edit_name'>Description (optionnel)</p>
                            <textarea
                                className="input_text_blog"
                                rows={3}
                                value={workspaceForm.workspace_description}
                                onChange={(e) => setWorkspaceForm(prev => ({ ...prev, workspace_description: e.target.value }))}
                                style={{ resize: 'vertical', fontFamily: 'inherit' }}
                            />
                        </div>
                    </div>
                </DialogContent>
                <DialogActions>
                    <SecondaryButton onClick={() => setEditModalOpen(false)}>
                        Annuler
                    </SecondaryButton>
                    <DefaultButton 
                        onClick={handleEditWorkspace}
                        disabled={!workspaceForm.workspace_name.trim()}
                    >
                        Sauvegarder
                    </DefaultButton>
                </DialogActions>
            </Dialog>

            {/* Modale de suppression */}
            <Dialog 
                open={deleteModalOpen} 
                onClose={() => setDeleteModalOpen(false)} 
                maxWidth="sm" 
                fullWidth
                sx={{
                    '& .MuiPaper-root': {
                        backgroundColor: theme.palette.primary.main,
                        color: theme.palette.text.primary,
                        border: `1px solid ${theme.palette.primary.third}`,
                    }
                }}
            >
                <DialogTitle style={{ color: theme.palette.text.primary }}>
                    Supprimer le workspace
                </DialogTitle>
                <DialogContent>
                    <p style={{ color: theme.palette.text.primary }}>
                        Êtes-vous sûr de vouloir supprimer le workspace "{deletingWorkspace?.workspace_name}" ?
                    </p>
                    <p style={{ color: theme.palette.text.secondary, fontSize: '0.875rem' }}>
                        Tous les sites web de ce workspace seront déplacés vers votre workspace par défaut.
                    </p>
                </DialogContent>
                <DialogActions>
                    <SecondaryButton onClick={() => setDeleteModalOpen(false)}>
                        Annuler
                    </SecondaryButton>
                    <DefaultButton 
                        onClick={handleDeleteWorkspace}
                        sx={{ 
                            backgroundColor: theme.palette.error.main,
                            '&:hover': { backgroundColor: theme.palette.error.dark }
                        }}
                    >
                        Supprimer
                    </DefaultButton>
                </DialogActions>
            </Dialog>

            {/* Modale des membres */}
            <Dialog 
                open={membersModalOpen} 
                onClose={() => setMembersModalOpen(false)} 
                maxWidth="md" 
                fullWidth
                sx={{
                    '& .MuiPaper-root': {
                        backgroundColor: theme.palette.primary.main,
                        color: theme.palette.text.primary,
                        border: `1px solid ${theme.palette.primary.third}`,
                    }
                }}
            >
                <DialogTitle style={{ color: theme.palette.text.primary }}>
                    Membres du workspace "{currentWorkspaceForMembers?.workspace_name}"
                </DialogTitle>
                <DialogContent>
                    <div style={{ marginBottom: '1rem' }}>
                        {currentWorkspaceForMembers?.user_role === 'admin' && (
                            <DefaultButton
                                variant="contained"
                                onClick={() => setAddUserModalOpen(true)}
                                sx={{ backgroundColor: theme.palette.primary.main }}
                            >
                                Ajouter un utilisateur
                            </DefaultButton>
                        )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {members.map((member) => (
                            <div 
                                key={member.id}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '1rem',
                                    border: `1px solid ${theme.palette.primary.third}`,
                                    borderRadius: '4px',
                                    backgroundColor: theme.palette.primary.main
                                }}
                            >
                                <div style={{ flex: 1 }}>
                                    <div style={{ color: theme.palette.text.primary, fontWeight: 'bold' }}>
                                        {member.username}
                                    </div>
                                    <div style={{ color: theme.palette.text.secondary, fontSize: '0.875rem' }}>
                                        {member.email}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    {/* Affichage du rôle - select si admin et pas soi-même, sinon badge */}
                                    {currentWorkspaceForMembers?.user_role === 'admin' && member.id !== currentUserId ? (
                                        <div className="input-container" style={{ margin: 0, minWidth: '150px' }}>
                                            <SelectField
                                                sx={{ width: '100%' }}
                                                size="small"
                                                value={member.role}
                                                onChange={(e) => handleChangeUserRole(member.id, e.target.value)}
                                                displayEmpty
                                                renderValue={(selected) => {
                                                    const roleLabels = {
                                                        viewer: 'Spectateur',
                                                        member: 'Membre',
                                                        admin: 'Administrateur'
                                                    };
                                                    return roleLabels[selected] || selected;
                                                }}
                                            >
                                                <MenuItem value="viewer">
                                                    <div>
                                                        <div style={{ fontWeight: 'bold' }}>Spectateur</div>
                                                        <div style={{ fontSize: '0.75rem', color: theme.palette.text.secondary }}>
                                                            Peut uniquement consulter le contenu
                                                        </div>
                                                    </div>
                                                </MenuItem>
                                                <MenuItem value="member">
                                                    <div>
                                                        <div style={{ fontWeight: 'bold' }}>Membre</div>
                                                        <div style={{ fontSize: '0.75rem', color: theme.palette.text.secondary }}>
                                                            Peut créer et modifier du contenu
                                                        </div>
                                                    </div>
                                                </MenuItem>
                                                <MenuItem value="admin">
                                                    <div>
                                                        <div style={{ fontWeight: 'bold' }}>Administrateur</div>
                                                        <div style={{ fontSize: '0.75rem', color: theme.palette.text.secondary }}>
                                                            Peut gérer le workspace et les membres
                                                        </div>
                                                    </div>
                                                </MenuItem>
                                            </SelectField>
                                        </div>
                                    ) : (
                                        <span className={`workspace-selector-role ${member.role}`}>
                                            {member.role}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </DialogContent>
                <DialogActions>
                    <SecondaryButton onClick={() => setMembersModalOpen(false)}>
                        Fermer
                    </SecondaryButton>
                </DialogActions>
            </Dialog>

            {/* Modale d'ajout d'utilisateur */}
            <Dialog 
                open={addUserModalOpen} 
                onClose={() => setAddUserModalOpen(false)} 
                maxWidth="sm" 
                fullWidth
                sx={{
                    '& .MuiPaper-root': {
                        backgroundColor: theme.palette.primary.main,
                        color: theme.palette.text.primary,
                        border: `1px solid ${theme.palette.primary.third}`,
                    }
                }}
            >
                <DialogTitle style={{ color: theme.palette.text.primary }}>
                    Ajouter un utilisateur au workspace
                </DialogTitle>
                <DialogContent>
                    <div className="input-group">
                        <div className="input-container">
                            <p className='blogField_name collection_edit_name'>Email de l'utilisateur *</p>
                            <input
                                autoFocus
                                type="email"
                                className="input_text_blog"
                                value={newUserEmail}
                                onChange={(e) => setNewUserEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="input-container">
                            <p className='blogField_name collection_edit_name'>Rôle</p>
                            <SelectField
                                sx={{ width: '100%' }}
                                value={newUserRole}
                                onChange={(e) => setNewUserRole(e.target.value)}
                                displayEmpty
                                renderValue={(selected) => {
                                    const roleLabels = {
                                        viewer: 'Spectateur',
                                        member: 'Membre',
                                        admin: 'Administrateur'
                                    };
                                    return roleLabels[selected] || selected;
                                }}
                            >
                                <MenuItem value="viewer">
                                    <div>
                                        <div style={{ fontWeight: 'bold' }}>Spectateur</div>
                                        <div style={{ fontSize: '0.75rem', color: theme.palette.text.secondary }}>
                                            Peut uniquement consulter le contenu
                                        </div>
                                    </div>
                                </MenuItem>
                                <MenuItem value="member">
                                    <div>
                                        <div style={{ fontWeight: 'bold' }}>Membre</div>
                                        <div style={{ fontSize: '0.75rem', color: theme.palette.text.secondary }}>
                                            Peut créer et modifier du contenu
                                        </div>
                                    </div>
                                </MenuItem>
                                <MenuItem value="admin">
                                    <div>
                                        <div style={{ fontWeight: 'bold' }}>Administrateur</div>
                                        <div style={{ fontSize: '0.75rem', color: theme.palette.text.secondary }}>
                                            Peut gérer le workspace et les membres
                                        </div>
                                    </div>
                                </MenuItem>
                            </SelectField>
                        </div>
                    </div>
                </DialogContent>
                <DialogActions>
                    <SecondaryButton onClick={() => setAddUserModalOpen(false)}>
                        Annuler
                    </SecondaryButton>
                    <DefaultButton 
                        onClick={handleAddUser}
                        disabled={!newUserEmail.trim()}
                    >
                        Ajouter
                    </DefaultButton>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default WorkspaceManager;
