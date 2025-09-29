import React, { useState, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import { 
  Box, 
  Typography, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  TextField,
  Chip,
  FormControlLabel,
  Alert,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ContentCopy as ContentCopyIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';
import Cookies from 'js-cookie';
import config from '../../../../config';
import Axios from '../../../../service/AxiosConfig';
import { useSnackbar } from '../../../../Theme/snackbar';
import { DefaultButton, SecondaryButton, RedButton, DefaultSwitch, CopyButton, CopyField } from '../../../../Theme/element';

const APITokensManager = ({ websiteId }) => {
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const token = Cookies.get('token');
  const apiUrl = config.apiUrl;

  // États
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [tokenToDelete, setTokenToDelete] = useState(null);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [generatedToken, setGeneratedToken] = useState('');

  // État du formulaire de création
  const [newToken, setNewToken] = useState({
    tokenName: '',
    permissions: ['cms']
  });

  // Charger les tokens au montage du composant
  useEffect(() => {
    if (websiteId) {
      loadTokens();
    }
  }, [websiteId]);

  // Charger les tokens depuis l'API
  const loadTokens = async () => {
    setLoading(true);
    try {
      const response = await Axios.get(`${apiUrl}/getAPITokens`, {
        params: { websiteId },
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setTokens(response.data.tokens);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des tokens:', error);
      showSnackbar('Erreur lors du chargement des tokens API', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Créer un nouveau token
  const handleCreateToken = async () => {
    if (!newToken.tokenName.trim()) {
      showSnackbar('Le nom du token est requis', 'error');
      return;
    }

    try {
      const response = await Axios.post(`${apiUrl}/createAPIToken`, {
        websiteId,
        tokenName: newToken.tokenName.trim(),
        permissions: newToken.permissions
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.success) {
        setGeneratedToken(response.data.token.apiToken);
        setShowTokenModal(true);
        setCreateModalOpen(false);
        setNewToken({ tokenName: '', permissions: ['cms'] });
        loadTokens();
        showSnackbar('Token API créé avec succès', 'success');
      }
    } catch (error) {
      console.error('Erreur lors de la création du token:', error);
      showSnackbar(error.response?.data?.error || 'Erreur lors de la création du token', 'error');
    }
  };

  // Supprimer un token
  const handleDeleteToken = async () => {
    if (!tokenToDelete) return;

    try {
      const response = await Axios.delete(`${apiUrl}/deleteAPIToken`, {
        data: { 
          tokenId: tokenToDelete.id, 
          websiteId 
        },
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.success) {
        loadTokens();
        showSnackbar('Token API supprimé avec succès', 'success');
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du token:', error);
      showSnackbar(error.response?.data?.error || 'Erreur lors de la suppression du token', 'error');
    } finally {
      setDeleteModalOpen(false);
      setTokenToDelete(null);
    }
  };

  // Basculer l'état actif/inactif d'un token
  const handleToggleToken = async (tokenId, currentStatus) => {
    try {
      const response = await Axios.put(`${apiUrl}/toggleAPIToken`, {
        tokenId,
        websiteId,
        isActive: !currentStatus
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.success) {
        loadTokens();
        showSnackbar(`Token ${!currentStatus ? 'activé' : 'désactivé'} avec succès`, 'success');
      }
    } catch (error) {
      console.error('Erreur lors de la modification du token:', error);
      showSnackbar(error.response?.data?.error || 'Erreur lors de la modification du token', 'error');
    }
  };

  // Copier le token dans le presse-papiers (pour le bouton)
  const handleCopyToken = async () => {
    try {
      await navigator.clipboard.writeText(generatedToken);
      showSnackbar('Token copié dans le presse-papiers', 'success');
    } catch (error) {
      console.error('Erreur lors de la copie:', error);
      showSnackbar('Erreur lors de la copie du token', 'error');
    }
  };

  // Formater la date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('fr-FR');
  };

  return (
    <div>
      <div className="input-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 className='titlePage'>Tokens API</h4>
            <p className="blogField_description">
              Gérez les tokens d'accès pour les applications externes
            </p>
          </div>
          <DefaultButton
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateModalOpen(true)}
            disabled={loading}
          >
            Créer un token
          </DefaultButton>
        </div>
      </div>

      {/* Table des tokens */}
      {tokens.length > 0 ? (
        <div className="input-container">
          <div className="table_container">
            <table className="data_table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Permissions</th>
                  <th>Créé par</th>
                  <th>Créé le</th>
                  <th>Dernière utilisation</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((apiToken) => (
                  <tr key={apiToken.id}>
                    <td className='website-user-td'>{apiToken.name}</td>
                    <td className='website-user-td'>
                      {apiToken.permissions.map(perm => (
                        <span 
                          key={perm} 
                          className={`website-selector-role ${perm}`}
                          style={{ marginRight: '0.5rem' }}
                        >
                          {perm.toUpperCase()}
                        </span>
                      ))}
                    </td>
                    <td className='website-user-td'>{apiToken.created_by}</td>
                    <td className='website-user-td'>{formatDate(apiToken.created_at)}</td>
                    <td className='website-user-td'>
                      {apiToken.last_used_at 
                        ? formatDate(apiToken.last_used_at) 
                        : 'Jamais utilisé'
                      }
                    </td>
                    <td className='website-user-td'>
                      <FormControlLabel
                        control={
                          <DefaultSwitch
                            checked={apiToken.is_active}
                            onChange={() => handleToggleToken(apiToken.id, apiToken.is_active)}
                            size="small"
                          />
                        }
                        label={apiToken.is_active ? 'Actif' : 'Inactif'}
                      />
                    </td>
                    <td>
                      <div className="action_buttons">
                        <RedButton
                          onClick={() => {
                            setTokenToDelete(apiToken);
                            setDeleteModalOpen(true);
                          }}
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
      ) : (
        <div className="input-container">
          <p className="blogField_name collection_edit_name">Tokens API du site</p>
          <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
            Aucun token API créé pour ce site
          </Typography>
        </div>
      )}

      {/* Modal de création de token */}
      <Dialog 
        open={createModalOpen} 
        onClose={() => setCreateModalOpen(false)}
        maxWidth="sm"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            padding: "1rem",
            borderRadius: "0.5rem",
            backgroundColor: theme.palette.primary.main,
            border: `1px solid ${theme.palette.primary.third}`,
            boxShadow: theme.shadows[8],
          }
        }}
      >
        <DialogTitle sx={{ color: theme.palette.text.primary, padding: "0", marginBottom:"1rem" }}>
          Créer un nouveau token API
        </DialogTitle>
        <DialogContent sx={{ padding: '1rem 0' }}>
          <div className="input-container">
            <p className="blogField_name collection_edit_name">Nom du token *</p>
            <input
              className="input_text_blog"
              type="text"
              value={newToken.tokenName}
              onChange={(e) => setNewToken({ ...newToken, tokenName: e.target.value })}
              placeholder="Ex: Mon application mobile"
              style={{ 
                backgroundColor: theme.palette.primary.main,
                color: theme.palette.text.primary,
                border: `1px solid ${theme.palette.primary.third}`,
              }}
            />
          </div>
          
          <div className="input-container">
            <p className="blogField_name collection_edit_name">Permissions</p>
            <FormControlLabel
              control={
                <DefaultSwitch
                  checked={newToken.permissions.includes('cms')}
                  onChange={(e) => {
                    const perms = e.target.checked 
                      ? [...newToken.permissions, 'cms'].filter((v, i, a) => a.indexOf(v) === i)
                      : newToken.permissions.filter(p => p !== 'cms');
                    setNewToken({ ...newToken, permissions: perms });
                  }}
                />
              }
              label="CMS - Accès à la gestion de contenu"
              sx={{ color: theme.palette.text.primary }}
            />
            <p style={{ 
              fontSize: '0.8rem', 
              color: theme.palette.text.secondary, 
              marginTop: '0.5rem' 
            }}>
              Permet de créer, modifier et publier du contenu via l'API externe.
            </p>
          </div>
        </DialogContent>
        <DialogActions>
          <SecondaryButton onClick={() => setCreateModalOpen(false)}>
            Annuler
          </SecondaryButton>
          <DefaultButton onClick={handleCreateToken} variant="contained">
            Créer le token
          </DefaultButton>
        </DialogActions>
      </Dialog>

      {/* Modal d'affichage du token généré */}
      <Dialog 
        open={showTokenModal} 
        onClose={() => setShowTokenModal(false)}
        maxWidth="md"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            padding: "1rem",
            borderRadius: "0.5rem",
            backgroundColor: theme.palette.primary.main,
            border: `1px solid ${theme.palette.primary.third}`,
            boxShadow: theme.shadows[8],
          }
        }}
      >
        <DialogTitle sx={{ color: theme.palette.text.primary, padding: "0", marginBottom:"1rem" }}>
          Token API généré
        </DialogTitle>
        <DialogContent sx={{ padding: '1rem 0' }}>
          <Alert 
            severity="warning" 
            sx={{ 
              mb: 2,
              backgroundColor: '#ff9800',
              borderColor: '#ff9800',
              color: '#ffffff',
              border: '1px solid #ff9800',
              '& .MuiAlert-icon': {
                color: '#ffffff'
              }
            }}
          >
            <strong>Important :</strong> Ce token ne sera affiché qu'une seule fois. 
            Copiez-le et stockez-le dans un endroit sûr.
          </Alert>
          
          <CopyField
            textToCopy={generatedToken}
            successMessage="Token copié dans le presse-papiers"
            errorMessage="Erreur lors de la copie du token"
            onSuccess={(message) => showSnackbar(message, 'success')}
            onError={(message) => showSnackbar(message, 'error')}
            style={{
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              wordBreak: 'break-all',
              backgroundColor: theme.palette.primary.secondary,
              color: theme.palette.text.primary,
              border: `1px solid ${theme.palette.primary.third}`,
            }}
            iconSize="1rem"
          />
        </DialogContent>
        <DialogActions>
          <SecondaryButton 
            onClick={handleCopyToken} 
          >
            Copier
          </SecondaryButton>
          <DefaultButton onClick={() => setShowTokenModal(false)} variant="contained">
            J'ai sauvegardé le token
          </DefaultButton>
        </DialogActions>
      </Dialog>

      {/* Modal de confirmation de suppression */}
      <Dialog 
        open={deleteModalOpen} 
        onClose={() => setDeleteModalOpen(false)}
        sx={{
          '& .MuiDialog-paper': {
            padding: "1rem",
            borderRadius: "0.5rem",
            backgroundColor: theme.palette.primary.main,
            border: `1px solid ${theme.palette.primary.third}`,
            boxShadow: theme.shadows[8],
          }
        }}
      >
        <DialogTitle sx={{ color: theme.palette.text.primary }}>
          Supprimer le token API
        </DialogTitle>
        <DialogContent sx={{ padding: '1rem 0' }}>
          <Typography sx={{ color: theme.palette.text.primary }}>
            Êtes-vous sûr de vouloir supprimer le token "{tokenToDelete?.name}" ?
            Cette action est irréversible et toutes les applications utilisant ce token 
            perdront immédiatement l'accès à l'API.
          </Typography>
        </DialogContent>
        <DialogActions>
          <SecondaryButton onClick={() => setDeleteModalOpen(false)}>
            Annuler
          </SecondaryButton>
          <RedButton 
            onClick={handleDeleteToken} 
            variant="contained"
          >
            Supprimer
          </RedButton>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default APITokensManager;