import React from "react"
import Axios from 'axios';
import { useState, useEffect } from "react";
import Cookies from 'js-cookie';
import {jwtDecode} from 'jwt-decode'; 
import { NavLink,  useParams } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import '../modification_site/Portfolio/portfolio.css';
import './Contact.css';
import config from "../../../../config";
import { formatDate } from "../../../../utils/dateUtils";
import EmailIcon from '@mui/icons-material/Email';
import { DefaultButton } from "../../../../Theme/element";

const ContactMessage = () => {

    const theme = useTheme();


    const [InfoDetailMessage, setInfoDetailMessage] = useState([]);
    const apiUrl = config.apiUrl;
    const { id } = useParams();

    const token = Cookies.get('token');

    useEffect(() => {        
            Axios.get(`${apiUrl}/getMessageDetail`, {
                params: {
                    idMessage: id,
                },
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
            }).then((response) => {
                setInfoDetailMessage(jwtDecode(response.data));
            }).catch((error) => {
                console.error('Erreur lors de la récupération des messages :', error);
            });
            
    }, [id]);






    return(
        <div className="outlet">
            <div className="title_section">
            <div className="breadCrumbs"><NavLink style={{color: theme.palette.text.primary}} className={"breadCrumbsLink"} to={'/dashboard/home'}>Dashboard</NavLink> &gt; <NavLink style={{color: theme.palette.text.primary}} className={"breadCrumbsLink"} to={'/dashboard/contact'}>Contact</NavLink> &gt; Message</div>
            </div>

            {InfoDetailMessage && Array.isArray(InfoDetailMessage.message) ? InfoDetailMessage.message.map((message, index) => {
                const formattedMessageDate = formatDate(message.date);
            
                return (
                    <div className="dashboard_case_empty" style={{backgroundColor : theme.palette.primary.secondary, borderColor : theme.palette.primary.third}} key={index}>
                        
                        <div className="header_modification header_page_modification">
                            <h3 className="titlePage">{message.mail_sender}</h3>
                            <DefaultButton type="submit" variant="contained" onClick={() => window.location = 'mailto:' + message.mail_sender} style={{gap: "0.5rem"}}><EmailIcon/> Répondre</DefaultButton>
                        </div>   
                        <div className="message_wrapper">
                            <h4>{message.subject}</h4>
                            <div className="message_contain">
                                <div className="message_content" style={{backgroundColor : theme.palette.primary.main, color : theme.palette.text.primary}}>
                                    <div dangerouslySetInnerHTML={{ __html: message.html }} />
                                </div>
                                <div className="message_date">
                                    <p>{formattedMessageDate}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            
            }): <p></p>}
            
                   
        </div>
    )
}

export default ContactMessage