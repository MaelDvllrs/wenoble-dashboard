import React from 'react'
import ReactDOM from 'react-dom/client'
import CssBaseline from '@mui/material/CssBaseline';

import App from './App.jsx'
import ThemeHandler from './Theme/themeProvider.jsx'
import './Theme/global.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <ThemeHandler>
      <CssBaseline />
      <App />
    </ThemeHandler>
)