import React from "react"
import Axios from 'axios';
import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useLocation, useResolvedPath } from 'react-router-dom';
import Cookies from 'js-cookie';
import {jwtDecode} from 'jwt-decode'; 
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import './portfolio.css';
import config from "../../../../../config";
import { useTheme } from '@mui/material/styles';





const Portfolio = () => {

    const theme = useTheme();
    const token = Cookies.get('token');
    const navigate = useNavigate()


    const apiUrl = config.apiUrl; 


    const [initialNavigationDone, setInitialNavigationDone] = useState(false);

    const [decodedPortfolio, setDecodedPortfolio] = useState(null);

    const [Infoportfolio, setInfoportfolio] = useState(null);
    
    useEffect(() => {
        

        if (token) {
            const decodedUser = jwtDecode(token);
          
            Axios.get(`${apiUrl}/getPortfolio`, {
              params: {
                IdUser: decodedUser.idUser,
              },headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }              
            }).then((response) => {
              setInfoportfolio(response.data);
            }).catch((error) => {
              console.error('Erreur lors de la récupération du portfolio', error);
            });
          }
    }, [Infoportfolio]);

  

    useEffect(() => {
        if(Infoportfolio != null){
            const decoded = jwtDecode(Infoportfolio);
            setDecodedPortfolio(decoded);
            if(decoded && decoded.portfolio.length > 0 && !initialNavigationDone) {
                navigate('/dashboard/website/modification/portfolio/' + decoded.portfolio[0].id_portfolio);
                setInitialNavigationDone(true);
            }
        }
    }, [Infoportfolio, initialNavigationDone, navigate]); 


    return(
        <div className="outlet-box portfolio_outlet">

            <div className="title_section">
            </div>

            <div className="dashboard_case_empty" style={{backgroundColor : theme.palette.primary.secondary, borderColor : theme.palette.primary.third}}>
                <div className="portfolio_onglet_box">
                {decodedPortfolio && decodedPortfolio.portfolio.map((pageItem) => (
                        <NavLink to={'/dashboard/website/modification/portfolio/' + pageItem.id_portfolio} className={({ isActive }) => (isActive ? 'page_ongletActive' : 'portfolio_onglet')} key={pageItem.id_portfolio}>
                            <p style={{color: theme.palette.text.primary}}>{pageItem.portfolio_name}</p>
                        </NavLink>
                    ))}
                </div>
                <div className='dashboard_section secondaire'>
                        <Outlet />
                </div>
            </div>    
        </div>
    )
}
export default Portfolio