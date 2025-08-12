import Axios from '../../../../../service/AxiosConfig';
import config from '../../../../../config';
 

const apiUrl = config.apiUrl; 

export const createImageBlog = async (fields, blogPageId, token) => {
    try {
        const formData = new FormData();
        formData.append('image', fields.data, fields.name);
        formData.append('id_blog_page', blogPageId);
        formData.append('id_config', fields.id_config);
        formData.append('alt', fields.alt);
        formData.append('name', fields.name);
        formData.append('size', fields.size);

        await Axios.post(`${apiUrl}/createImagesCollection`, formData, {
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

export const createGalleryBlog = async (fields, blogPageId, token) => {
    try {
        const formData = new FormData();
        fields.gallery.forEach((field, index) => {
            formData.append('gallery', field.data, field.name);
            formData.append(`alt_${index}`, field.alt || '');
        });
        formData.append('id_blog_page', blogPageId);
        formData.append('id_config', fields.id_config);
        formData.append('type', fields.type);

        await Axios.post(`${apiUrl}/createGalleryCollection`, formData, {
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

export const createVideoBlog = async (fields, blogPageId, token) => {
    
    try {
        const formData = new FormData();
        const src = fields.id_video + ".mp4";
        formData.append('video', fields.data, src);
        formData.append('id_video', fields.id_video);
        formData.append('id_blog_page', blogPageId);
        formData.append('id_config', fields.id_config);
        formData.append('alt', fields.alt);
        formData.append('name', fields.name);
        formData.append('size', fields.size);

        await Axios.post(`${apiUrl}/createVideoCollection`, formData, {
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

export const createBlogPage = async (id, mainText, date, status, idUser, token) => {

    try {
        const createBlogResponse = await Axios.post(`${apiUrl}/createCollectionElement`, {
            params: {
                id: id,
                mainText: mainText,
                date: date,
                status: status
            }
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (status === 1) {
            await Axios.post(`${apiUrl}/addRouteBlogSitemap`, {
                params: {
                    idUser: idUser,
                    idBlog: id,
                    slug: mainText[1].value,
                    date: date,
                }
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

        }
        return createBlogResponse.data;
    } catch (error) {
        console.error('Message d\'erreur du serveur:', error);
        throw error;
    }
};

export const createTextBlog = async (id, otherText, token) => {
    try {
        await Axios.post(`${apiUrl}/createTextCollection`, {
            params: {
                id: id,
                otherText: otherText,
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
};

export const createRichTextBlog = async (id, infoRichText, token) => {
    try {
        await Axios.post(`${apiUrl}/createRichTextCollection`, {
            params: {
                id: id,
                infoRichText: infoRichText,
            }
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        console.error('Message d\'erreur du serveur:', error);
        throw error;
    }
};

export const createMultiReferenceBlog = async (id, multiReference, token) => {
    try {
        await Axios.post(`${apiUrl}/createMultiReferenceCollection`, {
            params: {
                id: id,
                multiReference: multiReference,
            }
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        console.error('Message d\'erreur du serveur:', error);
        throw error;
    }
};

export const updateBlogPage = async (idBlogPage, mainText, date, status, setpublishDate, oldStatus, idUser, idBlog, token) => {
    try {
        if (status === 1 && oldStatus === 0) {
            await Axios.post(`${apiUrl}/addRouteBlogSitemap`, {
                params: {
                    idUser: idUser,
                    idBlog: idBlog,
                    slug: mainText[1].value,
                    date: date,
                }
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
        } else if (status === 0 && oldStatus === 1) {
            await Axios.post(`${apiUrl}/deleteRouteCollectionSitemap`, {
                params: {
                    idUser: idUser,
                    idBlog: idBlog,
                    idBlogPage: idBlogPage,
                }
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
        } else if (status === 1 && oldStatus === 1) {
            await Axios.post(`${apiUrl}/updateRouteCollectionSitemap`, {
                params: {
                    idUser: idUser,
                    idBlog: idBlog,
                    idBlogPage: idBlogPage,
                    slug: mainText[1].value,
                    date: date,
                }
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
        }

        const response = await Axios.post(`${apiUrl}/updateCollectionElement`, {
            params: {
                id: idBlogPage,
                mainText: mainText,
                date: date,
                status: status,
                setpublishDate: setpublishDate
            }
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        return response.data;
    } catch (error) {
        console.error('Message d\'erreur du serveur:', error);
        throw error;
    }
};






export const updateTextBlog = async (id, otherText, token) => {
    try {
        if (otherText[0].create) {
            await Axios.post(`${apiUrl}/updateTextCollection`, {
                params: {
                    id: id,
                    otherText: otherText,
                }
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
        } else {
            await Axios.post(`${apiUrl}/createTextCollection`, {
                params: {
                    id: id,
                    otherText: otherText,
                }
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
        }
    } catch (error) {
        console.error('Message d\'erreur du serveur:', error);
        throw error;
    }
};

export const updateRichTextBlog = async (id, infoRichText, token) => {
    try {
        if (infoRichText[0].create) {
            await Axios.post(`${apiUrl}/updateRichTextCollection`, {
                params: {
                    id: id,
                    infoRichText: infoRichText,
                }
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
        } else {
            await Axios.post(`${apiUrl}/createRichTextCollection`, {
                params: {
                    id: id,
                    infoRichText: infoRichText,
                }
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
        }
    } catch (error) {
        console.error('Message d\'erreur du serveur:', error);
        throw error;
    }
};

export const updateImageBlog = async (fields, blogPageId, token) => {
    try {
        // Si on ne modifie que l'alt, ne pas envoyer de FormData
        if (fields.onlyAlt) {
            await Axios.post(`${apiUrl}/updateImageAltCollection`, {
                params: {
                    id_config: fields.id_config,
                    alt: fields.alt,
                    id_blog_page: fields.id_blog_page,
                }
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return;
        }
        // Sinon, on modifie toute l'image (FormData)
        const formData = new FormData();
        formData.append('image', fields.data, fields.name);
        formData.append('id_blog_page', blogPageId);
        formData.append('id_config', fields.id_config);
        formData.append('alt', fields.alt);
        formData.append('name', fields.name);
        formData.append('size', fields.size);

        console.log('fields', fields);

        if (fields.create) {
            await Axios.post(`${apiUrl}/updateImageCollection`, formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
        } else {
            await Axios.post(`${apiUrl}/createImagesCollection`, formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
        }
    } catch (error) {
        console.error('Message d\'erreur du serveur:', error);
        throw error;
    }
};

export const updateVideoBlog = async (fields, blogPageId, token) => {
    try {
        const formData = new FormData();
        const src = fields.id_video + ".mp4";
        formData.append('video', fields.data, src);
        formData.append('id_video', fields.id_video);
        formData.append('id_blog_page', blogPageId);
        formData.append('id_config', fields.id_config);
        formData.append('alt', fields.alt);
        formData.append('name', fields.name);
        formData.append('size', fields.size);



        if (fields.create) {
            await Axios.post(`${apiUrl}/updateVideoCollection`, formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
        } else {
            await Axios.post(`${apiUrl}/createVideoCollection`, formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
        }
    } catch (error) {
        console.error('Message d\'erreur du serveur:', error);
        throw error;
    }
};

export const updateMultiReferenceBlog = async (id, multiReference, token) => {
    try {
        if (multiReference.create) {
            await Axios.post(`${apiUrl}/updateMultiReferenceCollection`, {
                params: {
                    id: id,
                    multiReference: multiReference,
                }
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
        } else {
            await Axios.post(`${apiUrl}/createMultiReferenceCollection`, {
                params: {
                    id: id,
                    multiReference: multiReference,
                }
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
        }
    } catch (error) {
        console.error('Message d\'erreur du serveur:', error);
        throw error;
    }
};

export const updateGalleryBlog = async (id, gallery, token) => {
    try {
        let galleryCreate = false;

        if (gallery.create) {
            galleryCreate = true;
        }

        const formData = new FormData();
        formData.append('gallery_length', gallery.gallery.length); // Ajout de la longueur totale
        let fileCount = 0;
        gallery.gallery.forEach((field, index) => {
          if (field.data) {
            // Nouvelle image à uploader
            formData.append('gallery', field.data, field.name);
            formData.append(`alt_${index}`, field.alt || '');
            formData.append(`name_${index}`, field.name || '');
            formData.append(`size_${index}`, field.size || '');
            fileCount++;
          } else {
            // Image déjà présente sur le serveur, on transmet ses infos pour la garder
            formData.append(`existing_${index}`, JSON.stringify({
              src_photo: field.src || field.src_photo,
              alt: field.alt,
              name: field.name,
              size: field.size
            }));
          }
        });
        formData.append('id_blog_page', id);
        formData.append('id_config', gallery.id_config);
        formData.append('type', gallery.type);

        if (galleryCreate) {
            await Axios.post(`${apiUrl}/updateGalleryCollection`, formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
        } else {
            await Axios.post(`${apiUrl}/createGalleryCollection`, formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
        }
    } catch (error) {
        console.error('Message d\'erreur du serveur:', error);
        throw error;
    }
};


export const generateStaticSite = async (token, websiteId) => {
    try {
        const response = await Axios.post(`${apiUrl}/generateSite`, { websiteId }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    } catch (error) {
        return {
            success: false,
            error: "Static site generation failed but continuing execution",
            details: error.message
        };
    }
};