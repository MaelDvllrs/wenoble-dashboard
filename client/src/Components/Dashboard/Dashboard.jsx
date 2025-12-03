// Composant général pour l'affichage du breadcrumb et des actions globales
// Props :
// - items: tableau d'objets { label, to, active }
// - actions: ReactNode (actions à afficher à droite)
// - style: style additionnel (optionnel)
const DashboardHeaderSection = ({ items = [], actions = null, style = {} }) => {
    return (
        <div className="dashboard-header-section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', ...style }}>
            <div className="breadCrumbs">
                {items.map((item, idx) => (
                    <span key={idx} style={{ display: 'inline-flex', alignItems: 'center' }}>
                        {item.to ? (
                            <a href={item.to} className={item.active ? 'breadcrumb-item-active' : 'breadCrumbsLink'} style={{ textDecoration: 'none', color: item.active ? 'var(--primary-text)' : 'inherit' }}>{item.label}</a>
                        ) : (
                            <span className={item.active ? 'breadcrumb-item-active' : ''} style={{ color: item.active ? 'var(--primary-text)' : 'inherit' }}>{item.label}</span>
                        )}
                        {idx < items.length - 1 && (
                            <span className="breadcrumb-separator" style={{ margin: '0 0.5rem', color: 'var(--secondary-text)' }}>/</span>
                        )}
                    </span>
                ))}
            </div>
            {actions && <div className="dashboard-header-actions">{actions}</div>}
        </div>
    );
};
// External libraries
import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import Axios from '../../service/AxiosConfig';
import { jwtDecode } from 'jwt-decode';
import Cookies from 'js-cookie';
import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Checkbox, Avatar, Badge, Popper, ClickAwayListener, Grow, IconButton } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { formatDistance } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '../../service/supabaseAuth';
import { getProfileImageUrl } from '../../service/profileImageService';

// Icons
import { BsChevronCompactDown } from "react-icons/bs";

import { PiHouse, PiGlobe, PiArticle, PiGraduationCap, PiQuestion, PiCube, PiCaretUpDown, PiBell,  PiSidebarSimpleLight, PiLockBold, PiUser, PiGear, PiPower, PiChatCircleDotsBold,   PiPlusBold } from "react-icons/pi";

import CreateOutlinedIcon from '@mui/icons-material/CreateOutlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import EqualizerOutlinedIcon from '@mui/icons-material/EqualizerOutlined';
import NewspaperOutlinedIcon from '@mui/icons-material/NewspaperOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import LanguageIcon from '@mui/icons-material/Language';
import ExitToAppRoundedIcon from '@mui/icons-material/ExitToAppRounded';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import WorkspacesIcon from '@mui/icons-material/Workspaces';
import CheckIcon from '@mui/icons-material/Check';

// Internal imports
import './Dashboard.css';
import Logo from '../../assets/icon/logo.svg?react';
import config from '../../config';
import { SkeletonProfile, SkeletonMenuList, SkeletonFullSelector } from '../skeleton/skeleton';
import { Typography } from '@mui/material';
import { AlertBanner } from '../../Theme/element';
import ThemeContext from '../../Theme/themeContext';
import { notificationTitle, notificationLink, SimpleSearchField } from '../../Theme/element';
import { checkAuthorization } from '../../Authorisation/Authorisation';
import { fetchUserInfo } from './Pages/Users/apiAccount';
import InstallPWA from '../InstallPWA';
import { useWebsite } from '../../Context/WebsiteContext';
import { useWorkspace } from '../../Context/WorkspaceContext';

