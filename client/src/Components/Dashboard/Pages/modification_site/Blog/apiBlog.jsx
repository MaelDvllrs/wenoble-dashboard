import Axios from 'axios';
import config from '../../../../../config';
import Cookies from 'js-cookie';

const apiUrl = config.apiUrl; 
const token = Cookies.get('token');

export const createImageBlog = async (fields, blogPageId) => {
    try {
        const formData = new FormData();
        formData.append('image', fields.data, fields.name);
        formData.append('id_blog_page', blogPageId);
        formData.append('id_config', fields.id_config);
        formData.append('alt', fields.alt);
        formData.append('name', fields.name);
        formData.append('size', fields.size);

        await Axios.post(`${apiUrl}/createImagesBlog`, formData, {
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

export const createGalleryBlog = async (fields, blogPageId) => {
    try {
        const formData = new FormData();
        fields.gallery.forEach((field, index) => {
            formData.append('gallery', field.data, field.name);
            formData.append(`alt_${index}`, field.alt || '');
        });
        formData.append('id_blog_page', blogPageId);
        formData.append('id_config', fields.id_config);
        formData.append('type', fields.type);

        await Axios.post(`${apiUrl}/createGalleryBlog`, formData, {
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

export const createVideoBlog = async (fields, blogPageId) => {
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

        await Axios.post(`${apiUrl}/createVideoBlog`, formData, {
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

export const createBlogPage = async (id, mainText, date, status, idUser) => {
    try {
        const response = await Axios.post(`${apiUrl}/createBlogPage`, {
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
        return response.data;
    } catch (error) {
        console.error('Message d\'erreur du serveur:', error);
        throw error;
    }
};

export const createTextBlog = async (id, otherText) => {
    try {
        await Axios.post(`${apiUrl}/createTextBlog`, {
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

export const createRichTextBlog = async (id, infoRichText) => {
    try {
        await Axios.post(`${apiUrl}/createRichTextBlog`, {
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

export const createMultiReferenceBlog = async (id, multiReference) => {
    try {
        await Axios.post(`${apiUrl}/createMultiReferenceBlog`, {
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

export const updateBlogPage = async (idBlogPage, mainText, date, status, setpublishDate, oldStatus, idUser, idBlog) => {
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
            await Axios.post(`${apiUrl}/deleteRouteBlogSitemap`, {
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
            await Axios.post(`${apiUrl}/updateRouteBlogSitemap`, {
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

        const response = await Axios.post(`${apiUrl}/updateBlogPage`, {
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

export const updateTextBlog = async (id, otherText) => {
    try {
        if (otherText[0].create) {
            console.log("enregistrer " + otherText);
            await Axios.post(`${apiUrl}/updateTextBlog`, {
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
            await Axios.post(`${apiUrl}/createTextBlog`, {
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

export const updateRichTextBlog = async (id, infoRichText) => {
    try {
        if (infoRichText[0].create) {
            await Axios.post(`${apiUrl}/updateRichTextBlog`, {
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
            await Axios.post(`${apiUrl}/createRichTextBlog`, {
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

export const updateImageBlog = async (fields, blogPageId) => {
    try {
        const formData = new FormData();
        formData.append('image', fields.data, fields.name);
        formData.append('id_blog_page', blogPageId);
        formData.append('id_config', fields.id_config);
        formData.append('alt', fields.alt);
        formData.append('name', fields.name);
        formData.append('size', fields.size);

        if (fields.create) {
            await Axios.post(`${apiUrl}/updateImagesBlog`, formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
        } else {
            await Axios.post(`${apiUrl}/createImagesBlog`, formData, {
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

export const updateVideoBlog = async (fields, blogPageId) => {
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
            await Axios.post(`${apiUrl}/updateVideoBlog`, formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
        } else {
            await Axios.post(`${apiUrl}/createVideoBlog`, formData, {
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

export const updateMultiReferenceBlog = async (id, multiReference) => {
    try {
        if (multiReference.create) {
            await Axios.post(`${apiUrl}/updateMultiReferenceBlog`, {
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
            await Axios.post(`${apiUrl}/createMultiReferenceBlog`, {
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

export const updateGalleryBlog = async (id, gallery) => {
    try {
        const formData = new FormData();
        let galleryCreate = false;

        if (gallery.create) {
            galleryCreate = true;
        }

        gallery.gallery.forEach((field, index) => {
            if (field.create) {
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

        formData.append('id_blog_page', id);
        formData.append('id_config', gallery.id_config);
        formData.append('type', gallery.type);

        if (galleryCreate) {
            await Axios.post(`${apiUrl}/updateGalleryBlog`, formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
        } else {
            await Axios.post(`${apiUrl}/createGalleryBlog`, formData, {
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