import React from "react"
import {  NavLink } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { useWebsite } from '../../../../Context/WebsiteContext';

import { SearchConsoleStatistique } from "./searchConsoleStatisique";
import { SearchConsoleTab } from "./searchConsoleTab";



const StatistiqueSearchConsole = () => {

    const theme = useTheme();
    const { selectedWebsite } = useWebsite();


    return(
        <div className="outlet-box">
            
            
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