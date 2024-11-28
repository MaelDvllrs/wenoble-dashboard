import { useState, useEffect } from 'react';
import config from '../../../../config';
import Axios from 'axios';
import Cookies from 'js-cookie';


export const useUpdates = (limit) => {
  const [updates, setUpdates] = useState([]);
  const token = Cookies.get('token');


  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const response = await Axios.get(`${config.apiUrl}/getUpdate`, {
          params: { limit },
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
  }, [limit, token]);

  return updates;
};