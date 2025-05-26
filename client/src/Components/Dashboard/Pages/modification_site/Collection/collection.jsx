import React from "react"
import Axios from '../../../../../service/AxiosConfig';

import { useState, useEffect } from "react";
import Cookies from 'js-cookie';
import {jwtDecode} from 'jwt-decode'; 
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import '../Portfolio/portfolio.css';
import config from "../../../../../config";
import { useTheme } from '@mui/material/styles';





const Collection = () => {

    const theme = useTheme();
    const token = Cookies.get('token')
    
    const navigate = useNavigate()
    const [initialNavigationDone, setInitialNavigationDone] = useState(false);

    ;

    

    const apiUrl = config.apiUrl; 

    const [decodedBlog, setDecodedBlog] = useState(null);


    const [Infoblog, setInfoblog] = useState(null);

    useEffect(() => {
        const user = Cookies.get('token');
    
        if (user) { 
            const decodedUser = jwtDecode(user);
    
            Axios.get(`${apiUrl}/getCollection`, {
                params: {
                    IdUser: decodedUser.idUser,
                },
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
            }).then((response) => {
                setInfoblog(response.data);

            }).catch((error) => {
                console.error('Erreur lors de la récupération de la du Blog :', error);
            });
        }
    }, [Infoblog]);


    useEffect(() => {
        if(Infoblog != null){
            const decoded = jwtDecode(Infoblog);
            setDecodedBlog(decoded);
            if(decoded && decoded.blog.length > 0 && !initialNavigationDone) {
                navigate('/dashboard/modification/collection/' + decoded.blog[0].id);
                setInitialNavigationDone(true);
            }
        }
    }, [Infoblog, initialNavigationDone, navigate]);

    return(
        <div className="outlet">
            <div className="title_section">
            <div className="breadCrumbs"><NavLink style={{color: theme.palette.text.primary}} className={"breadCrumbsLink"} to={'/dashboard/home'}>Dashboard</NavLink> &gt; <NavLink style={{color: theme.palette.text.primary}} className={"breadCrumbsLink"} to={'/dashboard/modification'}>Modification</NavLink> &gt; Blog</div>
            </div>

            <div className="dashboard_case_empty" style={{backgroundColor : theme.palette.primary.secondary, borderColor : theme.palette.primary.third}}>
                <div className="portfolio_onglet_box">
                    {decodedBlog && decodedBlog.blog.map((blogItem) => (
                        <NavLink to={'/dashboard/modification/collection/' + blogItem.id} className={({ isActive }) => (isActive ? 'page_ongletActive' : 'portfolio_onglet')} key={blogItem.id}>
                            <p style={{color: theme.palette.text.primary}}>{blogItem.collection_name}</p>
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
export default Collection