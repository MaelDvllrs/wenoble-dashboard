import Axios from 'axios';

export const fetchImages = async (username) => {
  try {
    const response = await Axios.get('http://localhost:3002/getProfileImages', {
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
    const response = await Axios.get('http://localhost:3002/getPorfolioImages', {
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
    await Axios.post('http://localhost:3002/savePorfolioImages', {
      params: {
        fields : fields
      }
    });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement des images', error );
  }
};