import React, { useState, useEffect, useRef, forwardRef } from 'react';
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
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import ImageIcon from '@mui/icons-material/Image';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';

import AddIcon from '@mui/icons-material/Add';


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

const ButtonTooltip = forwardRef(({ position, onBold, onItalic, onH1, onH2, onH3, onH4, onH5, onH6, onLink, onUL, onOL, onBlockquote, onImage, theme, imagefunction, activeStyles, activeBlockType }, ref) => {
  const isActive = (style) => activeStyles?.includes(style) || activeBlockType === style;
  const colorActive = getComputedStyle(document.documentElement).getPropertyValue('--primary-color');

  return (
    <div
      className="tooltip-button"
      style={{
        left: position ? `${position.left}px` : 0,
        top: position ? `${position.top}px` : 0,
        backgroundColor: theme.palette.primary.secondary,
        boxShadow: theme.palette.shadow.main,
      }}
      ref={ref}
    >
      <button style={{ color: isActive('BOLD') ? colorActive : theme.palette.text.primary }} className='editor_button' onClick={onBold}><FormatBoldIcon fontSize="small" /></button>
      <button style={{ color: isActive('ITALIC') ? colorActive : theme.palette.text.primary }} className='editor_button' onClick={onItalic}><FormatItalicIcon fontSize='small' /></button>
      <button style={{ color: isActive('header-one') ? colorActive : theme.palette.text.primary }} className='editor_button' onClick={onH1}><p className='editor_button_title'>H1</p></button>
      <button style={{ color: isActive('header-two') ? colorActive : theme.palette.text.primary }} className='editor_button' onClick={onH2}><p className='editor_button_title'>H2</p></button>
      <button style={{ color: isActive('header-three') ? colorActive : theme.palette.text.primary }} className='editor_button' onClick={onH3}><p className='editor_button_title'>H3</p></button>
      <button style={{ color: isActive('header-four') ? colorActive : theme.palette.text.primary }} className='editor_button' onClick={onH4}><p className='editor_button_title'>H4</p></button>
      <button style={{ color: isActive('header-five') ? colorActive : theme.palette.text.primary }} className='editor_button' onClick={onH5}><p className='editor_button_title'>H5</p></button>
      <button style={{ color: isActive('header-six') ? colorActive : theme.palette.text.primary }} className='editor_button' onClick={onH6}><p className='editor_button_title'>H6</p></button>

      <button style={{ color: theme.palette.text.primary }} className='editor_button' onClick={onLink}><LinkIcon fontSize='small' /></button>
      <button style={{ color: isActive('unordered-list-item') ? colorActive : theme.palette.text.primary }} className='editor_button' onClick={onUL}><FormatListBulletedIcon fontSize='small' /></button>
      <button style={{ color: isActive('ordered-list-item') ? colorActive : theme.palette.text.primary }} className='editor_button' onClick={onOL}><FormatListNumberedIcon fontSize='small' /></button>
      <button style={{ color: isActive('blockquote') ? colorActive : theme.palette.text.primary }} className='editor_button' onClick={onBlockquote}><FormatQuoteIcon fontSize='small'/></button>
    </div>
  );
});


