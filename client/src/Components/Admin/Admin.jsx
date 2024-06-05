import React, { useState, useEffect, useContext  } from 'react';
import Axios from 'axios';
import {jwtDecode} from 'jwt-decode'; 
import Cookies from 'js-cookie';
import '../Dashboard/Dashboard.css';
import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion'
import { BsChevronCompactDown } from "react-icons/bs";
import { PiUserBold, PiGearSixBold, PiPowerBold, PiHouseBold, PiChartBarBold, PiUsersBold , PiNewspaperBold, PiFunnelSimpleBold} from "react-icons/pi";
import { LuMoon, LuSun } from "react-icons/lu";
import { fetchImages } from "../Dashboard/apiImage"
import logo from "../assets/icon/logo.png"
import config from '../../config';
import { SkeletonProfile } from '../skeleton/skeleton';
import ThemeContext from '../../Theme/themeContext';
import { useTheme } from '@mui/material/styles';
import Checkbox from '@mui/material/Checkbox';




const Admin = () => {

    const theme = useTheme();

    const apiUrl = config.apiUrl; 

    const { isDark, toggleTheme } = useContext(ThemeContext);


    const [LoadingProfile, setLoadingProfile] = useState(true);

    const [infoUser, setInfoUser] = useState(null);
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
        Cookies.set('user', infoUser);
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
            <motion.div className="menu_dashboard" animate={{width: open_menu ? "18rem" : "5rem"}}>
                <AnimatePresence initial={false}>
                    <motion.img src={logo} className="logo" alt="logo" animate={{width: open_menu ? "7rem" : "3rem"}}></motion.img>
                </AnimatePresence>
                <AnimatePresence initial={false}>
                    <motion.div className="user_menu"  animate={{height: open_user ? "5rem" : "auto", paddingRight: open_menu ? "1rem" : "0rem", paddingLeft: open_menu ? "1rem" : "0rem", width: open_menu ? "auto" : "2.5rem", border: open_menu ? "1px #434853 solid" : "none"}}>
                        <div className='user_menu_box'>
                            {LoadingProfile ? <SkeletonProfile /> : <div className='flex_left'>
                            {images[0] && <img src={`data:image/jpeg;base64,${images[0].data}`} alt={images[0].name} className='profile_photo'/>}
                                {decodedUser && <p className='user_name'><b>{decodedUser.user[0].username}</b><span className='user_id'>#{String(decodedUser.user[0].id_user).padStart(4, '0')}</span></p>}
                            </div>}
                            <button id='id_user_menu_button' className='user_menu_button' onClick={toggle_user}><BsChevronCompactDown className='user_menu_button_arrow'/></button>  
                        </div>
                        <div className="option_user_box">
                            <Link key="account" className='link option_user_text' to='/dashboard/account'><PiUserBold className='option_user_icon'/><b>Mon Compte</b></Link>
                            <Link key="parameter" className='link option_user_text' to="/dashboard/parameter"><PiGearSixBold className='option_user_icon'/><b>Parametre</b></Link>
                            <button onClick={logoutUser} key="option" className='option_user_text' to="/dashboard/lougout"><PiPowerBold  className='option_user_icon'/><b>Logout</b></button>
                        </div>   
                    </motion.div>
                </AnimatePresence>
                <div className='navigation'>
                    <p className='menu_title'><b>Navigation</b></p>
                    <NavLink key="home" to='/dashboard/home' className={({ isActive }) => (isActive ? 'menuActive' : '')}>
                        <AnimatePresence initial={false}>
                            <motion.div className={open_menu ? "link menu_link open_link_menu" : "link menu_link close_link_menu"}>
                                <motion.div animate={{marginRight: open_menu ? "1.5rem" : "0rem"}} className='icon_navigation'><PiHouseBold /></motion.div>
                                <motion.span className={open_menu ? "menu_text_open" : "menu_text_close"}>Accueil</motion.span>
                            </motion.div>
                        </AnimatePresence>
                    </NavLink>
                    <NavLink key="stats" to='/dashboard/stats' className={({ isActive }) => (isActive ? 'menuActive' : '')}>
                        <AnimatePresence initial={false}>
                            <motion.div className={open_menu ? "link menu_link open_link_menu" : "link menu_link close_link_menu"}>
                                <motion.div animate={{marginRight: open_menu ? "1.5rem" : "0rem"}} className='icon_navigation'><PiChartBarBold/></motion.div>
                                <motion.span className={open_menu ? "menu_text_open" : "menu_text_close"}>Statistique</motion.span>
                            </motion.div>
                        </AnimatePresence>
                    </NavLink>
                    <NavLink key="client" to='/dashboard-admin/clients' className={({ isActive }) => (isActive ? 'menuActive' : '')}>
                        <AnimatePresence initial={false}>
                            <motion.div className={open_menu ? "link menu_link open_link_menu" : "link menu_link close_link_menu"}>
                                <motion.div animate={{marginRight: open_menu ? "1.5rem" : "0rem"}} className='icon_navigation'><PiUsersBold /></motion.div>
                                <motion.span className={open_menu ? "menu_text_open" : "menu_text_close"}>Clients</motion.span>
                            </motion.div>
                        </AnimatePresence>
                    </NavLink>
                    <NavLink key="actu" to='/dashboard/actu' className={({ isActive }) => (isActive ? 'menuActive' : '')}>
                        <AnimatePresence initial={false}>
                            <motion.div className={open_menu ? "link menu_link open_link_menu" : "link menu_link close_link_menu"}>
                                <motion.div animate={{marginRight: open_menu ? "1.5rem" : "0rem"}} className='icon_navigation'><PiNewspaperBold/></motion.div>
                                <motion.span className={open_menu ? "menu_text_open" : "menu_text_close"}>Actualité</motion.span>
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

                        <Checkbox key='menu' checked={open_menu} onChange={toggle_menu} icon={<PiFunnelSimpleBold className='icon' style={{ color: theme.palette.secondary.main }}/>} checkedIcon={<PiFunnelSimpleBold className='icon' style={{ color: theme.palette.secondary.main }}/>}/>
                        
                        <Checkbox key='theme' color='secondary' checked={isDark} onChange={toggleTheme} icon={<LuMoon className='icon'/>} checkedIcon={<LuSun  className='icon'/>}/>
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

export default Admin;