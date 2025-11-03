import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate, NavLink } from "react-router-dom";
import Axios from "axios";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";


// MUI
import { Box, Paper, Snackbar, Tooltip, Menu, MenuItem, IconButton } from "@mui/material";
import CircularProgress from "@mui/material/CircularProgress";
import SaveIcon from "@mui/icons-material/Save";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PendingIcon from "@mui/icons-material/Pending";
import { useTheme } from "@mui/material/styles";
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { ClickAwayListener, Popper, Grow } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

// App
import { useSnackbar } from '../../../../../Theme/snackbar';
import config from "../../../../../config";
import { DefaultButton, SecondaryButton,  } from '../../../../../Theme/element';
import Field from "../Fields/fields";
import { getCurrentUTCDate } from '../../../../../utils/dateUtils';
import {
  createImageBlog,
  createBlogPage,
  createTextBlog,
  createRichTextBlog,
  createVideoBlog,
  createMultiReferenceBlog,
  createGalleryBlog,
  generateStaticSite
} from './apiCollection';
import { convertToRaw } from 'draft-js';
import './collection.css';
import { useWebsite } from '../../../../../Context/WebsiteContext';

const CreateElementCollection = () => {
    const theme = useTheme();
    const { selectedWebsite } = useWebsite();
    const navigate = useNavigate();
    const token = Cookies.get('token');
    const idUser = jwtDecode(token).idUser;
    const { idCollection } = useParams();
    const apiUrl = config.apiUrl;

    // --- States principaux ---
    // Données de config et de formulaire
    const [DecodeConfigblog, setDecodeConfigblog] = useState([]);
    const [slugValue, setSlugValue] = useState('');
    const [blogData, setBlogData] = useState({
        text: [],
        images: [],
        richText: [],
        video: [],
        multiReference: [],
        gallery: [],
    });

    // UI/UX states
    const [savingPage, setSavingPage] = useState(false);
    const [dataLoading, setDataLoading] = useState(false);
    const [dataSaved, setDataSaved] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [isQueueing, setIsQueueing] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const [dataRetrievalStatus, setDataRetrievalStatus] = useState(false);
    const [pageGenerationStatus, setPageGenerationStatus] = useState(false);
    const [sitePublishingStatus, setSitePublishingStatus] = useState(false);
    const [titleFieldMissed , setTitleFieldMissed] = useState(false);
    const [slugFieldMissed , setSlugFieldMissed] = useState(false);

    // ---- useContext ---
    const { showSnackbar } = useSnackbar();

    // Domaine/abonnement pour la popup publication
    const [showDomainPopup, setShowDomainPopup] = useState(false);
    const [publishCustomDomain, setPublishCustomDomain] = useState(false);
    const [subscriptionInfo, setSubscriptionInfo] = useState(null);
    const publishBtnRef = React.useRef(null);

    // --- useEffect ---
    useEffect(() => {    
        Axios.get(`${apiUrl}/getConfigCollection`, {
            params: { IdBlog: idCollection },
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
        }).then((response) => {
            // L'API retourne maintenant les données directement, plus besoin de JWT
            setDecodeConfigblog(response.data);
        }).catch((error) => {
            showSnackbar('error', '[CREA-COLL-001] Erreur lors de la récupération de la configuration de la collection');
            console.error('Erreur lors de la récupération de la du Blog :', error);
        });
    }, []);


    // Récupérer la feature custom_domain (identique WebsiteManager)
    useEffect(() => {
        const fetchSubscriptionAndFeature = async () => {
            if (!selectedWebsite?.id) return;
            try {
                let customDomain = false;
                const authRes = await Axios.get(`${apiUrl}/custom-domain-authorisation/${selectedWebsite.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                customDomain = !!authRes.data.authorisation;
                setSubscriptionInfo({ custom_domain: customDomain });
            } catch (e) {
                setSubscriptionInfo(null);
            }
        };
        fetchSubscriptionAndFeature();
    }, [selectedWebsite, token]);


    // --- Fonctions utilitaires ---
    const handleBlogDataChange = (data, isDelete = false) => {
        setBlogData(prevData => {
          const newData = { ...prevData };
          const config = data.data.id_config;
          if (config === 'title') {
            const normalizeText = (text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            setSlugValue(normalizeText(data.data.value).toLowerCase().replace(/[^\w\s]|_/g, '').replace(/\s+/g, '-'));
          }
          const type = data.data.type;
          if (isDelete) {
            newData[type] = newData[type].filter(item => item.id_config !== data.data.id_config);
          } else {
            let itemModified = false; 
            for (let i = 0; i < newData[type].length; i++) {
                if (newData[type][i].id_config === data.data.id_config) {
                  newData[type][i] = data.data; 
                  itemModified = true; 
                  break; 
                }
            }
            if (!itemModified) {
              newData[type].push(data.data);
            }
          }
          return newData;
        });
    };

    const handleSave = async (status, customDomain = false) => {
        // status can be 'publish'|'draft'|'wait' or numeric 1/0
        const isPublish = (s) => (s === 1 || s === 'publish' || s === 'published');
        const isDraft = (s) => (s === 0 || s === 'draft');
        const isWait = (s) => (s === 'wait' || s === 2 || s === 'queued');

        // Affichage immédiat du feedback visuel
        if (isPublish(status)) {
            setSavingPage(true); // snackbar publication
        } else {
            setDataLoading(true); // snackbar brouillon/queue
        }
        if (isPublish(status)) {
            setIsPublishing(true);
        } else if (isWait(status)) {
            setIsQueueing(true);
        } else {
            setIsSavingDraft(true);
        }
        let titleMissed = false;
        let slugMissed = false;
        blogData.text.forEach(text => {
            if (text.id_config === 'title') titleMissed = true;
            if (text.id_config === 'slug') slugMissed = true;
        });
        if (!titleMissed) setTitleFieldMissed(true);
        if (!slugMissed) setSlugFieldMissed(true);
        if (!titleMissed || !slugMissed) {
            showSnackbar('error', '[CREA-COLL-002] Veuillez remplir les champs obligatoires (titre et slug)');
            setSavingPage(false);
            setDataLoading(false);
            setIsPublishing(false);
            setIsSavingDraft(false);
            return;
        }
        // CREER LA PAGE
        const date = getCurrentUTCDate();
        const mainText = [];
        const otherText = [];
        blogData.text.forEach(text => {
            if (text.id_config === 'title' || text.id_config === 'slug') {
                mainText.push(text);                
            } else {
                otherText.push(text);
            }
        });
        try {        
            // Appeler la fonction createBlogPage
            const response = await createBlogPage(idCollection, mainText, date, status, selectedWebsite?.id, token);
            const blogPageId = response.id;
            // ENREGISTRER LES TEXTES
            try { 
                await createTextBlog(blogPageId, otherText, token);
            } catch (error) { 
                showSnackbar('error', '[CREA-COLL-003] Erreur lors de la création des données');
                setDataRetrievalStatus(false);
                setPageGenerationStatus(false);
                setSitePublishingStatus(false);
                setSavingPage(false);
                setIsPublishing(false);
                console.error('Erreur lors de la création des textes :', error); 
                return; 
            }

            // ENREGISTRER LES RICHTEXT
            const infoRichText = [];
            blogData.richText.forEach(richText => {
                const contentRichText = richText.value;
                const richTextJS = convertToRaw(contentRichText);
                const richTextJSON = JSON.stringify(richTextJS);
                infoRichText.push({richText : richTextJSON, id_config: richText.id_config});
            });
            try {
                await createRichTextBlog(blogPageId, infoRichText, token);
            } catch (error) {
                showSnackbar('error', '[CREA-COLL-004] Erreur lors de la création des données');
                setDataRetrievalStatus(false);
                setPageGenerationStatus(false);
                setSitePublishingStatus(false);
                setSavingPage(false);
                setIsPublishing(false);
                console.error('Erreur lors de la création des richtextes :', error);
                return;
            }
            // ENREGISTRER LES IMAGE
            try {
                await Promise.all(
                    blogData.images.map(async (image) => {
                        await createImageBlog(image, blogPageId, token);
                    })
                );
            } catch (error) {
                showSnackbar('error', '[CREA-COLL-005] Erreur lors de la création des données');
                setDataRetrievalStatus(false);
                setPageGenerationStatus(false);
                setSitePublishingStatus(false);
                setSavingPage(false);
                setIsPublishing(false);
                console.error(error);
                return;
            }
            //ENREGISTRER LES GALLERIES
            try {
                await Promise.all(
                    blogData.gallery.map(async (gallery) => {
                        await createGalleryBlog(gallery, blogPageId, token);
                    })
                );
            } catch (error) {
                showSnackbar('error', '[CREA-COLL-006] Erreur lors de la création des données');
                setDataRetrievalStatus(false);
                setPageGenerationStatus(false);
                setSitePublishingStatus(false);
                setSavingPage(false);
                setIsPublishing(false);
                console.error(error);
                return;
            }
            //ENREGISTRER LES VIDEO
            try {
                await Promise.all(
                    blogData.video.map(async (video) => {
                        await createVideoBlog(video, blogPageId, token);
                    })
                );
            } catch (error) {
                showSnackbar('error', '[CREA-COLL-007] Erreur lors de la création des données');
                setDataRetrievalStatus(false);
                setPageGenerationStatus(false);
                setSitePublishingStatus(false);
                setSavingPage(false);
                setIsPublishing(false);
                console.error(error);
                return;
            }
            //ENREGISTRER LES MULTIREFERENCE
            try {
                await Promise.all(
                    blogData.multiReference.map(async (multiReference) => {
                        await createMultiReferenceBlog(blogPageId, multiReference, token);
                    })
                );
            } catch (error) {
                showSnackbar('error', '[CREA-COLL-008] Erreur lors de la création des données');
                setDataRetrievalStatus(false);
                setPageGenerationStatus(false);
                setSitePublishingStatus(false);
                setSavingPage(false);
                setIsPublishing(false);
                console.error(error);
                return;
            }
            // Générer le site
            const isPublish = (s) => (s === 1 || s === 'publish' || s === 'published');
            if (isPublish(status)) {
                setDataRetrievalStatus(true);
                try {
                    setTimeout(() => { setPageGenerationStatus(true); }, 1000);
                    await generateStaticSite(token, selectedWebsite?.id, '', customDomain);
                    setTimeout(() => { setSitePublishingStatus(true); }, 1000);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    setDataRetrievalStatus(false);
                    setPageGenerationStatus(false);
                    setSitePublishingStatus(false);
                    setSavingPage(false);
                    setIsPublishing(false);
                } catch (error) {
                    showSnackbar('error', '[CREA-COLL-009] Erreur lors de la génération du site');
                    console.error('Erreur lors de la generation static :', error);
                    setDataRetrievalStatus(false);
                    setPageGenerationStatus(false);
                    setSitePublishingStatus(false);
                    setSavingPage(false);
                    setIsPublishing(false);
                    return;
                }
            } else {
                setTimeout(() => {
                    setDataSaved(true);
                    setTimeout(() => {
                        setDataLoading(false);
                        setDataSaved(false);
                        setIsSavingDraft(false);
                        setIsQueueing(false);
                    }, 1000);
                }, 1500);
            }
            showSnackbar('success', 'Création de la collection réussie !');
            navigate(`/dashboard/website/modification/collection/${idCollection}`);
            
        } catch (error) {
            showSnackbar('error', '[CREA-COLL-010] Erreur lors de la création de la collection');
            console.error('Erreur lors de la création de la page : ',error);
            setIsPublishing(false);
            setIsSavingDraft(false);
            return;
        }
    };

    return(
        <div className="Blog_creation_Page">
            <div className="header_modification header_page_modification">
                <h3 className="titlePage">Création de la page</h3>
                <div className="button_save_contain">
                        <Tooltip title="Enregistrer comme brouillon" arrow placement="top">
                                <span>
                                <SecondaryButton className="SaveButton" variant="contained" theme={theme} onClick={ async () => {await handleSave('draft')}} disabled={isSavingDraft || isPublishing || isQueueing}>
                                        {isSavingDraft ? <CircularProgress className="circularProgressButton"  sx={{color: theme.palette.text.primary, margin: '0.2rem'}}/> : <SaveIcon/>}
                                </SecondaryButton>
                                </span>
                        </Tooltip>
                        <SecondaryButton  variant="contained" theme={theme} onClick={() => navigate(`/dashboard/website/modification/collection/${idCollection}`)} disabled={isSavingDraft || isPublishing || isQueueing}>Annuler</SecondaryButton>
                        {/* Créér button with menu */}
                        <div>
                            <DefaultButton
                                ref={publishBtnRef}
                                aria-controls={Boolean(isPublishing || isSavingDraft || isQueueing) ? 'create-menu' : 'create-menu'}
                                aria-haspopup="true"
                                onClick={(e) => setAnchorEl(e.currentTarget)}
                                disabled={isPublishing || isSavingDraft || isQueueing}
                                size="large"
                            >
                                {isPublishing ? <CircularProgress size={20} sx={{color: theme.palette.text.primary}}/> : <div className="button-popup-box">Créer <div className="button-popup-line"></div> <KeyboardArrowDownIcon fontSize="small"/></div>}
                            </DefaultButton>
                            <Menu
                                    id="create-menu"
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
                                    MenuListProps={{
                                        sx: {
                                            paddingY: 0
                                        }
                                    }}
                            >
                                    <MenuItem
                                        sx={{ fontSize:"0.85rem", '&:hover': { backgroundColor: theme.palette.primary.third } }}
                                        onClick={() => { setAnchorEl(null); setShowDomainPopup(true); }}
                                    >
                                            Publier maintenant
                                    </MenuItem>
                                    <MenuItem
                                        sx={{ fontSize:"0.85rem",'&:hover': { backgroundColor: theme.palette.primary.third } }}
                                        onClick={async () => { setAnchorEl(null); await handleSave('wait'); }}
                                    >
                                            Ajouter à la queue
                                    </MenuItem>
                                    <MenuItem
                                        sx={{ fontSize:"0.85rem", '&:hover': { backgroundColor: theme.palette.primary.third } }}
                                        onClick={async () => { setAnchorEl(null); await handleSave('draft'); }}
                                    >
                                            Brouillon
                                    </MenuItem>
                            </Menu>
                            <Popper
                                open={showDomainPopup}
                                anchorEl={publishBtnRef.current}
                                transition
                                placement="bottom-end"
                                style={{ zIndex: 1300 }}
                            >
                                {({ TransitionProps }) => (
                                    <ClickAwayListener onClickAway={() => setShowDomainPopup(false)}>
                                        <Grow {...TransitionProps} timeout={350}>
                                            <div style={{marginTop:'0.5rem', background: theme.palette.primary.main, boxShadow: theme.palette.shadow.main, padding:'1rem', maxWidth: '350px', width: '60vw', borderRadius: '0.5rem'}}>
                                                <Box sx={{ mb: 1 }}>
                                                    <h4 style={{ margin: 0, color: theme.palette.text.primary }}>Publication du site</h4>
                                                </Box>
                                                <div className='line-sidebar'></div>
                                                <Box sx={{ mb: 1 }}>
                                                    {/* Domaine principal (toujours activé) */}
                                                    <div style={{display: 'flex', justifyContent: 'space-between', gap: '0.8rem'}}>
                                                        <label className="custom-checkbox" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <input type="checkbox" checked disabled style={{ accentColor: theme.palette.primary.main }} />
                                                            <span className="checkmark"></span>
                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
                                                                <span style={{ color: theme.palette.text.secondary, fontSize: '0.85rem', lineHeight: 1 }}>
                                                                    Domaine preview
                                                                </span>
                                                                <span style={{ fontSize: '0.85rem', lineHeight: 1.2 }}>
                                                                    <b>{selectedWebsite?.website_preview}</b>
                                                                </span>
                                                            </div>
                                                        </label>
                                                        <button 
                                                            className='download-button'
                                                            title="Voir le site public"
                                                            onClick={() => {
                                                                if (selectedWebsite?.website_preview) {
                                                                    window.open(`https://${selectedWebsite.website_preview}`, '_blank');
                                                                }
                                                            }}
                                                        >
                                                            <OpenInNewIcon fontSize='tiny'/>
                                                        </button>
                                                    </div>
                                                    <div className='line-sidebar'></div>
                                                    {/* Domaine personnalisé (si abonnement) */}
                                                    <div style={{display: 'flex', justifyContent: 'space-between', gap: '0.8rem'}}>
                                                        <label className="custom-checkbox" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={!!(subscriptionInfo?.custom_domain && publishCustomDomain)}
                                                                onChange={e => setPublishCustomDomain(e.target.checked)}
                                                                disabled={!subscriptionInfo?.custom_domain}
                                                                style={{ accentColor: theme.palette.primary.main }}
                                                            />
                                                            <span className="checkmark"></span>
                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
                                                                <span style={{ color: theme.palette.text.secondary, fontSize: '0.85rem', lineHeight: 1 }}>
                                                                    Domaine personnalisé
                                                                </span>
                                                                <span style={{ fontSize: '0.85rem', lineHeight: 1.2 }}>
                                                                    {subscriptionInfo?.custom_domain ? (
                                                                        <b>{selectedWebsite?.website_slug || 'Non configuré'}</b>
                                                                    ) : (
                                                                        <NavLink to={`/dashboard/website/subscription`} style={{ color: theme.palette.text.primary, marginLeft: 0, fontSize: 12 }}>
                                                                            Ajouter un domaine personnalisé
                                                                        </NavLink>
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </label>
                                                        <button 
                                                            className='download-button'
                                                            title="Voir le site public"
                                                            onClick={() => {
                                                                if (selectedWebsite?.custom_domain) {
                                                                    window.open(`https://${selectedWebsite.custom_domain}`, '_blank');
                                                                }
                                                            }}
                                                        >
                                                            <OpenInNewIcon fontSize='tiny'/>
                                                        </button>
                                                    </div>
                                                </Box>
                                                <div className='line-sidebar'></div>
                                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                                    <SecondaryButton
                                                        variant="outlined"
                                                        size="small"
                                                        onClick={() => setShowDomainPopup(false)}
                                                    >
                                                        Annuler
                                                    </SecondaryButton>
                                                    <DefaultButton
                                                        size="small"
                                                        disabled={isPublishing}
                                                        onClick={async () => {
                                                            setShowDomainPopup(false);
                                                            setIsPublishing(true);
                                                            setSavingPage(true);
                                                            setDataRetrievalStatus(true);
                                                            setPageGenerationStatus(false);
                                                            setSitePublishingStatus(false);
                                                            try {
                                                                setTimeout(() => setPageGenerationStatus(true), 900);
                                                                // Appel API publication : customDomain = true si la checkbox est cochée ET autorisée
                                                                await handleSave('publish', !!(subscriptionInfo?.custom_domain && publishCustomDomain));
                                                                setTimeout(() => setSitePublishingStatus(true), 1800);
                                                                await new Promise(r => setTimeout(r, 2600));
                                                            } catch (e) {
                                                                showSnackbar('error', 'Erreur lors de la génération du site');
                                                            } finally {
                                                                setIsPublishing(false);
                                                                setTimeout(() => {
                                                                    setSavingPage(false);
                                                                    setDataRetrievalStatus(false);
                                                                    setPageGenerationStatus(false);
                                                                    setSitePublishingStatus(false);
                                                                }, 1200);
                                                            }
                                                        }}
                                                    >
                                                        Publier le site
                                                    </DefaultButton>
                                                </Box>
                                            </div>
                                        </Grow>
                                    </ClickAwayListener>
                                )}
                            </Popper>                           
                        </div>
                </div>
            </div>
            <div className="Blog_creation_field_contain">
                <div className={titleFieldMissed ? "blogField_contain missed_field" : "blogField_contain"}>
                    <p className="blogField_name">Titre principal *</p>
                    <Field type='text' id_config="title" onChange={handleBlogDataChange}/>
                </div>
                {titleFieldMissed && (   
                    <p className="missed_field_text">Champs obligatoires</p>
                )}
                <div className={slugFieldMissed ? "blogField_contain missed_field" : "blogField_contain"}>
                    <p className="blogField_name">Slug *</p>
                    <Field type='text' id_config="slug" onChange={handleBlogDataChange} slugValue={slugValue}/>
                </div>
                {slugFieldMissed && (   
                    <p className="missed_field_text">Champs obligatoires</p>
                )}
                <div className="line_horizontal" style={{backgroundColor: theme.palette.primary.third}}></div>
                {DecodeConfigblog.data && DecodeConfigblog.data.map((blogItem) => (
                  <div key={blogItem.id} className="blogField_contain">
                    <p className="blogField_name">{blogItem.name_field}</p>
                    <p className="blogField_description">{blogItem.description_field}</p>
                    <div className="blogField_field">
                        <Field
                          id_blog_page={idCollection}
                          type={blogItem.tab_field}
                          id_config={blogItem.id}
                          id_collection_ref={blogItem.collection_id_ref}
                          onChange={handleBlogDataChange}
                          imagefunction={true}
                          multiline_text={blogItem.multiline_text}
                        />
                    </div>
                  </div>
                ))}
            </div>
            
            <Snackbar
                open={savingPage}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                sx={{ bottom: 24 }}
            >
                <Paper 
                    elevation={6}
                    sx={{
                        p: 2,
                        minWidth: 300,
                        maxWidth: 400,
                        backgroundColor: theme.palette.background.default,
                        borderRadius: 2
                    }}
                >
                    <Box sx={{ mb: 2 }}>
                        <h3 style={{margin: 0, color: theme.palette.text.primary}}>Publication du site</h3>
                    </Box>
                
                    {/* Étape 1: Récupération des données */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        {!pageGenerationStatus ? (
                            // Toujours loader tant que la génération n'est pas commencée
                            <>
                                <CircularProgress size={16} sx={{color: "#2ec96d"}}/>
                                <Box sx={{ color: theme.palette.text.primary }}>
                                    Récupération des données...
                                </Box>
                            </>
                        ) : (
                            // Étape terminée
                            <>
                                <CheckCircleIcon sx={{ color: "#2ec96d", width: 16, height: 16 }} />
                                <Box sx={{ color: theme.palette.text.secondary }}>
                                    Récupération des données
                                </Box>
                            </>
                        )}
                    </Box>
                    
                    {/* Étape 2: Génération des pages */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        {!pageGenerationStatus ? (
                            // État 1: En attente
                            <>
                                <PendingIcon sx={{ color: theme.palette.text.secondary, width: 16, height: 16 }} />
                                <Box sx={{ color: theme.palette.text.secondary }}>Génération des pages</Box>
                            </>
                        ) : sitePublishingStatus ? (
                            // État 3: Terminé
                            <>
                                <CheckCircleIcon sx={{ color: "#2ec96d", width: 16, height: 16 }} />
                                <Box sx={{ color: theme.palette.text.secondary }}>
                                    Génération des pages
                                </Box>
                            </>
                        ) : (
                            // État 2: En cours
                            <>
                                <CircularProgress size={16} sx={{color: "#2ec96d"}}/>
                                <Box sx={{ color: theme.palette.text.primary }}>
                                    Génération des pages...
                                </Box>
                            </>
                        )}
                    </Box>
                    
                    {/* Étape 3: Publication du site */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {!sitePublishingStatus ? (
                            // État 1: En attente
                            <>
                                <PendingIcon sx={{ color: theme.palette.text.secondary, width: 16, height: 16 }} />
                                <Box sx={{ color: theme.palette.text.secondary }}>Publication du site</Box>
                            </>
                        ) : false ? ( // Remplacer 'false' par une variable d'état si vous avez une étape après celle-ci
                            // État 3: Terminé - Exemple laissé si vous ajoutez une étape finale
                            <>
                                <CheckCircleIcon sx={{ color: "#2ec96d", width: 16, height: 16 }} />
                                <Box sx={{ color: theme.palette.text.secondary }}>
                                    Publication du site ✓
                                </Box>
                            </>
                        ) : (
                            // État 2: En cours
                            <>
                                <CircularProgress size={16} sx={{color: "#2ec96d"}}/>
                                <Box sx={{ color: theme.palette.text.primary }}>
                                    Publication du site...
                                </Box>
                            </>
                        )}
                    </Box>
                </Paper>
            </Snackbar>

            <Snackbar
                open={dataLoading}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                sx={{ bottom: 24 }}
            >
                <Paper
                    elevation={6}
                    sx={{
                        p: 2,
                        minWidth: 250,
                        maxWidth: 350,
                        backgroundColor: theme.palette.background.default,
                        borderRadius: 2,
                    }}
                >
                    <Box sx={{ mb: 1 }}>
                        <h3 style={{ margin: 0, color: theme.palette.text.primary }}>Enregistrement de la page</h3>
                    </Box>
                
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {dataSaved ? (
                            <>
                                <CheckCircleIcon sx={{ color: "#2ec96d", width: 16, height: 16 }} />
                                <Box sx={{ color: theme.palette.text.secondary }}>
                                    Sauvegarde des données
                                </Box>
                            </>
                        ) : (
                            <>
                                <CircularProgress size={16} sx={{ color: "#2ec96d" }} />
                                <Box sx={{ color: theme.palette.text.primary }}>
                                    Sauvegarde des données...
                                </Box>
                            </>
                        )}
                    </Box>
                </Paper>
            </Snackbar>
        </div>

    )
}

export default CreateElementCollection