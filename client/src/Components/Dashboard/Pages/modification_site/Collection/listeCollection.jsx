import React from "react"
import Axios from 'axios';
import { useState, useEffect } from "react";
import Cookies from 'js-cookie';
import {jwtDecode} from 'jwt-decode'; 
import { Outlet, NavLink, useNavigate, useParams } from 'react-router-dom';
import { CssTextField, DefaultSwitch, DefaultButton} from '../../../../../Theme/element';
import { useTheme } from '@mui/material/styles';
import './listeCollection.css'
import '../Portfolio/portfolio.css';
import config from "../../../../../config";
import AddIcon from '@mui/icons-material/Add';
import { SkeletonBlog } from "../../../../skeleton/skeleton";
import { formatDate } from "../../../../../utils/dateUtils";
import { PiSmileyMeltingFill } from "react-icons/pi";


const ListeCollection = () => {

    const theme = useTheme();
    const token = Cookies.get('token')

    const [InfoListeblog, setInfoblog] = useState([]);
    const apiUrl = config.apiUrl;
    const { idCollection } = useParams();

    const [LoadingBlog, setLoadingBlog] = useState(true);


    useEffect(() => {    

            const user = Cookies.get('token');
            const decodedUser = jwtDecode(user);
    
            Axios.get(`${apiUrl}/getListeCollection`, {
                params: {
                    IdBlog: idCollection,
                    idUser: decodedUser.idUser,
                },
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
            }).then((response) => {
                setInfoblog(jwtDecode(response.data));
                setLoadingBlog(false);
            }).catch((error) => {
                console.error('Erreur lors de la récupération de la du Blog :', error);
            });
            
    }, [idCollection]);



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
              <p style={{color: theme.palette.text.secondary}} className="Item_portfolio_element blog_status">Status</p>
              <p style={{color: theme.palette.text.secondary}} className="Item_portfolio_element blog_date_element">Date de création</p>
              <p style={{color: theme.palette.text.secondary}} className="Item_portfolio_element blog_date_element">Date de modification</p>
              <p style={{color: theme.palette.text.secondary}} className="Item_portfolio_element blog_date_element">Date de Publication</p>
            </div>
            <div className="line_horizontal" style={{ backgroundColor: theme.palette.text.secondary }}></div>

            <div className="liste_blog_box">
                {LoadingBlog ? (
                  <SkeletonBlog />
                  ) : InfoListeblog && Array.isArray(InfoListeblog.blogList) && InfoListeblog.blogList.length === 0 ? (
                    <div className="noImageContain">
                      <PiSmileyMeltingFill style={{ fontSize: 50, color: theme.palette.text.primary }} />
                      <p style={{ color: theme.palette.text.primary }}>Votre blog est vide.</p>
                    </div>
                  ) : (
                    InfoListeblog && Array.isArray(InfoListeblog.blogList) ? (
                      InfoListeblog.blogList.map((blogpage, index) => {
                        const formattedCreateDate = formatDate(blogpage.collection_element_create_date);
                        const formattedUpdateDate = formatDate(blogpage.collection_element_update_date);
                        const formattedPublishDate = formatDate(blogpage.collection_element_publish_date);

                        return (
                          <NavLink
                            to={'editPage/' + blogpage.id}
                            key={index}
                            className="Item_Portfolio Item_Blog"
                            style={{ '--hover-background-color': theme.palette.secondary.secondary, color: theme.palette.text.primary }}
                          >
                            <p className="Item_portfolio_element order_element">{index}</p>
                            <p className="Item_portfolio_element blog_name_element">{blogpage.collection_element_name}</p>
                            {blogpage.collection_element_status === true ? (
                              <p className="Item_portfolio_element blog_status publish_status">Publié</p>
                            ) : (
                              <p className="Item_portfolio_element blog_status draft_status">Brouillon</p>
                            )}
                            <p className="Item_portfolio_element blog_date_element">{formattedCreateDate}</p>
                            <p className="Item_portfolio_element blog_date_element">{formattedUpdateDate}</p>
                            <p className="Item_portfolio_element blog_date_element">{formattedPublishDate}</p>
                          </NavLink>
                        );
                      })
                    ) : (
                      <p></p>
                    )
                )}
            </div>
            
        </div>
    )
}

export default ListeCollection