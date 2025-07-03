import React from 'react'
import ReactDOM from 'react-dom/client'
import CssBaseline from '@mui/material/CssBaseline';

import App from './App.jsx'
import ThemeHandler from './Theme/themeProvider.jsx'
import './Theme/global.css';
import '../sw-update'; 


ReactDOM.createRoot(document.getElementById('root')).render(
    <ThemeHandler>
      <CssBaseline />
      <App />
    </ThemeHandler>
)