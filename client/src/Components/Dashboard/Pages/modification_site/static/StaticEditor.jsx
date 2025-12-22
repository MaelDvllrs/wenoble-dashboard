import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Cookies from 'js-cookie';
import config from '../../../../../config';
import { checkScrapingStatus as checkStatus, scrapeSite, rescrapeSite, saveSiteModifications } from './apiScraping';
import './StaticEditor.css';
import { useWebsite } from '../../../../../Context/WebsiteContext';
import { DefaultButton, SecondaryButton, SmallIconButton, SimpleSearchField } from '../../../../../Theme/element';
import { motion, useMotionValue, useMotionValueEvent } from 'framer-motion';
import OverlaySystem from './OverlaySystem';
import { PiArrowSquareIn, PiEye, PiPencilSimple, PiDesktop, PiDeviceTablet, PiDeviceMobile, PiFile, PiCaretUpDownLight, PiPencilSimpleLight, PiTextAlignLeft, PiTextAlignCenter, PiTextAlignRight, PiTextAlignJustify, PiTextUnderline, PiTextStrikethrough } from "react-icons/pi";
import { Popper, Grow, ClickAwayListener, IconButton } from '@mui/material';
import { useTheme } from '@mui/material/styles';


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
  }, [selectedWebsite?.id]);

  // Écouter les clics sur l'iframe pour fermer le menu des pages
  useEffect(() => {
    if (!openPageMenu || !iframeRef.current) {
      console.log('useEffect iframe click: menu closed or iframe not ready', { openPageMenu, hasIframe: !!iframeRef.current });
      return;
    }

    const handleIframeClick = () => {
      console.log('Click detected inside iframe, closing menu');
      setOpenPageMenu(false);
      setPageSearch('');
    };

    const iframe = iframeRef.current;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    
    if (iframeDoc) {
      console.log('Adding click listener to iframe document');
      iframeDoc.addEventListener('click', handleIframeClick, true);
      return () => {
        console.log('Removing click listener from iframe document');
        iframeDoc.removeEventListener('click', handleIframeClick, true);
      };
    } else {
      console.log('Could not access iframe document');
    }
  }, [openPageMenu, isIframeReady]);

  // Écouter les messages de console de l'iframe
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.type === 'console') {
        const { level, args } = event.data;
        const prefix = '[IFRAME] ';
        
        switch(level) {
          case 'log':
            console.log(prefix, ...args);
            break;
          case 'error':
            console.error(prefix, ...args);
            break;
          case 'warn':
            console.warn(prefix, ...args);
            break;
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

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
      } catch (error) {
        console.error('Erreur d\'accès à l\'iframe:', error);
      }
    }
  }, [editModeHtml, isEditMode, isIframeReady]);

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

  const handleElementSelect = (element, type) => {
    if (!element) {
      setSelectedElement(null);
      selectedElementRef.current = null;
      setEditedText('');
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
    } else {
      setEditedText('');
    }
    
    const newSelection = { element, type };
    setSelectedElement(newSelection);
    selectedElementRef.current = newSelection;
  };

  const handleElementHover = (element) => {
    setHoveredElement(element);
  };

  const handleTextChange = (newText) => {
    setEditedText(newText);
    
    // Mettre à jour le texte dans l'iframe en temps réel
    if (selectedElement && selectedElement.type === 'text') {
      selectedElement.element.textContent = newText;
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
      
      alert('Modifications appliquées !');
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
      console.log("rechargement")
      await loadEditModeHtml();
    }
    
    setIsEditMode(newEditMode);
  };

  const handleIframeLoad = () => {
    console.log('Iframe loaded, setting ready to true');
    setIsIframeReady(true);
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
  };

  const debugIframe = () => {
    const iframe = iframeRef.current;
    if (!iframe) {
      console.log('Iframe non disponible');
      return;
    }

    try {
      const iframeDoc = iframe.contentDocument;
      const iframeWin = iframe.contentWindow;
      
      console.log('=== DEBUG IFRAME ===');
      console.log('Document:', iframeDoc ? 'OK' : 'Non accessible');
      console.log('Window:', iframeWin ? 'OK' : 'Non accessible');
      
      if (iframeDoc) {
        const baseTag = iframeDoc.querySelector('base');
        console.log('Balise base:', baseTag ? baseTag.href : 'Absente');
        
        const scripts = iframeDoc.querySelectorAll('script');
        console.log('Nombre de scripts:', scripts.length);
        
        let inlineScripts = 0;
        let externalScripts = 0;
        let disabledScripts = 0;
        
        scripts.forEach(s => {
          if (!s.src) inlineScripts++;
          else externalScripts++;
          if (s.type === 'text/plain') disabledScripts++;
        });
        
        
        
        if (iframeWin) {
          console.log('window.Webflow:', iframeWin.Webflow ? 'Présent' : 'Absent');
          if (iframeWin.Webflow && iframeWin.Webflow.require) {
            try {
              const ix2 = iframeWin.Webflow.require('ix2');
            } catch(e) {
            }
          }
        }
        
        const fonts = iframeDoc.querySelectorAll('link[rel="preconnect"], link[href*="fonts"]');
        console.log('Liens de fonts:', fonts.length);
      }
    } catch(e) {
      console.error('Erreur debug iframe:', e);
    }
  };

  const handleSave = async () => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    try {
      const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
      const htmlContent = iframeDocument.documentElement.outerHTML;
      
      // Sauvegarder via l'API
      const data = await saveSiteModifications(selectedWebsite.id, htmlContent, token);

      if (data.success) {
        alert('Modifications sauvegardées avec succès !');
        if (onSave) {
          onSave(htmlContent);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde');
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
              >
                Enregistrer
              </DefaultButton>
            </>
          )}
        </div>
      </div>
      
      <div className="static-editor-content" onClick={() => {
        console.log('Click on editor content, menu open:', openPageMenu);
        if (openPageMenu) {
          console.log('Closing page menu');
          setOpenPageMenu(false);
          setPageSearch('');
        }
      }}>
        {isEditMode && editModeHtml ? (
          <>
            <div className="canvas-viewport" ref={viewportRef}>
              <motion.div 
                className="iframe-container"
                style={{ width, height: '100%', position: 'relative' }}
              >
                <iframe
                  key={`iframe-edit-${iframeKey}`}
                  ref={iframeRef}
                  srcDoc={editModeHtml}
                  className="static-editor-iframe"
                  title="Site Preview"
                  sandbox="allow-same-origin allow-scripts"
                  style={{ pointerEvents: isDragging ? 'none' : 'auto' }}
                  onLoad={handleIframeLoad}
                />
                {isIframeReady && (
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
                      
                      <DefaultButton
                        className="sidebar-button"
                        onClick={handleApplyChanges}
                      >
                        Appliquer les modifications
                      </DefaultButton>
                    </div>
                  )}
                  
                  {selectedElement.type === 'image' && (
                    <>
                      <div>
                        <label className="sidebar-label">URL de l'image</label>
                        <input
                          className="sidebar-input"
                          type="text"
                          placeholder="https://..."
                        />
                      </div>
                      <button className="sidebar-button">
                        Modifier l'image
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="sidebar-empty">
                  <PiPencilSimpleLight fontSize={"3rem"}/>
                  <p>Cliquez sur un élément de la page pour le modifier</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <iframe
            key={`iframe-preview-${iframeKey}`}
            ref={iframeRef}
            src={siteUrl}
            className="static-editor-iframe"
            title="Site Preview"
            sandbox="allow-same-origin allow-scripts"
            onLoad={handleIframeLoad}
          />
        )}
      </div>
    </div>
  );
};

export default StaticEditor;
