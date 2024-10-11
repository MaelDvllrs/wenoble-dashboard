import React, { useState, useEffect } from 'react';
import config from '../../../../../config';

import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { useFieldArray, useForm } from 'react-hook-form';


import { Editor, EditorState, RichUtils, CompositeDecorator, convertFromRaw } from 'draft-js';
import 'draft-js/dist/Draft.css';
import './BlogField.css'
import { FaBold, FaItalic, FaLink, FaListUl, FaListOl } from "react-icons/fa";

import { useTheme } from '@mui/material/styles';
import { FileUploader } from "react-drag-drop-files";
import { v4 as uuidv4 } from 'uuid';
import { compressImage } from "../../../apiImage";

import { CssTextField, DefaultSwitch, DefaultButton, SecondaryButton} from '../../../../../Theme/element';
import DeleteIcon from '@mui/icons-material/Delete';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import ImageIcon from '@mui/icons-material/Image';
import CollectionsIcon from '@mui/icons-material/Collections';
import VideocamIcon from '@mui/icons-material/Videocam';

import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { PickersDay } from '@mui/x-date-pickers/PickersDay';
import { styled } from '@mui/material/styles';


import Select from 'react-select'
import  Axios  from 'axios';



const apiUrl = config.apiUrl; 


// Link component
const Link = (props) => {
  const {url} = props.contentState.getEntity(props.entityKey).getData();
  return (
    <a href={url} style={{color: 'blue', textDecoration: 'underline'}}>
      {props.children}
    </a>
  );
};

// Link decorator
const linkDecorator = new CompositeDecorator([
  {
    strategy: findLinkEntities,
    component: Link,
  },
]);

function findLinkEntities(contentBlock, callback, contentState) {
  contentBlock.findEntityRanges(
    (character) => {
      const entityKey = character.getEntity();
      return (
        entityKey !== null &&
        contentState.getEntity(entityKey).getType() === 'LINK'
      );
    },
    callback
  );
}







