import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import CssBaseline from '@mui/material/CssBaseline';
import ThemeHandler from './Theme/themeProvider.jsx'
import './Theme/global.css';
import { BrowserRouter } from 'react-router-dom';

//if ('serviceWorker' in navigator) {
//  window.addEventListener('load', () => {
//    navigator.serviceWorker.register('/service-worker.js')
//      .then((registration) => {
//        console.log('ServiceWorker registration successful with scope: ', registration.scope);
//      }, (error) => {
//        console.log('ServiceWorker registration failed: ', error);
//      });
//  });
//}

ReactDOM.createRoot(document.getElementById('root')).render(
    <ThemeHandler>
      <CssBaseline />
      <App />
    </ThemeHandler>
)
