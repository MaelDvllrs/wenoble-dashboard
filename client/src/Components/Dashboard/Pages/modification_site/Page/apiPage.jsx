import Axios from 'axios';
import config from '../../../../../config';
import Cookies from 'js-cookie';
  
const apiUrl = config.apiUrl; 
const token = Cookies.get('token');
  
export const fetchImagesPage = async (pageId) => {
  try {
    const response = await Axios.get(`${apiUrl}/getPageImages`, {
      params: {
         pageId: pageId  
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
  
export const saveImagePage = async (fields) => {
  try {
    if (fields.data) {
      const formData = new FormData();
      formData.append('image', fields.data, fields.src);
      formData.append('id_photo', fields.id);
      formData.append('alt', fields.alt);
      formData.append('name', fields.name);
      formData.append('src', fields.src);

      await Axios.post(`${apiUrl}/saveImagesPage`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
    } else {
      await Axios.post(`${apiUrl}/saveAltPage`, {
        params: {
          fields: fields,
          directory: "page_image"
        }
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    }
  } catch (error) {
    console.error('Message d\'erreur du serveur:', error.response.data.message);
    throw error;
  }
}

export const fetchTextePage = async (pageId) => {
  try {
    const response = await Axios.get(`${apiUrl}/getPageTexte`, {
      params: {
         pageId: pageId  
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
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
        idPage: idPage,
        text: text
      }
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Message d\'erreur du serveur:', error.response.data.message);
    throw error;
  }
}

export const updateRichTextPage = async (idPage, richtext) => {
  try {
    await Axios.post(`${apiUrl}/updateRichTextPage`, {
      params: {
        idPage: idPage,
        richtext: richtext
      }
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Message d\'erreur du serveur:', error.response.data.message);
    throw error;
  }
}

export const updateImagePage = async (fields, pageId) => {
  try {
    const formData = new FormData();
    formData.append('image', fields.data, fields.name);
    formData.append('id_page', pageId);
    formData.append('id_config', fields.id_config);
    formData.append('alt', fields.alt);
    formData.append('name', fields.name);
    formData.append('size', fields.size);

    await Axios.post(`${apiUrl}/updateImagesPage`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    });
  } catch (error) {
    console.error('Message d\'erreur du serveur:', error);
    throw error;
  }
};