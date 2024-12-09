import React from "react"
import { useEffect, useState } from "react"
import Axios from 'axios';
import config from '../../../../../config';
import Cookies from 'js-cookie';
import {jwtDecode} from 'jwt-decode';
import { useTheme } from '@mui/material/styles';
import { NavLink } from "react-router-dom";
import { formatDate } from "../../../utils/dateUtils";
import { DefaultButton } from "../../../../../Theme/element";

const EcommerceOrderPending = () => {

    
    const theme = useTheme();
    const apiUrl = config.apiUrl;
    const [order, setOrder] = useState([]);
    const [decodedOrder, setDecodedOrder] = useState([]);

    useEffect(() => {
        localStorage.setItem('lastEcommerceRoute', location.pathname);
    }, [location.pathname]);

    useEffect(() => {

        const user = Cookies.get('token');
        const decodedUser = jwtDecode(user); 

        Axios.get(`${apiUrl}/ecommerce/getOrders`, {
            params: {
                IdUser: decodedUser.idUser,
                Status: "pending"
            }
        }).then((response) => {
            setOrder(response.data);
        }).catch((error) => {
            console.error('Erreur lors de la récupération de la du Blog :', error);
        });
    }, []);

    console.log(order);

    useEffect(() => {
        if(order !== null && typeof order === 'string'){
            setDecodedOrder( jwtDecode(order));
        }
    }, [order]);

    console.log(decodedOrder.orders);


    

    return(
        <div>
            <div className="Item_menu">
              <p style={{color: theme.palette.text.secondary}} className="Item_portfolio_element orders_element">Commande</p>
              <p style={{color: theme.palette.text.secondary}} className="Item_portfolio_element customer_element">Client</p>
              <p style={{color: theme.palette.text.secondary}} className="Item_portfolio_element date_orders_element">Date de commande</p>
              <p style={{color: theme.palette.text.secondary}} className="Item_portfolio_element date_orders_element">Date de livraison</p>
              <p style={{color: theme.palette.text.secondary}} className="Item_portfolio_element price_element">Montant</p>
              <p style={{color: theme.palette.text.secondary}} className="Item_portfolio_element action_element">Action</p>
              <p style={{color: theme.palette.text.secondary}} className="Item_portfolio_element action_element">Details</p>
            </div>
            <div className="line_horizontal" style={{ backgroundColor: theme.palette.text.secondary }}></div>

            {decodedOrder.orders && decodedOrder.orders.map((order, index) => {
                const formattedOrderDate = formatDate(order.date_order);
                const formattedDeliveryDate = formatDate(order.date_delivery);
                return(
                    <div to={'editPage/'} key={index} className="Item_Portfolio Item_Blog" style={{'--hover-background-color': theme.palette.secondary.secondary, color: theme.palette.text.primary}}>
                        <p style={{color: theme.palette.text.primary}} className="Item_portfolio_element orders_element"># {order.id_order_shop}</p>
                        <p style={{color: theme.palette.text.primary}} className="Item_portfolio_element customer_element">{order.customer_order}</p>
                        <p style={{color: theme.palette.text.primary}} className="Item_portfolio_element date_orders_element">{formattedOrderDate}</p>
                        <p style={{color: theme.palette.text.primary}} className="Item_portfolio_element date_orders_element">{formattedDeliveryDate}</p>
                        <p style={{color: theme.palette.text.primary}} className="Item_portfolio_element price_element">{order.total_price} €</p>
                        <p style={{color: theme.palette.text.primary}} className="Item_portfolio_element action_element">Valider</p>
                        <p style={{color: theme.palette.text.primary}} className="Item_portfolio_element action_element"><NavLink to={""} key={index}><DefaultButton type="submit" variant="contained">Détails</DefaultButton></NavLink></p>
                    </div>
                )
            })}
            
        
        </div>

    )
}

export default EcommerceOrderPending