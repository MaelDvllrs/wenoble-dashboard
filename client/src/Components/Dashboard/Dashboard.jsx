import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import {jwtDecode} from 'jwt-decode'; 
import Cookies from 'js-cookie';
import './Dashboard.css';
import { Outlet, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion'
import { BsChevronCompactDown } from "react-icons/bs";
import { PiUserBold, PiGearSixBold, PiPowerBold, PiHouseBold, PiChartBarBold, PiPencilSimpleBold, PiNewspaperBold, PiFunnelSimpleBold} from "react-icons/pi";
import { fetchImages } from "./apiImage";
import logo from "../assets/icon/logo.png"


const Dashboard = () => {
    const [infoUser, setInfoUser] = useState(null);
    let decodedUser = null;

    useEffect(() => {
        const token = Cookies.get('token');

        if (token) { 
            const decodedToken = jwtDecode(token);

            Axios.post('http://localhost:3002/UserInfo', {
                IdUser: decodedToken.idUser,
                Username: decodedToken.username,
            }).then((response) => {
                setInfoUser(response.data);
            });
        }
    }, [infoUser]);

    if(infoUser != null){
        Cookies.set('user', infoUser);
        decodedUser = jwtDecode(infoUser);
    }

    const [images, setImages] = useState([]);



    useEffect(() => {


        if(decodedUser != null){
            const fetchData = async () => {
                const imagesData = await fetchImages(decodedUser.user[0].username); 
                setImages(imagesData);
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
    }

    return (
            <div className='dashboard'>
                <AnimatePresence initial={false}>
                <motion.div  className="menu_dashboard" animate={{width: open_menu ? "18rem" : "3rem"}}>
                    <motion.img initial={false} src={logo} className="logo" alt="logo" animate={{width: open_menu ? "7rem" : "3rem"}}></motion.img>
                    <motion.div className="user_menu" animate={{height: open_user ? "3rem" : "auto", padding: open_menu ? "1rem" : "0rem", width: open_menu ? "auto" : "2.5rem", backgroundColor : open_menu ? "#272a31" : "transparent"}}>
                        <div className='user_menu_box'>
                            <div className='flex_left'>
                            {images[0] && <img src={`data:image/jpeg;base64,${images[0].data}`} alt={images[0].name} className='profile_photo'/>}
                                {decodedUser && <p className='user_name'><b>{decodedUser.user[0].username}</b><span className='user_id'>#{String(decodedUser.user[0].id_user).padStart(4, '0')}</span></p>}
                            </div>
                            <button id='id_user_menu_button' className='user_menu_button' onClick={toggle_user}><BsChevronCompactDown className='user_menu_button_arrow'/></button>  
                        </div>
                        <div className="option_user_box">
                            <Link className='link option_user_text' to='/dashboard/account'><PiUserBold className='option_user_icon'/><b>Mon Compte</b></Link>
                            <Link className='link option_user_text' to="/dashboard/parameter"><PiGearSixBold className='option_user_icon'/><b>Parametre</b></Link>
                            <Link className='link option_user_text' to="/dashboard/lougout"><PiPowerBold  className='option_user_icon'/><b>Logout</b></Link>
                        </div>   
                    </motion.div>
                    <div className='navigation'>
                        <p className='menu_title'><b>Navigation</b></p>
                        <Link to='/dashboard/home'><motion.div  className={open_menu ? "link menu_link open_link_menu" : "link menu_link close_link_menu"}><motion.div animate={{marginRight: open_menu ? "1.5rem" : "0rem"}} className='icon_navigation'><PiHouseBold /></motion.div><motion.span className={open_menu ? "menu_text_open" : "menu_text_close"}>Accueil</motion.span></motion.div></Link>
                        <Link to='/dashboard/stats'><motion.div className={open_menu ? "link menu_link open_link_menu" : "link menu_link close_link_menu"}><motion.div animate={{marginRight: open_menu ? "1.5rem" : "0rem"}} className='icon_navigation'><PiChartBarBold/></motion.div><motion.span className={open_menu ? "menu_text_open" : "menu_text_close"}>Statistique</motion.span></motion.div></Link>
                        <Link to='/dashboard/portfolio'><motion.div className={open_menu ? "link menu_link open_link_menu" : "link menu_link close_link_menu"}><motion.div animate={{marginRight: open_menu ? "1.5rem" : "0rem"}} className='icon_navigation'><PiPencilSimpleBold/></motion.div><motion.span className={open_menu ? "menu_text_open" : "menu_text_close"}>Modification</motion.span></motion.div></Link>
                        <Link to='/dashboard/actu'><motion.div className={open_menu ? "link menu_link open_link_menu" : "link menu_link close_link_menu"}><motion.div animate={{marginRight: open_menu ? "1.5rem" : "0rem"}} className='icon_navigation'><PiNewspaperBold/></motion.div><motion.span className={open_menu ? "menu_text_open" : "menu_text_close"}>Actualité</motion.span></motion.div></Link>
                    </div>
                </motion.div>
                <motion.div className='dashboard_page' animate={{paddingLeft : open_menu ? "20rem" : "5rem"}}>
                    <div className='dashboard_header'>
                        <div className='header_box left'>
                            <button onClick={toggle_menu} className='menu_button'>
                                <PiFunnelSimpleBold className='menu_button_icon'/>
                            </button>
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