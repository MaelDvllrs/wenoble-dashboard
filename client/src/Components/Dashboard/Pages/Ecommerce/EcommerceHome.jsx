import React from "react"
import { useState } from "react"
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom"
import { useTheme } from '@mui/material/styles';
import "./Ecommerce.css"
import { useEffect } from "react";

const Ecommerce = () => {

    const navigate = useNavigate();
    const location = useLocation();

    const theme = useTheme();



    

    // Lire la dernière route visitée depuis localStorage lors du montage du composant
    useEffect(() => {
        const lastRoute = localStorage.getItem('lastEcommerceRoute');
        if (lastRoute && lastRoute.startsWith('/dashboard/ecommerce') && lastRoute !== '/dashboard/ecommerce') {
            console.log('lastRoute', lastRoute);
            navigate(lastRoute);
        } else if (location.pathname === '/dashboard/ecommerce') {
            navigate('/dashboard/ecommerce/stats');
        }
    }, [location.pathname, navigate]);

    return(
        <div className="outlet">
            <div className="breadCrumbs"><NavLink style={{color: theme.palette.text.primary}} className={"breadCrumbsLink"} to={'/dashboard/home'}>Dashboard</NavLink> &gt; Ecommerce</div>
            <div className="ecommerce_container_principal">
                <div className="menu_contain_ecom">
                    <NavLink to={'/dashboard/ecommerce/stats'} key="stats" className={({ isActive }) => (isActive ? 'menuEcomActive' : 'menuEcom')} style={{backgroundColor : theme.palette.primary.secondary, borderColor : theme.palette.primary.third, color : theme.palette.text.primary}}>Statistiques</NavLink>
                    <NavLink to={'/dashboard/ecommerce/product'} key="product" className={({ isActive }) => (isActive ? 'menuEcomActive' : 'menuEcom')} style={{backgroundColor : theme.palette.primary.secondary, borderColor : theme.palette.primary.third, color : theme.palette.text.primary}}>Produits</NavLink>
                    <NavLink to={'/dashboard/ecommerce/order'} key="order" className={({ isActive }) => (isActive ? 'menuEcomActive' : 'menuEcom')} style={{backgroundColor : theme.palette.primary.secondary, borderColor : theme.palette.primary.third, color : theme.palette.text.primary}}>Commandes</NavLink>
                    <NavLink to={'/dashboard/ecommerce/categorie'} key="categorie" className={({ isActive }) => (isActive ? 'menuEcomActive' : 'menuEcom')} style={{backgroundColor : theme.palette.primary.secondary, borderColor : theme.palette.primary.third, color : theme.palette.text.primary}}>Catégories</NavLink>
                    <NavLink to={'/dashboard/ecommerce/promo'} key="promo" className={({ isActive }) => (isActive ? 'menuEcomActive' : 'menuEcom')} style={{backgroundColor : theme.palette.primary.secondary, borderColor : theme.palette.primary.third, color : theme.palette.text.primary}}>Promotions</NavLink>
                    <NavLink to={'/dashboard/ecommerce/subscription'} key="subscription" className={({ isActive }) => (isActive ? 'menuEcomActive' : 'menuEcom')} style={{backgroundColor : theme.palette.primary.secondary, borderColor : theme.palette.primary.third, color : theme.palette.text.primary}}>Abonnements</NavLink>
                </div>
                <div className="ecommerce_container_secondary">
                    <Outlet />
                </div>
            </div>
        </div>

    )
}

export default Ecommerce