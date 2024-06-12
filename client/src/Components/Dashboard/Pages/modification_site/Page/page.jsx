import React from "react"
import Axios from 'axios';
import { useState, useEffect } from "react";
import Cookies from 'js-cookie';
import {jwtDecode} from 'jwt-decode'; 
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import '../Portfolio/portfolio.css';
import config from "../../../../../config";
import { useTheme } from '@mui/material/styles';


const Page = () => {

    const theme = useTheme();
    const navigate = useNavigate()
    const [initialNavigationDone, setInitialNavigationDone] = useState(false);

    

    const apiUrl = config.apiUrl; 

    const [decodedPage, setDecodedPage] = useState(null);


    const [Infopage, setInfopage] = useState(null);

    useEffect(() => {
        const user = Cookies.get('user');
    
        if (user) { 
            const decodedUser = jwtDecode(user);
    
            Axios.get(`${apiUrl}/getPage`, {
                params: {
                    IdUser: decodedUser.user[0].id_user,
                }
            }).then((response) => {
                setInfopage(response.data);
            }).catch((error) => {
                console.error('Erreur lors de la récupération de la page :', error);
            });
        }
    }, [Infopage]);



    useEffect(() => {
        if(Infopage != null){
            const decoded = jwtDecode(Infopage);
            setDecodedPage(decoded);
            if(decoded && decoded.page.length > 0 && !initialNavigationDone) {
                navigate('/dashboard/modification/page/' + decoded.page[0].id_page);
                setInitialNavigationDone(true);
            }
        }
    }, [Infopage, initialNavigationDone, navigate]);

    return(
        <div className="outlet">
            <div className="title_section">
            <div className="breadCrumbs"><NavLink style={{color: theme.palette.text.primary}} className={"breadCrumbsLink"} to={'/dashboard/home'}>Dashboard</NavLink> &gt; <NavLink style={{color: theme.palette.text.primary}} className={"breadCrumbsLink"} to={'/dashboard/modification'}>Modification</NavLink> &gt; Page</div>
            </div>

            <div className="dashboard_case_empty">
                <div className="portfolio_onglet_box">
                    {decodedPage && decodedPage.page.map((pageItem) => (
                        <NavLink to={'/dashboard/modification/page/' + pageItem.id_page} className={({ isActive }) => (isActive ? 'page_ongletActive' : 'portfolio_onglet')} key={pageItem.id_page}>
                            <p style={{color: theme.palette.text.primary}}>{pageItem.page_name}</p>
                        </NavLink>
                    ))}
                </div>
                <div className='dashboard_section secondaire'>
                        <Outlet />
                </div>
            </div>       
            <div className="background_glow background_glow_page"></div>   
        </div>
    )
}
export default Page