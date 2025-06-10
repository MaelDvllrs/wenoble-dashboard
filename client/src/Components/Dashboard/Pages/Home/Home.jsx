import React from "react"
import { NavLink } from "react-router-dom";
import {TrendingArticle} from '../Actualite/Trending'
import { UpdateLast } from '../Actualite/UpdateLast'
import { useTheme } from '@mui/material/styles';
import { UserStatistique } from '../Statistique/userStatistique'
import './home.css'
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import iconAcademy from"../../../../assets/icon/Academy-design.png"

import { Notification } from "../notification/notification";


const Home = () => {

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

    const theme = useTheme();

    return(
        <div className="outlet">
            <div className="title_section">
                <div className="breadCrumbs">Dashboard</div>
            </div>
            <div className="gridHome">
                <div className="welcomeMessage" style={{ gridColumn: '1 / span 3', gridRow: '1'}}>
                    <UserStatistique/>
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
                
                <div>
                    <div className='dashboard_case_empty notification_case notification_home' style={{backgroundColor : theme.palette.primary.main, boxShadow : theme.palette.shadow.main,}}>
                        <div className='notification_title_contain' style={{backgroundColor : theme.palette.primary.secondary}}>
                            <p><b>Notifications</b></p>
                            <p className='notification_time' style={{color:theme.palette.text.secondary}}></p>
                        </div>
                        <div className="line_horizontal notification_line" style={{ backgroundColor: theme.palette.primary.third }}></div>
                        <Notification/>
                    </div>
                </div>
                <div className="articleBox trendingBox" style={{ backgroundColor: theme.palette.primary.main, boxShadow : theme.palette.shadow.main, }}>
                    <TrendingArticle/>
                </div>
                <div className="articleBox trendingBox" style={{ backgroundColor: theme.palette.primary.main, boxShadow : theme.palette.shadow.main, }}>
                    <UpdateLast limit={4}/>
                </div>
            </div>
            
        </div>

    )
}

export default Home