import React from "react"
import Axios from 'axios';
import { useState, useEffect } from "react";
import Cookies from 'js-cookie';
import {jwtDecode} from 'jwt-decode'; 
import { Outlet, Link } from 'react-router-dom';
import './portfolio.css';
import config from "../../../../config";

const Portfolio = () => {

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
            <p className="dashboard_case_title"><b>Portfolio</b></p>
                <div className="portfolio_onglet_box">
                    {decodedPortfolio && decodedPortfolio.portfolio.map((portfolioItem) => (
                        <Link to={'/dashboard/portfolio/' + portfolioItem.id_portfolio} className="portfolio_onglet" key={portfolioItem.id_portfolio} >
                            <p>{portfolioItem.portfolio_name}</p>
                        </Link>
                    ))}
                </div>
            </div>


            <div className="dashboard_case_empty">
                <div className='dashboard_section secondaire'>
                        <Outlet />
                </div>
            </div>            
        </div>
    )
}
export default Portfolio