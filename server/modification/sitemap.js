const express = require('express')
const path = require('path');
const fs = require('fs');
const cors = require('cors')
const xml2js = require('xml2js');
const dayjs = require('dayjs'); 
const utc = require('dayjs/plugin/utc'); 
const customParseFormat = require('dayjs/plugin/customParseFormat');
const { supabaseServer } = require('../supabase');
const { authenticateToken } = require('../middleware/authToken');
dayjs.extend(utc);
dayjs.extend(customParseFormat);



const router = express.Router();

router.use(cors())
router.use(express.json());

require('dotenv').config();
const secretKey = process.env.SECRET_KEY; 



// Fonction pour lire et parser le fichier sitemap
const readSitemap = (sitemapPath) => {
  return new Promise((resolve) => {
    if (!sitemapPath) return resolve(null); // Si le chemin est null, retourner null
    fs.readFile(sitemapPath, (err, data) => {
      if (err) return resolve(null); // Si erreur, retourner null
      xml2js.parseString(data, (err, result) => {
        if (err) return resolve(null); // Si erreur, retourner null
        resolve(result);
      });
    });
  });
};
  
  // Fonction pour écrire dans le fichier sitemap
const writeSitemap = (sitemap, sitemapPath) => {
  return new Promise((resolve) => {
    if (!sitemap || !sitemapPath) return resolve(); // Si sitemap ou chemin est null, ne rien faire
    const builder = new xml2js.Builder();
    const xml = builder.buildObject(sitemap);
    fs.writeFile(sitemapPath, xml, (err) => {
      if (err) {
        console.log(err);
        return resolve(); // Continuer même en cas d'erreur
      }
      resolve();
    });
  });
};


const findSitemapPath = async (folder) => {
  // Premier chemin à essayer
  const primaryPath = path.join(__dirname, `../../../client/${folder}/sitemap.xml`);
  
  // Vérification si le fichier existe au chemin principal
  try {
    await fs.promises.access(primaryPath, fs.constants.F_OK);
    return primaryPath;
  } catch (error) {
    // Si le fichier n'existe pas, essayer le chemin alternatif
    const alternativePath = path.join(__dirname, `../../../client-generation/${folder}/static/sitemap.xml`);
    try {
      await fs.promises.access(alternativePath, fs.constants.F_OK);
      return alternativePath;
    } catch (altError) {
      // Si aucun fichier n'existe, retourner un message sans erreur
      console.log('Sitemap non trouvé');
      return null;
    }
  }
};
  
// Route pour ajouter un nouvel article de blog
router.post('/addRouteBlogSitemap',authenticateToken, async (req, res) => {
  const idUser = req.user.idUser;
  const idCollection = req.body.params.idBlog; // idBlog = idCollection
  const slug = req.body.params.slug;
  const date = dayjs().utc().format('YYYY-MM-DDTHH:mm:ss+00:00');
  try {
    // Utiliser le token du header Authorization (format Bearer TOKEN)
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    const supabase = supabaseServer(token);
    // Récupérer le dossier de l'utilisateur
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('folder_project')
      .eq('id', idUser)
      .maybeSingle();
    if (userError) throw userError;
    if (!userData || !userData.folder_project) {
      return res.status(200).json({ message: 'Aucun dossier trouvé pour cet utilisateur' });
    }
    const folder = userData.folder_project;
    // Récupérer le slug de la collection (ancien blog)
    const { data: collectionData, error: collectionError } = await supabase
      .from('collection')
      .select('collection_slug')
      .eq('id', idCollection)
      .maybeSingle();
    if (collectionError) throw collectionError;
    const slug_collection = collectionData?.slug_collection || '';
    const url = `${slug_collection}${slug}`;
    const sitemapPath = await findSitemapPath(folder);
    const sitemap = await readSitemap(sitemapPath);
    if (!sitemap) {
      // Ne pas retourner d'erreur si le sitemap n'existe pas
      return res.status(200).json({ message: 'Sitemap non trouvé, aucune modification effectuée' });
    }
    const newEntry = {
      loc: url,
      lastmod: date,
      changefreq: 'weekly',
      priority: '0.6'
    };
    sitemap.urlset.url.push(newEntry);
    await writeSitemap(sitemap, sitemapPath);
    res.status(200).json({ message: 'Article ajouté au sitemap avec succès' });
  } catch (error) {
    console.log('Erreur lors de l\'ajout de l\'article au sitemap:', error);
    res.status(500).json({ error });
  }
});

