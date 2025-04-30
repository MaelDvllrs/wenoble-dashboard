import { useState, useEffect } from "react";
import axios from "axios";
import config from "../../../../config";

export const useAcademyTemplate = (slug) => {
  const [academyData, setAcademyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const apiUrl = config.apiUrl;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: blogInfo } = await axios.get(`${apiUrl}/api/sendBlogInfoSlug`, {
          headers: {
            'api_key': config.apiAcademyClient,
            'slug': slug,
            'id_blog': config.apiAcademyIdBlog,
          }
        });

        const blogIdPage = blogInfo.blog?.[0]?.id_page_blog;
        const blogId = blogInfo.blog?.[0]?.id_blog;

        if (!blogIdPage || !blogId) {
          throw new Error("ID blog non trouvé");
        }

        const { data: blogContent } = await axios.get(`${apiUrl}/api/sendBlogContent`, {
          headers: {
            'api_key': config.apiAcademyClient,
            'id_blog': config.apiAcademyIdBlog,
            'id_blog_page': blogIdPage,
          }
        });

        setAcademyData({
          info: blogInfo.blog[0],
          content: blogContent.content
        });
        setLoading(false);
      } catch (err) {
        console.error("Erreur AcademyTemplate :", err);
        setError(err);
        setLoading(false);
      }
    };

    fetchData();
  }, [slug]);

  return { academyData, loading, error };
};
