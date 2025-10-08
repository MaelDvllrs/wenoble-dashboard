import React, { useState, useEffect } from 'react';
import axios from '../service/AxiosConfig';
import Cookies from 'js-cookie';
import { Navigate } from 'react-router-dom';
import { useWebsite } from '../Context/WebsiteContext';
import config from '../config';
import { supabase } from '../service/supabaseAuth';

// Constants
const apiUrl = config.apiUrl;

// Helper function for authorization
const fetchAuthorization = async (type, websiteId, setVerify, setAuthorized) => {
    try {
        // Try cookie first, then resync from Supabase if missing
        let token = Cookies.get('token');
        if (!token) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
                token = session.access_token;
                Cookies.set('token', token, {
                    expires: 30,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'Lax'
                });
            }
        }

        if (!websiteId) {
            console.log('Aucun site web sélectionné pour vérifier les autorisations');
            setVerify(true);
            setAuthorized(false);
            return;
        }

        const response = await axios.post(`${apiUrl}/getAuthorisation`, { 
            token, 
            type,
            websiteId 
        });

        if (response.data.success) {
            setVerify(true);
        }
        setAuthorized(response.data.authorisation);
    } catch (error) {
        console.error('Authorization error:', error);
        setVerify(true);
        setAuthorized(false);
    }
};

// Hook for checking authorization
const useAuthorization = (type) => {
    const [verifyAuthorization, setVerifyAuthorization] = useState(false);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const { selectedWebsite } = useWebsite();

    useEffect(() => {
        if (selectedWebsite?.id) {
            fetchAuthorization(type, selectedWebsite.id, setVerifyAuthorization, setIsAuthorized);
        } else {
            setVerifyAuthorization(true);
            setIsAuthorized(false);
        }
    }, [type, selectedWebsite]);

    return { isAuthorized, verifyAuthorization };
};

// Component for protected routes
export const AuthorisedRoute = ({ children, authType }) => {
    const { isAuthorized, verifyAuthorization } = useAuthorization(authType);

    // Afficher le contenu immédiatement, la vérification se fait en arrière-plan
    if (!verifyAuthorization) {
        // Pendant la vérification, on affiche le contenu (pas de clignotement)
        return children;
    }

    if (isAuthorized) {
        return children;
    } else {
        return <Navigate to='/login' />;
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
export const checkAuthorization = async (authType, websiteId) => {
    // Try cookie first, then resync from Supabase if missing
    let token = Cookies.get('token');
    if (!token) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
            token = session.access_token;
            Cookies.set('token', token, {
                expires: 30,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'Lax'
            });
        }
    }

    if (!websiteId) {
        console.log('Aucun site web sélectionné pour vérifier les autorisations');
        return false;
    }

    try {
        const response = await axios.post(`${apiUrl}/getAuthorisation`, {
            token,
            type: authType,
            websiteId: websiteId
        });
        return response.data.authorisation;
    } catch (error) {
        console.error('Error during authorization check:', error);
        return false;
    }
};


