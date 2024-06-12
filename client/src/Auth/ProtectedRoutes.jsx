import axios from 'axios';
import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie'
import config from '../config';


const apiUrl = config.apiUrl; 


const IsAuthenticated = () => {
  const [verifyAuth, setVerifyAuth] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = Cookies.get('token');
        if (!token) {
          setVerifyAuth(true);
          throw new Error('Token not found');
        }

        const response = await axios.post(`${apiUrl}/api/auth/verify`, { token });

        if (response.data.success && !response.data.user.isAdmin) {
          setIsAuthenticating(true);
        }
        setVerifyAuth(true)
      } catch (error) {
        console.error(error);
      }
    };

    checkAuth();
  }, []);

  return {isAuthenticating, verifyAuth}
};

const IsAuthenticatedAdmin = () => {
  const [verifyAdm, setverifyAdm] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = Cookies.get('token');
        if (!token){ 
          setverifyAdm(true);
          throw new Error('Token not found');
        }

        const response = await axios.post(`${apiUrl}/api/auth/verify`, { token });

        if (response.data.success && response.data.user.isAdmin) {
          setIsAuthenticating(true);
        }
        setverifyAdm(true)
      } catch (error) {
        console.error(error);
        
      }
    };

    checkAuth();
  }, []);

  return {isAuthenticating, verifyAdm}

};

export { IsAuthenticatedAdmin, IsAuthenticated };






  