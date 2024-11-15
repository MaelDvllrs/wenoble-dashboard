import axios from 'axios';
import config from '../../../../config';

const apiUrl = config.apiUrl;
const apiKey = 'APICLIENT';

async function fetchBlogData(url, headers) {
  try {
    const response = await axios.get(url, {
      headers: headers,
      referrerPolicy: "unsafe-url"
    });
    return response.data;
  } catch (error) {
    throw new Error(`Erreur lors de la récupération des données: ${error.response ? error.response.statusText : error.message}`);
  }
}

export async function getBlogs(blogId, order = 'DESC',limit = null, colone, joinTable, configs, ) {
    const headers = {
      'api_key': apiKey,
      'ids': blogId
    };
    
    let url = `${apiUrl}/api/sendBlog?order=${order}`;
    if (limit !== null) {
      url += `&limit=${limit}`;
    }
  
    return await fetchBlogData(url, headers);
}

export async function getBlogInfo(blogId) {
  const headers = {
    'api_key': apiKey,
    'id_data': blogId
  };
  const url = `${apiUrl}/api/sendBlogInfo`;
  return await fetchBlogData(url, headers);
}


export async function getBlogInfoSlug(slug, id) {
  console.log(slug, id);
  const headers = {
    'api_key': apiKey,
    'slug': slug,
    'id_blog': id
  };
  const url = `${apiUrl}/api/sendBlogInfoSlug`;
  return await fetchBlogData(url, headers);
}


export async function getBlogText(blogId) {
  const headers = {
    'api_key': apiKey,
    'id_data': blogId
  };
  const url = `${apiUrl}/api/sendBlogText`;
  return await fetchBlogData(url, headers);
}

export async function getBlogImage(blogId) {
  const headers = {
    'api_key': apiKey,
    'id_data': blogId
  };
  const url = `${apiUrl}/api/sendBlogInfoImage`;
  return await fetchBlogData(url, headers);
}

export async function getBlogMultiReference(blogId) {
  const headers = {
    'api_key': apiKey,
    'id_data': blogId
  };
  const url = `${apiUrl}/api/sendMultiReference`;
  return await fetchBlogData(url, headers);
}

export async function getBlogRichText(blogId) {
  const headers = {
    'api_key': apiKey,
    'id_data': blogId
  };
  const url = `${apiUrl}/api/sendBlogRichText`;
  return await fetchBlogData(url, headers);
} 


export async function getBlogAuteur(blogId) {
    const headers = {
        'api_key': apiKey,
        'id_data': blogId
    };
    const url = `${apiUrl}/api/sendBlogAuteur`;
    return await fetchBlogData(url, headers);
}