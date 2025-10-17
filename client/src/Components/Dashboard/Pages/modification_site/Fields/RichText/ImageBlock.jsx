import React, { useRef } from 'react';
import {SecondaryButton} from '../../../../../../Theme/element'
import SettingsIcon from '@mui/icons-material/Settings';

const Image = (props) => {
  const { contentState, block, blockProps = {} } = props;
  const containerRef = useRef(null);
  const frameRef = useRef(null);

  if (!block) {
    console.warn('Bloc manquant dans le composant Image');
    return null;
  }

  const entityKey = block.getEntityAt(0);
  if (!entityKey) {
    console.error('Erreur : entityKey manquant pour le composant Image dans le bloc', block.getKey());
    return null;
  }

  try {
    const entity = contentState.getEntity(entityKey);
    if (!entity || entity.getType() !== 'IMAGE') {
      console.error("Erreur : entité invalide ou type incorrect pour l'image");
      return null;
    }

    const { src, width, alt } = entity.getData();

    if (!src) {
      console.error("Erreur : source d'image manquante");
      return null;
    }

    const handleOptionsClick = (triggerElement) => {
      if (!blockProps.onOpenOptions || !containerRef.current) {
        return;
      }
      const closestContainer = containerRef.current.closest('.editor-container');
      blockProps.onOpenOptions({
        entityKey,
        blockKey: block.getKey(),
        data: { src, width, alt },
        imageElement: frameRef.current || containerRef.current,
        containerElement: closestContainer || null,
        anchorElement: triggerElement || null,
      });
    };

    console.log(width)

    return (
      <div className="richtext-image-container" ref={containerRef}>
        <div
          className="richtext-image-frame"
          ref={frameRef}
          style={{ width: width || '100%' }}
        >
          {blockProps.onOpenOptions && (
            <div className='richtext-image-options-btn-wrapper'>
              <SecondaryButton
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleOptionsClick(event.currentTarget);
                }}
              >
                <SettingsIcon fontSize='small'/>
              </SecondaryButton>
            </div>
          )}
          <img
            src={src}
            alt={alt || ''}
            className="richtext-image"
          />
        </div>
      </div>
    );
  } catch (error) {
    console.error("Erreur lors du rendu de l'image:", error);
    return null;
  }
};

export default Image;