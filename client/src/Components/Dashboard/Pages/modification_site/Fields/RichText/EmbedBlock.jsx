import React from 'react';
import { useTheme } from '@mui/material/styles';
import CodeIcon from '@mui/icons-material/Code';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const EmbedBlock = ({ block, contentState, blockProps }) => {
  const theme = useTheme();
  const entity = contentState.getEntity(block.getEntityAt(0));
  const { html } = entity.getData();
  const { onEditEmbed, onRemoveEmbed } = blockProps || {};

  const handleClick = (e) => {
    // Ne pas ouvrir l'éditeur si on clique sur le bouton supprimer
    if (e.target.closest('.delete-button')) {
      return;
    }
    if (onEditEmbed) {
      const entityKey = block.getEntityAt(0);
      onEditEmbed(entityKey, html);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (onRemoveEmbed) {
      onRemoveEmbed(block.getKey());
    }
  };

  return (
    <div 
      className="embed-block-wrapper"
      onClick={handleClick}
      style={{
        border: `1px solid ${theme.palette.primary.third}`,
        borderRadius: '4px',
        padding: '12px 16px',
        margin: '8px 0',
        backgroundColor: theme.palette.primary.second,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: theme.palette.text.primary,
          fontSize: '0.875rem',
          fontWeight: 500
        }}
      >
        <CodeIcon fontSize="small" />
        <span>Code HTML personnalisé</span>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <EditIcon 
          fontSize="small" 
          style={{ 
            color: theme.palette.text.secondary,
            opacity: 0.7
          }} 
        />
        <DeleteIcon
          className="delete-button"
          fontSize="small"
          onClick={handleDelete}
          style={{ 
            color: theme.palette.text.secondary,
            opacity: 0.7,
            cursor: 'pointer',
            transition: 'opacity 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
        />
      </div>
    </div>
  );
};

export default EmbedBlock;
