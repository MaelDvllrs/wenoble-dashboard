import React from "react"
import {  NavLink } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';

import { UserStatistique } from './userStatistique';
import { EventStatistique } from "./eventStatistique";
import { CityStatistique } from "./cityStatistique";
import { PlatformCategorieStatistique } from "./platformCategorieStatistique";
import { PageStatistique } from "./pageStatistique";
import { SearchConsoleStatistique } from "./searchConsoleStatisique";
import { SearchConsoleTab } from "./searchConsoleTab";



const Statistique = () => {

    const theme = useTheme();


    return(
        <div className="outlet">
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
                        Statistiques
                    </span>
                </div>
            </div>
            
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
                <div className="grid-stats-container">
                    <p className="title-statisqtique" style={{color : theme.palette.text.secondary}}><b>Quelle est la répartition des utilisateurs de votre site ?</b></p> 
                    <SearchConsoleStatistique/>
                </div>
                <div className="grid-stats-container">
                    <p className="title-statisqtique" style={{color : theme.palette.text.secondary}}><b>Quelle est la répartition des utilisateurs de votre site ?</b></p> 
                    <SearchConsoleTab/>
                </div>
            </div>
        </div>

    )
}

export default Statistique