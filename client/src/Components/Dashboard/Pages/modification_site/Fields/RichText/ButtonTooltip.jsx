
import React, { forwardRef } from 'react';
import LinkIcon from '@mui/icons-material/Link';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import CodeIcon from '@mui/icons-material/Code';

// ...other icon imports as needed

const ButtonTooltip = forwardRef(({ position, onBold, onItalic, onH1, onH2, onH3, onH4, onH5, onH6, onLink, onUL, onOL, onBlockquote, onCode, theme, activeStyles, activeBlockType }, ref) => {
  const isActive = (style) => activeStyles?.includes(style) || activeBlockType === style;
  const colorActive = getComputedStyle(document.documentElement).getPropertyValue('--primary-color');

  return (
    <div
      className="tooltip-button"
      style={{
        left: position ? `${position.left}px` : 0,
        top: position ? `${position.top}px` : 0,
        backgroundColor: theme.palette.primary.secondary,
        boxShadow: theme.palette.shadow.main,
      }}
      ref={ref}
    >
      <button style={{ color: isActive('BOLD') ? colorActive : theme.palette.text.primary }} className='editor_button' onClick={onBold}><FormatBoldIcon fontSize="small" /></button>
      <button style={{ color: isActive('ITALIC') ? colorActive : theme.palette.text.primary }} className='editor_button' onClick={onItalic}><FormatItalicIcon fontSize='small' /></button>
      <button style={{ color: isActive('header-one') ? colorActive : theme.palette.text.primary }} className='editor_button' onClick={onH1}><p className='editor_button_title'>H1</p></button>
      <button style={{ color: isActive('header-two') ? colorActive : theme.palette.text.primary }} className='editor_button' onClick={onH2}><p className='editor_button_title'>H2</p></button>
      <button style={{ color: isActive('header-three') ? colorActive : theme.palette.text.primary }} className='editor_button' onClick={onH3}><p className='editor_button_title'>H3</p></button>
      <button style={{ color: isActive('header-four') ? colorActive : theme.palette.text.primary }} className='editor_button' onClick={onH4}><p className='editor_button_title'>H4</p></button>
      <button style={{ color: isActive('header-five') ? colorActive : theme.palette.text.primary }} className='editor_button' onClick={onH5}><p className='editor_button_title'>H5</p></button>
      <button style={{ color: isActive('header-six') ? colorActive : theme.palette.text.primary }} className='editor_button' onClick={onH6}><p className='editor_button_title'>H6</p></button>
      <button style={{ color: theme.palette.text.primary }} className='editor_button' onClick={onLink}><LinkIcon fontSize='small' /></button>
      <button style={{ color: isActive('unordered-list-item') ? colorActive : theme.palette.text.primary }} className='editor_button' onClick={onUL}><FormatListBulletedIcon fontSize='small' /></button>
      <button style={{ color: isActive('ordered-list-item') ? colorActive : theme.palette.text.primary }} className='editor_button' onClick={onOL}><FormatListNumberedIcon fontSize='small' /></button>
      <button style={{ color: isActive('blockquote') ? colorActive : theme.palette.text.primary }} className='editor_button' onClick={onBlockquote}><FormatQuoteIcon fontSize='small'/></button>
      <button style={{ color: isActive('code-block') ? colorActive : theme.palette.text.primary }} className='editor_button' onClick={onCode}><CodeIcon fontSize="small" /></button>
    </div>
  );
});

export default ButtonTooltip;
