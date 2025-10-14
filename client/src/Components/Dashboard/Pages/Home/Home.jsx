import React, { useState, useEffect } from "react"
import { NavLink } from "react-router-dom";
import {TrendingArticle} from '../Actualite/Trending'
import { UpdateLast } from '../Actualite/UpdateLast'
import { useTheme } from '@mui/material/styles';
import { jwtDecode } from 'jwt-decode';
import Cookies from 'js-cookie';
import Axios from '../../../../service/AxiosConfig';
import config from '../../../../config';
import { useWebsite } from '../../../../Context/WebsiteContext';
import './home.css'
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import LanguageIcon from '@mui/icons-material/Language';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import EmailIcon from '@mui/icons-material/Email';
import iconAcademy from"../../../../assets/icon/Academy-design.png"

import { Notification } from "../notification/notification";


const Home = () => {
    const theme = useTheme();
    const token = Cookies.get('token');
    const apiUrl = config.apiUrl;
    const { websites } = useWebsite();
    
    const [userName, setUserName] = useState('');
    const [stats, setStats] = useState({
        websites: 0,
        collections: 0,
        messages: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Récupérer le nom de l'utilisateur depuis le backend
        const fetchUserName = async () => {
            if (!token) return;
            
            try {
                const response = await Axios.get(`${apiUrl}/getUserInfoBasic`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                // Décoder la réponse JWT
                const decoded = jwtDecode(response.data);
                const userInfo = decoded.user[0];
                
                // Construire le nom d'affichage : first_name, sinon username
                let displayName = '';
                if (userInfo.first_name && userInfo.first_name.trim() !== '') {
                    displayName = userInfo.first_name;
                } else if (userInfo.username && userInfo.username.trim() !== '') {
                    displayName = userInfo.username;
                } else {
                    displayName = 'Utilisateur';
                }
                
                setUserName(displayName);
            } catch (error) {
                console.error('Erreur lors de la récupération du nom utilisateur:', error);
                setUserName('Utilisateur');
            }
        };

        fetchUserName();
    }, [token, apiUrl]);

    useEffect(() => {
        // Récupérer les statistiques
        const fetchStats = async () => {
            if (!token) return;
            
            try {
                setLoading(true);

                // Appeler la nouvelle route qui récupère toutes les stats en une fois
                const statsResponse = await Axios.get(`${apiUrl}/getUserStats`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                setStats({
                    websites: statsResponse.data.websites || 0,
                    collections: statsResponse.data.collections || 0,
                    messages: statsResponse.data.messages || 0
                });
            } catch (error) {
                console.error('Erreur lors de la récupération des statistiques:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [token, apiUrl]);

    console.log(`
    ██╗    ██╗███████╗███╗   ██╗ ██████╗ ██████╗ ██╗     ███████╗
    ██║    ██║██╔════╝████╗  ██║██╔═══██╗██╔══██╗██║     ██╔════╝
    ██║ █╗ ██║█████╗  ██╔██╗ ██║██║   ██║██████╔╝██║     █████╗  
    ██║███╗██║██╔══╝  ██║╚██╗██║██║   ██║██╔══██╗██║     ██╔══╝  
    ╚███╔███╔╝███████╗██║ ╚████║╚██████╔╝██████╔╝███████╗███████╗
     ╚══╝╚══╝ ╚══════╝╚═╝  ╚═══╝ ╚═════╝ ╚═════╝ ╚══════╝╚══════╝
           ╔═══╗╔═══╗╔═══╗╔╗ ╔╗╔══╗ ╔═══╗╔═══╗╔═══╗╔═══╗
           ╚╗╔╗║║╔═╗║║╔═╗║║║ ║║║╔╗║ ║╔═╗║║╔═╗║║╔═╗║╚╗╔╗║
            ║║║║║║ ║║║╚══╗║╚═╝║║╚╝╚╗║║ ║║║║ ║║║╚═╝║ ║║║║
            ║║║║║╚═╝║╚══╗║║╔═╗║║╔═╗║║║ ║║║╚═╝║║╔╗╔╝ ║║║║
           ╔╝╚╝║║╔═╗║║╚═╝║║║ ║║║╚═╝║║╚═╝║║╔═╗║║║║╚╗╔╝╚╝║
           ╚═══╝╚╝ ╚╝╚═══╝╚╝ ╚╝╚═══╝╚═══╝╚╝ ╚╝╚╝╚═╝╚═══╝
    `)

    return(
        <div className="outlet">
            <div className="outlet-box">
                <div className="title_section">
                    <div className="breadCrumbs">Dashboard</div>
                </div>
                
                
                <div className="home-wrapper">

                {/* Section Bienvenue */}
                <div className="home-welcome-section">
                    <div className="home-welcome-card">
                        <h2 className="home-welcome-title" style={{ color: theme.palette.text.primary }}>
                            Bonjour, {userName}
                        </h2>
                        <p className="home-welcome-subtitle" style={{ color: theme.palette.text.secondary }}>
                            Bienvenue sur votre tableau de bord
                        </p>
                    </div>
                </div>

                {/* Section Statistiques */}
                <div className="home-section">
                    <h3 className="home-section-title" style={{ color: theme.palette.text.primary }}>
                        Statistiques
                    </h3>
                    <div className="home-stats-container">
                        {/* Stat 1 - Nombre de sites */}
                        <div className='modification_box home-stat-card' style={{
                            backgroundColor: theme.palette.primary.secondary,
                            boxShadow: theme.palette.shadow.main,
                        }}>
                            <div className="home-stat-icon" style={{ backgroundColor: theme.palette.primary.main }}>
                                <LanguageIcon style={{ color: theme.palette.text.primary }} />
                            </div>
                            <div className='home-stat-content'>
                                <p className="home-stat-label" style={{ color: theme.palette.text.secondary }}>
                                    Sites Web
                                </p>
                                <p className="home-stat-value" style={{ color: theme.palette.text.primary }}>
                                    {loading ? '...' : stats.websites}
                                </p>
                            </div>
                        </div>

                        {/* Stat 2 - Nombre de collections */}
                        <div className='modification_box home-stat-card' style={{
                            backgroundColor: theme.palette.primary.secondary,
                            boxShadow: theme.palette.shadow.main,
                        }}>
                            <div className="home-stat-icon" style={{ backgroundColor: theme.palette.primary.main }}>
                                <FolderOpenIcon style={{ color: theme.palette.text.primary }} />
                            </div>
                            <div className='home-stat-content'>
                                <p className="home-stat-label" style={{ color: theme.palette.text.secondary }}>
                                    Collections
                                </p>
                                <p className="home-stat-value" style={{ color: theme.palette.text.primary }}>
                                    {loading ? '...' : stats.collections}
                                </p>
                            </div>
                        </div>

                        {/* Stat 3 - Nombre de messages */}
                        <div className='modification_box home-stat-card' style={{
                            backgroundColor: theme.palette.primary.secondary,
                            boxShadow: theme.palette.shadow.main,
                        }}>
                            <div className="home-stat-icon" style={{ backgroundColor: theme.palette.primary.main }}>
                                <EmailIcon style={{ color: theme.palette.text.primary }} />
                            </div>
                            <div className='home-stat-content'>
                                <p className="home-stat-label" style={{ color: theme.palette.text.secondary }}>
                                    Messages
                                </p>
                                <p className="home-stat-value" style={{ color: theme.palette.text.primary }}>
                                    {loading ? '...' : stats.messages}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section Actualités */}
                <div className="home-section">
                    <h3 className="home-section-title" style={{ color: theme.palette.text.primary }}>
                        Actualités
                    </h3>
                    <div className="home-news-container">
                        <div className="articleBox trendingBox home-news-trending" style={{ 
                            backgroundColor: theme.palette.primary.main, 
                            boxShadow: theme.palette.shadow.main,
                        }}>
                            <TrendingArticle/>
                        </div>
                        <div className="articleBox trendingBox home-news-updates" style={{ 
                            backgroundColor: theme.palette.primary.main, 
                            boxShadow: theme.palette.shadow.main,
                        }}>
                            <UpdateLast limit={4}/>
                        </div>
                        <div className="homeNews">
                            <div className="academy_announcement">
                                <div className="academy_announcement_image_container">
                                    <img className="academy_announcement_image" src={iconAcademy} alt="wenoble academy" />
                                </div>
                                <div className="academy_announcement_title">
                                    <SchoolRoundedIcon className="academy_logo" fontSize="large"/>
                                    <p className="NewsTitle">ACADEMY</p>
                                </div>
                                <div className="academy_announcement_button_container">
                                    <NavLink to={'/dashboard/academy'} className="academy_anouncement_button">Commencer</NavLink>
                                </div>
                                <div className="academy_announcement_footer">
                                    <p className="academy_announcement_footer_text">2025</p>
                                    <p className="academy_announcement_footer_text">wenoble</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                </div>
            </div>
        </div>

    )
}

export default Home