import Axios from 'axios';

/**
 * Supprime une page de blog (et ses routes sitemap) puis régénère le site si besoin.
 * @param {Object} params - Les paramètres nécessaires
 * @param {string} params.apiUrl - URL de l'API
 * @param {string} params.token - Token d'authentification
 * @param {string} params.idUser - ID utilisateur
 * @param {string} params.idBlog - ID du blog (collection)
 * @param {string} params.slug - Slug de la page
 * @param {string} params.idBlogPage - ID de la page à supprimer
 * @param {boolean} params.isPublished - Statut publié ou non
 * @param {function} [params.onStatus] - Callback pour indiquer l'état (optionnel)
 * @param {function} [params.generateStaticSite] - Fonction pour régénérer le site (optionnel)
 * @param {function} [params.navigate] - Fonction de navigation (optionnel)
 * @param {boolean} [params.skipRegenerate] - Ne pas régénérer le site (pour suppression multiple)
 */
export async function deleteBlogPage({
  apiUrl,
  token,
  idUser,
  idBlog,
  slug,
  idBlogPage,
  isPublished,
  onStatus = () => {},
  generateStaticSite,
  navigate,
  skipRegenerate = false
}) {
  try {
    onStatus('deleting');
    // Supprimer les routes du sitemap
    await Axios.post(`${apiUrl}/deleteRouteBlogSitemap`, {
      params: {
        idUser,
        idBlog,
        slug,
        idBlogPage
      }
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    // Supprimer la page
    await Axios.delete(`${apiUrl}/deleteCollectionElement`, {
      params: {
        IdBlogPage: idBlogPage,
        Id: idBlog
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!isPublished) {
      onStatus('deleted');
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      if (!skipRegenerate) {
        onStatus('regenerating');
        if (generateStaticSite) {
          await generateStaticSite(token, params?.websiteId);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        onStatus('deleted');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    onStatus('completed');
    if (navigate) {
      setTimeout(() => navigate(`/dashboard/modification/collection/${idBlog}`), 1500);
    }
  } catch (error) {
    onStatus('error', error);
    throw error;
  }
}
