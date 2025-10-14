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
              <div className='outlet'>
                <Outlet />
              </div>
            </main>
        </div>
    </div>
  );
};

export default AccountSettings;