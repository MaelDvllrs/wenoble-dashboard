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
import { createImageBlog, createBlogPage, createTextBlog, createRichTextBlog, createVideoBlog } from '../../../apiImage';
import { useTheme } from '@mui/material/styles';
import { convertToRaw } from 'draft-js';
import CircularProgress from '@mui/material/CircularProgress';






const CreatePageBlog = () => {

    const theme = useTheme();


    const [InfoConfigBlog, setConfigblog] = useState([]);
    const [DecodeConfigblog, setDecodeConfigblog] = useState([]);
    const [slugValue, setSlugValue] = useState('');

    const [savingPage, setSavingPage] = useState(false);

    
    const navigate = useNavigate();


    const [blogData, setBlogData] = useState({
        text: [],
        images: [],
        richText: [],
        video: []
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
                  console.log(newData[type][i]);
                  newData[type][i] = data.data; 
                  itemModified = true; 
                  break; 
                }
            }

            if (!itemModified) {
              newData[type].push(data.data);
              console.log(newData[type]);
            }
          }
      
          return newData;
        });
    };

    console.log(blogData);
    

    const handleSave = async () => {
        

        if (blogData.text.length === 0) {
            console.error('Valeur manquante');
            return;
        };

        setSavingPage(true);

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
            const response = await createBlogPage(id, mainText, localISOTime);
            // Gérer la réponse ici
            console.log(response);  
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
                    console.log(image)
                    await createImageBlog(image, blogPageId);
                }));

            } catch (error) {
                console.error(error);
                return;
            }


            //ENREGISTRER LES VIDEO
            try {
                await Promise.all(blogData.video.map(async (video) => {
                    console.log(video)
                    await createVideoBlog(video, blogPageId);
                }));
            } catch (error) {
                console.error(error);
                return;
            }

            navigate(`/dashboard/modification/blog/${id}`);

        } catch (error) {
            // Gérer l'erreur ici
            console.error('Erreur lors de la création de la page :',error);
            return;
        }

    };


    return(
        <div className="Blog_creation_Page">
            <div className="header_modification">
                <h3 >Création de la page</h3>
                <div className="button_save_contain">
                    <SecondaryButton  variant="contained" theme={theme} onClick={() => navigate(`/dashboard/modification/blog/${id}`)}>Annuler</SecondaryButton>
                    <DefaultButton type="submit" variant="contained" onClick={ async () => {await handleSave()}}><SaveIcon/> Enregitrer</DefaultButton>
                </div>
            </div>
            <div className="Blog_creation_field_contain">
                <div className="blogField_contain">
                    <p style={{color: theme.palette.text.secondary}}>Titre principal *</p>
                    <BlogField type='text' id_config="title" onChange={handleBlogDataChange}/>
                </div>
                <div className="blogField_contain">
                    <p style={{color: theme.palette.text.secondary}}>Slug *</p>
                    <BlogField type='text' id_config="slug" onChange={handleBlogDataChange} slugValue={slugValue}/>
                </div>
                <div className="line_horizontal" style={{backgroundColor: theme.palette.text.secondary}}></div>
                {DecodeConfigblog.blogConfig && DecodeConfigblog.blogConfig.map((blogItem) => (
                    <div className="blogField_contain">
                        <p style={{color: theme.palette.text.secondary}}>{blogItem.name_field}</p>
                        <BlogField id_blog_page={id} type={blogItem.tab_field} id_config={blogItem.id_config} onChange={handleBlogDataChange}/>
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