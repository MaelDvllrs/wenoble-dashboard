import React, { createContext, useContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import config from '../config';
import Axios from '../service/AxiosConfig';
import { useSnackbar } from '../Theme/snackbar';

const WorkspaceContext = createContext();

export { WorkspaceContext };

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace doit être utilisé dans un WorkspaceProvider');
  }
  return context;
};

export const WorkspaceProvider = ({ children }) => {
  const [workspaces, setWorkspaces] = useState(() => {
    // Restaurer les workspaces depuis le localStorage
    try {
      const savedWorkspaces = localStorage.getItem('workspaces');
      return savedWorkspaces ? JSON.parse(savedWorkspaces) : [];
    } catch {
      return [];
    }
  });
  const [selectedWorkspace, setSelectedWorkspace] = useState(() => {
    // Restaurer le workspace sélectionné depuis le localStorage
    try {
      const savedWorkspace = localStorage.getItem('selectedWorkspace');
      return savedWorkspace ? JSON.parse(savedWorkspace) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { showSnackbar } = useSnackbar();
  const token = Cookies.get('token');
  const apiUrl = config.apiUrl;

  // Charger les workspaces de l'utilisateur
  const loadWorkspaces = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await Axios.get(`${apiUrl}/getUserWorkspaces`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (response.data && response.data.workspaces) {
        const newWorkspaces = response.data.workspaces;
        setWorkspaces(newWorkspaces);
        
        // Sauvegarder dans le localStorage
        localStorage.setItem('workspaces', JSON.stringify(newWorkspaces));
        
        // Sélectionner le workspace par défaut ou le premier disponible
        const defaultWorkspace = newWorkspaces.find(w => w.is_default) || newWorkspaces[0];
        if (defaultWorkspace && !selectedWorkspace) {
          setSelectedWorkspace(defaultWorkspace);
          localStorage.setItem('selectedWorkspaceId', defaultWorkspace.id.toString());
          localStorage.setItem('selectedWorkspace', JSON.stringify(defaultWorkspace));
        }
      } else {
        setWorkspaces([]);
        localStorage.removeItem('workspaces');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des workspaces:', error);
      setError(error.response?.data?.error || 'Erreur lors du chargement des workspaces');
      setWorkspaces([]);
    } finally {
      setLoading(false);
    }
  };

  // Créer un nouveau workspace
  const createWorkspace = async (workspaceData) => {
    try {
      const response = await Axios.post(`${apiUrl}/createWorkspace`, workspaceData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.workspace) {
        await loadWorkspaces(); // Recharger la liste
        showSnackbar('success', 'Workspace créé avec succès !');
        return response.data.workspace;
      }
    } catch (error) {
      console.error('Erreur lors de la création du workspace:', error);
      const errorMessage = error.response?.data?.error || 'Erreur lors de la création du workspace';
      showSnackbar('error', errorMessage);
      throw error;
    }
  };

  // Mettre à jour un workspace
  const updateWorkspace = async (workspaceData) => {
    try {
      const response = await Axios.post(`${apiUrl}/updateWorkspace`, workspaceData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.workspace) {
        await loadWorkspaces(); // Recharger la liste
        
        // Mettre à jour le workspace sélectionné si c'est celui qui a été modifié
        if (selectedWorkspace && selectedWorkspace.id === workspaceData.workspace_id) {
          setSelectedWorkspace(response.data.workspace);
        }
        
        showSnackbar('success', 'Workspace mis à jour avec succès !');
        return response.data.workspace;
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du workspace:', error);
      const errorMessage = error.response?.data?.error || 'Erreur lors de la mise à jour du workspace';
      showSnackbar('error', errorMessage);
      throw error;
    }
  };

  // Supprimer un workspace
  const deleteWorkspace = async (workspaceId) => {
    try {
      await Axios.delete(`${apiUrl}/deleteWorkspace?workspaceId=${workspaceId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Si c'était le workspace sélectionné, sélectionner le workspace par défaut
      if (selectedWorkspace && selectedWorkspace.id === workspaceId) {
        const remainingWorkspaces = workspaces.filter(w => w.id !== workspaceId);
        const defaultWorkspace = remainingWorkspaces.find(w => w.is_default) || remainingWorkspaces[0];
        setSelectedWorkspace(defaultWorkspace);
        localStorage.setItem('selectedWorkspaceId', defaultWorkspace?.id?.toString() || '');
        localStorage.setItem('selectedWorkspace', defaultWorkspace ? JSON.stringify(defaultWorkspace) : '');
      }

      await loadWorkspaces(); // Recharger la liste
      showSnackbar('success', 'Workspace supprimé avec succès !');
    } catch (error) {
      console.error('Erreur lors de la suppression du workspace:', error);
      const errorMessage = error.response?.data?.error || 'Erreur lors de la suppression du workspace';
      showSnackbar('error', errorMessage);
      throw error;
    }
  };

  // Changer le workspace sélectionné
  const selectWorkspace = (workspace) => {
    setSelectedWorkspace(workspace);
    localStorage.setItem('selectedWorkspaceId', workspace.id.toString());
    localStorage.setItem('selectedWorkspace', JSON.stringify(workspace));
  };

  // Récupérer les sites web d'un workspace
  const getWorkspaceWebsites = async (workspaceId) => {
    try {
      const response = await Axios.get(`${apiUrl}/getWorkspaceWebsites?workspaceId=${workspaceId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      return response.data.websites || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des sites web du workspace:', error);
      throw error;
    }
  };

  // Récupérer les membres d'un workspace
  const getWorkspaceMembers = async (workspaceId) => {
    try {
      const response = await Axios.get(`${apiUrl}/getWorkspaceMembers?workspaceId=${workspaceId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      return response.data.members || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des membres du workspace:', error);
      throw error;
    }
  };

  // Ajouter un utilisateur à un workspace
  const addUserToWorkspace = async (workspaceId, userEmail, role = 'member') => {
    try {
      const response = await Axios.post(`${apiUrl}/addUserToWorkspace`, {
        workspace_id: workspaceId,
        user_email: userEmail,
        role: role
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      showSnackbar('success', response.data.message || 'Utilisateur ajouté avec succès !');
      return response.data.user;
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'utilisateur:', error);
      const errorMessage = error.response?.data?.error || 'Erreur lors de l\'ajout de l\'utilisateur';
      showSnackbar('error', errorMessage);
      throw error;
    }
  };

  // Initialisation au montage du composant
  useEffect(() => {
    if (token) {
      // Si nous avons des données en cache et un workspace sélectionné, ne pas afficher le loading
      if (workspaces.length > 0 && selectedWorkspace) {
        setLoading(false);
      }
      
      loadWorkspaces();
    } else {
      // Pas de token, nettoyer le localStorage
      localStorage.removeItem('workspaces');
      localStorage.removeItem('selectedWorkspace');
      localStorage.removeItem('selectedWorkspaceId');
      setWorkspaces([]);
      setSelectedWorkspace(null);
      setLoading(false);
    }
  }, [token]);

  // Mettre à jour le workspace sélectionné quand les workspaces sont chargés
  useEffect(() => {
    if (workspaces.length > 0) {
      let workspaceToSelect = selectedWorkspace;
      
      // Vérifier si le workspace sélectionné existe encore dans la liste
      if (selectedWorkspace) {
        const stillExists = workspaces.find(w => w.id === selectedWorkspace.id);
        if (!stillExists) {
          workspaceToSelect = null;
        }
      }
      
      // Si pas de workspace sélectionné valide, en chercher un
      if (!workspaceToSelect) {
        const savedWorkspaceId = localStorage.getItem('selectedWorkspaceId');
        
        if (savedWorkspaceId) {
          workspaceToSelect = workspaces.find(w => w.id.toString() === savedWorkspaceId);
        }
        
        if (!workspaceToSelect) {
          workspaceToSelect = workspaces.find(w => w.is_default) || workspaces[0];
        }
        
        if (workspaceToSelect) {
          setSelectedWorkspace(workspaceToSelect);
          localStorage.setItem('selectedWorkspaceId', workspaceToSelect.id.toString());
          localStorage.setItem('selectedWorkspace', JSON.stringify(workspaceToSelect));
        }
      }
    }
  }, [workspaces]);

  // Synchroniser les changements de workspaces avec le localStorage
  useEffect(() => {
    if (workspaces.length > 0) {
      localStorage.setItem('workspaces', JSON.stringify(workspaces));
    }
  }, [workspaces]);

  // Synchroniser les changements de selectedWorkspace avec le localStorage
  useEffect(() => {
    if (selectedWorkspace) {
      localStorage.setItem('selectedWorkspace', JSON.stringify(selectedWorkspace));
      localStorage.setItem('selectedWorkspaceId', selectedWorkspace.id.toString());
    }
  }, [selectedWorkspace]);

  const value = {
    // État
    workspaces,
    selectedWorkspace,
    loading,
    error,
    
    // Actions
    loadWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    selectWorkspace,
    getWorkspaceWebsites,
    getWorkspaceMembers,
    addUserToWorkspace,
    
    // Fonction helper
    refreshWorkspaces: loadWorkspaces // Alias pour la compatibilité
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export default WorkspaceContext;
