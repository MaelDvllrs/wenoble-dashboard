import React from "react"
import Axios from 'axios';
import { useState, useEffect, useRef } from "react";
import Cookies from 'js-cookie';
import {jwtDecode} from 'jwt-decode'; 
import { NavLink,  useParams, Link } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import '../modification_site/Portfolio/portfolio.css';
import './newsletter.css';
import config from "../../../../config";
import { SkeletonBlog } from "../../../skeleton/skeleton";
import { formatDate } from "../../utils/dateUtils";
import { SnackbarProvider, enqueueSnackbar } from 'notistack'
import { SecondaryButton } from '../../../../Theme/element';


import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import FileDownloadIcon from '@mui/icons-material/FileDownload';



const NewsLetters = () => {

    const theme = useTheme();

    const token = Cookies.get('token');
    const [InfoListeMail, setInfoListeMail] = useState([]);
    const apiUrl = config.apiUrl;
    const { id } = useParams();

    const [LoadingMessage, setLoadingMessage] = useState(true);


    const anchorRefMessageOption = useRef([]);



    useEffect(() => {    

        Axios.get(`${apiUrl}/getNewsletter`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
        }).then((response) => {
            setInfoListeMail(jwtDecode(response.data).mail);
            setLoadingMessage(false);
        }).catch((error) => {
            console.error('Erreur lors de la récupération des messages :', error);
        });
            
    }, [id]);

    const handleExport = () => {
        Axios.get(`${apiUrl}/exportNewsletter`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        }).then((response) => {
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;

            const date = new Date();
            const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
            link.setAttribute('download', `newsletters-${formattedDate}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        }).catch((error) => {
            console.error('Erreur lors de la récupération des mail :', error);
        });
    }


    const handleDelete = (id_newsletter) => {
        Axios.delete(`${apiUrl}/deleteNewsletter`, {
            data: {
                id_newsletter: id_newsletter,
            },
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
        }).then(() => {
            enqueueSnackbar('mail supprimée avec succès.', { variant: 'success' });
            setInfoListeMail(InfoListeMail.filter(InfoMail => InfoMail.id_newsletter !== id_newsletter));

        }).catch((error) => {
            console.error('Erreur lors de la récupération des messages :', error);
            enqueueSnackbar('Erreur lors de la suppression du mail.', { variant: 'error' });
        });
    }





    return(
        <div className="outlet">
            <div className="title_section">
            <div className="breadCrumbs"><NavLink style={{color: theme.palette.text.primary}} className={"breadCrumbsLink"} to={'/dashboard/home'}>Dashboard</NavLink> &gt; Newsletter</div>
            </div>

            <div className="dashboard_case_empty" style={{backgroundColor : theme.palette.primary.secondary, borderColor : theme.palette.primary.third}}>
                <div className="liste_contact_contain">
                    <div className="header_modification">
                        <h3 >Newsletter</h3>
                        <SecondaryButton onClick={handleExport} variant="contained" theme={theme}><FileDownloadIcon/>Exporter</SecondaryButton>
                    </div>
                    
                    <div className="Item_menu_contact">
                        <div className="Item_menu">
                          <p style={{color: theme.palette.text.secondary}} className="Item_portfolio_element message_name_element">mail</p>
                          <p style={{color: theme.palette.text.secondary}} className="Item_portfolio_element message_date_element">Date de d'inscription</p>
                          <p style={{color: theme.palette.text.secondary}} className="Item_portfolio_element message_option_element">Option</p>
                        </div>
                    </div>
                    <div className="line_horizontal" style={{ backgroundColor: theme.palette.text.secondary }}></div>
                    <SnackbarProvider maxSnack={3} autoHideDuration={2000}>
                        <div className="liste_contact_box">
                            {LoadingMessage ? <SkeletonBlog /> :
                                
                                <div className="liste_blog_box">
                                        {InfoListeMail && Array.isArray(InfoListeMail) ? InfoListeMail.map((mail, index) => {
                                            const formattedMessageDate = formatDate(mail.date);
                                            anchorRefMessageOption.current[index] = anchorRefMessageOption.current[index] || React.createRef();

                                            return (
                                                <div key={index} className="Item_Portfolio Item_Blog newsletter-box" style={{'--hover-background-color': theme.palette.secondary.secondary, color: theme.palette.text.primary}}>
                                                    <div className="Item_Portfolio Item_Blog" style={{color: theme.palette.text.primary}}>
                                                        <p className="Item_portfolio_element message_name_element">{mail.mail}</p>
                                                        <p className="Item_portfolio_element message_date_element">{formattedMessageDate}</p>
                                                        <div className="Item_portfolio_element message_option_element">
                                                            <IconButton aria-label="delete" onClick={() => handleDelete(mail.id_newsletter)}>
                                                                <DeleteIcon style={{ color: theme.palette.text.primary }} />
                                                            </IconButton>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        
                                        }): <p></p>}
                                </div>
                            }
                        </div> 
                    </SnackbarProvider>
                </div>
            </div>       
        </div>

        
    )
}

export default NewsLetters