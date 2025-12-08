import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { MenuItem, Select } from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import EmailIcon from '@mui/icons-material/Email';
import CallIcon from '@mui/icons-material/Call';
import CheckIcon from '@mui/icons-material/Check';
import ClearIcon from '@mui/icons-material/Clear';

const LinkTooltip = forwardRef((props, ref) => {
  const { position, onSubmit, onCancel, theme, urlValue, isEditing } = props;
  const [urlInput, setUrlInput] = useState('');
  const [linkType, setLinkType] = useState('default'); // 'default', 'email', 'phone'
  const tooltipRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setUrlInput(urlValue || '');
  }, [urlValue]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target) && !event.target.closest('.MuiMenu-root')) {
        onCancel();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onCancel]);

  useEffect(() => {
    if (isEditing) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
        }
      }, [isEditing]);

  useEffect(() => {
    if (urlValue) {
      if (urlValue.startsWith('mailto:')) {
        setLinkType('email');
        setUrlInput(urlValue.replace(/^mailto:/, ''));
      } else if (urlValue.startsWith('tel:')) {
        setLinkType('phone');
        setUrlInput(urlValue.replace(/^tel:/, ''));
      } else {
        setLinkType('default');
        setUrlInput(urlValue);
      }
    } else {
      setLinkType('default');
      setUrlInput('');
    }

  }, [urlValue]);

  const getPlaceholder = () => {
    if (linkType === 'email') return 'exemple@domaine.com';
    if (linkType === 'phone') return '+123456789';
    return 'https://example.com';
  };

  const getTypeLink = () => {
    if (linkType === 'email') return 'email';
    if (linkType === 'phone') return 'tel';
    return 'url';
  };

  const handleUrlInputChange = (e) => setUrlInput(e.target.value);

  const handleSubmit = (e) => {
    e.preventDefault();
    const url = urlInput.trim();
    onSubmit(url, linkType);
  };

  return (
    <div
      className="link-tooltip"
      style={{
        left: position ? `${position.left}px` : 0,
        top: position ? `${position.top}px` : 0,
      }}
      ref={ref}
    >
      <form onSubmit={handleSubmit} className='link-tooltip-form'>
        <Select
          className="link-tooltip-select"
          value={linkType}
          onChange={(e) => setLinkType(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          style={{ color: theme.palette.text.primary }}
          MenuProps={{
            PaperProps: {
              style: {
                backgroundColor: theme.palette.primary.secondary,
                marginTop: '0.5rem',
                boxShadow: theme.palette.shadow.main,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 'auto',
              },
              sx: {
                '& .MuiList-root': {
                  padding: '0.3rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  gap: '0.2rem',
                },
                '& .MuiMenuItem-root': {
                  display: 'flex',
                  borderRadius: '0.3rem',
                  padding: '0.2rem',
                  width: 'auto',
                },
                '& .MuiMenuItem-root:hover': {
                  backgroundColor: theme.palette.primary.third,
                },
                '& .MuiMenuItem-root.Mui-selected': {
                  backgroundColor: theme.palette.primary.third,
                },
              },
            },
          }}
          sx={{
            '& .MuiSelect-icon': { color: theme.palette.text.primary },
            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' },
            '& .MuiSelect-select': {
              paddingLeft: '0.5rem',
              paddingTop: '0.2rem',
              paddingBottom: '0.2rem',
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'transparent',
            },
          }}
        >
          <MenuItem value="default" className='link-tooltip-menu-item'>
            <LinkIcon fontSize='small' className='link-tooltip-menu-icon'/> Url
          </MenuItem>
          <MenuItem value="email" className='link-tooltip-menu-item'>
            <EmailIcon fontSize='small' className='link-tooltip-menu-icon'/> Email
          </MenuItem>
          <MenuItem value="phone" className='link-tooltip-menu-item'>
            <CallIcon fontSize="small" className='link-tooltip-menu-icon'/> Téléphone
          </MenuItem>
        </Select>
        <input
          ref={inputRef}
          type={getTypeLink()}
          placeholder={getPlaceholder()}
          value={urlInput}
          onChange={handleUrlInputChange}
          className="link-tooltip-input"
          style={{ color: theme.palette.text.primary }}
          />
          <button
          type="button"
          className="link-tooltip-button"
          onClick={handleSubmit}
          style={{ color: theme.palette.text.primary }}
        >
          <CheckIcon fontSize="small" />
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="link-tooltip-button"
          style={{ color: theme.palette.text.primary }}
        >
          <ClearIcon fontSize="small" />
        </button>
      </form>
    </div>
  );
});

export default LinkTooltip;