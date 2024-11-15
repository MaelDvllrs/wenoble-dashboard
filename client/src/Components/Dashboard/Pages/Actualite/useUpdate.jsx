import { useState, useEffect } from 'react';
import { getBlogs, getBlogInfo,  getBlogMultiReference } from './apiActu';
import config from '../../../../config';
import { formatDistance, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export const useUpdates = (limit) => {
  const [updates, setUpdates] = useState([]);

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
        const blogs = await getBlogs(config.idUpdateActu, 'DESC', limit);
        for (const blog of blogs.blog) {
          try {
            const blogMultiReference = await getBlogMultiReference(blog.id_page_blog);


            let blogCategoryName = { blog: [{ page_blog_name: 'Auteur non trouvé' }] };

            if (blogMultiReference.references) {
              blogCategoryName = await getBlogInfo(blogMultiReference.references[0].value);
            }

            const date = formatDistanceWithoutApprox(blog.page_blog_publish_date);

            tab.push({
              name: blog.page_blog_name,
              slug: blog.page_blog_slug,
              id: blog.id_page_blog,
              date: date,
              categorie: blogCategoryName.blog[0]?.page_blog_name || 'Categorie non trouvée'
            });
          } catch (error) {
            console.error(`Erreur lors de la récupération des informations pour id_page_blog ${blog.id_page_blog}:`, error);
          }
        }
      } catch (error) {
        console.error('Erreur:', error);
      }
      setUpdates(tab);
    };

    fetchBlogs();
  }, []);

  return updates;
};