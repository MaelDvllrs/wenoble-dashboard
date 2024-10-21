import React, { useState, useEffect } from 'react';
import { Editor, EditorState, RichUtils, CompositeDecorator, convertFromRaw } from 'draft-js';
import 'draft-js/dist/Draft.css';
import { FaBold, FaItalic, FaLink, FaListUl, FaListOl } from "react-icons/fa";
import '../Blog/BlogField.css';

const Link = (props) => {
  const { url } = props.contentState.getEntity(props.entityKey).getData();
  return (
    <a href={url} style={{ color: 'blue', textDecoration: 'underline' }}>
      {props.children}
    </a>
  );
};

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

const RichTextUpload = ({ id_blog_page,type, id_config, onChange, slugValue, fieldValue, dataValue, id_collection_ref, theme }) => {
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
};

export default RichTextUpload;