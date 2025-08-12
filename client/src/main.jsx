import React from 'react'
import ReactDOM from 'react-dom/client'
import CssBaseline from '@mui/material/CssBaseline';

import App from './App.jsx'
import ThemeHandler from './Theme/themeProvider.jsx'
import './Theme/global.css';
import '../sw-update'; 

import { SnackbarProvider } from './Theme/snackbar.jsx';



ReactDOM.createRoot(document.getElementById('root')).render(
    <ThemeHandler>
      <CssBaseline />
      <SnackbarProvider>
      <App />
      </SnackbarProvider>
    </ThemeHandler>
)