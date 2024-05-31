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
    console.log(fields);

    // Créer un objet FormData
    const formData = new FormData();

    // Ajouter le blob en tant que fichier
    formData.append('image', fields.data, fields.id_photo);


    // Ajouter les autres champs
    formData.append('id_photo', fields.id_photo);
    formData.append('id_portfolio', fields.id_portfolio);
    formData.append('alt', fields.alt);
    formData.append('name', fields.name);

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
    console.log('Enregistrement des images...');

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
      console.log(fields);

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

export const saveTextPage = async (fields) => {
  console.log(fields);
  try {
    console.log('Enregistrement des textes...');
    await Axios.post(`${apiUrl}/saveTextPage`, {
      params: {
        fields : fields,
      }
    });
  } catch (error) {
    console.error('Message d\'erreur du serveur:', error.response.data.message);
    // Propager l'erreur
    throw error;
  }
}