const LinkTooltip = forwardRef((props, ref) => {
  const { position, onSubmit, onCancel, theme, urlValue, isEditing } = props;
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
        onCancel();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onCancel]);

  useEffect(() => {
    if (isEditing) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [isEditing]);

  useEffect(() => {
    if (urlValue) {
      if (urlValue.startsWith('mailto:')) {
        setLinkType('email');
        setUrlInput(urlValue.replace(/^mailto:/, ''));
      } else if (urlValue.startsWith('tel:')) {
        setLinkType('phone');
        setUrlInput(urlValue.replace(/^tel:/, ''));
      } else {
        setLinkType('default');
        setUrlInput(urlValue);
      }
    } else {
      setLinkType('default');
      setUrlInput('');
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
      className="link-tooltip"
      style={{
        left: position ? `${position.left}px` : 0,
        top: position ? `${position.top}px` : 0,
      }}
      ref={ref}
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
});

const AddonTooltip = forwardRef(({ position, onAddImage, onAddAttribute, theme, onImage }, ref) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleClose = (event) => {
    if (
      ref.current &&
      !ref.current.contains(event.target) &&
      !event.target.closest('.addon-tooltip-select')
    ) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClose);
    return () => {
      document.removeEventListener('mousedown', handleClose);
    };
  }, [ref]);

  return (
    <div
      className="addon-tooltip"
      style={{
        left: position ? `${position.left}px` : 0,
        top: position ? `${position.top}px` : 0,
      }}
      ref={ref}
    >
      <button
        className="addon-tooltip-button"
        onClick={handleToggle}
        style={{ color: theme.palette.text.primary }}
      >
        <AddIcon fontSize="small" />
      </button>
      {isOpen && (
        <div className="addon-tooltip-select">
          <button
            className="addon-tooltip-option"
            onClick={() => {
              onImage();
              setIsOpen(false);
            }}
            style={{ color: theme.palette.text.primary }}
          >
            <ImageIcon fontSize="small" />
            <p>Image</p>
          </button>
        </div>
      )}
    </div>
  );
});

