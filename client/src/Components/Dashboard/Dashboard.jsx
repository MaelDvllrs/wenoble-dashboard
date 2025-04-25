import React, { useState, useEffect, useContext, useRef  } from 'react';
import Axios from 'axios';
import {jwtDecode} from 'jwt-decode'; 
import Cookies from 'js-cookie';
import './Dashboard.css';
import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion'
import { BsChevronCompactDown } from "react-icons/bs";
import { PiLockBold, PiUserBold, PiGearSixBold, PiPowerBold, PiHouseBold, PiChartBarBold, PiPencilSimpleBold, PiNewspaperBold, PiFunnelSimpleBold, PiShoppingCartSimpleBold, PiQuestionBold, PiChatCircleDotsBold, PiBellBold, PiNewspaperClippingBold } from "react-icons/pi";
import { LuMoon, LuSun } from "react-icons/lu";
import { HiOutlineAcademicCap } from "react-icons/hi";
import CreateOutlinedIcon from '@mui/icons-material/CreateOutlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import EqualizerOutlinedIcon from '@mui/icons-material/EqualizerOutlined';
import NewspaperOutlinedIcon from '@mui/icons-material/NewspaperOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';

import Logo from "../../assets/icon/logo.svg?react"; 
import config from '../../config';
import { SkeletonProfile } from '../skeleton/skeleton';
import ThemeContext from '../../Theme/themeContext';
import { useTheme } from '@mui/material/styles';
import Checkbox from '@mui/material/Checkbox';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import Popper  from '@mui/material/Popper';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Grow from '@mui/material/Grow';
import IconButton from '@mui/material/IconButton';
//import io from 'socket.io-client';
import { notificationTitle, notificationLink } from '../../Theme/element';
import { formatDistance, set} from 'date-fns';
import { fr } from 'date-fns/locale';

import { checkAutorisation } from '../../Authorisation/Authorisation';


import {fetchUserInfo} from './Pages/Users/apiAccount';





