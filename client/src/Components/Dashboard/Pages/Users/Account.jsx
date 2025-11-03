
import React, { useContext } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import ThemeContext from '../../../../Theme/themeContext';
import SecurityIcon from '@mui/icons-material/Security';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';

import './AccountSettings.css';

const AccountSettings = () => {
  const theme = useTheme();
  const { isDark } = useContext(ThemeContext);
  const location = useLocation();

  // Breadcrumb dynamique multi-niveaux pour la section compte
  let breadcrumbItems = [
    { label: 'Dashboard', to: '/dashboard/home' },
    { label: 'Mon Compte', to: '/dashboard/account/general' }
  ];

  // Analyse du chemin pour générer dynamiquement les sous-niveaux
  // Exemples de routes :
  // /dashboard/account/general
  // /dashboard/account/security
  // /dashboard/account/email
  const pathParts = location.pathname.split('/').filter(Boolean);
  const accountIdx = pathParts.indexOf('account');
  let afterAccount = pathParts.slice(accountIdx + 1);

  // Mapping des labels pour les sous-pages
  const labelMap = {
    'general': 'Paramètres généraux',
    'security': 'Sécurité',
    'email': 'Email & Notifications',
  };

  afterAccount.forEach((part, idx) => {
    const label = labelMap[part] || part.charAt(0).toUpperCase() + part.slice(1);
    if (idx === afterAccount.length - 1) {
      breadcrumbItems.push({ label, active: true });
    } else {
      const to = '/dashboard/account/' + afterAccount.slice(0, idx + 1).join('/');
      breadcrumbItems.push({ label, to });
    }
  });

  return (
    <div className='outlet'>
      <div className='outlet-sidebar'>
        <aside className="sidebar-secondary" style={{ borderColor: theme.palette.primary.third }}>
          <div className='sidebar-secondary-title-box'>
            <h3 className='sidebar-secondary-title'>Mon Compte</h3>
          </div>
          <NavLink 
            to="/dashboard/account/general"
            className={({ isActive }) => `account-sidebar-link${isActive ? ' account-sidebar-link-active' : ''}`}
          >
            <PersonOutlineRoundedIcon fontSize='small'/>
            Paramètres généraux</NavLink>
          <NavLink 
            to="/dashboard/account/security"
            className={({ isActive }) => `account-sidebar-link${isActive ? ' account-sidebar-link-active' : ''}`}
          >
            <SecurityIcon fontSize="small"/>
            Sécurité</NavLink>
          <NavLink 
            to="/dashboard/account/email"
            className={({ isActive }) => `account-sidebar-link${isActive ? ' account-sidebar-link-active' : ''}`}
          >
            <NotificationsNoneRoundedIcon fontSize='small'/>
            Email & Notifications</NavLink>
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

export default AccountSettings;