// Route pour supprimer un article de blog
router.post('/deleteRouteBlogSitemap',authenticateToken, async (req, res) => {
  const idUser = req.user.idUser;
  const idCollection = req.body.params.idBlog;
  const idCollectionElement = req.body.params.idBlogPage;
  try {
    // Utiliser le token du header Authorization (format Bearer TOKEN)
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    const supabase = supabaseServer(token);
    // Récupérer le dossier de l'utilisateur
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('folder_project')
      .eq('id', idUser)
      .maybeSingle();
    if (userError) throw userError;
    if (!userData || !userData.folder_project) {
      return res.status(200).json({ message: 'Aucun dossier trouvé pour cet utilisateur' });
    }
    const folder = userData.folder_project;
    // Récupérer le slug de la page de collection
    const { data: pageData, error: pageError } = await supabase
      .from('collection_element')
      .select('collection_element_slug')
      .eq('id', idCollectionElement)
      .eq('collection_id', idCollection)
      .maybeSingle();
    if (pageError) throw pageError;
    const slug = pageData?.collection_element_slug || '';
    // Récupérer le slug de la collection
    const { data: collectionData, error: collectionError } = await supabase
      .from('collection')
      .select('collection_slug')
      .eq('id', idCollection)
      .maybeSingle();
    if (collectionError) throw collectionError;
    const slug_collection = collectionData?.slug_collection || '';
    const url = `${slug_collection}${slug}`;
    const sitemapPath = await findSitemapPath(folder);
    const sitemap = await readSitemap(sitemapPath);
    if (!sitemap) {
      return res.status(200).json({ message: 'Sitemap non trouvé' });
    }
    sitemap.urlset.url = sitemap.urlset.url.filter(entry => !entry.loc[0].includes(url));
    await writeSitemap(sitemap, sitemapPath);
    res.status(200).json({ message: 'Article supprimé du sitemap avec succès' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error });
  }
});

// Route pour modifier un article de blog
router.post('/updateRouteBlogSitemap',authenticateToken, async (req, res) => {
  const idUser = req.user.idUser;
  const {idBlog, idBlogPage, slug, date } = req.body.params;
  try {
    // Utiliser le token du header Authorization (format Bearer TOKEN)
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    const supabase = supabaseServer(token);
    // Récupérer le dossier de l'utilisateur
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('folder_project')
      .eq('id', idUser)
      .maybeSingle();
    if (userError) throw userError;
    if (!userData || !userData.folder_project) {
      return res.status(200).json({ message: 'Aucun dossier trouvé pour cet utilisateur' });
    }
    const folder = userData.folder_project;
    // Récupérer le slug de la collection
    const { data: collectionData, error: collectionError } = await supabase
      .from('collection')
      .select('collection_slug')
      .eq('id', idBlog)
      .maybeSingle();
    if (collectionError) throw collectionError;
    const slug_collection = collectionData?.slug_collection || '';
    const url = `${slug_collection}${slug}`;
    // Récupérer l'ancien slug de la page de collection
    const { data: pageData, error: pageError } = await supabase
      .from('collection_element')
      .select('collection_element_slug')
      .eq('id', idBlogPage)
      .eq('collection_id', idBlog)
      .maybeSingle();
    if (pageError) throw pageError;
    const slug_old = pageData?.collection_element_slug || '';
    const url_old = `${slug_collection}${slug_old}`;
    const sitemapPath = await findSitemapPath(folder);
    const sitemap = await readSitemap(sitemapPath);
    if (!sitemap) {
      return res.status(200).json({ message: 'Sitemap non trouvé' });
    }
    sitemap.urlset.url = sitemap.urlset.url.map(entry => {
      if (entry.loc[0] === url_old) {
        entry.loc[0] = url;
        entry.lastmod = [date];
      }
      return entry;
    });
    await writeSitemap(sitemap, sitemapPath);
    res.status(200).json({ message: 'Article modifié dans le sitemap avec succès' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error });
  }
});


module.exports = router;