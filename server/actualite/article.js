const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { formatDistance } = require('date-fns');
const { fr } = require('date-fns/locale');
require('dotenv').config();

const router = express.Router();

router.use(cors());
router.use(express.json());

require('dotenv').config();

const apiUrl = process.env.SERVER_URL;
const apiKey = process.env.API_ARTICLE

const fetchData = async (url, params) => {
    try {
        const response = await axios.get(url, {
            headers: { 'api_key': apiKey, ...params },
            referrerPolicy: "unsafe-url"
        });
        return response.data;
    } catch (error) {
        //console.error(`Erreur lors de l'appel à l'API ${url}:`, error);
        throw error;
    }
};

router.get('/getArticle', async (req, res) => {
    const limit = req.query.limit; 
    const tab = [];
    try {
        let url = `${apiUrl}/api/sendBlog?order=DESC`;
        if (limit) {
            url += `&limit=${limit}`;
        }
        const blogsResponse = await fetchData(url, {ids: process.env.idBlogArticle });
        const blogs = blogsResponse.blog;

        for (const blog of blogs) {
            try {
                const blogText = await fetchData(`${apiUrl}/api/sendBlogText`, { id_data: blog.id });
                const blogImage = await fetchData(`${apiUrl}/api/sendBlogInfoImage`, { id_data: blog.id });
                const blogMultiReference = await fetchData(`${apiUrl}/api/sendMultiReference`, { id_data: blog.id });
                const auteur = await fetchData(`${apiUrl}/api/sendBlogAuteur`, { id_data: blog.collection_id });

                let blogCategoryName = { blog: [{ page_blog_name: 'Auteur non trouvé' }] };

                if (blogMultiReference.references) {
                    blogCategoryName = await fetchData(`${apiUrl}/api/sendBlogInfo`, { id_data: blogMultiReference.references[0].value });
                }

                const date = blog.collection_element_publish_date;
                const resume = blogText.text?.find(item => process.env.idResumeArticle.includes(item.id_config)) || { text: 'Résumé non trouvé' };
                const image = blogImage.images?.find(item => process.env.idMainImageArticle.includes(item.id_config)) || { url: 'Image non trouvée' };

                tab.push({
                    name: blog.collection_element_name,
                    slug: blog.collection_element_slug,
                    resume: resume,
                    imageUrl: image,
                    id: blog.id,
                    date: date,
                    auteurName: auteur.author.username,
                    auteurPhoto: auteur.author.src_profile_image,
                    categorie: blogCategoryName.blog[0]?.collection_element_name || 'Categorie non trouvée',
                });
            } catch (error) {
                console.error(`Erreur lors de la récupération des informations pour id_page_blog ${blog.id_page_blog}:`, error);
            }
        }
        res.status(200).json(tab);
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des articles' });
    }
});

router.get('/getUpdate', async (req, res) => {
    const limit = req.query.limit; 
    const tab = [];
    try {
        let url = `${apiUrl}/api/sendBlog?order=DESC`;
        if (limit) {
            url += `&limit=${limit}`;
        }
        const blogsResponse = await fetchData(url, { ids: process.env.idUpdateActu });
        const blogs = blogsResponse.blog;

        for (const blog of blogs) {
            try {
                const blogMultiReference = await fetchData(`${apiUrl}/api/sendMultiReference`, { id_data: blog.id });

                let blogCategoryName = { blog: [{ page_blog_name: 'Categorie non trouvé' }] };

                if (blogMultiReference.references) {
                    blogCategoryName = await fetchData(`${apiUrl}/api/sendBlogInfo`, { id_data: blogMultiReference.references[0].value });
                }

                const date = blog.collection_element_publish_date;

                tab.push({
                    name: blog.collection_element_name,
                    slug: blog.collection_element_slug,
                    id: blog.id,
                    date: date,
                    categorie: blogCategoryName.blog[0]?.collection_element_name || 'Categorie non trouvée'
                });
            } catch (error) {
                console.error(`Erreur lors de la récupération des informations pour id_page_blog ${blog.id_page_blog}:`, error);
            }
        }
        res.status(200).json(tab);
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des mises à jour' });
    }
});

router.get('/getArticleTemplate', async (req, res) => {
    const articleSlug = req.query.slug;
    const tab = [];
    try {
        const blogsResponse = await fetchData(`${apiUrl}/api/sendBlogInfoSlug`, { slug: articleSlug, id_blog: process.env.idBlogArticle });
        const blogs = blogsResponse.blog;

        for (const blog of blogs) {
            try {
                const blogText = await fetchData(`${apiUrl}/api/sendBlogText`, { id_data: blog.id });
                const blogImage = await fetchData(`${apiUrl}/api/sendBlogInfoImage`, { id_data: blog.id });
                const blogMultiReference = await fetchData(`${apiUrl}/api/sendMultiReference`, { id_data: blog.id });
                const auteur = await fetchData(`${apiUrl}/api/sendBlogAuteur`, { id_data: blog.collection_id });
                const blogRichText = await fetchData(`${apiUrl}/api/sendBlogRichText`, { id_data: blog.id });

                let blogCategoryName = { blog: [{ page_blog_name: 'Auteur non trouvé' }] };

                if (blogMultiReference.references) {
                    blogCategoryName = await fetchData(`${apiUrl}/api/sendBlogInfo`, { id_data: blogMultiReference.references[0].value });
                }

                const date = blog.collection_element_publish_date;
                const resume = blogText.text?.find(item => process.env.idResumeArticle.includes(item.id_config)) || { text: 'Résumé non trouvé' };
                const image = blogImage.images?.find(item => process.env.idMainImageArticle.includes(item.id_config)) || { url: 'Image non trouvée' };
                const contenue = blogRichText.richText?.find(item => process.env.idContenueArticle.includes(item.id_config)) || { text: 'Contenue non trouvé' };

                tab.push({
                    name: blog.collection_element_name,
                    slug: blog.collection_element_slug,
                    resume: resume,
                    imageUrl: image,
                    id: blog.id,
                    date: date,
                    auteurName: auteur.author.username,
                    auteurPhoto: auteur.author.src_profile_image,
                    categorie: blogCategoryName.blog[0]?.collection_element_name || 'Categorie non trouvée',
                    contenue: contenue.text_html
                });
            } catch (error) {
                //console.error(`Erreur lors de la récupération des informations pour id_page_blog ${blog.id_page_blog}:`, error);
            }
        }
        res.status(200).json(tab);
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des articles' });
    }
});

router.get('/getUpdateTemplate', async (req, res) => {
    const articleSlug = req.query.slug;
    const tab = [];
    try {
        const blogsResponse = await fetchData(`${apiUrl}/api/sendBlogInfoSlug`, { slug: articleSlug, id_blog: process.env.idUpdateActu });
        const blogs = blogsResponse.blog;

        for (const blog of blogs) {
            try {
                const blogRichText = await fetchData(`${apiUrl}/api/sendBlogRichText`, { id_data: blog.id });

                const date = blog.collection_element_publish_date;
                const contenue = blogRichText.richText?.find(item => process.env.idContenueUpdate.includes(item.id_config)) || { text: 'Contenue non trouvé' };

                tab.push({
                    name: blog.collection_element_name,
                    slug: blog.collection_element_slug,
                    id: blog.id_page_blog,
                    date: date,
                    contenue: contenue.text_html
                });
            } catch (error) {
                //console.error(`Erreur lors de la récupération des informations pour id_page_blog ${blog.id_page_blog}:`, error);
            }
        }
        res.status(200).json(tab);
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des mises à jour' });
    }
});

module.exports = router;