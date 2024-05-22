import Axios from 'axios';
import config from '../../config';
import imageCompression from 'browser-image-compression';
 


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
    console.log('Enregistrement des images...');
    await Axios.post(`${apiUrl}/saveImages`, {
      params: {
        fields : fields,
        directory : "portfolio_image"
      }
    });
  } catch (error) {
    console.error('Message d\'erreur du serveur:', error.response.data.message);
    // Propager l'erreur
    throw error;
  }
};

export const deleteImage = async (id_photo, type_photo, imageName) => {
  try {
    await Axios.post(`${apiUrl}/deleteImage`, {
      params: {
        id_photo: id_photo,
        type_photo: type_photo,
        imageName: imageName,
      }
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'image :', error);
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

export const compressImage = async (file) => {
  const options = {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  };
  try {
    return await imageCompression(file, options);
  } catch (error) {
    console.error('Erreur lors de la compression de l\'image :', error);
    return file;
  }
};