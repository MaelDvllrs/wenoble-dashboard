import React from "react"
import { useTheme } from '@mui/material/styles';
import { NavLink, Outlet } from "react-router-dom";
import { useEffect } from "react";

const EcommerceOrder = () => {

    const theme = useTheme();

    useEffect(() => {
        localStorage.setItem('lastEcommerceRoute', location.pathname);
    }, [location.pathname]);

    return(
        <div className="ecommerce_order" style={{backgroundColor : theme.palette.primary.secondary, borderColor : theme.palette.primary.third}}>
            <div className="ecommerce_order_menu_contain">
                <NavLink to={'pending'} key="order_pending" className={({ isActive }) => (isActive ? 'ecommerce_order_menuActive' : 'ecommerce_order_menu')} style={{color : theme.palette.text.primary}}>Commandes en attente</NavLink>
                <NavLink to={'shipping'} key="order_ready" className={({ isActive }) => (isActive ? 'ecommerce_order_menuActive' : 'ecommerce_order_menu')} style={{color : theme.palette.text.primary}}>Commandes prêtes</NavLink>
                <NavLink to={'delivered'} key="order_delivred" className={({ isActive }) => (isActive ? 'ecommerce_order_menuActive' : 'ecommerce_order_menu')} style={{color : theme.palette.text.primary}}>Commandes livrées</NavLink>
                <NavLink to={'orderAll'} key="order_all" className={({ isActive }) => (isActive ? 'ecommerce_order_menuActive' : 'ecommerce_order_menu')} style={{color : theme.palette.text.primary}}>Toutes les commandes</NavLink>
            </div>
            <div className="ecommerce_order_contain">
                <Outlet/>
            </div>
            
            
        </div>

    )
}

export default EcommerceOrder