import React from "react"
import {  NavLink } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';

import { SearchConsoleStatistique } from "./searchConsoleStatisique";
import { SearchConsoleTab } from "./searchConsoleTab";



const StatistiqueSearchConsole = () => {

    const theme = useTheme();


    return(
        <div className="outlet-box">
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
                    <NavLink 
                        className={'breadCrumbsLink'}
                        to="/dashboard/stats"
                        style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                        Statistiques
                    </NavLink>
                    <span className="breadcrumb-separator" style={{ color: theme.palette.text.secondary }}> / </span>
                    <span className="breadcrumb-item-active" style={{ color: theme.palette.text.primary }}>
                        Search Console
                    </span>
                </div>
            </div>
            
            <div className="statistique-section">
                <div className="grid-stats-container">
                    <SearchConsoleStatistique/>
                </div>
                <div className="grid-stats-container">
                    <SearchConsoleTab/>
                </div>
            </div>
        </div>

    )
}

export default StatistiqueSearchConsole