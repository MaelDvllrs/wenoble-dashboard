import React, { useState, useEffect } from "react"
import Axios from 'axios';
import Cookies from 'js-cookie';
import {jwtDecode} from 'jwt-decode'; 
import { Outlet, NavLink, useNavigate, useParams } from 'react-router-dom';
import { DefaultButton, SecondaryButton, RedButton} from '../../../../../Theme/element';
import { useTheme } from '@mui/material/styles';
import { useWebsite } from '../../../../../Context/WebsiteContext';
import './listeCollection.css'
import '../Portfolio/portfolio.css';
import config from "../../../../../config";
import AddIcon from '@mui/icons-material/Add';
import { SkeletonBlog } from "../../../../skeleton/skeleton";
import { formatDate } from "../../../../../utils/dateUtils";
import { useSnackbar } from '../../../../../Theme/snackbar';

import { PiSmileyMeltingFill } from "react-icons/pi";
import { RiDatabase2Fill } from "react-icons/ri";
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import { SimpleSearchField } from '../../../../../Theme/element';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { deleteBlogPage } from './collectionDeleteUtils';
import CircularProgress from '@mui/material/CircularProgress';
import { generateStaticSite } from './apiCollection';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import PendingIcon from '@mui/icons-material/Pending';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Snackbar from '@mui/material/Snackbar';
import SettingsIcon from '@mui/icons-material/Settings';
import {  PiGearSixBold } from "react-icons/pi";




