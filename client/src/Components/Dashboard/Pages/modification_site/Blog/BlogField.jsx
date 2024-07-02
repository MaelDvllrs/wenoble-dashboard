import React, { useState, useEffect } from 'react';
import { Editor, EditorState, RichUtils, CompositeDecorator } from 'draft-js';
import 'draft-js/dist/Draft.css';
import './BlogField.css'
import { FaBold, FaItalic, FaLink, FaListUl, FaListOl } from "react-icons/fa";

import { useTheme } from '@mui/material/styles';
import { FileUploader } from "react-drag-drop-files";
import { LiaCloudUploadAltSolid } from "react-icons/lia";
import { v4 as uuidv4 } from 'uuid';
import { compressImage } from "../../../apiImage";

import { CssTextField, DefaultSwitch, DefaultButton, SecondaryButton} from '../../../../../Theme/element';
import DeleteIcon from '@mui/icons-material/Delete';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';




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



const BlogField = ({ id_blog_page,type, id_config, onChange, slugValue }) => {

  


  const theme = useTheme();

  // TEXTE EDITOR

    const [editorState, setEditorState] = useState(EditorState.createEmpty(linkDecorator));
    
    const handleEditorChange = (newState) => {
      setEditorState(newState);

      console.log(newState);
      const data = {
        id_config : id_config,
        type : 'richText',
        richText : newState,
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


    // IMAGE UPLOAD

    const [imagesUploaded, setImagesUploaded] = useState([]);

    const fileTypes = ["JPG", "PNG"];

    const handleImageChange = async (file, indexToReplace) => {
      if (file instanceof File) {
        const fileCompress = await compressImage(file);
    
        const data = {
          id_blog_page : id_blog_page,
          id_config: id_config,
          id_photo: uuidv4(),
          data: fileCompress,
          name: file.name,
          alt: file.name,
          url: URL.createObjectURL(file),
          type: 'images'
        };

        setImagesUploaded(prevImages => {
          if (indexToReplace !== undefined && indexToReplace < prevImages.length) {
            onChange( { data } );
            
            return prevImages.map((img, index) => index === indexToReplace ? data : img);
          } else {
            onChange({ ...prevImages, data });
            
            return [...prevImages, data];
          }
        });
      } else {
        console.error("Aucun fichier n'a été téléchargé.");
      }
    };

    function handleDeleteImage(index) {
      setImagesUploaded(imagesUploaded.filter((_, i) => i !== index));
      const data = {
        id_config : id_config,
        type: 'images'
      }
      onChange({ data }, true);
    }


    //TEXT INPUT

    const [slugValueChange, setSlugValueChange] = useState(slugValue || "");
  
    useEffect(() => {
      // Si slugValue est non vide, mettre à jour slugValueChange
      if (slugValue) {
        setSlugValueChange(slugValue);
        handleTextChange({ target: { value: slugValue } });

      }
    }, [slugValue]);

    const handleTextChange = (event) => {
      const newValue = event.target.value;
      // Mise à jour de l'état avec la nouvelle valeur saisie
      setSlugValueChange(newValue);
  
      const data = {
        value: newValue,
        id_config: id_config,
        type: 'text'
      };
      onChange({ data });
    };


    

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
                                imagesUploaded.map((image, index) => ( // Map over the images array
                                  <div key={index} className="ImageUploaded_contain">
                                    <img className='Image_uploaded' src={image.url} alt={image.alt} />
                                    <div className='info_image_blog'>
                                      <div>
                                        <p><b>{image.name}</b></p>
                                        <p className='user_id'>{image.alt}</p>
                                      </div>
                                      <a href={image.url} target="_blank"><OpenInNewOutlinedIcon style={{color: theme.palette.text.primary}}/></a>
                                      <div className='button_contain'>
                                      <input className='input_image_blog' type="file" id={`file-input-${index}`} onChange={(e) => handleImageChange(e.target.files[0], index)} accept=".jpeg,.jpg,.png"/>
                                      <SecondaryButton theme={theme} className="button_image_blog" type="submit" variant="contained"><label className='label_input_image_blog' htmlFor={`file-input-${index}`}/><AutorenewIcon/> Remplacer</SecondaryButton>
                                      <SecondaryButton theme={theme} className="button_image_blog" type="submit" variant="contained" onClick={() => handleDeleteImage(index)}><DeleteIcon/> Supprimer</SecondaryButton>
                                      </div>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <FileUploader handleChange={handleImageChange} name="file" types={fileTypes} multiple={false}>
                                  <div className="DragAndDrop">
                                    <span className="logoUploadImage">
                                      <LiaCloudUploadAltSolid />
                                    </span>
                                    Télécharger ou glisser une photo ici (jpeg, png)
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
                    default:
                        return null;
                }
            })()}
        </div>
    )
}
export default BlogField;