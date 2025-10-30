
import React, { useContext } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import ThemeContext from '../../../../Theme/themeContext';
import SettingsIcon from '@mui/icons-material/Settings';

import '../Users/AccountSettings.css';

const Settings = () => {
  const theme = useTheme();
  const { isDark } = useContext(ThemeContext);
  const location = useLocation();

  // Breadcrumb dynamique multi-niveaux pour la section paramètres
  let breadcrumbItems = [
    { label: 'Dashboard', to: '/dashboard/home' },
    { label: 'Paramètres', to: '/dashboard/settings/general' }
  ];

  // Analyse du chemin pour générer dynamiquement les sous-niveaux
  // Exemples de routes :
  // /dashboard/settings/general
  // /dashboard/settings/autre
  const pathParts = location.pathname.split('/').filter(Boolean);
  const settingsIdx = pathParts.indexOf('settings');
  let afterSettings = pathParts.slice(settingsIdx + 1);

  // Mapping des labels pour les sous-pages
  const labelMap = {
    'general': 'Paramètres généraux',
    // Ajoutez d'autres sous-pages ici si besoin
  };

  afterSettings.forEach((part, idx) => {
    const label = labelMap[part] || part.charAt(0).toUpperCase() + part.slice(1);
    if (idx === afterSettings.length - 1) {
      breadcrumbItems.push({ label, active: true });
    } else {
      const to = '/dashboard/settings/' + afterSettings.slice(0, idx + 1).join('/');
      breadcrumbItems.push({ label, to });
    }
  });

  return (
    <div className='outlet'>
      <div className="outlet-sidebar">
        <aside className="sidebar-secondary" style={{ borderColor: theme.palette.primary.third }}>
          <div className='sidebar-secondary-title-box'>
            <h3 className='sidebar-secondary-title'>Paramètres</h3>
          </div>
          <NavLink 
            to="/dashboard/settings/general"
            className={({ isActive }) => `account-sidebar-link${isActive ? ' account-sidebar-link-active' : ''}`}
          >
            <SettingsIcon fontSize='small'/>
            Paramètres généraux
          </NavLink>
        </aside>
        <main className="outlet-sidebar-wrapper">
          <div className='outlet website-outlet'>
            {/* Breadcrumb header section */}
            <div className="dashboard-header-section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem' }}>
              <div className="breadCrumbs">
                {breadcrumbItems.map((item, idx) => {
                  const isLast = idx === breadcrumbItems.length - 1;
                  return (
                    <span key={idx} style={{ display: 'inline-flex', alignItems: 'center' }}>
                      {!isLast && item.to ? (
                        <NavLink to={item.to} className="breadCrumbsLink" style={{ textDecoration: 'none', color: 'inherit' }}>{item.label}</NavLink>
                      ) : (
                        <span className="breadcrumb-item-active" style={{ color: 'var(--primary-text)' }}>{item.label}</span>
                      )}
                      {idx < breadcrumbItems.length - 1 && (
                        <span className="breadcrumb-separator" style={{ margin: '0 0.5rem', color: theme.palette.text.secondary }}>/</span>
                      )}
                    </span>
                  );
                })}
              </div>
              <div className="dashboard-header-actions"></div>
            </div>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Settings;
