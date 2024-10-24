import Axios from 'axios';
import config from '../../../../../config';

const apiUrl = config.apiUrl; 


export const fetchImagesPortfolio = async (portfolioId, idUser) => {
    try {
      const response = await Axios.get(`${apiUrl}/getPorfolioImages`, {
        params: {
           portfolioId: portfolioId,
           idUser: idUser
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


    // Extraire l'extension du nom de fichier original
    const extension = fields.name.split('.').pop();

    // Créer un nouveau fichier blob avec le nom modifié
    const newFileName = `${fields.id_photo}.${extension}`;
    const newFile = new File([fields.data], newFileName, { type: fields.data.type });

    // Créer un objet FormData
    const formData = new FormData();

    // Ajouter le blob en tant que fichier
    formData.append('image', newFile, newFileName);


    // Ajouter les autres champs
    formData.append('id_photo', fields.id_photo);
    formData.append('id_portfolio', fields.id_portfolio);
    formData.append('alt', fields.alt);
    formData.append('name', fields.name);
    formData.append('size', fields.size);

    await Axios.post(`${apiUrl}/saveImagesPortfolio`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  } catch (error) {
    console.error('Message d\'erreur du serveur:', error.response.data.message);
    // Propager l'erreur
    throw error;
  }
};
  
export const deleteImagePortfolio = async (id_photo, type_photo, imageName) => {
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