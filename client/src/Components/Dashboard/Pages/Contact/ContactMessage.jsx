import React from "react"
import Axios from 'axios';
import { useState, useEffect, useRef } from "react";
import Cookies from 'js-cookie';
import {jwtDecode} from 'jwt-decode'; 
import { NavLink,  useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { useWebsite } from '../../../../Context/WebsiteContext';
import '../modification_site/Portfolio/portfolio.css';
import './Contact.css';
import config from "../../../../config";
import { formatDate } from "../../../../utils/dateUtils";
import EmailIcon from '@mui/icons-material/Email';
import { DefaultButton } from "../../../../Theme/element";
import { useSnackbar } from '../../../../Theme/snackbar';

const ContactMessage = () => {

    const theme = useTheme();
    const { selectedWebsite, loading: websiteLoading } = useWebsite();
    const navigate = useNavigate();
    const initialWebsiteId = useRef(null);


    const [InfoDetailMessage, setInfoDetailMessage] = useState([]);
    const apiUrl = config.apiUrl;
    const { id } = useParams();

    const token = Cookies.get('token');

    const { showSnackbar } = useSnackbar();


    useEffect(() => {
        const fetchMessageDetail = async () => {
            if (!selectedWebsite?.id || websiteLoading || !id) {
                console.log('Site web non sélectionné, en cours de chargement, ou ID de message manquant');
                return;
            }

            try {
                const response = await Axios.get(`${apiUrl}/getMessageDetail`, {
                    params: {
                        idMessage: id,
                        websiteId: selectedWebsite.id
                    },
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                setInfoDetailMessage(jwtDecode(response.data));
            } catch (error) {
                showSnackbar('error', '[CONT-MESS-001] Erreur lors de la récupération du message');
                console.error('Erreur lors de la récupération du message :', error);
            }
        };

        fetchMessageDetail();
    }, [id, selectedWebsite, websiteLoading]);

    // Redirection vers la liste des contacts quand le site web change
    useEffect(() => {
        // Stocker l'ID du site web initial au premier chargement
        if (!websiteLoading && selectedWebsite?.id && initialWebsiteId.current === null) {
            initialWebsiteId.current = selectedWebsite.id;
            return;
        }
        
        // Rediriger seulement si le site web change après le chargement initial
        if (!websiteLoading && selectedWebsite?.id && initialWebsiteId.current !== null && initialWebsiteId.current !== selectedWebsite.id) {
            navigate('/dashboard/contact');
        }
    }, [selectedWebsite?.id, websiteLoading, navigate]);






    return(
        <div className="outlet-box">
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