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




export const createGalleryBlog = async (fields, blogPageId) => {
  try {
    const formData = new FormData();

    

    // Ajouter chaque image au formulaire de données sous le même nom de champ
    fields.gallery.forEach((field, index) => {
      formData.append('gallery', field.data, field.name);
      formData.append(`alt_${index}`, field.alt || '');
    });

    // Ajouter les autres champs nécessaires
    formData.append('id_blog_page', blogPageId);
    formData.append('id_config', fields.id_config);
    formData.append('type', fields.type);

    // Envoyer le formulaire de données à l'API
    await Axios.post(`${apiUrl}/createGalleryBlog`, formData, {
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


export const createBlogPage = async (id, mainText, date, status) => {
  try {
    const response = await Axios.post(`${apiUrl}/createBlogPage`, {
      params: {
        id : id,
        mainText: mainText,
        date: date,
        status: status
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




export const updateBlogPage = async (id, mainText, date, status, setpublishDate) => {
  try {
    const response = await Axios.post(`${apiUrl}/updateBlogPage`, {
      params: {
        id : id,
        mainText: mainText,
        date: date,
        status: status,
        setpublishDate: setpublishDate
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


export const updateGalleryBlog = async (id, gallery) => {
  try {
    const formData = new FormData();
    let galleryCreate = false;

    if(gallery.gallery.length === 0){
      galleryCreate = true;
    }

    // Ajouter chaque image au formulaire de données sous le même nom de champ
    gallery.gallery.forEach((field, index) => {

      if(field.create){
        galleryCreate = true;
        formData.append(`alt_${index}`, field.alt || '');
        formData.append(`name_${index}`, field.name || '');
        formData.append(`src_${index}`, field.src || '');
        formData.append(`size_${index}`, field.size || '');

      } else {
        console.log(field);
        console.log(index);
        formData.append('gallery', field.data, field.name);
        formData.append(`alt_${index}`, field.alt || '');
      }
    });



    // Ajouter les autres champs nécessaires
    formData.append('id_blog_page', id);
    formData.append('id_config', gallery.id_config);
    formData.append('type', gallery.type);

    if(galleryCreate){
      await Axios.post(`${apiUrl}/updateGalleryBlog`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

    } else {
      await Axios.post(`${apiUrl}/createGalleryBlog`, formData, {
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
}



