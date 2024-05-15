import Axios from 'axios';
import config from '../../config';


const apiUrl = config.apiUrl; 


export const fetchImages = async (username) => {
  try {
    const response = await Axios.get(`${apiUrl}/getProfileImages`, {
      params: {
        imagePrefix: 'profile_' + username + '.' 
      }
    });
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération des images :', error);
    return [];
  }
};

export const fetchImagesPortfolio = async (portfolioId) => {
  try {
    const response = await Axios.get(`${apiUrl}/getPorfolioImages`, {
      params: {
         portfolioId: portfolioId  
      }
    });
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération des images :', error);
    return [];
  }
};


export const saveImagesPortfolio = async (fields) => {
  try {
    await Axios.post(`${apiUrl}/saveImages`, {
      params: {
        fields : fields,
        directory : "portfolio_image"
      }
    });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement des images', error );
  }
};


export const orderportfolio = async (order, id_photo) => {
  try {
    await Axios.post(`${apiUrl}/orderPortfolio`, {
      order : order,
      id_photo : id_photo
    });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement des ordres', error );
  }
};