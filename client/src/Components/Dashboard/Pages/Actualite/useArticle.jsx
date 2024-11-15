import { useState, useEffect } from 'react';
import { getBlogs, getBlogInfo, getBlogText, getBlogImage, getBlogMultiReference, getBlogAuteur, getBlogRichText } from './apiActu';
import config from '../../../../config';
import { formatDistance, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export const useArticles = (limit) => {
  const [articles, setArticles] = useState([]);

  const formatDistanceWithoutApprox = (date) => {
    return formatDistance(date, new Date(), {
        addSuffix: true,
        locale: {
            ...fr,
            formatDistance: (token, count, options) => {
                const result = fr.formatDistance(token, count, options);
                return result.replace('environ ', '');
            }
        }
    });
};


  useEffect(() => {
    const fetchBlogs = async () => {
      const tab = [];
      try {
        const blogs = await getBlogs(config.idBlogArticle, 'DESC', limit);
        for (const blog of blogs.blog) {
          try {
            const blogText = await getBlogText(blog.id_page_blog);
            const blogImage = await getBlogImage(blog.id_page_blog);
            const blogMultiReference = await getBlogMultiReference(blog.id_page_blog);
            const auteur = await getBlogAuteur(blog.id_blog);

            let blogCategoryName = { blog: [{ page_blog_name: 'Auteur non trouvé' }] };

            if (blogMultiReference.references) {
              blogCategoryName = await getBlogInfo(blogMultiReference.references[0].value);
            }

            const date = formatDistanceWithoutApprox(blog.page_blog_publish_date);
            const resume = blogText.text?.find(item => config.idResumeArticle.includes(item.id_config)) || { text: 'Résumé non trouvé' };
            const image = blogImage.images?.find(item => config.idMainImageArticle.includes(item.id_config)) || { url: 'Image non trouvée' };

            tab.push({
              name: blog.page_blog_name,
              slug: blog.page_blog_slug,
              resume: resume,
              imageUrl: image,
              id: blog.id_page_blog,
              date: date,
              auteurName: auteur.author.username,
              auteurPhoto:  'Photo non trouvée',
              categorie: blogCategoryName.blog[0]?.page_blog_name || 'Categorie non trouvée',
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
  }, []);

  return articles;
};