import React from "react"
import {  NavLink } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';

import { SearchConsoleStatistique } from "./searchConsoleStatisique";
import { SearchConsoleTab } from "./searchConsoleTab";



const StatistiqueSearchConsole = () => {

    const theme = useTheme();


    return(
        <div className="outlet">
            <div className="title_section">
                <div className="breadCrumbs"><NavLink style={{color: theme.palette.text.primary}} className={"breadCrumbsLink"} to={'/dashboard/home'}>Dashboard</NavLink> &gt; <NavLink style={{color: theme.palette.text.primary}} className={"breadCrumbsLink"} to={'/dashboard/stats'}>Statistiques</NavLink> &gt; Analytics</div>
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