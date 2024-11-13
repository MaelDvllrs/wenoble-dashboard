import React from "react"
import {  NavLink } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import './Actualite.css'
import  Article from './Article'
import {TrendingArticle} from './Trending'


const Actualite = () => {

    const theme = useTheme();
    

    return(
        <div className="outlet">
            <div className="title_section">
                <div className="breadCrumbs"><NavLink style={{color: theme.palette.text.primary}} className={"breadCrumbsLink"} to={'/dashboard/home'}>Dashboard</NavLink> &gt; Actualité</div>
            </div>
            <div className="actualite_section">
                <div className="actu_contain">
                    <Article/>
                </div>
                <div className="actu_trending">
                    <div className="articleBox trendingBox" style={{ backgroundColor: theme.palette.primary.main, borderColor: theme.palette.primary.third }}>
                        <TrendingArticle></TrendingArticle>
                    </div>
                </div>
            </div>
        </div>

    )
}

export default Actualite