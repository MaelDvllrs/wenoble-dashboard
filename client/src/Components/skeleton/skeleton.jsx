import React, { useState, useEffect } from "react";
import "./skeleton.css";
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';

export const SkeletonProfile = () => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setVisible(true), 200);
        return () => clearTimeout(timer);
    }, []);

    if (!visible) return null;

    return (
        <div className="skeleton-wrapper">
            <div className="skeleton-profile">
                <div>
                    <Skeleton sx={{bgcolor: '#525252' }} animation="wave" variant="circular" className="skeleton-profile-photo"/>
                </div>
                <div>
                    <Skeleton sx={{bgcolor: '#525252'}} animation="wave" variant="text" className="skeleton-profile-name"/>
                    <Skeleton sx={{bgcolor: '#525252'}} animation="wave" variant="text" className="skeleton-profile-id"/>
                </div>
            </div>
        </div>
    );
}

export const SkeletonPortfolio = () => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setVisible(true), 200);
        return () => clearTimeout(timer);
    }, []);

    if (!visible) return null;

    return (
        <div className="skeleton-wrapper-portfolio">
            <div className="skeleton-portfolio-element">
                    <Skeleton sx={{ bgcolor: 'primary' }} animation="wave" variant="text" className="skeleton-portfolio-element-order"/>
                    <Skeleton  animation="wave" variant="text" className="skeleton-portfolio-element-alt"/>
                    <Skeleton animation="wave" variant="text" className="skeleton-portfolio-element-name"/>
                    <Skeleton animation="wave" variant="text" className="skeleton-portfolio-element-order"/>

                    <Skeleton animation="wave" variant="rounded" className="skeleton-portfolio-element-photo"/>
                    <Skeleton animation="wave" variant="text" className="skeleton-portfolio-element-option"/>
            </div>
            <div className="skeleton-portfolio-element">
                    <Skeleton sx={{ bgcolor: 'primary' }} animation="wave" variant="text" className="skeleton-portfolio-element-order"/>
                    <Skeleton  animation="wave" variant="text" className="skeleton-portfolio-element-alt"/>
                    <Skeleton animation="wave" variant="text" className="skeleton-portfolio-element-name"/>
                    <Skeleton animation="wave" variant="text" className="skeleton-portfolio-element-order"/>

                    <Skeleton animation="wave" variant="rounded" className="skeleton-portfolio-element-photo"/>
                    <Skeleton animation="wave" variant="text" className="skeleton-portfolio-element-option"/>
            </div>
            <div className="skeleton-portfolio-element">
                    <Skeleton sx={{ bgcolor: 'primary' }} animation="wave" variant="text" className="skeleton-portfolio-element-order"/>
                    <Skeleton  animation="wave" variant="text" className="skeleton-portfolio-element-alt"/>
                    <Skeleton animation="wave" variant="text" className="skeleton-portfolio-element-name"/>
                    <Skeleton animation="wave" variant="text" className="skeleton-portfolio-element-order"/>

                    <Skeleton animation="wave" variant="rounded" className="skeleton-portfolio-element-photo"/>
                    <Skeleton animation="wave" variant="text" className="skeleton-portfolio-element-option"/>
            </div>
            <div className="skeleton-portfolio-element">
                    <Skeleton sx={{ bgcolor: 'primary' }} animation="wave" variant="text" className="skeleton-portfolio-element-order"/>
                    <Skeleton  animation="wave" variant="text" className="skeleton-portfolio-element-alt"/>
                    <Skeleton animation="wave" variant="text" className="skeleton-portfolio-element-name"/>
                    <Skeleton animation="wave" variant="text" className="skeleton-portfolio-element-order"/>

                    <Skeleton animation="wave" variant="rounded" className="skeleton-portfolio-element-photo"/>
                    <Skeleton animation="wave" variant="text" className="skeleton-portfolio-element-option"/>
            </div>
            <div className="skeleton-portfolio-element">
                    <Skeleton sx={{ bgcolor: 'primary' }} animation="wave" variant="text" className="skeleton-portfolio-element-order"/>
                    <Skeleton  animation="wave" variant="text" className="skeleton-portfolio-element-alt"/>
                    <Skeleton animation="wave" variant="text" className="skeleton-portfolio-element-name"/>
                    <Skeleton animation="wave" variant="text" className="skeleton-portfolio-element-order"/>

                    <Skeleton animation="wave" variant="rounded" className="skeleton-portfolio-element-photo"/>
                    <Skeleton animation="wave" variant="text" className="skeleton-portfolio-element-option"/>
            </div>
            <div className="skeleton-portfolio-element">
                    <Skeleton sx={{ bgcolor: 'primary' }} animation="wave" variant="text" className="skeleton-portfolio-element-order"/>
                    <Skeleton  animation="wave" variant="text" className="skeleton-portfolio-element-alt"/>
                    <Skeleton animation="wave" variant="text" className="skeleton-portfolio-element-name"/>
                    <Skeleton animation="wave" variant="text" className="skeleton-portfolio-element-order"/>

                    <Skeleton animation="wave" variant="rounded" className="skeleton-portfolio-element-photo"/>
                    <Skeleton animation="wave" variant="text" className="skeleton-portfolio-element-option"/>
            </div>
            <div className="skeleton-portfolio-element">
                    <Skeleton sx={{ bgcolor: 'primary' }} animation="wave" variant="text" className="skeleton-portfolio-element-order"/>
                    <Skeleton  animation="wave" variant="text" className="skeleton-portfolio-element-alt"/>
                    <Skeleton animation="wave" variant="text" className="skeleton-portfolio-element-name"/>
                    <Skeleton animation="wave" variant="text" className="skeleton-portfolio-element-order"/>

                    <Skeleton animation="wave" variant="rounded" className="skeleton-portfolio-element-photo"/>
                    <Skeleton animation="wave" variant="text" className="skeleton-portfolio-element-option"/>
            </div>
            <div className="skeleton-portfolio-element">
                    <Skeleton sx={{ bgcolor: 'primary' }} animation="wave" variant="text" className="skeleton-portfolio-element-order"/>
                    <Skeleton  animation="wave" variant="text" className="skeleton-portfolio-element-alt"/>
                    <Skeleton animation="wave" variant="text" className="skeleton-portfolio-element-name"/>
                    <Skeleton animation="wave" variant="text" className="skeleton-portfolio-element-order"/>

                    <Skeleton animation="wave" variant="rounded" className="skeleton-portfolio-element-photo"/>
                    <Skeleton animation="wave" variant="text" className="skeleton-portfolio-element-option"/>
            </div>
            <div className="skeleton-portfolio-element">
                    <Skeleton sx={{ bgcolor: 'primary' }} animation="wave" variant="text" className="skeleton-portfolio-element-order"/>
                    <Skeleton  animation="wave" variant="text" className="skeleton-portfolio-element-alt"/>
                    <Skeleton animation="wave" variant="text" className="skeleton-portfolio-element-name"/>
                    <Skeleton animation="wave" variant="text" className="skeleton-portfolio-element-order"/>

                    <Skeleton animation="wave" variant="rounded" className="skeleton-portfolio-element-photo"/>
                    <Skeleton animation="wave" variant="text" className="skeleton-portfolio-element-option"/>
            </div>
        </div>
        
    );
}

