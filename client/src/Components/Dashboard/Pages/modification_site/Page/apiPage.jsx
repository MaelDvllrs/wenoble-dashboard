import Axios from 'axios';
import config from '../../../../../config';
import Cookies from 'js-cookie';
  
const apiUrl = config.apiUrl; 
const token = Cookies.get('token');
  
export const fetchImagesPage = async (pageId, token) => {
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
  
export const saveImagePage = async (fields, token) => {
  try {
    // Si on ne modifie que l'alt, ne pas envoyer de FormData (même principe que updateImageCollection)
    if (fields.onlyAlt) {
      await Axios.post(`${apiUrl}/updateAltPage`, {
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
      return;
    }
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
    console.error('Message d\'erreur du serveur:', error.response?.data?.message || error.message);
    throw error;
  }
}

export const fetchTextePage = async (pageId, token) => {
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

export const updateTextPage = async (idPage, text, token) => {
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

export const updateRichTextPage = async (idPage, richtext, token) => {
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

export const updateImagePage = async (fields, pageId, token) => {
  try {
    // Si on ne modifie que l'alt, ne pas envoyer de FormData (même principe que updateImageCollection)
    if (fields.onlyAlt) {
      await Axios.post(`${apiUrl}/updateAltPage`, {
        params: {
          id_config: fields.id_config,
          alt: fields.alt,
          pageId: pageId
        }
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return;
    }
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
    console.error('Message d\'erreur du serveur:', error.response?.data?.message || error.message);
    throw error;
  }
};