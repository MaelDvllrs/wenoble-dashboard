import { useState, useEffect } from 'react';
import { getBlogInfoSlug, getBlogText, getBlogRichText } from './apiActu';
import config from '../../../../config';

export const useUpdateTemplates = (articleSlug) => {
  const [updates, setUpdates] = useState([]);

  useEffect(() => {
    console.log('useEffect triggered!');
  }, []);

  useEffect(() => {
    console.log('useEffect triggered with articleSlug:', articleSlug);
    const fetchBlogs = async () => {
      const tab = [];
      try {
        const blogs = await getBlogInfoSlug(articleSlug, config.idUpdateActu);
        console.log('Blogs fetched:', blogs);
        for (const blog of blogs.blog) {
          try {
            const blogRichText = await getBlogRichText(blog.id_page_blog);

            const date = blog.page_blog_publish_date;
            const contenue = blogRichText.richText?.find(item => config.idContenueUpdate.includes(item.id_config)) || { text: 'Contenue non trouvé' };

            tab.push({
              name: blog.page_blog_name,
              slug: blog.page_blog_slug,
              id: blog.id_page_blog,
              date: date,
              contenue: contenue.text_html
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
  }, [articleSlug]);
  console.log('update:', updates);
  return updates; 
};