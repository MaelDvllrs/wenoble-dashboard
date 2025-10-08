import React, { useContext } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import ThemeContext from '../../../../Theme/themeContext';
import SettingsIcon from '@mui/icons-material/Settings';

import '../Users/AccountSettings.css';

const Settings = () => {
  const theme = useTheme();
  const { isDark } = useContext(ThemeContext);
  
  return (
    <div className='outlet'>
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
          <span className="breadcrumb-item-active" style={{ color: theme.palette.text.primary }}>
            Paramètres
          </span>
        </div>
      </div>
      <div className="account-settings-root" style={{ backgroundColor: theme.palette.background.default }}>
        <aside className="account-sidebar" style={{ borderColor: theme.palette.primary.third }}>
          <NavLink 
            to="/dashboard/settings/general"
            className={({ isActive }) => `account-sidebar-link${isActive ? ' account-sidebar-link-active' : ''}`}
          >
            <SettingsIcon fontSize='small'/>
            Paramètres généraux
          </NavLink>
        </aside>
        <main className="account-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Settings;
