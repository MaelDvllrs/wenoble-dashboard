import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Axios from "axios";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";

// MUI
import { Box, Paper, Snackbar, Tooltip } from "@mui/material";
import CircularProgress from "@mui/material/CircularProgress";
import SaveIcon from "@mui/icons-material/Save";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PendingIcon from "@mui/icons-material/Pending";
import { useTheme } from "@mui/material/styles";

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
    const [dataRetrievalStatus, setDataRetrievalStatus] = useState(false);
    const [pageGenerationStatus, setPageGenerationStatus] = useState(false);
    const [sitePublishingStatus, setSitePublishingStatus] = useState(false);
    const [titleFieldMissed , setTitleFieldMissed] = useState(false);
    const [slugFieldMissed , setSlugFieldMissed] = useState(false);

    // ---- useContext ---
    const { showSnackbar } = useSnackbar();

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

    const handleSave = async (status) => {
        // Affichage immédiat du feedback visuel
        if (status === 1) {
            setSavingPage(true); // snackbar publication
        } else {
            setDataLoading(true); // snackbar brouillon
        }
        if (status === 1) {
            setIsPublishing(true);
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
            if (status === 1) {
                setDataRetrievalStatus(true);
                try {
                    setTimeout(() => { setPageGenerationStatus(true); }, 1000);
                    await generateStaticSite(token, selectedWebsite?.id);
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
                        <SecondaryButton className="SaveButton" variant="contained" theme={theme} onClick={ async () => {await handleSave(0)}} disabled={isSavingDraft || isPublishing}>
                            {isSavingDraft ? <CircularProgress className="circularProgressButton"  sx={{color: theme.palette.text.primary, margin: '0.2rem'}}/> : <SaveIcon/>}
                        </SecondaryButton>
                        </span>
                    </Tooltip>
                    <SecondaryButton  variant="contained" theme={theme} onClick={() => navigate(`/dashboard/website/modification/collection/${idCollection}`)} disabled={isSavingDraft || isPublishing}>Annuler</SecondaryButton>
                    <DefaultButton type="submit" variant="contained" onClick={ async () => {await handleSave(1)}} disabled={isPublishing || isSavingDraft}>
                      {isPublishing && (
                        <CircularProgress className="circularProgressButton" sx={{color: theme.palette.text.primary, marginRight: 1}}/>
                      )}
                      Publier
                    </DefaultButton>
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