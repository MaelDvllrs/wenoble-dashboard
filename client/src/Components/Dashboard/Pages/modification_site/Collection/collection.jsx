import React from "react"
import Axios from '../../../../../service/AxiosConfig';
import { useState, useEffect } from "react";
import Cookies from 'js-cookie';
import {jwtDecode} from 'jwt-decode'; 
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import '../Portfolio/portfolio.css';
import config from "../../../../../config";
import { useTheme } from '@mui/material/styles';
import { RiDatabase2Fill } from "react-icons/ri";
import AddIcon from '@mui/icons-material/Add';

import { useSnackbar } from '../../../../../Theme/snackbar';
import { useWebsite } from '../../../../../Context/WebsiteContext';





const Collection = () => {

    const theme = useTheme();
    const token = Cookies.get('token')
    const location = useLocation();
    
    const navigate = useNavigate()
    const [initialNavigationDone, setInitialNavigationDone] = useState(false);

    const { showSnackbar } = useSnackbar();
    const { selectedWebsite, loading: websiteLoading } = useWebsite();


    

    const apiUrl = config.apiUrl; 

    const [decodedBlog, setDecodedBlog] = useState(null);
    const [Infoblog, setInfoblog] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    // Fonction pour charger les collections
    const loadCollections = () => {
        // Vérifier qu'un site web est sélectionné
        if (!selectedWebsite) {
            console.log('Aucun site web sélectionné');
            return;
        }

        const user = Cookies.get('token');
    
        if (user) { 
            Axios.get(`${apiUrl}/getCollection`, {
                params: {
                    websiteId: selectedWebsite.id, // Utiliser l'ID du site sélectionné
                },
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
            }).then((response) => {
                setInfoblog(response.data);
            }).catch((error) => {
                showSnackbar('error', '[COLLECTION-001] Erreur lors de la récupération des collections');
                console.error('Erreur lors de la récupération de des collections :', error);
            });
        }
    };    // Effet pour charger les collections
    useEffect(() => {
        // Attendre que le site web soit chargé et sélectionné
        if (!websiteLoading && selectedWebsite) {
            loadCollections();
        }
    }, [refreshKey, selectedWebsite, websiteLoading]);

    // Effet pour détecter les changements de location et forcer le refresh
    useEffect(() => {
        if (location.state?.refreshCollections) {
            setRefreshKey(prev => prev + 1);
            // Nettoyer le state pour éviter les refresh en boucle
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    useEffect(() => {
        if(Infoblog != null){
            const decoded = jwtDecode(Infoblog);
            setDecodedBlog(decoded);
            if(decoded && decoded.blog.length > 0 && !initialNavigationDone) {
                navigate('/dashboard/modification/collection/' + decoded.blog[0].id);
                setInitialNavigationDone(true);
            }
        }
    }, [Infoblog, initialNavigationDone, navigate]);

    return(
        <div className="outlet">
            <div className="title_section">
            <div className="breadCrumbs"><NavLink style={{color: theme.palette.text.primary}} className={"breadCrumbsLink"} to={'/dashboard/home'}>Dashboard</NavLink> &gt; <NavLink style={{color: theme.palette.text.primary}} className={"breadCrumbsLink"} to={'/dashboard/modification'}>Modification</NavLink> &gt; Cms</div>
            </div>
            <div className="dashboard_case_empty edit-case_empty">
                <div className="header_modification">
                    <RiDatabase2Fill className="icon_modifiaction_title"/>
                    <h3 className="heading_h3">Gestion des collections CMS</h3>
                </div>
                
                {websiteLoading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: theme.palette.text.secondary }}>
                        Chargement des sites web...
                    </div>
                ) : !selectedWebsite ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: theme.palette.text.secondary }}>
                        Veuillez sélectionner un site web dans le header pour gérer les collections.
                    </div>
                ) : (
                    <>
                        <div className="link_menu_box link_menu_box_scroll">
                            {decodedBlog && decodedBlog.blog.map((blogItem) => (
                                <NavLink to={'/dashboard/modification/collection/' + blogItem.id} className={({ isActive }) => `link_menu ${isActive ? ' link_menu_active' : ''}`} key={blogItem.id}>
                                    <p style={{color: theme.palette.text.primary}}>{blogItem.collection_name}</p>
                                </NavLink>
                            ))}
                            <NavLink to={'/dashboard/modification/collection/createCollection'} className='link_menu' key={'createCollection'}>
                                <AddIcon style={{color: theme.palette.text.primary}}/>
                            </NavLink>
                        </div>
                        <div className='dashboard_section secondaire shutter_section'>
                                <Outlet />
                        </div>
                    </>
                )}
            </div>       
        </div>
    )
}
export default Collection