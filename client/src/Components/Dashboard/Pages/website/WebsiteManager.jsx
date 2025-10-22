import React, { useContext, useState, useRef, useMemo, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { ClickAwayListener, Popper, Grow, IconButton } from '@mui/material';
import ThemeContext from '../../../../Theme/themeContext';
import { useWebsite } from '../../../../Context/WebsiteContext';
import { SimpleSearchField } from '../../../../Theme/element';
import { checkAuthorization } from '../../../../Authorisation/Authorisation';

// Icons
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import CreateOutlinedIcon from '@mui/icons-material/CreateOutlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import EqualizerOutlinedIcon from '@mui/icons-material/EqualizerOutlined';
import NewspaperOutlinedIcon from '@mui/icons-material/NewspaperOutlined';
import { PiChatCircleDotsBold, PiPlusBold, PiGearSixBold } from 'react-icons/pi';
import LanguageIcon from '@mui/icons-material/Language';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import MailIcon from '@mui/icons-material/Mail';
import SettingsIcon from '@mui/icons-material/Settings';
import LockIcon from '@mui/icons-material/Lock';
import CardMembershipIcon from '@mui/icons-material/CardMembership';
import ReceiptIcon from '@mui/icons-material/Receipt';

import '../Users/AccountSettings.css';

const WebsiteManager = () => {
  const theme = useTheme();
  const { isDark } = useContext(ThemeContext);
  const navigate = useNavigate();

  const [newsAuth, setNewsAuth] = useState(false);
  const [analyticsAuth, setAnalyticsAuth] = useState(false);
  
  // Website selector from context
  const { websites, selectedWebsite, loading: loadingWebsites, selectWebsite } = useWebsite();
  const [openWebsiteMenu, setOpenWebsiteMenu] = useState(false);
  const [websiteSearch, setWebsiteSearch] = useState('');
  const websiteMenuRef = useRef(null);
  const websiteSearchInputRef = useRef(null);
  
  const filteredWebsites = useMemo(() => {
    const q = websiteSearch.trim().toLowerCase();
    if (!q) return websites || [];
    return (websites || []).filter(w => {
      const name = (w.website_name || '').toLowerCase();
      const slug = (w.website_slug || '').toLowerCase();
      return name.includes(q) || slug.includes(q);
    });
  }, [websites, websiteSearch]);

  const handleOpenWebsiteMenu = (event) => {
    event.stopPropagation();
    setOpenWebsiteMenu(true);

    setTimeout(() => {
      if (websiteSearchInputRef.current) {
        websiteSearchInputRef.current.focus();
      }
    }, 100);
  };

  

  const handleCloseWebsiteMenu = () => {
    setOpenWebsiteMenu(false);
    setWebsiteSearch('');
  };

  const handleSelectWebsite = (website) => {
    selectWebsite(website);
    setOpenWebsiteMenu(false);
  };

  const handleCreateWebsite = () => {
    navigate('/dashboard/website/create');
    setOpenWebsiteMenu(false);
  };

  const handleWebsiteSettings = () => {
    navigate('/dashboard/websites');
    setOpenWebsiteMenu(false);
  };

    // Effects
    useEffect(() => {
        const fetchAuth = async () => {
            if (selectedWebsite?.id) {
                const isAuthorisedNews = await checkAuthorization('auth_newsletter', selectedWebsite.id);
                const isAuthorisedAnalytics = await checkAuthorization('auth_analytics', selectedWebsite.id);
                setNewsAuth(isAuthorisedNews);
                setAnalyticsAuth(isAuthorisedAnalytics);
            } else {
                // Réinitialiser les autorisations si aucun site n'est sélectionné
                setNewsAuth(false);
                setAnalyticsAuth(false);
            }
        };
        if (!loadingWebsites) {
            fetchAuth();
        }
    }, [selectedWebsite, loadingWebsites]);



  return (
    <div className='outlet'>
      <div className="outlet-sidebar">
        <aside className="sidebar-secondary" style={{ borderColor: theme.palette.primary.third }}>
          
          {/* Website Selector */}
          <div className='website-selector' style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: `1px solid ${theme.palette.primary.third}` }}>
            <IconButton 
              className='website-selector-button'
              onClick={handleOpenWebsiteMenu} 
              ref={websiteMenuRef}
              sx={{ 
                color: theme.palette.text.primary, 
                padding: '0.5rem !important',
                display: 'flex !important',
                justifyContent: 'space-between !important',
                width: '100% !important'
              }}
              disabled={loadingWebsites}
            >
              {loadingWebsites ? (
                <div style={{ color: theme.palette.text.secondary }}>Chargement...</div>
              ) : (
                <>
                  <LanguageIcon fontSize='small' style={{color: theme.palette.text.secondary}}/>
                  <div className='website-info-button'>
                    <span className='website-selector-text'>
                      <b>{selectedWebsite ? selectedWebsite.website_name : 'Aucun site sélectionné'}</b>
                    </span>
                    {selectedWebsite && (
                      <span className={`website-selector-role ${selectedWebsite.user_role}`}>
                        {selectedWebsite.user_role}
                      </span>
                    )}
                    <UnfoldMoreIcon fontSize='small' className='icon' style={{color: theme.palette.text.secondary}} />
                  </div>
                </>
              )}
            </IconButton>
            
            <ClickAwayListener onClickAway={handleCloseWebsiteMenu}>
              <Popper 
                open={openWebsiteMenu} 
                anchorEl={websiteMenuRef.current} 
                transition 
                placement="bottom-start" 
                style={{zIndex: 120}}
              >
                {({ TransitionProps }) => (
                  <Grow {...TransitionProps} timeout={350}>
                    <div className='dashboard_case_empty user_menu_case' style={{
                      backgroundColor: theme.palette.primary.main, 
                      minWidth: '280px'
                    }}>
                      {/* En-tête avec infos site web */}
                      <div className='user_menu_header'>
                        <div className='user_info_section'>
                          <div className='user_profile_info'>
                            <div className='user_details'>
                              <div className='user_name_large' style={{ color: theme.palette.text.primary }}>
                                <b>Sites web</b>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <SimpleSearchField
                        theme={theme}
                        placeholder="Rechercher un site..."
                        value={websiteSearch}
                        onChange={(e) => setWebsiteSearch(e.target.value)}
                        inputRef={websiteSearchInputRef}
                        style={{ width: '100%' }}
                      />
                      
                      <div className="line_horizontal" style={{ backgroundColor: theme.palette.primary.third }}></div>

                      {/* Liste des sites */}
                      <div className='user_menu_actions'>
                        {loadingWebsites ? (
                          <div style={{ padding: '1rem', color: theme.palette.text.secondary }}>
                            Chargement...
                          </div>
                        ) : (filteredWebsites.length === 0) ? (
                          <div className='user_action_item' style={{ color: theme.palette.text.secondary }}>
                            Aucun site web trouvé
                          </div>
                        ) : (
                          filteredWebsites.map((website) => (
                            <div
                              key={website.id}
                              className={`user_action_item ${selectedWebsite?.id === website.id ? 'selected' : ''}`}
                              onClick={() => handleSelectWebsite(website)}
                              style={{ color: theme.palette.text.primary }}
                            >
                              <div className='button-selector'>
                                <div><b>{website.website_name}</b></div>
                                <div style={{ color: theme.palette.text.secondary, fontSize: '0.8rem' }}>
                                  {website.user_role}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="line_horizontal" style={{ backgroundColor: theme.palette.primary.third }}></div>
                          
                      {/* Actions */}
                      <div 
                        className='user_action_item'
                        onClick={handleCreateWebsite}
                        style={{ color: theme.palette.text.primary }}
                      >
                        <PiPlusBold className='action_icon' />
                        <span>Créer un nouveau site</span>
                      </div>
                      <div 
                        className='user_action_item'
                        onClick={handleWebsiteSettings}
                        style={{ color: theme.palette.text.primary }}
                      >
                        <PiGearSixBold className='action_icon' />
                        <span>Gérer les sites</span>
                      </div>
                    </div>
                  </Grow>
                )}
              </Popper>
            </ClickAwayListener>
          </div>

          {/* Navigation Links */}
          {selectedWebsite && (
            <>
              <NavLink 
                to="/dashboard/website"
                end
                className={({ isActive }) => `account-sidebar-link${isActive ? ' account-sidebar-link-active' : ''}`}
              >
                <DashboardOutlinedIcon fontSize='small'/>
                Vue d'ensemble
              </NavLink>
              
              <NavLink 
                to={'/dashboard/website/modification/'}
                className={({ isActive }) => `account-sidebar-link${isActive ? ' account-sidebar-link-active' : ''}`}
              >
                <CreateOutlinedIcon fontSize='small'/>
                Modifications
              </NavLink>
              
              <NavLink 
                to={analyticsAuth ? "/dashboard/website/stats" : '#'}
                className={({ isActive }) => `account-sidebar-link${isActive && analyticsAuth ? ' account-sidebar-link-active' : ''}${!analyticsAuth ? ' disabled' : ''}`}
              >
                <EqualizerOutlinedIcon fontSize='small'/>
                Statistiques
                {!analyticsAuth && <span style={{ marginLeft: 'auto', fontSize: '0.75rem' }}><LockIcon fontSize='tiny'/></span>}
              </NavLink>
              
              <NavLink 
                to="/dashboard/website/contact"
                className={({ isActive }) => `account-sidebar-link${isActive ? ' account-sidebar-link-active' : ''}`}
              >
                <MailIcon fontSize='small'/>
                Contacts
              </NavLink>
              
              <NavLink 
                to={newsAuth ? '/dashboard/website/newsletter' : '#'}
                className={({ isActive }) => `account-sidebar-link${isActive && newsAuth ? ' account-sidebar-link-active' : ''}${!newsAuth ? ' disabled' : ''}`}
              >
                <NewspaperOutlinedIcon fontSize='small'/>
                Newsletter
                {!newsAuth && <span style={{ marginLeft: 'auto', fontSize: '0.75rem' }}><LockIcon fontSize='tiny'/></span>}
              </NavLink>
              
              <NavLink 
                to={`/dashboard/website/subscription/${selectedWebsite.id}`}
                className={({ isActive }) => `account-sidebar-link${isActive ? ' account-sidebar-link-active' : ''}`}
              >
                <CardMembershipIcon fontSize='small'/>
                Abonnement
              </NavLink>
              
              <NavLink 
                to={`/dashboard/website/billing/${selectedWebsite.id}`}
                className={({ isActive }) => `account-sidebar-link${isActive ? ' account-sidebar-link-active' : ''}`}
              >
                <ReceiptIcon fontSize='small'/>
                Facturation
              </NavLink>
              
              {selectedWebsite.user_role === 'admin' && (
                <NavLink 
                  to={`/dashboard/website/settings/${selectedWebsite.id}`}
                  className={({ isActive }) => `account-sidebar-link${isActive ? ' account-sidebar-link-active' : ''}`}
                >
                  <SettingsIcon fontSize='small'/>
                  Paramètres
                </NavLink>
              )}
            </>
          )}
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

export default WebsiteManager;
