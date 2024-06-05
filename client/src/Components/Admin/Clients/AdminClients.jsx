import React from "react"
import Axios from 'axios';
import { useState, useEffect } from "react";
import Cookies from 'js-cookie';
import {jwtDecode} from 'jwt-decode'; 
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import '../../Dashboard/Pages/modification_site/Portfolio/portfolio.css';
import './AdminClients.css';
import config from "../../../config";
import { useTheme } from '@mui/material/styles';
import { fetchImages } from "../../Dashboard/apiImage"


const AdminClient = () => {

    const theme = useTheme();

    const apiUrl = config.apiUrl; 

    const [InfoClient, setInfoClient] = useState(null);

    useEffect(() => {
        const user = Cookies.get('user');
        
        if (user) { 
            const decodedUser = jwtDecode(user);
        
            Axios.get(`${apiUrl}/getClients`, {
                params: {
                    IdUser: decodedUser.user[0].id_user,
                }
            }).then((response) => {
                const clients = response.data;
                const promises = clients.map(client => fetchImages(client.username));
                Promise.all(promises).then(imagesData => {
                    const clientsWithImages = clients.map((client, index) => ({
                        ...client,
                        profileImage: imagesData[index]
                    }));
                    setInfoClient(clientsWithImages);
                });
            }).catch((error) => {
                console.error('Erreur lors de la récupération de la page :', error);
            });
        }
    }, []);

    console.log(InfoClient);






    return(
        <div className="outlet">
            <div className="title_section">
            <div className="breadCrumbs"><NavLink style={{color: theme.palette.text.primary}} className={"breadCrumbsLink"} to={'/dashboard/home'}>Dashboard</NavLink> &gt; Clients</div>
            </div>

            <div className="dashboard_case_empty">
                <NavLink to="/dashboard-admin/clients/add" key="AddClient" style={{color: theme.palette.text.primary}}>Ajouter Client</NavLink>
                <div className="client_liste">
                    {InfoClient && InfoClient.map((clientItem) => (
                        <NavLink to={'/dashboard/modification/page/' + clientItem.id_user} className="client_liste_item" key={clientItem.id_user}>
                            <img 
                              src={clientItem.profileImage && clientItem.profileImage[0] ? `data:image/jpeg;base64,${clientItem.profileImage[0].data}` : 'default-image-url'} 
                              alt="profile" 
                              className="client_liste_item_image"
                            />                            <p style={{color: theme.palette.text.primary}}>{clientItem.username}</p>
                            <p style={{color: theme.palette.text.primary}}>#{String(clientItem.id_user).padStart(4, '0')}</p>
                            <p style={{color: theme.palette.text.primary}}>{clientItem.website}</p>
                        </NavLink>
                    ))}
                </div>
            </div>       
        </div>
    )
}
export default AdminClient