export const SkeletonBlog = () => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setVisible(true), 200);
        return () => clearTimeout(timer);
    }, []);

    if (!visible) return null;

    return (
        <div className="skeleton-wrapper-portfolio">
            <div className="skeleton-portfolio-element skeleton_blog">
                    <Skeleton sx={{ bgcolor: 'primary' }} animation="wave" variant="text" className="order_element Item_portfolio_element"/>
                    <Skeleton  animation="wave" variant="text" className="blog_name_element Item_portfolio_element"/>
                    <Skeleton animation="wave" variant="text" className="blog_status Item_portfolio_element"/>
                    <Skeleton animation="wave" variant="text" className="blog_date_element Item_portfolio_element"/>
                    <Skeleton animation="wave" variant="text" className="blog_date_element Item_portfolio_element"/>
                    <Skeleton animation="wave" variant="text" className="blog_date_element Item_portfolio_element"/>
            </div>
            <div className="skeleton-portfolio-element skeleton_blog">
                    <Skeleton sx={{ bgcolor: 'primary' }} animation="wave" variant="text" className="order_element Item_portfolio_element"/>
                    <Skeleton  animation="wave" variant="text" className="blog_name_element Item_portfolio_element"/>
                    <Skeleton animation="wave" variant="text" className="blog_status Item_portfolio_element"/>
                    <Skeleton animation="wave" variant="text" className="blog_date_element Item_portfolio_element"/>
                    <Skeleton animation="wave" variant="text" className="blog_date_element Item_portfolio_element"/>
                    <Skeleton animation="wave" variant="text" className="blog_date_element Item_portfolio_element"/>
            </div>
            <div className="skeleton-portfolio-element skeleton_blog">
                    <Skeleton sx={{ bgcolor: 'primary' }} animation="wave" variant="text" className="order_element Item_portfolio_element"/>
                    <Skeleton  animation="wave" variant="text" className="blog_name_element Item_portfolio_element"/>
                    <Skeleton animation="wave" variant="text" className="blog_status Item_portfolio_element"/>
                    <Skeleton animation="wave" variant="text" className="blog_date_element Item_portfolio_element"/>
                    <Skeleton animation="wave" variant="text" className="blog_date_element Item_portfolio_element"/>
                    <Skeleton animation="wave" variant="text" className="blog_date_element Item_portfolio_element"/>
            </div>
            <div className="skeleton-portfolio-element skeleton_blog">
                    <Skeleton sx={{ bgcolor: 'primary' }} animation="wave" variant="text" className="order_element Item_portfolio_element"/>
                    <Skeleton  animation="wave" variant="text" className="blog_name_element Item_portfolio_element"/>
                    <Skeleton animation="wave" variant="text" className="blog_status Item_portfolio_element"/>
                    <Skeleton animation="wave" variant="text" className="blog_date_element Item_portfolio_element"/>
                    <Skeleton animation="wave" variant="text" className="blog_date_element Item_portfolio_element"/>
                    <Skeleton animation="wave" variant="text" className="blog_date_element Item_portfolio_element"/>
            </div>
            <div className="skeleton-portfolio-element skeleton_blog">
                    <Skeleton sx={{ bgcolor: 'primary' }} animation="wave" variant="text" className="order_element Item_portfolio_element"/>
                    <Skeleton  animation="wave" variant="text" className="blog_name_element Item_portfolio_element"/>
                    <Skeleton animation="wave" variant="text" className="blog_status Item_portfolio_element"/>
                    <Skeleton animation="wave" variant="text" className="blog_date_element Item_portfolio_element"/>
                    <Skeleton animation="wave" variant="text" className="blog_date_element Item_portfolio_element"/>
                    <Skeleton animation="wave" variant="text" className="blog_date_element Item_portfolio_element"/>
            </div>
            <div className="skeleton-portfolio-element skeleton_blog">
                    <Skeleton sx={{ bgcolor: 'primary' }} animation="wave" variant="text" className="order_element Item_portfolio_element"/>
                    <Skeleton  animation="wave" variant="text" className="blog_name_element Item_portfolio_element"/>
                    <Skeleton animation="wave" variant="text" className="blog_status Item_portfolio_element"/>
                    <Skeleton animation="wave" variant="text" className="blog_date_element Item_portfolio_element"/>
                    <Skeleton animation="wave" variant="text" className="blog_date_element Item_portfolio_element"/>
                    <Skeleton animation="wave" variant="text" className="blog_date_element Item_portfolio_element"/>
            </div>
            <div className="skeleton-portfolio-element skeleton_blog">
                    <Skeleton sx={{ bgcolor: 'primary' }} animation="wave" variant="text" className="order_element Item_portfolio_element"/>
                    <Skeleton  animation="wave" variant="text" className="blog_name_element Item_portfolio_element"/>
                    <Skeleton animation="wave" variant="text" className="blog_status Item_portfolio_element"/>
                    <Skeleton animation="wave" variant="text" className="blog_date_element Item_portfolio_element"/>
                    <Skeleton animation="wave" variant="text" className="blog_date_element Item_portfolio_element"/>
                    <Skeleton animation="wave" variant="text" className="blog_date_element Item_portfolio_element"/>
            </div>
            <div className="skeleton-portfolio-element skeleton_blog">
                    <Skeleton sx={{ bgcolor: 'primary' }} animation="wave" variant="text" className="order_element Item_portfolio_element"/>
                    <Skeleton  animation="wave" variant="text" className="blog_name_element Item_portfolio_element"/>
                    <Skeleton animation="wave" variant="text" className="blog_status Item_portfolio_element"/>
                    <Skeleton animation="wave" variant="text" className="blog_date_element Item_portfolio_element"/>
                    <Skeleton animation="wave" variant="text" className="blog_date_element Item_portfolio_element"/>
                    <Skeleton animation="wave" variant="text" className="blog_date_element Item_portfolio_element"/>
            </div>
            <div className="skeleton-portfolio-element skeleton_blog">
                    <Skeleton sx={{ bgcolor: 'primary' }} animation="wave" variant="text" className="order_element Item_portfolio_element"/>
                    <Skeleton  animation="wave" variant="text" className="blog_name_element Item_portfolio_element"/>
                    <Skeleton animation="wave" variant="text" className="blog_status Item_portfolio_element"/>
                    <Skeleton animation="wave" variant="text" className="blog_date_element Item_portfolio_element"/>
                    <Skeleton animation="wave" variant="text" className="blog_date_element Item_portfolio_element"/>
                    <Skeleton animation="wave" variant="text" className="blog_date_element Item_portfolio_element"/>
            </div>
        </div>
        
    );
}