const BlogField = ({ id_blog_page,type, id_config, onChange, slugValue, fieldValue, dataValue, id_collection_ref }) => {


  const theme = useTheme();

  
  
  
  
  
  
  
  
  
  
  
  // -------------------------------TEXTE EDITOR----------------------------------

    const [editorState, setEditorState] = useState(EditorState.createEmpty(linkDecorator));
    const [createBoolRichText, setCreateBoolRichText] = useState('')

    
    const handleEditorChange = (newState) => {
      setEditorState(newState);

      const data = {
        id_config : id_config,
        type : 'richText',
        value : newState.getCurrentContent(),
        create : createBoolRichText
      }

      onChange({ data });

      
    };
      
    const handleBoldClick = () => {
      setEditorState(RichUtils.toggleInlineStyle(editorState, 'BOLD'));
    };

    const handleItalicClick = () => {
      setEditorState(RichUtils.toggleInlineStyle(editorState, 'ITALIC'));
    };

    const handleH1Click = () => {
      setEditorState(RichUtils.toggleBlockType(editorState, 'header-one'));
    };
    
    const handleH2Click = () => {
      setEditorState(RichUtils.toggleBlockType(editorState, 'header-two'));
    };
    
    const handleH3Click = () => {
      setEditorState(RichUtils.toggleBlockType(editorState, 'header-three'));
    };
    
    const handleH4Click = () => {
      setEditorState(RichUtils.toggleBlockType(editorState, 'header-four'));
    };

    const handleULClick = () => {
      setEditorState(RichUtils.toggleBlockType(editorState, 'unordered-list-item'));
    };
    
    const handleOLClick = () => {
      setEditorState(RichUtils.toggleBlockType(editorState, 'ordered-list-item'));
    };


    const handleLinkClick = () => {
      const url = prompt('Enter a URL');
      const contentState = editorState.getCurrentContent();
      const contentStateWithEntity = contentState.createEntity(
        'LINK',
        'MUTABLE',
        {url}
      );
      const entityKey = contentStateWithEntity.getLastCreatedEntityKey();
      const newEditorState = EditorState.set(
        editorState,
        {currentContent: contentStateWithEntity}
      );
  
      setEditorState(RichUtils.toggleLink(
        newEditorState,
        newEditorState.getSelection(),
        entityKey
      ));
    };


    useEffect(() => {
      if (dataValue && Object.keys(dataValue).length > 0 && type === 'richText') {
        // Vérifiez si dataValue.text_json est null
        if (dataValue.text_json) {
          // Assurez-vous que dataValue.text_json est bien un objet et non une chaîne JSON.
          // Si c'est une chaîne, vous devez d'abord la parser :
          const contentFromJSON = JSON.parse(dataValue.text_json);
          // Sinon, si c'est déjà un objet, utilisez-le directement :
      
          // Convertir le JSON en ContentState
          const contentState = convertFromRaw(contentFromJSON);
      
          // Créer un nouvel EditorState à partir du ContentState
          const newEditorState = EditorState.createWithContent(contentState);
      
          // Mettre à jour l'état de l'éditeur avec les données converties
          setEditorState(newEditorState);
        } else {
          // Si text_json est null, initialisez l'éditeur avec un état vide
          const emptyContentState = EditorState.createEmpty();
          setEditorState(emptyContentState);
        }
        setCreateBoolRichText(dataValue.create);
      }
    }, [dataValue, type, setEditorState]);













    // ------------------IMAGE UPLOAD---------------------

    const [imagesUploaded, setImagesUploaded] = useState([]);
    const [createBoolImage, setCreateBoolImage] = useState('')


    const fileTypes = ["JPG", "PNG"];

    const handleImageChange = async (file, idToReplace) => {
    
      if (file instanceof File) {
        const fileCompress = await compressImage(file);


    
        const data = {
          id_blog_page: id_blog_page,
          id_config: id_config,
          data: fileCompress,
          name: file.name,
          alt: file.name,
          url: URL.createObjectURL(file),
          size: (fileCompress.size / 1024).toFixed(0),
          type: 'images',
          create : createBoolImage
        };
    
        setImagesUploaded(prevImages => {
          const foundIndex = prevImages.findIndex(img => img.id_config === idToReplace);
          if (idToReplace !== undefined && foundIndex !== -1) {
            onChange({ data });
        
            return prevImages.map((img, index) => index === foundIndex ? data : img);
          } else {
            onChange({ ...prevImages, data });
    
            return [...prevImages, data];
          }
        });
      } else {
        console.error("Aucun fichier n'a été téléchargé.");
      }
    };



    useEffect(() => {
      // Vérifiez si dataValue existe et si le type est 'image'
      if (dataValue && Object.keys(dataValue).length > 0 && type === 'image') {
        // Préparez les données de l'image pour l'état initial de imagesUploaded
        const initialImages = [{
          id_blog_page: dataValue.id_blog_page || id_blog_page, // Utilisez id_blog_page de dataValue ou celui passé en prop
          id_config: dataValue.id_config || id_config, // Utilisez id_config de dataValue ou celui passé en prop
          data: dataValue.data, // Utilisez les données d'image en base64 de dataValue
          name: dataValue.name, // Utilisez le nom de l'image de dataValue
          alt: dataValue.alt, // Utilisez le texte alternatif de l'image de dataValue
          url: dataValue.data, // Utilisez les données d'image en base64 comme URL
          size: dataValue.size, // Utilisez la taille de l'image de dataValue
          type: 'images', // Définissez le type comme 'images'
        }];
    
        // Initialisez l'état imagesUploaded avec les données de l'image
        setImagesUploaded(initialImages);
        setCreateBoolImage(dataValue.create);
      }
    }, [dataValue, type, id_blog_page, id_config]);


    function handleDeleteImage(idToDelete) {
      setImagesUploaded(imagesUploaded.filter(image => image.id_config !== idToDelete));
      const data = {
        id_config: id_config,
        type: 'images'
      }
      onChange({ data }, true);
    }


    
    
    
    
    
    
    
    
    
    
    
    
    
    // -----------------GALLERY UPLOAD-----------------


    const { control } = useForm();
    const { fields, append, remove, move } = useFieldArray({
      control,
      name: "images",
    });

    const [active, setActive] = useState(0);

    
    
    
    
    const handleGalleryChange = async (file, addImage = true) => {

      const files = Array.from(file);

      const newImages = await Promise.all(files.map(async (file) => {

        if(!file.create) {
          if (file instanceof File) {
            const fileCompress = await compressImage(file);
            return {
              data: fileCompress,
              name: file.name,
              alt: file.name,
              url: URL.createObjectURL(file),
              size: (fileCompress.size / 1024).toFixed(0),
            };
          } else {
            console.error("Aucun fichier n'a été téléchargé.");
            return null;
          }
        } else {
          return file;
        }
        
      }));

      // Filtrez les images nulles

      const validNewImages = newImages.filter(image => image !== null);


      if (addImage) {

        const combinedImages = [...fields, ...validNewImages];

        const data = { gallery:combinedImages, id_config: id_config, type: 'gallery' };

        onChange({ data: data });

        validNewImages.forEach(data => append(data));
      } else {  
        const data = { gallery:validNewImages, id_config: id_config, type: 'gallery' };
        onChange({ data: data });
      }
    };








    const [imagesAdded, setImagesAdded] = useState(false);

    useEffect(() => {
      // Vérifiez si dataValue existe, si le type est 'gallery' et si les images n'ont pas déjà été ajoutées
      if (dataValue && Object.keys(dataValue).length > 0 && type === 'gallery' && !imagesAdded) {
        const galleryArray = JSON.parse(dataValue.gallery);
  
        galleryArray.forEach(image => {
          const imageUpload = {
            alt: image.alt,
            data: image.data,
            name: image.name,
            size: image.size,
            src: image.src_photo,
            url: apiUrl + '/media/blogGallery/' + image.src_photo,
            type: 'gallery',
            create: true
          };
  
          append(imageUpload);
        });
  
        // Marquez les images comme ajoutées
        setImagesAdded(true);
      }
    }, [dataValue, type, imagesAdded, append, apiUrl]);

    


    function handleDeleteGallery(indexToDelete) {
      // Supprimer l'image à l'index spécifié
      remove(indexToDelete);
    
      // Récupérer les fichiers restants après suppression
    
      const remainingFiles = fields.filter((_, index) => index !== indexToDelete).map(item => {
        if (item.create) {
          return item;
        }
        return new File([item.data], item.name, { type: item.data.type });
      });

      
      // Appeler handleGalleryChange avec les fichiers restants et un indicateur de suppression
      handleGalleryChange(remainingFiles, false);
    }

    function handleReorderGallery(e) {
      e.forEach((item, index) => {
        const activeElement = fields[active];
        if (item === activeElement) {
          move(active, index);
          setActive(index);
        }
      });

      const reorderedFiles = e.map(item => {

        if (item.create) {
          return item;
        }
        const file = new File([item.data], item.name, { type: item.data.type });
        return file;
      });
  
      // Passer les fichiers réordonnés à handleGalleryChange
      handleGalleryChange(reorderedFiles, false);
    }






    
    
    
    

    
    
    // --------------------------------VIDEO UPLOAD-----------------------------------

    
    const videoTypes = ["MP4"];
    

    const [videoUploaded, setVideoUploaded] = useState([]);
    const [createBoolVideo, setCreateBoolVideo] = useState('')


    const handleVideoChange = async (file, idToReplace) => {
    
      if (file instanceof File) {
    
        const data = {
          id_blog_page: id_blog_page,
          id_config: id_config,
          id_video: uuidv4(), // Assurez-vous que cela génère un ID unique pour chaque nouvelle image
          data: file,
          name: file.name,
          alt: file.name,
          url: URL.createObjectURL(file),
          size: (file.size / 1024).toFixed(0),
          type: 'video',
          create : createBoolVideo
        };
    
        setVideoUploaded(prevVideoq => {
          const foundIndex = prevVideoq.findIndex(img => img.id_config === idToReplace);
          if (idToReplace !== undefined && foundIndex !== -1) {
            onChange({ data });

            return prevVideoq.map((img, index) => index === foundIndex ? data : img);
          } else {
            onChange({ ...prevVideoq, data });
    
            return [...prevVideoq, data];
          }
        });
      } else {
        console.error("Aucun fichier n'a été téléchargé.");
      }
    };


    useEffect(() => {
      // Vérifiez si dataValue existe et si le type est 'image'
      if (dataValue && Object.keys(dataValue).length > 0 && type === 'video') {
        

        const initialImages = [{
          id_blog_page: dataValue.id_blog_page || id_blog_page, // Utilisez id_blog_page de dataValue ou celui passé en prop
          id_config: dataValue.id_config || id_config, // Utilisez id_config de dataValue ou celui passé en prop
          id_video: uuidv4(), // Générez un nouvel UUID pour l'image
          data: dataValue.data, // Utilisez les données d'image en base64 de dataValue
          name: dataValue.name, // Utilisez le nom de l'image de dataValue
          alt: dataValue.alt, // Utilisez le texte alternatif de l'image de dataValue
          src: dataValue.src,
          size: dataValue.size,
          type: 'video' ,
        }];


    
        // Initialisez l'état imagesUploaded avec les données de l'image
        setVideoUploaded(initialImages);
        setCreateBoolVideo(dataValue.create);
      }
    }, [dataValue, type, id_blog_page, id_config]);


    function handleDeleteVideo(idToDelete) {
      setVideoUploaded(imagesUploaded.filter(video => video.id_config !== idToDelete));
      const data = {
        id_config: id_config,
        type: 'video'
      }
      onChange({ data }, true);
    }


    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    //-----------------------------TEXT INPUT--------------------------------

    const [slugValueChange, setSlugValueChange] = useState(slugValue || "");
    const [createBool, setCreateBool] = useState('')
  
    useEffect(() => {
      // Si slugValue est non vide, mettre à jour slugValueChange
      if (slugValue) {
        setSlugValueChange(slugValue);
        handleTextChange({ target: { value: slugValue } });

      }
    }, [slugValue]);


    useEffect(() => {
      // Mise à jour de slugValueChange lorsque fieldValue change

      if(fieldValue && id_config){

        if(id_config === 'title'){

          setSlugValueChange(fieldValue.page_blog_name || "");

          const data = {
            value: fieldValue.page_blog_name,
            id_config: id_config,
            type: 'text'
          };
          onChange({ data });

        } else if (id_config === 'slug') {

          setSlugValueChange(fieldValue.page_blog_slug || "");

          const data = {
            value: fieldValue.page_blog_slug,
            id_config: id_config,
            type: 'text'
          };
          onChange({ data });

        }
      }
    

    }, [fieldValue]); 

    const handleTextChange = (event) => {
      const newValue = event.target.value;
      // Mise à jour de l'état avec la nouvelle valeur saisie
      setSlugValueChange(newValue);
      
      const data = {
        value: newValue,
        id_config: id_config,
        type: 'text',
        create: createBool

      };
      onChange({ data });
    };



    useEffect(() => {
      // Vérifiez si dataValue existe et si le type est 'text'
      if (dataValue && Object.keys(dataValue).length > 0 && type === 'text') {
        // Mettre à jour slugValueChange avec la valeur de dataValue
        
        setCreateBool(dataValue.create)
        setSlugValueChange(dataValue.text);
        
      }
    }, [dataValue, type]);


    
    
    
    
    
    
    
    
    
    
    
    
    
    
    //-------------------------------MULTI REFERENCE--------------------------------
    
  
    const [CollectionRef, setCollectionRef] = useState([]);
     const [optionDefault, setOptionDefault] = useState([]);
     const [createBoolMultiRef, setCreateBoolMultiRef] = useState('')


    useEffect(() => {
      if (id_collection_ref) { 
        Axios.get(`${apiUrl}/getCollectionRef`, {
          params: {
            id_collection_ref: id_collection_ref,
          }
        }).then((response) => {

          setCollectionRef(response.data);
        }).catch((error) => {
          console.error('Erreur lors de la récupération de la collection de référence :', error);
        });
      }
    }, [id_collection_ref]);

    const optionMultiRef = CollectionRef.map(item => ({
      value: item.id_page_blog,
      label: item.page_blog_name
    }));

    const handleChangeMultiRef = (selectedOption) => {
        const data = {
          id_config: id_config,
          type: 'multiReference',
          value: JSON.stringify(selectedOption.map(option => ({ value: option.value, label: option.label }))),          
          create: createBoolMultiRef
        };
        onChange({ data });

        setOptionDefault(selectedOption);
    }

    useEffect(() => {
      if (dataValue && Object.keys(dataValue).length > 0 && type === 'multiReference') {
        const selectedOptions = JSON.parse(dataValue.info_ref);
        const selectedOptionsFormatted = selectedOptions.map(option => ({
          value: option.value,
          label: option.label
        }));
        setCreateBoolMultiRef(dataValue.create)
        setOptionDefault(selectedOptionsFormatted);
        
      }
    }, [dataValue, type, CollectionRef]);



    const StyledDay = styled(PickersDay)(({ theme }) => ({
      borderRadius: theme.shape.borderRadius,
      color: theme.palette.text.primary,
      backgroundColor: theme.palette.primary.main,
      '&.Mui-selected': {
        backgroundColor: theme.palette.primary.main,
        color: theme.palette.text.primary,
      },
      '&.MuiPickersDay-today': {
        borderColor: theme.palette.primary.main,
      },
      '&.MuiPickersDay-root': {
        '&:hover': {
          backgroundColor: theme.palette.primary.light,
        },
      },
    }));


    











    return (
        <div>
            {(() => {
                switch(type) {
                    case 'richText':
                        return (
                            <div className="editor-container" style={{backgroundColor : theme.palette.primary.main, borderColor : theme.palette.primary.main}}>
                              <div className='editor_button_contain'>
                                <button style={{color : theme.palette.text.primary}} className='editor_button' onClick={handleBoldClick}><FaBold/></button>
                                <button style={{color : theme.palette.text.primary}} className='editor_button' onClick={handleItalicClick}><FaItalic/></button>
                                <button style={{color : theme.palette.text.primary}} className='editor_button' onClick={handleH1Click}>H1</button>
                                <button style={{color : theme.palette.text.primary}} className='editor_button' onClick={handleH2Click}>H2</button>
                                <button style={{color : theme.palette.text.primary}} className='editor_button' onClick={handleH3Click}>H3</button>
                                <button style={{color : theme.palette.text.primary}} className='editor_button' onClick={handleH4Click}>H4</button>
                                <button style={{color : theme.palette.text.primary}} className='editor_button' onClick={handleLinkClick}><FaLink /></button>
                                <button style={{color : theme.palette.text.primary}} className='editor_button' onClick={handleULClick}><FaListUl /></button>
                                <button style={{color : theme.palette.text.primary}} className='editor_button' onClick={handleOLClick}><FaListOl /></button>
                              </div>
                              <Editor
                                editorState={editorState}
                                onChange={handleEditorChange}
                                className="editor"
                              />
                            </div>
                          );












                    case 'image':
                        return (
                            <div className='image_blog' style={{backgroundColor : theme.palette.primary.main, color : theme.palette.text.primary, borderColor : theme.palette.primary.main}}>
                              {imagesUploaded.length > 0 ? (
                                imagesUploaded.map((image) => ( // Map over the images array
                                  <div key={image.id_config} className="ImageUploaded_contain">
                                    <img className='Image_uploaded' src={image.url} alt={image.alt} />
                                    <div className='info_image_blog'>
                                      <div>
                                        <p className='titlePage'><b>{image.name}</b></p>
                                        <p className='user_id titlePage' style={{color: theme.palette.text.secondary}}>{image.alt}</p>
                                      </div>
                                      <div className='flex_contain flex_image'>
                                        <p style={{color: theme.palette.text.secondary}}>{image.size} Ko</p>
                                        <a href={image.url} target="_blank">
                                      <OpenInNewOutlinedIcon style={{color: theme.palette.text.primary}}/>
                                    </a>                                  
                                  </div>
                                      <div className='button_contain'>
                                      <input className='input_image_blog' type="file" id={`file-input-${image.id_config}`} onChange={(e) => handleImageChange(e.target.files[0], image.id_config)} accept=".jpeg,.jpg,.png"/>
                                      <SecondaryButton theme={theme} className="button_image_blog" type="submit" variant="contained"><label className='label_input_image_blog' htmlFor={`file-input-${image.id_config}`}/><AutorenewIcon/> Remplacer</SecondaryButton>
                                      <SecondaryButton theme={theme} className="button_image_blog" type="submit" variant="contained" onClick={() => handleDeleteImage(image.id_config)}><DeleteIcon/> Supprimer</SecondaryButton>
                                      </div>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <FileUploader handleChange={handleImageChange} name="file" types={fileTypes} multiple={false}>
                                  <div className="DragAndDrop DragAndDropField">
                                    <span className="logoUploadImage">
                                      <ImageIcon />
                                    </span>
                                    Télécharger ou glisser une photo ici (jpeg, png)
                                  </div>
                                </FileUploader>
                              )}
                            </div>
                          );











                    case 'gallery':
                        return (
                          <div className='image_blog gallery_blog' style={{backgroundColor : theme.palette.primary.main, color : theme.palette.text.primary, borderColor : theme.palette.primary.main}}>
                            {fields.length > 0 ? (
                              <div>
                                <div className='ImageUploaded_contain gallery_add_contain'>
                                  <FileUploader handleChange={handleGalleryChange} name="file" types={fileTypes} multiple={true}>
                                    <div className="DragAndDrop DragAndDropGallery" >
                                      <span className="logoUploadImage">
                                        <CollectionsIcon />
                                      </span>
                                      Télécharger ou glisser des photos ici (jpeg, png)
                                    </div>
                                  </FileUploader>
                                </div>
                                <Reorder.Group values={fields} onReorder={handleReorderGallery} className='gallery_contain' style={{borderColor: theme.palette.primary.third}}>
                                  {fields.map((image, index) => (
                                    <Reorder.Item
                                      value={image}
                                      key={image.name}
                                      onDragStart={() => setActive(index)}
                                      className="ImageUploaded_contain gallery_box"
                                    >
                                      <img className='Image_uploaded image_gallery' src={image.url} alt={image.alt} />
                                      <p className='titlePage gallery_text'><b>{image.name}</b></p>
                                      <p className='user_id titlePage gallery_text' style={{color: theme.palette.text.secondary}}>{image.alt}</p>

                                      <div className='flex_contain  flex_gallery'>
                                        <p style={{color: theme.palette.text.secondary}}>{image.size} Ko</p>

                                        <div className='button_contain'>

                                        <SecondaryButton theme={theme} className="button_image_blog" type="submit" variant="contained" onClick={() => handleDeleteGallery(index)}>
                                          <DeleteIcon/>
                                        </SecondaryButton>
                                        </div>
                                        <a href={image.url} target="_blank" className='link_image_gallery'>
                                          <OpenInNewOutlinedIcon style={{color: theme.palette.text.primary}}/>
                                        </a> 
                                      </div>
                                    </Reorder.Item>
                                  ))}
                                </Reorder.Group>
                              </div>
                            ) : (
                              <FileUploader handleChange={handleGalleryChange} name="file" types={fileTypes} multiple={true}>
                                <div className="DragAndDrop DragAndDropField">
                                  <span className="logoUploadImage">
                                    <CollectionsIcon />
                                  </span>
                                  Télécharger ou glisser des photos ici (jpeg, png)
                                </div>
                              </FileUploader>
                            )}
                          </div>
                        );








                    case 'text':
                        return (<div>
                                  <input className='input_text_blog' type='text' style={{backgroundColor : theme.palette.primary.main, color : theme.palette.text.primary, borderColor : theme.palette.primary.main}} onChange={handleTextChange} value={slugValueChange}/>                               
                                </div>
                              );









                    case 'date':
                      return (<div className='blogfield_contain_auto'>
                                <div style={{backgroundColor:  theme.palette.primary.main , borderRadius:"0.5rem"}}>
                                <DatePicker
                                  format='DD/MM/YYYY'
                                  slots={{
 

                                    day: (props) => <StyledDay {...props} theme={theme} />,
                                    }}
                                  slotProps={{
                                    openPickerIcon: { fontSize: 'medium' },
                                    openPickerButton: { 
                                      sx: {
                                        color: theme.palette.text.primary, 

                                      }, 
                                    },
                                    textField: {
                                      focused: true,
                                      sx: {
                                        '& .MuiInputBase-input': {
                                          color: theme.palette.text.primary,
                                          backgroundColor: theme.palette.primary.main, 
                                          border: 'none', 
                                          borderRadius: '0.5rem', 
                                          padding: '8px', 
                                          width: '5rem',
                                        },
                                        '& .MuiInputLabel-root': {
                                          color: theme.palette.text.primary,
                                        },
                                        '& .MuiOutlinedInput-root': {
                                          '& fieldset': {
                                            borderColor: 'transparent', 
                                          },
                                          '&:hover fieldset': {
                                            borderColor: '#888', 
                                          },
                                          '&.Mui-focused fieldset': {
                                            borderColor: theme.palette.primary.main, 
                                          },
                                        },
                                      },
                                    },
                                  }}
                                />
                                </div>
                              </div>
                            );








                    case 'video':
                      return (
                        <div className='image_blog' style={{backgroundColor : theme.palette.primary.main, color : theme.palette.text.primary, borderColor : theme.palette.primary.main}}>
                          {videoUploaded.length > 0 ? (
                            videoUploaded.map((video) => ( // Map over the images array
                              <div key={video.id_config} className="ImageUploaded_contain">
                                <video
                                    className='Image_uploaded'
                                    src={video.url || `${apiUrl}/streamVideo/${video.src}`}
                                    controls
                                    alt={video.alt}
                                />
                                <div className='info_image_blog'>
                                  <div>
                                    <p><b>{video.name}</b></p>
                                    <p style={{color: theme.palette.text.secondary}}>{video.alt}</p>
                                  </div>
                                  <div className='flex_contain flex_image'>
                                    <p style={{color: theme.palette.text.secondary}}>{(video.size / 1024).toFixed(2)} Mo</p>
                                    <a href={video.url ? video.url : `${apiUrl}/streamVideo/${video.src}`} target="_blank">
                                      <OpenInNewOutlinedIcon style={{color: theme.palette.text.primary}}/>
                                    </a>                                  
                                  </div>
                                  <div className='button_contain'>
                                  <input className='input_image_blog' type="file" id={`file-input-${video.id_config}`} onChange={(e) => handleVideoChange(e.target.files[0], video.id_config)} accept="video/*"/>
                                  <SecondaryButton theme={theme} className="button_image_blog" type="submit" variant="contained"><label className='label_input_image_blog' htmlFor={`file-input-${video.id_config}`}/><AutorenewIcon/> Remplacer</SecondaryButton>
                                  <SecondaryButton theme={theme} className="button_image_blog" type="submit" variant="contained" onClick={() => handleDeleteVideo(video.id_config)}><DeleteIcon/> Supprimer</SecondaryButton>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <FileUploader handleChange={handleVideoChange} name="file" types={videoTypes} multiple={false}>
                              <div className="DragAndDrop DragAndDropField">
                                <span className="logoUploadImage">
                                  <VideocamIcon />
                                </span>
                                Télécharger ou glisser une video ici (mp4)
                              </div>
                            </FileUploader>
                          )}
                        </div>
                      );










                    case 'multiReference' :
                      return (
                        <div>
                          <Select 
                              onChange={(selectedOption) => handleChangeMultiRef(selectedOption.map(option => ({ value: option.value, label: option.label })))}                              
                              options={optionMultiRef}
                              isMulti
                              value={optionDefault}
                              styles={{
                                control: (provided) => ({
                                  ...provided,
                                  backgroundColor: theme.palette.primary.main,
                                  color: "#",
                                  borderColor: theme.palette.primary.main,
                                  boxShadow: 'none',
                                }),
                                input: (provided) => ({
                                  ...provided,
                                  color: theme.palette.text.primary,
                                }),
                                option: (provided, state) => ({
                                  ...provided,
                                  color: theme.palette.text.primary,
                                  backgroundColor: state.isSelected ? theme.palette.primary.secondary : theme.palette.background.default,
                                  '&:hover': {
                                    backgroundColor: theme.palette.primary.main,
                                    color: theme.palette.text.primary,
                                  },
                                }),
                                menu: (provided) => ({
                                  ...provided,
                                  backgroundColor: theme.palette.background.default, 
                                }),
                                placeholder: (provided) => ({
                                  ...provided,
                                  color: "#AAAAAA",
                                  value: "Séléctionner..." 
                                }),

                                multiValue: (provided) => ({
                                  ...provided,
                                  backgroundColor: theme.palette.primary.secondary,
                                }),

                                multiValueLabel: (provided) => ({
                                  ...provided,
                                  color: theme.palette.text.primary,
                                }),

                                multiValueRemove: (provided) => ({ 
                                  ...provided,
                                  color: theme.palette.text.primary,
                                  ':hover': {
                                    backgroundColor: theme.palette.primary.main,
                                    color: theme.palette.text.primary,
                                  },
                                }),
                              }}
                            />                             
                          </div>
                      )


                    default:
                        return null;
                }
            })()}
        </div>
    )
}
export default BlogField;