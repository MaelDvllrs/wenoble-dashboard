import React from "react"
import Axios from 'axios';
import { useState, useEffect } from "react";
import Cookies from 'js-cookie';
import {jwtDecode} from 'jwt-decode'; 
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import '../Portfolio/portfolio.css';
import config from "../../../../../config";
import { useTheme } from '@mui/material/styles';
import { de } from "date-fns/locale";


const Page = () => {

    const theme = useTheme();
    const token = Cookies.get('token');
    
    const navigate = useNavigate()
    const [initialNavigationDone, setInitialNavigationDone] = useState(false);

    

    const apiUrl = config.apiUrl; 

    const [decodedPage, setDecodedPage] = useState(null);


    const [Infopage, setInfopage] = useState(null);

    useEffect(() => {
        const user = Cookies.get('token');
    
        if (user) { 
            const decodedUser = jwtDecode(user);
    
            Axios.get(`${apiUrl}/getPage`, {
                params: {
                    IdUser: decodedUser.idUser,
                },
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
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
                
                navigate('/dashboard/modification/page/' + decoded.page[0].id);
                setInitialNavigationDone(true);
            }
        }
    }, [Infopage, initialNavigationDone, navigate]);

    return(
        <div className="outlet">
            <div className="title_section">
            <div className="breadCrumbs"><NavLink style={{color: theme.palette.text.primary}} className={"breadCrumbsLink"} to={'/dashboard/home'}>Dashboard</NavLink> &gt; <NavLink style={{color: theme.palette.text.primary}} className={"breadCrumbsLink"} to={'/dashboard/modification'}>Modification</NavLink> &gt; Page</div>
            </div>

            <div className="dashboard_case_empty" style={{backgroundColor : theme.palette.primary.secondary, borderColor : theme.palette.primary.third}}>
                <div className="portfolio_onglet_box">
                    {decodedPage && decodedPage.page.map((pageItem) => (
                        <NavLink to={'/dashboard/modification/page/' + pageItem.id} className={({ isActive }) => (isActive ? 'page_ongletActive' : 'portfolio_onglet')} key={pageItem.id}>
                            <p style={{color: theme.palette.text.primary}}>{pageItem.page_name}</p>
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
export default Page