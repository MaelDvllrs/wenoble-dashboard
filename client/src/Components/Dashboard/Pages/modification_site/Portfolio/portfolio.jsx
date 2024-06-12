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
    const navigate = useNavigate()


    const apiUrl = config.apiUrl; 


    const [initialNavigationDone, setInitialNavigationDone] = useState(false);

    const [decodedPortfolio, setDecodedPortfolio] = useState(null);

    const [Infoportfolio, setInfoportfolio] = useState(null);
    
    useEffect(() => {
        const user = Cookies.get('user');

        if (user) { 
            const decodedUser = jwtDecode(user);

            Axios.get(`${apiUrl}/getPortfolio`, {
                params: {
                    IdUser: decodedUser.user[0].id_user,
                }
                
                
            }).then((response) => {
                setInfoportfolio(response.data);
            });
        }
    }, [Infoportfolio]);



    useEffect(() => {
        if(Infoportfolio != null){
            const decoded = jwtDecode(Infoportfolio);
            setDecodedPortfolio(decoded);
            if(decoded && decoded.portfolio.length > 0 && !initialNavigationDone) {
                navigate('/dashboard/modification/portfolio/' + decoded.portfolio[0].id_portfolio);
                setInitialNavigationDone(true);
            }
        }
    }, [Infoportfolio, initialNavigationDone, navigate]); 


    return(
        <div className="outlet portfolio_outlet">

            <div className="title_section">
                <div className="breadCrumbs"><NavLink style={{color: theme.palette.text.primary}} className={"breadCrumbsLink"} to={'/dashboard/home'}>Dashboard</NavLink> &gt; <NavLink style={{color: theme.palette.text.primary}} className={"breadCrumbsLink"} to={'/dashboard/modification'}>Modification</NavLink> &gt; Portfolio</div>
            </div>

            <div className="dashboard_case_empty">
                <div className="portfolio_onglet_box">
                {decodedPortfolio && decodedPortfolio.portfolio.map((pageItem) => (
                        <NavLink to={'/dashboard/modification/portfolio/' + pageItem.id_portfolio} className={({ isActive }) => (isActive ? 'portfolio_ongletActive' : 'portfolio_onglet')} key={pageItem.id_portfolio}>
                            <p style={{color: theme.palette.text.primary}}>{pageItem.portfolio_name}</p>
                        </NavLink>
                    ))}
                </div>
                <div className='dashboard_section secondaire'>
                        <Outlet />
                </div>
            </div>    
            <div className="background_glow background_glow_portfolio"></div>      
        </div>
    )
}
export default Portfolio