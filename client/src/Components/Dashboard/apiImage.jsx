import Axios from 'axios';
import config from '../../config';
import imageCompression from 'browser-image-compression';









const apiUrl = config.apiUrl; 


// ------------------PROFILE------------------


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


// ------------------PORTFOLIO------------------

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




//----------------------COMPRESSE IMAGE--------------------

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





// ------------------PAGE------------------

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

export const saveTextPage = async (fields) => {
  try {
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


// ------------------BLOG------------------

export const createImageBlog = async (fields, blogPageId) => {
  try {


    // Créer un objet FormData
    const formData = new FormData();





    // Ajouter le blob en tant que fichier
    formData.append('image', fields.data, fields.name);

    // Ajouter les autres champs
    formData.append('id_blog_page', blogPageId);
    formData.append('id_config', fields.id_config);
    formData.append('alt', fields.alt);
    formData.append('name', fields.name);
    formData.append('size', fields.size);

    await Axios.post(`${apiUrl}/createImagesBlog`, formData, {
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

export const createVideoBlog = async (fields, blogPageId) => {
  try {


    // Créer un objet FormData
    const formData = new FormData();

    const src = fields.id_video + ".mp4";

    // Ajouter le blob en tant que fichier
    formData.append('video', fields.data, src);

    // Ajouter les autres champs
    formData.append('id_video', fields.id_video);
    formData.append('id_blog_page', blogPageId);
    formData.append('id_config', fields.id_config);
    formData.append('alt', fields.alt);
    formData.append('name', fields.name);
    formData.append('size', fields.size);

    await Axios.post(`${apiUrl}/createVideoBlog`, formData, {
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


export const createBlogPage = async (id, mainText, date) => {
  try {
    const response = await Axios.post(`${apiUrl}/createBlogPage`, {
      params: {
        id : id,
        mainText: mainText,
        date: date,
      }
    });
    return response.data;
  } catch (error) {
    console.error('Message d\'erreur du serveur:', error);
    // Propager l'erreur
    throw error;
  }
}

export const createTextBlog = async (id, otherText) => {
  try {
    await Axios.post(`${apiUrl}/createTextBlog`, {
      params: {
        id : id,
        otherText: otherText,
      }
    });
  } catch (error) {
    console.error('Message d\'erreur du serveur:', error.response.data.message);
    // Propager l'erreur
    throw error;
  }
}

export const createRichTextBlog = async (id, infoRichText) => {


  try {
    await Axios.post(`${apiUrl}/createRichTextBlog`, {
      params: {
        id : id,
        infoRichText: infoRichText,
      }
    });
  } catch (error) {
    console.error('Message d\'erreur du serveur:', error);
    // Propager l'erreur
    throw error;
  }
}


export const createMultiReferenceBlog = async (id, multiReference) => {
  try {
    await Axios.post(`${apiUrl}/createMultiReferenceBlog`, {
      params: {
        id : id,
        multiReference: multiReference,
      }
    });
  } catch (error) {
    console.error('Message d\'erreur du serveur:', error);
    // Propager l'erreur
    throw error;
  }
}




export const updateBlogPage = async (id, mainText, date) => {
  try {
    const response = await Axios.post(`${apiUrl}/updateBlogPage`, {
      params: {
        id : id,
        mainText: mainText,
        date: date,
      }
    });
    return response.data;
  } catch (error) {
    console.error('Message d\'erreur du serveur:', error);
    // Propager l'erreur
    throw error;
  }
}


export const updateTextBlog = async (id, otherText) => {
  
  try {
    if(otherText[0].create){
      console.log("enregistrer " + otherText);
      await Axios.post(`${apiUrl}/updateTextBlog`, {
        params: {
          id : id,
          otherText: otherText,
        }
      });
    } else {
      await Axios.post(`${apiUrl}/createTextBlog`, {
        params: {
          id : id,
          otherText: otherText,
        }
      });
    }
  } catch (error) {
    console.error('Message d\'erreur du serveur:', error);
    // Propager l'erreur
    throw error;
  }
}

export const updateRichTextBlog = async (id, infoRichText) => {

  try {
    if(infoRichText[0].create){
      await Axios.post(`${apiUrl}/updateRichTextBlog`, {
        params: {
          id : id,
          infoRichText: infoRichText,
        }
      });
    } else {
      await Axios.post(`${apiUrl}/createRichTextBlog`, {
        params: {
          id : id,
          infoRichText: infoRichText,
        }
      });
    }
  } catch (error) {
    console.error('Message d\'erreur du serveur:', error);
    // Propager l'erreur
    throw error;
  }
}


export const updateImageBlog = async (fields, blogPageId) => {
  try {


    // Créer un objet FormData
    const formData = new FormData();



    // Ajouter le blob en tant que fichier
    formData.append('image', fields.data, fields.name);

    // Ajouter les autres champs
    formData.append('id_blog_page', blogPageId);
    formData.append('id_config', fields.id_config);
    formData.append('alt', fields.alt);
    formData.append('name', fields.name);
    formData.append('size', fields.size);

    if(fields.create){
      await Axios.post(`${apiUrl}/updateImagesBlog`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
    } else {

      await Axios.post(`${apiUrl}/createImagesBlog`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
    }
  } catch (error) {
    console.error('Message d\'erreur du serveur:', error);
    // Propager l'erreur
    throw error;
  }
};



export const updateVideoBlog = async (fields, blogPageId) => {
  try {




    // Créer un objet FormData
    const formData = new FormData();

    const src = fields.id_video + ".mp4";

    // Ajouter le blob en tant que fichier
    formData.append('video', fields.data, src);

    // Ajouter les autres champs
    formData.append('id_video', fields.id_video);
    formData.append('id_blog_page', blogPageId);
    formData.append('id_config', fields.id_config);
    formData.append('alt', fields.alt);
    formData.append('name', fields.name);
    formData.append('size', fields.size);

    if(fields.create){
      await Axios.post(`${apiUrl}/updateVideoBlog`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
    } else {
      await Axios.post(`${apiUrl}/createVideoBlog`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
  }
  } catch (error) {
    console.error('Message d\'erreur du serveur:', error);
    // Propager l'erreur
    throw error;
  }
};


export const updateMultiReferenceBlog = async (id, multiReference) => {
  try {
    if(multiReference.create){
      await Axios.post(`${apiUrl}/updateMultiReferenceBlog`, {
        params: {
          id : id,
          multiReference: multiReference,
        }
      });
    } else {
      await Axios.post(`${apiUrl}/createMultiReferenceBlog`, {
        params: {
          id : id,
          multiReference: multiReference,
        }
      });
    }
  } catch (error) {
    console.error('Message d\'erreur du serveur:', error);
    // Propager l'erreur
    throw error;
  }
}



