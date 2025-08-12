import Axios from 'axios';
import config from '../../../../config';

const apiUrl = config.apiUrl; 


export const getStatistique = async (period, typeUser, websiteId, token) => {
    try {
        const response = await Axios.get(`${apiUrl}/getUserAnalytics`, {
            params: {
                period: period,
                typeUser: typeUser,
                websiteId: websiteId
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

export const getEventStatistique = async (period, websiteId, token) => {
  try {
      const response = await Axios.get(`${apiUrl}/getEventAnalytics`, {
          params: {
              period: period,
              websiteId: websiteId
          },
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
      });
      return response;
    } catch (error) {
      console.error('Erreur lors de la récupération des données d\'événements analytics:', error);
      throw error;
    }
}


export const getLocationStatistique = async (period, typeLocation, locationID, typeUser, websiteId, token) => {
  try {
  
      const response = await Axios.get(`${apiUrl}/getLocationAnalytics`, {
          params: {
              period: period,
              typeLocation: typeLocation,
              locationID: locationID,
              typeUser: typeUser,
              websiteId: websiteId
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

export const getPlatformCategorieStatistique = async (period, typePlatform, typeUser, websiteId, token) => {
  try {
  
      const response = await Axios.get(`${apiUrl}/getPlateformCategorieAnalytics`, {
          params: {
              period: period,
              typePlatform: typePlatform,
              typeUser: typeUser,
              websiteId: websiteId
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


export const getPageStatistique = async (period, typePage, typeUser, websiteId, token) => {
  try {
  
      const response = await Axios.get(`${apiUrl}/getPageAnalytics`, {
          params: {
              period: period,
              typePage: typePage,
              typeUser: typeUser,
              websiteId: websiteId
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

export const getSearchConsoleStatistique = async (period, metric, token, websiteId) => {
  try {
    const response = await Axios.get(`${apiUrl}/getSearchConsoleData`, {
      params: {
        period: period,
        metric: metric,
        websiteId: websiteId
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération des données Search Console:', error);
    throw error;
  }
}

export const getSearchConsoleTable = async (type, period, token, websiteId) => {
  try {
    const endpoint =
      type === 'page'
        ? `${apiUrl}/getSearchConsolePages`
        : `${apiUrl}/getSearchConsoleQueries`;
    const response = await Axios.get(endpoint, {
      params: { 
        period,
        websiteId: websiteId
      },
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération du tableau Search Console:', error);
    throw error;
  }
};




