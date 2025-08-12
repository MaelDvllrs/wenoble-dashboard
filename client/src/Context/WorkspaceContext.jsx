import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
  const MIN_SKELETON_MS = 150; // durée minimale pour voir le skeleton (anti flicker)
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
  const [initialLoading, setInitialLoading] = useState(true); // pour le tout premier cycle réseau
  const [error, setError] = useState(null);
  const { showSnackbar } = useSnackbar();
  // Gestion du token (détection dynamique des changements de session)
  const [authToken, setAuthToken] = useState(() => Cookies.get('token') || null);
  const previousUserIdRef = useRef(null);
  const pollingRef = useRef(null);
  const mountedRef = useRef(true);
  const apiUrl = config.apiUrl;

  // Extraction de l'ID utilisateur depuis le JWT (supabase ou custom)
  const extractUserIdFromToken = (token) => {
    if (!token) return null;
    try {
      const base64 = token.split('.')[1];
      if (!base64) return null;
      const json = JSON.parse(atob(base64.replace(/-/g, '+').replace(/_/g, '/')));
      return json.sub || json.user_id || json.id || json.uid || null;
    } catch {
      return null;
    }
  };

  // Polling léger (toutes les 1.5s) pour détecter changement du cookie token
  useEffect(() => {
    pollingRef.current = setInterval(() => {
      const current = Cookies.get('token') || null;
      setAuthToken(prev => (prev !== current ? current : prev));
    }, 1500);
    return () => {
      mountedRef.current = false;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Charger les workspaces de l'utilisateur
  const loadWorkspaces = async (opts = {}) => {
    const token = authToken; // always read latest
  const fetchStart = performance.now();
    try {
      // Ne déclencher l'état loading (skeleton) que si aucun workspace sélectionné (cold start) ou si on force
      if (initialLoading || !selectedWorkspace || opts.forceReset) {
        setLoading(true);
      }
      setError(null);

      if (!token) {
        // Pas connecté
        setWorkspaces([]);
        setSelectedWorkspace(null);
        localStorage.removeItem('workspaces');
        localStorage.removeItem('selectedWorkspace');
        localStorage.removeItem('selectedWorkspaceId');
        return;
      }

      const response = await Axios.get(`${apiUrl}/getUserWorkspaces`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

  if (response.data && response.data.workspaces) {
        const newWorkspaces = response.data.workspaces;
        setWorkspaces(newWorkspaces);
        // Détection changement d'utilisateur: si l'ancien selectedWorkspace n'appartient pas à la liste, on réinitialise plus bas
        
        // Sauvegarder dans le localStorage
        localStorage.setItem('workspaces', JSON.stringify(newWorkspaces));
        
        // Sélectionner le workspace par défaut ou le premier disponible quand:
        // - aucun workspace sélectionné
        // - ou l'utilisateur a changé
        // - ou le workspace sélectionné n'existe plus
        const userId = extractUserIdFromToken(token);
  const previousUserId = previousUserIdRef.current;
        const selectedStillExists = selectedWorkspace && newWorkspaces.some(w => w.id === selectedWorkspace.id);
  const isUserChange = previousUserId !== null && previousUserId !== userId; // ne compte pas comme changement si premier chargement
  if (!selectedStillExists || isUserChange || !selectedWorkspace || opts.forceReset) {
          const defaultWorkspace = newWorkspaces.find(w => w.is_default) || newWorkspaces[0];
          if (defaultWorkspace) {
            setSelectedWorkspace(defaultWorkspace);
            localStorage.setItem('selectedWorkspaceId', defaultWorkspace.id.toString());
            localStorage.setItem('selectedWorkspace', JSON.stringify(defaultWorkspace));
          } else {
            setSelectedWorkspace(null);
            localStorage.removeItem('selectedWorkspaceId');
            localStorage.removeItem('selectedWorkspace');
          }
        }
        previousUserIdRef.current = userId; // mémoriser user courant
      } else {
        setWorkspaces([]);
        localStorage.removeItem('workspaces');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des workspaces:', error);
      setError(error.response?.data?.error || 'Erreur lors du chargement des workspaces');
      setWorkspaces([]);
    } finally {
      const elapsed = performance.now() - fetchStart;
      if (elapsed < MIN_SKELETON_MS) {
        if (loading) {
          await new Promise(r => setTimeout(r, MIN_SKELETON_MS - elapsed));
        }
      }
      setLoading(false);
  if (initialLoading) setInitialLoading(false);
    }
  };

  // Créer un nouveau workspace
  const createWorkspace = async (workspaceData) => {
    try {
      const token = authToken;
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
      const token = authToken;
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
      const token = authToken;
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
      const token = authToken;
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
    const token = authToken;
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
      const token = authToken;
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
    const token = authToken;
    const currentUserId = extractUserIdFromToken(token);
    const previousUserId = previousUserIdRef.current;
    const isFirstLoadForUser = previousUserId === null && currentUserId;

    if (token) {
      // Ne mettre loading à true ici que pour un cold start
      if (initialLoading && !selectedWorkspace) {
        setLoading(true);
      }
      if (initialLoading) setInitialLoading(true);
      if (previousUserId && previousUserId !== currentUserId) {
        setWorkspaces([]);
        setSelectedWorkspace(null);
        localStorage.removeItem('workspaces');
        localStorage.removeItem('selectedWorkspace');
        localStorage.removeItem('selectedWorkspaceId');
      }
      loadWorkspaces({ forceReset: previousUserId !== null && previousUserId !== currentUserId && !isFirstLoadForUser });
    } else {
      previousUserIdRef.current = null;
      localStorage.removeItem('workspaces');
      localStorage.removeItem('selectedWorkspace');
      localStorage.removeItem('selectedWorkspaceId');
      setWorkspaces([]);
      setSelectedWorkspace(null);
      setLoading(false);
  if (initialLoading) setInitialLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

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
  initialLoading,
    error,
    
    // Actions
  loadWorkspaces, // utilise authToken interne
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    selectWorkspace,
    getWorkspaceWebsites,
    getWorkspaceMembers,
    addUserToWorkspace,
    
    // Fonction helper
  refreshWorkspaces: () => loadWorkspaces({ forceReset: false }),
  currentUserId: extractUserIdFromToken(authToken)
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export default WorkspaceContext;
