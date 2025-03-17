import React, { useState, useEffect, useRef } from 'react';
import { Editor, EditorState, RichUtils, CompositeDecorator, convertFromRaw, AtomicBlockUtils, convertToRaw, getVisibleSelectionRect } from 'draft-js';
import 'draft-js/dist/Draft.css';
import { FaBold, FaItalic, FaLink, FaListUl, FaListOl, FaImage, FaTrash } from "react-icons/fa";
import { compressImage } from '../../../apiImage'; // Importer la fonction compressImage
import './Field.css';
import {SecondaryButton} from '../../../../../Theme/element';


// Composant Link pour les liens

const Link = (props) => {
  console.log('props', props.entityKey);
  const { url } = props.contentState.getEntity(props.entityKey).getData();
  return (
    <a href={url} style={{ color: 'blue', textDecoration: 'underline' }}>
      {props.children}
    </a>
  );
};


const LinkTooltip = ({ position, onSubmit, onCancel }) => {
  const [urlValue, setUrlValue] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    // Focus automatiquement sur l'input quand le tooltip apparaît
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(urlValue);
  };

  return (
    <div 
      className="link-tooltip"
      style={{
        position: 'absolute',
        left: position ? `${position.left}px` : 0,
        top: position ? `${position.bottom + 5}px` : 0,
        zIndex: 1000,
        backgroundColor: '#fff',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        padding: '10px',
        borderRadius: '4px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}
    >
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            ref={inputRef}
            type="url"
            placeholder="https://example.com"
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            style={{ 
              padding: '5px 8px', 
              borderRadius: '4px', 
              border: '1px solid #ccc',
              flexGrow: 1
            }}
          />
          <button 
            type="button" 
            onClick={handleSubmit}
            style={{ 
              backgroundColor: '#4CAF50', 
              border: 'none',
              color: 'white',
              padding: '5px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            <FaCheck />
          </button>
          <button 
            type="button" 
            onClick={onCancel}
            style={{ 
              backgroundColor: '#f44336', 
              border: 'none',
              color: 'white',
              padding: '5px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            <FaTimes />
          </button>
        </div>
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

  const handleEditorChange = (newState) => {
    setEditorState(newState);

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
    
    // Vérifier si du texte est sélectionné
    if (selection.isCollapsed()) {
      alert("Veuillez d'abord sélectionner du texte pour ajouter un lien.");
      return;
    }

    // Obtenir la position de la sélection
    const selectionRect = getVisibleSelectionRect(window);
    if (selectionRect) {
      setTooltipPosition(selectionRect);
      setShowLinkTooltip(true);
    }
  };

  const handleLinkSubmit = (url) => {
    // Vérifier si l'URL est valide
    if (!url || url.trim() === '') {
      setShowLinkTooltip(false);
      return;
    }

    // Formater l'URL si nécessaire
    let formattedUrl = url;
    if (!/^https?:\/\//i.test(url)) {
      formattedUrl = 'https://' + url;
    }

    const contentState = editorState.getCurrentContent();
    const contentStateWithEntity = contentState.createEntity(
      'LINK',
      'MUTABLE',
      { url: formattedUrl }
    );
    const entityKey = contentStateWithEntity.getLastCreatedEntityKey();
    const newEditorState = EditorState.set(
      editorState,
      { currentContent: contentStateWithEntity }
    );

    setEditorState(RichUtils.toggleLink(
      newEditorState,
      newEditorState.getSelection(),
      entityKey
    ));
    
    setShowLinkTooltip(false);
  };

  // Fonction pour annuler l'insertion du lien
  const handleLinkCancel = () => {
    setShowLinkTooltip(false);
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
    <div className="editor-container" style={{ backgroundColor: theme.palette.primary.main, borderColor: theme.palette.primary.main }}>
      <div className='editor_button_contain'>
        <button style={{ color: theme.palette.text.primary }} className='editor_button' onClick={handleBoldClick}><FaBold /></button>
        <button style={{ color: theme.palette.text.primary }} className='editor_button' onClick={handleItalicClick}><FaItalic /></button>
        <button style={{ color: theme.palette.text.primary }} className='editor_button' onClick={handleH1Click}>H1</button>
        <button style={{ color: theme.palette.text.primary }} className='editor_button' onClick={handleH2Click}>H2</button>
        <button style={{ color: theme.palette.text.primary }} className='editor_button' onClick={handleH3Click}>H3</button>
        <button style={{ color: theme.palette.text.primary }} className='editor_button' onClick={handleH4Click}>H4</button>
        <button style={{ color: theme.palette.text.primary }} className='editor_button' onClick={handleLinkClick}><FaLink /></button>
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
        />
      )}
    </div>
  );
};

export default RichTextUpload;