import React from 'react';

const Image = (props) => {
  const { contentState, block } = props;
  
  if (!block) {
    console.warn("Bloc manquant dans le composant Image");
    return null;
  }
  
  const entityKey = block.getEntityAt(0);
  if (!entityKey) {
    console.error("Erreur : entityKey manquant pour le composant Image dans le bloc", block.getKey());
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
    
    return (
      <div style={{ 
        position: 'relative', 
        display: 'block',
        margin: '10px 0',
        textAlign: 'center'
      }}>
        <img 
          src={src} 
          alt={alt || ""} 
          style={{ 
            width: width || '100%',
            maxWidth: '100%',
            height: 'auto'
          }} 
        />
      </div>
    );
  } catch (error) {
    console.error("Erreur lors du rendu de l'image:", error);
    return null;
  }
};

export default Image;