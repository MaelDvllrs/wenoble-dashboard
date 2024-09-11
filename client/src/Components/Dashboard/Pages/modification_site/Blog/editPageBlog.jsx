import React from "react"
import Axios from 'axios';
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import config from "../../../../../config";
import {jwtDecode} from 'jwt-decode'; 
import BlogField from "./BlogField";
import './createPageBlog.css'
import {DefaultButton, RedButton, SecondaryButton, Popup} from '../../../../../Theme/element';
import SaveIcon from '@mui/icons-material/Save';
import PublishIcon from '@mui/icons-material/Publish';

import { updateImageBlog, updateBlogPage, updateTextBlog, updateRichTextBlog, updateVideoBlog, updateMultiReferenceBlog } from '../../../apiImage';
import { useTheme } from '@mui/material/styles';
import { convertToRaw } from 'draft-js';
import UnpublishedIcon from '@mui/icons-material/Unpublished';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';







const EditPageBlog = () => {

    const theme = useTheme();


    const [InfoConfigBlog, setConfigblog] = useState([]);
    const [DecodeConfigblog, setDecodeConfigblog] = useState([]);

    const [InfoBlog, setInfoBlog] = useState([]);
    const [DecodeBlog, setDecodeBlog] = useState([]);

    const [InfoBlogPage, setInfoBlogPage] = useState([]);

    const [slugValue, setSlugValue] = useState('');
    const [formattedCreateDate, setFormattedCreateDate] = useState('');
    const [formattedUpdatedDate, setFormattedUpdatedDate] = useState('');
    const [formattedPublishedDate, setFormattedPublishedDate] = useState('');


    const [deletedItems, setDeletedItems] = useState([]);

    const [savingPage, setSavingPage] = useState(false);



    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const openPopup = () => setIsPopupOpen(true);
    const closePopup = () => setIsPopupOpen(false);

    
    const navigate = useNavigate(); // Création de l'instance useNavigate

    const [blogDataConfig, setBlogDataConfig] = useState({
        text: [],
        images: [],
        richText: [],
        video: [],
        multiReference: []

    });


    const [blogData, setBlogData] = useState({
        text: [],
        images: [],
        richText: [],
        video: [],
        multiReference: []

    });

    const apiUrl = config.apiUrl;
    const { id } = useParams();
    const { idBlog } = useParams();


    useEffect(() => {    
    
        Axios.get(`${apiUrl}/getConfigBlog`, {
            params: {
                IdBlog: id,
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



    useEffect(() => {
        DecodeConfigblog.blogConfig && DecodeConfigblog.blogConfig.map((blogItem) => {
            if (blogItem.tab_field === 'image') {
                setBlogDataConfig(prevData => ({
                    ...prevData,
                    images: [...prevData.images, {id_config: blogItem.id_config}]
                }));
            } else if (blogItem.tab_field === 'text') {
                setBlogDataConfig(prevData => ({
                    ...prevData,
                    text: [...prevData.text, {id_config: blogItem.id_config}]
                }));
            } else if (blogItem.tab_field === 'richText') {
                setBlogDataConfig(prevData => ({
                    ...prevData,
                    richText: [...prevData.richText, {id_config: blogItem.id_config}]
                }));
            } else if (blogItem.tab_field === 'video') {
                setBlogDataConfig(prevData => ({
                    ...prevData,
                    video: [...prevData.video, {id_config: blogItem.id_config}]
                }));
            } else if (blogItem.tab_field === 'multiReference') {
                setBlogDataConfig(prevData => ({
                    ...prevData,
                    multiReference: [...prevData.multiReference, {id_config: blogItem.id_config}]
                }));
            }

        });
    }, [DecodeConfigblog]);


    useEffect(() => {
        let allData = []; 

        const fetchData = async () => {

            
            for (const text of blogDataConfig.text) {
                try {
                    const response = await Axios.get(`${apiUrl}/getTextBlog`, {
                        params: {
                            IdBlogPage: idBlog,
                            IdConfig: text.id_config
                        }
                    });
                    if (response.data.length > 0) {
                        allData.push(response.data[0]); 
                    }
                } catch (error) {
                    console.error('Erreur lors de la récupération du texte :', error);
                }
            }

            for (const images of blogDataConfig.images) {
                try{
                    const response = await Axios.get(`${apiUrl}/getImageBlog`, {
                        params: {
                            IdBlogPage: idBlog,
                            IdConfig: images.id_config
                        }
                    });

                    if (response.data.length > 0) {
                        allData.push(response.data[0]); 
                    }
                } catch (error) {
                    console.error('Erreur lors de la récupération du texte :', error);
                }
            }
            for (const video of blogDataConfig.video) {
                try{
                    const response = await Axios.get(`${apiUrl}/getVideoBlog`, {
                        params: {
                            IdBlogPage: idBlog,
                            IdConfig: video.id_config
                        }
                    });

                    if (response.data.length > 0) {

                        allData.push(response.data[0]); 
                    }
                } catch (error) {
                    console.error('Erreur lors de la récupération du texte :', error);
                }
            }

            for (const richText of blogDataConfig.richText) {
                try{
                    const response = await Axios.get(`${apiUrl}/getRichTextBlog`, {
                        params: {
                            IdBlogPage: idBlog,
                            IdConfig: richText.id_config
                        }
                    });

                    if (response.data.length > 0) {
                        allData.push(response.data[0]); 
                    }
                } catch (error) {
                    console.error('Erreur lors de la récupération du texte :', error);
                }
            }

            for (const multiReference of blogDataConfig.multiReference) {
                try{
                    const response = await Axios.get(`${apiUrl}/getMultiReferenceBlog`, {
                        params: {
                            IdBlogPage: idBlog,
                            IdConfig: multiReference.id_config
                        }
                    });

                    if (response.data.length > 0) {
                        allData.push(response.data[0]); 
                    }
                } catch (error) {
                    console.error('Erreur lors de la récupération du texte :', error);
                }
            }

            setInfoBlogPage({ data: allData }); 
        };
        
        fetchData(); 

    }, [blogDataConfig, idBlog]);


    useEffect(() => {

        Axios.get(`${apiUrl}/getBlogPage`, {
            params: {
                IdBlogPage: idBlog,
            }
        }).then((response) => {
            setInfoBlog(response.data);
        }).catch((error) => {
            console.error('Erreur lors de la récupération de la page du Blog :', error);
        });
    }, [idBlog]);


    useEffect(() => {
        if(InfoBlog !== null && typeof InfoBlog === 'string'){
            const decodedBloginfo = jwtDecode(InfoBlog);
            setDecodeBlog(decodedBloginfo);
        }
    }, [InfoBlog]);




    useEffect(() => {

        if (DecodeBlog.length !== 0) {
            const createDate = new Date(DecodeBlog.blogPage[0].page_blog_create_date);
            const formattedCreateDate = new Intl.DateTimeFormat('fr-FR', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', hour12: false
            }).format(createDate);
            setFormattedCreateDate(formattedCreateDate);
        
            // Convertir page_blog_update_date
            const updateDate = new Date(DecodeBlog.blogPage[0].page_blog_update_date);
            const formattedUpdateDate = new Intl.DateTimeFormat('fr-FR', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', hour12: false
            }).format(updateDate);
            setFormattedUpdatedDate(formattedUpdateDate);

            if (DecodeBlog.blogPage[0].page_blog_publish_date) {
                const publishDate = new Date(DecodeBlog.blogPage[0].page_blog_publish_date);

                const formattedpublishDate = new Intl.DateTimeFormat('fr-FR', {
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit', hour12: false
                }).format(publishDate);
                setFormattedPublishedDate(formattedpublishDate);
            } else {
                setFormattedPublishedDate('Non publié');
            }
        }
        
    }, [DecodeBlog])






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


    const handleSave = async (status, setpublishDate) => {

        // CREER LA PAGE
        setSavingPage(true);


        const date = new Date();
        const offset = date.getTimezoneOffset() * 60000; // Convertir le décalage en millisecondes
        // Correction ici: remplace 'T' par un espace et enlève les millisecondes et le 'Z'
        const localISOTime = (new Date(date - offset)).toISOString().slice(0, 19).replace('T', ' ');

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

            const response = await updateBlogPage(idBlog, mainText, localISOTime, status, setpublishDate);
            // Appeler la fonction saveBlogPage
        

            // ENREGISTRER LES TEXTES

            if (otherText.length > 0) {

                try {
                    const response = await updateTextBlog(idBlog, otherText);
                    console.log(response)

                } catch (error) {
                    console.error('Erreur lors de la création des textes :', error);
                    return;
                }

            }


            // ENREGISTRER LES RICHTEXT

            if (blogData.richText.length > 0) {
                
                const infoRichText = [];
                blogData.richText.forEach(richText => {
                    const contentRichText = richText.value;
                    const richTextJS = convertToRaw(contentRichText);
                    const richTextJSON = JSON.stringify(richTextJS);
                    infoRichText.push({richText : richTextJSON, id_config: richText.id_config, create: richText.create});
                });


                try {
                    const response = await updateRichTextBlog(idBlog, infoRichText);
                    console.log(response)

                } catch (error) {
                    console.error('Erreur lors de la création des richtextes :', error);
                    return;
                }

            }


            

            // ENREGISTRER LES IMAGE*
            if(blogData.images.length > 0){
                try {
                    // Utiliser Promise.all pour attendre que toutes les images soient sauvegardées
                    await Promise.all(blogData.images.map(async (image) => {
                        console.log(image)
                        await updateImageBlog(image, idBlog);
                    }));

                } catch (error) {
                    console.error(error);
                    return;
                }
            }

            //ENREGISTRER LES VIDEO

            if(blogData.video.length > 0){
                try {
                    await Promise.all(blogData.video.map(async (video) => {
                        console.log(video)
                        await updateVideoBlog(video, idBlog);
                    }));
                } catch (error) {
                    console.error(error);
                    return;
                }
            }

            //ENREGISTRER LES MULTIREFERENCE
            if(blogData.multiReference.length > 0){
                try {
                    await Promise.all(blogData.multiReference.map(async (multiReference) => {
                        await updateMultiReferenceBlog(idBlog, multiReference);
                    }));
                } catch (error) {
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
                            id_blog_page : idBlog
                        }
                    });
                } catch (error) {
                    console.error('Erreur lors de la suppression des éléments :', error);
                    return;
                }
            }

            navigate(`/dashboard/modification/blog/${id}`);

        } catch (error) {
            // Gérer l'erreur ici
            console.error('Erreur lors de la création de la page :',error);
            return;
        }

    };

    const handleDeletePage = async () => {
        try {
            await Axios.delete(`${apiUrl}/deleteBlogPage`, {
                params: {
                    IdBlogPage: idBlog,
                    Id: id

                }
            });
            navigate(`/dashboard/modification/blog/${id}`);
        } catch (error) {
            console.error('Erreur lors de la suppression de la page :', error);
    }
};

    return(
        <div className="Blog_creation_Page">
            {
            DecodeBlog.blogPage ? (
                <div className="Blog_creation_Page">
                  <div className="header_modification">
                    <h3 className="titlePage">Modification de : {DecodeBlog.blogPage[0].page_blog_name}</h3>
                    <div className="button_save_contain">
                        <p style={{color: theme.palette.text.secondary, whiteSpace:"nowrap"}}>Status :</p>
                        {
                            DecodeBlog.blogPage[0].status === 1 ? (
                                <p className="Item_portfolio_element blog_status publish_status">Publié</p>    
                            ) : (
                                <p className="Item_portfolio_element blog_status draft_status">Brouillon</p>
                            )
                        }
                        {
                            DecodeBlog.blogPage[0].status === 1 ? (
                                <Tooltip title="Dépublier" arrow placement="top">
                                    <SecondaryButton className="SaveButton" type="submit" variant="contained" theme={theme} onClick={ async () => {await handleSave(0,1)}}><UnpublishedIcon/></SecondaryButton>
                                </Tooltip>   
                            ) : (
                                <Tooltip title="Enregistrer comme brouillon" arrow placement="top">
                                    <SecondaryButton className="SaveButton" variant="contained" theme={theme} onClick={ async () => {await handleSave(0,0)}}><SaveIcon/></SecondaryButton>
                                </Tooltip>
                            )
                        }
                        <SecondaryButton variant="contained" theme={theme} onClick={() => navigate(`/dashboard/modification/blog/${id}`)}>Annuler</SecondaryButton>
                        {
                            DecodeBlog.blogPage[0].status === 1 ? (
                                <DefaultButton type="submit" variant="contained" onClick={async () => { await handleSave(1,0) }}><SaveIcon/> Enregistrer</DefaultButton>  
                            ) : (
                                <DefaultButton type="submit" variant="contained" onClick={async () => { await handleSave(1,1) }}><PublishIcon/> Publier</DefaultButton>
                            )
                        }
                        
                      </div>
                  </div>

                  <div className="Blog_creation_field_contain">
                    
                    <div className="blogField_contain">
                      <p style={{color: theme.palette.text.secondary}}>Titre principal *</p>
                      <BlogField fieldValue={DecodeBlog.blogPage[0]} type='text' id_config="title" onChange={handleBlogDataChange}/>
                    </div>
                    <div className="blogField_contain">
                      <p style={{color: theme.palette.text.secondary}}>Slug *</p>
                      <BlogField fieldValue={DecodeBlog.blogPage[0]} type='text' id_config="slug" onChange={handleBlogDataChange} slugValue={slugValue}/>
                    </div>
                    <div className="line_horizontal" style={{backgroundColor: theme.palette.text.secondary}}></div>
                    {DecodeConfigblog.blogConfig && DecodeConfigblog.blogConfig.map((blogItem) => {
                        // Trouver les données correspondantes dans InfoBlogPage.data, s'il y en a
                        const correspondingData = InfoBlogPage.data.find(data => data.id_config === blogItem.id_config);

                        return (
                            <div key={blogItem.id_config} className="blogField_contain">
                                <p style={{color: theme.palette.text.secondary}}>{blogItem.name_field}</p>
                                <BlogField 
                                    id_blog_page={id} 
                                    type={blogItem.tab_field} 
                                    id_config={blogItem.id_config} 
                                    onChange={handleBlogDataChange} 
                                    dataValue={correspondingData || {}}
                                    id_collection_ref={blogItem.id_collection_ref}
                                />
                            </div>
                        );
                    })}
                    <div className="line_horizontal" style={{backgroundColor: theme.palette.text.secondary}}></div>
                    <div className="blogField_contain">
                      <p style={{color: theme.palette.text.secondary}}>Date de création :</p>
                      <p>{formattedCreateDate}</p>
                    </div>
                    <div className="blogField_contain">
                      <p style={{color: theme.palette.text.secondary}}>Date de modificaction :</p>
                      <p>{formattedUpdatedDate}</p>
                    </div>
                    <div className="blogField_contain">
                      <p style={{color: theme.palette.text.secondary}}>Date de Publication :</p>
                      <p>{formattedPublishedDate}</p>
                    </div>
                    <div className="line_horizontal" style={{backgroundColor: theme.palette.text.secondary}}></div>
                    <RedButton className="delete_button_blog" variant="contained" theme={theme} onClick={openPopup}>Supprimer</RedButton>
                    {isPopupOpen && (   
                        <Popup theme={theme}>
                            <p className="textCenter popupText">Êtes-vous sur de vouloir supprimer <b>{DecodeBlog.blogPage[0].page_blog_name}</b> définitivement</p>
                            <div className="button_save_contain">
                                <SecondaryButton variant="contained" theme={theme} onClick={closePopup}>Annuler</SecondaryButton>
                                <RedButton variant="contained" theme={theme} onClick={handleDeletePage} >Supprimer</RedButton>
                            </div>
                        </Popup>
                    )}

                    {savingPage && (   
                        <Popup theme={theme}>
                            <CircularProgress sx={{color:"rgb(5, 65, 183)"}}/>
                        </Popup>
                    )}
                   

                  </div>

                </div>
              ) : null
            }
        </div>

    )
}

export default EditPageBlog