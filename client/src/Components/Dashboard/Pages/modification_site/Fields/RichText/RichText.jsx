import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { Editor, EditorState, RichUtils, CompositeDecorator, convertFromRaw, AtomicBlockUtils, convertToRaw, getVisibleSelectionRect, Modifier } from 'draft-js';
import 'draft-js/dist/Draft.css';
import ButtonTooltip from './ButtonTooltip';
import LinkTooltip from './LinkTooltip';
import AddonTooltip from './AddonTooltip';
import Image from './ImageBlock';
import EmbedModal from './EmbedModal';
import EmbedBlock from './EmbedBlock';
import {compressImage} from '../../../../../../utils/imageUtils'; 
import { SecondaryButton } from '../../../../../../Theme/element';
import Axios from 'axios';
import config from '../../../../../../config';
import Cookies from 'js-cookie';

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


const blockStyleFn = (block) => {
  if (block.getType() === 'code-block') {
    return 'code-block';
  }
  return '';
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

function findEmbedEntities(contentBlock, callback, contentState) {
  contentBlock.findEntityRanges(
    (character) => {
      const entityKey = character.getEntity();
      return (
        entityKey !== null &&
        contentState.getEntity(entityKey).getType() === 'EMBED'
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
  {
    strategy: findEmbedEntities,
    component: EmbedBlock,
  },
]);

const IMAGE_OPTIONS_POPUP_WIDTH = 260;
const IMAGE_OPTIONS_POPUP_OFFSET = 12;
const IMAGE_OPTIONS_POPUP_HEIGHT_ESTIMATE = 200;
const WIDTH_PERCENT_STEPS = [25, 50, 75, 100];

const parsePercentWidth = (value) => {
  if (typeof value !== 'string') {
    return null;
  }
  const match = value.trim().match(/^(\d{1,3})\s*%$/);
  if (!match) {
    return null;
  }
  const percent = parseInt(match[1], 10);
  if (Number.isNaN(percent)) {
    return null;
  }
  return Math.max(0, Math.min(100, percent));
};

const normalizePercentStep = (percent) => {
  if (typeof percent !== 'number' || Number.isNaN(percent)) {
    return WIDTH_PERCENT_STEPS[WIDTH_PERCENT_STEPS.length - 1];
  }
  return WIDTH_PERCENT_STEPS.reduce((closest, step) => {
    if (Math.abs(step - percent) < Math.abs(closest - percent)) {
      return step;
    }
    return closest;
  }, WIDTH_PERCENT_STEPS[WIDTH_PERCENT_STEPS.length - 1]);
};

const getNormalizedPercentString = (value) => {
  const percent = parsePercentWidth(value);
  const normalized = normalizePercentStep(percent ?? WIDTH_PERCENT_STEPS[WIDTH_PERCENT_STEPS.length - 1]);
  return `${normalized}%`;
};

const getPercentNumberFromValue = (value) => {
  const percent = parsePercentWidth(value);
  return normalizePercentStep(percent ?? WIDTH_PERCENT_STEPS[WIDTH_PERCENT_STEPS.length - 1]);
};

const createImageOptionsInitialState = () => ({
  isOpen: false,
  position: null,
  entityKey: null,
  blockKey: null,
  tempWidth: '100%',
  tempAlt: '',
});

const RichTextUpload = ({ id_blog_page, type, id_config, onChange, slugValue, fieldValue, dataValue, id_collection_ref, theme, imagefunction }) => {
  const [editorState, setEditorState] = useState(EditorState.createEmpty(blockDecorator));
  const [createBoolRichText, setCreateBoolRichText] = useState('');
  const fileInputRef = useRef(null);

  const [showLinkTooltip, setShowLinkTooltip] = useState(false);
  const [linkTooltipPosition, setLinkTooltipPosition] = useState(null);
  const [buttonTooltipPosition, setButtonTooltipPosition] = useState(null);
  const [addonTooltipPosition, setAddonTooltipPosition] = useState(null);
  const [showAddonTooltip, setShowAddonTooltip] = useState(false);
  const [embedModalOpen, setEmbedModalOpen] = useState(false);
  const [editingEmbedKey, setEditingEmbedKey] = useState(null);
  const [editingEmbedCode, setEditingEmbedCode] = useState('');
  const [urlValue, setUrlValue] = useState('');
  const [linkEditMode, setLinkEditMode] = useState(false);
  const [activeStyles, setActiveStyles] = useState([]);
  const [activeBlockType, setActiveBlockType] = useState(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const [imageOptions, setImageOptions] = useState(() => createImageOptionsInitialState());

  const linkSelectionRef = useRef(null);
  const linkHoverMode = useRef(false);
  const skipNextTooltip = useRef(false);

  const editorContainerRef = useRef(null);
  const buttonTooltipRef = useRef(null);
  const linkTooltipRef = useRef(null);
  const addonTooltipRef = useRef(null);
  const imageOptionsRef = useRef(null);
  const imageOptionsAnchorRef = useRef(null);
  const imageOptionsContainerRef = useRef(null);

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
    const handleFocus = () => {
      setHasInteracted(true);
      setHasFocus(true);
    };
    const handleClick = () => setHasInteracted(true);
    const handleBlur = (e) => {
      // Ne pas masquer le tooltip si on clique sur le add-on tooltip
      const isClickingAddon = addonTooltipRef.current?.contains(e.relatedTarget);
      if (isClickingAddon) {
        return;
      }
      console.log('perd le focus')
      setHasFocus(false);
      setShowAddonTooltip(false);
      setAddonTooltipPosition(null);
    };
    editorRoot.addEventListener('focus', handleFocus, true);
    editorRoot.addEventListener('mousedown', handleClick, true);
    editorRoot.addEventListener('blur', handleBlur, true);
    return () => {
      editorRoot.removeEventListener('focus', handleFocus, true);
      editorRoot.removeEventListener('mousedown', handleClick, true);
      editorRoot.removeEventListener('blur', handleBlur, true);
    };
  }, []);
  const calculateImageOptionsPosition = useCallback((anchorElement, containerElement) => {
    if (!anchorElement || !containerElement) {
      return null;
    }
    const anchorRect = anchorElement.getBoundingClientRect();
    const containerRect = containerElement.getBoundingClientRect();

    let top = anchorRect.top - containerRect.top;
    let left = anchorRect.right - containerRect.left + IMAGE_OPTIONS_POPUP_OFFSET;

    if (left + IMAGE_OPTIONS_POPUP_WIDTH > containerRect.width) {
      left = anchorRect.left - containerRect.left - IMAGE_OPTIONS_POPUP_WIDTH - IMAGE_OPTIONS_POPUP_OFFSET;
    }
    if (left < 0) {
      left = 0;
    }

    if (top + IMAGE_OPTIONS_POPUP_HEIGHT_ESTIMATE > containerRect.height) {
      top = containerRect.height - IMAGE_OPTIONS_POPUP_HEIGHT_ESTIMATE - IMAGE_OPTIONS_POPUP_OFFSET;
    }
    if (top < 0) {
      top = 0;
    }

    return { top, left };
  }, []);

  const handleCloseImageOptions = useCallback(() => {
    imageOptionsAnchorRef.current = null;
    imageOptionsContainerRef.current = null;
    setImageOptions(createImageOptionsInitialState());
  }, []);

  const handleOpenImageOptions = useCallback(({ entityKey, blockKey, data, imageElement, containerElement, anchorElement }) => {
    if (!entityKey || !imageElement) {
      return;
    }

    const resolvedContainer = containerElement || imageElement.parentElement || document.body;
    const resolvedAnchor = anchorElement || imageElement;
    imageOptionsAnchorRef.current = resolvedAnchor;
    imageOptionsContainerRef.current = resolvedContainer;

    const normalizedWidth = getNormalizedPercentString(data?.width);
    const position = calculateImageOptionsPosition(resolvedAnchor, resolvedContainer) || { top: 0, left: 0 };

    setImageOptions({
      isOpen: true,
      position,
      entityKey,
      blockKey,
      tempWidth: normalizedWidth,
      tempAlt: data?.alt || '',
    });
  }, [calculateImageOptionsPosition]);

  const handleImageOptionsFieldChange = (field, value) => {
    setImageOptions((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const persistImageOptions = useCallback(
    (dataUpdates, { close = false } = {}) => {
      if (!imageOptions.isOpen || !imageOptions.entityKey) {
        if (close) {
          handleCloseImageOptions();
        }
        return;
      }

      try {
        const contentState = editorState.getCurrentContent();
        contentState.getEntity(imageOptions.entityKey);
  const contentStateWithUpdate = contentState.mergeEntityData(imageOptions.entityKey, dataUpdates);
  const newEditorState = EditorState.push(editorState, contentStateWithUpdate, 'apply-entity');
  const withSelection = EditorState.forceSelection(newEditorState, newEditorState.getSelection());
  setEditorState(withSelection);
        const data = {
          id_config: id_config,
          type: 'richText',
          value: convertToRaw(newEditorState.getCurrentContent()),
          create: createBoolRichText,
        };
        onChange({ data });
      } catch (error) {
        console.error('Erreur lors de la mise à jour des options image :', error);
      } finally {
        if (close) {
          handleCloseImageOptions();
        }
      }
    },
    [imageOptions.isOpen, imageOptions.entityKey, editorState, handleCloseImageOptions, onChange, id_config, createBoolRichText]
  );

  const handleWidthSliderChange = (event) => {
    const percentValue = Number(event.target.value);
    const normalized = normalizePercentStep(percentValue);
    const normalizedString = `${normalized}%`;
    setImageOptions((prev) => ({
      ...prev,
      tempWidth: normalizedString,
    }));
  };

  const handleImageOptionsApply = () => {
    const normalizedWidth = getNormalizedPercentString(imageOptions.tempWidth);
    persistImageOptions({
      width: normalizedWidth,
      alt: imageOptions.tempAlt || '',
    }, { close: true });
  };

  const handleImageOptionsSubmit = (event) => {
    event.preventDefault();
    handleImageOptionsApply();
  };

  useEffect(() => {
    if (!imageOptions.isOpen) {
      return;
    }

    const updatePosition = () => {
      const anchorElement = imageOptionsAnchorRef.current;
      const containerElement = imageOptionsContainerRef.current;
      if (!anchorElement || !containerElement) {
        return;
      }
      const nextPosition = calculateImageOptionsPosition(anchorElement, containerElement);
      if (!nextPosition) {
        return;
      }
      setImageOptions((prev) => {
        if (!prev.isOpen) {
          return prev;
        }
        if (
          prev.position &&
          Math.round(prev.position.top) === Math.round(nextPosition.top) &&
          Math.round(prev.position.left) === Math.round(nextPosition.left)
        ) {
          return prev;
        }
        return {
          ...prev,
          position: nextPosition,
        };
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    document.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      document.removeEventListener('scroll', updatePosition, true);
    };
  }, [imageOptions.isOpen, calculateImageOptionsPosition]);

  useEffect(() => {
    if (!imageOptions.isOpen || !imageOptions.entityKey) {
      return;
    }

    try {
      const entity = editorState.getCurrentContent().getEntity(imageOptions.entityKey);
      const data = entity.getData();
      const nextWidth = getNormalizedPercentString(data?.width);
      const nextAlt = data?.alt || '';
      setImageOptions((prev) => {
        if (!prev.isOpen) {
          return prev;
        }
        if (prev.tempWidth === nextWidth && prev.tempAlt === nextAlt) {
          return prev;
        }
        return {
          ...prev,
          tempWidth: nextWidth,
          tempAlt: nextAlt,
        };
      });
    } catch (error) {
      handleCloseImageOptions();
    }
  }, [editorState, imageOptions.isOpen, imageOptions.entityKey, handleCloseImageOptions]);

  useEffect(() => {
    if (!imageOptions.isOpen) {
      return;
    }

    const handleClickOutside = (event) => {
      if (imageOptionsRef.current?.contains(event.target)) {
        return;
      }
      if (event.target.closest('.richtext-image-options-btn')) {
        return;
      }
      handleCloseImageOptions();
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [imageOptions.isOpen, handleCloseImageOptions]);


  useLayoutEffect(() => {
    const selection = editorState.getSelection();
    const contentState = editorState.getCurrentContent();
    if (!hasInteracted || !hasFocus) {
      setShowAddonTooltip(false);
      setAddonTooltipPosition(null);
      return;
    }
    if (selection.isCollapsed()) {
      const blockKey = selection.getStartKey();
      const block = contentState.getBlockForKey(blockKey);
      if (block.getText().trim() === '') {
        // Petit délai pour éviter le flash lors du changement de ligne
        const timeoutId = setTimeout(() => {
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
          }
        },);
        return () => clearTimeout(timeoutId);
      }
    }
    setShowAddonTooltip(false);
    setAddonTooltipPosition(null);
  }, [editorState, hasInteracted, hasFocus]);



  useEffect(() => {
    const handleClickOutside = (e) => {
      const editorEl = editorContainerRef.current;
      const isInsideEditor = editorEl && editorEl.contains(e.target);
      const isInsideAnyTooltip =
        buttonTooltipRef.current?.contains(e.target) ||
        linkTooltipRef.current?.contains(e.target) ||
        addonTooltipRef.current?.contains(e.target);
      const isInsideImageOptions = imageOptionsRef.current?.contains(e.target);
      const isImageOptionsButton = e.target.closest('.richtext-image-options-btn');
      if (!isInsideEditor && !isInsideAnyTooltip && !isInsideImageOptions && !isImageOptionsButton) {
        flushSync(() => {
          setShowLinkTooltip(false);
          setShowAddonTooltip(false);
          setButtonTooltipPosition(null);
          setLinkTooltipPosition(null);
        });
      }
    };
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, []);

  console.log(showAddonTooltip)

  

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
      value: convertToRaw(newState.getCurrentContent()),
      create: createBoolRichText
    };
    onChange({ data });
  };

  const widthPercentValue = getPercentNumberFromValue(imageOptions.tempWidth);

  const handleBoldClick = () => {
    const newState = RichUtils.toggleInlineStyle(editorState, 'BOLD');
    setEditorState(newState);
    const data = {
      id_config: id_config,
      type: 'richText',
      value: convertToRaw(newState.getCurrentContent()),
      create: createBoolRichText
    };
    onChange({ data });
  };

  const handleItalicClick = () => {
    const newState = RichUtils.toggleInlineStyle(editorState, 'ITALIC');
    setEditorState(newState);
    const data = {
      id_config: id_config,
      type: 'richText',
      value: convertToRaw(newState.getCurrentContent()),
      create: createBoolRichText
    };
    onChange({ data });
  };

  const handleH1Click = () => {
    const newState = RichUtils.toggleBlockType(editorState, 'header-one');
    setEditorState(newState);
    const data = {
      id_config: id_config,
      type: 'richText',
      value: convertToRaw(newState.getCurrentContent()),
      create: createBoolRichText
    };
    onChange({ data });
  };

  const handleH2Click = () => {
    const newState = RichUtils.toggleBlockType(editorState, 'header-two');
    setEditorState(newState);
    const data = {
      id_config: id_config,
      type: 'richText',
      value: convertToRaw(newState.getCurrentContent()),
      create: createBoolRichText
    };
    onChange({ data });
  };

  const handleH3Click = () => {
    const newState = RichUtils.toggleBlockType(editorState, 'header-three');
    setEditorState(newState);
    const data = {
      id_config: id_config,
      type: 'richText',
      value: convertToRaw(newState.getCurrentContent()),
      create: createBoolRichText
    };
    onChange({ data });
  };

  const handleH4Click = () => {
    const newState = RichUtils.toggleBlockType(editorState, 'header-four');
    setEditorState(newState);
    const data = {
      id_config: id_config,
      type: 'richText',
      value: convertToRaw(newState.getCurrentContent()),
      create: createBoolRichText
    };
    onChange({ data });
  };

  const handleH5Click = () => {
    const newState = RichUtils.toggleBlockType(editorState, 'header-five');
    setEditorState(newState);
    const data = {
      id_config: id_config,
      type: 'richText',
      value: convertToRaw(newState.getCurrentContent()),
      create: createBoolRichText
    };
    onChange({ data });
  };

  const handleH6Click = () => {
    const newState = RichUtils.toggleBlockType(editorState, 'header-six');
    setEditorState(newState);
    const data = {
      id_config: id_config,
      type: 'richText',
      value: convertToRaw(newState.getCurrentContent()),
      create: createBoolRichText
    };
    onChange({ data });
  };

  const handleULClick = () => {
    const newState = RichUtils.toggleBlockType(editorState, 'unordered-list-item');
    setEditorState(newState);
    const data = {
      id_config: id_config,
      type: 'richText',
      value: convertToRaw(newState.getCurrentContent()),
      create: createBoolRichText
    };
    onChange({ data });
  };

  const handleOLClick = () => {
    const newState = RichUtils.toggleBlockType(editorState, 'ordered-list-item');
    setEditorState(newState);
    const data = {
      id_config: id_config,
      type: 'richText',
      value: convertToRaw(newState.getCurrentContent()),
      create: createBoolRichText
    };
    onChange({ data });
  };

  const handleBlockquoteClick = () => {
    const newState = RichUtils.toggleBlockType(editorState, 'blockquote');
    setEditorState(newState);
    const data = {
      id_config: id_config,
      type: 'richText',
      value: convertToRaw(newState.getCurrentContent()),
      create: createBoolRichText
    };
    onChange({ data });
  };

  const handleCodeBlockClick = () => {
    const newState = RichUtils.toggleBlockType(editorState, 'code-block');
    setEditorState(newState);
    const data = {
      id_config: id_config,
      type: 'richText',
      value: convertToRaw(newState.getCurrentContent()),
      create: createBoolRichText
    };
    onChange({ data });
  };


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

  // ---------- EMBED SECTION ---------------

  const handleEmbedClick = () => {
    setEditingEmbedKey(null);
    setEditingEmbedCode('');
    setEmbedModalOpen(true);
  };

  const handleEditEmbed = (entityKey, html) => {
    setEditingEmbedKey(entityKey);
    setEditingEmbedCode(html);
    setEmbedModalOpen(true);
  };

  const handleEmbedInsert = (embedData) => {
    const contentState = editorState.getCurrentContent();
    
    if (editingEmbedKey) {
      // Mode édition : remplacer l'entité existante
      contentState.replaceEntityData(editingEmbedKey, embedData);
      const newEditorState = EditorState.push(editorState, contentState, 'change-block-data');
      setEditorState(EditorState.forceSelection(newEditorState, newEditorState.getSelection()));
    } else {
      // Mode création : insérer une nouvelle entité
      const contentStateWithEntity = contentState.createEntity('EMBED', 'IMMUTABLE', embedData);
      const entityKey = contentStateWithEntity.getLastCreatedEntityKey();
      const newEditorState = EditorState.set(editorState, { currentContent: contentStateWithEntity });
      const finalEditorState = AtomicBlockUtils.insertAtomicBlock(newEditorState, entityKey, ' ');
      setEditorState(finalEditorState);
    }
    
    setEmbedModalOpen(false);
    setEditingEmbedKey(null);
    setEditingEmbedCode('');
  };

  // ---------- FILE CHANGE ---------------

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        let fileToUse = file;
        
        // Pour les PNG, ne pas compresser pour éviter le rognage automatique
        if (file.type !== 'image/png') {
          fileToUse = await compressImage(file);
        }
        
        // Convertir l'image en base64 (système existant)
        const reader = new FileReader();
        reader.onload = () => {
          const imageSrc = reader.result;
          
          // Créer l'entité d'image
          const contentState = editorState.getCurrentContent();
          const contentStateWithEntity = contentState.createEntity('IMAGE', 'IMMUTABLE', { 
            src: imageSrc, 
            width: '100%',
            alt: file.name || ''
          });
          const entityKey = contentStateWithEntity.getLastCreatedEntityKey();
          
          if (!entityKey) {
            console.error('Erreur : entityKey non défini');
            return;
          }

          // Créer un nouvel état d'éditeur avec le contenu mis à jour
          const newEditorState = EditorState.set(editorState, { 
            currentContent: contentStateWithEntity 
          });
          
          // Insérer le bloc atomique avec un caractère espace unique
          const editorStateWithImage = AtomicBlockUtils.insertAtomicBlock(
            newEditorState, 
            entityKey, 
            ' '  // Un seul caractère espace pour éviter la duplication
          );
          
          // Mettre à jour l'état immédiatement
          setEditorState(editorStateWithImage);
          
          // Déclencher le onChange pour sauvegarder
          const data = {
            id_config: id_config,
            type: 'richText',
            value: convertToRaw(editorStateWithImage.getCurrentContent()),
            create: createBoolRichText
          };
          onChange({ data });
        };
        reader.readAsDataURL(fileToUse);
      } catch (error) {
        console.error("Erreur lors du traitement de l'image :", error);
      }
    }
    
    // Réinitialiser la valeur de l'input file pour permettre de re-sélectionner le même fichier
    event.target.value = '';
  };



  const handleRemoveImage = async (blockKey) => {
    const contentState = editorState.getCurrentContent();
    const block = contentState.getBlockForKey(blockKey);
    
    // Récupérer l'entityKey avant de supprimer le bloc
    const entityKey = block.getEntityAt(0);
    let imageUrl = null;
    
    if (entityKey) {
      try {
        const entity = contentState.getEntity(entityKey);
        if (entity && entity.getType() === 'IMAGE') {
          const data = entity.getData();
          imageUrl = data?.src;
        }
      } catch (error) {
        console.error('Erreur lors de la récupération de l\'entité image:', error);
      }
    }
    
    // Supprimer le bloc de l'image
    const blockMap = contentState.getBlockMap().delete(blockKey);
    const newContentState = contentState.merge({
      blockMap,
      selectionAfter: contentState.getSelectionAfter(),
    });
    
    // Nettoyer l'entityMap : supprimer les entités qui ne sont plus référencées par aucun bloc
    const rawContent = convertToRaw(newContentState);
    const usedEntityKeys = new Set();
    
    // Parcourir tous les blocs pour trouver les entités encore utilisées
    rawContent.blocks.forEach(block => {
      block.entityRanges?.forEach(range => {
        usedEntityKeys.add(range.key.toString());
      });
    });
    
    // Filtrer l'entityMap pour ne garder que les entités utilisées
    const cleanedEntityMap = {};
    Object.keys(rawContent.entityMap).forEach(key => {
      if (usedEntityKeys.has(key)) {
        cleanedEntityMap[key] = rawContent.entityMap[key];
      }
    });
    
    rawContent.entityMap = cleanedEntityMap;
    
    // Mettre à jour l'état de l'éditeur avec le contenu nettoyé
    const cleanedContentState = convertFromRaw(rawContent);
    const newEditorState = EditorState.push(editorState, cleanedContentState, 'remove-range');
    setEditorState(newEditorState);
    
    // Supprimer l'image du bucket Supabase via l'API
    if (imageUrl && imageUrl.includes('supabase.co/storage/v1/object/public/collection-richtext-images/')) {
      try {
        const apiUrl = config.apiUrl;
        const token = Cookies.get('token');
        
        const response = await Axios.delete(`${apiUrl}/deleteRichTextImage`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          data: {
            imageUrl: imageUrl
          }
        });
        
        if (response.data.success) {
          console.log('Image supprimée du bucket avec succès:', response.data.fileName);
        } else {
          console.error('Erreur lors de la suppression de l\'image:', response.data.message);
        }
      } catch (error) {
        console.error('Erreur lors de la suppression de l\'image:', error);
      }
    }
    
    // Ne pas appeler onChange ici - la sauvegarde se fera lors de l'enregistrement global
    // dans editElementCollection.jsx
  };

  const handleRemoveEmbed = (blockKey) => {
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

  const handleKeyCommand = (command, editorState) => {
    if (command === 'backspace' || command === 'delete') {
      const selection = editorState.getSelection();
      const contentState = editorState.getCurrentContent();
      const startKey = selection.getStartKey();
      const startOffset = selection.getStartOffset();
      const block = contentState.getBlockForKey(startKey);
      
      // Si on est au début d'un bloc et qu'on appuie sur Backspace
      if (command === 'backspace' && startOffset === 0 && block.getType() !== 'atomic') {
        const blockBefore = contentState.getBlockBefore(startKey);
        if (blockBefore && blockBefore.getType() === 'atomic') {
          const entityKey = blockBefore.getEntityAt(0);
          if (entityKey) {
            const entity = contentState.getEntity(entityKey);
            if (entity.getType() === 'EMBED') {
              handleRemoveEmbed(blockBefore.getKey());
              return 'handled';
            }
          }
        }
      }
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
              onOpenOptions: handleOpenImageOptions,
            },
          };
        }
        if (entity && entity.getType() === 'EMBED') {
          return {
            component: EmbedBlock,
            editable: false,
            props: {
              onEditEmbed: handleEditEmbed,
              onRemoveEmbed: handleRemoveEmbed,
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
        const contentFromJSON = typeof dataValue.text_json === 'string'
          ? JSON.parse(dataValue.text_json)
          : dataValue.text_json;
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
        handleKeyCommand={handleKeyCommand}
        blockRendererFn={blockRendererFn}
        blockStyleFn={blockStyleFn}
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
          onCode={handleCodeBlockClick}
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
          theme={theme}
          onImage={handleImageClick}
          onEmbed={handleEmbedClick}
        />
      )}
      {imageOptions.isOpen && imageOptions.position && (
        <div
          className="richtext-image-options-popup"
          ref={imageOptionsRef}
          style={{
            top: `${imageOptions.position.top}px`,
            left: `${imageOptions.position.left}px`,
          }}
        >
          <form className="richtext-image-options-form" onSubmit={handleImageOptionsSubmit}>
            <div className="richtext-image-options-header">
              <span className="richtext-image-options-title">Options de l'image</span>
              <button type="button" className="richtext-image-options-close" onClick={handleCloseImageOptions}>
                x
              </button>
            </div>
            <div className="richtext-image-options-body">
              <label className="richtext-image-options-label">
                Largeur
                <div className="richtext-image-options-range-group">
                  <div className="richtext-image-options-range-wrapper">
                    <input
                      type="range"
                      min="25"
                      max="100"
                      step="25"
                      value={widthPercentValue}
                      className="richtext-image-options-range"
                      onChange={handleWidthSliderChange}
                    />
                  </div>
                  <div className="richtext-image-options-range-scale">
                    {WIDTH_PERCENT_STEPS.map((step) => (
                      <span
                        key={step}
                        className={`richtext-image-options-range-scale-item${step === widthPercentValue ? ' active' : ''}`}
                      >
                        {step}%
                      </span>
                    ))}
                  </div>
                </div>
              </label>
              <label className="richtext-image-options-label">
                Texte alternatif
                <input
                  type="text"
                  className="richtext-image-options-input"
                  value={imageOptions.tempAlt}
                  onChange={(event) => handleImageOptionsFieldChange('tempAlt', event.target.value)}
                  placeholder="Décrivez l'image"
                />
              </label>
            </div>
            <div className="richtext-image-options-footer">
              <SecondaryButton type="submit">
                Appliquer
              </SecondaryButton>
            </div>
          </form>
        </div>
      )}
      <EmbedModal 
        open={embedModalOpen}
        onClose={() => {
          setEmbedModalOpen(false);
          setEditingEmbedKey(null);
          setEditingEmbedCode('');
        }}
        onInsert={handleEmbedInsert}
        initialCode={editingEmbedCode}
      />
    </div>
  );
};

export default RichTextUpload;