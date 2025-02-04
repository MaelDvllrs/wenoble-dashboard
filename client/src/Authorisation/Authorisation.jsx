import axios from 'axios';
import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie'
import config from '../config';
import { Navigate } from 'react-router-dom';

const apiUrl = config.apiUrl; 

const IsAuthorised = (type) => {
    const [verifyAuthorisation, setVerifyAuthorisation] = useState(false);
    const [IsAuthorised, setIsAuthorised] = useState(false);

  
    useEffect(() => {
      const checkAuth = async () => {
        try {
          const token = Cookies.get('token');
          if (!token) {
            setVerifyAuthorisation(true);
            throw new Error('Token not found');
          }
  
          const response = await axios.post(`${apiUrl}/getAuthorisation`, { 
            token, 
            type
          });
        
          if (response.data.success) {
            setVerifyAuthorisation(true);
          }
          setIsAuthorised(response.data.authorisation)
        } catch (error) {
          return error;
        }
      };
      checkAuth();
    }, []);
  
    return {IsAuthorised, verifyAuthorisation}
};




 export const AuthorisedRoute = ({ children, authType }) => {
    const dataAuth = IsAuthorised(authType)
    const isAuthorised = dataAuth.IsAuthorised
    const verifyAuth = dataAuth.verifyAuthorisation
    if (isAuthorised && verifyAuth) {
      return children;
    } else if (verifyAuth) {
      return <Navigate to='/login' />;
    } else {
      return null;
    }
};

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
  <AuthorisedRoute authType="auth_newsletter">{ children}</AuthorisedRoute>
);



export const checkAutorisation = async (authType) => {
  const token = Cookies.get('token');

  try {
    const response = await axios.post(`${apiUrl}/getAuthorisation`, {
      token: token,
      type: authType
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.authorisation;
  } catch (error) {
    console.error('Erreur lors de la vérification de l\'autorisation', error);
    return false;
  }
};


