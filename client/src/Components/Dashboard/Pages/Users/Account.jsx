import React, { useContext } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import ThemeContext from '../../../../Theme/themeContext';
import SecurityIcon from '@mui/icons-material/Security';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';

import './AccountSettings.css';
const AccountSettings = () => {
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
            Compte
          </span>
            </div>
          </div>
      <div className="account-settings-root" style={{ backgroundColor: theme.palette.background.default }}>
        <aside className="account-sidebar" style={{ borderColor: theme.palette.primary.third }}>
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
        <main className="account-main">
          <Outlet />
        </main>
        </div>
    </div>
  );
};

export default AccountSettings;