const Dashboard = () => {

    const theme = useTheme();

    const apiUrl = config.apiUrl; 
    const token = Cookies.get('token');

    const apiUrlNotif = config.apiNotifServer;

    const [ecommAuth, setEcommAuth] = useState(false);
    const [newsAuth, setNewsAuth] = useState(false);

    useEffect(() => {
      const fetchAuth = async () => {
        const isAuthorizedEcom = await checkAutorisation('auth_ecom');
        setEcommAuth(isAuthorizedEcom);
        const isAuthorisedNews = await checkAutorisation('auth_newsletter');
        setNewsAuth(isAuthorisedNews);
      };

      fetchAuth();
    }, []);








    //const socket = io(apiUrlNotif);

    const { isDark, toggleTheme } = useContext(ThemeContext);


    const [LoadingProfile, setLoadingProfile] = useState(true);

    const [infoUser, setInfoUser] = useState(null);

    const [openNotif, setOpenNotif] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [notifRead, setNotifRead] = useState(false);

    const anchorRef = useRef(null);

    

   //useEffect(() => {
   //    // Écouter les notifications en temps réel
   //    const userId = jwtDecode(Cookies.get('token')).idUser;
   //    socket.emit('join', { idUser: userId });
//
   //    socket.on('notification', (data) => {
   //        console.log(data);
   //        setNotifRead(true);
   //    });
//
   //    return () => {
   //        socket.off('notification');
   //    };
   //}, []);


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


    const handleReadNotif = (event) => {
        const notificationId = event.currentTarget.id;
        Axios.post(`${apiUrl}/readNotification`, {
            IdNotif: notificationId,
          }, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
        }).then((response) => {
            setNotifRead(false);
            console.log(response.data);
        });
    };

    useEffect(() => {
        setNotifRead(notifications.some(notification => !notification.is_read));
    }, [notifications]);


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




    useEffect(() => {
            const fetchUserInfoLocal = async (token) => {
                const response = await fetchUserInfo(token);
                setInfoUser(jwtDecode(response));
            };
            fetchUserInfoLocal(token);
            setLoadingProfile(false);
    }, [token]);




    const navigateTo = useNavigate()

    const logoutUser = () => {
        Cookies.remove('token');
        navigateTo('/');
    }

    
   
    const [open_user, setopen_user] = useState(true);
    const [open_menu, setopen_menu] = useState(true);
    
    function toggle_user() { 
        setopen_user(!open_user);
    }

    function toggle_menu() {
        setopen_menu(!open_menu);
        setopen_user(true);
    }


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



    
    return (
        <div className='dashboard'
            style={{
                '--color-primary-main': theme.palette.primary.main,
                '--color-primary-secondary': theme.palette.primary.secondary,
                '--color-primary-third': theme.palette.primary.third,

                '--color-secondary-main': theme.palette.secondary.main,
                '--color-secondary-secondary': theme.palette.secondary.secondary,
                '--color-secondary-third': theme.palette.secondary.third,

                '--color-shadow-main': theme.palette.shadow.main,
                '--color-shadow-secondary': theme.palette.shadow.secondary,

                '--color-globe-dark': theme.palette.globe.dark,

                '--color-background-default': theme.palette.background.default,
                '--color-background-secondary': theme.palette.background.secondary,

                '--color-text-primary': theme.palette.text.primary,
                '--color-text-secondary': theme.palette.text.secondary,
            }}
        >
        <AnimatePresence initial={false}>
            <motion.div className="menu_dashboard" animate={{width: open_menu ? "18rem" : "5rem"}} style={{backgroundColor: theme.palette.primary.main, boxShadow : theme.palette.shadow.main}}>
                <AnimatePresence initial={false}>
                    <motion.div className="logo_contain" animate={{width: open_menu ? "10rem" : "3rem"}}>
                        <Logo className="logo" alt="logo" style={{color: theme.palette.text.primary}}/>
                    </motion.div>
                </AnimatePresence>
                <AnimatePresence initial={false}>
                    <motion.div className="user_menu"  animate={{height: open_user ? "5rem" : "auto", paddingRight: open_menu ? "1rem" : "0rem", paddingLeft: open_menu ? "1rem" : "0rem", width: open_menu ? "auto" : "3rem", border: open_menu ? "1px #434853 solid" : "none"}}>
                        <div className='user_menu_hide'>
                            <div className='user_menu_box'>
                                {LoadingProfile ? <SkeletonProfile /> : 
                                <div className='flex_left'>
                                    {infoUser && infoUser.image && infoUser.image[0] && infoUser.image[0].src_profile_image ? (
                                      <img src={`${apiUrl}/media/profile/${infoUser.image[0].src_profile_image}`} className='profile_photo' />
                                    ) : (
                                      <Avatar alt="Avatar par défaut" className='profile_photo' />
                                    )}
                                    {infoUser && infoUser.user && infoUser.user[0] && (
                                      <p className='user_name'>
                                        <b className='user_name_contain' style={{ color: theme.palette.text.primary }}>
                                          {infoUser.user[0].username}
                                        </b>
                                        <span className='user_id' style={{ color: theme.palette.text.secondary }}>
                                          #{String(infoUser.user[0].id_user).padStart(4, '0')}
                                        </span>
                                      </p>
                                    )}
                              </div>}
                                <button id='id_user_menu_button' className='user_menu_button' onClick={toggle_user} style={{color: theme.palette.text.primary}}><BsChevronCompactDown className='user_menu_button_arrow'/></button>  
                            </div>
                            <div className="option_user_box">
                                <Link key="account" className='link option_user_text' to='/dashboard/account' style={{color: theme.palette.text.primary}}><PiUserBold className='option_user_icon'/><b>Mon Compte</b></Link>
                                <Link key="parameter" className='link option_user_text' to="/dashboard/parameter" style={{color: theme.palette.text.primary}}><PiGearSixBold className='option_user_icon'/><b>Parametre</b></Link>
                                <button onClick={logoutUser} key="option" className='option_user_text' to="/dashboard/lougout" style={{color: theme.palette.text.primary}}><PiPowerBold  className='option_user_icon'/><b>Logout</b></button>
                            </div>
                        </div>   
                    </motion.div>
                </AnimatePresence>
                <div className='navigation'>
                    <NavLink key="home" to='/dashboard/home' className={({ isActive }) => (isActive ? 'menuActive' : '')}>
                        <AnimatePresence initial={false}>
                            <motion.div className={open_menu ? "link menu_link open_link_menu" : "link menu_link close_link_menu"} style={{color: theme.palette.text.secondary}}>
                                <motion.div animate={{marginRight: open_menu ? "0.5rem" : "0rem"}} className='icon_navigation'><HomeOutlinedIcon fontSize='small'/></motion.div>
                                <motion.span className={open_menu ? "menu_text_open" : "menu_text_close"}>Accueil</motion.span>
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
                    <NavLink key="ecommerce" to={ecommAuth === 1 ? '/dashboard/ecommerce' : '#'} className={({ isActive, ecommAuth }) => (isActive, ecommAuth ? 'menuActive' : '')}>
                        <AnimatePresence initial={false}>
                            <motion.div className={open_menu ? "link menu_link open_link_menu" : "link menu_link close_link_menu"} style={{color: theme.palette.text.secondary}}>
                                <motion.div animate={{marginRight: open_menu ? "0.5rem" : "0rem"}} className='icon_navigation'><ShoppingCartOutlinedIcon fontSize='small'/></motion.div>
                                <motion.span className={open_menu ? "menu_text_open" : "menu_text_close"}>E-commerce</motion.span>
                                {
                                    ecommAuth === 1 ? (
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
                    <NavLink key="newsletter" to={newsAuth === 1 ? '/dashboard/newsletter' : '#'} className={({ isActive }) => (isActive && newsAuth === 1 ? 'menuActive' : '')}>
                        <AnimatePresence initial={false}>
                            <motion.div className={open_menu ? "link menu_link open_link_menu" : "link menu_link close_link_menu"} style={{color: theme.palette.text.secondary}}>
                                <motion.div animate={{marginRight: open_menu ? "0.5rem" : "0rem"}} className='icon_navigation'><NewspaperOutlinedIcon fontSize='small'/></motion.div>
                                <motion.span className={open_menu ? "menu_text_open" : "menu_text_close"}>Newsletter</motion.span>
                                {
                                    newsAuth === 1 ? (
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
            </motion.div>
        </AnimatePresence>
        <AnimatePresence initial={false}>
            <motion.div className='dashboard_page' animate={{width : open_menu ? "calc(100% - 18rem)" : "calc(100% - 5rem)"}}>
                <div className='dashboard_header' style={{backgroundColor: theme.palette.primary.main, boxShadow : theme.palette.shadow.main}}>
                    <div className='header_box left'>
                        <Checkbox key='menu' style={{ color: theme.palette.text.primary }} checked={open_menu} onChange={toggle_menu} icon={<PiFunnelSimpleBold className='icon'/>} checkedIcon={<PiFunnelSimpleBold className='icon'/>}/>
                        <Checkbox key='theme' style={{ color: theme.palette.text.primary }} checked={isDark} onChange={toggleTheme} icon={<LuMoon className='icon' />} checkedIcon={<LuSun  className='icon'/>}/>
                    </div>
                    <div className='header_box right'>
                        
                            <IconButton key='menu' style={{ color: theme.palette.text.primary }}  onClick={handleOpenNotif} ref={anchorRef}>
                                <Badge color="error" variant="dot" invisible={!notifRead}>
                                    <PiBellBold className='icon' />
                                </Badge>
                            </IconButton>
                        
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
                <div className='dashboard_section principal'>
                    <Outlet />
                </div>
            </motion.div>
        </AnimatePresence>
    </div>
    );
};

export default Dashboard;