const ListeCollection = () => {

    const theme = useTheme();
    const token = Cookies.get('token')
    const idUser = jwtDecode(token).idUser;

    const [InfoListeblog, setInfoblog] = useState([]);
    const apiUrl = config.apiUrl;
    const { idCollection } = useParams();

    const [LoadingBlog, setLoadingBlog] = useState(true);

    // Ajoute cet état pour gérer les cases à cocher
    const [checkedItems, setCheckedItems] = useState({});
    const [allChecked, setAllChecked] = useState(false);

    // Ajout d'un état pour la recherche
    const [searchValue, setSearchValue] = useState("");

    // Ajout d'un état pour la popup de confirmation
    const [showConfirm, setShowConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Ajout d'états pour le chargement par étape (comme dans editElementCollection)
    const [deleteDataStatus, setDeleteDataStatus] = useState(false);
    const [regenerateSiteStatus, setRegenerateSiteStatus] = useState(false);
    const [deletionCompleted, setDeletionCompleted] = useState(false);


    const { showSnackbar } = useSnackbar();
    

    const navigate = useNavigate();
    const { selectedWebsite, loading: websiteLoading } = useWebsite();

    useEffect(() => {    
        if (!selectedWebsite?.id) {
            return;
        }

        const user = Cookies.get('token');
        const decodedUser = jwtDecode(user);

        Axios.get(`${apiUrl}/getListeCollection`, {
            params: {
                IdBlog: idCollection,
                websiteId: selectedWebsite.id,
            },
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
                }
            }).then((response) => {
                setInfoblog(jwtDecode(response.data));
                setLoadingBlog(false);
            }).catch((error) => {
                showSnackbar('error', '[LIST-COLL-001] Erreur lors de la récupération des collections');
                console.error('Erreur lors de la récupération de la du Blog :', error);
                setLoadingBlog(false);
            });
            
    }, [idCollection, selectedWebsite?.id]);

    // Fonction pour cocher/décocher toutes les cases
    const handleCheckAll = (e) => {
      const checked = e.target.checked;
      setAllChecked(checked);
      // Suppose que tu as une liste d'items appelée 'items' (à adapter si besoin)
      const newChecked = {};
      InfoListeblog.blogList.forEach(item => {
        newChecked[item.id] = checked;
      });
      setCheckedItems(newChecked);
    };

    // Fonction pour cocher/décocher une case individuelle
    const handleCheckItem = (id) => (e) => {
      const checked = e.target.checked;
      setCheckedItems(prev => {
        const updated = { ...prev, [id]: checked };
        // Si on décoche une case, on décoche aussi le "tout cocher"
        if (!checked) setAllChecked(false);
        // Si toutes les cases sont cochées, on coche aussi le "tout cocher"
        else if (Object.values(updated).every(Boolean)) setAllChecked(true);
        return updated;
      });
    };

    // Filtrage des blogs selon la recherche
    const filteredBlogList = InfoListeblog && Array.isArray(InfoListeblog.blogList)
      ? InfoListeblog.blogList.filter(blogpage =>
          blogpage.collection_element_name && blogpage.collection_element_name.toLowerCase().includes(searchValue.toLowerCase())
        )
      : [];

    // Détermine si au moins une case est cochée
    const atLeastOneChecked = Object.values(checkedItems).some(Boolean);

    return(
        <div className="liste_blog_contain">
          {/* Popup de confirmation personnalisée */}
          {showConfirm && (
            <>
              {/* Overlay pour bloquer les interactions pendant la confirmation */}
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                background: 'rgba(0,0,0,0.18)',
                zIndex: 1300
              }} />
              <Snackbar
                open={showConfirm}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                sx={{ bottom: 24, zIndex: 1400 }}
                onClose={() => setShowConfirm(false)}
              >
                <Paper
                  elevation={6}
                  sx={{
                    p: 2,
                    minWidth: 300,
                    maxWidth: 400,
                    backgroundColor: theme.palette.background.default,
                    borderRadius: 2,
                  }}
                >
                  <Box sx={{ mb: 2 }}>
                    <h3 style={{ margin: 0, color: theme.palette.text.primary }}>Confirmation de suppression</h3>
                  </Box>
                  <Box sx={{ mb: 2, color: theme.palette.text.primary }}>
                    Êtes-vous sûr de vouloir supprimer la sélection ?
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                    <SecondaryButton className="modal-btn cancel" onClick={() => setShowConfirm(false)}>Annuler</SecondaryButton>
                    <RedButton className="modal-btn confirm" onClick={async () => {
                      setShowConfirm(false);
                      setIsDeleting(true);
                      setDeleteDataStatus(false);
                      setRegenerateSiteStatus(false);
                      setDeletionCompleted(false);
                      // Suppression multiple
                      const selectedIds = Object.entries(checkedItems)
                        .filter(([id, checked]) => checked)
                        .map(([id]) => id);
                      const selectedPages = filteredBlogList.filter(page => selectedIds.includes(page.id));
                      let atLeastOnePublished = false;
                      setTimeout(() => setDeleteDataStatus(true), 500); // Simule le passage à l'étape 2
                      for (const page of selectedPages) {
                        const isPublished = page.collection_element_status === true;
                        if (isPublished) atLeastOnePublished = true;
                        try {
                          await deleteBlogPage({
                            apiUrl,
                            token,
                            idWebsite: selectedWebsite.id,
                            idBlog: idCollection,
                            slug: page.page_blog_slug || page.collection_element_slug,
                            idBlogPage: page.id,
                            isPublished,
                            skipRegenerate: true
                          });
                        } catch (e) {
                          showSnackbar('error', '[LIST-COLL-002] Erreur lors de la suprressions des collections');
                          console.error('Erreur suppression page', page.id, e);
                        }
                      }
                      setRegenerateSiteStatus(atLeastOnePublished);
            if (atLeastOnePublished) {
                        try {
              await generateStaticSite(token, selectedWebsite?.id);
                          setTimeout(() => setDeletionCompleted(true), 800);
                        } catch (e) {
                          showSnackbar('error', '[LIST-COLL-003] Erreur lors de la suppressions des collections');
                          console.error('Erreur lors de la régénération du site', e);
                        }
                      } else {
                        setTimeout(() => setDeletionCompleted(true), 800);
                      }
                      // Rafraîchir la liste après suppression
                      Axios.get(`${apiUrl}/getListeCollection`, {
                        params: {
                          IdBlog: idCollection,
                          idUser: idUser,
                        },
                        headers: {
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json'
                        }
                      }).then((response) => {
                        setInfoblog(jwtDecode(response.data));
                        setLoadingBlog(false);
                        setCheckedItems({});
                        setAllChecked(false);
                        setTimeout(() => setIsDeleting(false), 1200);
                        setDeleteDataStatus(false);
                        setRegenerateSiteStatus(false);
                        setDeletionCompleted(false);
                        showSnackbar('success', 'Sélection supprimée avec succès');
                      }).catch((error) => {
                        setIsDeleting(false);
                        setDeleteDataStatus(false);
                        setRegenerateSiteStatus(false);
                        setDeletionCompleted(false);
                        showSnackbar('error', '[LIST-COLL-004] Erreur lors de la récupération des collections');
                      });
                    }}>
                      Confirmer
                    </RedButton>
                  </Box>
                </Paper>
              </Snackbar>
            </>
          )}
          {isDeleting && (
            <>
              {/* Overlay pour bloquer les interactions */}
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                background: 'rgba(0,0,0,0.18)',
                zIndex: 1300
              }} />
              <Snackbar
                open={isDeleting}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                sx={{ bottom: 24, zIndex: 1400 }}
              >
                <Paper
                  elevation={6}
                  sx={{
                    p: 2,
                    minWidth: 300,
                    maxWidth: 400,
                    backgroundColor: theme.palette.background.default,
                    borderRadius: 2,
                  }}
                >
                  <Box sx={{ mb: 2 }}>
                    <h3 style={{ margin: 0, color: theme.palette.text.primary }}>Suppression de la sélection</h3>
                  </Box>
                  {/* Étape 1: Suppression des données */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    {!deleteDataStatus ? (
                      <>
                        <PendingIcon sx={{ color: theme.palette.text.secondary, width: 16, height: 16 }} />
                        <Box sx={{ color: theme.palette.text.secondary }}>Suppression des données</Box>
                      </>
                    ) : regenerateSiteStatus ? (
                      <>
                        <CheckCircleIcon sx={{ color: "#2ec96d", width: 16, height: 16 }} />
                        <Box sx={{ color: theme.palette.text.secondary }}>Données supprimées</Box>
                      </>
                    ) : (
                      <>
                        <CircularProgress size={16} sx={{ color: "#2ec96d" }} />
                        <Box sx={{ color: theme.palette.text.primary }}>Suppression des données...</Box>
                      </>
                    )}
                  </Box>
                  {/* Étape 2: Régénération du site */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {!regenerateSiteStatus ? (
                      <>
                        <PendingIcon sx={{ color: theme.palette.text.secondary, width: 16, height: 16 }} />
                        <Box sx={{ color: theme.palette.text.secondary }}>Mise à jour du site</Box>
                      </>
                    ) : (
                      <>
                        <CircularProgress size={16} sx={{ color: "#2ec96d" }} />
                        <Box sx={{ color: theme.palette.text.primary }}>Mise à jour du site...</Box>
                      </>
                    )}
                  </Box>
                </Paper>
              </Snackbar>
            </>
          )}
            <div className="modification_action_wrapper">
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <SimpleSearchField
                  value={searchValue}
                  onChange={e => setSearchValue(e.target.value)}
                  placeholder="Rechercher par titre..."
                  theme={theme}
                />
                {atLeastOneChecked && (
                  <SecondaryButton
                    onClick={() => setShowConfirm(true)}
                  >
                    <DeleteOutlineOutlinedIcon style={{ marginRight: 4 , color: theme.palette.text.secondary}} fontSize='small'/>
                    Supprimer la selection
                  </SecondaryButton>
                )}
                <span className="item_count">
                  {atLeastOneChecked
                    ? `${Object.values(checkedItems).filter(Boolean).length} / ${filteredBlogList.length} sélectionné(s)`
                    : `${filteredBlogList.length} item(s)`}
                </span>
              </div>
              <NavLink to={'editCollection'}>
                <SecondaryButton
                  startIcon={<PiGearSixBold size={14}/>}
                >
                  Options
                </SecondaryButton>
              </NavLink>
              <div className="button_save_contain">
                    <NavLink to={'createPage'} >
                      <DefaultButton 
                        type="submit" 
                        variant="contained"
                        startIcon={<AddIcon/>}
                      >
                        Créer Page
                      </DefaultButton>
                    </NavLink>
              </div>
            </div>

            <div className="liste_blog_wrapper">

              <div className="Item_menu">  
                <div style={{color: theme.palette.text.secondary}} className="Item_portfolio_element blog_name_element">
                  <label className="custom-checkbox">
                    <input type="checkbox"
                      checked={allChecked}
                      onChange={handleCheckAll}
                      onClick={e => e.stopPropagation()}
                    />
                    <span className="checkmark"></span>
                  </label>
                  <span>Titre</span>
                </div>
                <p style={{color: theme.palette.text.secondary}} className="Item_portfolio_element blog_status">Status</p>
                <p style={{color: theme.palette.text.secondary}} className="Item_portfolio_element blog_date_element">Date de création</p>
                <p style={{color: theme.palette.text.secondary}} className="Item_portfolio_element blog_date_element">Date de modification</p>
                <p style={{color: theme.palette.text.secondary}} className="Item_portfolio_element blog_date_element">Date de Publication</p>
              </div>
              <div className="liste_blog_box">
                  {LoadingBlog ? (
                    <SkeletonBlog />
                    ) : filteredBlogList.length === 0 ? (
                      <div className="noImageContain">
                        <PiSmileyMeltingFill style={{ fontSize: 50, color: theme.palette.text.primary }} />
                        <p style={{ color: theme.palette.text.primary }}>Votre blog est vide.</p>
                      </div>
                    ) : (
                      filteredBlogList.map((blogpage, index) => {
                        const formattedCreateDate = formatDate(blogpage.collection_element_create_date);
                        const formattedUpdateDate = formatDate(blogpage.collection_element_update_date);
                        const formattedPublishDate = formatDate(blogpage.collection_element_publish_date);
                        return (
                          <NavLink
                            to={'editPage/' + blogpage.id}
                            key={index}
                            className="Item_Portfolio Item_Blog"
                            style={{ '--hover-background-color': theme.palette.secondary.secondary, color: theme.palette.text.primary }}
                          >
                            <p className="Item_portfolio_element blog_name_element">
                              <label className="custom-checkbox" onClick={e => e.stopPropagation()}>
                                <input type="checkbox"
                                  checked={!!checkedItems[blogpage.id]}
                                  onChange={handleCheckItem(blogpage.id)}
                                  onClick={e => e.stopPropagation()}
                                />
                                <span className="checkmark"></span>
                              </label>
                              <span>{blogpage.collection_element_name}</span>
                            </p>
                            <div className="Item_portfolio_element blog_status">
                              {blogpage.collection_element_status === true ? (
                                <p className="blog_status publish_status">Publié</p>
                              ) : (
                                <p className="blog_status draft_status">Brouillon</p>
                              )}
                            </div>
                            <p className="Item_portfolio_element blog_date_element">{formattedCreateDate}</p>
                            <p className="Item_portfolio_element blog_date_element">{formattedUpdateDate}</p>
                            <p className="Item_portfolio_element blog_date_element">{formattedPublishDate}</p>
                          </NavLink>
                        );
                      })
                    )}
              </div>
            </div>
        </div>
    )
}

export default ListeCollection

