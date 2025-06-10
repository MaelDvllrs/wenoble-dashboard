import React from "react"
import Axios from 'axios';
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import config from "../../../../../config";
import {jwtDecode} from 'jwt-decode'; 
import './collection.css'
import {DefaultButton, SecondaryButton, Popup} from '../../../../../Theme/element';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import { createImageBlog, createBlogPage, createTextBlog, createRichTextBlog, createVideoBlog, createMultiReferenceBlog, createGalleryBlog, generateStaticSite } from './apiCollection';
import { useTheme } from '@mui/material/styles';
import { convertToRaw } from 'draft-js';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import Field from "../Fields/fields";
import Cookies from 'js-cookie';

import { Snackbar, Paper, Box } from '@mui/material';

import { getCurrentUTCDate, adjustDateForStorage } from '../../../../../utils/dateUtils';






const CreateElementCollection = () => {

    const theme = useTheme();

    const token = Cookies.get('token');
    
    const idUser = jwtDecode(token).idUser;


    const [InfoConfigBlog, setConfigblog] = useState([]);
    const [DecodeConfigblog, setDecodeConfigblog] = useState([]);
    const [slugValue, setSlugValue] = useState('');

    const [savingPage, setSavingPage] = useState(false);
    
    const [dataRetrievalStatus, setDataRetrievalStatus] = useState(false);
    const [pageGenerationStatus, setPageGenerationStatus] = useState(false);
    const [sitePublishingStatus, setSitePublishingStatus] = useState(false);


    const [dataLoading, setDataLoading] = useState(false);
    const [dataSaved, setDataSaved] = useState(false);


    
    const [titleFieldMissed , setTitleFieldMissed] = useState(false);
    const [slugFieldMissed , setSlugFieldMissed] = useState(false);

    
    const navigate = useNavigate();



    const [blogData, setBlogData] = useState({
        text: [],
        images: [],
        richText: [],
        video: [],
        multiReference: [],
        gallery: [],
    });

    const apiUrl = config.apiUrl;
    const { idCollection } = useParams();

    useEffect(() => {    
    
        Axios.get(`${apiUrl}/getConfigCollection`, {
            params: {
                IdBlog: idCollection,
            },
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
        }).then((response) => {
            setConfigblog(response.data);
        }).catch((error) => {
            console.error('Erreur lors de la récupération de la du Blog :', error);
        });
    }, [InfoConfigBlog]);


    useEffect(() => {
        if(InfoConfigBlog !== null && typeof InfoConfigBlog === 'string'){
            const decodedConfig = jwtDecode(InfoConfigBlog);
            setDecodeConfigblog(decodedConfig);
        }
    }, [InfoConfigBlog]);



    



    const handleBlogDataChange = (data, isDelete = false) => {

        setBlogData(prevData => {
          const newData = { ...prevData };

          const config = data.data.id_config;
          if (config === 'title') {
            const normalizeText = (text) => {
                return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            };
              
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

        if (status === 1) {
            setSavingPage(true);
        } else {
            setDataLoading(true);
        }

        let titleMissed = false;
        let slugMissed = false;
        
        
        blogData.text.forEach(text => {
            if (text.id_config === 'title') {
                titleMissed = true;   
            }
            if(text.id_config === 'slug'){
                slugMissed = true;
            }
        });

        if (!titleMissed) {
            setTitleFieldMissed(true);
        }

        if (!slugMissed) {
            setSlugFieldMissed(true);
        }

        if (!titleMissed || !slugMissed) {
            setSavingPage(false);
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
            const response = await createBlogPage(idCollection, mainText, date, status, idUser, token);
            
            // Gérer la réponse ici
            const blogPageId = response.id;
        


            // ENREGISTRER LES TEXTES

            try {
                const response = await createTextBlog(blogPageId, otherText, token);

            } catch (error) {
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
                const response = await createRichTextBlog(blogPageId, infoRichText, token);
            } catch (error) {
                console.error('Erreur lors de la création des richtextes :', error);
                return;
            }

            // ENREGISTRER LES IMAGE
            try {
                // Utiliser Promise.all pour attendre que toutes les images soient sauvegardées
                await Promise.all(blogData.images.map(async (image) => {
                    await createImageBlog(image, blogPageId, token);
                }));

            } catch (error) {
                console.error(error);
                return;
            }

            //ENREGISTRER LES GALLERIES
            try {
                await Promise.all(blogData.gallery.map(async (gallery) => {
                    await createGalleryBlog(gallery, blogPageId, token);
                }));
            } catch (error) {
                console.error(error);
                return;
            }


            //ENREGISTRER LES VIDEO
            try {
                await Promise.all(blogData.video.map(async (video) => {
                    await createVideoBlog(video, blogPageId, token);
                }));
            } catch (error) {
                console.error(error);
                return;
            }

            //ENREGISTRER LES MULTIREFERENCE
            try {
                await Promise.all(blogData.multiReference.map(async (multiReference) => {
                    await createMultiReferenceBlog(blogPageId, multiReference, token);
                }));
            } catch (error) {
                console.error(error);
                return;
            }


            // Générer le site
            if (status === 1) {
                // Commence par la récupération des données (déjà faite dans handleSave)
                setDataRetrievalStatus(true);

                try {
                    // La récupération des données est terminée, passe à la génération des pages
                    setTimeout(() => {
                        setPageGenerationStatus(true);
                    }, 1000); // Délai pour visualiser la transition

                    // Appel à l'API de génération du site
                    await generateStaticSite(token);

                    // La génération est terminée, passe à la publication
                    setTimeout(() => {
                        setSitePublishingStatus(true);
                    }, 1000); // Délai pour visualiser la transition

                    // Simule le temps nécessaire pour publier
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    // Réinitialise tous les états
                    setDataRetrievalStatus(false);
                    setPageGenerationStatus(false);
                    setSitePublishingStatus(false);
                    setSavingPage(false);
                } catch (error) {
                    console.error('Erreur lors de la generation static :', error);
                    // Réinitialise tous les états en cas d'erreur
                    setDataRetrievalStatus(false);
                    setPageGenerationStatus(false);
                    setSitePublishingStatus(false);
                    setSavingPage(false);
                    return;
                }
            } else{

                // Toutes vos opérations de sauvegarde ici...

                // Après toutes les opérations, montrer la confirmation
                // avant de fermer la snackbar
                setTimeout(() => {
                    setDataSaved(true); // Activez l'icône de validation

                    // Puis fermez la snackbar après un délai supplémentaire
                    setTimeout(() => {
                        setDataLoading(false);
                        setDataSaved(false); // Réinitialiser pour la prochaine utilisation
                    }, 1000);
                }, 1500);

            }

            navigate(`/dashboard/modification/collection/${idCollection}`);

        } catch (error) {
            // Gérer l'erreur ici
            console.error('Erreur lors de la création de la page : ',error);
            return;
        }

    };


    return(
        <div className="Blog_creation_Page">
            <div className="header_modification">
                <h3 >Création de la page</h3>
                <div className="button_save_contain">
                    <Tooltip title="Enregistrer comme brouillon" arrow placement="top">
                        <SecondaryButton className="SaveButton" variant="contained" theme={theme} onClick={ async () => {await handleSave(0)}}><SaveIcon/></SecondaryButton>
                    </Tooltip>
                    <SecondaryButton  variant="contained" theme={theme} onClick={() => navigate(`/dashboard/modification/collection/${idCollection}`)}>Annuler</SecondaryButton>
                    <DefaultButton type="submit" variant="contained" onClick={ async () => {await handleSave(1)}}>Publier</DefaultButton>
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
                {DecodeConfigblog.blogConfig && DecodeConfigblog.blogConfig.map((blogItem) => (
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
                        {!dataRetrievalStatus ? (
                            // État 1: En attente
                            <>
                                <PendingIcon sx={{ color: theme.palette.text.secondary, width: 16, height: 16 }} />
                                <Box sx={{ color: theme.palette.text.secondary }}>Récupération des données</Box>
                            </>
                        ) : pageGenerationStatus ? (
                            // État 3: Terminé
                            <>
                                <CheckCircleIcon sx={{ color: "#2ec96d", width: 16, height: 16 }} />
                                <Box sx={{ color: theme.palette.text.secondary }}>
                                    Récupération des données
                                </Box>
                            </>
                        ) : (
                            // État 2: En cours
                            <>
                                <CircularProgress size={16} sx={{color: "#2ec96d"}}/>
                                <Box sx={{ color: theme.palette.text.primary }}>
                                    Récupération des données...
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