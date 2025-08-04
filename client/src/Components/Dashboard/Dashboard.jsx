// External libraries
import React, { useState, useEffect, useContext, useRef } from 'react';
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

// Icons
import { BsChevronCompactDown } from "react-icons/bs";

import { PiLockBold, PiUserBold, PiGearSixBold, PiPowerBold, PiChatCircleDotsBold, PiBellBold, PiFunnelSimpleBold, PiPlusBold } from "react-icons/pi";
import { LuMoon, LuSun } from "react-icons/lu";
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
// Internal imports
import './Dashboard.css';
import Logo from '../../assets/icon/logo.svg?react';
import config from '../../config';
import { SkeletonProfile } from '../skeleton/skeleton';
import ThemeContext from '../../Theme/themeContext';
import { notificationTitle, notificationLink } from '../../Theme/element';
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
    const [open_menu, setopen_menu] = useState(true);
    
    // Website selector from context
    const { websites, selectedWebsite, loading: loadingWebsites, selectWebsite, refreshWebsites } = useWebsite();
    const [openWebsiteMenu, setOpenWebsiteMenu] = useState(false);

    // Workspace selector from context
    const { workspaces, selectedWorkspace, loading: loadingWorkspaces, selectWorkspace } = useWorkspace();
    const [openWorkspaceMenu, setOpenWorkspaceMenu] = useState(false);
    const [openUserMenu, setOpenUserMenu] = useState(false);

    // Context
    const { isDark, toggleTheme } = useContext(ThemeContext);

    // Refs
    const anchorRef = useRef(null);
    const websiteMenuRef = useRef(null);
    const workspaceMenuRef = useRef(null);
    const workspaceMenuSidebarRef = useRef(null);
    const userMenuRef = useRef(null);

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
        setOpenNotif((prevOpen) => !prevOpen);
    };

    const handleClickAway = () => {
        setOpenNotif(false);
    };

    const handleCombinedClick = (event) => {
        handleReadNotif(event);
        handleClickAway(event);
    };

    const logoutUser = () => {
        Cookies.remove('token');
        navigateTo('/');
    };

    const toggle_menu = () => {
        setopen_menu(!open_menu);
    };

    // Gestion du menu des sites web
    const handleOpenWebsiteMenu = (event) => {
        event.stopPropagation();
        setOpenWebsiteMenu((prevOpen) => !prevOpen);
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
            navigateTo(`/dashboard/website/${selectedWebsite.id}/settings`);
            setOpenWebsiteMenu(false);
        }
    };

    // Gestion du menu des workspaces
    const handleOpenWorkspaceMenu = (event) => {
        event.stopPropagation();
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
            </div>
            <div className='header_box right'>
                <Checkbox key='theme' style={{ color: theme.palette.text.primary }} checked={isDark} onChange={toggleTheme} icon={<LuMoon className='icon' />} checkedIcon={<LuSun  className='icon'/>}/>
            
                <IconButton key='menu' style={{ color: theme.palette.text.primary }}  onClick={handleOpenNotif} ref={anchorRef}>
                    <Badge color="error" variant="dot" invisible={!notifRead}>
                        <PiBellBold className='icon' />
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
                                <img src={`${apiUrl}/media/profile/${infoUser.image[0].src_profile_image}`} className='profile_photo_header' alt="Profile" />
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
                                                                <img src={`${apiUrl}/media/profile/${infoUser.image[0].src_profile_image}`} className='profile_photo_large' alt="Profile" />
                                                            ) : (
                                                                <Avatar alt="Avatar par défaut" className='profile_photo_large' />
                                                            )}
                                                        </div>
                                                        <div className='user_details'>
                                                            {infoUser && infoUser.user && infoUser.user[0] && (
                                                                <>
                                                                    <div className='user_name_large' style={{ color: theme.palette.text.primary }}>
                                                                        <b>{infoUser.user[0].username}</b>
                                                                    </div>
                                                                    <div className='user_email' style={{ color: theme.palette.text.secondary }}>
                                                                        {infoUser.user[0].email}
                                                                    </div>
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
                                                <PiUserBold className='action_icon' />
                                                <span>Mon Compte</span>
                                            </Link>
                                            
                                            <Link 
                                                to="/dashboard/parameter" 
                                                className='user_action_item'
                                                onClick={() => handleUserMenuAction('settings')}
                                                style={{ color: theme.palette.text.primary }}
                                            >
                                                <PiGearSixBold className='action_icon' />
                                                <span>Paramètres</span>
                                            </Link>
                                            
                                            <div className="line_horizontal" style={{ backgroundColor: theme.palette.primary.third }}></div>
                                            
                                            <button 
                                                onClick={() => handleUserMenuAction('logout')}
                                                className='user_action_item logout_action'
                                                style={{ color: theme.palette.error.main }}
                                            >
                                                <PiPowerBold className='action_icon' />
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
                <motion.div className="menu_dashboard" animate={{width: open_menu ? "15rem" : "3rem"}} style={{backgroundColor: theme.palette.primary.main, boxShadow : theme.palette.shadow.main}}>
                    {/* Sélecteur de site web */}
                    <div className='website-selector'>
                        <IconButton 
                            className='website-selector-button'
                            onClick={handleOpenWebsiteMenu} 
                            ref={websiteMenuRef}
                            sx={{ 
                                color: theme.palette.text.primary, 
                                padding: '0.5rem !important'
                            }}
                            disabled={loadingWebsites}
                        >
                            <div>
                                
                            </div>
                            <LanguageIcon fontSize='small' style={{color: theme.palette.text.secondary}}/>
                            <span className='website-selector-text'>
                                <b>{selectedWebsite ? selectedWebsite.website_name : 'Aucun site sélectionné'}</b>   
                            </span>
                            {selectedWebsite && (
                                <span className={`website-selector-role ${selectedWebsite.user_role}`}>
                                    {selectedWebsite.user_role}
                                </span>
                            )}
                            <UnfoldMoreIcon className='icon' style={{color: theme.palette.text.secondary}} />
                        </IconButton>
                        
                        <ClickAwayListener onClickAway={handleCloseWebsiteMenu}>
                            <Popper 
                                open={openWebsiteMenu} 
                                anchorEl={websiteMenuRef.current} 
                                transition 
                                placement="bottom-start" 
                                style={{zIndex: 100}}
                            >
                                {({ TransitionProps }) => (
                                    <Grow {...TransitionProps} timeout={350}>
                                        <div className='dashboard_case_empty website_menu_case' style={{
                                            backgroundColor: theme.palette.primary.main, 
                                            minWidth: '250px'
                                        }}>
                                            <div className='website_menu_title_contain'>
                                                <p style={{ color: theme.palette.text.primary }}>
                                                    <b>Sélectionner un site</b>
                                                </p>
                                            </div>
                                            <div className="line_horizontal" style={{ backgroundColor: theme.palette.primary.third }}></div>

                                            {/* Liste des sites */}
                                            <div className='website_list_contain'>
                                                {loadingWebsites ? (
                                                    <div className='website_item' style={{ color: theme.palette.text.secondary }}>
                                                        Chargement...
                                                    </div>
                                                ) : websites.length === 0 ? (
                                                    <div className='website_item' style={{ color: theme.palette.text.secondary }}>
                                                        Aucun site web disponible
                                                    </div>
                                                ) : (
                                                    websites.map((website) => (
                                                        <div
                                                            key={website.id}
                                                            className={`website_item ${selectedWebsite?.id === website.id ? 'selected' : ''}`}
                                                            onClick={() => handleSelectWebsite(website)}
                                                            style={{
                                                                color: theme.palette.text.primary
                                                            }}
                                                        >
                                                            <div className='website_info'>
                                                                <div className='website_name'>{website.website_name}</div>
                                                                <div className='website_role' style={{ color: theme.palette.text.secondary }}>
                                                                    {website.user_role}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                            
                                            <div className="line_horizontal" style={{ backgroundColor: theme.palette.primary.third }}></div>
                                            
                                            {/* Actions */}
                                            <div className='website_actions_contain'>
                                                <div 
                                                    className='website_action_item'
                                                    onClick={handleCreateWebsite}
                                                    style={{ color: theme.palette.text.primary }}
                                                >
                                                    <PiPlusBold className='action_icon' />
                                                    <span>Créer un nouveau site</span>
                                                </div>

                                                {selectedWebsite && selectedWebsite.user_role === 'admin' && (
                                                    <div 
                                                        className='website_action_item'
                                                        onClick={handleWebsiteSettings}
                                                        style={{ color: theme.palette.text.primary }}
                                                    >
                                                        <PiGearSixBold className='action_icon' />
                                                        <span>Paramètres du site</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </Grow>
                                )}
                            </Popper>
                        </ClickAwayListener>
                    </div>
                    <div className='workspace-selector'>
                        <IconButton 
                            className='workspace-selector-button'
                            onClick={handleOpenWorkspaceMenu} 
                            ref={workspaceMenuSidebarRef}
                            sx={{ 
                                color: theme.palette.text.primary,
                                padding: '0.5rem !important'
                             }}
                            disabled={loadingWorkspaces}
                        >
                            <WorkspacesIcon fontSize='small' style={{color: theme.palette.text.secondary}}/>
                            <span className='workspace-selector-text'>
                                <b>{selectedWorkspace ? selectedWorkspace.workspace_name : 'Aucun workspace'}</b>   
                            </span>
                            <UnfoldMoreIcon className='icon' style={{color: theme.palette.text.secondary}} />
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
                                        <div className='dashboard_case_empty workspace_menu_case' style={{
                                            backgroundColor: theme.palette.primary.main, 
                                            minWidth: '250px'
                                        }}>
                                            <div className='workspace_menu_title_contain'>
                                                <p style={{ color: theme.palette.text.primary }}>
                                                    <b>Sélectionner un workspace</b>
                                                </p>
                                            </div>
                                            <div className="line_horizontal" style={{ backgroundColor: theme.palette.primary.third }}></div>

                                            {/* Liste des workspaces */}
                                            <div className='workspace_list_contain'>
                                                {loadingWorkspaces ? (
                                                    <div className='workspace_item' style={{ color: theme.palette.text.secondary }}>
                                                        Chargement...
                                                    </div>
                                                ) : workspaces.length === 0 ? (
                                                    <div className='workspace_item' style={{ color: theme.palette.text.secondary }}>
                                                        Aucun workspace disponible
                                                    </div>
                                                ) : (
                                                    workspaces.map((workspace) => (
                                                        <div
                                                            key={workspace.id}
                                                            className={`workspace_item ${selectedWorkspace?.id === workspace.id ? 'selected' : ''}`}
                                                            onClick={() => handleSelectWorkspace(workspace)}
                                                            style={{
                                                                color: theme.palette.text.primary
                                                            }}
                                                        >
                                                            <div className='workspace_info'>
                                                                <div className='workspace_name'><b>{workspace.workspace_name}</b></div>
                                                                <div className='workspace_role' style={{ color: theme.palette.text.secondary }}>
                                                                    {workspace.user_role}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                            
                                            <div className="line_horizontal" style={{ backgroundColor: theme.palette.primary.third }}></div>
                                            
                                            {/* Actions */}
                                            <div className='workspace_actions_contain'>
                                                {selectedWorkspace && (
                                                    <div 
                                                        className='workspace_action_item'
                                                        onClick={handleWorkspaceSettings}
                                                        style={{ color: theme.palette.text.primary }}
                                                    >
                                                        <PiGearSixBold className='action_icon' />
                                                        <span>Gérer les workspaces</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </Grow>
                                )}
                            </Popper>
                        </ClickAwayListener>
                    </div>
                    <div className='navigation'>
                        <NavLink key="home" to='/dashboard/home' className={({ isActive }) => (isActive ? 'menuActive' : '')}>
                            <AnimatePresence initial={false}>
                                <motion.div className={open_menu ? "link menu_link open_link_menu" : "link menu_link close_link_menu"} style={{color: theme.palette.text.secondary}}>
                                    <motion.div animate={{marginRight: open_menu ? "0.5rem" : "0rem"}} className='icon_navigation'><HomeOutlinedIcon fontSize='small'/></motion.div>
                                    <motion.span className={open_menu ? "menu_text_open" : "menu_text_close"}>Accueil</motion.span>
                                </motion.div>
                            </AnimatePresence>
                        </NavLink>
                        <NavLink key="websites" to='/dashboard/websites' className={({ isActive }) => (isActive ? 'menuActive' : '')}>
                            <AnimatePresence initial={false}>
                                <motion.div className={open_menu ? "link menu_link open_link_menu" : "link menu_link close_link_menu"} style={{color: theme.palette.text.secondary}}>
                                    <motion.div animate={{marginRight: open_menu ? "0.5rem" : "0rem"}} className='icon_navigation'><LanguageIcon fontSize='small'/></motion.div>
                                    <motion.span className={open_menu ? "menu_text_open" : "menu_text_close"}>Sites web</motion.span>
                                </motion.div>
                            </AnimatePresence>
                        </NavLink>
                        <div className='menu_title'><p className='menu_title_text' style={{color: theme.palette.text.primary}}>GÉRER MON SITE</p></div>
                        <NavLink key="modification" to='/dashboard/modification' className={({ isActive }) => (isActive ? 'menuActive' : '')}>
                            <AnimatePresence initial={false}>
                                <motion.div className={open_menu ? "link menu_link open_link_menu" : "link menu_link close_link_menu"} style={{color: theme.palette.text.secondary}}>
                                    <motion.div animate={{marginRight: open_menu ? "0.5rem" : "0rem"}} className='icon_navigation'><CreateOutlinedIcon fontSize='small'/></motion.div>
                                    <motion.span className={open_menu ? "menu_text_open" : "menu_text_close"}>Modifications</motion.span>
                                </motion.div>
                            </AnimatePresence>
                        </NavLink>
                        <NavLink key="ecommerce" to={ecommAuth === true ? '/dashboard/ecommerce' : '#'} className={({ isActive, ecommAuth }) => (isActive, ecommAuth ? 'menuActive' : '')}>
                            <AnimatePresence initial={false}>
                                <motion.div className={open_menu ? "link menu_link open_link_menu" : "link menu_link close_link_menu"} style={{color: theme.palette.text.secondary}}>
                                    <motion.div animate={{marginRight: open_menu ? "0.5rem" : "0rem"}} className='icon_navigation'><ShoppingCartOutlinedIcon fontSize='small'/></motion.div>
                                    <motion.span className={open_menu ? "menu_text_open" : "menu_text_close"}>E-commerce</motion.span>
                                    {
                                        ecommAuth === true ? (
                                            null
                                        ) : <motion.div animate={{marginRight: open_menu ? "1.5rem" : "0rem", marginLeft: open_menu ? "1rem" : "0.5rem"}} style={{color: theme.palette.text.secondary}} className='icon_navigation icon_lock'><PiLockBold /></motion.div>
                                    }
                                </motion.div>
                            </AnimatePresence>
                        </NavLink>
                        <NavLink key="stats" to='/dashboard/stats' className={({ isActive }) => (isActive ? 'menuActive' : '')}>
                            <AnimatePresence initial={false}>
                                <motion.div className={open_menu ? "link menu_link open_link_menu" : "link menu_link close_link_menu"} style={{color: theme.palette.text.secondary}}>
                                    <motion.div animate={{marginRight: open_menu ? "0.5rem" : "0rem"}} className='icon_navigation'><EqualizerOutlinedIcon fontSize='small'/></motion.div>
                                    <motion.span className={open_menu ? "menu_text_open" : "menu_text_close"}>Statistiques</motion.span>
                                </motion.div>
                            </AnimatePresence>
                        </NavLink>
                        <NavLink key="contact" to='/dashboard/contact' className={({ isActive }) => (isActive ? 'menuActive' : '')}>
                            <AnimatePresence initial={false}>
                                <motion.div className={open_menu ? "link menu_link open_link_menu" : "link menu_link close_link_menu"} style={{color: theme.palette.text.secondary}}>
                                    <motion.div animate={{marginRight: open_menu ? "0.5rem" : "0rem"}} className='icon_navigation'><PiChatCircleDotsBold  /></motion.div>
                                    <motion.span className={open_menu ? "menu_text_open" : "menu_text_close"}>Contacts</motion.span>
                                </motion.div>
                            </AnimatePresence>
                        </NavLink>
                        <NavLink key="newsletter" to={newsAuth === true ? '/dashboard/newsletter' : '#'} className={({ isActive }) => (isActive && newsAuth === true ? 'menuActive' : '')}>
                            <AnimatePresence initial={false}>
                                <motion.div className={open_menu ? "link menu_link open_link_menu" : "link menu_link close_link_menu"} style={{color: theme.palette.text.secondary}}>
                                    <motion.div animate={{marginRight: open_menu ? "0.5rem" : "0rem"}} className='icon_navigation'><NewspaperOutlinedIcon fontSize='small'/></motion.div>
                                    <motion.span className={open_menu ? "menu_text_open" : "menu_text_close"}>Newsletter</motion.span>
                                    {
                                        newsAuth === true ? (
                                            null
                                        ) : <motion.div animate={{marginRight: open_menu ? "1.5rem" : "0rem", marginLeft: open_menu ? "1rem" : "0.5rem"}} style={{color: theme.palette.text.secondary}} className='icon_navigation icon_lock'><PiLockBold /></motion.div>
                                    }
                                </motion.div>
                            </AnimatePresence>

                        </NavLink>
                        <div className='menu_title'><p className='menu_title_text' style={{color: theme.palette.text.primary}}>WENOBLE</p></div>
                        <NavLink key="actu" to='/dashboard/actu/' className={({ isActive }) => (isActive ? 'menuActive' : '')}>
                            <AnimatePresence initial={false}>
                                <motion.div className={open_menu ? "link menu_link open_link_menu" : "link menu_link close_link_menu"} style={{color: theme.palette.text.secondary}}>
                                    <motion.div animate={{marginRight: open_menu ? "0.5rem" : "0rem"}} className='icon_navigation'><ArticleOutlinedIcon fontSize='small'/></motion.div>
                                    <motion.span className={open_menu ? "menu_text_open" : "menu_text_close"}>Actualités</motion.span>
                                </motion.div>
                            </AnimatePresence>
                        </NavLink>
                        <NavLink key="academy" to='/dashboard/academy' className={({ isActive }) => (isActive ? 'menuActive' : '')}>
                            <AnimatePresence initial={false}>
                                <motion.div className={open_menu ? "link menu_link open_link_menu" : "link menu_link close_link_menu"} style={{color: theme.palette.text.secondary}}>
                                    <motion.div animate={{marginRight: open_menu ? "0.5rem" : "0rem"}} className='icon_navigation'><SchoolOutlinedIcon fontSize='small'/></motion.div>
                                    <motion.span className={open_menu ? "menu_text_open" : "menu_text_close"}>Academy</motion.span>
                                </motion.div>
                            </AnimatePresence>
                        </NavLink>
                        <NavLink key="probleme" to='/dashboard/problem' className={({ isActive }) => (isActive ? 'menuActive' : '')}>
                            <AnimatePresence initial={false}>
                                <motion.div className={open_menu ? "link menu_link open_link_menu" : "link menu_link close_link_menu"} style={{color: theme.palette.text.secondary}}>
                                    <motion.div animate={{marginRight: open_menu ? "0.5rem" : "0rem"}} className='icon_navigation'><HelpOutlineOutlinedIcon fontSize='small'/></motion.div>
                                    <motion.span className={open_menu ? "menu_text_open" : "menu_text_close"}>Un problème ?</motion.span>
                                </motion.div>
                            </AnimatePresence>
                        </NavLink>
                                
                    </div>
                    <div className='menu_footer'>
                        <Checkbox key='menu' style={{ color: theme.palette.text.primary }} checked={open_menu} onChange={toggle_menu} icon={<ExitToAppRoundedIcon className='icon' style={{color: theme.palette.text.secondary}}/>} checkedIcon={<ExitToAppRoundedIcon className='icon' style={{color: theme.palette.text.secondary, transform: 'rotate(180deg)'}}/>}/>
                    </div>
                </motion.div>
            </AnimatePresence>
            <AnimatePresence initial={false}>
                <motion.div className='dashboard_page' animate={{width : open_menu ? "calc(100% - 15rem)" : "calc(100% - 3rem)"}}>
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