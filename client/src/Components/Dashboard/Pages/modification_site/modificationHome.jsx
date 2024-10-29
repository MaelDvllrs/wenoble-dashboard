import React, { useEffect, useRef, useState } from "react"
import { NavLink } from "react-router-dom"
import { useTheme } from '@mui/material/styles';
import "./modificationHome.css"
import Axios from 'axios';
import { MdImportContacts, MdArrowForwardIos } from "react-icons/md";
import { FaElementor } from "react-icons/fa";
import { MdArticle } from "react-icons/md";
import gridBlog from "../../../../assets/background/grid_blog.svg";

import ImageIcon from '@mui/icons-material/Image';
import VideocamIcon from '@mui/icons-material/Videocam';
import TextFieldsIcon from '@mui/icons-material/TextFields';



import Cookies from 'js-cookie';
import config from "../../../../config";




const ModificationHome = () => {

    const token = Cookies.get('token');
    const apiUrl = config.apiUrl;

    const theme = useTheme();

    const containerRef = useRef();

    const [sizeTotal, setSizeTotal] = useState(0);
    const [threshold, setThreshold] = useState(1); 

    
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


    const iconContainerRef = useRef(null);


    useEffect(() => {
      const container = iconContainerRef.current;
      const icons = container.querySelectorAll('.big_icon');
  
      const handleMouseMove = (event) => {
        const { clientX, clientY } = event;
  
        icons.forEach((icon, index) => {
          const rect = icon.getBoundingClientRect();
          const offsetX = clientX - rect.left - rect.width / 2;
          const offsetY = clientY - rect.top - rect.height / 2;
  
          let moveX = 0;
          let moveY = 0;
  
          switch (index) {
            case 0:
              // Inverse de la souris
              moveX = -offsetX /5;
              moveY = -offsetY /5;
              break;
            case 1:
              // Même X, inverse Y
              moveX = offsetX / 5;
              moveY = -offsetY / 5;
              break;
            case 2:
              // Même Y, inverse X
              moveX = -offsetX / 5;
              moveY = offsetY / 5;
              break;
            default:
              break;
          }
  
          icon.style.transform = `translate(${moveX}px, ${moveY}px)`;
        });
      };
  
      const handleMouseEnter = () => {
        window.addEventListener('mousemove', handleMouseMove);
      };
  
      const handleMouseLeave = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        icons.forEach((icon) => {
          icon.style.transition = 'transform 0.5s ease-out';
          icon.style.transform = 'translate(0, 0)';
        });
      };
  
      container.addEventListener('mouseenter', handleMouseEnter);
      container.addEventListener('mouseleave', handleMouseLeave);
  
      return () => {
        container.removeEventListener('mouseenter', handleMouseEnter);
        container.removeEventListener('mouseleave', handleMouseLeave);
        window.removeEventListener('mousemove', handleMouseMove);
      };
    }, []);


    
    
    useEffect(() => {
      const getTotalSize = async () => {
        try {
          const response = await Axios.get(`${apiUrl}/getSizeItem`, {
              params: {
                token: token,
              }
          });

          const totalSize = (response.data.totalSize / 1024);
          
          const totalSizeInGB = (totalSize / 1024).toFixed(4);
          setSizeTotal(totalSizeInGB);


          const newThreshold = Math.ceil(totalSizeInGB);
          setThreshold(newThreshold);

        } catch (error) {
            console.error('Erreur lors de la récupération de la taille totale :', error);
        }
  
      };
      getTotalSize();
    },[]);




    return(
        <div className="outlet">
            <div className="breadCrumbs"><NavLink style={{color: theme.palette.text.primary}} className={"breadCrumbsLink"} to={'/dashboard/home'}>Dashboard</NavLink> &gt; Modification</div>
            <div className="modification_contain">
              <div className="dashboard_case_empty limit_size_contain" style={{backgroundColor : theme.palette.primary.secondary, borderColor : theme.palette.primary.third}}>
                <h3 className="title_contain">Espace utilisé</h3>
                <div className="limit_size_text">{sizeTotal} / {threshold} Go</div>
                <div className="limit_size_bar" style={{backgroundColor:theme.palette.secondary.secondary}}>
                  <div 
                    className="limit_size_bar_fill"
                    style={{ width: `${(sizeTotal / (threshold)) * 100}%` }}
                  />      
                </div>
              </div>
              <div className="modification_page_contain">
                  <div ref={containerRef} className="modification_link_contain">
                      <NavLink to={'/dashboard/modification/portfolio'} className="modification_box" style={{backgroundColor : theme.palette.primary.secondary, borderColor : theme.palette.primary.third}}>
                          <div className="modification_title_box" style={{color: theme.palette.text.primary}}>
                              <div className="modification_title"><MdImportContacts  className="icon_modifiaction_title"/><b>Portfolio</b></div>
                              <div className="button_modificationHome"><MdArrowForwardIos /></div>
                          </div>
                          <div className="texte_modification" style={{color: theme.palette.text.secondary}}>
                            Transformez vos portfolios photo en un instant ! Ajoutez, supprimez et réorganisez vos images pour créer des galeries captivantes.
                          </div>
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
                      <NavLink to={'/dashboard/modification/page'} className="modification_box" style={{backgroundColor : theme.palette.primary.secondary, borderColor : theme.palette.primary.third}}>
                          <div className="modification_title_box" style={{color: theme.palette.text.primary}}>
                                  <div className="modification_title"><FaElementor  className="icon_modifiaction_title"/><b>Page</b></div>
                                  <div className="button_modificationHome"><MdArrowForwardIos /></div>
                              </div>
                              <div className="texte_modification" style={{color: theme.palette.text.secondary}}>  
                                Ajustez facilement visuels et textes pour un design attrayant et des messages clairs, reflétant votre vision et captivant votre audience.
                              </div>
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
                      <NavLink to={'/dashboard/modification/blog'} className="modification_box" style={{backgroundColor : theme.palette.primary.secondary, borderColor : theme.palette.primary.third}}>
                          <div className="modification_title_box" style={{color: theme.palette.text.primary}}>
                            <div className="modification_title"><MdArticle className="icon_modifiaction_title"/><b>Blog</b></div>
                            <div className="button_modificationHome"><MdArrowForwardIos /></div>
                          </div>
                          <div className="texte_modification" style={{color: theme.palette.text.secondary}}>
                            Dynamisez votre blog avec notre outil intuitif : publiez articles, images et vidéos facilement pour captiver vos lecteurs.
                          </div>
                          <div className="modification_image_box_blog" ref={iconContainerRef}>
                            <img src={gridBlog} alt="grid blog" className="grid_blog" />
                            <ImageIcon className="icon_modifiaction_title big_icon icon_modif_blog_1" style={{color: theme.palette.text.primary}}/>
                            <VideocamIcon className="icon_modifiaction_title big_icon icon_modif_blog_2" style={{color: theme.palette.text.primary}}/>
                            <TextFieldsIcon className="icon_modifiaction_title big_icon icon_modif_blog_3" style={{color: theme.palette.text.primary}}/>
                          </div>
                      </NavLink>
                  </div>
              </div>
            </div>
            
        </div>
    )
}

export default ModificationHome