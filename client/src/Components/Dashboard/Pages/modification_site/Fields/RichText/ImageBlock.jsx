import React from 'react';

const Image = (props) => {
  const { contentState, block } = props;
  if (!block) return null;
  const entityKey = block.getEntityAt(0);
  if (!entityKey) {
    console.error("Erreur : entityKey manquant pour le composant Image.");
    return null;
  }
  const { src, width } = contentState.getEntity(entityKey).getData();
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <img src={src} alt="" style={{ width: width }} />
    </div>
  );
};

export default Image;
