import React from "react"
import Axios from 'axios';
import { useState, useEffect } from "react";
import Cookies from 'js-cookie';
import {jwtDecode} from 'jwt-decode'; 
import { Outlet, NavLink, useNavigate, useParams } from 'react-router-dom';
import { CssTextField, DefaultSwitch, DefaultButton} from '../../../../../Theme/element';
import { useTheme } from '@mui/material/styles';
import './listeBlog.css'
import '../Portfolio/portfolio.css';
import config from "../../../../../config";
import AddIcon from '@mui/icons-material/Add';


const ListeBlog = () => {

    const theme = useTheme();

    const [InfoListeblog, setInfoblog] = useState([]);
    const apiUrl = config.apiUrl;
    const { id } = useParams();


    useEffect(() => {    

            const user = Cookies.get('token');
            const decodedUser = jwtDecode(user);
    
            Axios.get(`${apiUrl}/getListeBlog`, {
                params: {
                    IdBlog: id,
                    idUser: decodedUser.idUser,
                }
            }).then((response) => {
                setInfoblog(jwtDecode(response.data));
            }).catch((error) => {
                console.error('Erreur lors de la récupération de la du Blog :', error);
            });
    }, [id]);




    return(
        <div className="liste_blog_contain">
            <div className="header_modification">
                <h3 >Liste des pages</h3>
                <div className="button_save_contain">
                    <NavLink to={'createPage'} ><DefaultButton type="submit" variant="contained"><AddIcon/>Créer Page</DefaultButton></NavLink>
                </div>
            </div>

            <div className="Item_menu">
              <p style={{color: theme.palette.text.secondary}} className="Item_portfolio_element order_element">Ordre</p>
              <p style={{color: theme.palette.text.secondary}} className="Item_portfolio_element blog_name_element">Titre du blog</p>
              <p style={{color: theme.palette.text.secondary}} className="Item_portfolio_element blog_status">Satus</p>
              <p style={{color: theme.palette.text.secondary}} className="Item_portfolio_element blog_date_element">Date de création</p>
              <p style={{color: theme.palette.text.secondary}} className="Item_portfolio_element blog_date_element">Date de modification</p>
            </div>
            <div className="line_horizontal" style={{ backgroundColor: theme.palette.text.secondary }}></div>

            <div className="liste_blog_box">
                {InfoListeblog && Array.isArray(InfoListeblog.blogList) ? InfoListeblog.blogList.map((blogpage, index) => {
                    // Convertir page_blog_create_date
                    const createDate = new Date(blogpage.page_blog_create_date);
                    const formattedCreateDate = new Intl.DateTimeFormat('fr-FR', {
                        year: 'numeric', month: '2-digit', day: '2-digit',
                        hour: '2-digit', minute: '2-digit', hour12: false
                    }).format(createDate);
                
                    // Convertir page_blog_update_date
                    const updateDate = new Date(blogpage.page_blog_update_date);
                    const formattedUpdateDate = new Intl.DateTimeFormat('fr-FR', {
                        year: 'numeric', month: '2-digit', day: '2-digit',
                        hour: '2-digit', minute: '2-digit', hour12: false
                    }).format(updateDate);
                
                    return (
                        <NavLink to={'editPage/' + blogpage.id_page_blog} key={index} className="Item_Portfolio Item_Blog" style={{'--hover-background-color': theme.palette.secondary.secondary, color: theme.palette.text.primary}}>
                            <p className="Item_portfolio_element order_element">{index}</p>
                            <p className="Item_portfolio_element blog_name_element">{blogpage.page_blog_name}</p>
                            {blogpage.status === 1 ? (
                                <p className="Item_portfolio_element blog_status publish_status">Publié</p>
                            ) : (
                                <p className="Item_portfolio_element blog_status draft_status">Brouillon</p>
                            )}
                            <p className="Item_portfolio_element blog_date_element">{formattedCreateDate}</p>
                            <p className="Item_portfolio_element blog_date_element">{formattedUpdateDate}</p>
                        </NavLink>
                    );

                }): <p></p>}
            </div>


        

            
            
        </div>
    )
}

export default ListeBlog