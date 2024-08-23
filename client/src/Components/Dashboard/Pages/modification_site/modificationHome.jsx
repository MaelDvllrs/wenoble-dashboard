import React, { useEffect, useRef } from "react"
import { NavLink } from "react-router-dom"
import { useTheme } from '@mui/material/styles';
import "./modificationHome.css"
import Axios from 'axios';
import { MdImportContacts, MdArrowForwardIos } from "react-icons/md";
import { FaElementor } from "react-icons/fa";
import { MdArticle } from "react-icons/md";

import Cookies from 'js-cookie';
import config from "../../../../config";




const ModificationHome = () => {

    const token = Cookies.get('token');
    const apiUrl = config.apiUrl;

    const theme = useTheme();


    const containerRef = useRef();
    
    useEffect(() => {
        const observer = new ResizeObserver(entries => {
          for (let entry of entries) {
            const width = entry.contentRect.width;
            const target = entry.target;
    
            if (width <= 600) {
              target.style.gridTemplateColumns = 'repeat(1, 1fr)';
            } else if (width <= 1165) {
              target.style.gridTemplateColumns = 'repeat(2, 1fr)';
            } else if (width <= 1675) {
              target.style.gridTemplateColumns = 'repeat(3, 1fr)';
            } else if (width <= 1900) {
              target.style.gridTemplateColumns = 'repeat(4, 1fr)';
            } else {
            target.style.gridTemplateColumns = 'repeat(5, 1fr)';
          }
            
          }
        });
    
        if (containerRef.current) {
          observer.observe(containerRef.current);
        }
    
        return () => {
          if (containerRef.current) {
            observer.unobserve(containerRef.current);
          }
        };
      }, []);


      const getTotalSize = async () => {
        const totalSize = Axios.get(`${apiUrl}/getTotalSize`, {
            params: {
                token: token,
            }
        });
    };

    useEffect(() => {
      getTotalSize();
    },[]);


    return(
        <div className="outlet">
            <div className="breadCrumbs"><NavLink style={{color: theme.palette.text.primary}} className={"breadCrumbsLink"} to={'/dashboard/home'}>Dashboard</NavLink> &gt; Modification</div>
            <div className="modification_page_contain">
                <div ref={containerRef} className="modification_link_contain">
                    <NavLink to={'/dashboard/modification/portfolio'} className="modification_box_1 modification_box">
                        <div className="modification_title_box">
                            <div className="modification_title"><MdImportContacts  className="icon_modifiaction_title"/><b>Portfolios</b></div>
                            <div className="button_modificationHome"><MdArrowForwardIos /></div>
                        </div>
                        <div className="texte_modification">
                            Transformez vos portfolios photo en un clin d'œil avec notre outil intuitif. 
                            Ajoutez, supprimez et réorganisez vos images facilement pour créer des galeries époustouflantes qui captivent vos visiteurs.</div>
                        <div className="line_modification"></div>
                        <div className="modification_image_box_portfolio">
                            <div className="colone_modification_portfolio">
                                <div className="portfolio_modification_image portfolio_modification_image_1"></div>
                                <div className="portfolio_modification_image portfolio_modification_image_1"></div>
                            </div>
                            <div className="colone_modification_portfolio">
                                <div className="portfolio_modification_image portfolio_modification_image_2"></div>
                                <div className="portfolio_modification_image portfolio_modification_image_2"></div>
                            </div>
                            <div className="colone_modification_portfolio">
                                <div className="portfolio_modification_image portfolio_modification_image_3"></div>
                                <div className="portfolio_modification_image portfolio_modification_image_3"></div>
                            </div>
                        </div>
                    </NavLink>
                    <NavLink to={'/dashboard/modification/page'} className="modification_box_2 modification_box">
                        <div className="modification_title_box">
                                <div className="modification_title"><FaElementor  className="icon_modifiaction_title"/><b>Page</b></div>
                                <div className="button_modificationHome"><MdArrowForwardIos /></div>
                            </div>
                            <div className="texte_modification">
                                Ajustez facilement le contenu visuel et textuel 
                                pour garantir un design attrayant et des messages clairs. 
                                Personnalisez chaque élément pour refléter parfaitement votre vision et captiver votre audience.</div>
                            <div className="line_modification"></div>
                            <div className="modification_image_box_page">
                                <div className="page_modification_image "></div>
                                <div className="colone_modification_page">
                                    <div className="page_modification_image page_modification_image_image"></div>
                                    <div className="page_modification_text_contain">
                                        <div className="page_modification_image "></div>
                                        <div className="page_modification_image "></div>
                                        <div className="page_modification_image "></div>
                                        <div className="page_modification_image "></div>
                                    </div>
                                </div>
                                
                                <div className="page_modification_image page_modification_image_last"></div>
                        </div>
                    </NavLink>
                    <NavLink to={'/dashboard/modification/blog'} className="modification_box_3 modification_box">
                        <div className="modification_title_box">
                                <div className="modification_title"><MdArticle className="icon_modifiaction_title"/><b>Blog</b></div>
                                <div className="button_modificationHome"><MdArrowForwardIos /></div>
                            </div>
                            <div className="texte_modification">
                            Dynamisez votre blog avec notre outil de gestion de contenu intuitif. 
                            Publiez des articles, ajoutez des images et des vidéos, et gérez vos posts en toute simplicité. 
                            Créez un blog attrayant et engageant pour captiver et fidéliser vos lecteurs.</div>
                            <div className="line_modification"></div>
                            <div className="modification_image_box_page">
                                <div className="blog_modification_image blog_modification_image_half"></div>
                                <div className="blog_modification_image "></div>
                                <div className="blog_modification_image "></div>
                                <div className="blog_modification_image "></div>
                                <div className="blog_modification_image "></div>
                                <div className="blog_modification_image blog_modification_image_half blog_modification_image_last"></div>
                        </div>
                    </NavLink>
                </div>
            </div>
        </div>
    )
}

export default ModificationHome