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
            <Skeleton animation="wave" variant="text" className="limit_size_text"/>
            <Skeleton className="limit_size_bar" animation="wave" variant="text"/> 
        </div>
    );
}