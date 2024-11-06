import Axios from 'axios';
import config from '../../../../../config';

const apiUrl = config.apiUrl; 


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
  
  
  export const createBlogPage = async (id, mainText, date, status, idUser) => {
    try {
      const response = await Axios.post(`${apiUrl}/createBlogPage`, {
        params: {
          id : id,
          mainText: mainText,
          date: date,
          status: status
        }
      });
      if(status === 1){
        const responseSitemap = await Axios.post(`${apiUrl}/addRouteBlogSitemap`, {
          params: {
            idUser: idUser,
            idBlog: id,
            slug: mainText[1].value,
            date: date,
          }
        });
      }
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
  
  
  
  
  export const updateBlogPage = async (idBlogPage, mainText, date, status, setpublishDate, oldStatus, idUser, idBlog) => {
    try {

      if(status === 1 && oldStatus === 0){
        const responseSitemap = await Axios.post(`${apiUrl}/addRouteBlogSitemap`, {
          params: {
            idUser: idUser,
            idBlog: idBlog,
            slug: mainText[1].value,
            date: date,
          }
        });
      } else if(status === 0 && oldStatus === 1){
        const responseSitemap = await Axios.post(`${apiUrl}/deleteRouteBlogSitemap`, {
          params: {
            idUser: idUser,
            idBlog: idBlog,
            idBlogPage: idBlogPage,
          }
        });
      } else if(status === 1 && oldStatus === 1){
        const responseSitemap = await Axios.post(`${apiUrl}/updateRouteBlogSitemap`, {
          params: {
            idUser: idUser,
            idBlog: idBlog,
            idBlogPage: idBlogPage,
            slug: mainText[1].value,
            date: date,
          }
        });
      }
      
      const response = await Axios.post(`${apiUrl}/updateBlogPage`, {
        params: {
          id : idBlogPage,
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
        
      if(gallery.create){
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