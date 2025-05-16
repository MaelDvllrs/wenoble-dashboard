import React, { useState, useEffect, forwardRef } from 'react';
import AddIcon from '@mui/icons-material/Add';
import ImageIcon from '@mui/icons-material/Image';

const AddonTooltip = forwardRef(({ position, onAddImage, onAddAttribute, theme, onImage }, ref) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => setIsOpen(!isOpen);

  const handleClose = (event) => {
    if (
      ref.current &&
      !ref.current.contains(event.target) &&
      !event.target.closest('.addon-tooltip-select')
    ) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClose);
    return () => {
      document.removeEventListener('mousedown', handleClose);
    };
  }, [ref]);

  return (
    <div
      className="addon-tooltip"
      style={{
        left: position ? `${position.left}px` : 0,
        top: position ? `${position.top}px` : 0,
      }}
      ref={ref}
    >
      <button
        className="addon-tooltip-button"
        onClick={handleToggle}
        style={{ color: theme.palette.text.primary }}
      >
        <AddIcon fontSize="small" />
      </button>
      {isOpen && (
        <div className="addon-tooltip-select">
          <button
            className="addon-tooltip-option"
            onClick={() => {
              onImage();
              setIsOpen(false);
            }}
            style={{ color: theme.palette.text.primary }}
          >
            <ImageIcon fontSize="small" />
            <p>Image</p>
          </button>
        </div>
      )}
    </div>
  );
});

export default AddonTooltip;
