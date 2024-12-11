import React from 'react';
import { useTheme } from '@mui/material/styles';
import config from '../../../../config';
import {useUpdates} from './useUpdate'
import { NavLink } from 'react-router-dom';
import './Actualite.css'
import {formatDistanceWithoutApprox} from '../../utils/dateUtils'

const Update = () => {
  const theme = useTheme();
  const apiUrl = config.apiUrl;
  const updates = useUpdates();




  return (
    <div className='article_container'>
      {updates.map((update, index) => (
        <div key={index}>
            <div className="UpdateContainActu">
                <div className="UpdateLineContain">
                    <p className="UpdateCirlce" style={{color : theme.palette.text.secondary}}>●</p>
                    <div className="UpdateLine" style={{backgroundColor : theme.palette.text.secondary}}></div>
                </div>
                <div className="UpdateTitleContain">
                    <p style={{color : theme.palette.text.secondary}}>{formatDistanceWithoutApprox(update.date)}</p>
                    <NavLink
                        key={index}
                        to={`/dashboard/actu/update/${update.slug}`}
                        className={"UpdateTitleBoxPage"}
                        style={{ 
                            color : theme.palette.text.primary,
                            '--primary-hover-color': theme.palette.text.secondary,
                        }}
                    >
                         <p className="articleTemplateTitle updateTitlepage">{update.name}</p>
                    </NavLink>
                   
                </div>
            </div>
        </div>
      ))}
    </div>
  );
};

export default Update;