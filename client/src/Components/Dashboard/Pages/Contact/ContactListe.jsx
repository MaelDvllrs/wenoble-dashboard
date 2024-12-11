import React from "react"
import Axios from 'axios';
import { useState, useEffect, useRef } from "react";
import Cookies from 'js-cookie';
import {jwtDecode} from 'jwt-decode'; 
import { NavLink,  useParams, Link } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import '../modification_site/Portfolio/portfolio.css';
import './Contact.css';
import config from "../../../../config";
import { SkeletonBlog } from "../../../skeleton/skeleton";
import { formatDate } from "../../utils/dateUtils";
import IconButton from '@mui/material/IconButton';
import Popper  from '@mui/material/Popper';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Grow from '@mui/material/Grow';
import EmailIcon from '@mui/icons-material/Email';



const ContactList = () => {

    const theme = useTheme();

    const token = Cookies.get('token');
    const [InfoListeMessage, setInfoListeMessage] = useState([]);
    const apiUrl = config.apiUrl;
    const { id } = useParams();

    const [LoadingMessage, setLoadingMessage] = useState(true);


    const [openMenuMessage, setOpenMenuMessage] = useState(null);
    const anchorRefMessageOption = useRef([]);


    const handleOpenMessageMenu = (event, index) => {
        event.stopPropagation();
        setOpenMenuMessage(openMenuMessage === index ? null : index);
    };


    const handleClickAway = () => {
        setOpenMenuMessage(null);
    };


    useEffect(() => {    

            const user = Cookies.get('token');
            const decodedUser = jwtDecode(user);
    
            Axios.get(`${apiUrl}/getMessage`, {
                params: {
                    idUser: decodedUser.idUser,
                },
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
            }).then((response) => {
                setInfoListeMessage(jwtDecode(response.data));
                setLoadingMessage(false);
            }).catch((error) => {
                console.error('Erreur lors de la récupération des messages :', error);
            });
            
    }, [id]);




    return(
        <div className="outlet">
            <div className="title_section">
            <div className="breadCrumbs"><NavLink style={{color: theme.palette.text.primary}} className={"breadCrumbsLink"} to={'/dashboard/home'}>Dashboard</NavLink> &gt; Contact</div>
            </div>

            <div className="dashboard_case_empty" style={{backgroundColor : theme.palette.primary.secondary, borderColor : theme.palette.primary.third}}>
                <div className="liste_contact_contain">
                    <div className="header_modification">
                        <h3 >Liste des messages</h3>
                    </div>
                    
                    <div className="Item_menu_contact">
                        <div className="Item_menu">
                          <p style={{color: theme.palette.text.secondary}} className="Item_portfolio_element message_name_element">Expéditeur</p>
                          <p style={{color: theme.palette.text.secondary}} className="Item_portfolio_element message_subject_element">Objet</p>
                          <p style={{color: theme.palette.text.secondary}} className="Item_portfolio_element message_date_element">Date de réception</p>
                        </div>
                        <div className="Item_menu" style={{width : "auto"}}>
                            <p style={{color: theme.palette.text.secondary}} className="Item_portfolio_element message_option_element">Option</p>
                        </div>
                    </div>
                    <div className="line_horizontal" style={{ backgroundColor: theme.palette.text.secondary }}></div>

                    <div className="liste_contact_box">
                        {LoadingMessage ? <SkeletonBlog /> :
                            <div className="liste_blog_box">
                                    {InfoListeMessage && Array.isArray(InfoListeMessage.message) ? InfoListeMessage.message.map((message, index) => {
                                        const formattedMessageDate = formatDate(message.date);
                                        anchorRefMessageOption.current[index] = anchorRefMessageOption.current[index] || React.createRef();


                                    
                                        return (
                                            <div key={index} className="Item_Portfolio Item_Blog" style={{'--hover-background-color': theme.palette.secondary.secondary, color: theme.palette.text.primary}}>
                                            <NavLink to={'message/' + message.id_message} className="Item_Portfolio Item_Blog" style={{color: theme.palette.text.primary}}>
                                                <p className="Item_portfolio_element message_name_element">{message.mail_sender}</p>
                                                <p className="Item_portfolio_element message_subject_element">{message.subject}</p>
                                                <p className="Item_portfolio_element message_date_element">{formattedMessageDate}</p>
                                            </NavLink>
                                            <p className="Item_portfolio_element message_option_element">
                                                <IconButton
                                                    key='menu'
                                                    style={{ color: theme.palette.text.primary }}
                                                    onClick={(event) => handleOpenMessageMenu(event, index)}
                                                    ref={anchorRefMessageOption.current[index]}
                                                    >
                                                    <MoreHorizIcon />
                                                </IconButton>
                                                <ClickAwayListener onClickAway={handleClickAway}>
                                                    <Popper open={openMenuMessage === index} anchorEl={anchorRefMessageOption.current[index]?.current} transition placement="bottom-end">
                                                        {({ TransitionProps }) => (
                                                            <Grow {...TransitionProps} timeout={350}>
                                                                <div className='dashboard_case_empty option_menu' style={{backgroundColor : theme.palette.primary.primary, borderColor : theme.palette.primary.third}}>
                                                                    <div className=''>
                                                                        <Link className="option_menu_message" onClick={() => window.location = 'mailto:' + message.mail_sender} style={{color: theme.palette.text.primary}}><EmailIcon/>Répondre</Link>
                                                                    </div>
                                                                </div>
                                                            </Grow>
                                                        )}
                                                    </Popper>
                                                </ClickAwayListener>
                                            </p>
                                        </div>
                                        );
                                    
                                    }): <p></p>}
                            </div>
                        }
                    </div> 
                    
                </div>
            </div>       
        </div>

        
    )
}

export default ContactList