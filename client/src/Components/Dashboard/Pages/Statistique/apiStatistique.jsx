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


export const getLocationStatistique = async (period, typeLocation, locationID, typeUser, token) => {
  try {
  
      const response = await Axios.get(`${apiUrl}/getLocationAnalytics`, {
          params: {
              period: period,
              typeLocation: typeLocation,
              locationID: locationID,
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

export const getPlatformCategorieStatistique = async (period, typePlatform, typeUser, token) => {
  try {
  
      const response = await Axios.get(`${apiUrl}/getPlateformCategorieAnalytics`, {
          params: {
              period: period,
              typePlatform: typePlatform,
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


export const getPageStatistique = async (period, typePage, typeUser ,token) => {
  try {
  
      const response = await Axios.get(`${apiUrl}/getPageAnalytics`, {
          params: {
              period: period,
              typePage: typePage,
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


