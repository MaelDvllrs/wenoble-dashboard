import { useState, useEffect } from 'react';
import Axios from 'axios';
import config from '../../../../config';
import Cookies from 'js-cookie';

export const useArticles = (limit) => {
  const [articles, setArticles] = useState([]);
  const token = Cookies.get('token');

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const response = await Axios.get(`${config.apiUrl}/getArticle`, {
          params: { limit },
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        setArticles(response.data);
      } catch (error) {
        console.error('Erreur lors de la récupération des articles:', error);
      }
    };

    fetchArticles();
  }, [limit, token]);

  return articles;
};
