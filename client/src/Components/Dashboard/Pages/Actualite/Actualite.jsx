import React from "react"
import {  NavLink, Outlet } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import './Actualite.css'
import {TrendingArticle} from './Trending'
import { UpdateLast } from './UpdateLast'
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';


const Actualite = () => {

    const theme = useTheme();

    const navigate = useNavigate()
    const [initialNavigationDone, setInitialNavigationDone] = useState(false);
  
  
    useEffect(() => {
        if (!initialNavigationDone && location.pathname === '/dashboard/actu/') {
          navigate('/dashboard/actu/article');
          setInitialNavigationDone(true);
        }
      }, [initialNavigationDone, navigate, location.pathname]);

    useEffect(() => {
        if (location.pathname !== '/dashboard/actu/' && initialNavigationDone) {
          setInitialNavigationDone(false);
        }
      }, [location.pathname, initialNavigationDone]);

    return(
        <div className="outlet">
            {/* Section titre avec breadcrumb */}
            <div className="title_section">
                <div className="breadCrumbs">
                    <NavLink 
                        className={'breadCrumbsLink'}
                        to="/dashboard/home"
                        style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                        Dashboard
                    </NavLink>
                    <span className="breadcrumb-separator" style={{ color: theme.palette.text.secondary }}> / </span>
                    <span className="breadcrumb-item-active" style={{ color: theme.palette.text.primary }}>
                        Actualité
                    </span>
                </div>
            </div>
            <div className="actualite_section">
                <div className="actu_contain">
                    <Outlet/>
                </div>
                <div className="actu_trending">
                    <div className="articleBox trendingBox" style={{ backgroundColor: theme.palette.primary.main, borderColor: theme.palette.primary.third }}>
                        <TrendingArticle/>
                    </div>
                    <div className="articleBox trendingBox" style={{ backgroundColor: theme.palette.primary.main, borderColor: theme.palette.primary.third }}>
                        <UpdateLast/>
                    </div>
                    <div className="margeBottomTrending">‎ </div>
                </div>
            </div>
        </div>

    )
}

export default Actualite