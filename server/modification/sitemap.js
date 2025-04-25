const express = require('express')
const path = require('path');
const fs = require('fs');
const cors = require('cors')
const db = require('../db')
const xml2js = require('xml2js');
const dayjs = require('dayjs'); 
const utc = require('dayjs/plugin/utc'); 
const customParseFormat = require('dayjs/plugin/customParseFormat');
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
router.post('/addRouteBlogSitemap', async (req, res) => {

  const idUser = req.body.params.idUser;
  const idBlog = req.body.params.idBlog;
  const slug = req.body.params.slug;
  const date = dayjs().utc().format('YYYY-MM-DDTHH:mm:ss+00:00');
  console.log(date);


  try {
    // Récupérer le dossier de l'utilisateur
    const userResult = await new Promise((resolve, reject) => {
      const SQL = "SELECT folder_project FROM users WHERE id_user = ?";
      db.query(SQL, [idUser], (err, result) => {
        if (err) {
          return reject('Erreur lors de la récupération du dossier de l\'utilisateur');
        }
        resolve(result);
      });
    });


    if (userResult.length === 0 || !userResult[0].folder_project) {
      return res.status(200).json({ message: 'Aucun dossier trouvé pour cet utilisateur' });
    }

    const folder = userResult[0].folder_project;

    // Récupérer le slug de l'article de blog
    const blogResult = await new Promise((resolve, reject) => {
      const SQL = "SELECT slug_blog FROM blog WHERE id_blog = ?";
      db.query(SQL, [idBlog], (err, result) => {
        if (err) {
          return reject('Erreur lors de la récupération du slug de l\'article');
        }
        resolve(result);
      });
    });

    const slug_blog = blogResult[0].slug_blog;
    const url = `${slug_blog}${slug}`;

    const sitemapPath = await findSitemapPath(folder);

    // Lire le fichier sitemap existant
    const sitemap = await readSitemap(sitemapPath);

    if (!sitemap) {
      return res.status(200).json({ message: 'Sitemap non trouvé' });
    }

    // Ajouter une nouvelle entrée pour l'article de blog
    const newEntry = {
      loc: url,
      lastmod: date,
      changefreq: 'weekly',
      priority: '0.6'
    };
    sitemap.urlset.url.push(newEntry);

    // Écrire les modifications dans le fichier sitemap
    await writeSitemap(sitemap, sitemapPath);

    res.status(200).json({ message: 'Article ajouté au sitemap avec succès' });
  } catch (error) {
    res.status(500).json({ error });
  }
});


// Route pour supprimer un article de blog
router.post('/deleteRouteBlogSitemap', async (req, res) => {
  //const { idUser, idBlog } = req.body.params;
  const idUser = req.body.params.idUser;
  const idBlog = req.body.params.idBlog;
  const idBlogPage = req.body.params.idBlogPage;


  try {
    // Récupérer le dossier de l'utilisateur
    const userResult = await new Promise((resolve, reject) => {
      const SQL = "SELECT folder_project FROM users WHERE id_user = ?";
      db.query(SQL, [idUser], (err, result) => {
        if (err) {
          return reject('Erreur lors de la récupération du dossier de l\'utilisateur');
        }
        resolve(result);
      });
    });

    if (userResult.length === 0 || !userResult[0].folder_project) {
      return res.status(200).json({ message: 'Aucun dossier trouvé pour cet utilisateur' });
    }

    const folder = userResult[0].folder_project;

        //Récuperer le slug de la page de blog


    const page_blog_slug = await new Promise((resolve, reject) => {
      const SQL = "SELECT page_blog_slug FROM blog_page WHERE id_page_blog = ? AND id_blog = ?";  
      db.query(SQL, [idBlogPage, idBlog], (err, result) => {
        if (err) {
          return reject('Erreur lors de la récupération du slug de la page de blog');
        }
        resolve(result);
      });
    });
    const slug = page_blog_slug[0].page_blog_slug;

    // Récupérer le slug de l'article de blog
    const blogResult = await new Promise((resolve, reject) => {
      const SQL = "SELECT slug_blog FROM blog WHERE id_blog = ?";
      db.query(SQL, [idBlog], (err, result) => {
        if (err) {
          return reject('Erreur lors de la récupération du slug de l\'article');
        }
        resolve(result);
      });
    });

    const slug_blog = blogResult[0].slug_blog;
    const url = `${slug_blog}${slug}`;



    const sitemapPath = await findSitemapPath(folder);

    // Lire le fichier sitemap existant
    const sitemap = await readSitemap(sitemapPath);

    if (!sitemap) {
      return res.status(200).json({ message: 'Sitemap non trouvé' });
    }

    // Trouver et supprimer l'entrée correspondante dans le sitemap
    sitemap.urlset.url = sitemap.urlset.url.filter(entry => !entry.loc[0].includes(url));

    // Écrire les modifications dans le fichier sitemap
    await writeSitemap(sitemap, sitemapPath);

    res.status(200).json({ message: 'Article supprimé du sitemap avec succès' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error });
    
  }
});



// Route pour modifier un article de blog
router.post('/updateRouteBlogSitemap', async (req, res) => {
  const { idUser, idBlog, idBlogPage, slug, date } = req.body.params;

  try {
    // Récupérer le dossier de l'utilisateur
    const userResult = await new Promise((resolve, reject) => {
      const SQL = "SELECT folder_project FROM users WHERE id_user = ?";
      db.query(SQL, [idUser], (err, result) => {
        if (err) {
          return reject('Erreur lors de la récupération du dossier de l\'utilisateur');
        }
        resolve(result);
      });
    });


    if (userResult.length === 0 || !userResult[0].folder_project) {
      return res.status(200).json({ message: 'Aucun dossier trouvé pour cet utilisateur' });
    }

    const folder = userResult[0].folder_project;

    // Récupérer le slug de l'article de blog
    const blogResult = await new Promise((resolve, reject) => {
      const SQL = "SELECT slug_blog FROM blog WHERE id_blog = ?";
      db.query(SQL, [idBlog], (err, result) => {
        if (err) {
          return reject('Erreur lors de la récupération du slug de l\'article');
        }
        resolve(result);
      });
    });

    const slug_blog = blogResult[0].slug_blog;
    const url = `${slug_blog}${slug}`;

    const page_blog_slug = await new Promise((resolve, reject) => {
      const SQL = "SELECT page_blog_slug FROM blog_page WHERE id_page_blog = ? AND id_blog = ?";  
      db.query(SQL, [idBlogPage, idBlog], (err, result) => {
        if (err) {
          return reject('Erreur lors de la récupération du slug de la page de blog');
        }
        resolve(result);
      });
    });

    const slug_old = page_blog_slug[0].page_blog_slug;
    const url_old = `${slug_blog}${slug_old}`; 

    const sitemapPath = await findSitemapPath(folder);



    // Lire le fichier sitemap existant
    const sitemap = await readSitemap(sitemapPath);

    if (!sitemap) {
      return res.status(200).json({ message: 'Sitemap non trouvé' });
    }

    // Trouver et mettre à jour l'entrée correspondante dans le sitemap
    sitemap.urlset.url = sitemap.urlset.url.map(entry => {
      if (entry.loc[0] === url_old) {
        entry.loc[0] = url;
        entry.lastmod = [date];
      }
      return entry;
    });

    // Écrire les modifications dans le fichier sitemap
    await writeSitemap(sitemap, sitemapPath);

    res.status(200).json({ message: 'Article modifié dans le sitemap avec succès' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error });
  }
});


module.exports = router;