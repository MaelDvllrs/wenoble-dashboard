import React from "react"
import {TrendingArticle} from '../Actualite/Trending'
import { UpdateLast } from '../Actualite/UpdateLast'
import { useTheme } from '@mui/material/styles';
import { UserStatistique } from '../Statistique/userStatistique'
import './home.css'

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
                    <p className="home-title">Bonjour,</p>
                </div>

                <div className="articleBox trendingBox" style={{ backgroundColor: theme.palette.primary.main, boxShadow : theme.palette.shadow.main, }}>
                    <TrendingArticle/>
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
                <div style={{ gridColumn: '1 / span 2', gridRow: '2'}}>
                    <UserStatistique/>
                </div>
                <div className="articleBox trendingBox" style={{ backgroundColor: theme.palette.primary.main, boxShadow : theme.palette.shadow.main, }}>
                    <UpdateLast limit={4}/>
                </div>
            </div>
        </div>

    )
}

export default Home