const Image = (props) => {
  const { contentState, block, blockProps } = props;

  if (!block) return null;
  
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
  const [linkTooltipPosition, setLinkTooltipPosition] = useState(null);
  const [buttonTooltipPosition, setButtonTooltipPosition] = useState(null);
  const [addonTooltipPosition, setAddonTooltipPosition] = useState(null);
  const [showAddonTooltip, setShowAddonTooltip] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const [linkEditMode, setLinkEditMode] = useState(false); // Tracks if the LinkTooltip is in edit mode

  const [activeStyles, setActiveStyles] = useState([]);
  const [activeBlockType, setActiveBlockType] = useState(null);

  const linkSelectionRef = useRef(null);
  const linkHoverMode = useRef(false);
  const skipNextTooltip = useRef(false);

  const editorContainerRef = useRef(null);
  const buttonTooltipRef = useRef(null);
  const linkTooltipRef = useRef(null);
  const addonTooltipRef = useRef(null);

  useEffect(() => {
    const selection = editorState.getSelection();
    const contentState = editorState.getCurrentContent();

    if (!selection.isCollapsed()) {
      const startKey = selection.getStartKey();
      const block = contentState.getBlockForKey(startKey);
      const blockType = block.getType();

      const inlineStyleRanges = editorState.getCurrentInlineStyle();
      setActiveStyles(Array.from(inlineStyleRanges));
      setActiveBlockType(blockType);
    } else {
      setActiveStyles([]);
      setActiveBlockType(null);
    }
  }, [editorState]);

  useEffect(() => {
    if (linkHoverMode.current) {
      const rect = editorContainerRef.current?.getBoundingClientRect();
      const selectionRect = getVisibleSelectionRect(window);

  
      if (selectionRect && rect) {
        const tooltipWidth = 300;
        const margin = 40;
  
        let left = selectionRect.left - rect.left;
        let top = selectionRect.top - rect.top - margin;
  
        // Ensure tooltip does not overflow horizontally
        if (left + tooltipWidth > rect.width) {
          left = rect.width - tooltipWidth;
        }
        if (left < 0) left = 0;
  
        const position = { left, top };
        setLinkTooltipPosition(position);
      }
    }
  }, [linkHoverMode.current]);

  useEffect(() => {
    const selection = editorState.getSelection();
    const contentState = editorState.getCurrentContent();

    if (selection.isCollapsed()) {
      const blockKey = selection.getStartKey();
      const block = contentState.getBlockForKey(blockKey);

      // Check if the block is empty or contains only whitespace
      if (block.getText().trim() === '') {
        const editorRoot = editorContainerRef.current;
        const rect = editorContainerRef.current?.getBoundingClientRect();
        const blockElement = editorRoot?.querySelector(`[data-offset-key^="${blockKey}-"]`);
        const blockRect = blockElement.getBoundingClientRect();
        const selectionRect = {
            top: blockRect.top + 42,
            bottom: blockRect.bottom,
            left: blockRect.left + 10, // Décalage pour éviter le bord gauche
            right: blockRect.right,
            width: 0,
            height: blockRect.height,
        };


        if (selectionRect && rect) {
          const tooltipWidth = 40;
          const margin = 40;

          let left = selectionRect.left - rect.left;
          let top = selectionRect.top - rect.top - margin;

          // Ensure tooltip does not overflow horizontally
          if (left + tooltipWidth > rect.width) {
            left = rect.width - tooltipWidth;
          }
          if (left < 0) left = 0;

          const position = { left, top };
          setAddonTooltipPosition(position);
          setShowAddonTooltip(true);
          return;
        }
      }
    }
    
    
    // Hide the tooltip if the cursor is not on an empty line
    setShowAddonTooltip(false);
    setAddonTooltipPosition(null);
  }, [editorState]);


  useEffect(() => {
    const handleClickOutside = (e) => {
      const editorEl = editorContainerRef.current;
      const isInsideEditor = editorEl && editorEl.contains(e.target);
      const isInsideAnyTooltip =
        buttonTooltipRef.current?.contains(e.target) ||
        linkTooltipRef.current?.contains(e.target) ||
        addonTooltipRef.current?.contains(e.target);
    
      if (!isInsideEditor && !isInsideAnyTooltip) {
        // Cache tous les tooltips
        setShowLinkTooltip(false);
        setShowAddonTooltip(false);
        setButtonTooltipPosition(null);
        setLinkTooltipPosition(null);
      }
    };
  
    // Utilise capture pour que ce soit exécuté avant la propagation normale
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, []);

  

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
      const rect = editorContainerRef.current?.getBoundingClientRect();
      const selectionRect = getVisibleSelectionRect(window);
    
      // Positionnement uniquement si le tooltip est monté (visible)
      if (selectionRect && rect) {
        const tooltipWidth = 420;
        const margin = 40;
      
        let left = selectionRect.left - rect.left;
        let top = selectionRect.top - rect.top - margin;
      
        // Empêcher débordement horizontal
        if (left + tooltipWidth > rect.width) {
          left = rect.width - tooltipWidth;
        }
        if (left < 0) left = 0;
      
        const position = { left, top };
        setButtonTooltipPosition(position);
        setLinkTooltipPosition(position);
      }
      return;
    }
  
    setButtonTooltipPosition(null);
  
    const blockKey = selection.getStartKey();
    const block = content.getBlockForKey(blockKey);
    const offset = selection.getStartOffset();
  
    if (!block) {
      linkHoverMode.current = false;
      setShowLinkTooltip(false);
      setLinkTooltipPosition(null);
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
          const margin = 40; // Adjust this value as needed
          const left = selectionRect.left - rect.left;
          const top = selectionRect.top - rect.top - margin; // Match ButtonTooltip's position
        
          setLinkTooltipPosition({ left, top });
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
        setLinkTooltipPosition(null);
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

  const handleH5Click = () => {
    setEditorState(RichUtils.toggleBlockType(editorState, 'header-five'));
  };

  const handleH6Click = () => {
    setEditorState(RichUtils.toggleBlockType(editorState, 'header-six'));
  };

  const handleULClick = () => {
    setEditorState(RichUtils.toggleBlockType(editorState, 'unordered-list-item'));
  };

  const handleOLClick = () => {
    setEditorState(RichUtils.toggleBlockType(editorState, 'ordered-list-item'));
  };

  const handleBlockquoteClick = () => {
    setEditorState(RichUtils.toggleBlockType(editorState, 'blockquote'));
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

    // Fermer le ButtonTooltip
    setButtonTooltipPosition(null);
  
    setLinkTooltipPosition(buttonTooltipPosition);
    setShowLinkTooltip(true);
    setUrlValue('');
  };
  

  const handleLinkSubmit = (url, linkType) => {
    if (!url || url.trim() === '') {
      handleLinkCancel();
      return;
    }

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

    if (entityKey) {
      const updatedContentState = contentState.mergeEntityData(entityKey, {
        url: formattedUrl,
      });
  
      const newEditorState = EditorState.push(editorState, updatedContentState, 'apply-entity');
  
      // Fermer le tooltip, vider la ref
      setEditorState(EditorState.forceSelection(newEditorState, selection));
      linkSelectionRef.current = null;
      setLinkEditMode(false);
      setShowLinkTooltip(false);
      setLinkTooltipPosition(null);
    } else {
      console.warn("Aucune entité LINK trouvée à cet emplacement.");
    }
  };

  const handleLinkCancel = () => {
    const selection = linkSelectionRef.current;

    if (selection) {
      const content = editorState.getCurrentContent();
      const blockKey = selection.getStartKey();

      if (content.getBlockForKey(blockKey)) {
        const newEditorState = RichUtils.toggleLink(
          editorState,
          selection,
          null
        );
        setEditorState(newEditorState);
      }
    }

    skipNextTooltip.current = true;
    setLinkEditMode(false);
    setShowLinkTooltip(false);
    setLinkTooltipPosition(null);
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
      const entityKey = block.getEntityAt(0);
      if (entityKey) {
        const entity = editorState.getCurrentContent().getEntity(entityKey);
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


  useEffect(() => {
    const handleClickOutsideLink = (e) => {
      const isInsideTooltip = document.querySelector('.link-tooltip')?.contains(e.target);
      const isMUISelectMenu = e.target.closest('.MuiPopover-root');

      const isInsideButton = document.querySelector('.tooltip-button')?.contains(e.target);
      const isLink = e.target.closest('a');

      if (!isInsideTooltip && !isLink && !isInsideButton && !isMUISelectMenu) {
        if (linkEditMode) {
          handleLinkCancel(); // ✅ annule proprement le lien
        } else {
          linkHoverMode.current = false;
          setShowLinkTooltip(false);
          setLinkTooltipPosition(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutsideLink);
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideLink);
    };
  }, [linkEditMode, handleLinkCancel]);

  return (
    <div className="editor-container" 
      style={{ 
                backgroundColor: theme.palette.primary.main, 
                '--button-hover-color': theme.palette.primary.third,
      }}
      ref={editorContainerRef}
    >
      <Editor
        editorState={editorState}
        onChange={handleEditorChange}
        handleReturn={handleReturn}
        blockRendererFn={blockRendererFn} 
        className="editor"
        ref={editorContainerRef}
      />

      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={handleFileChange}
      />

      {showLinkTooltip && linkTooltipPosition && (
        <LinkTooltip 
          ref={linkTooltipRef}
          position={linkTooltipPosition}
          onSubmit={handleLinkSubmit}
          onCancel={handleLinkCancel}
          theme={theme}
          urlValue={urlValue}
          isEditing={linkEditMode} // Pass the state here
        />
      )}
      {!editorState.getSelection().isCollapsed() && buttonTooltipPosition && (
        <ButtonTooltip
          ref={buttonTooltipRef}
          position={buttonTooltipPosition}
          onBold={handleBoldClick}
          onItalic={handleItalicClick}
          onH1={handleH1Click}
          onH2={handleH2Click}
          onH3={handleH3Click}
          onH4={handleH4Click}
          onH5={handleH5Click}
          onH6={handleH6Click}
          onLink={handleLinkClick}
          onUL={handleULClick}
          onOL={handleOLClick}
          onBlockquote={handleBlockquoteClick}
          onImage={handleImageClick}
          theme={theme}
          activeStyles={activeStyles}
          activeBlockType={activeBlockType}
        />
      )}
      {showAddonTooltip && addonTooltipPosition && (
        <AddonTooltip
          ref={addonTooltipRef}
          position={addonTooltipPosition}
          onAddImage={handleImageClick}
          onAddAttribute={() => console.log('Add Attribute clicked')}
          theme={theme}
          onImage={handleImageClick}
        />
      )}
    </div>
  );
};

export default RichTextUpload;