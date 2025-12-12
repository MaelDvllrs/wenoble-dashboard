import Axios from '../../../../../service/AxiosConfig';
import config from '../../../../../config';

const apiUrl = config.apiUrl;

export const checkScrapingStatus = async (websiteId, token) => {
  try {
    const response = await Axios.get(`${apiUrl}/scraping/status/${websiteId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la vérification du statut:', error);
    throw error;
  }
};

export const scrapeSite = async (websiteId, token) => {
  try {
    const response = await Axios.post(`${apiUrl}/scraping/scrape`, 
      {
        websiteId
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Erreur lors du scraping:', error);
    throw error;
  }
};

export const rescrapeSite = async (websiteId, token) => {
  try {
    const response = await Axios.post(`${apiUrl}/scraping/rescrape/${websiteId}`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Erreur lors du rescraping:', error);
    throw error;
  }
};

export const saveSiteModifications = async (websiteId, htmlContent, token) => {
  try {
    const response = await Axios.post(`${apiUrl}/scraping/save`,
      {
        websiteId,
        htmlContent
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error);
    throw error;
  }
};
