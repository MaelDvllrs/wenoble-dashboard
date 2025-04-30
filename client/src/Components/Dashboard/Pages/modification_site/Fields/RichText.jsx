import React, { useState, useEffect, useRef } from 'react';
import { Editor, EditorState, RichUtils, CompositeDecorator, convertFromRaw, AtomicBlockUtils, convertToRaw, getVisibleSelectionRect } from 'draft-js';
import 'draft-js/dist/Draft.css';
import { FaBold, FaItalic, FaLink, FaListUl, FaListOl, FaImage, FaTrash, FaCheck, FaTimes } from "react-icons/fa";
import { compressImage } from '../../../../../utils/imageUtils'; 
import './Field.css';
import {SecondaryButton} from '../../../../../Theme/element';
import CheckIcon from '@mui/icons-material/Check';
import ClearIcon from '@mui/icons-material/Clear';
import CallIcon from '@mui/icons-material/Call';
import { MenuItem, Select } from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import EmailIcon from '@mui/icons-material/Email';



// Composant Link pour les liens


const Link = (props) => {
  const { url } = props.contentState.getEntity(props.entityKey).getData();

  return (
    <a
      href={url}
      style={{ color: '#2ec96d' }}
      target="_blank"
      rel="noopener noreferrer"
    >
      {props.children}
    </a>
  );
};



const LinkTooltip = ({ position, onSubmit, onCancel, theme, urlValue }) => {
  const [urlInput, setUrlInput] = useState('');
  const [linkType, setLinkType] = useState('default'); // 'default', 'email', 'phone'
  const tooltipRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setUrlInput(urlValue || '');
  }, [urlValue]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target) && !event.target.closest('.MuiMenu-root')) {
        console.log('click outside'); 
        onCancel();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onCancel]);

  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }, []);


  useEffect(() => {
    if (urlValue) {
      if (urlValue.startsWith('mailto:')) {
        setLinkType('email');
        console.log('URL:', urlValue);
        setUrlInput(urlValue.replace(/^mailto:/, '')); // Supprime "mailto:"
      } else if (urlValue.startsWith('tel:')) {
        setLinkType('phone');
        setUrlInput(urlValue.replace(/^tel:/, '')); // Supprime "tel:"
      } else {
        setLinkType('default');
        setUrlInput(urlValue); // Garde l'URL telle quelle pour les liens normaux
      }
    } else {
      setLinkType('default');
      setUrlInput(''); // Réinitialise l'input si aucun lien n'est fourni
    }
  }, [urlValue]);

  const getPlaceholder = () => {
    if (linkType === 'email') {
      return 'exemple@domaine.com';
    } else if (linkType === 'phone') {
      return '+123456789';
    } else {
      return 'https://example.com';
    }
  };

  const getTypeLink = () => {
    if (linkType === 'email') {
      return 'email';
    } else if (linkType === 'phone') {
      return 'tel';
    } else {
      return 'url';  
    }
  };

  const handleUrlInputChange = (e) => {
    setUrlInput(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
  
    const url = urlInput.trim();
    onSubmit(url, linkType);
  };

  return (
    <div
      ref={tooltipRef}
      className="link-tooltip"
      style={{
        left: position ? `${position.left}px` : 0,
        top: position ? `${position.bottom + 5}px` : 0,
        backgroundColor: theme.palette.primary.secondary,
        boxShadow: theme.palette.shadow.main,
      }}
    >
      <form onSubmit={handleSubmit} className='link-tooltip-form'>
          <Select
            className="link-tooltip-select"
            value={linkType}
            onChange={(e) => setLinkType(e.target.value)}
            onClick={(e) => e.stopPropagation()} 
            style={{
              color: theme.palette.text.primary,
            }}

            MenuProps={{
              PaperProps: {
                style: {
                  backgroundColor: theme.palette.primary.secondary,
                  marginTop: '0.5rem',
                  boxShadow: theme.palette.shadow.main,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 'auto',
                  
                },
                sx: {
                  '& .MuiList-root': {
                    padding: '0.3rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    gap: '0.2rem',
                  },

                  '& .MuiMenuItem-root': {
                    display: 'flex',
                    borderRadius: '0.3rem',
                    padding: '0.2rem',
                    width: 'auto',
                  },
                  '& .MuiMenuItem-root:hover': {
                    backgroundColor: theme.palette.primary.third,
                  },
                  '& .MuiMenuItem-root.Mui-selected': {
                    backgroundColor: theme.palette.primary.third,
                  },
                },
              },
            }}
            sx={{
              '& .MuiSelect-icon': {
                color: theme.palette.text.primary,
              },
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'transparent',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'transparent',
                
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: 'transparent',
              },
              '& .MuiSelect-select': {
                paddingLeft: '0.5rem',
                paddingTop: '0.2rem',
                paddingBottom: '0.2rem',
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'transparent',
              },

              
            }}
          >
            <MenuItem value="default" className='link-tooltip-menu-item'>
              <LinkIcon fontSize='small' className='link-tooltip-menu-icon'/> Url
            </MenuItem>
            <MenuItem value="email" className='link-tooltip-menu-item'>
              <EmailIcon fontSize='small' className='link-tooltip-menu-icon'/> Email
            </MenuItem>
            <MenuItem value="phone" className='link-tooltip-menu-item'> 
              <CallIcon fontSize="small" className='link-tooltip-menu-icon'/> Téléphone
            </MenuItem>
          </Select>
          <input
            ref={inputRef}
            type={getTypeLink()}
            placeholder={getPlaceholder()}
            value={urlInput}
            onChange={handleUrlInputChange}
            className="link-tooltip-input"
            style={{
              color: theme.palette.text.primary,
            }}
          />
          <button
            type="button"
            className="link-tooltip-button"
            onClick={handleSubmit}
            style={{
              color: theme.palette.text.primary,
            }}
          >
            <CheckIcon fontSize="small" />
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="link-tooltip-button"
            style={{
              color: theme.palette.text.primary,
            }}
          >
            <ClearIcon fontSize="small" />
          </button>
      </form>
    </div>
  );
};

