import React, { useState, useEffect } from 'react';
import axios from '../service/AxiosConfig';
import Cookies from 'js-cookie';
import { Navigate } from 'react-router-dom';
import config from '../config';

// Constants
const apiUrl = config.apiUrl;

// Helper function for authorization
const fetchAuthorization = async (type, setVerify, setAuthorized) => {
    try {
        const token = Cookies.get('token');
        if (!token) {
            setVerify(true);
            throw new Error('Token not found');
        }

        const response = await axios.post(`${apiUrl}/getAuthorisation`, { token, type });

        if (response.data.success) {
            setVerify(true);
        }
        setAuthorized(response.data.authorisation);
    } catch (error) {
        console.error('Authorization error:', error);
    }
};

// Hook for checking authorization
const useAuthorization = (type) => {
    const [verifyAuthorization, setVerifyAuthorization] = useState(false);
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        fetchAuthorization(type, setVerifyAuthorization, setIsAuthorized);
    }, [type]);

    return { isAuthorized, verifyAuthorization };
};

// Component for protected routes
export const AuthorisedRoute = ({ children, authType }) => {
    const { isAuthorized, verifyAuthorization } = useAuthorization(authType);

    if (isAuthorized && verifyAuthorization) {
        return children;
    } else if (verifyAuthorization) {
        return <Navigate to='/login' />;
    } else {
        return null;
    }
};

// Specific authorized routes
export const AuthorisedRoutePortfolio = ({ children }) => (
    <AuthorisedRoute authType="auth_portfolio">{children}</AuthorisedRoute>
);

export const AuthorisedRoutePage = ({ children }) => (
    <AuthorisedRoute authType="auth_page">{children}</AuthorisedRoute>
);

export const AuthorisedRouteBlog = ({ children }) => (
    <AuthorisedRoute authType="auth_blog">{children}</AuthorisedRoute>
);

export const AuthorisedRouteEcomm = ({ children }) => (
    <AuthorisedRoute authType="auth_ecom">{children}</AuthorisedRoute>
);

export const AuthorisedRouteNewsletter = ({ children }) => (
    <AuthorisedRoute authType="auth_newsletter">{children}</AuthorisedRoute>
);

// Utility function for checking authorization
export const checkAuthorization = async (authType) => {
    const token = Cookies.get('token');

    try {
        const response = await axios.post(`${apiUrl}/getAuthorisation`, {
            token,
            type: authType
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data.authorisation;
    } catch (error) {
        console.error('Error during authorization check:', error);
        return false;
    }
};


