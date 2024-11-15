import { useState, useEffect } from 'react';
import { getBlogInfoSlug, getBlogInfo, getBlogText, getBlogImage, getBlogMultiReference, getBlogAuteur, getBlogRichText } from './apiActu';
import config from '../../../../config';

export const useArticlesTemplates = (articleSlug) => {
  const [articles, setArticles] = useState([]);

  useEffect(() => {
    console.log('useEffect triggered!');
  }, []);


  useEffect(() => {
    console.log('useEffect triggered with articleSlug:', articleSlug);
    const fetchBlogs = async () => {
      const tab = [];
      try {
        const blogs = await getBlogInfoSlug(articleSlug, config.idBlogArticle);
        console.log('Blogs fetched:', blogs);
        for (const blog of blogs.blog) {
          try {
            const blogText = await getBlogText(blog.id_page_blog);
            const blogImage = await getBlogImage(blog.id_page_blog);
            const blogMultiReference = await getBlogMultiReference(blog.id_page_blog);
            const auteur = await getBlogAuteur(blog.id_blog);
            const blogRichText = await getBlogRichText(blog.id_page_blog);

            let blogCategoryName = { blog: [{ page_blog_name: 'Auteur non trouvé' }] };

            if (blogMultiReference.references) {
              blogCategoryName = await getBlogInfo(blogMultiReference.references[0].value);
            }

            const date = blog.page_blog_publish_date;
            const resume = blogText.text?.find(item => config.idResumeArticle.includes(item.id_config)) || { text: 'Résumé non trouvé' };
            const image = blogImage.images?.find(item => config.idMainImageArticle.includes(item.id_config)) || { url: 'Image non trouvée' };
            const contenue = blogRichText.richText?.find(item => config.idContenueArticle.includes(item.id_config)) || { text: 'Contenue non trouvé' };

            tab.push({
              name: blog.page_blog_name,
              slug: blog.page_blog_slug,
              resume: resume,
              imageUrl: image,
              id: blog.id_page_blog,
              date: date,
              auteurName: auteur.author.username,
              auteurPhoto: 'Photo non trouvée',
              categorie: blogCategoryName.blog[0]?.page_blog_name || 'Categorie non trouvée',
              contenue: contenue.text_html
            });
          } catch (error) {
            console.error(`Erreur lors de la récupération des informations pour id_page_blog ${blog.id_page_blog}:`, error);
          }
        }
      } catch (error) {
        console.error('Erreur:', error);
      }
      setArticles(tab);
    };

    fetchBlogs();
  }, [articleSlug]);

  return articles; 
};