export const SkeletonTotalSize = () => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setVisible(true), 200);
        return () => clearTimeout(timer);
    }, []);

    if (!visible) return null;

    return (
        <div>
            <Skeleton animation="wave" variant="text" />
            <Skeleton animation="wave" variant="text"/> 
        </div>
    );
}

// Skeleton complet pour un sélecteur (icône gauche + zone texte + flèche droite)
export const SkeletonFullSelector = () => (
    <div className="skeleton-full-block-wrapper">
        <Skeleton animation="wave" variant="rounded" className="skeleton-full-block" />
    </div>
);
// Skeleton pour sélecteurs (workspace / website)
export const SkeletonSelector = ({ showRole = true }) => {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const timer = setTimeout(() => setVisible(true), 150);
        return () => clearTimeout(timer);
    }, []);
    if (!visible) return null;
    return (
        <div className="skeleton-selector">
            <Skeleton animation="wave" variant="text" className="skeleton-selector-name" />
            {showRole && <Skeleton animation="wave" variant="rounded" className="skeleton-selector-role" />}
        </div>
    );
};

// Skeleton pour listes dans menus déroulants
export const SkeletonMenuList = ({ lines = 3 }) => {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const timer = setTimeout(() => setVisible(true), 120);
        return () => clearTimeout(timer);
    }, []);
    if (!visible) return null;
    return (
        <div className="skeleton-menu-list">
            {Array.from({ length: lines }).map((_, i) => (
                <div key={i} className="skeleton-menu-line">
                    <Skeleton animation="wave" variant="text" className="skeleton-menu-text" />
                </div>
            ))}
        </div>
    );
};