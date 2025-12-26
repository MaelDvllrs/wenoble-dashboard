import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Cookies from 'js-cookie';
import config from '../../../../../config';
import { checkScrapingStatus as checkStatus, scrapeSite, rescrapeSite, saveSiteModifications } from './apiScraping';
import './StaticEditor.css';
import { useWebsite } from '../../../../../Context/WebsiteContext';
import { DefaultButton, SecondaryButton, SmallIconButton, SimpleSearchField } from '../../../../../Theme/element';
import { motion, useMotionValue, useMotionValueEvent } from 'framer-motion';
import OverlaySystem from './OverlaySystem';
import { PiArrowSquareIn, PiEye, PiPencilSimple, PiDesktop, PiDeviceTablet, PiDeviceMobile, PiFile, PiCaretUpDownLight, PiPencilSimpleLight, PiTextAlignLeft, PiTextAlignCenter, PiTextAlignRight, PiTextAlignJustify, PiTextUnderline, PiTextStrikethrough, PiCursorClick, PiCursorClickThin, PiLinkSimple, PiEnvelope, PiPhone } from "react-icons/pi";
import { Popper, Grow, ClickAwayListener, IconButton, CircularProgress } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';


const StaticEditor = ({ onSave }) => {
  const iframeRef = useRef(null);
  const viewportRef = useRef(null);
  const width = useMotionValue(1200);
  const startWidthRef = useRef(1200);
  const [isEditMode, setIsEditMode] = useState(true); // Mode édition par défaut
  const [selectedElement, setSelectedElement] = useState(null);
  const selectedElementRef = useRef(null); // Pour accéder à selectedElement dans les event listeners
  const [editedText, setEditedText] = useState('');
  const [hoveredElement, setHoveredElement] = useState(null);
  const [overlayBoxes, setOverlayBoxes] = useState({ hovered: null, selected: null });
  const overlayRef = useRef(null);
  const [siteUrl, setSiteUrl] = useState(null);
  const [editModeHtml, setEditModeHtml] = useState(null);
  const [isScraped, setIsScraped] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [iframeWidth, setIframeWidth] = useState(1200); // Largeur en pixels pour l'affichage
  const [isDragging, setIsDragging] = useState(false);
  const lastUpdateRef = useRef(0);
  const token = Cookies.get('token');
  const { selectedWebsite, loading: websiteLoading } = useWebsite();
  const [iframeKey, setIframeKey] = useState(0);
  const [isIframeReady, setIsIframeReady] = useState(false);
  const [pages, setPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(() => {
    if (selectedWebsite?.id) {
      return localStorage.getItem(`wenoble_current_page_${selectedWebsite.id}`) || 'index.html';
    }
    return 'index.html';
  });
  const [openPageMenu, setOpenPageMenu] = useState(false);
  const pageMenuRef = useRef(null);
  const theme = useTheme();  const [pageSearch, setPageSearch] = useState('');
  const pageSearchInputRef = useRef(null);
  
  // États pour les styles de texte
  const [fontWeight, setFontWeight] = useState('400');
  const [fontSize, setFontSize] = useState('16');
  const [lineHeight, setLineHeight] = useState('1.5');
  const [textAlign, setTextAlign] = useState('left');
  const [textDecoration, setTextDecoration] = useState('none');
  
  // États pour les liens
  const [linkType, setLinkType] = useState('external'); // 'external' ou 'internal'
  const [linkUrl, setLinkUrl] = useState('');
  
  // États pour la sidebar des paramètres de page
  const [isPageSettingsOpen, setIsPageSettingsOpen] = useState(false);
  const [pageSlug, setPageSlug] = useState('');
  const [pageTitle, setPageTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [ogTitle, setOgTitle] = useState('');
  const [ogDescription, setOgDescription] = useState('');
  const [ogImage, setOgImage] = useState('');
  const [metaImage, setMetaImage] = useState('');
  const [schemas, setSchemas] = useState([]);
  
  // États pour stocker les valeurs initiales et détecter les modifications
  const [initialPageSettings, setInitialPageSettings] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedChangesPopup, setShowUnsavedChangesPopup] = useState(false);
  
  // États pour tracker les éditions d'éléments
  const [elementEdits, setElementEdits] = useState([]); // Stocke les éditions en cours
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingEdits, setIsLoadingEdits] = useState(false); // Chargement des éditions
  const debounceTimerRef = useRef(null); // Timer pour le debounce des éditions de texte
  
  // Mettre à jour l'affichage de la largeur de manière throttled
  useMotionValueEvent(width, "change", (latest) => {
    const now = Date.now();
    // Throttle à 100ms pour éviter trop de re-renders
    if (now - lastUpdateRef.current > 100) {
      setIframeWidth(Math.round(latest));
      lastUpdateRef.current = now;
    }
  });
  

  // Vérifier au chargement si le site a déjà été scrapé et charger en mode édition
  useEffect(() => {
    if (selectedWebsite?.id) {
      checkScrapingStatusHandler();
    }
    
    // Nettoyer le debounce timer lors du unmount
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [selectedWebsite?.id]);

  // Détecter les modifications dans les paramètres de page
  useEffect(() => {
    // Attendre que initialPageSettings soit défini
    if (Object.keys(initialPageSettings).length === 0) return;
    
    const hasChanges = 
      pageTitle !== initialPageSettings.pageTitle ||
      metaDescription !== initialPageSettings.metaDescription ||
      ogTitle !== initialPageSettings.ogTitle ||
      ogDescription !== initialPageSettings.ogDescription ||
      ogImage !== initialPageSettings.ogImage ||
      metaImage !== initialPageSettings.metaImage;
    
    
    setHasUnsavedChanges(hasChanges);
  }, [pageTitle, metaDescription, ogTitle, ogDescription, ogImage, metaImage, initialPageSettings]);

  // Écouter les clics sur l'iframe pour fermer le menu des pages et la sidebar settings
  useEffect(() => {
    if ((!openPageMenu && !isPageSettingsOpen) || !iframeRef.current) {
      return;
    }

    const handleIframeClick = () => {
      if (openPageMenu) {
        setOpenPageMenu(false);
        setPageSearch('');
      }
      // Ne pas fermer la sidebar si la popup est déjà ouverte
      if (isPageSettingsOpen && !showUnsavedChangesPopup) {
        handleClosePageSettings();
      }
    };

    const iframe = iframeRef.current;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    
    if (iframeDoc) {
      iframeDoc.addEventListener('click', handleIframeClick, true);
      return () => {
        iframeDoc.removeEventListener('click', handleIframeClick, true);
      };
    }
  }, [openPageMenu, isPageSettingsOpen, isIframeReady, showUnsavedChangesPopup]);

  // Écouter les messages de console de l'iframe
  

  const checkScrapingStatusHandler = async () => {
    try {
      setIsLoading(true);
      const data = await checkStatus(selectedWebsite.id, token);

      if (data.scraped && data.localUrl) {
        setIsScraped(true);
        setSiteUrl(`${config.apiUrl}${data.localUrl}`);
        
        // Charger automatiquement le HTML en mode édition au démarrage
        await loadPages();
        const savedPage = localStorage.getItem(`wenoble_current_page_${selectedWebsite.id}`) || 'index.html';
        setCurrentPage(savedPage);
        await loadEditModeHtml(savedPage);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification du statut:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadEditModeHtml = async (pageName = 'index.html') => {
    if (!selectedWebsite?.id) return;
    
    try {
      const response = await fetch(`${config.apiUrl}/scraping/edit-mode/${selectedWebsite.id}/${pageName}`);
      const html = await response.text();
      setEditModeHtml(html);
    } catch (error) {
      console.error('Erreur lors du chargement du HTML en mode édition:', error);
    }
  };

  const loadPages = async () => {
    if (!selectedWebsite?.id) return;
    
    try {
      const response = await fetch(`${config.apiUrl}/scraping/pages/${selectedWebsite.id}`);
      const data = await response.json();
      setPages(data.pages || []);
    } catch (error) {
      console.error('Erreur lors du chargement des pages:', error);
      setPages(['index.html']);
    }
  };

  const handleScrapeSite = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await scrapeSite(selectedWebsite.id, token);

      setIsScraped(true);
      setSiteUrl(`${config.apiUrl}${data.localUrl}`);
      setError(null);
    } catch (error) {
      console.error('Erreur lors du scraping:', error);
      setError(error.response?.data?.error || error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRescrape = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await rescrapeSite(selectedWebsite.id, token);

      setIsScraped(true);
      setSiteUrl(`${config.apiUrl}${data.localUrl}`);
      setError(null);
    } catch (error) {
      console.error('Erreur lors du rescraping:', error);
      setError(error.response?.data?.error || error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Appliquer enableEditMode quand l'iframe en mode édition est chargée
  useEffect(() => {
    if (isEditMode && editModeHtml && iframeRef.current && isIframeReady) {
      try {
        const iframeDocument = iframeRef.current.contentDocument || iframeRef.current.contentWindow.document;
        enableEditMode(iframeDocument);
        
        // Charger et appliquer les éditions existantes
        loadAndApplyEdits();
      } catch (error) {
        console.error('Erreur d\'accès à l\'iframe:', error);
      }
    }
  }, [editModeHtml, isEditMode, isIframeReady, currentPage]);

  // Charger et appliquer les éditions existantes depuis la BDD
  const loadAndApplyEdits = async () => {
    if (!selectedWebsite?.id || !currentPage || !iframeRef.current) return;

    try {
      setIsLoadingEdits(true);
      
      const response = await fetch(
        `${config.apiUrl}/websites/${selectedWebsite.id}/edits?page=${encodeURIComponent(currentPage)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        console.error('Erreur lors du chargement des éditions:', response.status);
        return;
      }

      const result = await response.json();
      
      if (result.success && result.data && result.data.length > 0) {
        const iframe = iframeRef.current;
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        
        if (!iframeDoc) return;

        console.log(`Application de ${result.data.length} édition(s) existante(s)`);

        // Appliquer chaque édition à l'iframe
        result.data.forEach(edit => {
          try {
            const element = iframeDoc.querySelector(edit.elementPath);
            
            if (element) {
              if (edit.editType === 'text') {
                // Parser le JSON pour récupérer textContent et style
                try {
                  const editData = JSON.parse(edit.value);
                  
                  // Appliquer le textContent
                  if (editData.textContent !== undefined) {
                    element.textContent = editData.textContent;
                  }
                  
                  // Appliquer les styles inline sans toucher aux classes
                  if (editData.style) {
                    element.setAttribute('style', editData.style);
                  }
                } catch (parseError) {
                  // Si ce n'est pas du JSON, c'est peut-être un ancien format (outerHTML)
                  console.warn('Format d\'\u00e9dition non JSON, utilisation comme innerHTML:', parseError);
                  element.innerHTML = edit.value;
                }
              } else if (edit.editType === 'image') {
                // Pour les images, mettre à jour le src
                element.src = edit.value;
              } else if (edit.editType === 'link') {
                // Pour les liens, mettre à jour le href
                element.setAttribute('href', edit.value);
              }
            } else {
              console.warn(`Élément non trouvé: ${edit.elementPath}`);
            }
          } catch (err) {
            console.error(`Erreur lors de l'application de l'édition:`, err);
          }
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des éditions:', error);
    } finally {
      // Attendre un court instant pour que le DOM se mette à jour
      setTimeout(() => {
        setIsLoadingEdits(false);
      }, 100);
    }
  };

  // Surveiller les modifications directes dans l'iframe (contenteditable)
  useEffect(() => {
    if (!isEditMode || !isIframeReady || !iframeRef.current || !selectedElement) return;

    const iframe = iframeRef.current;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) return;

    const handleInput = (e) => {
      if (e.target === selectedElement.element) {
        // Mettre à jour le state et tracker l'édition
        const newText = e.target.textContent;
        setEditedText(newText);
        
        const editValue = JSON.stringify({
          textContent: newText,
          style: e.target.getAttribute('style') || ''
        });
        updateElementEdit(e.target, 'text', editValue);
      }
    };

    // Ajouter le listener sur le document de l'iframe
    iframeDoc.addEventListener('input', handleInput, true);

    return () => {
      iframeDoc.removeEventListener('input', handleInput, true);
    };
  }, [isEditMode, isIframeReady, selectedElement]);

  const disableAnimations = (iframeDocument) => {
    // Désactiver les scripts qui appellent api-wenoble.wenoble.fr
    const externalScripts = iframeDocument.querySelectorAll('script[src]');
    externalScripts.forEach(script => {
      const src = script.getAttribute('src');
      if (src && src.includes('api-wenoble.wenoble.fr')) {
        script.type = 'text/plain';
        script.setAttribute('data-original-type', 'text/javascript');
        script.setAttribute('data-original-src', src);
      }
    });

    // Désactiver toutes les animations et transitions en mode aperçu
    const style = iframeDocument.createElement('style');
    style.id = 'disable-animations-style';
    style.textContent = `
      *, *::before, *::after {
        animation: none !important;
        animation-duration: 0s !important;
        transition: none !important;
        transition-duration: 0s !important;
      }
    `;
    iframeDocument.head.appendChild(style);
  };

  const enableEditMode = (iframeDocument) => {
    // Intercepter la création de <script> pour bloquer Webflow
    const originalCreateElement = iframeDocument.createElement.bind(iframeDocument);
    iframeDocument.createElement = function(type) {
      const el = originalCreateElement(type);
      if (type === "script") {
        // Bloquer tous les scripts Webflow
        el.addEventListener('beforescriptexecute', (e) => {
          const src = el.src || '';
          if (src.includes('webflow') || src.includes('ix2')) {
            e.preventDefault();
          }
        });
      }
      return el;
    };

    // Désactiver tous les scripts inline (non importés)
    const inlineScripts = iframeDocument.querySelectorAll('script:not([src])');
    inlineScripts.forEach(script => {
      script.type = 'text/plain';
      script.setAttribute('data-original-type', 'text/javascript');
    });

    // Désactiver les scripts qui appellent api-wenoble.wenoble.fr
    const externalScripts = iframeDocument.querySelectorAll('script[src]');
    externalScripts.forEach(script => {
      const src = script.getAttribute('src');
      if (src && src.includes('api-wenoble.wenoble.fr')) {
        script.type = 'text/plain';
        script.setAttribute('data-original-type', 'text/javascript');
        script.setAttribute('data-original-src', src);
      }
    });

    // Ajouter des styles minimalistes pour le mode édition
    const style = iframeDocument.createElement('style');
    style.textContent = `
      

      /* Style pour l'élément en édition */
      [contenteditable="true"] {
        outline: 3px solid #2ec96c6e !important;
      }
    `;
    iframeDocument.head.appendChild(style);
  };

  // Générer un chemin stable pour identifier un élément
  const getElementPath = (element) => {
    if (!element || !element.parentNode) return '';
    
    const path = [];
    let current = element;
    
    while (current && current.nodeType === Node.ELEMENT_NODE && current.tagName !== 'HTML') {
      let selector = current.tagName.toLowerCase();
      
      // Ajouter un ID si présent
      if (current.id) {
        selector += `#${current.id}`;
        path.unshift(selector);
        break; // Un ID est suffisamment unique
      }
      
      // Ajouter des classes importantes (max 2)
      if (current.className && typeof current.className === 'string') {
        const classes = current.className.split(' ').filter(c => c.trim()).slice(0, 2);
        if (classes.length > 0) {
          selector += '.' + classes.join('.');
        }
      }
      
      // Ajouter l'index parmi les siblings du même type
      if (current.parentNode) {
        const siblings = Array.from(current.parentNode.children).filter(
          sibling => sibling.tagName === current.tagName
        );
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          selector += `:nth-of-type(${index})`;
        }
      }
      
      path.unshift(selector);
      current = current.parentNode;
    }
    
    return path.join(' > ');
  };

  const handleElementSelect = (element, type) => {
    if (!element) {
      setSelectedElement(null);
      selectedElementRef.current = null;
      setEditedText('');
      setLinkUrl('');
      return;
    }

    // Mettre à jour le texte éditable
    if (type === 'text') {
      setEditedText(element.textContent || '');
      
      // Lire les styles actuels de l'élément
      const computedStyle = window.getComputedStyle(element);
      setFontWeight(computedStyle.fontWeight || '400');
      setFontSize(parseInt(computedStyle.fontSize) || 16);
      setLineHeight(computedStyle.lineHeight === 'normal' ? '1.5' : parseFloat(computedStyle.lineHeight) / parseFloat(computedStyle.fontSize) || 1.5);
      setTextAlign(computedStyle.textAlign || 'left');
      setTextDecoration(computedStyle.textDecoration.includes('underline') ? 'underline' : 
                        computedStyle.textDecoration.includes('line-through') ? 'line-through' : 
                        computedStyle.textDecoration.includes('overline') ? 'overline' : 'none');
      
      // Si l'élément est un lien, charger ses propriétés
      if (element.tagName.toLowerCase() === 'a') {
        let href = element.getAttribute('href') || '';
        
        // Déterminer le type de lien
        if (href.startsWith('mailto:')) {
          setLinkType('mail');
          setLinkUrl(href.replace('mailto:', ''));
        } else if (href.startsWith('tel:')) {
          setLinkType('tel');
          setLinkUrl(href.replace('tel:', ''));
        } else {
          // Si c'est un lien interne de type /static-sites/site-id/page, extraire uniquement la page
          const staticSiteMatch = href.match(/^\/static-sites\/[^\/]+\/(.+)$/);
          if (staticSiteMatch) {
            const pageName = staticSiteMatch[1];
            // Convertir le nom de page en URL propre
            // Si c'est index.html ou juste index, mettre /
            // Sinon, garder tel quel avec un / devant
            if (pageName === 'index.html' || pageName === 'index') {
              href = '/';
            } else {
              // Enlever l'extension .html si présente
              href = '/' + pageName.replace('.html', '');
            }
          }
          
          setLinkUrl(href);
          
          // Déterminer si c'est un lien interne ou externe
          if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) {
            setLinkType('external');
          } else {
            setLinkType('internal');
          }
        }
      } else {
        setLinkUrl('');
      }
    } else {
      setEditedText('');
      setLinkUrl('');
    }
    
    const newSelection = { element, type };
    setSelectedElement(newSelection);
    selectedElementRef.current = newSelection;
  };

  const handleElementHover = (element) => {
    setHoveredElement(element);
  };

  // Fonction utilitaire pour mettre à jour les éditions
  const updateElementEdit = (element, type, value, immediate = false) => {
    const elementPath = getElementPath(element);
    
    const applyEdit = () => {
      const existingEditIndex = elementEdits.findIndex(
        edit => edit.elementPath === elementPath
      );
      
      const newEdit = {
        elementPath,
        type,
        value
      };
      
      if (existingEditIndex >= 0) {
        const updatedEdits = [...elementEdits];
        updatedEdits[existingEditIndex] = newEdit;
        setElementEdits(updatedEdits);
      } else {
        setElementEdits(prev => [...prev, newEdit]);
      }
    };
    
    // Pour les éditions de texte, utiliser debounce sauf si immediate
    if (type === 'text' && !immediate) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        applyEdit();
      }, 500); // Attendre 500ms après la dernière frappe
    } else {
      // Pour les images et styles, appliquer immédiatement
      applyEdit();
    }
  };

  const handleTextChange = (newText) => {
    setEditedText(newText);
    
    // Mettre à jour le texte dans l'iframe en temps réel
    if (selectedElement && selectedElement.type === 'text') {
      selectedElement.element.textContent = newText;
      
      // Tracker l'édition : stocker textContent + attribut style
      const editValue = JSON.stringify({
        textContent: newText,
        style: selectedElement.element.getAttribute('style') || ''
      });
      updateElementEdit(selectedElement.element, 'text', editValue);
    }
  };

  const handleApplyChanges = () => {
    if (selectedElement && selectedElement.type === 'text') {
      if (editedText) {
        selectedElement.element.textContent = editedText;
      }
      
      // Appliquer les styles
      selectedElement.element.style.fontWeight = fontWeight;
      selectedElement.element.style.fontSize = fontSize + 'px';
      selectedElement.element.style.lineHeight = lineHeight;
      selectedElement.element.style.textAlign = textAlign;
      selectedElement.element.style.textDecoration = textDecoration;
      
    }
  };

  const handleStyleChange = (styleType, value) => {
    if (!selectedElement || selectedElement.type !== 'text') return;
    
    switch(styleType) {
      case 'fontWeight':
        setFontWeight(value);
        selectedElement.element.style.fontWeight = value;
        break;
      case 'fontSize':
        setFontSize(value);
        selectedElement.element.style.fontSize = value + 'px';
        break;
      case 'lineHeight':
        setLineHeight(value);
        selectedElement.element.style.lineHeight = value;
        break;
      case 'textAlign':
        setTextAlign(value);
        selectedElement.element.style.textAlign = value;
        break;
      case 'textDecoration':
        setTextDecoration(value);
        selectedElement.element.style.textDecoration = value;
        break;
    }
    
    // Tracker l'édition : stocker textContent + attribut style
    const editValue = JSON.stringify({
      textContent: selectedElement.element.textContent,
      style: selectedElement.element.getAttribute('style') || ''
    });
    updateElementEdit(selectedElement.element, 'text', editValue);
  };

  const handleLinkChange = (newUrl) => {
    if (!selectedElement || selectedElement.element.tagName.toLowerCase() !== 'a') return;
    
    setLinkUrl(newUrl);
    
    // Ajouter le préfixe selon le type
    let fullUrl = newUrl;
    if (linkType === 'mail' && newUrl && !newUrl.startsWith('mailto:')) {
      fullUrl = 'mailto:' + newUrl;
    } else if (linkType === 'tel' && newUrl && !newUrl.startsWith('tel:')) {
      fullUrl = 'tel:' + newUrl;
    }
    
    selectedElement.element.setAttribute('href', fullUrl);
    
    // Tracker l'édition de lien
    updateElementEdit(selectedElement.element, 'link', fullUrl, true);
  };

  const handleLinkTypeChange = (type) => {
    setLinkType(type);
    
    // Si on passe en mode interne et qu'il n'y a pas d'URL ou que c'est une URL externe,
    // réinitialiser avec la première page
    if (type === 'internal' && (!linkUrl || linkUrl.startsWith('http') || linkUrl.includes('@') || linkUrl.match(/^\+?[0-9]/))) {
      const firstPage = pages[0] || 'index.html';
      const newUrl = firstPage === 'index.html' ? '/' : '/' + firstPage.replace('.html', '');
      handleLinkChange(newUrl);
    }
    // Si on passe en mode externe et que c'est une URL interne, réinitialiser
    else if (type === 'external' && linkUrl && !linkUrl.startsWith('http')) {
      handleLinkChange('https://');
    }
    // Si on passe en mode mail
    else if (type === 'mail') {
      handleLinkChange(linkUrl.includes('@') ? linkUrl : 'exemple@email.com');
    }
    // Si on passe en mode tel
    else if (type === 'tel') {
      handleLinkChange(linkUrl.match(/^\+?[0-9]/) ? linkUrl : '+33612345678');
    }
  };

  const toggleEditMode = async () => {
    const newEditMode = !isEditMode;
    setSelectedElement(null);
    setIsIframeReady(false);
    
    // Réinitialiser complètement avant de changer de mode
    setEditModeHtml(null);
    setIframeKey(prev => prev + 1);
    
    // Si on passe en mode édition, recharger le HTML depuis le serveur
    if (newEditMode && selectedWebsite?.id) {
      await loadEditModeHtml();
    }
    
    setIsEditMode(newEditMode);
  };

  const handleIframeLoad = () => {
    setIsIframeReady(true);
    extractPageMetaTags();
  };

  const extractPageMetaTags = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) return;

      // Extraire le title
      const titleTag = iframeDoc.querySelector('title');
      const extractedTitle = titleTag ? titleTag.textContent || '' : '';
      setPageTitle(extractedTitle);

      // Extraire meta description
      const metaDesc = iframeDoc.querySelector('meta[name="description"]');
      const extractedMetaDesc = metaDesc ? metaDesc.getAttribute('content') || '' : '';
      setMetaDescription(extractedMetaDesc);

      // Extraire meta image
      const metaImg = iframeDoc.querySelector('meta[name="image"]');
      const extractedMetaImg = metaImg ? metaImg.getAttribute('content') || '' : '';
      setMetaImage(extractedMetaImg);

      // Extraire OG title
      const ogTitleTag = iframeDoc.querySelector('meta[property="og:title"]');
      const extractedOgTitle = ogTitleTag ? ogTitleTag.getAttribute('content') || '' : '';
      setOgTitle(extractedOgTitle);

      // Extraire OG description
      const ogDescTag = iframeDoc.querySelector('meta[property="og:description"]');
      const extractedOgDesc = ogDescTag ? ogDescTag.getAttribute('content') || '' : '';
      setOgDescription(extractedOgDesc);

      // Extraire OG image
      const ogImgTag = iframeDoc.querySelector('meta[property="og:image"]');
      const extractedOgImg = ogImgTag ? ogImgTag.getAttribute('content') || '' : '';
      setOgImage(extractedOgImg);

      // Extraire le slug depuis currentPage
      setPageSlug(currentPage);

      // Extraire les schemas JSON-LD (schema.org)
      const schemaScripts = iframeDoc.querySelectorAll('script[type="application/ld+json"]');
      const extractedSchemas = [];
      schemaScripts.forEach((script) => {
        try {
          const schemaData = JSON.parse(script.textContent);
          extractedSchemas.push(schemaData);
        } catch (e) {
          console.error('Erreur lors du parsing du schema JSON-LD:', e);
        }
      });
      setSchemas(extractedSchemas);

      // Sauvegarder les valeurs initiales pour détecter les modifications
      const initialSettings = {
        pageTitle: extractedTitle,
        metaDescription: extractedMetaDesc,
        ogTitle: extractedOgTitle,
        ogDescription: extractedOgDesc,
        ogImage: extractedOgImg,
        metaImage: extractedMetaImg
      };
      setInitialPageSettings(initialSettings);
      setHasUnsavedChanges(false);

    } catch (error) {
      console.error('Erreur lors de l\'extraction des meta tags:', error);
    }
  };

  const handleSavePageSettings = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) return;

      // Mettre à jour le title
      let titleTag = iframeDoc.querySelector('title');
      if (titleTag) {
        titleTag.textContent = pageTitle;
      } else if (pageTitle) {
        titleTag = iframeDoc.createElement('title');
        titleTag.textContent = pageTitle;
        iframeDoc.head.appendChild(titleTag);
      }

      // Mettre à jour meta description
      let metaDesc = iframeDoc.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', metaDescription);
      } else if (metaDescription) {
        metaDesc = iframeDoc.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        metaDesc.setAttribute('content', metaDescription);
        iframeDoc.head.appendChild(metaDesc);
      }

      // Mettre à jour meta image
      let metaImg = iframeDoc.querySelector('meta[name="image"]');
      if (metaImg) {
        metaImg.setAttribute('content', metaImage);
      } else if (metaImage) {
        metaImg = iframeDoc.createElement('meta');
        metaImg.setAttribute('name', 'image');
        metaImg.setAttribute('content', metaImage);
        iframeDoc.head.appendChild(metaImg);
      }

      // Mettre à jour OG title
      let ogTitleTag = iframeDoc.querySelector('meta[property="og:title"]');
      if (ogTitleTag) {
        ogTitleTag.setAttribute('content', ogTitle);
      } else if (ogTitle) {
        ogTitleTag = iframeDoc.createElement('meta');
        ogTitleTag.setAttribute('property', 'og:title');
        ogTitleTag.setAttribute('content', ogTitle);
        iframeDoc.head.appendChild(ogTitleTag);
      }

      // Mettre à jour OG description
      let ogDescTag = iframeDoc.querySelector('meta[property="og:description"]');
      if (ogDescTag) {
        ogDescTag.setAttribute('content', ogDescription);
      } else if (ogDescription) {
        ogDescTag = iframeDoc.createElement('meta');
        ogDescTag.setAttribute('property', 'og:description');
        ogDescTag.setAttribute('content', ogDescription);
        iframeDoc.head.appendChild(ogDescTag);
      }

      // Mettre à jour OG image
      let ogImgTag = iframeDoc.querySelector('meta[property="og:image"]');
      if (ogImgTag) {
        ogImgTag.setAttribute('content', ogImage);
      } else if (ogImage) {
        ogImgTag = iframeDoc.createElement('meta');
        ogImgTag.setAttribute('property', 'og:image');
        ogImgTag.setAttribute('content', ogImage);
        iframeDoc.head.appendChild(ogImgTag);
      }

      
      // Réinitialiser le flag de modifications
      setHasUnsavedChanges(false);
      setInitialPageSettings({
        pageTitle,
        metaDescription,
        ogTitle,
        ogDescription,
        ogImage,
        metaImage
      });
      
      // Sauvegarder les modifications via l'API
      handleSave();
      
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des paramètres:', error);
    }
  };

  const handleClosePageSettings = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedChangesPopup(true);
      return;
    }
    // Réinitialiser les valeurs aux valeurs initiales même si pas de changements détectés
    setPageTitle(initialPageSettings.pageTitle || '');
    setMetaDescription(initialPageSettings.metaDescription || '');
    setOgTitle(initialPageSettings.ogTitle || '');
    setOgDescription(initialPageSettings.ogDescription || '');
    setOgImage(initialPageSettings.ogImage || '');
    setMetaImage(initialPageSettings.metaImage || '');
    setIsPageSettingsOpen(false);
    setHasUnsavedChanges(false);
  };

  const handleConfirmCloseWithoutSaving = () => {
    setShowUnsavedChangesPopup(false);
    setIsPageSettingsOpen(false);
    setHasUnsavedChanges(false);
    // Réinitialiser les valeurs aux valeurs initiales
    setPageTitle(initialPageSettings.pageTitle || '');
    setMetaDescription(initialPageSettings.metaDescription || '');
    setOgTitle(initialPageSettings.ogTitle || '');
    setOgDescription(initialPageSettings.ogDescription || '');
    setOgImage(initialPageSettings.ogImage || '');
    setMetaImage(initialPageSettings.metaImage || '');
  };

  const handleCancelClose = () => {
    setShowUnsavedChangesPopup(false);
  };

  const getPageDisplayName = (pageName) => {
    if (pageName === 'index.html') return 'home';
    return pageName.replace('.html', '');
  };

  const filteredPages = useMemo(() => {
    const q = pageSearch.trim().toLowerCase();
    let filtered = pages || [];
    
    if (q) {
      filtered = filtered.filter(page => {
        const pageName = (page || '').toLowerCase();
        const displayName = getPageDisplayName(page).toLowerCase();
        return pageName.includes(q) || displayName.includes(q);
      });
    }
    
    // Trier pour mettre index.html en premier
    return filtered.sort((a, b) => {
      if (a === 'index.html') return -1;
      if (b === 'index.html') return 1;
      return a.localeCompare(b);
    });
  }, [pages, pageSearch]);

  const handleOpenPageMenu = (event) => {
    event.stopPropagation();
    setOpenPageMenu(true);
    
    setTimeout(() => {
      if (pageSearchInputRef.current) {
        pageSearchInputRef.current.focus();
      }
    }, 100);
  };

  const handleClosePageMenu = () => {
    setOpenPageMenu(false);
    setPageSearch('');
  };

  const handlePageChange = async (pageName) => {
    setCurrentPage(pageName);
    setOpenPageMenu(false);
    
    // Sauvegarder la page sélectionnée dans localStorage
    if (selectedWebsite?.id) {
      localStorage.setItem(`wenoble_current_page_${selectedWebsite.id}`, pageName);
    }
    
    setSelectedElement(null);
    setIsIframeReady(false);
    
    // Réinitialiser complètement l'iframe et l'overlay
    setEditModeHtml(null);
    setIframeKey(prev => prev + 1);
    
    if (isEditMode) {
      await loadEditModeHtml(pageName);
    } else {
      setSiteUrl(`${config.apiUrl}/scraping/scraped/${selectedWebsite.id}/${pageName}`);
    }
    
    // Les meta tags seront extraits dans handleIframeLoad après le chargement
  };

  const debugIframe = () => {
    const iframe = iframeRef.current;
    if (!iframe) {
      return;
    }

    try {
      const iframeDoc = iframe.contentDocument;
      const iframeWin = iframe.contentWindow;
      

      
      if (iframeDoc) {
        const baseTag = iframeDoc.querySelector('base');
        
        const scripts = iframeDoc.querySelectorAll('script');
        
        let inlineScripts = 0;
        let externalScripts = 0;
        let disabledScripts = 0;
        
        scripts.forEach(s => {
          if (!s.src) inlineScripts++;
          else externalScripts++;
          if (s.type === 'text/plain') disabledScripts++;
        });
        
        
        
        if (iframeWin) {
          if (iframeWin.Webflow && iframeWin.Webflow.require) {
            try {
              const ix2 = iframeWin.Webflow.require('ix2');
            } catch(e) {
            }
          }
        }
        
        const fonts = iframeDoc.querySelectorAll('link[rel="preconnect"], link[href*="fonts"]');
      }
    } catch(e) {
      console.error('Erreur debug iframe:', e);
    }
  };

  const handleSave = async () => {
    const iframe = iframeRef.current;
    if (!iframe || elementEdits.length === 0) {
      return;
    }

    try {
      setIsSaving(true);
      
      // Filtrer pour ne garder que la dernière édition de chaque élément
      // Utiliser un Map pour automatiquement écraser les doublons
      const uniqueEditsMap = new Map();
      elementEdits.forEach(edit => {
        uniqueEditsMap.set(edit.elementPath, edit);
      });
      
      // Convertir le Map en array
      const uniqueEdits = Array.from(uniqueEditsMap.values());
      
      console.log(`Envoi de ${uniqueEdits.length} édition(s) unique(s) sur ${elementEdits.length} total`);
      
      // Envoyer les éditions à l'API
      const response = await fetch(`${config.apiUrl}/websites/${selectedWebsite.id}/edits/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          edits: uniqueEdits.map(edit => ({
            pagePath: currentPage,
            elementPath: edit.elementPath,
            editType: edit.type,
            value: edit.value
          }))
        })
      });

      // Vérifier si la réponse est OK
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorMessage = `Erreur ${response.status}: ${response.statusText}`;
        
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } else {
          // Si ce n'est pas du JSON, lire le texte
          const errorText = await response.text();
          console.error('Réponse non-JSON:', errorText);
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (data.success) {
        // Vider les éditions en cours après sauvegarde
        setElementEdits([]);
        if (onSave) {
          onSave(data);
        }
      } else {
        throw new Error(data.error || 'Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Afficher un loader ou message si le site n'est pas encore scrapé
  if (!isScraped) {
    return (
      <div className="static-editor">
        <div className="static-editor-empty">
          <h2>Importer votre site Webflow</h2>
          <p>Cliquez sur le bouton ci-dessous pour importer votre site depuis l'URL de preview configurée.</p>
          {error && <div className="error-message">{error}</div>}
          <DefaultButton
            onClick={handleScrapeSite}
            disabled={isLoading}
          >
            {isLoading ? 'Importation en cours...' : 'Importer le site'}
          </DefaultButton>
        </div>
      </div>
    );
  }

  return (
    <div className="static-editor">
      <div className="static-editor-toolbar">
        <div className='static-edito-action-wrapper is-left'>
          <SmallIconButton
            onClick={handleRescrape}
            disabled={isLoading}
            title="Réimporter le site depuis Webflow"
          >
            <PiArrowSquareIn/> 
          </SmallIconButton>
          
          {isEditMode && (
            <SmallIconButton
              className={isPageSettingsOpen ? 'active' : ''}
              onClick={() => setIsPageSettingsOpen(!isPageSettingsOpen)}
              title="Paramètres de la page"
            >
              <PiFile />
            </SmallIconButton>
          )}
        </div>
        <div className='static-edito-action-wrapper is-center'>
          <div className='static-editor-size-wrapper'>
            <SmallIconButton
              onClick={() => width.set(1920)}
              title="Desktop (1920px)"
            >
              <PiDesktop />
            </SmallIconButton>
            <SmallIconButton
              onClick={() => width.set(991)}
              title="Tablette (991px)"
            >
              <PiDeviceTablet />
            </SmallIconButton>
            <SmallIconButton
              onClick={() => width.set(767)}
              title="Phone paysage (767px)"
            >
              <PiDeviceMobile style={{ transform: "rotate(90deg)" }}/>
            </SmallIconButton>
            <SmallIconButton
              onClick={() => width.set(479)}
              title="Phone (479px)"
            >
              <PiDeviceMobile />
            </SmallIconButton>
            <div style={{ 
                  padding: '0.05rem 0.5rem', 
                  fontSize: '0.8rem',
                  color: 'var(--color-text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  width: '4rem'
                }}>
                  {Math.round(iframeWidth)}px
            </div>
          </div>

          <div className='static-editor-option-line'></div>

          {/* Menu sélecteur de page */}
          {pages.length > 0 && (
            <>
              <IconButton 
                onClick={handleOpenPageMenu} 
                ref={pageMenuRef}
                sx={{ 
                  color: theme.palette.text.primary,
                  padding: '0.4rem 0.8rem !important',
                  fontSize: '0.9rem',
                  borderRadius: '4px',
                  backgroundColor: theme.palette.primary.main,
                  display: 'flex',
                  gap: '0.5rem',
                  '&:hover': {
                    backgroundColor: theme.palette.primary.second
                  }
                }}
              >
                <PiFile />
                <span style={{ fontSize: '0.9rem' }}>
                  {getPageDisplayName(currentPage)}
                </span>
                <PiCaretUpDownLight />
              </IconButton>
              
              <ClickAwayListener onClickAway={handleClosePageMenu}>
                <Popper 
                  open={openPageMenu} 
                  anchorEl={pageMenuRef.current} 
                  transition 
                  placement="bottom-start" 
                  style={{zIndex: 120}}
                >
                  {({ TransitionProps }) => (
                    <Grow {...TransitionProps} timeout={350}>
                      <div className='dashboard_case_empty user_menu_case' style={{
                        backgroundColor: theme.palette.primary.main,
                        minWidth: '250px',
                        maxHeight: '450px',
                        overflowY: 'auto'
                      }}>
                        <div className='user_menu_header'>
                          <div className='user_info_section'>
                            <div className='user_profile_info'>
                              <div className='user_details'>
                                <div className='user_name_large' style={{ color: theme.palette.text.primary }}>
                                  <b>Pages du site</b>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <SimpleSearchField
                          theme={theme}
                          placeholder="Rechercher une page..."
                          value={pageSearch}
                          onChange={(e) => setPageSearch(e.target.value)}
                          inputRef={pageSearchInputRef}
                          style={{ width: '100%' }}
                        />
                        
                        <div className="line_horizontal" style={{ backgroundColor: theme.palette.primary.third }}></div>

                        <div className='user_menu_actions'>
                          {filteredPages.length === 0 ? (
                            <div className='user_action_item' style={{ color: theme.palette.text.secondary }}>
                              Aucune page trouvée
                            </div>
                          ) : (
                            filteredPages.map((page) => (
                            <div
                              key={page}
                              className={`user_action_item ${currentPage === page ? 'selected' : ''}`}
                              onClick={() => handlePageChange(page)}
                              style={{ color: theme.palette.text.primary }}
                            >
                              <PiFile className='action_icon' />
                              <span>{getPageDisplayName(page)}</span>
                            </div>
                            ))
                          )}
                        </div>
                      </div>
                    </Grow>
                  )}
                </Popper>
              </ClickAwayListener>
            </>
          )}

        </div>
        <div className='static-edito-action-wrapper is-right'>
          <SmallIconButton
            className={isEditMode ? 'active' : ''}
            onClick={toggleEditMode}
          >
          
            {isEditMode ? <PiEye /> : <PiPencilSimple />}          
          </SmallIconButton>
          {isEditMode && (
            <>
              
              <DefaultButton
                onClick={handleSave}
                disabled={isSaving || elementEdits.length === 0}
              >
                {isSaving ? 'Sauvegarde...' : `Enregistrer`}
              </DefaultButton>
            </>
          )}
        </div>
      </div>
      
      <div className="static-editor-content" onClick={() => {
        if (openPageMenu) {
          setOpenPageMenu(false);
          setPageSearch('');
        }
        // Ne pas fermer la sidebar si la popup est déjà ouverte
        if (isPageSettingsOpen && !showUnsavedChangesPopup) {
          handleClosePageSettings();
        }
      }}>
        {isEditMode && editModeHtml ? (
          <>
            {/* Sidebar des paramètres de page */}
            {isPageSettingsOpen && (
              <ClickAwayListener onClickAway={() => {
                // Ne pas fermer si la popup est ouverte
                if (!showUnsavedChangesPopup) {
                  handleClosePageSettings();
                }
              }}>
                <div className="static-editor-sidebar is-left" onClick={(e) => e.stopPropagation()}>
                  <div className="sidebar-section">
                    <div className="sidebar-header">
                      <p style={{fontWeight: '600'}}>Paramètres de la page</p>
                      <DefaultButton
                        onClick={handleSavePageSettings}
                      >
                        Enregistrer
                      </DefaultButton>
                    </div>
                  
                  <div className='sidebar-editor-box'>
                    <h4>URL</h4>
                    <div>
                      <p className="sidebar-label">Slug de la page</p>
                      <p className="sidebar-value">{pageSlug || 'index.html'}</p>
                    </div>
                  </div>

                  <div className='sidebar-line'></div>

                  <div className='sidebar-editor-box'>
                    <h4>SEO</h4>
                    <div>
                      <p className="sidebar-label">Title tag</p>
                      <input
                        className="input_text_blog is-small"
                        type="text"
                        value={pageTitle}
                        onChange={(e) => setPageTitle(e.target.value)}
                        placeholder="Titre de la page"
                      />
                    </div>
                    <div style={{ marginTop: '1rem' }}>
                      <p className="sidebar-label">Meta description</p>
                      <textarea
                        className="input_text_blog"
                        value={metaDescription}
                        onChange={(e) => setMetaDescription(e.target.value)}
                        placeholder="Description pour les moteurs de recherche"
                        rows={3}
                      />
                    </div>
                    <div style={{ marginTop: '1rem' }}>
                      <p className="sidebar-label">Meta image</p>
                      <input
                        className="input_text_blog is-small"
                        type="text"
                        value={metaImage}
                        onChange={(e) => setMetaImage(e.target.value)}
                        placeholder="URL de l'image"
                      />
                    </div>
                    
                    {/* Google Preview */}
                    <div style={{ marginTop: '1.5rem' }}>
                      <p className="sidebar-label" style={{ marginBottom: '0.5rem' }}>Aperçu Google</p>
                      <div className="google-preview">
                        <div className="google-preview-title">
                          {pageTitle || 'Titre de la page'}
                        </div>
                        <div className="google-preview-url">
                          {selectedWebsite?.domainName ? 
                            `${selectedWebsite.domainName}${pageSlug && pageSlug !== 'index.html' ? '/' + pageSlug.replace('.html', '') : ''}` 
                            : 'votre-site.com'
                          }
                        </div>
                        <div className="google-preview-description">
                          {metaDescription || 'La description de votre page apparaîtra ici. Elle aide les utilisateurs à comprendre le contenu de votre page.'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className='sidebar-line'></div>

                  <div className='sidebar-editor-box'>
                    <h4>Open Graph</h4>
                    <div>
                      <p className="sidebar-label">OG Title</p>
                      <input
                        className="input_text_blog is-small"
                        type="text"
                        value={ogTitle}
                        onChange={(e) => setOgTitle(e.target.value)}
                        placeholder="Titre pour les réseaux sociaux"
                      />
                    </div>
                    <div style={{ marginTop: '1rem' }}>
                      <p className="sidebar-label">OG Description</p>
                      <textarea
                        className="input_text_blog"
                        value={ogDescription}
                        onChange={(e) => setOgDescription(e.target.value)}
                        placeholder="Description pour les réseaux sociaux"
                        rows={3}
                      />
                    </div>
                    <div style={{ marginTop: '1rem' }}>
                      <p className="sidebar-label">OG Image</p>
                      <input
                        className="input_text_blog is-small"
                        type="text"
                        value={ogImage}
                        onChange={(e) => setOgImage(e.target.value)}
                        placeholder="URL de l'image"
                      />
                    </div>
                  </div>
                  
                  <div className='sidebar-line'></div>
                  
                  <div className='sidebar-editor-box'>
                    <h4>Schema.org (JSON-LD)</h4>
                    {schemas.length > 0 ? (
                      <>
                        <p className="sidebar-label" style={{ marginBottom: '0.5rem' }}>
                          {schemas.length} schema{schemas.length > 1 ? 's' : ''} détecté{schemas.length > 1 ? 's' : ''}
                        </p>
                        {schemas.map((schema, index) => (
                          <div key={index} className="schema-preview">
                            <div className="schema-type">
                              {Array.isArray(schema['@type']) 
                                ? schema['@type'].join(', ') 
                                : schema['@type'] || 'Non spécifié'}
                            </div>
                            {schema.name && (
                              <div className="schema-name">{schema.name}</div>
                            )}
                            <details className="schema-details" open>
                              <summary>Voir/Modifier le JSON</summary>
                              <textarea
                                className="schema-json-editor"
                                value={JSON.stringify(schema, null, 2)}
                                readOnly
                                rows={10}
                              />
                            </details>
                          </div>
                        ))}
                      </>
                    ) : (
                      <>
                        <p className="sidebar-label" style={{ marginBottom: '0.5rem' }}>
                          Aucun schema détecté
                        </p>
                        <div className="schema-preview">
                          <p className="sidebar-label" style={{ marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                            Ajoutez un schema JSON-LD :
                          </p>
                          <textarea
                            className="schema-json-editor"
                            placeholder={`{\n  "@context": "https://schema.org",\n  "@type": "Organization",\n  "name": "Votre entreprise",\n  "url": "https://votre-site.com"\n}`}
                            rows={10}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
                </div>
              </ClickAwayListener>
            )}

            <div className="canvas-viewport" ref={viewportRef}>
              <motion.div 
                className="iframe-container"
                style={{ width, height: '100%', position: 'relative' }}
              >
                {/* Loader pendant le chargement */}
                {(isLoadingEdits || !isIframeReady) && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: theme.palette.primary.main,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    flexDirection: 'column',
                    gap: '1rem'
                  }}>
                    <CircularProgress style={{ color: theme.palette.text.primary }} />
                    <p style={{ color: theme.palette.text.secondary }}>
                      {!isIframeReady ? 'Chargement de la page...' : 'Application des modifications...'}
                    </p>
                  </div>
                )}
                
                <iframe
                  key={`iframe-edit-${iframeKey}`}
                  ref={iframeRef}
                  srcDoc={editModeHtml}
                  className="static-editor-iframe"
                  title="Site Preview"
                  sandbox="allow-same-origin allow-scripts"
                  style={{ 
                    pointerEvents: isDragging ? 'none' : 'auto',
                    opacity: (isLoadingEdits || !isIframeReady) ? 0 : 1,
                    transition: 'opacity 0.3s ease-in-out'
                  }}
                  onLoad={handleIframeLoad}
                />
                {isIframeReady && !isLoadingEdits && (
                  <OverlaySystem
                    key={`overlay-${iframeKey}`}
                    iframeRef={iframeRef}
                    selectedElement={selectedElement}
                    onElementHover={handleElementHover}
                    onElementSelect={handleElementSelect}
                  />
                )}
                <motion.div 
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0}
                  dragMomentum={false}
                  onDragStart={() => {
                    setIsDragging(true);
                  }}
                  onDrag={(event, info) => {
                    const currentWidth = width.get();
                    const newWidth = currentWidth + info.delta.x;
                    
                    // Obtenir la largeur du viewport parent
                    const viewportWidth = viewportRef.current?.clientWidth || 2400;
                    
                    const clampedWidth = Math.max(200, Math.min(viewportWidth, newWidth));
                    width.set(clampedWidth);
                  }}
                  onDragEnd={() => {
                    setIsDragging(false);
                  }}
                  className='static-editor-bar'
                >
                </motion.div>
              </motion.div>
            </div>
            
            <div className="static-editor-sidebar">
              {selectedElement ? (
                <div className="sidebar-section">
                  <h3>
                    <span className='sidebar-type'>{selectedElement.element.tagName.toLowerCase()} </span>
                    {selectedElement.element.textContent?.trim() || 'Aucun texte'}
                  </h3>                  
                  {selectedElement.type === 'text' && (
                    <div className='sidebar-editor-box'>
                      <h4>Contenu</h4>
                      <div>
                        <p className="sidebar-label">Texte</p>
                        <textarea
                          className="input_text_blog"
                          value={editedText}
                          onChange={(e) => handleTextChange(e.target.value)}
                          placeholder="Entrez le texte..."
                          rows={6}
                        />
                      </div>

                      <div className='sidebar-line'></div>

                      <h4>Style</h4>

                      {/* Style Controls */}
                      <div className="style-controls">
                        {/* Font Weight */}
                        <div className="style-control-group">
                          <p className="sidebar-label">Épaisseur</p>
                          <select 
                            className="input_text_blog is-small"
                            
                            value={fontWeight}
                            onChange={(e) => handleStyleChange('fontWeight', e.target.value)}
                          >
                            <option value="100">Thin (100)</option>
                            <option value="200">Extra Light (200)</option>
                            <option value="300">Light (300)</option>
                            <option value="400">Normal (400)</option>
                            <option value="500">Medium (500)</option>
                            <option value="600">Semi Bold (600)</option>
                            <option value="700">Bold (700)</option>
                            <option value="800">Extra Bold (800)</option>
                            <option value="900">Black (900)</option>
                          </select>
                        </div>

                        {/* Font Size and Line Height */}
                        <div className="style-control-row">
                          <div className="style-control-group">
                            <p className="sidebar-label">Taille (px)</p>
                            <input
                              className="input_text_blog is-small"
                              type="number"
                              value={fontSize}
                              onChange={(e) => handleStyleChange('fontSize', e.target.value)}
                              min="8"
                              max="200"
                            />
                          </div>
                          <div className="style-control-group">
                            <p className="sidebar-label">Hauteur ligne</p>
                            <input
                              className="input_text_blog is-small"
                              type="number"
                              value={lineHeight}
                              onChange={(e) => handleStyleChange('lineHeight', e.target.value)}
                              min="0.5"
                              max="5"
                              step="0.1"
                            />
                          </div>
                        </div>

                        {/* Text Align */}
                        <div className="style-control-group">
                          <p className="sidebar-label">Alignement</p>
                          <div className="button-group">
                            <button
                              className={`style-toggle-button ${textAlign === 'left' ? 'active' : ''}`}
                              onClick={() => handleStyleChange('textAlign', 'left')}
                              title="Aligner à gauche"
                            >
                              <PiTextAlignLeft/>
                            </button>
                            <button
                              className={`style-toggle-button ${textAlign === 'center' ? 'active' : ''}`}
                              onClick={() => handleStyleChange('textAlign', 'center')}
                              title="Centrer"
                            >
                              <PiTextAlignCenter/>
                            </button>
                            <button
                              className={`style-toggle-button ${textAlign === 'right' ? 'active' : ''}`}
                              onClick={() => handleStyleChange('textAlign', 'right')}
                              title="Aligner à droite"
                            >
                              <PiTextAlignRight/>
                            </button>
                            <button
                              className={`style-toggle-button ${textAlign === 'justify' ? 'active' : ''}`}
                              onClick={() => handleStyleChange('textAlign', 'justify')}
                              title="Justifier"
                            >
                              <PiTextAlignJustify/>
                            </button>
                          </div>
                        </div>

                        {/* Text Decoration */}
                        <div className="style-control-group">
                          <p className="sidebar-label">Décoration</p>
                          <div className="button-group">
                            <button
                              className={`style-toggle-button ${textDecoration === 'none' ? 'active' : ''}`}
                              onClick={() => handleStyleChange('textDecoration', 'none')}
                              title="Aucune"
                            >
                              —
                            </button>
                            <button
                              className={`style-toggle-button ${textDecoration === 'underline' ? 'active' : ''}`}
                              onClick={() => handleStyleChange('textDecoration', 'underline')}
                              title="Souligné"
                            >
                              <PiTextUnderline/>
                            </button>
                            <button
                              className={`style-toggle-button ${textDecoration === 'line-through' ? 'active' : ''}`}
                              onClick={() => handleStyleChange('textDecoration', 'line-through')}
                              title="Barré"
                            >
                              <PiTextStrikethrough/>
                            </button>
                            <button
                              className={`style-toggle-button ${textDecoration === 'overline' ? 'active' : ''}`}
                              onClick={() => handleStyleChange('textDecoration', 'overline')}
                              title="Au-dessus"
                            >
                              <span style={{ textDecoration: 'overline' }}>O</span>
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Section Lien - seulement pour les balises <a> */}
                      {selectedElement.element.tagName.toLowerCase() === 'a' && (
                        <>
                          <div className='sidebar-line'></div>
                          
                          <h4>Lien</h4>
                          
                          <div className="style-controls">
                            <div className="style-control-group">
                              <p className="sidebar-label">Type de lien</p>
                              <div className="button-group">
                                <button
                                  className={`style-toggle-button ${linkType === 'internal' ? 'active' : ''}`}
                                  onClick={() => handleLinkTypeChange('internal')}
                                  title="Page interne"
                                >
                                  <PiFile  />
                                </button>
                                <button
                                  className={`style-toggle-button ${linkType === 'external' ? 'active' : ''}`}
                                  onClick={() => handleLinkTypeChange('external')}
                                  title="Lien externe"
                                >
                                  <PiLinkSimple/>
                                </button>
                                <button
                                  className={`style-toggle-button ${linkType === 'mail' ? 'active' : ''}`}
                                  onClick={() => handleLinkTypeChange('mail')}
                                  title="Adresse email"
                                >
                                  <PiEnvelope/>
                                </button>
                                <button
                                  className={`style-toggle-button ${linkType === 'tel' ? 'active' : ''}`}
                                  onClick={() => handleLinkTypeChange('tel')}
                                  title="Numéro de téléphone"
                                >
                                  <PiPhone/>
                                </button>
                              </div>
                            </div>
                            
                            {linkType === 'external' ? (
                              <div className="style-control-group">
                                <p className="sidebar-label">URL externe</p>
                                <input
                                  className="input_text_blog is-small"
                                  type="text"
                                  value={linkUrl}
                                  onChange={(e) => handleLinkChange(e.target.value)}
                                  placeholder="https://example.com"
                                />
                              </div>
                            ) : linkType === 'mail' ? (
                              <div className="style-control-group">
                                <p className="sidebar-label">Adresse email</p>
                                <input
                                  className="input_text_blog is-small"
                                  type="email"
                                  value={linkUrl}
                                  onChange={(e) => handleLinkChange(e.target.value)}
                                  placeholder="exemple@email.com"
                                />
                              </div>
                            ) : linkType === 'tel' ? (
                              <div className="style-control-group">
                                <p className="sidebar-label">Numéro de téléphone</p>
                                <input
                                  className="input_text_blog is-small"
                                  type="tel"
                                  value={linkUrl}
                                  onChange={(e) => handleLinkChange(e.target.value)}
                                  placeholder="+33612345678"
                                />
                              </div>
                            ) : (
                              <div className="style-control-group">
                                <p className="sidebar-label">Page de destination</p>
                                <select 
                                  className="input_text_blog is-small"
                                  value={linkUrl}
                                  onChange={(e) => handleLinkChange(e.target.value)}
                                >
                                  {/* Option pour le lien actuel s'il ne correspond à aucune page */}
                                  {linkUrl && !pages.some(page => {
                                    const pageUrl = page === 'index.html' ? '/' : '/' + page.replace('.html', '');
                                    return pageUrl === linkUrl;
                                  }) && (
                                    <option value={linkUrl}>
                                      {linkUrl} (lien actuel)
                                    </option>
                                  )}
                                  {pages.map((page) => {
                                    const pageUrl = page === 'index.html' ? '/' : '/' + page.replace('.html', '');
                                    const displayName = getPageDisplayName(page);
                                    return (
                                      <option key={page} value={pageUrl}>
                                        {displayName}
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  
                  {selectedElement.type === 'image' && (
                    <div className='sidebar-editor-box'>
                      <h4>Image</h4>
                      <div className="sidebar-image-container" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                        <img 
                          className='Image_uploaded' 
                          src={selectedElement.element.src} 
                          alt={selectedElement.element.alt || ''} 
                          style={{ 
                            width: '100%', 
                            borderRadius: '0.5rem',
                            marginBottom: '1rem'
                          }}
                        />
                        <div className='sidebar-image-info-container' style={{ width: '100%' }}>
                          <div>
                            <p className='sidebar-label'>Texte alternatif (alt)</p>
                            <input
                              className="input_text_blog is-small"
                              type="text"
                              value={selectedElement.element.alt || ''}
                              onChange={(e) => {
                                selectedElement.element.alt = e.target.value;
                                setSelectedElement({...selectedElement});
                                
                                // Tracker l'édition d'alt avec la fonction utilitaire
                                updateElementEdit(selectedElement.element, 'image', selectedElement.element.outerHTML);
                              }}
                              placeholder="Description de l'image"
                            />
                          </div>
                          
                          <div className='flex_contain flex_image' style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
                              {selectedElement.element.naturalWidth && selectedElement.element.naturalHeight 
                                ? `${selectedElement.element.naturalWidth} × ${selectedElement.element.naturalHeight}` 
                                : 'Chargement...'}
                            </p>
                            <a 
                              href={selectedElement.element.src} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{ 
                                color: 'var(--color-text-primary)',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              <OpenInNewOutlinedIcon style={{ color: 'var(--color-text-secondary)' }} fontSize='small' />
                            </a>
                          </div>
                          
                          <div className='button_contain' style={{ marginTop: '1rem' }}>
                            <input 
                              className='input_image_blog' 
                              type="file" 
                              id="image-file-input" 
                              accept=".jpeg,.jpg,.png,.webp,.avif,.gif,.svg"
                              style={{ display: 'none' }}
                              onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (event) => {
                                    const newImageSrc = event.target.result;
                                    selectedElement.element.src = newImageSrc;
                                    
                                    // Tracker l'édition d'image avec la fonction utilitaire
                                    updateElementEdit(selectedElement.element, 'image', newImageSrc);
                                    
                                    // Forcer le rechargement de l'image pour obtenir les nouvelles dimensions
                                    const img = new Image();
                                    img.onload = () => {
                                      selectedElement.element.naturalWidth = img.naturalWidth;
                                      selectedElement.element.naturalHeight = img.naturalHeight;
                                      setSelectedElement({...selectedElement});
                                    };
                                    img.src = newImageSrc;
                                  };
                                  reader.readAsDataURL(file);
                                }
                                // Réinitialiser l'input pour permettre de sélectionner le même fichier à nouveau
                                e.target.value = '';
                              }}
                            />
                            <SecondaryButton 
                              className="button_image_blog" 
                              type="button"
                              onClick={() => document.getElementById('image-file-input').click()}
                            >
                              Remplacer
                            </SecondaryButton>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="sidebar-empty">
                  <PiCursorClickThin  fontSize={"3rem"}/>
                  <p>Cliquez sur un élément de la page pour le modifier</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            {/* Loader pendant le chargement */}
            {(isLoadingEdits || !isIframeReady) && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: theme.palette.primary.main,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                flexDirection: 'column',
                gap: '1rem'
              }}>
                <CircularProgress style={{ color: theme.palette.text.primary }} />
                <p style={{ color: theme.palette.text.secondary }}>
                  {!isIframeReady ? 'Chargement de la page...' : 'Application des modifications...'}
                </p>
              </div>
            )}
            
            <iframe
              key={`iframe-preview-${iframeKey}`}
              ref={iframeRef}
              src={siteUrl}
              className="static-editor-iframe"
              title="Site Preview"
              sandbox="allow-same-origin allow-scripts"
              style={{ 
                opacity: (isLoadingEdits || !isIframeReady) ? 0 : 1,
                transition: 'opacity 0.3s ease-in-out'
              }}
              onLoad={handleIframeLoad}
            />
          </div>
        )}
      </div>

      {/* Popup de confirmation pour les modifications non sauvegardées */}
      {showUnsavedChangesPopup && (
        <div className="unsaved-changes-overlay" onClick={(e) => {
          // Fermer la popup si on clique sur l'overlay
          if (e.target === e.currentTarget) {
            handleCancelClose();
          }
        }}>
          <div className="unsaved-changes-popup" onClick={(e) => e.stopPropagation()}>
            <h3>Modifications non sauvegardées</h3>
            <p>Vous avez des modifications non sauvegardées. Voulez-vous vraiment fermer sans enregistrer ?</p>
            <div className="unsaved-changes-actions">
              <SecondaryButton onClick={(e) => {
                e.stopPropagation();
                handleCancelClose();
              }}>
                Annuler
              </SecondaryButton>
              <DefaultButton 
                onClick={(e) => {
                  e.stopPropagation();
                  handleConfirmCloseWithoutSaving();
                }}
                style={{ backgroundColor: 'var(--color-error)', borderColor: 'var(--color-error)' }}
              >
                Fermer sans enregistrer
              </DefaultButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaticEditor;
