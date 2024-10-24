import Axios from 'axios';
import config from '../../../../../config';
  
const apiUrl = config.apiUrl; 
  
export const fetchImagesPage = async (pageId) => {
  try {
    const response = await Axios.get(`${apiUrl}/getPageImages`, {
      params: {
         pageId: pageId  
      }
    });
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération des images :', error);
    return [];
  }
};
  
export const saveImagePage = async (fields) => {
  try {

    if (fields.data) {
      
      const formData = new FormData();

      // Ajouter le blob en tant que fichier
      formData.append('image', fields.data, fields.src);


      // Ajouter les autres champs
      formData.append('id_photo', fields.id);
      formData.append('alt', fields.alt);
      formData.append('name', fields.name);
      formData.append('src', fields.src);

      await Axios.post(`${apiUrl}/saveImagesPage`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

    } else {

      await Axios.post(`${apiUrl}/saveAltPage`, {

        params: {
          fields : fields,
          directory : "page_image"
        }
      });
    }

  } catch (error) {
    console.error('Message d\'erreur du serveur:', error.response.data.message);
    // Propager l'erreur
    throw error;
  }
}


export const fetchTextePage = async (pageId) => {
  try {
    const response = await Axios.get(`${apiUrl}/getPageTexte`, {
      params: {
         pageId: pageId  
      }
    });
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération des textes :', error);
    return [];
  }
}

export const updateTextPage = async (idPage, text) => {
  try {
    await Axios.post(`${apiUrl}/updateTextPage`, {
      params: {
        idPage : idPage,
        text : text
      }
    });
  } catch (error) {
    console.error('Message d\'erreur du serveur:', error.response.data.message);
    // Propager l'erreur
    throw error;
  }
}

export const updateRichTextPage = async (idPage, richtext) => {

  try {
    await Axios.post(`${apiUrl}/updateRichTextPage`, {
      params: {
        idPage : idPage,
        richtext : richtext,
      }
    });
  } catch (error) {
    console.error('Message d\'erreur du serveur:', error.response.data.message);
    // Propager l'erreur
    throw error;
  }
}


export const updateImagePage = async (fields, pageId) => {
  try {


    // Créer un objet FormData
    const formData = new FormData();



    // Ajouter le blob en tant que fichier
    formData.append('image', fields.data, fields.name);

    // Ajouter les autres champs
    formData.append('id_page', pageId);
    formData.append('id_config', fields.id_config);
    formData.append('alt', fields.alt);
    formData.append('name', fields.name);
    formData.append('size', fields.size);

      await Axios.post(`${apiUrl}/updateImagesPage`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
  } catch (error) {
    console.error('Message d\'erreur du serveur:', error);
    // Propager l'erreur
    throw error;
  }
};