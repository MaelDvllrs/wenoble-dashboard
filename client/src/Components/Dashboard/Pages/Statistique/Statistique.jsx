import React from "react"
import {  NavLink } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';

import { UserStatistique } from './userStatistique';
import { EventStatistique } from "./eventStatistique";
import { CityStatistique } from "./cityStatistique";
import { PlatformCategorieStatistique } from "./platformCategorieStatistique";
import { PageStatistique } from "./pageStatistique";



const Statistique = () => {

    const theme = useTheme();


    return(
        <div className="outlet">
            <div className="title_section">
                <div className="breadCrumbs"><NavLink style={{color: theme.palette.text.primary}} className={"breadCrumbsLink"} to={'/dashboard/home'}>Dashboard</NavLink> &gt; Statistique</div>
            </div>
            
            <div className="statistique-section">
                <div  className="grid-line-statistique">
                    <UserStatistique/>
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

export default Statistique