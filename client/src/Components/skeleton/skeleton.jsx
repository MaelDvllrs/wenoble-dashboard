import React from "react";
import "./skeleton.css";
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';




export  const SkeletonProfile = () => {
    return (
        <div className="skeleton-wrapper">
            <div className="skeleton-profile">
                <div>
                    <div className="skeleton-profile-photo"></div>
                </div>
                <div>
                    <div className="skeleton-profile-name"></div>
                    <div className="skeleton-profile-id"></div>
                </div>
            </div>
        </div>
    );
}

export  const SkeletonPortfolio = () => {
    return (
        <div className="skeleton-wrapper-portfolio">
            <div className="skeleton-portfolio-element">
                    <Skeleton sx={{ bgcolor: 'primary' }} animation="wave" variant="text" className="skeleton-portfolio-element-order"/>
                    <Skeleton  animation="wave" variant="text" className="skeleton-portfolio-element-alt"/>
                    <Skeleton animation="wave" variant="text" className="skeleton-portfolio-element-name"/>
                    <Skeleton animation="wave" variant="rounded" className="skeleton-portfolio-element-photo"/>
                    <Skeleton animation="wave" variant="text" className="skeleton-portfolio-element-option"/>
            </div>
            <div className="skeleton-portfolio-element">
                    <Skeleton sx={{ bgcolor: 'primary' }} animation="wave" variant="text" className="skeleton-portfolio-element-order"/>
                    <Skeleton  animation="wave" variant="text" className="skeleton-portfolio-element-alt"/>
                    <Skeleton animation="wave" variant="text" className="skeleton-portfolio-element-name"/>
                    <Skeleton animation="wave" variant="rounded" className="skeleton-portfolio-element-photo"/>
                    <Skeleton animation="wave" variant="text" className="skeleton-portfolio-element-option"/>
            </div>
            <div className="skeleton-portfolio-element">
                    <Skeleton sx={{ bgcolor: 'primary' }} animation="wave" variant="text" className="skeleton-portfolio-element-order"/>
                    <Skeleton  animation="wave" variant="text" className="skeleton-portfolio-element-alt"/>
                    <Skeleton animation="wave" variant="text" className="skeleton-portfolio-element-name"/>
                    <Skeleton animation="wave" variant="rounded" className="skeleton-portfolio-element-photo"/>
                    <Skeleton animation="wave" variant="text" className="skeleton-portfolio-element-option"/>
            </div>
            <div className="skeleton-portfolio-element">
                    <Skeleton sx={{ bgcolor: 'primary' }} animation="wave" variant="text" className="skeleton-portfolio-element-order"/>
                    <Skeleton  animation="wave" variant="text" className="skeleton-portfolio-element-alt"/>
                    <Skeleton animation="wave" variant="text" className="skeleton-portfolio-element-name"/>
                    <Skeleton animation="wave" variant="rounded" className="skeleton-portfolio-element-photo"/>
                    <Skeleton animation="wave" variant="text" className="skeleton-portfolio-element-option"/>
            </div>
            <div className="skeleton-portfolio-element">
                    <Skeleton sx={{ bgcolor: 'primary' }} animation="wave" variant="text" className="skeleton-portfolio-element-order"/>
                    <Skeleton  animation="wave" variant="text" className="skeleton-portfolio-element-alt"/>
                    <Skeleton animation="wave" variant="text" className="skeleton-portfolio-element-name"/>
                    <Skeleton animation="wave" variant="rounded" className="skeleton-portfolio-element-photo"/>
                    <Skeleton animation="wave" variant="text" className="skeleton-portfolio-element-option"/>
            </div>
            <div className="skeleton-portfolio-element">
                    <Skeleton sx={{ bgcolor: 'primary' }} animation="wave" variant="text" className="skeleton-portfolio-element-order"/>
                    <Skeleton  animation="wave" variant="text" className="skeleton-portfolio-element-alt"/>
                    <Skeleton animation="wave" variant="text" className="skeleton-portfolio-element-name"/>
                    <Skeleton animation="wave" variant="rounded" className="skeleton-portfolio-element-photo"/>
                    <Skeleton animation="wave" variant="text" className="skeleton-portfolio-element-option"/>
            </div>
            <div className="skeleton-portfolio-element">
                    <Skeleton sx={{ bgcolor: 'primary' }} animation="wave" variant="text" className="skeleton-portfolio-element-order"/>
                    <Skeleton  animation="wave" variant="text" className="skeleton-portfolio-element-alt"/>
                    <Skeleton animation="wave" variant="text" className="skeleton-portfolio-element-name"/>
                    <Skeleton animation="wave" variant="rounded" className="skeleton-portfolio-element-photo"/>
                    <Skeleton animation="wave" variant="text" className="skeleton-portfolio-element-option"/>
            </div>
            <div className="skeleton-portfolio-element">
                    <Skeleton sx={{ bgcolor: 'primary' }} animation="wave" variant="text" className="skeleton-portfolio-element-order"/>
                    <Skeleton  animation="wave" variant="text" className="skeleton-portfolio-element-alt"/>
                    <Skeleton animation="wave" variant="text" className="skeleton-portfolio-element-name"/>
                    <Skeleton animation="wave" variant="rounded" className="skeleton-portfolio-element-photo"/>
                    <Skeleton animation="wave" variant="text" className="skeleton-portfolio-element-option"/>
            </div>
        </div>
        
    );
}