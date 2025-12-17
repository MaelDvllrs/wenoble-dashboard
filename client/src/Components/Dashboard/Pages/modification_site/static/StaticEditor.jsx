import React, { useState, useRef, useEffect, useCallback } from 'react';
import Cookies from 'js-cookie';
import config from '../../../../../config';
import { checkScrapingStatus as checkStatus, scrapeSite, rescrapeSite, saveSiteModifications } from './apiScraping';
import './StaticEditor.css';
import { useWebsite } from '../../../../../Context/WebsiteContext';
import { DefaultButton, SecondaryButton } from '../../../../../Theme/element';
import { motion, useMotionValue, useMotionValueEvent } from 'framer-motion';
import OverlaySystem from './OverlaySystem';


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
        await loadEditModeHtml();
      }
    } catch (error) {
      console.error('Erreur lors de la vérification du statut:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadEditModeHtml = async () => {
    if (!selectedWebsite?.id) return;
    
    try {
      const response = await fetch(`${config.apiUrl}/scraping/edit-mode/${selectedWebsite.id}/index.html`);
      const html = await response.text();
      setEditModeHtml(html);
    } catch (error) {
      console.error('Erreur lors du chargement du HTML en mode édition:', error);
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
    if (isEditMode && editModeHtml && iframeRef.current) {
      // Attendre un court délai pour que l'iframe soit rendue
      const timer = setTimeout(() => {
        try {
          const iframeDocument = iframeRef.current.contentDocument || iframeRef.current.contentWindow.document;
          enableEditMode(iframeDocument);
        } catch (error) {
          console.error('Erreur d\'accès à l\'iframe:', error);
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [editModeHtml, isEditMode]);

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
      /* Désactiver le pointer-events sur tous les liens */
      a {
        pointer-events: none !important;
      }

      /* Style pour l'élément en édition */
      [contenteditable="true"] {
        outline: 2px solid #2ec96d !important;
        outline-offset: 1px !important;
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
    if (selectedElement && selectedElement.type === 'text' && editedText) {
      selectedElement.element.textContent = editedText;
      alert('Modifications appliquées !');
    }
  };

  const toggleEditMode = async () => {
    const newEditMode = !isEditMode;
    setSelectedElement(null);
    
    // Si on passe en mode édition, charger le HTML modifié
    if (newEditMode && selectedWebsite?.id) {
      await loadEditModeHtml();
    }
    
    setIsEditMode(newEditMode);
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
        
        console.log('- Scripts inline:', inlineScripts);
        console.log('- Scripts externes:', externalScripts);
        console.log('- Scripts désactivés:', disabledScripts);
        
        if (iframeWin) {
          console.log('window.Webflow:', iframeWin.Webflow ? 'Présent' : 'Absent');
          if (iframeWin.Webflow && iframeWin.Webflow.require) {
            try {
              const ix2 = iframeWin.Webflow.require('ix2');
              console.log('Webflow ix2:', ix2 ? 'Présent' : 'Absent');
            } catch(e) {
              console.log('Erreur accès ix2:', e.message);
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
        <SecondaryButton
          className={isEditMode ? 'active' : ''}
          onClick={toggleEditMode}
        >
          {isEditMode ? 'Mode Aperçu' : 'Mode Édition'}
        </SecondaryButton>
        <SecondaryButton
          onClick={handleRescrape}
          disabled={isLoading}
          title="Réimporter le site depuis Webflow"
        >
          {isLoading ? 'Importation...' : 'Réimporter'}
        </SecondaryButton>
        {isEditMode && (
          <>
            <div style={{ 
              padding: '0.05rem 0.5rem', 
              fontSize: '0.9rem',
              color: 'var(--color-text-primary)',
              display: 'flex',
              alignItems: 'center'
            }}>
              {Math.round(iframeWidth)}px
            </div>
            <DefaultButton
              onClick={handleSave}
            >
              Enregistrer
            </DefaultButton>
          </>
        )}
      </div>
      
      <div className="static-editor-content">
        {isEditMode && editModeHtml ? (
          <>
            <div className="canvas-viewport" ref={viewportRef}>
              <motion.div 
                className="iframe-container"
                style={{ width, height: '100%', position: 'relative' }}
              >
                <iframe
                  key="iframe-edit"
                  ref={iframeRef}
                  srcDoc={editModeHtml}
                  className="static-editor-iframe"
                  title="Site Preview"
                  sandbox="allow-same-origin allow-scripts"
                  style={{ pointerEvents: isDragging ? 'none' : 'auto' }}
                />
                <OverlaySystem
                  iframeRef={iframeRef}
                  selectedElement={selectedElement}
                  onElementHover={handleElementHover}
                  onElementSelect={handleElementSelect}
                />
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
                  <h3>Modifier l'élément</h3>
                  
                  {selectedElement.type === 'text' && (
                    <>
                      <div>
                        <label className="sidebar-label">Texte</label>
                        <textarea
                          className="sidebar-textarea"
                          value={editedText}
                          onChange={(e) => handleTextChange(e.target.value)}
                          placeholder="Entrez le texte..."
                        />
                      </div>
                      <button 
                        className="sidebar-button"
                        onClick={handleApplyChanges}
                      >
                        Appliquer les modifications
                      </button>
                    </>
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
                  <div className="sidebar-empty-icon">✏️</div>
                  <p>Cliquez sur un élément de la page pour le modifier</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <iframe
            key="iframe-preview"
            ref={iframeRef}
            src={siteUrl}
            className="static-editor-iframe"
            title="Site Preview"
            sandbox="allow-same-origin allow-scripts"
          />
        )}
      </div>
    </div>
  );
};

export default StaticEditor;
