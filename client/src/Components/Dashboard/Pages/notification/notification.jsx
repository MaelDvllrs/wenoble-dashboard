import React from 'react';
import Axios from 'axios';
import { useEffect, useState } from "react";
import Cookies from 'js-cookie';
import config from '../../../../config';
import { NavLink } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { notificationLink } from '../../../../Theme/element';
import { notificationTitle } from '../../../../Theme/element';
import { useTheme } from '@mui/material';
import { formatDistanceWithoutApprox } from '../../../../utils/dateUtils';


export const Notification = () => {

    const [notifications, setNotifications] = useState([]);
    const [notifRead, setNotifRead] = useState(false);
    const token = Cookies.get('token');
    const apiUrl = config.apiUrl;
    const theme = useTheme();

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const response = await Axios.get(`${apiUrl}/getNotifications`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    params: {
                        userId: jwtDecode(Cookies.get('token')).idUser,
                    }
                });
                setNotifications(response.data);
            } catch (error) {
                console.error('Erreur lors de la récupération des notifications:', error);
            }
        };
        fetchNotifications();
    }, [notifRead, notifications]);

    useEffect(() => {
        setNotifRead(notifications.some(notification => !notification.is_read));
    }, [notifications]);

    useEffect(() => {
        setNotifRead(notifications.some(notification => !notification.is_read));
    }, [notifications]);


    const handleOpenNotif = (event) => {
        event.stopPropagation();
        setOpenNotif((prevOpen) => !prevOpen);
    };

    const handleClickAway = () => {
        setOpenNotif(false);
    };

    const handleCombinedClick = (event) => {
        handleReadNotif(event);
        handleClickAway(event);
    };

    const handleReadNotif = (event) => {
        const notificationId = event.currentTarget.id;
        Axios.post(`${apiUrl}/readNotification`, {
            IdNotif: notificationId,
          }, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
        }).then((response) => {
            setNotifRead(false);
        });
    };


    return(
        <div className='notification_contain'>
            {notifications.length === 0 && <div className='notification_box'><div className='notification_text'>Aucune notification</div></div>}
            {notifications.map((notification, index) => (
                <div
                    style={{display: 'relative'}}
                    key={notification.id_notif}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ 
                        opacity: 1, 
                        height: '6.9rem',
                        transition: { 
                            type:"spring",
                            bounce: 0.25, 
                            opacity: { delay: 0.25 }, 
                        } 
                    }}
                >
                    <NavLink key={index} to={`${notificationLink(notification.type)}${notification.id_element}`} onClick={handleCombinedClick}  id={notification.id_notif} className={`${notification.isNew ? 'new-notification' : 'old-notification'}`}>
                        <div className={`notification_box`} style={{backgroundColor: notification.is_read ? 'transparent' : 'rgba(var(--primary-color-rgb), 0.2)', color : theme.palette.text.primary}}>                                                    
                            <div className='notification_headers'>
                                <div><b>{notificationTitle(notification.type)}</b></div>
                                <div className='notification_time' style={{color:theme.palette.text.secondary}}>{formatDistanceWithoutApprox(new Date(notification.date))}</div>
                            </div>
                            <div className='notification_text'>{notification.message}</div>
                            <div className='notification_read_marge' style={{display: notification.is_read ? 'none' : 'block'}}/>                                                    
                        </div>
                        <div className="line_horizontal notification_line" style={{ backgroundColor: theme.palette.primary.third }}/>
                    </NavLink>
                </div>
            ))}
        </div>
    )
}

