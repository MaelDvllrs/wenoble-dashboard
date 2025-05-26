import axios from 'axios';
import Cookies from 'js-cookie';
import { supabase } from './supabaseAuth'; // Assurez-vous que le chemin est correct
import config from '../config';

const Axios = axios.create({
  baseURL: config.apiUrl
});

// Intercepteur pour ajouter le token à chaque requête
Axios.interceptors.request.use(
  async config => {
    // Vérifier si le token est présent dans les cookies
    let token = Cookies.get('token');
    
    // Si pas de token dans les cookies, essayer de récupérer depuis Supabase
    if (!token) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        token = session.access_token;
        // Mettre à jour le cookie
        Cookies.set('token', token, {
          expires: 7,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'Lax'
        });
      }
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  error => Promise.reject(error)
);

// Intercepteur pour gérer les erreurs 401
Axios.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Rafraîchir la session
        const { data, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) throw refreshError;
        
        if (data && data.session) {
          // Mettre à jour le cookie
          Cookies.set('token', data.session.access_token, {
            expires: 7,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Lax'
          });
          
          // Réessayer la requête avec le nouveau token
          originalRequest.headers.Authorization = `Bearer ${data.session.access_token}`;
          return Axios(originalRequest);
        }
      } catch (refreshError) {
        console.error('Erreur lors du rafraîchissement de session:', refreshError);
        
        // Rediriger vers la page de connexion
        window.location.href = '/';
      }
    }
    
    return Promise.reject(error);
  }
);

export default Axios;