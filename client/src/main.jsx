import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import CssBaseline from '@mui/material/CssBaseline';
import ThemeHandler from './Theme/themeProvider.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
      
    <ThemeHandler>
      <CssBaseline />
      <App />
    </ThemeHandler>
)
