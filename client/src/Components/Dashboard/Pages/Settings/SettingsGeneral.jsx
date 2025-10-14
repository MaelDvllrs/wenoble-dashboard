import React, { useContext, useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import ThemeContext from '../../../../Theme/themeContext';
import { DefaultButton, SelectField } from '../../../../Theme/element';
import { MenuItem } from '@mui/material';
import { useSnackbar } from '../../../../Theme/snackbar';
import '../Users/AccountSettings.css';
import '../website/website.css';

const SettingsGeneral = () => {
  const theme = useTheme();
  const { isDark, toggleTheme } = useContext(ThemeContext);
  const { showSnackbar } = useSnackbar();
  
  // États pour les paramètres
  const [selectedTheme, setSelectedTheme] = useState('system');
  const [sidebarMode, setSidebarMode] = useState('open');
  const [hasChanges, setHasChanges] = useState(false);
  
  // Valeurs initiales pour détecter les changements
  const [initialValues, setInitialValues] = useState({
    theme: 'system',
    sidebar: 'open'
  });

  // Fonction pour vérifier s'il y a des changements
  const checkForChanges = () => {
    const currentValues = {
      theme: selectedTheme,
      sidebar: sidebarMode
    };
    
    const hasChanged = JSON.stringify(currentValues) !== JSON.stringify(initialValues);
    setHasChanges(hasChanged);
  };

  // Vérifier les changements à chaque modification
  useEffect(() => {
    checkForChanges();
  }, [selectedTheme, sidebarMode, initialValues]);

  // Charger les paramètres sauvegardés au montage du composant
  useEffect(() => {
    const savedSidebarMode = localStorage.getItem('sidebarMode') || 'open';
    const savedTheme = localStorage.getItem('themePreference') || 'system';
    
    setSidebarMode(savedSidebarMode);
    setSelectedTheme(savedTheme);
    
    const currentInitial = {
      theme: savedTheme,
      sidebar: savedSidebarMode
    };
    setInitialValues(currentInitial);
  }, []);

  const handleThemeChange = (event) => {
    setSelectedTheme(event.target.value);
  };

  const handleSidebarChange = (event) => {
    setSidebarMode(event.target.value);
  };

  const handleSave = () => {
    try {
      // Sauvegarder la préférence de thème
      localStorage.setItem('themePreference', selectedTheme);
      
      // Appliquer le thème selon la préférence
      if (selectedTheme === 'system') {
        // Détecter la préférence système
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if ((systemPrefersDark && !isDark) || (!systemPrefersDark && isDark)) {
          toggleTheme();
        }
      } else {
        // Thème manuel (light/dark)
        const shouldBeDark = selectedTheme === 'dark';
        if (shouldBeDark !== isDark) {
          toggleTheme();
        }
      }
      
      // Sauvegarder l'état de la sidebar
      localStorage.setItem('sidebarMode', sidebarMode);
      
      // Déclencher un événement pour notifier le Dashboard du changement
      window.dispatchEvent(new CustomEvent('sidebarModeChanged', { 
        detail: { mode: sidebarMode } 
      }));
      
      // Mettre à jour les valeurs initiales
      const newInitialValues = {
        theme: selectedTheme,
        sidebar: sidebarMode
      };
      setInitialValues(newInitialValues);
      setHasChanges(false);
      
      showSnackbar('success', 'Paramètres sauvegardés avec succès');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      showSnackbar('error', 'Erreur lors de la sauvegarde des paramètres');
    }
  };

  return (
    <div className='outlet-box'>
      {/* Breadcrumbs */}
      <div className="title_section">
        <div className="breadCrumbs">
          <NavLink 
            className={'breadCrumbsLink'}
            to="/dashboard/home"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            Dashboard
          </NavLink>
          <span className="breadcrumb-separator" style={{ color: theme.palette.text.secondary }}> / </span>
          <NavLink 
            className={'breadCrumbsLink'}
            to="/dashboard/settings/general"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            Paramètres
          </NavLink>
          <span className="breadcrumb-separator" style={{ color: theme.palette.text.secondary }}> / </span>
          <span className="breadcrumb-item-active" style={{ color: theme.palette.text.primary }}>
            Paramètres généraux
          </span>
        </div>
      </div>

    <div className='security-form'>
      <div className='profile-form-row' style={{ backgroundColor: theme.palette.primary.main, boxShadow: theme.palette.shadow.main }}>
        <h3 className='titlePage'>Paramètres généraux</h3>
        <div className='line-sidebar'/>
        
        {/* Section Thème */}
        <h4 className='account-setting-title'>Thème</h4>
        <div className='input-container'>
          <p className='blogField_name collection_edit_name'>Apparence</p>
          <SelectField
            value={selectedTheme}
            onChange={handleThemeChange}
            theme={theme}
            fullWidth
          >
            <MenuItem value="light">Clair</MenuItem>
            <MenuItem value="dark">Sombre</MenuItem>
            <MenuItem value="system">Système</MenuItem>
          </SelectField>
          {selectedTheme === 'system' && (
            <p className='account-settings-subtitle' style={{ marginTop: '0.5rem' }}>
              Suit automatiquement les préférences de votre système d'exploitation
            </p>
          )}
        </div>
        
        <div className='line-sidebar'/>
        
        {/* Section Sidebar */}
        <h4 className='account-setting-title'>Barre latérale</h4>
        <div className='input-container'>
          <p className='blogField_name collection_edit_name'>Comportement</p>
          <SelectField
            value={sidebarMode}
            onChange={handleSidebarChange}
            theme={theme}
            fullWidth
          >
            <MenuItem value="open">Toujours ouverte</MenuItem>
            <MenuItem value="closed">Toujours fermée</MenuItem>
            <MenuItem value="hover">Ouverte au survol</MenuItem>
          </SelectField>
          <p className='account-settings-subtitle' style={{ marginTop: '0.5rem' }}>
            {sidebarMode === 'open' && 'La barre latérale reste toujours étendue'}
            {sidebarMode === 'closed' && 'La barre latérale reste toujours réduite'}
            {sidebarMode === 'hover' && 'La barre latérale s\'étend uniquement au survol'}
          </p>
        </div>
        
        <div style={{ marginTop: '2rem' }}>
          <DefaultButton 
            onClick={handleSave}
            disabled={!hasChanges}
          >
            Enregistrer
          </DefaultButton>
        </div>
      </div>
    </div>
    </div>
  );
};

export default SettingsGeneral;