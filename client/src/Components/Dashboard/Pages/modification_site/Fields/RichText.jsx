import React, { useState, useEffect, useRef } from 'react';
import { Editor, EditorState, RichUtils, CompositeDecorator, convertFromRaw, AtomicBlockUtils } from 'draft-js';
import 'draft-js/dist/Draft.css';
import { FaBold, FaItalic, FaLink, FaListUl, FaListOl, FaImage, FaTrash } from "react-icons/fa";
import { compressImage } from '../../../apiImage'; // Importer la fonction compressImage
import './Field.css';
import {SecondaryButton} from '../../../../../Theme/element';


const Link = (props) => {
  console.log('props', props.entityKey);
  const { url } = props.contentState.getEntity(props.entityKey).getData();
  return (
    <a href={url} style={{ color: 'blue', textDecoration: 'underline' }}>
      {props.children}
    </a>
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
      console.log('entityKey', entityKey);
      return (
        entityKey !== null &&
        contentState.getEntity(entityKey).getType() === 'IMAGE'
      );
    },
    callback
  );
}

const RichTextUpload = ({ id_blog_page, type, id_config, onChange, slugValue, fieldValue, dataValue, id_collection_ref, theme }) => {
  const [editorState, setEditorState] = useState(EditorState.createEmpty(blockDecorator));
  const [createBoolRichText, setCreateBoolRichText] = useState('');
  const fileInputRef = useRef(null);
  console.log('dataValue', dataValue);

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

  const handleLinkClick = () => {
    const url = prompt('Enter a URL');
    const contentState = editorState.getCurrentContent();
    const contentStateWithEntity = contentState.createEntity(
      'LINK',
      'MUTABLE',
      { url }
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
  };

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
    console.log('blockKey à supprimer:', blockKey);
    const contentState = editorState.getCurrentContent();
    const blockMap = contentState.getBlockMap().delete(blockKey);
    const newContentState = contentState.merge({
      blockMap,
      selectionAfter: contentState.getSelectionAfter(),
    });
    const newEditorState = EditorState.push(editorState, newContentState, 'remove-range');
    setEditorState(newEditorState);
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
        <button style={{ color: theme.palette.text.primary }} className='editor_button' onClick={handleImageClick}><FaImage /></button>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>
      <Editor
        editorState={editorState}
        onChange={handleEditorChange}
        handleReturn={handleReturn}
        blockRendererFn={blockRendererFn} // Utilisation de blockRendererFn pour les blocs atomiques (images)
        className="editor"
      />
    </div>
  );
};

export default RichTextUpload;