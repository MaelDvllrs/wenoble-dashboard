import React, { useEffect, useRef, useState } from "react"
import { NavLink } from "react-router-dom"
import { useTheme } from '@mui/material/styles';
import "./modificationHome.css"
import Axios from 'axios';
import { MdImportContacts, MdArrowForwardIos } from "react-icons/md";
import { PiLockBold } from "react-icons/pi";  
import { FaElementor } from "react-icons/fa";
import { MdArticle } from "react-icons/md";
import sphere_page from "../../../../assets/background/sphere_page.svg";
import { SkeletonTotalSize } from "../../../skeleton/skeleton";


import ImageIcon from '@mui/icons-material/Image';
import VideocamIcon from '@mui/icons-material/Videocam';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import AddIcon from '@mui/icons-material/Add';
import { BsCursor } from "react-icons/bs";


import Cookies from 'js-cookie';
import config from "../../../../config";

import { checkAuthorization } from "../../../../Authorisation/Authorisation";



const ModificationHome = () => {

const token = Cookies.get('token');
const apiUrl = config.apiUrl;
const theme = useTheme();
const [sizeTotal, setSizeTotal] = useState(0);
const [threshold, setThreshold] = useState(1); 


const [authPortfolio, setauthPortfolio] = useState(0);
useEffect(() => {
  const fetchPortAuth = async () => {
    const isAuthorized = await checkAuthorization('auth_portfolio');
    setauthPortfolio(isAuthorized);
  };
  fetchPortAuth();
}, []);


const [authPage, setauthPage] = useState(0);
useEffect(() => {
  const fetchPortAuth = async () => {
    const isAuthorized = await checkAuthorization('auth_page');
    setauthPage(isAuthorized);
  };
  fetchPortAuth();
}, [])


const [authBlog, setauthBlog] = useState(0);
useEffect(() => {
  const fetchPortAuth = async () => {
    const isAuthorized = await checkAuthorization('auth_blog');
    setauthBlog(isAuthorized);
  };
  fetchPortAuth();
}, [])




const portfolioContainerRef = useRef();
//
//
useEffect(() => {
  const container = portfolioContainerRef.current;

  container.addEventListener('mouseenter', () => {
    const rows = container.querySelectorAll('.row_modification_portfolio');
    rows.forEach((row, index) => {
      if (index % 2 === 0) {
        row.classList.add('scroll-left');
      } else {
        row.classList.add('scroll-right');
      }
    });
  });

  container.addEventListener('mouseleave', () => {
    const rows = container.querySelectorAll('.row_modification_portfolio');
    rows.forEach((row) => {
      row.classList.remove('scroll-left');
      row.classList.remove('scroll-right');
    });
  });
});


    
const containerRef = useRef();
  const iconContainerRef = useRef(null);
  const plusContainerRef = useRef(null);
  const cursorIconRef = useRef(null);
  const cursorPlusRef = useRef(null);

  useEffect(() => {
    const container = iconContainerRef.current;
    const cursorIcon = cursorIconRef.current;
    const cursorPlus = cursorPlusRef.current;
    const containerPlus = plusContainerRef.current;
    const icons = container.querySelectorAll('.big_icon');

    let animationFrameId;
    let lastClientX, lastClientY;

    const handleMouseMove = (event) => {
      const { clientX, clientY } = event;
      lastClientX = clientX;
      lastClientY = clientY;
      if (!animationFrameId) {
        animationFrameId = requestAnimationFrame(updateCursor);
      }
    };

    const updateCursor = () => {
      animationFrameId = null;
      const rect = container.getBoundingClientRect();
      const offsetX = lastClientX - rect.left - 20;
      const offsetY = lastClientY - rect.top - 7;
      cursorIcon.style.left = `${offsetX}px`;
      cursorIcon.style.top = `${offsetY}px`;

      icons.forEach((icon, index) => {
        const iconRect = icon.getBoundingClientRect();
        const iconOffsetX = lastClientX - iconRect.left - iconRect.width / 2;
        const iconOffsetY = lastClientY - iconRect.top - iconRect.height / 2;

        let moveX = 0;
        let moveY = 0;

        switch (index) {
          case 0:
            moveX = -iconOffsetX / 5;
            moveY = -iconOffsetY / 5;
            break;
          case 1:
            moveX = iconOffsetX / 5;
            moveY = -iconOffsetY / 5;
            break;
          case 2:
            moveX = -iconOffsetX / 5;
            moveY = iconOffsetY / 5;
            break;
          default:
            break;
        }

        icon.style.transform = `translate(${moveX}px, ${moveY}px) scale(1.3)`;
      });
    };

    const handleMouseEnter = () => {
      cursorIcon.style.display = 'flex';
      window.addEventListener('mousemove', handleMouseMove);
    };

    const handleMouseLeave = () => {
      cursorIcon.style.display = 'none';
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      icons.forEach((icon) => {
        icon.style.transition = 'transform 0.5s ease-out';
        icon.style.transform = 'translate(0, 0)';
      });
    };

    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);

    containerPlus.addEventListener('mouseenter', () => {
      cursorPlus.style.opacity = 1;
    });
    containerPlus.addEventListener('mouseleave', () => {
      cursorPlus.style.opacity = 0;
    });

    return () => {
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);


const [text, setText] = useState('');
const [isDeleting, setIsDeleting] = useState(false);
const [loopNum, setLoopNum] = useState(0);
const [typingSpeed, setTypingSpeed] = useState(200);

const isTypingRef = useRef(false);
const textRef = useRef('');
const isDeletingRef = useRef(false);
const loopNumRef = useRef(0);
const typingSpeedRef = useRef(150);

const texts = ["plus d'impact", "un style unique", "captiver"];
const pageContainerRef = useRef(null);

const text_typing_page = useRef(null);
const cursor_typing_page = useRef(null);

useEffect(() => {
  let timer;

  const handleType = () => {
    const i = loopNumRef.current % texts.length;
    const fullText = texts[i];

    const updatedText = isDeletingRef.current
      ? fullText.substring(0, textRef.current.length - 1)
      : fullText.substring(0, textRef.current.length + 1);

    setText(updatedText);
    textRef.current = updatedText;
    

    if (!isDeletingRef.current && updatedText === fullText) {
      setTimeout(() => isDeletingRef.current = true, 500);
    } else if (isDeletingRef.current && updatedText === '') {
      isDeletingRef.current = false;
      loopNumRef.current += 1;
    }

    typingSpeedRef.current = isDeletingRef.current ? 50 : 100;
    if (isTypingRef.current){
      timer = setTimeout(handleType, typingSpeedRef.current);
    }
};


  const startTyping = () => {
    text_typing_page.current.style.color = 'var(--primary-color)';
    cursor_typing_page.current.style.color = 'var(--primary-color)';
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      handleType();
    }
  };

  const stopTyping = () => {
    text_typing_page.current.style.color = theme.palette.text.primary;
    cursor_typing_page.current.style.color = theme.palette.text.primary;
    clearTimeout(timer);
    setIsDeleting(false);
    isTypingRef.current = false;
  };

  const card = pageContainerRef.current;
  card.addEventListener('mouseenter', startTyping);
  card.addEventListener('mouseleave', stopTyping);

  return () => {
    card.removeEventListener('mouseenter', startTyping);
    card.removeEventListener('mouseleave', stopTyping);
  };
}, [isDeleting, loopNum, typingSpeed, texts]);



useEffect(() => {
  const getTotalSize = async () => {
    try {
      const response = await Axios.get(`${apiUrl}/getSizeItem`, {
          params: {
            token: token,
          },
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
      })
      const totalSize = (response.data.totalSize / 1024);
      
      
      const totalSizeInGB = (totalSize / 1024).toFixed(4);
      setSizeTotal(totalSizeInGB)
      const newThreshold = Math.ceil(totalSizeInGB);
      setThreshold(newThreshold)
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
          
            
              <div className="dashboard_case_empty limit_size_contain" style={{backgroundColor : theme.palette.primary.secondary, boxShadow: theme.palette.shadow.main}}>
                <h3 className="title_contain">Espace utilisé</h3>
                <div className="limit_size_info_contain">
                  {
                    authPortfolio === 1 || authPage === 1 || authBlog === 1 ? (
                      <div>
                        <div className="limit_size_text">{sizeTotal} / {threshold} Go</div>
                        <div className="limit_size_bar" style={{backgroundColor:theme.palette.secondary.secondary}}>
                          <div 
                            className="limit_size_bar_fill"
                            style={{ width: `${(sizeTotal / (threshold)) * 100}%` }}
                          />      
                        </div>
                      </div>
                    ) : (
                      <SkeletonTotalSize />
                    )
                  }
                </div>
              </div> 
          
          <div className="modification_page_contain">
              <div ref={containerRef} className="modification_link_contain">
                  <NavLink to={authPortfolio === 1 ? '/dashboard/modification/portfolio' : '#'}  className="modification_box" ref={portfolioContainerRef} style={{backgroundColor : theme.palette.primary.secondary, boxShadow: theme.palette.shadow.main}}>
                      <div className="modification_title_box" style={{color: theme.palette.text.primary}}>
                          <div className="modification_title"><MdImportContacts  className="icon_modifiaction_title"/>
                            <b>Portfolio</b>
                            {
                              authPortfolio === 1 ? (
                                null
                              ) : <div style={{color: "var(--primary-color)", marginLeft:"1rem"}} className='icon_navigation icon_lock'><PiLockBold /></div>
                            }
                          </div>
                          <div className="button_modificationHome"><MdArrowForwardIos /></div>
                      </div>
                      <div className="texte_modification" style={{color: theme.palette.text.secondary}}>
                        Transformez vos portfolios photo en un instant ! Ajoutez, supprimez et réorganisez vos images pour créer des galeries captivantes.
                      </div>
                      <div className="modification_image_box_portfolio ">
                          <div className="row_modification_portfolio">
                            <div className="content">
                              <ImageIcon className="icon_modifiaction_title icon_modif_port" style={{ color: theme.palette.text.secondary }} />
                              <ImageIcon className="icon_modifiaction_title icon_modif_port" style={{ color: theme.palette.text.secondary }} />
                              <ImageIcon className="icon_modifiaction_title icon_modif_port" style={{ color: theme.palette.text.secondary }} />
                              <ImageIcon className="icon_modifiaction_title icon_modif_port" style={{ color: theme.palette.text.secondary }} />
                              <ImageIcon className="icon_modifiaction_title icon_modif_port" style={{ color: theme.palette.text.secondary }} />
                              <ImageIcon className="icon_modifiaction_title icon_modif_port" style={{ color: theme.palette.text.secondary }} />
                              <ImageIcon className="icon_modifiaction_title icon_modif_port" style={{ color: theme.palette.text.secondary }} />
                              <ImageIcon className="icon_modifiaction_title icon_modif_port" style={{ color: theme.palette.text.secondary }} />
                            </div>
                            <div className="content">
                              <ImageIcon className="icon_modifiaction_title icon_modif_port" style={{ color: theme.palette.text.secondary }} />
                              <ImageIcon className="icon_modifiaction_title icon_modif_port" style={{ color: theme.palette.text.secondary }} />
                              <ImageIcon className="icon_modifiaction_title icon_modif_port" style={{ color: theme.palette.text.secondary }} />
                              <ImageIcon className="icon_modifiaction_title icon_modif_port" style={{ color: theme.palette.text.secondary }} />
                              <ImageIcon className="icon_modifiaction_title icon_modif_port" style={{ color: theme.palette.text.secondary }} />
                              <ImageIcon className="icon_modifiaction_title icon_modif_port" style={{ color: theme.palette.text.secondary }} />
                              <ImageIcon className="icon_modifiaction_title icon_modif_port" style={{ color: theme.palette.text.secondary }} />
                              <ImageIcon className="icon_modifiaction_title icon_modif_port" style={{ color: theme.palette.text.secondary }} />
                            </div>
                          </div>
                          <div className="row_modification_portfolio row_inverse_portfolio">
                            <div className="content">
                              <ImageIcon className="icon_modifiaction_title icon_modif_port" style={{ color: theme.palette.text.secondary }} />
                              <ImageIcon className="icon_modifiaction_title icon_modif_port" style={{ color: theme.palette.text.secondary }} />
                              <ImageIcon className="icon_modifiaction_title icon_modif_port" style={{ color: theme.palette.text.secondary }} />
                              <ImageIcon className="icon_modifiaction_title icon_modif_port" style={{ color: theme.palette.text.secondary }} />
                              <ImageIcon className="icon_modifiaction_title icon_modif_port" style={{ color: theme.palette.text.secondary }} />
                              <ImageIcon className="icon_modifiaction_title icon_modif_port" style={{ color: theme.palette.text.secondary }} />
                              <ImageIcon className="icon_modifiaction_title icon_modif_port" style={{ color: theme.palette.text.secondary }} />
                              <ImageIcon className="icon_modifiaction_title icon_modif_port" style={{ color: theme.palette.text.secondary }} />
                            </div>
                            <div className="content">
                              <ImageIcon className="icon_modifiaction_title icon_modif_port" style={{ color: theme.palette.text.secondary }} />
                              <ImageIcon className="icon_modifiaction_title icon_modif_port" style={{ color: theme.palette.text.secondary }} />
                              <ImageIcon className="icon_modifiaction_title icon_modif_port" style={{ color: theme.palette.text.secondary }} />
                              <ImageIcon className="icon_modifiaction_title icon_modif_port" style={{ color: theme.palette.text.secondary }} />
                              <ImageIcon className="icon_modifiaction_title icon_modif_port" style={{ color: theme.palette.text.secondary }} />
                              <ImageIcon className="icon_modifiaction_title icon_modif_port" style={{ color: theme.palette.text.secondary }} />
                              <ImageIcon className="icon_modifiaction_title icon_modif_port" style={{ color: theme.palette.text.secondary }} />
                              <ImageIcon className="icon_modifiaction_title icon_modif_port" style={{ color: theme.palette.text.secondary }} />
                            </div>
                          </div>
                          <div className="row_modification_portfolio">
                            <div className="content">
                              <ImageIcon className="icon_modifiaction_title icon_modif_port" style={{ color: theme.palette.text.secondary }} />
                              <ImageIcon className="icon_modifiaction_title icon_modif_port" style={{ color: theme.palette.text.secondary }} />
                              <ImageIcon className="icon_modifiaction_title icon_modif_port" style={{ color: theme.palette.text.secondary }} />
                              <ImageIcon className="icon_modifiaction_title icon_modif_port" style={{ color: theme.palette.text.secondary }} />
                              <ImageIcon className="icon_modifiaction_title icon_modif_port" style={{ color: theme.palette.text.secondary }} />
                              <ImageIcon className="icon_modifiaction_title icon_modif_port" style={{ color: theme.palette.text.secondary }} />
                              <ImageIcon className="icon_modifiaction_title icon_modif_port" style={{ color: theme.palette.text.secondary }} />
                              <ImageIcon className="icon_modifiaction_title icon_modif_port" style={{ color: theme.palette.text.secondary }} />
                            </div>
                            <div className="content">
                              <ImageIcon className="icon_modifiaction_title icon_modif_port" style={{ color: theme.palette.text.secondary }} />
                              <ImageIcon className="icon_modifiaction_title icon_modif_port" style={{ color: theme.palette.text.secondary }} />
                              <ImageIcon className="icon_modifiaction_title icon_modif_port" style={{ color: theme.palette.text.secondary }} />
                              <ImageIcon className="icon_modifiaction_title icon_modif_port" style={{ color: theme.palette.text.secondary }} />
                              <ImageIcon className="icon_modifiaction_title icon_modif_port" style={{ color: theme.palette.text.secondary }} />
                              <ImageIcon className="icon_modifiaction_title icon_modif_port" style={{ color: theme.palette.text.secondary }} />
                              <ImageIcon className="icon_modifiaction_title icon_modif_port" style={{ color: theme.palette.text.secondary }} />
                              <ImageIcon className="icon_modifiaction_title icon_modif_port" style={{ color: theme.palette.text.secondary }} />
                            </div>
                          </div>
                      </div>
                  </NavLink>
                  <NavLink to={authPage === 1 ? '/dashboard/modification/page' : '#'} className="modification_box" ref={pageContainerRef} style={{backgroundColor : theme.palette.primary.secondary, boxShadow: theme.palette.shadow.main}}>
                      <div className="modification_title_box" style={{color: theme.palette.text.primary}}>
                        <div className="modification_title"><FaElementor  className="icon_modifiaction_title"/>
                          <b>Page</b>
                          {
                            authPage === 1 ? (
                                null
                            ) : <div style={{color: "var(--primary-color)", marginLeft:"1rem"}} className='icon_navigation icon_lock'><PiLockBold /></div>
                          }
                        </div>
                        <div className="button_modificationHome"><MdArrowForwardIos /></div>
                      </div>
                      <div className="texte_modification" style={{color: theme.palette.text.secondary}}>  
                        Ajustez facilement visuels et textes pour un design attrayant et des messages clairs, reflétant votre vision et captivant votre audience.
                      </div>
                      <div className="modification_image_box_page">
                        <div className="modification_image_text" style={{ color: theme.palette.text.primary}}>
                          <span>Modifiez pour </span>
                          <span className="typed-text" ref={text_typing_page}><b>{text}</b></span>
                          <span className="cursor" ref={cursor_typing_page}><b>|</b></span>
                        </div>  
                        <img src={sphere_page} alt="shere page" className="shere_page" />                          
                      </div>
                  </NavLink>
                  <NavLink to={authBlog === 1 ? '/dashboard/modification/blog' : '#'} className="modification_box box_blog" ref={iconContainerRef} style={{backgroundColor : theme.palette.primary.secondary, boxShadow: theme.palette.shadow.main}}>
                      <div className="modification_title_box" style={{color: theme.palette.text.primary}}>
                        <div className="modification_title"><MdArticle className="icon_modifiaction_title"/><b>Blog</b>
                        {
                          authBlog === 1 ? (
                              null
                          ) : <div style={{color: "var(--primary-color)", marginLeft:"1rem"}} className='icon_navigation icon_lock'><PiLockBold /></div>
                        }
                        </div>
                        <div className="button_modificationHome"><MdArrowForwardIos /></div>
                      </div>
                      <div className="texte_modification" style={{color: theme.palette.text.secondary}}>
                        Dynamisez votre blog avec notre outil intuitif : publiez articles, images et vidéos facilement pour captiver vos lecteurs.
                      </div>
                      <div className="modification_image_box_blog point-background" ref={plusContainerRef} style={{ '--point-color': theme.palette.primary.third }}>
                        <ImageIcon className="icon_modifiaction_title big_icon icon_modif_blog_1" style={{color: theme.palette.text.primary}}/>
                        <VideocamIcon className="icon_modifiaction_title big_icon icon_modif_blog_2" style={{color: theme.palette.text.primary}}/>
                        <TextFieldsIcon className="icon_modifiaction_title big_icon icon_modif_blog_3" style={{color: theme.palette.text.primary}}/>
                      </div>
                      <div className="cursor_modif_blog_contain" ref={cursorIconRef}>
                          <BsCursor className="cursor_modif_blog"/>
                          <div ref={cursorPlusRef} className="plus_modif_blog"><AddIcon className="cursor_modif_blog"/></div>
                      </div>
                  </NavLink>
              </div>
          </div>
        </div>
        
    </div>
  )
}

export default ModificationHome