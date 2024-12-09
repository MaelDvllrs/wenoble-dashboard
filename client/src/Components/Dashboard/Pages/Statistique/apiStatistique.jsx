import Axios from 'axios';
import config from '../../../../config';

const apiUrl = config.apiUrl; 


export const getStatistique = async (period, typeUser, token) => {
    try {
        const response = await Axios.get(`${apiUrl}/getUserAnalytics`, {
            params: {
                period: period,
                typeUser: typeUser
            },
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
        });
        return response;
      } catch (error) {
        console.error('Erreur lors de la récupération des données analytics:', error);
        throw error;
      }
}

export const getEventStatistique = async (period, token) => {
    try {
    
        const response = await Axios.get(`${apiUrl}/getEventAnalytics`, {
            params: {
                period: period
            },
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
        });
        return response;
      } catch (error) {
        console.error('Erreur lors de la récupération des données analytics:', error);
        throw error;
      }
}

export const getLocationStatistique = async (period, typeLocation, token) => {
  try {
  
      const response = await Axios.get(`${apiUrl}/getLocationAnalytics`, {
          params: {
              period: period,
              typeLocation: typeLocation
          },
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
      });
      return response;
    } catch (error) {
      console.error('Erreur lors de la récupération des données analytics:', error);
      throw error;
    }
}

export const getPlatformCategorieStatistique = async (period, token) => {
  try {
  
      const response = await Axios.get(`${apiUrl}/getPlateformCategorieAnalytics`, {
          params: {
              period: period
          },
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
      });
      return response;
    } catch (error) {
      console.error('Erreur lors de la récupération des données analytics:', error);
      throw error;
    }
}


