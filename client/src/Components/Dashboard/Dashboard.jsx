import React, { useState, useEffect, useContext, useRef  } from 'react';
import Axios from 'axios';
import {jwtDecode} from 'jwt-decode'; 
import Cookies from 'js-cookie';
import './Dashboard.css';
import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion'
import { BsChevronCompactDown } from "react-icons/bs";
import { PiUserBold, PiGearSixBold, PiPowerBold, PiHouseBold, PiChartBarBold, PiPencilSimpleBold, PiNewspaperBold, PiFunnelSimpleBold, PiShoppingCartSimpleBold, PiQuestionBold, PiChatCircleDotsBold,PiBellBold} from "react-icons/pi";
import { LuMoon, LuSun } from "react-icons/lu";
import { fetchImages } from "./apiImage";
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
import io from 'socket.io-client';
import { notificationTitle } from '../../Theme/element';





const Dashboard = () => {

    const theme = useTheme();

    const apiUrl = config.apiUrl; 

    const apiUrlNotif = config.apiNotifServer;

    const socket = io(apiUrlNotif);

    const { isDark, toggleTheme } = useContext(ThemeContext);


    const [LoadingProfile, setLoadingProfile] = useState(true);

    const [infoUser, setInfoUser] = useState(null);

    const [openNotif, setOpenNotif] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [notifRead, setNotifRead] = useState(false);

    const anchorRef = useRef(null);

    useEffect(() => {
        // Écouter les notifications en temps réel
        const userId = jwtDecode(Cookies.get('token')).idUser;
        socket.emit('join', { idUser: userId });

        socket.on('notification', (data) => {
            console.log(data);
            setNotifRead(true);
        });

        return () => {
            socket.off('notification');
        };
    }, []);


    useEffect(() => {
        Axios.get(`${apiUrl}/getNotifications`, {
            params: {
                userId: jwtDecode(Cookies.get('token')).idUser,
            }
        }).then((response) => {
            const notificationsWithLinks = response.data.map(notification => {
                let link = '';
                switch (notification.type) {
                    case 'message':
                        link = `/dashboard/contact/message/${notification.id_element}`;
                        break;
                    case 'alert':
                        link = `/alerts/${notification.id_notif}`;
                        break;
                    case 'reminder':
                        link = `/reminders/${notification.id_notif}`;
                        break;
                    default:
                        link = `/notifications/${notification.id_notif}`;
                        break;
                }
                return { ...notification, link };
            });
            setNotifications(notificationsWithLinks);
        });
    }, [openNotif, notifRead]);


    const handleReadNotif = (event) => {
        const notificationId = event.currentTarget.id;
        Axios.post(`${apiUrl}/readNotification`, {
            IdNotif: notificationId,
        }).then((response) => {
            setNotifRead(true);
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


    let decodedUser = null;

    useEffect(() => {
        const token = Cookies.get('token');
    
        if (token) { 
            const decodedToken = jwtDecode(token);
    
            Axios.post(`${apiUrl}/UserInfo`, {
                IdUser: decodedToken.idUser,
                Username: decodedToken.username,
            }).then((response) => {
                setInfoUser(response.data);
            });
        }
    }, []);

    if(infoUser != null){
        decodedUser = jwtDecode(infoUser);
    }

    const [images, setImages] = useState([]);


    const navigateTo = useNavigate()

    const logoutUser = () => {
        Cookies.remove('token');
        navigateTo('/');
    }



    useEffect(() => {
        if(decodedUser != null){
            const fetchData = async () => {
                const imagesData = await fetchImages(decodedUser.user[0].username); 
                setImages(imagesData);
                setLoadingProfile(false);
            };

            fetchData();
        }
    }, [infoUser]);
   
    const [open_user, setopen_user] = useState(true);
    const [open_menu, setopen_menu] = useState(true);
    
    function toggle_user() { 
        setopen_user(!open_user);
    }

    function toggle_menu() {
        setopen_menu(!open_menu);
        setopen_user(true);
    }
    
    return (
        <div className='dashboard'>
        <AnimatePresence initial={false}>
            <motion.div className="menu_dashboard" animate={{width: open_menu ? "18rem" : "5rem"}} style={{backgroundColor: theme.palette.primary.secondary, borderColor : theme.palette.primary.third}}>
                <AnimatePresence initial={false}>
                    <motion.div className="logo_contain" animate={{width: open_menu ? "10rem" : "3rem"}} style={{backgroundColor: theme.palette.primary.secondary}}>
                        <Logo className="logo" alt="logo" style={{color: theme.palette.text.primary}}/>
                    </motion.div>
                </AnimatePresence>
                <AnimatePresence initial={false}>
                    <motion.div className="user_menu"  animate={{height: open_user ? "5rem" : "auto", paddingRight: open_menu ? "1rem" : "0rem", paddingLeft: open_menu ? "1rem" : "0rem", width: open_menu ? "auto" : "3rem", border: open_menu ? "1px #434853 solid" : "none"}}>
                        <div className='user_menu_hide'>
                            <div className='user_menu_box'>
                                {LoadingProfile ? <SkeletonProfile /> : <div className='flex_left'>
                                    {
                                      images[0] ? (
                                        <img src={`data:image/jpeg;base64,${images[0].data}`} alt={images[0].name} className='profile_photo'/>
                                      ) : (
                                        <Avatar alt="Avatar par défaut" className='profile_photo'/>
                                      )
                                    }
                                    {decodedUser && <p className='user_name' ><b className='user_name_contain' style={{color: theme.palette.text.primary}}>{decodedUser.user[0].username}</b><span className='user_id' style={{color: theme.palette.text.secondary}}>#{String(decodedUser.user[0].id_user).padStart(4, '0')}</span></p>}
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
                            <motion.div className={open_menu ? "link menu_link open_link_menu" : "link menu_link close_link_menu"} style={{color: theme.palette.text.primary}}>
                                <motion.div animate={{marginRight: open_menu ? "1.5rem" : "0rem"}} className='icon_navigation'><PiHouseBold /></motion.div>
                                <motion.span className={open_menu ? "menu_text_open" : "menu_text_close"}>Accueil</motion.span>
                                <div className='menu_link_active_curs'></div>
                            </motion.div>
                        </AnimatePresence>
                    </NavLink>
                    <div className='menu_title'><p className='menu_title_text' style={{color: theme.palette.text.primary}}><b>Gérer mon site</b></p></div>
                    <NavLink key="modification" to='/dashboard/modification' className={({ isActive }) => (isActive ? 'menuActive' : '')}>
                        <AnimatePresence initial={false}>
                            <motion.div className={open_menu ? "link menu_link open_link_menu" : "link menu_link close_link_menu"} style={{color: theme.palette.text.primary}}>
                                <motion.div animate={{marginRight: open_menu ? "1.5rem" : "0rem"}} className='icon_navigation'><PiPencilSimpleBold/></motion.div>
                                <motion.span className={open_menu ? "menu_text_open" : "menu_text_close"}>Modifications</motion.span>
                                <div className='menu_link_active_curs'></div>
                            </motion.div>
                        </AnimatePresence>
                    </NavLink>
                    <NavLink key="ecommerce" to='/dashboard/ecommerce' className={({ isActive }) => (isActive ? 'menuActive' : '')}>
                        <AnimatePresence initial={false}>
                            <motion.div className={open_menu ? "link menu_link open_link_menu" : "link menu_link close_link_menu"} style={{color: theme.palette.text.primary}}>
                                <motion.div animate={{marginRight: open_menu ? "1.5rem" : "0rem"}} className='icon_navigation'><PiShoppingCartSimpleBold/></motion.div>
                                <motion.span className={open_menu ? "menu_text_open" : "menu_text_close"}>E-commerce</motion.span>
                                <div className='menu_link_active_curs'></div>
                            </motion.div>
                        </AnimatePresence>
                    </NavLink>
                    
                    <NavLink key="stats" to='/dashboard/stats' className={({ isActive }) => (isActive ? 'menuActive' : '')}>
                        <AnimatePresence initial={false}>
                            <motion.div className={open_menu ? "link menu_link open_link_menu" : "link menu_link close_link_menu"} style={{color: theme.palette.text.primary}}>
                                <motion.div animate={{marginRight: open_menu ? "1.5rem" : "0rem"}} className='icon_navigation'><PiChartBarBold/></motion.div>
                                <motion.span className={open_menu ? "menu_text_open" : "menu_text_close"}>Statistiques</motion.span>
                                <div className='menu_link_active_curs'></div>
                            </motion.div>
                        </AnimatePresence>
                    </NavLink>
                    <NavLink key="contact" to='/dashboard/contact' className={({ isActive }) => (isActive ? 'menuActive' : '')}>
                        <AnimatePresence initial={false}>
                            <motion.div className={open_menu ? "link menu_link open_link_menu" : "link menu_link close_link_menu"} style={{color: theme.palette.text.primary}}>
                                <motion.div animate={{marginRight: open_menu ? "1.5rem" : "0rem"}} className='icon_navigation'><PiChatCircleDotsBold  /></motion.div>
                                <motion.span className={open_menu ? "menu_text_open" : "menu_text_close"}>Contacts</motion.span>
                                <div className='menu_link_active_curs'></div>
                            </motion.div>
                        </AnimatePresence>
                    </NavLink>
                    <div className='menu_title'><p className='menu_title_text' style={{color: theme.palette.text.primary}}><b>Wenoble</b></p></div>
                    <NavLink key="actu" to='/dashboard/actu' className={({ isActive }) => (isActive ? 'menuActive' : '')}>
                        <AnimatePresence initial={false}>
                            <motion.div className={open_menu ? "link menu_link open_link_menu" : "link menu_link close_link_menu"} style={{color: theme.palette.text.primary}}>
                                <motion.div animate={{marginRight: open_menu ? "1.5rem" : "0rem"}} className='icon_navigation'><PiNewspaperBold/></motion.div>
                                <motion.span className={open_menu ? "menu_text_open" : "menu_text_close"}>Actualités</motion.span>
                                <div className='menu_link_active_curs'></div>
                            </motion.div>
                        </AnimatePresence>
                    </NavLink>
                    <NavLink key="probleme" to='/dashboard/problem' className={({ isActive }) => (isActive ? 'menuActive' : '')}>
                        <AnimatePresence initial={false}>
                            <motion.div className={open_menu ? "link menu_link open_link_menu" : "link menu_link close_link_menu"} style={{color: theme.palette.text.primary}}>
                                <motion.div animate={{marginRight: open_menu ? "1.5rem" : "0rem"}} className='icon_navigation'><PiQuestionBold /></motion.div>
                                <motion.span className={open_menu ? "menu_text_open" : "menu_text_close"}>Un problème ?</motion.span>
                                <div className='menu_link_active_curs'></div>
                            </motion.div>
                        </AnimatePresence>
                    </NavLink>
                </div>
            </motion.div>
        </AnimatePresence>
        <AnimatePresence initial={false}>
            <motion.div className='dashboard_page' animate={{width : open_menu ? "calc(100% - 18rem)" : "calc(100% - 5rem)"}}>
                <div className='dashboard_header'>
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
                        <Popper open={openNotif} anchorEl={anchorRef.current} transition placement="bottom-end">
                        {({ TransitionProps }) => (
                          <Grow {...TransitionProps} timeout={350}>
                                <div className='dashboard_case_empty notification_case' style={{backgroundColor : theme.palette.primary.main, borderColor : theme.palette.primary.third}}>
                                    <div className='notification_title_contain'>
                                        <h3>Notifications</h3>
                                    </div>
                                    <div className="line_horizontal notification_line" style={{ backgroundColor: theme.palette.text.secondary }}></div>
                                    <div className='notification_contain'>
                                        {notifications.length === 0 && <div className='notification_box'><div className='notification_text'>Aucune notification</div></div>}
                                        {notifications.map((notification, index) => (
                                            <NavLink key={index} to={notification.link} onClick={handleCombinedClick} id={notification.id_notif}>
                                                <div className='notification_box' style={{backgroundColor: notification.is_read ? 'transparent' : 'rgb(5, 65, 183, 0.2)', color : theme.palette.text.primary}}>
                                                    <div><b>{notificationTitle(notification.type)}</b></div>
                                                    <div className='notification_text'>{notification.message}</div>
                                                    <div className='notification_time' style={{color:theme.palette.text.secondary}}>{new Date(notification.date).toLocaleTimeString()}</div>
                                                </div>
                                                <div className="line_horizontal notification_line" style={{ backgroundColor: theme.palette.text.secondary }}></div>
                                            </NavLink>
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