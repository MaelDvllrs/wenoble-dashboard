import React from "react"
import Axios from 'axios';
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import config from "../../../../../config";
import {jwtDecode} from 'jwt-decode'; 
import BlogField from "./BlogField";
import './createPageBlog.css'
import {DefaultButton, SecondaryButton, Popup} from '../../../../../Theme/element';
import SaveIcon from '@mui/icons-material/Save';
import PublishIcon from '@mui/icons-material/Publish';
import { createImageBlog, createBlogPage, createTextBlog, createRichTextBlog, createVideoBlog, createMultiReferenceBlog, createGalleryBlog } from '../../../apiImage';
import { useTheme } from '@mui/material/styles';
import { convertToRaw } from 'draft-js';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import Field from "../Fields/fields";








const CreatePageBlog = () => {

    const theme = useTheme();


    const [InfoConfigBlog, setConfigblog] = useState([]);
    const [DecodeConfigblog, setDecodeConfigblog] = useState([]);
    const [slugValue, setSlugValue] = useState('');

    const [savingPage, setSavingPage] = useState(false);

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
    const { id } = useParams();

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

        setSavingPage(true);

        let titleMissed = false;
        let slugMissed = false;
        
        
        blogData.text.forEach(text => {
            console.log(text.id_config);
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

        const date = new Date();
        const offset = date.getTimezoneOffset() * 60000; 

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
            // Appeler la fonction saveBlogPage
            const response = await createBlogPage(id, mainText, localISOTime, status);
            // Gérer la réponse ici
            const blogPageId = response.id;
        


            // ENREGISTRER LES TEXTES

            try {
                const response = await createTextBlog(blogPageId, otherText);

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
                const response = await createRichTextBlog(blogPageId, infoRichText);
            } catch (error) {
                console.error('Erreur lors de la création des richtextes :', error);
                return;
            }

            // ENREGISTRER LES IMAGE
            try {
                // Utiliser Promise.all pour attendre que toutes les images soient sauvegardées
                await Promise.all(blogData.images.map(async (image) => {
                    await createImageBlog(image, blogPageId);
                }));

            } catch (error) {
                console.error(error);
                return;
            }

            //ENREGISTRER LES GALLERIES
            try {
                await Promise.all(blogData.gallery.map(async (gallery) => {
                    await createGalleryBlog(gallery, blogPageId);
                }));
            } catch (error) {
                console.error(error);
                return;
            }


            //ENREGISTRER LES VIDEO
            try {
                await Promise.all(blogData.video.map(async (video) => {
                    await createVideoBlog(video, blogPageId);
                }));
            } catch (error) {
                console.error(error);
                return;
            }

            //ENREGISTRER LES MULTIREFERENCE
            try {
                await Promise.all(blogData.multiReference.map(async (multiReference) => {
                    await createMultiReferenceBlog(blogPageId, multiReference);
                }));
            } catch (error) {
                console.error(error);
                return;
            }

            navigate(`/dashboard/modification/blog/${id}`);

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
                    <SecondaryButton  variant="contained" theme={theme} onClick={() => navigate(`/dashboard/modification/blog/${id}`)}>Annuler</SecondaryButton>
                    <DefaultButton type="submit" variant="contained" onClick={ async () => {await handleSave(1)}}><PublishIcon/> Publier</DefaultButton>
                </div>
            </div>
            <div className="Blog_creation_field_contain">
                <div className={titleFieldMissed ? "blogField_contain missed_field" : "blogField_contain"}>
                    <p style={{color: theme.palette.text.secondary}}>Titre principal *</p>
                    <Field type='text' id_config="title" onChange={handleBlogDataChange}/>
                </div>
                {titleFieldMissed && (   
                    <p className="missed_field_text">Champs obligatoires</p>
                )}
                <div className={slugFieldMissed ? "blogField_contain missed_field" : "blogField_contain"}>
                    <p style={{color: theme.palette.text.secondary}}>Slug *</p>
                    <Field type='text' id_config="slug" onChange={handleBlogDataChange} slugValue={slugValue}/>
                </div>
                {slugFieldMissed && (   
                    <p className="missed_field_text">Champs obligatoires</p>
                )}
                <div className="line_horizontal" style={{backgroundColor: theme.palette.text.secondary}}></div>
                {DecodeConfigblog.blogConfig && DecodeConfigblog.blogConfig.map((blogItem) => (
                  <div key={blogItem.id_config} className="blogField_contain">
                    <p style={{ color: theme.palette.text.secondary }}>{blogItem.name_field}</p>
                    <Field
                      id_blog_page={id}
                      type={blogItem.tab_field}
                      id_config={blogItem.id_config}
                      id_collection_ref={blogItem.id_collection_ref}
                      onChange={handleBlogDataChange}
                    />
                  </div>
                ))}
            </div>
            {savingPage && (   
                <Popup theme={theme}>
                    <CircularProgress sx={{color:"rgb(5, 65, 183)"}}/>
                </Popup>
            )}
            
        </div>

    )
}

export default CreatePageBlog