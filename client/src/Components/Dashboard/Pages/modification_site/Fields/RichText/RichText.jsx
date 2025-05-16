import React, { useState, useEffect, useRef, forwardRef } from 'react';
import { Editor, EditorState, RichUtils, CompositeDecorator, convertFromRaw, AtomicBlockUtils, convertToRaw, getVisibleSelectionRect } from 'draft-js';
import 'draft-js/dist/Draft.css';
import ButtonTooltip from './ButtonTooltip';
import LinkTooltip from './LinkTooltip';
import AddonTooltip from './AddonTooltip';
import Image from './ImageBlock';
import {compressImage} from '../../../../../../utils/imageUtils'; 

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
  const [linkEditMode, setLinkEditMode] = useState(false);
  const [activeStyles, setActiveStyles] = useState([]);
  const [activeBlockType, setActiveBlockType] = useState(null);
  const [hasInteracted, setHasInteracted] = useState(false);

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
    const editorRoot = editorContainerRef.current;
    if (!editorRoot) return;
    const handleFocus = () => setHasInteracted(true);
    const handleClick = () => setHasInteracted(true);
    editorRoot.addEventListener('focus', handleFocus, true);
    editorRoot.addEventListener('mousedown', handleClick, true);
    return () => {
      editorRoot.removeEventListener('focus', handleFocus, true);
      editorRoot.removeEventListener('mousedown', handleClick, true);
    };
  }, []);

  useEffect(() => {
    const selection = editorState.getSelection();
    const contentState = editorState.getCurrentContent();
    if (!hasInteracted) {
      setShowAddonTooltip(false);
      setAddonTooltipPosition(null);
      return;
    }
    if (selection.isCollapsed()) {
      const blockKey = selection.getStartKey();
      const block = contentState.getBlockForKey(blockKey);
      if (block.getText().trim() === '') {
        const editorRoot = editorContainerRef.current;
        const rect = editorRoot?.getBoundingClientRect();
        const blockElement = editorRoot?.querySelector(`[data-offset-key^="${blockKey}-"]`);
        if (!blockElement) {
          setShowAddonTooltip(false);
          setAddonTooltipPosition(null);
          return;
        }
        const blockRect = blockElement.getBoundingClientRect();
        const selectionRect = {
          top: blockRect.top + 42,
          bottom: blockRect.bottom,
          left: blockRect.left + 10,
          right: blockRect.right,
          width: 0,
          height: blockRect.height,
        };
        if (selectionRect && rect) {
          const tooltipWidth = 40;
          const margin = 40;
          let left = selectionRect.left - rect.left;
          let top = selectionRect.top - rect.top - margin;
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
    setShowAddonTooltip(false);
    setAddonTooltipPosition(null);
  }, [editorState, hasInteracted]);



  useEffect(() => {
    const handleClickOutside = (e) => {
      const editorEl = editorContainerRef.current;
      const isInsideEditor = editorEl && editorEl.contains(e.target);
      const isInsideAnyTooltip =
        buttonTooltipRef.current?.contains(e.target) ||
        linkTooltipRef.current?.contains(e.target) ||
        addonTooltipRef.current?.contains(e.target);
      if (!isInsideEditor && !isInsideAnyTooltip) {
        setShowLinkTooltip(false);
        setShowAddonTooltip(false);
        setButtonTooltipPosition(null);
        setLinkTooltipPosition(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, []);


  

  const handleEditorChange = (newState) => {
    setEditorState(newState);
    if (skipNextTooltip.current) {
      skipNextTooltip.current = false;
      return;
    }
    const selection = newState.getSelection();
    const content = newState.getCurrentContent();
    if (linkEditMode) return;
    if (!selection.isCollapsed()) {
      const rect = editorContainerRef.current?.getBoundingClientRect();
      const selectionRect = getVisibleSelectionRect(window);
      if (selectionRect && rect) {
        const tooltipWidth = 420;
        const margin = 40;
        let left = selectionRect.left - rect.left;
        let top = selectionRect.top - rect.top - margin;
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
          const margin = 40;
          const left = selectionRect.left - rect.left;
          const top = selectionRect.top - rect.top - margin;
          setLinkTooltipPosition({ left, top });
          setUrlValue(url);
          linkHoverMode.current = true;
          setShowLinkTooltip(true);
          return;
        }
      }
    }
    if (linkHoverMode.current) {
      setTimeout(() => {
        const latestSelection = editorState.getSelection();
        const latestContent = editorState.getCurrentContent();
        if (!latestSelection.isCollapsed()) {
          return;
        }
        const blockKey = latestSelection.getStartKey();
        const block = latestContent.getBlockForKey(blockKey);
        const offset = latestSelection.getStartOffset();
        const entityKey = block.getEntityAt(Math.max(offset - 1, 0));
        if (entityKey) {
          const entity = latestContent.getEntity(entityKey);
          if (entity.getType() === 'LINK') {
            return;
          }
        }
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

  const handleBoldClick = () => setEditorState(RichUtils.toggleInlineStyle(editorState, 'BOLD'));
  const handleItalicClick = () => setEditorState(RichUtils.toggleInlineStyle(editorState, 'ITALIC'));
  const handleH1Click = () => setEditorState(RichUtils.toggleBlockType(editorState, 'header-one'));
  const handleH2Click = () => setEditorState(RichUtils.toggleBlockType(editorState, 'header-two'));
  const handleH3Click = () => setEditorState(RichUtils.toggleBlockType(editorState, 'header-three'));
  const handleH4Click = () => setEditorState(RichUtils.toggleBlockType(editorState, 'header-four'));
  const handleH5Click = () => setEditorState(RichUtils.toggleBlockType(editorState, 'header-five'));
  const handleH6Click = () => setEditorState(RichUtils.toggleBlockType(editorState, 'header-six'));
  const handleULClick = () => setEditorState(RichUtils.toggleBlockType(editorState, 'unordered-list-item'));
  const handleOLClick = () => setEditorState(RichUtils.toggleBlockType(editorState, 'ordered-list-item'));
  const handleBlockquoteClick = () => setEditorState(RichUtils.toggleBlockType(editorState, 'blockquote'));


  // ---------- LINK SECTION ---------------
  const handleLinkClick = () => {
    const selection = editorState.getSelection();
    if (selection.isCollapsed()) {
      alert("Veuillez d'abord sélectionner du texte pour ajouter un lien.");
      return;
    }
    linkSelectionRef.current = selection;
    const contentState = editorState.getCurrentContent();
    const contentStateWithEntity = contentState.createEntity('LINK', 'MUTABLE', { url: '' });
    const entityKey = contentStateWithEntity.getLastCreatedEntityKey();
    const withEntity = EditorState.set(editorState, { currentContent: contentStateWithEntity });
    const withLink = RichUtils.toggleLink(withEntity, selection, entityKey);
    setEditorState(withLink);
    setLinkEditMode(true);
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
      formattedUrl = 'https://' + formattedUrl;
    }
    const contentState = editorState.getCurrentContent();
    let selection = linkSelectionRef.current;
    if (!selection) {
      selection = editorState.getSelection();
    }
    const blockKey = selection.getStartKey();
    const startOffset = selection.getStartOffset();
    const block = contentState.getBlockForKey(blockKey);
    let entityKey = null;
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
      const updatedContentState = contentState.mergeEntityData(entityKey, { url: formattedUrl });
      const newEditorState = EditorState.push(editorState, updatedContentState, 'apply-entity');
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
        const newEditorState = RichUtils.toggleLink(editorState, selection, null);
        setEditorState(newEditorState);
      }
    }
    skipNextTooltip.current = true;
    setLinkEditMode(false);
    setShowLinkTooltip(false);
    setLinkTooltipPosition(null);
    linkSelectionRef.current = null;
  };




    // ---------- IMAGE SECTION ---------------


  const handleImageClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        // Assurez-vous d'importer compressImage si besoin
        const compressedFile = await compressImage(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          const src = e.target.result;
          const contentState = editorState.getCurrentContent();
          const contentStateWithEntity = contentState.createEntity('IMAGE', 'IMMUTABLE', { src, width: '100%' });
          const entityKey = contentStateWithEntity.getLastCreatedEntityKey();
          if (!entityKey) {
            console.error('Erreur : entityKey non défini');
            return;
          }
          const newEditorState = EditorState.set(editorState, { currentContent: contentStateWithEntity });
          const editorStateWithImage = AtomicBlockUtils.insertAtomicBlock(newEditorState, entityKey, ' ');
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
      const newContentState = Modifier.insertText(contentState, selectionState, '\n');
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
          handleLinkCancel();
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
          isEditing={linkEditMode}
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
