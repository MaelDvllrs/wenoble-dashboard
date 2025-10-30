import React from "react"
import {  NavLink } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { useWebsite } from '../../../../Context/WebsiteContext';

import { UserStatistique } from './userStatistique';
import { EventStatistique } from "./eventStatistique";
import { CityStatistique } from "./cityStatistique";
import { PlatformCategorieStatistique } from "./platformCategorieStatistique";
import { PageStatistique } from "./pageStatistique";
import { SearchConsoleStatistique } from "./searchConsoleStatisique";
import { SearchConsoleTab } from "./searchConsoleTab";



const StatistiqueAnalytics = () => {

    const theme = useTheme();
    const { selectedWebsite } = useWebsite();


    return(
        <div className="outlet-box">
            
            
            <div className="statistique-section">
                <div  className="grid-line-statistique">
                        <UserStatistique />
                        <EventStatistique/>
                </div>
                <div  className="grid-line-statistique">
                    <div className="grid-stats-container">
                        <p className="title-statisqtique" style={{color : theme.palette.text.secondary}}><b>D'où proviennent vos visiteurs ?</b></p>
                        <CityStatistique/>
                    </div>
                    <div className="grid-stats-container">
                        <p className="title-statisqtique" style={{color : theme.palette.text.secondary}}><b>Quelle est la répartition des utilisateurs par plate-forme ?</b></p>
                        <PlatformCategorieStatistique/>
                    </div>
                </div>
                <div className="grid-stats-container">
                    <p className="title-statisqtique" style={{color : theme.palette.text.secondary}}><b>Quelle est la répartition des utilisateurs de votre site ?</b></p>
                    <PageStatistique/>
                </div>
            </div>
        </div>

    )
}

export default StatistiqueAnalytics