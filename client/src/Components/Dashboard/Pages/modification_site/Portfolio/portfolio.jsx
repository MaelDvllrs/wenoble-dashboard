import React from "react"
import Axios from 'axios';
import { useState, useEffect } from "react";
import Cookies from 'js-cookie';
import {jwtDecode} from 'jwt-decode'; 
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import './portfolio.css';
import config from "../../../../../config";
import { useTheme } from '@mui/material/styles';


const Portfolio = () => {

    const theme = useTheme();
    const navigateTo = useNavigate()


    const apiUrl = config.apiUrl; 

    let decodedPortfolio = null;

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


    if(Infoportfolio != null){
        decodedPortfolio = jwtDecode(Infoportfolio);
    }

    console.log(decodedPortfolio)


    

    return(
        <div className="outlet">
            <div className="title_section">
            <div className="breadCrumbs"><NavLink style={{color: theme.palette.text.primary}} className={"breadCrumbsLink"} to={'/dashboard/home'}>Dashboard</NavLink> / <NavLink style={{color: theme.palette.text.primary}} className={"breadCrumbsLink"} to={'/dashboard/modification'}>Modification</NavLink> / Portfolio</div>
            </div>

            <div className="dashboard_case_empty" style={{ backgroundColor: theme.palette.primary.main }}>
                <div className="portfolio_onglet_box">
                    {decodedPortfolio && decodedPortfolio.portfolio.map((portfolioItem) => (
                        <NavLink to={'/dashboard/modification/portfolio/' + portfolioItem.id_portfolio} className={({ isActive }) => (isActive ? 'portfolio_ongletActive' : 'portfolio_onglet')} key={portfolioItem.id_portfolio} style={{ backgroundColor: theme.palette.secondary.secondary}}>
                            <p style={{color: theme.palette.text.primary}}>{portfolioItem.portfolio_name}</p>
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