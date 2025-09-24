// --- React & Libs ---
import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { jwtDecode } from 'jwt-decode';

// --- MUI ---
import { useTheme } from '@mui/material/styles';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import Snackbar from '@mui/material/Snackbar';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import PendingIcon from '@mui/icons-material/Pending';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SaveIcon from '@mui/icons-material/Save';
import UnpublishedIcon from '@mui/icons-material/Unpublished';

// --- App/Utils ---
import Axios from '../../../../../service/AxiosConfig';
import config from "../../../../../config";
import { useSnackbar } from '../../../../../Theme/snackbar';
import Field from "../Fields/fields";
import { DefaultButton, RedButton, SecondaryButton, Popup } from '../../../../../Theme/element';
import { updateImageBlog, updateBlogPage, updateTextBlog, updateRichTextBlog, updateVideoBlog, updateMultiReferenceBlog, updateGalleryBlog, generateStaticSite } from './apiCollection';
import { deleteBlogPage } from './collectionDeleteUtils';
import { convertToRaw, ContentState, convertFromRaw } from 'draft-js';
import Cookies from 'js-cookie';
import './collection.css';
import { WebsiteContext } from '../../../../../Context/WebsiteContext';

// --- Helper: format date ---
function formatDateFR(date) {
    return new Intl.DateTimeFormat('fr-FR', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false
    }).format(date);
}

