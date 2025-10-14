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
          <div className='outlet'>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Settings;