const Image = (props) => {
  const { contentState, block, blockProps } = props;
  
  // Récupérer l'entityKey depuis le bloc
  const entityKey = block.getEntityAt(0);
  
  if (!entityKey) {
    console.error("Erreur : entityKey manquant pour le composant Image.");
    return null; // Si aucun entityKey n'est trouvé, on arrête le rendu
  }

  const { src, width } = contentState.getEntity(entityKey).getData();
  
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <img src={src} alt="" style={{ width: width }} />
      <SecondaryButton
        className="SaveButton"
        style={{
          position: 'absolute',
          top: "1rem",
          right: "1rem",
        }}
        onClick={() => blockProps.onRemoveImage(block.getKey())}
      >
        <FaTrash />
      </SecondaryButton>
    </div>
  );
};

const blockDecorator = new CompositeDecorator([
  {
    strategy: findLinkEntities,
    component: Link,
  },
  {
    strategy: findImageEntities,
    component: Image,
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

function findImageEntities(contentBlock, callback, contentState) {
  contentBlock.findEntityRanges(
    (character) => {
      const entityKey = character.getEntity();
      return (
        entityKey !== null &&
        contentState.getEntity(entityKey).getType() === 'IMAGE'
      );
    },
    callback
  );
}

const RichTextUpload = ({ id_blog_page, type, id_config, onChange, slugValue, fieldValue, dataValue, id_collection_ref, theme, imagefunction }) => {
  const [editorState, setEditorState] = useState(EditorState.createEmpty(blockDecorator));
  const [createBoolRichText, setCreateBoolRichText] = useState('');
  const fileInputRef = useRef(null);

  const [showLinkTooltip, setShowLinkTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState(null);
  const [urlValue, setUrlValue] = useState('');
  const [linkEditMode, setLinkEditMode] = useState(false);


  const linkSelectionRef = useRef(null);
  const linkHoverMode = useRef(false);
  const skipNextTooltip = useRef(false);



  const handleEditorChange = (newState) => {
    setEditorState(newState);

    if (skipNextTooltip.current) {
      // ⛔️ Ignorer la première ouverture
      skipNextTooltip.current = false;
      return;
    }
  
    const selection = newState.getSelection();
    const content = newState.getCurrentContent();
  
    // 🛑 Ne pas faire de détection si on est en édition manuelle
    if (linkEditMode) return;
  
    // Si sélection active, on ferme le tooltip
    if (!selection.isCollapsed()) {
      linkHoverMode.current = false;
      console.log('close 2');
      setShowLinkTooltip(false);
      setTooltipPosition(null);
      return;
    }
  
    const blockKey = selection.getStartKey();
    const block = content.getBlockForKey(blockKey);
    const offset = selection.getStartOffset();
  
    if (!block) {
      linkHoverMode.current = false;
      setShowLinkTooltip(false);
      setTooltipPosition(null);
      return;
    }
  
    const entityKey = block.getEntityAt(Math.max(offset - 1, 0));
  
    if (entityKey) {
      const entity = content.getEntity(entityKey);
      if (entity.getType() === 'LINK') {

        const { url } = entity.getData();
        
        const rect = document.querySelector('.editor-container')?.getBoundingClientRect();
        const selectionRect = getVisibleSelectionRect(window);
  
        if (selectionRect && rect) {
          console.log('Rect:', rect);
          console.log('Selection Rect:', selectionRect);
          setTooltipPosition({
            left: selectionRect.left - rect.left,
            bottom: selectionRect.bottom - rect.top,
          });
          setUrlValue(url);
  
          // ✅ Empêche la fermeture immédiate
          linkHoverMode.current = true;
          setShowLinkTooltip(true);
          return;
        }
      }
    }
  
    // 👇 Ici : on veut éviter de fermer brutalement si on vient d'activer le tooltip
    if (linkHoverMode.current) {
      setTimeout(() => {
        const latestSelection = editorState.getSelection();
        const latestContent = editorState.getCurrentContent();
    
        if (!latestSelection.isCollapsed()) {
          return; // une sélection est en cours, ne rien faire
        }
    
        const blockKey = latestSelection.getStartKey();
        const block = latestContent.getBlockForKey(blockKey);
        const offset = latestSelection.getStartOffset();
        const entityKey = block.getEntityAt(Math.max(offset - 1, 0));
    
        if (entityKey) {
          const entity = latestContent.getEntity(entityKey);
          if (entity.getType() === 'LINK') {
            // ✅ le curseur est encore dans un lien → NE PAS fermer
            return;
          }
        }
    
        // ❌ sinon, on ferme
        linkHoverMode.current = false;
        setShowLinkTooltip(false);
        setTooltipPosition(null);
      }, 150);
    }

    const data = {
      id_config: id_config,
      type: 'richText',
      value: newState.getCurrentContent(),
      create: createBoolRichText
    };

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



  // --------LINK---------
  

  const handleLinkClick = () => {
    const selection = editorState.getSelection();
  
    if (selection.isCollapsed()) {
      alert("Veuillez d'abord sélectionner du texte pour ajouter un lien.");
      return;
    }
  
    // Sauvegarde la sélection
    linkSelectionRef.current = selection;
  
    const contentState = editorState.getCurrentContent();
    const contentStateWithEntity = contentState.createEntity(
      'LINK',
      'MUTABLE',
      { url: '' }
    );
    const entityKey = contentStateWithEntity.getLastCreatedEntityKey();
  
    const withEntity = EditorState.set(editorState, {
      currentContent: contentStateWithEntity,
    });
  
    const withLink = RichUtils.toggleLink(
      withEntity,
      selection,
      entityKey
    );
  
    // 🧠 Garde la sélection temporairement
    setEditorState(withLink);

    setLinkEditMode(true);
  
    // 📌 Laisse le DOM appliquer le changement, puis affiche le tooltip
    setTimeout(() => {
      const rect = getVisibleSelectionRect(window);
      const editorBounds = document.querySelector('.editor-container')?.getBoundingClientRect();
  
      if (rect && editorBounds) {
        setTooltipPosition({
          left: rect.left - editorBounds.left,
          bottom: rect.bottom - editorBounds.top,
        });
      } else {
        setTooltipPosition({ left: 100, bottom: 100 });
      }
  
      setShowLinkTooltip(true);
      setUrlValue('');
    }, 0);
  };
  

  const handleLinkSubmit = (url, linkType) => {
    if (!url || url.trim() === '') {
      handleLinkCancel();
      return;
    }

    console.log('URL:', url);
    console.log('Link Type:', linkType);
  
    let formattedUrl = url;
    if (linkType === 'email') {
      formattedUrl = `mailto:${formattedUrl}`;
    } else if (linkType === 'phone') {
      formattedUrl = `tel:${formattedUrl}`;
    } else if (!/^https?:\/\//i.test(formattedUrl)) {
      // Ajoute https:// uniquement pour les liens de type URL
      formattedUrl = 'https://' + formattedUrl;
    }
  
    const contentState = editorState.getCurrentContent();
    let selection = linkSelectionRef.current;
  
    // Si aucune sélection mémorisée (cas de survol automatique), on la prend depuis l'éditeur
    if (!selection) {
      selection = editorState.getSelection();
    }
  
    const blockKey = selection.getStartKey();
    const startOffset = selection.getStartOffset();
    const block = contentState.getBlockForKey(blockKey);
    
    let entityKey = null;

    // Essayer l'offset actuel, puis un avant, puis un après (si possible)
    const tryOffsets = [
      startOffset,
      startOffset > 0 ? startOffset - 1 : null,
      startOffset < block.getLength() ? startOffset + 1 : null,
    ];

    for (const offset of tryOffsets) {
      if (offset === null) continue;
      const keyAtOffset = block.getEntityAt(offset);
      if (keyAtOffset) {
        const entity = contentState.getEntity(keyAtOffset);
        if (entity.getType() === 'LINK') {
          entityKey = keyAtOffset;
          break;
        }
      }
    }

    console.log('Entity Key:', entityKey);
  
    if (entityKey) {
      const updatedContentState = contentState.mergeEntityData(entityKey, {
        url: formattedUrl,
      });
  
      const newEditorState = EditorState.push(editorState, updatedContentState, 'apply-entity');
  
      // Fermer le tooltip, vider la ref
      setEditorState(EditorState.forceSelection(newEditorState, selection));
      linkSelectionRef.current = null;
      setLinkEditMode(false);
      console.log('close 5');
      setShowLinkTooltip(false);
      setTooltipPosition(null);
    } else {
      console.warn("Aucune entité LINK trouvée à cet emplacement.");
    }
  };


  const handleLinkCancel = () => {
    const selection = linkSelectionRef.current;
  
    if (selection) {
      const newEditorState = RichUtils.toggleLink(
        editorState,
        selection,
        null
      );
      setEditorState(newEditorState);
    }
  
    skipNextTooltip.current = true; // ✅ ignorer l’ouverture suivante
    setLinkEditMode(false);
    console.log('close 1');
    setShowLinkTooltip(false);

    setTooltipPosition(null);
    linkSelectionRef.current = null;
  };



  //--------------------IMAGE---------------------


  const handleImageClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        const compressedFile = await compressImage(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          const src = e.target.result;
          const contentState = editorState.getCurrentContent();
  
          // Création de l'entité IMAGE
          const contentStateWithEntity = contentState.createEntity(
            'IMAGE',
            'IMMUTABLE',
            { src, width: '100%' }
          );
          const entityKey = contentStateWithEntity.getLastCreatedEntityKey();
  
          // Vérifiez que l'entité a été créée avec succès
          if (!entityKey) {
            console.error('Erreur : entityKey non défini');
            return;
          }
          console.log('Entity Key créé:', entityKey);
  
          // Insérer un bloc atomique avec l'entité image
          const newEditorState = EditorState.set(
            editorState,
            { currentContent: contentStateWithEntity }
          );
          const editorStateWithImage = AtomicBlockUtils.insertAtomicBlock(
            newEditorState,
            entityKey,
            ' '
          );
  
          setEditorState(editorStateWithImage);
        };
        reader.readAsDataURL(compressedFile);
      } catch (error) {
        console.error("Erreur lors de la compression de l'image :", error);
      }
    }
  };

  const handleRemoveImage = (blockKey) => {
    const contentState = editorState.getCurrentContent();
    const blockMap = contentState.getBlockMap().delete(blockKey);
    const newContentState = contentState.merge({
      blockMap,
      selectionAfter: contentState.getSelectionAfter(),
    });
    const newEditorState = EditorState.push(editorState, newContentState, 'remove-range');
    setEditorState(newEditorState);

    // Mettre à jour dataValue.text_json
    const updatedContent = convertToRaw(newContentState);
    const updatedData = {
      id_config: id_config,
      type: 'richText',
      value: updatedContent,
      create: createBoolRichText
    };
    onChange({ data: updatedData });
  };





  const handleReturn = (e) => {
    const contentState = editorState.getCurrentContent();
    const selectionState = editorState.getSelection();
    const blockKey = selectionState.getStartKey();
    const block = contentState.getBlockForKey(blockKey);

    

    if (block.getType() === 'atomic') {
      const newContentState = Modifier.insertText(
        contentState,
        selectionState,
        '\n'
      );
      const newEditorState = EditorState.push(editorState, newContentState, 'insert-characters');
      setEditorState(newEditorState);
      return 'handled';
    }
    return 'not-handled';
  };

  const blockRendererFn = (block) => {
    if (block.getType() === 'atomic') {
      const entity = editorState.getCurrentContent().getEntity(block.getEntityAt(0));
      if (entity && entity.getType() === 'IMAGE') {
        return {
          component: Image,
          editable: false,
          props: {
            onRemoveImage: handleRemoveImage,
          },
        };
      }
    }
    return null;
  };






  useEffect(() => {
    if (dataValue && Object.keys(dataValue).length > 0 && type === 'richText') {
      if (dataValue.text_json) {
        const contentFromJSON = JSON.parse(dataValue.text_json);
        const contentState = convertFromRaw(contentFromJSON);
        const newEditorState = EditorState.createWithContent(contentState, blockDecorator);
        setEditorState(newEditorState);
      } else {
        const emptyContentState = EditorState.createEmpty(blockDecorator);
        setEditorState(emptyContentState);
      }
      setCreateBoolRichText(dataValue.create);
    }
  }, [dataValue, type, setEditorState]);

  return (
    <div className="editor-container" style={{ 
                                          backgroundColor: theme.palette.primary.main, 
                                          borderColor: theme.palette.primary.main,
                                          '--button-hover-color': theme.palette.primary.third,
                                      }}
    >
      <div className='editor_button_contain'>
        <button style={{ color: theme.palette.text.primary }} className='editor_button' onClick={handleBoldClick}><FaBold /></button>
        <button style={{ color: theme.palette.text.primary }} className='editor_button' onClick={handleItalicClick}><FaItalic /></button>
        <button style={{ color: theme.palette.text.primary }} className='editor_button' onClick={handleH1Click}>H1</button>
        <button style={{ color: theme.palette.text.primary }} className='editor_button' onClick={handleH2Click}>H2</button>
        <button style={{ color: theme.palette.text.primary }} className='editor_button' onClick={handleH3Click}>H3</button>
        <button style={{ color: theme.palette.text.primary }} className='editor_button' onClick={handleH4Click}>H4</button>
        <button style={{ color: theme.palette.text.primary }} className='editor_button' onClick={handleLinkClick} onMouseDown={(e) => e.preventDefault()}><FaLink /></button>
        <button style={{ color: theme.palette.text.primary }} className='editor_button' onClick={handleULClick}><FaListUl /></button>
        <button style={{ color: theme.palette.text.primary }} className='editor_button' onClick={handleOLClick}><FaListOl /></button>
        {
          imagefunction === true ? (
            <div>
              <button style={{ color: theme.palette.text.primary }} className='editor_button' onClick={handleImageClick}><FaImage /></button>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileChange}
                accept="image/*" 
              />
            </div>
          ) : 
          null
        }
        
      </div>
      <Editor
        editorState={editorState}
        onChange={handleEditorChange}
        handleReturn={handleReturn}
        blockRendererFn={blockRendererFn} 
        className="editor"
      />

      {showLinkTooltip && tooltipPosition && (
        <LinkTooltip 
          position={tooltipPosition}
          onSubmit={handleLinkSubmit}
          onCancel={handleLinkCancel}
          theme={theme}
          urlValue={urlValue}
          isEditing={linkEditMode}
        />
      )}
    </div>
  );
};

export default RichTextUpload;