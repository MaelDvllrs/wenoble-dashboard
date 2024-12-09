import React from "react"
import {TrendingArticle} from '../Actualite/Trending'
import { UpdateLast } from '../Actualite/UpdateLast'
import { useTheme } from '@mui/material/styles';
import './home.css'

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
                    <p className="home-title">Bienvenue sur votre tableau de bord !</p>
                    <p className="home-subtitle">Vous pouvez modifier votre site, consulter les dernières actualités et les dernières mises à jour.</p>
                </div>

                <div className="articleBox trendingBox" style={{ backgroundColor: theme.palette.primary.main, borderColor: theme.palette.primary.third }}>
                    <TrendingArticle/>
                </div>
                <div></div>
                <div></div>
                <div></div>
                <div className="articleBox trendingBox" style={{ backgroundColor: theme.palette.primary.main, borderColor: theme.palette.primary.third }}>
                    <UpdateLast limit={4}/>
                </div>
            </div>
        </div>

    )
}

export default Home