// --- Component ---
const EditElementCollection = () => {

    const theme = useTheme();

    const token = Cookies.get('token');
    
    const idUser = jwtDecode(token).idUser;

    const [DecodeConfigblog, setDecodeConfigblog] = useState([]);

    const [InfoBlog, setInfoBlog] = useState([]);
    const [DecodeBlog, setDecodeBlog] = useState([]);

    const [InfoBlogPage, setInfoBlogPage] = useState([]);

    const [slugValue, setSlugValue] = useState('');
    const [formattedCreateDate, setFormattedCreateDate] = useState('');
    const [formattedUpdatedDate, setFormattedUpdatedDate] = useState('');
    const [formattedPublishedDate, setFormattedPublishedDate] = useState('');
    
    // États pour les noms d'utilisateurs
    const [createdByUsername, setCreatedByUsername] = useState('');
    const [updatedByUsername, setUpdatedByUsername] = useState('');
    const [publishedByUsername, setPublishedByUsername] = useState('');


    const [deletedItems, setDeletedItems] = useState([]);

    const [savingPage, setSavingPage] = useState(false);

    const [dataRetrievalStatus, setDataRetrievalStatus] = useState(false);
    const [pageGenerationStatus, setPageGenerationStatus] = useState(false);
    const [sitePublishingStatus, setSitePublishingStatus] = useState(false);


    const [dataLoading, setDataLoading] = useState(false);
    const [dataSaved, setDataSaved] = useState(false);


    const [deletingPublishedPage, setDeletingPublishedPage] = useState(false);
    const [deletingDraftPage, setDeletingDraftPage] = useState(false);
    const [deletionCompleted, setDeletionCompleted] = useState(false);

    const [deleteDataStatus, setDeleteDataStatus] = useState(false);
    const [regenerateSiteStatus, setRegenerateSiteStatus] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);



    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const openPopup = () => setIsPopupOpen(true);
    const closePopup = () => setIsPopupOpen(false);

    
    const navigate = useNavigate(); 

    const [blogDataConfig, setBlogDataConfig] = useState({
        text: [],
        images: [],
        richText: [],
        video: [],
        multiReference: [],
        gallery: []

    });


    const [blogData, setBlogData] = useState({
        text: [],
        images: [],
        richText: [],
        video: [],
        multiReference: [],
        gallery: []

    });


        // ---- useContext ---


    const { showSnackbar } = useSnackbar();
    const { selectedWebsite } = useContext(WebsiteContext);

    const apiUrl = config.apiUrl;
    const urlBucketCollectionImage = config.urlBucketCollectionImage;
    const { idCollectionElement } = useParams();
    const { idCollection } = useParams();

    



    // Loading states pour chaque action
    const [isPublishing, setIsPublishing] = useState(false);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [isUnpublishing, setIsUnpublishing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async (status, setpublishDate) => {
        // Gestion des loaders par action
        if (status === 1 && DecodeBlog.blogPage[0].status !== true) {
            setIsPublishing(true);
        } else if (status === 1 && DecodeBlog.blogPage[0].status === true) {
            setIsSaving(true);
        } else if (status === 0 && DecodeBlog.blogPage[0].status === true) {
            setIsUnpublishing(true);
        } else if (status === 0 && DecodeBlog.blogPage[0].status !== true) {
            setIsSavingDraft(true);
        }

        // MODIFIER LA PAGE

        

        if (status === 1 || status !== DecodeBlog.blogPage[0].status) {
            setSavingPage(true);
        } else {
            setDataLoading(true);
        }


        const date = new Date();

        const adjustedTime = new Date(date.getTime() + 3600000);




        const localISOTime = adjustedTime.toISOString().slice(0, 19).replace('T', ' ');


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


            const response = await updateBlogPage(idCollectionElement, mainText, localISOTime, status, setpublishDate, DecodeBlog.blogPage[0].status, selectedWebsite?.id, idCollection, token);
        
            // ENREGISTRER LES TEXTES

            if (otherText.length > 0) {

                try {
                    const response = await updateTextBlog(idCollectionElement, otherText, token);

                } catch (error) {
                    showSnackbar('error', '[EDIT-COLL-001] Erreur lors de la sauvegarde des données');
                    setIsPublishing(false);
                    setIsSaving(false);
                    setIsUnpublishing(false);
                    setIsSavingDraft(false);
                    setSavingPage(false);
                    console.error('Erreur lors de la création des textes :', error);
                    return;
                }

            }


            // ENREGISTRER LES RICHTEXT
            if (blogData.richText.length > 0) {
                const infoRichText = [];
                blogData.richText.forEach(richText => {
                  const contentRichText = richText.value;
          
                  // Vérifiez que contentRichText est un objet ContentState valide
                  let contentState;
                  if (typeof contentRichText === 'object' && contentRichText.blocks) {
                    // Si contentRichText est déjà au format brut (raw) JSON, convertissez-le en ContentState
                    contentState = convertFromRaw(contentRichText);
                  } else if (contentRichText instanceof ContentState) {
                    contentState = contentRichText;
                  } else {
                    showSnackbar('error', '[EDIT-COLL-002] Erreur lors de la sauvegarde des données');
                    setIsPublishing(false);
                    setIsSaving(false);
                    setIsUnpublishing(false);
                    setIsSavingDraft(false);
                    setSavingPage(false);
                    console.error('contentRichText is not a valid ContentState object or raw JSON');
                    return;
                  }
          
                  const richTextJS = convertToRaw(contentState);
                  const richTextJSON = JSON.stringify(richTextJS);
                  infoRichText.push({ richText: richTextJSON, id_config: richText.id_config, create: richText.create });
                });
          
                try {
                  const response = await updateRichTextBlog(idCollectionElement, infoRichText, token);
                } catch (error) {
                    showSnackbar('error', '[EDIT-COLL-003] Erreur lors de la sauvegarde des données');
                    setIsPublishing(false);
                    setIsSaving(false);
                    setIsUnpublishing(false);
                    setIsSavingDraft(false);
                    setSavingPage(false);
                    console.error('Erreur lors de la création des richtextes :', error);
                    return;
                }
              }


            

            // ENREGISTRER LES IMAGE
            if(blogData.images.length > 0){
                try {
                    // Utiliser Promise.all pour attendre que toutes les images soient sauvegardées
                    await Promise.all(blogData.images.map(async (image) => {
                        await updateImageBlog(image, idCollectionElement, token);
                    }));

                } catch (error) {
                    showSnackbar('error', '[EDIT-COLL-004] Erreur lors de la sauvegarde des données');
                    setIsPublishing(false);
                    setIsSaving(false);
                    setIsUnpublishing(false);
                    setIsSavingDraft(false);
                    setSavingPage(false);
                    console.error(error);
                    return;
                }
            }

            //ENREGISTRER LES VIDEO
            if(blogData.video.length > 0){
                try {
                    await Promise.all(blogData.video.map(async (video) => {
                        await updateVideoBlog(video, idCollectionElement, token);
                    }));
                } catch (error) {
                    showSnackbar('error', '[EDIT-COLL-005] Erreur lors de la sauvegarde des données');
                    setIsPublishing(false);
                    setIsSaving(false);
                    setIsUnpublishing(false);
                    setIsSavingDraft(false);
                    setSavingPage(false);
                    console.error(error);
                    return;
                }
            }

            //ENREGISTRER LES MULTIREFERENCE

            if(blogData.multiReference.length > 0){
                try {
                    await Promise.all(blogData.multiReference.map(async (multiReference) => {
                        await updateMultiReferenceBlog(idCollectionElement, multiReference, token);
                    }));
                } catch (error) {
                    // Gérer l'erreur ici
                    showSnackbar('error', '[EDIT-COLL-006] Erreur lors de la sauvegarde des données');
                    setIsPublishing(false);
                    setIsSaving(false);
                    setIsUnpublishing(false);
                    setIsSavingDraft(false);
                    setSavingPage(false);

                    console.error(error);
                    return;
                }
            }

            //ENREGISTRER LES GALLERIES
            if(blogData.gallery.length > 0){
                try {
                    await Promise.all(blogData.gallery.map(async (gallery) => {
                        await updateGalleryBlog(idCollectionElement, gallery, token);
                    }));
                } catch (error) {
                    showSnackbar('error', '[EDIT-COLL-007] Erreur lors de la sauvegarde des données');
                    setIsPublishing(false);
                    setIsSaving(false);
                    setIsUnpublishing(false);
                    setIsSavingDraft(false);
                    setSavingPage(false);
                    console.error(error);
                    return;
                }
            }


            // Supprimer les éléments supprimés
            if (deletedItems.length > 0) {
                try {
                    await Axios.delete(`${apiUrl}/deleteBlogData`, {
                        data: {
                            data: deletedItems,
                            id_blog_page : idCollectionElement
                        },
                        headers: {
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json'
                        }
                    });
                } catch (error) {
                    console.error('Erreur lors de la suppression des éléments :', error);
                    return;
                }
            }

            // Mettre à jour l'état local pour refléter immédiatement les changements (status, titre, slug, dates)
            setDecodeBlog((prev) => {
                if (!prev || !prev.blogPage || !prev.blogPage[0]) return prev;
                const updated = { ...prev };
                const bp = { ...updated.blogPage[0] };
                const titleItem = mainText.find(t => t.id_config === 'title');
                const slugItem = mainText.find(t => t.id_config === 'slug');
                if (titleItem) bp.page_blog_name = titleItem.value;
                if (slugItem) bp.page_blog_slug = slugItem.value;
                bp.status = status === 1;
                bp.page_blog_update_date = localISOTime;
                if (setpublishDate === 1) {
                    bp.page_blog_publish_date = (status === 1) ? localISOTime : null;
                }
                updated.blogPage = [bp];
                return updated;
            });

            // Mettre à jour le site si le statut est 1 ou si le statut a changé
            if (status === 1 || status !== DecodeBlog.blogPage[0].status) {
                setDataRetrievalStatus(true);
                try {
                    setTimeout(() => {
                      setPageGenerationStatus(true);
                    }, 1000);
                    await generateStaticSite(token, selectedWebsite?.id);
                    setTimeout(() => {
                      setSitePublishingStatus(true);
                    }, 1000);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    setDataRetrievalStatus(false);
                    setPageGenerationStatus(false);
                    setSitePublishingStatus(false);
                    setSavingPage(false);
                    setIsPublishing(false);
                    setIsSaving(false);
                    setIsUnpublishing(false);
                    setIsSavingDraft(false);
                  } catch (error) {
                    showSnackbar('error', '[EDIT-COLL-008] Erreur lors de la génération du site');
                    console.error('Erreur lors de la generation static :', error);
                    setIsPublishing(false);
                    setIsSaving(false);
                    setIsUnpublishing(false);
                    setIsSavingDraft(false);
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
                        setDataSaved(false);
                        setIsPublishing(false);
                        setIsSaving(false);
                        setIsUnpublishing(false);
                        setIsSavingDraft(false);
                    }, 1000);
                }, 1500);

            }
            
            // Afficher un message de succès
            showSnackbar('success', 'Sauvegarde de la collection réussie !');


        } catch (error) {
            showSnackbar('error', '[EDIT-COLL-009] Erreur lors de la sauvegarde de la collection');
            console.error('Erreur lors de la création de la page :',error);
            setIsPublishing(false);
            setIsSaving(false);
            setIsUnpublishing(false);
            setIsSavingDraft(false);
            setSavingPage(false);
            return;
        }

    };





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
            // Filtrer pour supprimer l'élément
            const exists = deletedItems.some(item => item.id_config === data.data.id_config);
            if (!exists) {
                setDeletedItems(prevItems => [...prevItems, data.data]);
            }

            newData[type] = newData[type].filter(item => item.id_config !== data.data.id_config);
            

          } else {
            let itemModified = false; // Flag pour vérifier si un item a été modifié
      
            for (let i = 0; i < newData[type].length; i++) {
                if (newData[type][i].id_config === data.data.id_config) {
                  newData[type][i] = data.data; // Modifier directement l'élément dans le tableau
                  itemModified = true; // Marquer qu'un item a été modifié
                  break; // Sortir de la boucle
                }
            }
      
            // Si aucun item n'a été modifié, ajouter le nouvel item
            if (!itemModified) {
              newData[type].push(data.data);
            }
          }
          return newData;
        });
    };

    



    const handleDeletePage = async (slug) => {
        setIsDeleting(true);
        closePopup();
        const isPublished = DecodeBlog.blogPage[0].status === true;
        if (isPublished) setDeletingPublishedPage(true);
        else setDeletingDraftPage(true);
        try {
          setDeleteDataStatus(true);
          await deleteBlogPage({
            apiUrl,
            token,
            idWebsite: selectedWebsite?.id,
            idBlog: idCollection,
            slug,
            idBlogPage: idCollectionElement,
            isPublished,
            onStatus: (status) => {
              if (status === 'regenerating') setRegenerateSiteStatus(true);
              if (status === 'deleted') setDeletionCompleted(true);
            },
                        generateStaticSite,
            navigate
          });
          setTimeout(() => {
            setDeletingPublishedPage(false);
            setDeletingDraftPage(false);
            setDeleteDataStatus(false);
            setRegenerateSiteStatus(false);
            setDeletionCompleted(false);
          }, 1500);

          showSnackbar('success', 'Collection supprimée avec succès !');
        } catch (error) {
          showSnackbar('error', '[EDIT-COLL-010] Erreur lors de la suppression de la collection');
          console.error('Erreur lors de la suppression de la page :', error);
          setIsDeleting(false);
          setDeletingPublishedPage(false);
          setDeletingDraftPage(false);
          setDeleteDataStatus(false);
          setRegenerateSiteStatus(false);
        }
    };






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
            // L'API retourne maintenant les données directement, plus besoin de JWT
            setDecodeConfigblog(response.data);
        }).catch((error) => {
            console.error('Erreur lors de la récupération de la du Blog :', error);
        });
    }, []);



    useEffect(() => {
        DecodeConfigblog.data && DecodeConfigblog.data.map((blogItem) => {
            if (blogItem.tab_field === 'image') {
                setBlogDataConfig(prevData => ({
                    ...prevData,
                    images: [...prevData.images, {id_config: blogItem.id}]
                }));
            } else if (blogItem.tab_field === 'text') {
                setBlogDataConfig(prevData => ({
                    ...prevData,
                    text: [...prevData.text, {id_config: blogItem.id}]
                }));
            } else if (blogItem.tab_field === 'richText') {
                setBlogDataConfig(prevData => ({
                    ...prevData,
                    richText: [...prevData.richText, {id_config: blogItem.id}]
                }));
            } else if (blogItem.tab_field === 'video') {
                setBlogDataConfig(prevData => ({
                    ...prevData,
                    video: [...prevData.video, {id_config: blogItem.id}]
                }));
            } else if (blogItem.tab_field === 'multiReference') {
                setBlogDataConfig(prevData => ({
                    ...prevData,
                    multiReference: [...prevData.multiReference, {id_config: blogItem.id}]
                }));
            } else if (blogItem.tab_field === 'gallery') {
                setBlogDataConfig(prevData => ({
                    ...prevData,
                    gallery: [...prevData.gallery, {id_config: blogItem.id}]
                }));
            }

        });
    }, [DecodeConfigblog]);




    useEffect(() => {
        let allData = []; 

        const fetchData = async () => {

            
            for (const text of blogDataConfig.text) {
                try {
                    const response = await Axios.get(`${apiUrl}/getTextCollection`, {
                        params: {
                            IdBlogPage: idCollectionElement,
                            IdConfig: text.id_config
                        },
                        headers: {
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json'
                        }
                    });
                    if (response.data.length > 0) {
                        allData.push(response.data[0]); 
                    }
                } catch (error) {
                    showSnackbar('error', '[EDIT-COLL-011] Erreur lors de la récupération des données');
                    console.error('Erreur lors de la récupération du texte :', error);
                }
            }

            for (const images of blogDataConfig.images) {
                try{
                    const response = await Axios.get(`${apiUrl}/getImageCollection`, {
                        params: {
                            IdBlogPage: idCollectionElement,
                            IdConfig: images.id_config
                        },
                        headers: {
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json'
                        }
                    });

                    if (response.data.length > 0) {
                        allData.push(response.data[0]); 
                    }
                } catch (error) {
                    showSnackbar('error', '[EDIT-COLL-012] Erreur lors de la récupération des données');
                    console.error('Erreur lors de la récupération du texte :', error);
                }
            }
            for (const video of blogDataConfig.video) {
                try{
                    const response = await Axios.get(`${apiUrl}/getVideoCollection`, {
                        params: {
                            IdBlogPage: idCollectionElement,
                            IdConfig: video.id_config
                        },
                        headers: {
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json'
                        }
                    });

                    if (response.data.length > 0) {

                        allData.push(response.data[0]); 
                    }
                } catch (error) {
                    showSnackbar('error', '[EDIT-COLL-013] Erreur lors de la récupération des données');
                    console.error('Erreur lors de la récupération du texte :', error);
                }
            }

            for (const richText of blogDataConfig.richText) {
                try{
                    const response = await Axios.get(`${apiUrl}/getRichTextCollection`, {
                        params: {
                            IdBlogPage: idCollectionElement,
                            IdConfig: richText.id_config
                        },
                        headers: {
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json'
                        }
                    });

                    if (response.data.length > 0) {
                        allData.push(response.data[0]); 
                    }
                } catch (error) {
                    showSnackbar('error', '[EDIT-COLL-014] Erreur lors de la récupération des données');
                    console.error('Erreur lors de la récupération du texte :', error);
                }
            }

            for (const multiReference of blogDataConfig.multiReference) {
                try{
                    const response = await Axios.get(`${apiUrl}/getMultiReferenceCollection`, {
                        params: {
                            IdBlogPage: idCollectionElement,
                            IdConfig: multiReference.id_config
                        },
                        headers: {
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json'
                        }
                    });

                    if (response.data.length > 0) {
                        allData.push(response.data[0]); 
                    }
                } catch (error) {
                    showSnackbar('error', '[EDIT-COLL-015] Erreur lors de la récupération des données');
                    console.error('Erreur lors de la récupération du texte :', error);
                }
            }

            for (const gallery of blogDataConfig.gallery) {
                try{
                    const response = await Axios.get(`${apiUrl}/getGalleryCollection`, {
                        params: {
                            IdBlogPage: idCollectionElement,
                            IdConfig: gallery.id_config
                        },
                        headers: {
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json'
                        }
                    });

                    if (response.data.length > 0) {
                        allData.push(response.data[0]); 
                    }
                } catch (error) {
                    showSnackbar('error', '[EDIT-COLL-016] Erreur lors de la récupération des données');
                    console.error('Erreur lors de la récupération du texte :', error);
                }
            }

            setInfoBlogPage({ data: allData }); 
        };
        
        fetchData(); 

    }, [blogDataConfig, idCollectionElement]);

    
    useEffect(() => {
        if (isDeleting) return; // Ne pas appeler si suppression en cours
        let cancelled = false;
        Axios.get(`${apiUrl}/getCollectionElement`, {
            params: { IdBlogPage: idCollectionElement },
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
        }).then((response) => {
            if (!cancelled) setInfoBlog(response.data);
        }).catch((error) => {
            const status = error?.response?.status;
            const code = error?.response?.data?.error?.code;
            if (status === 404 || code === 'PGRST116') {
              // Considérer comme supprimé: éviter boucle + snackbar spam
              if (!cancelled) setInfoBlog(null);
              return;
            }
            showSnackbar('error', '[EDIT-COLL-017] Erreur lors de la récupération de la collection');
            console.error('Erreur lors de la récupération de la page du Blog :', error);
        });
        return () => { cancelled = true; };
    }, [idCollectionElement, isDeleting, apiUrl, token]);


    useEffect(() => {
        if(InfoBlog !== null && typeof InfoBlog === 'string'){
            const decodedBloginfo = jwtDecode(InfoBlog);
            setDecodeBlog(decodedBloginfo);
        }
    }, [InfoBlog]);





    useEffect(() => {

        if (DecodeBlog.length !== 0 && !isDeleting) {
            const createDate = new Date(DecodeBlog.blogPage[0].page_blog_create_date);
            const formattedCreateDate = formatDateFR(createDate);
            setFormattedCreateDate(formattedCreateDate);
        
            // Convertir page_blog_update_date
            const updateDate = new Date(DecodeBlog.blogPage[0].page_blog_update_date);
            const formattedUpdateDate = formatDateFR(updateDate);
            setFormattedUpdatedDate(formattedUpdateDate);

            if (DecodeBlog.blogPage[0].page_blog_publish_date) {
                const publishDate = new Date(DecodeBlog.blogPage[0].page_blog_publish_date);

                const formattedpublishDate = formatDateFR(publishDate);
                setFormattedPublishedDate(formattedpublishDate);
            } else {
                setFormattedPublishedDate('Non publié');
            }

            // Définir les noms d'utilisateurs
            setCreatedByUsername(DecodeBlog.blogPage[0].created_by_username || 'Utilisateur inconnu');
            setUpdatedByUsername(DecodeBlog.blogPage[0].updated_by_username || 'Utilisateur inconnu');
            setPublishedByUsername(DecodeBlog.blogPage[0].published_by_username || '');
        }
        
    }, [DecodeBlog])
    
    


    return(
        <div className="Blog_creation_Page">
            {
            DecodeBlog.blogPage && !isDeleting ? (
                <div className="collection_content">
                  <div className="header_modification header_page_modification">
                    <h3 className="titlePage">Modification de : {DecodeBlog.blogPage[0].page_blog_name}</h3>
                    <div className="button_save_contain">
                        <p style={{color: theme.palette.text.secondary, whiteSpace:"nowrap"}}>Status :</p>
                        {
                            savingPage ? (
                                <p className="blog_status pending_status">En attente...</p>
                            ) : DecodeBlog.blogPage[0].status === true ? (
                                <p className="blog_status publish_status">Publié</p>    
                            ) : (
                                <p className="blog_status draft_status">Brouillon</p>
                            )
                        }
                        {
                            DecodeBlog.blogPage[0].status === true ? (
                                <Tooltip title="Dépublier" arrow placement="top">
                                    <SecondaryButton className="SaveButton" type="submit" variant="contained" theme={theme} onClick={ async () => {await handleSave(0,1)}} disabled={isUnpublishing || isPublishing || isSaving || isSavingDraft}>
                                        {isUnpublishing ? (
                                            <CircularProgress size={16} sx={{color: theme.palette.text.primary, margin: '0.2rem'}}/>
                                        ) : (
                                            <UnpublishedIcon/>
                                        )}
                                    </SecondaryButton>
                                </Tooltip>   
                            ) : (
                                <Tooltip title="Enregistrer comme brouillon" arrow placement="top">
                                    <SecondaryButton className="SaveButton" variant="contained" theme={theme} onClick={ async () => {await handleSave(0,0)}} disabled={isSavingDraft || isPublishing || isSaving || isUnpublishing}>
                                        {isSavingDraft ? (
                                            <CircularProgress size={16} sx={{color: theme.palette.text.primary, margin: '0.2rem'}}/>
                                        ) : (
                                            <SaveIcon/>
                                        )}
                                    </SecondaryButton>
                                </Tooltip>
                            )
                        }
                        <SecondaryButton variant="contained" theme={theme} onClick={() => navigate(`/dashboard/modification/collection/${idCollection}`)} disabled={isPublishing || isSaving || isUnpublishing || isSavingDraft}>Annuler</SecondaryButton>
                        {
                            DecodeBlog.blogPage[0].status === true ? (
                                <DefaultButton 
                                    type="submit" 
                                    variant="contained" 
                                    onClick={async () => { await handleSave(1,0) }} disabled={isSaving || isPublishing || isUnpublishing || isSavingDraft}
                                    startIcon={isSaving ? <CircularProgress size={12} sx={{ color: 'white' }} /> : undefined}
                                >
                                    Enregistrer
                                </DefaultButton>  
                            ) : (
                                <DefaultButton 
                                    type="submit"  
                                    variant="contained" 
                                    onClick={async () => { await handleSave(1,1) }} disabled={isPublishing || isSaving || isUnpublishing || isSavingDraft}
                                    startIcon={isPublishing ? <CircularProgress size={12} sx={{ color: 'white' }} /> : undefined}
                                >
                                    Publier
                                </DefaultButton>
                            )
                        }
                        
                      </div>
                  </div>

                  <div className="Blog_creation_field_contain">
                    
                    <div className="blogField_contain">
                      <p className="blogField_name">Titre principal *</p>
                      <Field fieldValue={DecodeBlog.blogPage[0]} type='text' id_config="title" onChange={handleBlogDataChange}/>
                    </div>
                    <div className="blogField_contain">
                      <p className="blogField_name">Slug *</p>
                      <Field fieldValue={DecodeBlog.blogPage[0]} type='text' id_config="slug" onChange={handleBlogDataChange} slugValue={slugValue}/>
                    </div>
                    <div className="line_horizontal" style={{backgroundColor: theme.palette.primary.third}}></div>
                    {DecodeConfigblog.data && DecodeConfigblog.data.map((blogItem) => {
                        // Trouver les données correspondantes dans InfoBlogPage.data, s'il y en a
                        const correspondingData = InfoBlogPage.data.find(data => data.id_config === blogItem.id);

                        return (
                            <div key={blogItem.id} className="blogField_contain">
                                <p className="blogField_name">{blogItem.name_field}</p>
                                <p className="blogField_description">{blogItem.description_field}</p>
                                <div className="blogField_field">
                                    <Field 
                                        id_blog_page={idCollectionElement} 
                                        type={blogItem.tab_field} 
                                        id_config={blogItem.id} 
                                        onChange={handleBlogDataChange} 
                                        dataValue={correspondingData || {}}
                                        id_collection_ref={blogItem.collection_id_ref}
                                        imagefunction={true}
                                        imageDirectory={urlBucketCollectionImage}
                                        multiline_text={blogItem.multiline_text}
                                    />
                                </div>
                            </div>
                        );
                    })}
                    <div className="line_horizontal" style={{backgroundColor: theme.palette.primary.third}}></div>
                    <div className="blogField_contain">
                      <p className="blogField_name">Item ID :</p>
                      <p className="blogDate">{idCollectionElement}</p>
                    </div>
                    <div className="blogField_contain">
                      <p className="blogField_name">Date de création :</p>
                      <p className="blogDate">{formattedCreateDate}</p>
                      <p className="blogUser" style={{ color: theme.palette.text.secondary, fontSize: '0.8rem', marginTop: '0.2rem' }}>
                        Créé par : <span style={{ color: theme.palette.text.primary }}>{createdByUsername}</span>
                      </p>
                    </div>
                    <div className="blogField_contain">
                      <p className="blogField_name">Date de modificaction :</p>
                      <p className="blogDate">{formattedUpdatedDate}</p>
                      <p className="blogUser" style={{ color: theme.palette.text.secondary, fontSize: '0.8rem', marginTop: '0.2rem' }}>
                        Modifié par : <span style={{ color: theme.palette.text.primary }}>{updatedByUsername}</span>
                      </p>
                    </div>
                    <div className="blogField_contain">
                      <p className="blogField_name">Date de Publication :</p>
                      <p className="blogDate">{formattedPublishedDate}</p>
                      {publishedByUsername && formattedPublishedDate !== 'Non publié' && (
                        <p className="blogUser" style={{ color: theme.palette.text.secondary, fontSize: '0.8rem', marginTop: '0.2rem' }}>
                          Publié par : <span style={{ color: theme.palette.text.primary }}>{publishedByUsername}</span>
                        </p>
                      )}
                    </div>
                    <div className="line_horizontal" style={{backgroundColor: theme.palette.primary.third}}></div>
                    <RedButton className="delete_button_blog" variant="contained" theme={theme} onClick={openPopup}>Supprimer</RedButton>
                    {isPopupOpen && (   
                        <Popup theme={theme}>
                            <p className="textCenter popupText">Êtes-vous sur de vouloir supprimer <b>{DecodeBlog.blogPage[0].page_blog_name}</b> définitivement</p>
                            <div className="button_save_contain">
                                <SecondaryButton variant="contained" theme={theme} onClick={closePopup}>Annuler</SecondaryButton>
                                <RedButton variant="contained" theme={theme} onClick={() => handleDeletePage(DecodeBlog.blogPage[0].page_blog_slug)} >Supprimer</RedButton>
                            </div>
                        </Popup>
                    )}
                    
                  </div>

                </div>
              ) : null
            }
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
                    borderRadius: 2,
                }}
                >
                <Box sx={{ mb: 2 }}>
                    <h3 style={{ margin: 0, color: theme.palette.text.primary }}>Mise à jour du site</h3>
                </Box>
                {/* Étape 1: Récupération des données */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    {!dataRetrievalStatus ? (
                    <>
                        <PendingIcon sx={{ color: theme.palette.text.secondary, width: 16, height: 16 }} />
                        <Box sx={{ color: theme.palette.text.secondary }}>Récupération des données</Box>
                    </>
                    ) : pageGenerationStatus ? (
                    <>
                        <CheckCircleIcon sx={{ color: "#2ec96d", width: 16, height: 16 }} />
                        <Box sx={{ color: theme.palette.text.secondary }}>Récupération des données</Box>
                    </>
                    ) : (
                    <>
                        <CircularProgress size={16} sx={{ color: "#2ec96d" }} />
                        <Box sx={{ color: theme.palette.text.primary }}>Récupération des données...</Box>
                    </>
                    )}
                </Box>
                {/* Étape 2: Génération des pages */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    {!pageGenerationStatus ? (
                    <>
                        <PendingIcon sx={{ color: theme.palette.text.secondary, width: 16, height: 16 }} />
                        <Box sx={{ color: theme.palette.text.secondary }}>Génération des pages</Box>
                    </>
                    ) : sitePublishingStatus ? (
                    <>
                        <CheckCircleIcon sx={{ color: "#2ec96d", width: 16, height: 16 }} />
                        <Box sx={{ color: theme.palette.text.secondary }}>Génération des pages</Box>
                    </>
                    ) : (
                    <>
                        <CircularProgress size={16} sx={{ color: "#2ec96d" }} />
                        <Box sx={{ color: theme.palette.text.primary }}>Génération des pages...</Box>
                    </>
                    )}
                </Box>
                {/* Étape 3: Publication du site */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {!sitePublishingStatus ? (
                    <>
                        <PendingIcon sx={{ color: theme.palette.text.secondary, width: 16, height: 16 }} />
                        <Box sx={{ color: theme.palette.text.secondary }}>Publication du site</Box>
                    </>
                    ) : (
                    <>
                        <CheckCircleIcon sx={{ color: "#2ec96d", width: 16, height: 16 }} />
                        <Box sx={{ color: theme.palette.text.secondary }}>Publication du site</Box>
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

            <Snackbar
                open={deletingPublishedPage}
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
                        borderRadius: 2,
                    }}
                >
                    <Box sx={{ mb: 2 }}>
                        <h3 style={{ margin: 0, color: theme.palette.text.primary }}>Suppression de la page</h3>
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
                    
            <Snackbar
                open={deletingDraftPage}
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
                        <h3 style={{ margin: 0, color: theme.palette.text.primary }}>Suppression de la page</h3>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {deletionCompleted ? (
                            <>
                                <CheckCircleIcon sx={{ color: "#2ec96d", width: 16, height: 16 }} />
                                <Box sx={{ color: theme.palette.text.secondary }}>
                                    Page supprimée
                                </Box>
                            </>
                        ) : (
                            <>
                                <CircularProgress size={16} sx={{ color: "#2ec96d" }} />
                                <Box sx={{ color: theme.palette.text.primary }}>
                                    Suppression en cours...
                                </Box>
                            </>
                        )}
                    </Box>
                </Paper>
            </Snackbar>
            
        </div>

    )
}

export default EditElementCollection