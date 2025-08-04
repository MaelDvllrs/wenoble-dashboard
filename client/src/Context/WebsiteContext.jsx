import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import Cookies from 'js-cookie';
import Axios from '../service/AxiosConfig';
import config from '../config';
import { useWorkspace } from './WorkspaceContext';

const WebsiteContext = createContext();

export { WebsiteContext };

export const useWebsite = () => {
    const context = useContext(WebsiteContext);
    if (!context) {
        throw new Error('useWebsite must be used within a WebsiteProvider');
    }
    return context;
};

export const WebsiteProvider = ({ children }) => {
    const [websites, setWebsites] = useState(() => {
        // Restaurer les websites depuis le localStorage au démarrage
        try {
            const savedWebsites = localStorage.getItem('websites');
            return savedWebsites ? JSON.parse(savedWebsites) : [];
        } catch {
            return [];
        }
    });
    const [selectedWebsite, setSelectedWebsite] = useState(() => {
        // Restaurer le website sélectionné depuis le localStorage au démarrage
        try {
            const savedWebsite = localStorage.getItem('selectedWebsite');
            return savedWebsite ? JSON.parse(savedWebsite) : null;
        } catch {
            return null;
        }
    });
    const [loading, setLoading] = useState(true);
    const [lastWorkspaceId, setLastWorkspaceId] = useState(null);

    // Utiliser des refs pour éviter les dépendances dans useCallback
    const selectedWebsiteRef = useRef(selectedWebsite);
    const lastWorkspaceIdRef = useRef(lastWorkspaceId);
    
    // Mettre à jour les refs quand les valeurs changent
    useEffect(() => {
        selectedWebsiteRef.current = selectedWebsite;
    }, [selectedWebsite]);
    
    useEffect(() => {
        lastWorkspaceIdRef.current = lastWorkspaceId;
    }, [lastWorkspaceId]);

    const apiUrl = config.apiUrl;
    const token = Cookies.get('token');
    const { selectedWorkspace, loading: workspaceLoading } = useWorkspace();

    // Effet pour gérer le chargement initial et éviter le loading si on a déjà des données
    useEffect(() => {
        // Si on a des données dans le localStorage et un workspace sélectionné, désactiver le loading
        if (websites.length > 0 && selectedWebsite && selectedWorkspace) {
            setLoading(false);
        }
    }, [websites.length, selectedWebsite, selectedWorkspace]);

    // Fonction stable pour nettoyer et dédupliquer les données des sites web
    const cleanWebsitesData = useCallback((rawWebsites) => {
        if (!Array.isArray(rawWebsites)) {
            console.error('rawWebsites is not an array:', rawWebsites);
            return [];
        }

        const websiteMap = new Map();

        rawWebsites.forEach((item, index) => {
            try {
                let website = null;
                
                // Vérifier si l'item a une structure valide
                if (item && typeof item === 'object') {
                    // Si l'item a directement les propriétés du site
                    if (item.id && item.website_name) {
                        website = {
                            id: item.id,
                            website_name: item.website_name,
                            website_slug: item.website_slug,
                            visibility: item.visibility,
                            created_at: item.created_at,
                            updated_at: item.updated_at,
                            workspace_id: item.workspace_id,
                            user_role: item.user_role || 'viewer',
                            access_type: item.access_type || 'direct'
                        };
                    }
                    // Si l'item contient un objet imbriqué (structure avec index numérique)
                    else if (typeof item[0] === 'object' && item[0].id) {
                        website = {
                            id: item[0].id,
                            website_name: item[0].website_name,
                            website_slug: item[0].website_slug,
                            visibility: item[0].visibility,
                            created_at: item[0].created_at,
                            updated_at: item[0].updated_at,
                            workspace_id: item[0].workspace_id,
                            user_role: item.user_role || item[0].user_role || 'viewer',
                            access_type: item.access_type || item[0].access_type || 'workspace'
                        };
                    }
                }

                if (website && website.id) {
                    // Éviter les doublons, garder l'accès le plus privilégié
                    if (!websiteMap.has(website.id)) {
                        websiteMap.set(website.id, website);
                    } else {
                        const existing = websiteMap.get(website.id);
                        // Garder l'accès direct si disponible, sinon workspace
                        if (website.access_type === 'direct' || 
                            (existing.access_type !== 'direct' && website.user_role === 'admin')) {
                            websiteMap.set(website.id, website);
                        }
                    }
                }
            } catch (error) {
                console.error(`Erreur lors du traitement de l'item ${index}:`, error, item);
            }
        });

        return Array.from(websiteMap.values());
    }, []);

    // Charger les sites web du workspace sélectionné uniquement quand l'ID change
    useEffect(() => {
        const fetchWorkspaceWebsites = async () => {
            const currentWorkspaceId = selectedWorkspace?.id;
            
            console.log('useEffect triggered:', { 
                token: !!token, 
                currentWorkspaceId, 
                lastWorkspaceId, 
                workspaceLoading 
            });
            
            // Ne faire l'appel que si le token existe, les workspaces sont chargés, et que l'ID du workspace a changé
            if (!token) {
                console.log('No token, skipping');
                return;
            }

            // Attendre que les workspaces soient chargés
            if (workspaceLoading) {
                console.log('Workspaces still loading, skipping');
                return;
            }

            // Si aucun workspace sélectionné, nettoyer
            if (!currentWorkspaceId) {
                console.log('No workspace selected, cleaning up');
                setWebsites([]);
                setSelectedWebsite(null);
                localStorage.removeItem('selectedWebsiteId');
                setLoading(false);
                return;
            }

            // Éviter l'appel si c'est le même workspace (utiliser une ref pour éviter la boucle)
            if (currentWorkspaceId === lastWorkspaceId) {
                console.log('Same workspace, skipping API call');
                return;
            }
            
            console.log(`Workspace changed: ${lastWorkspaceId} -> ${currentWorkspaceId}`);
            setLoading(true);
            
            try {
                const response = await Axios.get(`${apiUrl}/getUserWebsites?workspaceId=${currentWorkspaceId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.data && response.data.websites) {
                    console.log('Raw websites data:', response.data.websites);
                    
                    // Nettoyer et dédupliquer les données
                    const cleanedWebsites = cleanWebsitesData(response.data.websites);
                    console.log('Cleaned websites:', cleanedWebsites);
                    
                    setWebsites(cleanedWebsites);
                    // Sauvegarder dans le localStorage
                    localStorage.setItem('websites', JSON.stringify(cleanedWebsites));
                    
                    // Logique de sélection du site web lors du changement de workspace
                    if (cleanedWebsites.length > 0) {
                        // Si on change de workspace, sélectionner le premier site du nouveau workspace
                        if (lastWorkspaceId && lastWorkspaceId !== currentWorkspaceId) {
                            console.log('Workspace changed, selecting first website');
                            setSelectedWebsite(cleanedWebsites[0]);
                            localStorage.setItem('selectedWebsiteId', cleanedWebsites[0].id.toString());
                            localStorage.setItem('selectedWebsite', JSON.stringify(cleanedWebsites[0]));
                        } else {
                            // Premier chargement : essayer de récupérer le site sauvé
                            const savedWebsiteId = localStorage.getItem('selectedWebsiteId');
                            const savedWebsite = cleanedWebsites.find(site => site.id.toString() === savedWebsiteId);
                            
                            if (savedWebsite) {
                                console.log('Found saved website:', savedWebsite.website_name);
                                setSelectedWebsite(savedWebsite);
                                localStorage.setItem('selectedWebsite', JSON.stringify(savedWebsite));
                            } else {
                                console.log('No saved website, selecting first');
                                setSelectedWebsite(cleanedWebsites[0]);
                                localStorage.setItem('selectedWebsiteId', cleanedWebsites[0].id.toString());
                                localStorage.setItem('selectedWebsite', JSON.stringify(cleanedWebsites[0]));
                            }
                        }
                    } else {
                        setSelectedWebsite(null);
                        localStorage.removeItem('selectedWebsiteId');
                        localStorage.removeItem('selectedWebsite');
                    }
                    
                    // Mettre à jour lastWorkspaceId APRÈS avoir traité les données
                    setLastWorkspaceId(currentWorkspaceId);
                } else {
                    console.log('No websites data in response');
                }
            } catch (error) {
                console.error('Erreur lors de la récupération des sites web:', error);
                setWebsites([]);
                setSelectedWebsite(null);
                localStorage.removeItem('selectedWebsiteId');
                localStorage.removeItem('selectedWebsite');
                localStorage.removeItem('websites');
            } finally {
                setLoading(false);
            }
        };
        
        fetchWorkspaceWebsites();
    }, [selectedWorkspace?.id, token, workspaceLoading]); // Ajouter workspaceLoading dans les dépendances

    const selectWebsite = (website) => {
        setSelectedWebsite(website);
        localStorage.setItem('selectedWebsiteId', website.id.toString());
        localStorage.setItem('selectedWebsite', JSON.stringify(website));
    };

    // Fonction pour récupérer les sites web d'un workspace spécifique
    const refreshWebsites = useCallback(async (workspaceId = null) => {
        if (!token) return;
        
        const targetWorkspaceId = workspaceId || selectedWorkspace?.id;
        if (!targetWorkspaceId) {
            setWebsites([]);
            setSelectedWebsite(null);
            localStorage.removeItem('selectedWebsiteId');
            localStorage.removeItem('selectedWebsite');
            localStorage.removeItem('websites');
            return;
        }
        
        console.log(`Refreshing websites for workspace: ${targetWorkspaceId}`);
        setLoading(true);
        
        try {
            const response = await Axios.get(`${apiUrl}/getUserWebsites?workspaceId=${targetWorkspaceId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.data && response.data.websites) {
                // Nettoyer et dédupliquer les données
                const cleanedWebsites = cleanWebsitesData(response.data.websites);
                setWebsites(cleanedWebsites);
                // Sauvegarder dans le localStorage
                localStorage.setItem('websites', JSON.stringify(cleanedWebsites));
                
                // Utiliser les refs pour accéder aux valeurs actuelles
                const currentSelectedWebsite = selectedWebsiteRef.current;
                const currentLastWorkspaceId = lastWorkspaceIdRef.current;
                
                // Mettre à jour le site sélectionné si nécessaire
                if (currentSelectedWebsite) {
                    const updatedWebsite = cleanedWebsites.find(site => site.id === currentSelectedWebsite.id);
                    if (updatedWebsite) {
                        setSelectedWebsite(updatedWebsite);
                        localStorage.setItem('selectedWebsite', JSON.stringify(updatedWebsite));
                    } else if (cleanedWebsites.length > 0) {
                        setSelectedWebsite(cleanedWebsites[0]);
                        localStorage.setItem('selectedWebsiteId', cleanedWebsites[0].id.toString());
                        localStorage.setItem('selectedWebsite', JSON.stringify(cleanedWebsites[0]));
                    } else {
                        setSelectedWebsite(null);
                        localStorage.removeItem('selectedWebsiteId');
                        localStorage.removeItem('selectedWebsite');
                    }
                } else if (cleanedWebsites.length > 0) {
                    // Si aucun site sélectionné, prendre le premier
                    setSelectedWebsite(cleanedWebsites[0]);
                    localStorage.setItem('selectedWebsiteId', cleanedWebsites[0].id.toString());
                    localStorage.setItem('selectedWebsite', JSON.stringify(cleanedWebsites[0]));
                }
                
                // Mettre à jour lastWorkspaceId si on rafraîchit un workspace différent
                if (targetWorkspaceId !== currentLastWorkspaceId) {
                    setLastWorkspaceId(targetWorkspaceId);
                }
            }
        } catch (error) {
            console.error('Erreur lors de la récupération des sites web:', error);
            setWebsites([]);
            setSelectedWebsite(null);
            localStorage.removeItem('selectedWebsiteId');
            localStorage.removeItem('selectedWebsite');
            localStorage.removeItem('websites');
        } finally {
            setLoading(false);
        }
    }, [token, selectedWorkspace?.id, apiUrl, cleanWebsitesData]);

    // Fonction pour mettre à jour un site web dans la liste
    const updateWebsite = useCallback((updatedWebsite) => {
        setWebsites(prevWebsites => {
            const newWebsites = prevWebsites.map(website => 
                website.id === updatedWebsite.id ? { ...website, ...updatedWebsite } : website
            );
            localStorage.setItem('websites', JSON.stringify(newWebsites));
            return newWebsites;
        });
        
        // Mettre à jour le site sélectionné s'il correspond
        if (selectedWebsite && selectedWebsite.id === updatedWebsite.id) {
            const newSelectedWebsite = { ...selectedWebsite, ...updatedWebsite };
            setSelectedWebsite(newSelectedWebsite);
            localStorage.setItem('selectedWebsite', JSON.stringify(newSelectedWebsite));
        }
    }, [selectedWebsite]);

    // Fonction pour supprimer un site web de la liste  
    const deleteWebsite = useCallback((websiteId) => {
        setWebsites(prevWebsites => {
            const newWebsites = prevWebsites.filter(website => website.id !== websiteId);
            localStorage.setItem('websites', JSON.stringify(newWebsites));
            return newWebsites;
        });
        
        // Si le site supprimé était sélectionné, le désélectionner
        if (selectedWebsite && selectedWebsite.id === websiteId) {
            setSelectedWebsite(null);
            localStorage.removeItem('selectedWebsite');
            localStorage.removeItem('selectedWebsiteId');
        }
    }, [selectedWebsite]);

    const value = {
        websites,
        selectedWebsite,
        loading,
        selectWebsite,
        refreshWebsites,
        updateWebsite,
        deleteWebsite
    };

    return (
        <WebsiteContext.Provider value={value}>
            {children}
        </WebsiteContext.Provider>
    );
};
