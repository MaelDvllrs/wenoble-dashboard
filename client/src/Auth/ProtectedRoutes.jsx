import { useState, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import config from '../config';

// Constants
const apiUrl = config.apiUrl;

// Helper function for authentication
const checkAuthentication = async (setVerify, setAuthenticating, isAdminCheck = false) => {
    try {
        const token = Cookies.get('token');
        if (!token) {
            setVerify(true);
            throw new Error('Token not found');
        }

        const response = await axios.post(`${apiUrl}/auth/verify`, { token });

        if (response.data.success && (isAdminCheck ? response.data.user.isAdmin : !response.data.user.isAdmin)) {
            setAuthenticating(true);
        }
        setVerify(true);
    } catch (error) {
        return error;
    }
};

// Hook for client authentication
const IsAuthenticated = () => {
    const [verifyAuth, setVerifyAuth] = useState(false);
    const [isAuthenticating, setIsAuthenticating] = useState(false);

    useEffect(() => {
        checkAuthentication(setVerifyAuth, setIsAuthenticating, false);
    }, []);

    return { isAuthenticating, verifyAuth };
};

// Hook for admin authentication
const IsAuthenticatedAdmin = () => {
    const [verifyAdm, setVerifyAdm] = useState(false);
    const [isAuthenticating, setIsAuthenticating] = useState(false);

    useEffect(() => {
        checkAuthentication(setVerifyAdm, setIsAuthenticating, true);
    }, []);

    return { isAuthenticating, verifyAdm };
};

// Exports
export { IsAuthenticatedAdmin, IsAuthenticated };






