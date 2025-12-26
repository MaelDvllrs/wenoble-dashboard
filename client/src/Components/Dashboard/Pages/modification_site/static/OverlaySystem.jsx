import React, { useEffect, useRef, useState } from 'react';

// Système d'overlay pour afficher les cadres de sélection au-dessus de l'iframe
const OverlaySystem = ({ iframeRef, selectedElement, onElementHover, onElementSelect }) => {
  const overlayRef = useRef(null);
  const [hoveredBox, setHoveredBox] = useState(null);
  const [selectedBox, setSelectedBox] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Fonction pour obtenir le type d'élément
  const getElementType = (el) => {
    if (!el) return '';
    const tagName = el.tagName.toLowerCase();
    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) return tagName;
    if (tagName === 'p') return 'p';
    if (tagName === 'img') return 'image';
    if (tagName === 'video') return 'video';
    if (tagName === 'a') return 'link';
    if (tagName === 'span') return 'span';
    if (tagName === 'li') return 'li';
    if (tagName === 'label') return 'label';
    if (tagName === 'div') return 'T';
    return 'text';
  };

  // Fonction pour calculer la position d'un élément dans l'iframe
  const getElementBox = (element) => {
    if (!element || !iframeRef.current) return null;

    const iframe = iframeRef.current;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    
    // Obtenir les dimensions de l'élément dans l'iframe (getBoundingClientRect retourne déjà les positions relatives au viewport)
    const rect = element.getBoundingClientRect();
    
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      type: getElementType(element)
    };
  };

  // Référence pour l'élément en hover
  const hoveredElementRef = useRef(null);

  // Fonction pour mettre à jour toutes les boxes
  const updateBoxes = () => {
    // Mettre à jour la box hovered
    if (hoveredElementRef.current) {
      const box = getElementBox(hoveredElementRef.current);
      setHoveredBox(box);
    }

    // Mettre à jour la box sélectionnée
    if (selectedElement?.element) {
      const box = getElementBox(selectedElement.element);
      setSelectedBox(box);
    }
  };

  // Mettre à jour la box sélectionnée quand selectedElement change
  useEffect(() => {
    if (selectedElement?.element) {
      const box = getElementBox(selectedElement.element);
      setSelectedBox(box);
    } else {
      setSelectedBox(null);
    }
  }, [selectedElement]);

  // Écouter le scroll pour mettre à jour les positions
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    if (!iframeDoc) return;

    const handleScroll = () => {
      updateBoxes();
    };

    // Écouter le scroll sur le document de l'iframe
    iframeDoc.addEventListener('scroll', handleScroll, true);
    
    return () => {
      iframeDoc.removeEventListener('scroll', handleScroll, true);
    };
  }, [iframeRef, selectedElement]);

  // Gérer les événements de l'iframe
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    if (!iframeDoc) return;

    // Fonction pour vérifier si un élément est éditable
    const isEditableElement = (el) => {
      if (!el || !el.tagName) return false;
      const tagName = el.tagName.toLowerCase();
      
      // Images
      if (tagName === 'img') return true;
      
      // Éléments de texte
      if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'a', 'li', 'td', 'th', 'label'].includes(tagName)) {
        return el.textContent && el.textContent.trim().length > 0;
      }
      
      // Divs avec seulement du texte direct
      if (tagName === 'div') {
        const hasChildElements = Array.from(el.childNodes).some(node => node.nodeType === 1);
        if (!hasChildElements && el.textContent && el.textContent.trim().length > 0) {
          return true;
        }
      }
      
      return false;
    };

    // Trouver l'élément éditable le plus proche
    const findEditableElement = (target) => {
      let current = target;
      while (current && current !== iframeDoc.body) {
        if (isEditableElement(current)) {
          return current;
        }
        current = current.parentElement;
      }
      return null;
    };

    // Gérer le mousemove pour le hover
    const handleMouseMove = (e) => {
      const element = findEditableElement(e.target);
      if (element) {
        hoveredElementRef.current = element;
        const box = getElementBox(element);
        setHoveredBox(box);
        if (onElementHover) {
          onElementHover(element);
        }
      } else {
        hoveredElementRef.current = null;
        setHoveredBox(null);
        if (onElementHover) {
          onElementHover(null);
        }
      }
    };

    // Gérer le clic pour la sélection
    const handleClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const element = findEditableElement(e.target);
      if (element) {
        const tagName = element.tagName.toLowerCase();
        const type = tagName === 'img' ? 'image' : 'text';
        
        if (onElementSelect) {
          onElementSelect(element, type);
        }
      } else {
        if (onElementSelect) {
          onElementSelect(null, null);
        }
      }
    };

    // Gérer le double-clic pour l'édition
    const handleDoubleClick = (e) => {
      const element = findEditableElement(e.target);
      if (element && element.tagName.toLowerCase() !== 'img') {
        e.preventDefault();
        e.stopPropagation();
        element.contentEditable = 'true';
        element.focus();
        setIsEditing(true);
        
        // Placer le curseur à la fin du texte (sans sélectionner)
        const range = iframeDoc.createRange();
        const selection = iframeDoc.getSelection();
        
        // Trouver le dernier nœud texte
        const lastTextNode = getLastTextNode(element);
        if (lastTextNode) {
          range.setStart(lastTextNode, lastTextNode.length);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }

        // Désactiver contentEditable sur blur
        const handleBlur = () => {
          element.contentEditable = 'false';
          setIsEditing(false);
          element.removeEventListener('blur', handleBlur);
        };
        element.addEventListener('blur', handleBlur);
      }
    };
    
    // Fonction helper pour trouver le dernier nœud texte
    const getLastTextNode = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node;
      }
      const children = node.childNodes;
      for (let i = children.length - 1; i >= 0; i--) {
        const textNode = getLastTextNode(children[i]);
        if (textNode) return textNode;
      }
      return null;
    };

    iframeDoc.addEventListener('mousemove', handleMouseMove);
    iframeDoc.addEventListener('click', handleClick, true);
    iframeDoc.addEventListener('dblclick', handleDoubleClick, true);

    return () => {
      iframeDoc.removeEventListener('mousemove', handleMouseMove);
      iframeDoc.removeEventListener('click', handleClick, true);
      iframeDoc.removeEventListener('dblclick', handleDoubleClick, true);
    };
  }, [iframeRef, onElementHover, onElementSelect]);

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 50,
        overflow: 'hidden'
      }}
    >
      {/* Cadre hover */}
      {hoveredBox && (
        <>
          <div
            style={{
              position: 'absolute',
              left: `${hoveredBox.left}px`,
              top: `${hoveredBox.top}px`,
              width: `${hoveredBox.width}px`,
              height: `${hoveredBox.height}px`,
              border: isEditing ? '1px solid transparent' : '1px solid #2ec96d',
              boxSizing: 'border-box'
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: `${hoveredBox.left}px`,
              top: `${hoveredBox.top - 13}px`,
              background: 'transparent',
              color: isEditing ? 'transparent' : '#2ec96d',
              fontSize: '10px',
              fontWeight: 600,
              padding: '2px 6px',
              borderTopLeftRadius: '3px',
              borderTopRightRadius: '3px',
              textTransform: 'uppercase',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              letterSpacing: '0.5px',
              lineHeight: 1,
              userSelect: 'none'
            }}
          >
            {hoveredBox.type}
          </div>
        </>
      )}

      {/* Cadre sélectionné */}
      {selectedBox && (
        <>
          <div
            style={{
              position: 'absolute',
              left: `${selectedBox.left}px`,
              top: `${selectedBox.top}px`,
              width: `${selectedBox.width}px`,
              height: `${selectedBox.height}px`,
              border: isEditing ? '1px solid transparent' : '1px solid #2ec96d',
              boxSizing: 'border-box'
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: `${selectedBox.left}px`,
              top: `${selectedBox.top - 13}px`,
              background: isEditing ? 'transparent' : '#2ec96d',
              color: isEditing ? 'transparent' : 'white',
              fontSize: '10px',
              fontWeight: 600,
              padding: '2px 6px',
              borderTopLeftRadius: '3px',
              borderTopRightRadius: '3px',
              textTransform: 'uppercase',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              letterSpacing: '0.5px',
              lineHeight: 1,
              userSelect: 'none'
            }}
          >
            {selectedBox.type}
          </div>
        </>
      )}
    </div>
  );
};

export default OverlaySystem;
