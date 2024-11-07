import Axios from 'axios';
import config from '../../../../../config';
import Cookies from 'js-cookie';

const apiUrl = config.apiUrl; 
const token = Cookies.get('token');

export const fetchImagesPortfolio = async (portfolioId, idUser) => {
  try {
    const response = await Axios.get(`${apiUrl}/getPorfolioImages`, {
      params: {
        portfolioId: portfolioId,
        idUser: idUser
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
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
    const extension = fields.name.split('.').pop();
    const newFileName = `${fields.id_photo}.${extension}`;
    const newFile = new File([fields.data], newFileName, { type: fields.data.type });
    const formData = new FormData();
    formData.append('image', newFile, newFileName);
    formData.append('id_photo', fields.id_photo);
    formData.append('id_portfolio', fields.id_portfolio);
    formData.append('alt', fields.alt);
    formData.append('name', fields.name);
    formData.append('size', fields.size);

    await Axios.post(`${apiUrl}/saveImagesPortfolio`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    });
  } catch (error) {
    console.error('Message d\'erreur du serveur:', error.response.data.message);
    throw error;
  }
};

export const deleteImagePortfolio = async (id_photo, type_photo, imageName) => {
  try {
    await Axios.post(`${apiUrl}/deleteImage`, {
      params: {
        id_photo: id_photo,
        type_photo: type_photo,
        imageName: imageName
      }
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'image :', error);
  }
};

export const orderportfolio = async (order, id_photo) => {
  try {
    await Axios.post(`${apiUrl}/orderPortfolio`, {
      order: order,
      id_photo: id_photo
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement des ordres', error);
  }
};