// Component definition
const Dashboard = () => {
    

    const theme = useTheme();
    
    const navigateTo = useNavigate();

    // Constants
    const apiUrl = config.apiUrl;
    const token = Cookies.get('token');
    const apiUrlNotif = config.apiNotifServer;

    // State variables
    const [ecommAuth, setEcommAuth] = useState(false);
    const [newsAuth, setNewsAuth] = useState(false);
    const [LoadingProfile, setLoadingProfile] = useState(true);
    const [infoUser, setInfoUser] = useState(null);
    const [openNotif, setOpenNotif] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [notifRead, setNotifRead] = useState(false);
    // Sidebar mode: 'open' (always expanded), 'closed' (always collapsed), 'hover' (expand on hover)
    const [menuMode, setMenuMode] = useState(() => {
        return localStorage.getItem('sidebarMode') || 'hover';
    });
    const [hoveringSidebar, setHoveringSidebar] = useState(false);
    const isSidebarOpen = menuMode === 'open' || (menuMode === 'hover' && hoveringSidebar);
    
    // Website selector from context
    const { websites, selectedWebsite, loading: loadingWebsites, selectWebsite, refreshWebsites } = useWebsite();
    const [openWebsiteMenu, setOpenWebsiteMenu] = useState(false);
    const [websiteSearch, setWebsiteSearch] = useState('');
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

    // Workspace selector from context
    const { workspaces, selectedWorkspace, loading: loadingWorkspaces, initialLoading: initialWorkspaceLoading, selectWorkspace } = useWorkspace();
    const [openWorkspaceMenu, setOpenWorkspaceMenu] = useState(false);
    const [openUserMenu, setOpenUserMenu] = useState(false);

    // Context
    const { isDark } = useContext(ThemeContext);

    // Refs
    const anchorRef = useRef(null);
    const websiteMenuRef = useRef(null);
    const workspaceMenuRef = useRef(null);
    const workspaceMenuSidebarRef = useRef(null);
    const userMenuRef = useRef(null);
    const sidebarModeRef = useRef(null);

    // Abonnement du site sélectionné
    const [subscriptionInfo, setSubscriptionInfo] = useState(null);

    // Récupérer l'abonnement du site sélectionné
    useEffect(() => {
        const fetchSubscription = async () => {
            if (selectedWebsite?.id) {
                try {
                    const { data } = await Axios.get(`${apiUrl}/subscription-info/${selectedWebsite.id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setSubscriptionInfo(data.subscription);
                } catch (e) {
                    setSubscriptionInfo(null);
                }
            } else {
                setSubscriptionInfo(null);
            }
        };
        fetchSubscription();
    }, [selectedWebsite, apiUrl, token]);
    // Helper pour formater la date
    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };



    // Effects
    useEffect(() => {
        const fetchAuth = async () => {
            if (selectedWebsite?.id) {
                const isAuthorizedEcom = await checkAuthorization('auth_ecom', selectedWebsite.id);
                setEcommAuth(isAuthorizedEcom);
                const isAuthorisedNews = await checkAuthorization('auth_newsletter', selectedWebsite.id);
                setNewsAuth(isAuthorisedNews);
            } else {
                // Réinitialiser les autorisations si aucun site n'est sélectionné
                setEcommAuth(false);
                setNewsAuth(false);
            }
        };
        if (!loadingWebsites) {
            fetchAuth();
        }
    }, [selectedWebsite, loadingWebsites]);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const response = await Axios.get(`${apiUrl}/getNotifications`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    params: {
                        userId: jwtDecode(Cookies.get('token')).idUser,
                    }
                });
                setNotifications(response.data);
            } catch (error) {
                console.error('Erreur lors de la récupération des notifications:', error);
            }
        };
        fetchNotifications();
    }, [openNotif, notifRead, notifications]);

    useEffect(() => {
        setNotifRead(notifications.some(notification => !notification.is_read));
    }, [notifications]);

    useEffect(() => {
        const fetchUserInfoLocal = async (token) => {
            const response = await fetchUserInfo(token);
            setInfoUser(jwtDecode(response));
        };
        fetchUserInfoLocal(token);
        setLoadingProfile(false);
    }, [token]);

    // Écouter les changements de sidebar depuis les Settings
    useEffect(() => {
        const handleSidebarModeChange = (event) => {
            setMenuMode(event.detail.mode);
        };
        
        window.addEventListener('sidebarModeChanged', handleSidebarModeChange);
        
        return () => {
            window.removeEventListener('sidebarModeChanged', handleSidebarModeChange);
        };
    }, []);

    // Charger les sites web de l'utilisateur - maintenant géré par le contexte
    // Plus besoin de cette logique ici


    useEffect(() => {
      // Vérifier si une session est active
      const checkAndRefreshSession = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            console.log("Pas de session active");
            return;
          }
          const { data, error } = await supabase.auth.refreshSession();
          if (error) throw error;
          if (data && data.session) {
            Cookies.set('token', data.session.access_token, {
              expires: 7,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'Lax'
            });
          }
        } catch (e) {
          console.error("Erreur lors du rafraîchissement périodique:", e);
        }
      };

      checkAndRefreshSession();
      const refreshInterval = setInterval(checkAndRefreshSession, 45 * 60 * 1000);
      return () => clearInterval(refreshInterval);
    }, []);

    // Rafraîchir les sites web quand le workspace sélectionné change
    useEffect(() => {
        if (selectedWorkspace && refreshWebsites) {
            refreshWebsites(selectedWorkspace.id);
        }
    }, [selectedWorkspace?.id, refreshWebsites]);

    // Handlers
    const handleReadNotif = (event) => {
        const notificationId = event.currentTarget.id;
        Axios.post(`${apiUrl}/readNotification`, {
            IdNotif: notificationId,
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        }).then(() => {
            setNotifRead(false);
        });
    };

    const handleOpenNotif = (event) => {
        event.stopPropagation();
        // Fermer les autres poppers avant d'ouvrir celui-ci
        setOpenWebsiteMenu(false);
        setOpenWorkspaceMenu(false);
        setOpenUserMenu(false);
        setOpenNotif((prevOpen) => !prevOpen);
    };

    const handleClickAway = () => {
        setOpenNotif(false);
    };

    const handleCombinedClick = (event) => {
        handleReadNotif(event);
        handleClickAway(event);
    };

    const logoutUser = async () => {
        try {
            // Déconnexion complète (révoque le refresh token sur tous les appareils)
            await supabase.auth.signOut({ scope: 'global' });
        } catch (e) {
            console.error('Erreur de déconnexion Supabase:', e);
        } finally {
            // Nettoyage côté app
            Cookies.remove('token');
            navigateTo('/');
        }
    };

    // Sidebar mode popper
    const [openSidebarModeMenu, setOpenSidebarModeMenu] = useState(false);
    const handleOpenSidebarModeMenu = (e) => {
        e.stopPropagation();
        setOpenSidebarModeMenu(prev => !prev);
    };
    const handleCloseSidebarModeMenu = () => setOpenSidebarModeMenu(false);
    const handleSelectSidebarMode = (mode) => {
        setMenuMode(mode);
        localStorage.setItem('sidebarMode', mode);
        setOpenSidebarModeMenu(false);
    };

    // Fonction pour fermer tous les poppers
    const closeAllPoppers = () => {
        setOpenWebsiteMenu(false);
        setOpenWorkspaceMenu(false);
        setOpenUserMenu(false);
        setOpenNotif(false);
    };

    // Gestion du menu des sites web
    const handleOpenWebsiteMenu = (event) => {
        event.stopPropagation();
        // Fermer les autres poppers avant d'ouvrir celui-ci
        setOpenWorkspaceMenu(false);
        setOpenUserMenu(false);
        setOpenNotif(false);
        setOpenWebsiteMenu((prevOpen) => {
            const next = !prevOpen;
            if (next) {
                setWebsiteSearch(''); // reset à l’ouverture
                // Focus après le rendu du Popper
                setTimeout(() => {
                    if (websiteSearchInputRef.current) {
                        // MUI TextField input element
                        websiteSearchInputRef.current.focus();
                    }
                }, 60);
            }
            return next;
        });
    };

    const handleCloseWebsiteMenu = () => {
        setOpenWebsiteMenu(false);
    };

    const handleSelectWebsite = (website) => {
        selectWebsite(website); // Utiliser la fonction du contexte
        setOpenWebsiteMenu(false);
    };

    const handleCreateWebsite = () => {
        navigateTo('/dashboard/website/create');
        setOpenWebsiteMenu(false);
    };

    const handleWebsiteSettings = () => {
        if (selectedWebsite) {
            navigateTo(`/dashboard/websites`);
            setOpenWebsiteMenu(false);
        }
    };

    // Gestion du menu des workspaces
    const handleOpenWorkspaceMenu = (event) => {
        event.stopPropagation();
        // Fermer les autres poppers avant d'ouvrir celui-ci
        setOpenWebsiteMenu(false);
        setOpenUserMenu(false);
        setOpenNotif(false);
        setOpenWorkspaceMenu((prevOpen) => !prevOpen);
    };

    const handleCloseWorkspaceMenu = () => {
        setOpenWorkspaceMenu(false);
    };

    const handleSelectWorkspace = (workspace) => {
        selectWorkspace(workspace);
        setOpenWorkspaceMenu(false);
    };

    const handleWorkspaceSettings = () => {
        if (selectedWorkspace) {
            navigateTo('/dashboard/workspace');
            setOpenWorkspaceMenu(false);
        }
    };

    // Gestion du menu utilisateur
    const handleOpenUserMenu = (event) => {
        event.stopPropagation();
        setOpenWebsiteMenu(false);
        setOpenWorkspaceMenu(false);
        setOpenNotif(false);
        setOpenUserMenu((prevOpen) => !prevOpen);
    };

    const handleCloseUserMenu = () => {
        setOpenUserMenu(false);
    };

    const handleUserMenuAction = (action) => {
        if (action === 'logout') {
            logoutUser();
        }
        setOpenUserMenu(false);
    };

    const formatDistanceWithoutApprox = (date) => {
        return formatDistance(date, new Date(), {
            addSuffix: true,
            locale: {
                ...fr,
                formatDistance: (token, count, options) => {
                    const result = fr.formatDistance(token, count, options);
                    return result.replace('environ ', '');
                }
            }
        });
    };


    // JSX
    return (
    <div className='dashboard'>
        
        <div className='dashboard_header' style={{backgroundColor: theme.palette.primary.main, boxShadow : theme.palette.shadow.main}}>
            <div className='header_box left'>
                <Logo className="logo" alt="logo" style={{color: theme.palette.text.primary}}/>
                <div className='workspace-selector'>
                                        <IconButton 
                        className='workspace-selector-button'
                        onClick={handleOpenWorkspaceMenu} 
                        ref={workspaceMenuSidebarRef}
                        sx={{ 
                            color: theme.palette.text.primary,
                            padding: '0.5rem !important'
                         }}
                        aria-disabled={loadingWorkspaces}
                    >
                    { (initialWorkspaceLoading || loadingWorkspaces) ? (
                        <SkeletonFullSelector />
                    ) : (
                        <>
                            <PiCube fontSize='1.1rem' style={{color: theme.palette.text.secondary}}/>
                            <span className='workspace-selector-text'>
                                <b>{selectedWorkspace ? selectedWorkspace.workspace_name : 'Aucun workspace'}</b>
                            </span>
                            {selectedWorkspace && (
                                <span className={`workspace-selector-role ${selectedWorkspace.user_role}`}>
                                    {selectedWorkspace.user_role}
                                </span>
                            )}
                            <PiCaretUpDown  fontSize='1rem' style={{color: theme.palette.text.secondary}} />
                        </>
                    )}
                    </IconButton>
                    
                    <ClickAwayListener onClickAway={handleCloseWorkspaceMenu}>
                        <Popper 
                            open={openWorkspaceMenu} 
                            anchorEl={workspaceMenuSidebarRef.current} 
                            transition 
                            placement="bottom-start" 
                            style={{zIndex: 100}}
                        >
                            {({ TransitionProps }) => (
                                <Grow {...TransitionProps} timeout={350}>
                                    <div className='dashboard_case_empty user_menu_case' style={{
                                        backgroundColor: theme.palette.primary.main, 
                                        minWidth: '280px'
                                    }}>
                                        {/* En-tête avec infos workspace */}
                                        <div className='user_menu_header'>
                                            <div className='user_info_section'>
                                                <div className='user_profile_info'>
                                                    <div className='user_details'>
                                                        <div className='user_name_large' style={{ color: theme.palette.text.primary }}>
                                                            <b>Workspaces</b>
                                                        </div>
                                                        <div className='user_email' style={{ color: theme.palette.text.secondary }}>
                                                            Sélectionner un workspace
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="line_horizontal" style={{ backgroundColor: theme.palette.primary.third }}></div>
                                        
                                        {/* Liste des workspaces */}
                                        <div className='user_menu_actions'>
                                            {loadingWorkspaces ? (
                                                <SkeletonMenuList lines={4} />
                                            ) : workspaces.length === 0 ? (
                                                <div className='user_action_item' style={{ color: theme.palette.text.secondary }}>
                                                    Aucun workspace disponible
                                                </div>
                                            ) : (
                                                workspaces.map((workspace) => (
                                                    <div
                                                        key={workspace.id}
                                                        className={`user_action_item ${selectedWorkspace?.id === workspace.id ? 'selected' : ''}`}
                                                        onClick={() => handleSelectWorkspace(workspace)}
                                                        style={{
                                                            color: theme.palette.text.primary
                                                        }}
                                                    >
                                                        <div className='button-selector'>
                                                            <div><b>{workspace.workspace_name}</b></div>
                                                            <div style={{ color: theme.palette.text.secondary, fontSize: '0.8rem' }}>
                                                                {workspace.user_role}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                            
                                            <div className="line_horizontal" style={{ backgroundColor: theme.palette.primary.third }}></div>
                                        </div>
                                        {/* Actions */}
                                        {selectedWorkspace && (
                                            <div 
                                                className='user_action_item'
                                                onClick={handleWorkspaceSettings}
                                                style={{ color: theme.palette.text.primary }}
                                            >
                                                <PiGear className='action_icon' />
                                                <span>Gérer les workspaces</span>
                                            </div>
                                        )}
                                    </div>
                                </Grow>
                            )}
                        </Popper>
                    </ClickAwayListener>
                </div>
            </div>
            {/* Affichage de l'annonce d'annulation d'abonnement si besoin */}
            {subscriptionInfo?.cancel_at_period_end && (
                <AlertBanner severity="warning" >
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        Votre abonnement sera annulé le {formatDate(subscriptionInfo.next_invoice_date || subscriptionInfo.current_period_end)}
                    </Typography>
                </AlertBanner>
            )}
            <div className='header_box right'>
                <IconButton key='menu' style={{ color: theme.palette.text.primary }}  onClick={handleOpenNotif} ref={anchorRef}>
                    <Badge color="error" variant="dot" invisible={!notifRead}>
                        <PiBell fontSize='1.3rem' />
                    </Badge>
                </IconButton>
                {/* Menu utilisateur */}
                <div className='user-profile-selector'>
                    <IconButton 
                        className='user-profile-button'
                        onClick={handleOpenUserMenu} 
                        ref={userMenuRef}
                        style={{ padding: '4px' }}
                    >
                        {LoadingProfile ? (
                            <Avatar alt="Avatar par défaut" className='profile_photo_header' />
                        ) : (
                            infoUser && infoUser.image && infoUser.image[0] && infoUser.image[0].src_profile_image ? (
                                <img src={getProfileImageUrl(infoUser.image[0].src_profile_image)} className='profile_photo_header' alt="Profile" />
                            ) : (
                                <Avatar alt="Avatar par défaut" className='profile_photo_header' />
                            )
                        )}
                    </IconButton>
                    
                    <ClickAwayListener onClickAway={handleCloseUserMenu}>
                        <Popper 
                            open={openUserMenu} 
                            anchorEl={userMenuRef.current} 
                            transition 
                            placement="bottom-end" 
                            style={{zIndex: 100}}
                        >
                            {({ TransitionProps }) => (
                                <Grow {...TransitionProps} timeout={350}>
                                    <div className='dashboard_case_empty user_menu_case' style={{
                                        backgroundColor: theme.palette.primary.main, 
                                        minWidth: '280px'
                                    }}>
                                        {/* En-tête avec infos utilisateur */}
                                        <div className='user_menu_header'>
                                            <div className='user_info_section'>
                                                {LoadingProfile ? (
                                                    <SkeletonProfile />
                                                ) : (
                                                    <div className='user_profile_info'>
                                                        <div className='user_avatar_large'>
                                                            {infoUser && infoUser.image && infoUser.image[0] && infoUser.image[0].src_profile_image ? (
                                                                <img src={getProfileImageUrl(infoUser.image[0].src_profile_image)} className='profile_photo_large' alt="Profile" />
                                                            ) : (
                                                                <Avatar alt="Avatar par défaut" className='profile_photo_large' />
                                                            )}
                                                        </div>
                                                        <div className='user_details'>
                                                            {infoUser && infoUser.user && infoUser.user[0] && (
                                                                <>
                                                                    <p className='user_name_large' style={{ color: theme.palette.text.primary, marginBottom: "0" }}>
                                                                        {infoUser.user[0].username}
                                                                    </p>
                                                                    <p className='user_email' style={{ color: theme.palette.text.secondary ,marginBottom:"0"}}>
                                                                        {infoUser.user[0].email}
                                                                    </p>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="line_horizontal" style={{ backgroundColor: theme.palette.primary.third }}></div>
                                        
                                        {/* Actions du menu */}
                                        <div className='user_menu_actions'>
                                            <Link 
                                                to='/dashboard/account' 
                                                className='user_action_item'
                                                onClick={() => handleUserMenuAction('account')}
                                                style={{ color: theme.palette.text.primary }}
                                            >
                                                <PiUser className='action_icon' />
                                                <span>Mon Compte</span>
                                            </Link>
                                            
                                            <Link 
                                                to="/dashboard/settings" 
                                                className='user_action_item'
                                                onClick={() => handleUserMenuAction('settings')}
                                                style={{ color: theme.palette.text.primary }}
                                            >
                                                <PiGear className='action_icon' />
                                                <span>Paramètres</span>
                                            </Link>
                                            
                                            <div className="line_horizontal" style={{ backgroundColor: theme.palette.primary.third }}></div>
                                            
                                            <button 
                                                onClick={() => handleUserMenuAction('logout')}
                                                className='user_action_item logout_action'
                                                style={{ color: theme.palette.error.main }}
                                            >
                                                <PiPower className='action_icon' />
                                                <span>Déconnexion</span>
                                            </button>
                                        </div>
                                    </div>
                                </Grow>
                            )}
                        </Popper>
                    </ClickAwayListener>
                </div>
                
                <ClickAwayListener onClickAway={handleClickAway}>
                <Popper open={openNotif} anchorEl={anchorRef.current} transition placement="bottom-end" style={{zIndex:100}}>
                {({ TransitionProps }) => (
                  <Grow {...TransitionProps} timeout={350}>
                        <div className='dashboard_case_empty notification_case' style={{backgroundColor : theme.palette.primary.main, boxShadow : theme.palette.shadow.main,}}>
                            <div className='notification_title_contain'>
                                <p><b>Notifications</b></p>
                                <p className='notification_time' style={{color:theme.palette.text.secondary}}></p>
                            </div>
                            <div className="line_horizontal notification_line" style={{ backgroundColor: theme.palette.primary.third }}></div>
                            <div className='notification_contain'>
                                {notifications.length === 0 && <div className='notification_box'><div className='notification_text'>Aucune notification</div></div>}
                                {notifications.map((notification, index) => (
                                    <motion.div
                                        style={{display: 'relative'}}
                                        key={notification.id_notif}
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ 
                                            opacity: 1, 
                                            height: '6.9rem',
                                            transition: { 
                                                type:"spring",
                                                bounce: 0.25, 
                                                opacity: { delay: 0.25 }, 
                                            } 
                                        }}
                                    >
                                        <NavLink key={index} to={`${notificationLink(notification.type)}${notification.id_element}`} onClick={handleCombinedClick} id={notification.id_notif} className={`${notification.isNew ? 'new-notification' : 'old-notification'}`}>
                                            <div className={`notification_box`} style={{backgroundColor: notification.is_read ? 'transparent' : 'rgba(var(--primary-color-rgb), 0.2)', color : theme.palette.text.primary}}>                                                    
                                                <div className='notification_headers'>
                                                    <div><b>{notificationTitle(notification.type)}</b></div>
                                                    <div className='notification_time' style={{color:theme.palette.text.secondary}}>{formatDistanceWithoutApprox(new Date(notification.date))}</div>
                                                </div>
                                                <div className='notification_text'>{notification.message}</div>
                                                <div className='notification_read_marge' style={{display: notification.is_read ? 'none' : 'block'}}/>                                                    
                                            </div>
                                            <div className="line_horizontal notification_line" style={{ backgroundColor: theme.palette.primary.third }}/>
                                        </NavLink>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                  </Grow>
                )}
                </Popper>
                </ClickAwayListener>
            </div>
        </div>
        <div className='dashboard_wrapper'>
            <AnimatePresence initial={false}>
                <motion.div 
                    className="menu_dashboard" 
                    animate={{width: isSidebarOpen ? "15rem" : "4rem"}} 
                    style={{
                        backgroundColor: theme.palette.primary.main, 
                        boxShadow : theme.palette.shadow.main,
                        position: menuMode === 'hover' ? 'absolute' : 'relative',
                        zIndex: menuMode === 'hover' ? 50 : 'auto'
                    }}
                    onMouseEnter={() => setHoveringSidebar(true)}
                    onMouseLeave={() => setHoveringSidebar(false)}
                >
                    <div className='navigation'>
                        <NavLink key="home" to='/dashboard/home' className={({ isActive }) => (isActive ? 'menuDashboard menuActive' : 'menuDashboard')}>
                            <AnimatePresence initial={false}>
                                <motion.div className={isSidebarOpen ? "link menu_link open_link_menu" : "link menu_link close_link_menu"} style={{color: theme.palette.text.secondary}}>
                                    <motion.div animate={{marginRight: isSidebarOpen ? "0.5rem" : "0rem"}} className='icon_navigation'><PiHouse fontSize='1.2rem'/></motion.div>
                                    <motion.span className={isSidebarOpen ? "menu_text_open" : "menu_text_close"}>Accueil</motion.span>
                                </motion.div>
                            </AnimatePresence>
                        </NavLink>
                        <NavLink key="websites" to='/dashboard/website' className={({ isActive }) => (isActive ? 'menuDashboard menuActive' : 'menuDashboard')}>
                            <AnimatePresence initial={false}>
                                <motion.div className={isSidebarOpen ? "link menu_link open_link_menu" : "link menu_link close_link_menu"} style={{color: theme.palette.text.secondary}}>
                                    <motion.div animate={{marginRight: isSidebarOpen ? "0.5rem" : "0rem"}} className='icon_navigation'><PiGlobe fontSize='1.2rem'/></motion.div>
                                    <motion.span className={isSidebarOpen ? "menu_text_open" : "menu_text_close"}>Sites Web</motion.span>
                                </motion.div>
                            </AnimatePresence>
                        </NavLink>
                        <div className='line-sidebar'></div>
                        <NavLink key="actu" to='/dashboard/actu/' className={({ isActive }) => (isActive ? 'menuDashboard menuActive' : 'menuDashboard')}>
                            <AnimatePresence initial={false}>
                                <motion.div className={isSidebarOpen ? "link menu_link open_link_menu" : "link menu_link close_link_menu"} style={{color: theme.palette.text.secondary}}>
                                    <motion.div animate={{marginRight: isSidebarOpen ? "0.5rem" : "0rem"}} className='icon_navigation'><PiArticle fontSize='1.2rem'/></motion.div>
                                    <motion.span className={isSidebarOpen ? "menu_text_open" : "menu_text_close"}>Actualités</motion.span>
                                </motion.div>
                            </AnimatePresence>
                        </NavLink>
                        <NavLink key="academy" to='/dashboard/academy' className={({ isActive }) => (isActive ? 'menuDashboard menuActive' : 'menuDashboard')}>
                            <AnimatePresence initial={false}>
                                <motion.div className={isSidebarOpen ? "link menu_link open_link_menu" : "link menu_link close_link_menu"} style={{color: theme.palette.text.secondary}}>
                                    <motion.div animate={{marginRight: isSidebarOpen ? "0.5rem" : "0rem"}} className='icon_navigation'><PiGraduationCap  fontSize='1.2rem'/></motion.div>
                                    <motion.span className={isSidebarOpen ? "menu_text_open" : "menu_text_close"}>Academy</motion.span>
                                </motion.div>
                            </AnimatePresence>
                        </NavLink>
                        <a key="probleme" href="https://form.asana.com/?k=JsNZ1O1QUSj9-SQSslLlHg&d=1208509146074291" className='menuDashboard'>
                            <AnimatePresence initial={false}>
                                <motion.div className={isSidebarOpen ? "link menu_link open_link_menu" : "link menu_link close_link_menu"} style={{color: theme.palette.text.secondary}}>
                                    <motion.div animate={{marginRight: isSidebarOpen ? "0.5rem" : "0rem"}} className='icon_navigation'><PiQuestion fontSize='1.2rem'/></motion.div>
                                    <motion.span className={isSidebarOpen ? "menu_text_open" : "menu_text_close"}>Un problème ?</motion.span>
                                </motion.div>
                            </AnimatePresence>
                        </a>
                                
                    </div>
                    <div className='menu_footer'>
                        <IconButton 
                            ref={sidebarModeRef} 
                            onClick={handleOpenSidebarModeMenu} 
                            sx={{ color: theme.palette.text.primary, padding: '0.35rem !important' }}
                        >
                            <PiSidebarSimpleLight fontSize='1.2rem' style={{color: theme.palette.text.secondary}}/>
                        </IconButton>
                        <ClickAwayListener onClickAway={handleCloseSidebarModeMenu}>
                            <Popper 
                                open={openSidebarModeMenu} 
                                anchorEl={sidebarModeRef.current} 
                                transition 
                                placement="top-start" 
                                style={{zIndex: 120}}
                            >
                                {({ TransitionProps }) => (
                                    <Grow {...TransitionProps} timeout={250}>
                                        <div className='dashboard_case_empty user_menu_case' style={{ backgroundColor: theme.palette.primary.main, minWidth: '13rem' }}>
                                            <div className='user_menu_header'>
                                                <div className='user_details'>
                                                    <div style={{ color: theme.palette.text.primary, fontSize: '0.85rem' }}>
                                                        <b>Mode sidebar</b>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="line_horizontal" style={{ backgroundColor: theme.palette.primary.third }}></div>
                                            <div className='user_menu_actions'>
                                                <div className={"user_action_item action-side-bar" + (menuMode === 'open' ? ' selected' : '')} onClick={() => handleSelectSidebarMode('open')} style={{ color: theme.palette.text.primary }}>
                                                    Ouvert
                                                    {menuMode === 'open' ? <CheckIcon fontSize='small'/> : ''}
                                                </div>
                                                <div className={"user_action_item action-side-bar" + (menuMode === 'closed' ? ' selected' : '')} onClick={() => handleSelectSidebarMode('closed')} style={{ color: theme.palette.text.primary }}>
                                                    Fermé
                                                    {menuMode === 'closed' ? <CheckIcon fontSize='small'/> : ''}
                                                </div>
                                                <div className={"user_action_item action-side-bar" + (menuMode === 'hover' ? ' selected' : '')} onClick={() => handleSelectSidebarMode('hover')} style={{ color: theme.palette.text.primary }}>
                                                    Ouvrir au survol
                                                    {menuMode === 'hover' ? <CheckIcon fontSize='small'/> : ''}
                                                </div>
                                            </div>
                                        </div>
                                    </Grow>
                                )}
                            </Popper>
                        </ClickAwayListener>
                    </div>
                </motion.div>
            </AnimatePresence>
            <AnimatePresence initial={false}>
                <motion.div 
                    className='dashboard_page' 
                    animate={{
                        width: menuMode === 'hover' 
                            ? "calc(100% - 4rem)" 
                            : (isSidebarOpen ? "calc(100% - 15rem)" : "calc(100% - 4rem)"),
                        marginLeft: menuMode === 'hover' ? "4rem" : "0"
                    }}
                >
                    <div className='dashboard_section principal'>
                        
                        <Outlet />
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    </div>
    );
};

export default Dashboard;