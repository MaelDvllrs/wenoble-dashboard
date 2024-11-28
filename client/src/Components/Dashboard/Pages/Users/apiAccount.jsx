import Axios from 'axios';
import config from '../../../../config';

const apiUrl = config.apiUrl;

export const fetchUserInfo = async (token) => {
  try {
    
    const responseBasic = await Axios.get(`${apiUrl}/getUserInfoBasic`, {
        token: token,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
    });
    return responseBasic.data;
  } catch (error) {
    console.error('Erreur lors de la récupération des informations utilisateur:', error);
    throw error;
  }
};

export const updateUserInfo = async (userInfoNew, token) => {
  try {
    let response;

    if (userInfoNew.image) {
      // Utiliser FormData pour envoyer les données avec l'image
      const formData = new FormData();
      formData.append('image', userInfoNew.image.data, userInfoNew.image.name);
      formData.append('data', JSON.stringify(userInfoNew));

      response = await Axios.post(`${apiUrl}/updateInfoUser`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
    } else {
      // Envoyer les données en tant que JSON
      response = await Axios.post(`${apiUrl}/updateInfoUser`, { data: JSON.stringify(userInfoNew) }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
    }
    console.log(response);
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la mise à jour des informations utilisateur:', error);
    throw error;
  }
};

export const changeUserPassword = async (username, currentPassword, newPassword) => {
  try {
    const response = await Axios.post(`${apiUrl}/user/${username}/change-password`, {
      currentPassword,
      newPassword
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Erreur lors du changement de mot de passe:', error);
    throw error;
  }
};