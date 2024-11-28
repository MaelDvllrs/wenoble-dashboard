import { useState, useEffect } from 'react';
import config from '../../../../config';
import Axios from 'axios';
import Cookies from 'js-cookie';

export const useUpdateTemplates = (articleSlug) => {
  const [updates, setUpdates] = useState([]);
  const token = Cookies.get('token');

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const response = await Axios.get(`${config.apiUrl}/getUpdateTemplate`, {
          params: { slug: articleSlug },
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        setUpdates(response.data);
      } catch (error) {
        console.error('Erreur lors de la récupération des articles:', error);
      }
    };

    fetchArticles();
  }, [articleSlug]);

  return updates; 
};