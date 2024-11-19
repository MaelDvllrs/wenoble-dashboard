import React from "react"
import { useTheme } from '@mui/material/styles';
import config from '../../../../config';
import {useUpdates} from './useUpdate' 
import UpdateIcon from '@mui/icons-material/Update';
import { NavLink } from 'react-router-dom';

export const UpdateLast = () => {
    const theme = useTheme();
    const apiUrl = config.apiUrl;
    const updates = useUpdates(5);
    
    
    return (
        <div className='article_container trending_container' >
            <div className="trendingTitleContain updateTitle" style={{backgroundColor : theme.palette.primary.secondary, borderColor: theme.palette.primary.third, }}>
                <UpdateIcon/>
                <p><b>Mise à jour</b> <span style={{color : theme.palette.text.secondary, fontSize: '0.8rem'}}>aujourd'hui</span></p>
            </div>
            {updates.map((update, index) => (
                <NavLink 
                    key={index}
                    to={`/dashboard/actu/update/${update.slug}`}
                    className="textContainArticle updateTextContain" 
                    style={{ 
                        color : theme.palette.text.primary,
                        '--primary-hover-background-color': theme.palette.primary.secondary,
                }}>
                    <div className="UpdateContainActu">
                        <div className="UpdateLineContain">
                            <p className="UpdateCirlce" style={{color : theme.palette.text.secondary}}>●</p>
                            <div className="UpdateLine" style={{backgroundColor : theme.palette.text.secondary}}></div>
                        </div>
                        <div className="UpdateTitleContain">
                            <p style={{color : theme.palette.text.secondary}}>{update.date}</p>
                            <p className="UpdateTitleBox"><b>{update.name}</b></p>
                        </div>
                    </div>
                </NavLink>
            ))}
            <div className="trendingTitleContain updateTitle UpdateDown" style={{backgroundColor : theme.palette.primary.secondary, borderColor: theme.palette.primary.third, }}>
                <NavLink
                to={'/dashboard/actu/update'}
                className={"UpdateDownLink"}
                style={{color: theme.palette.text.secondary,
                        '--primary-hover-color': theme.palette.text.primary,
                }}
                >
                    <p><span style={{fontSize: '0.8rem'}}>Voir toutes les mises à jour</span></p>
                </NavLink>
                
            </div>
        </div>
    );
}