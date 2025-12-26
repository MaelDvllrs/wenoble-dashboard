const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser');
const path = require('path');


// Client router
const apiRouter = require('./api/api');

const authRoutes = require('./users/auth');
const authorisationRouter = require('./website/authorisation');
const securityRouter = require('./users/security');
const profileRouter = require('./users/profile');
const userStatsRouter = require('./users/userStats');
const subscriptionModule = require('./subscription/subscription');
// subscriptionModule exports { router, stripeWebhookHandler }
const billingRouter = require('./billing/billing');
const portfolioRouter = require('./modification/portfolio');
const pageRouter = require('./modification/page');
const collectionRouter = require('./modification/collection');
const {router: websiteRouter}  = require('./website/website');
const {router: domainVerificationRouter}  = require('./website/domainVerification');
const {router: workspaceRouter}  = require('./workspace/workspace');
const videoRouter = require('./modification/video');
const limitSizeRouter = require('./modification/limitSize');
const sitemapRouter = require('./modification/sitemap');
//const updateCacheRouter = require('./modification/SSRCache');
const generationStaticRouter = require('./modification/generationStatic');
const articleRouter = require('./actualite/article');
const analyticsRouter = require('./analytics/googleAnalytics');
const searchConsoleRouter = require('./searchConsole/googleSearchConsole');
//
const sendEmailRouter = require('./contact/sendEmail');
const contactRouter = require('./contact/contact');
const contactEmailRouter = require('./contact/contactEmail');
const newsletterRouter = require('./newsletter/newsletter');
const signUpNewsletterRouter = require('./newsletter/signUpNewsletter');  
//
// API externe
const externalAPIRouter = require('./external/externalAPI');
// API Tokens
const apiTokensRouter = require('./api/apiTokens');
// Scraping
const scrapingRouter = require('./scrapping/scraping');
// Static site edits
const staticEditRouter = require('./static/editRoutes');
//
const { notificationRouter, notificationServer } = require('./users/notification');



//const clientRouter = require('./admin/client');



// Pour la whitelist dynamique depuis la BDD
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

let whitelist = [
  'http://77.37.51.201',
  'http://testwenoble.fr',
  'http://localhost:5173',
  'https://dashboard.wenoble.fr',
  'http://127.0.0.1:5500',
  'http://127.0.0.1:5501',
  'http://localhost:3000',
  'http://localhost:4173',
];

// Fonction pour générer la whitelist à partir de la BDD
async function updateWhitelistFromDB() {
  try {
    const { data, error } = await supabase
      .from('websites')
      .select('website_slug, website_preview');
    if (error) throw error;
    const domains = new Set();
    data.forEach(site => {
      if (site.website_slug) {
        domains.add(`https://${site.website_slug}`);
        domains.add(`https://www.${site.website_slug}`);
      }
      if (site.website_preview) {
        domains.add(`https://${site.website_preview}`);
        domains.add(`https://www.${site.website_preview}`);
      }
    });
    whitelist = [
      'http://77.37.51.201',
      'http://testwenoble.fr',
      'http://localhost:5173',
      'https://dashboard.wenoble.fr',
      'http://127.0.0.1:5500',
      'http://127.0.0.1:5501',
      'http://localhost:3000',
      'http://localhost:4173',
      ...domains
    ];
  } catch (err) {
    console.error('Erreur lors de la génération de la whitelist depuis la BDD:', err);
  }
}

// Mettre à jour la whitelist au démarrage
updateWhitelistFromDB();




// Configuration de CORS

const corsOptions = {
  origin: async function (origin, callback) {
    if (!origin || origin === 'null' || whitelist.includes(origin)) {
      return callback(null, true);
    }
    // Vérification dynamique dans la BDD
    try {
      const { data, error } = await supabase
        .from('websites')
        .select('website_slug, website_preview');
      if (error) throw error;
      const domains = new Set();
      data.forEach(site => {
        if (site.website_slug) {
          domains.add(`https://${site.website_slug}`);
          domains.add(`https://www.${site.website_slug}`);
        }
        if (site.website_preview) {
          domains.add(`https://${site.website_preview}`);
          domains.add(`https://www.${site.website_preview}`);
        }
      });
      if (domains.has(origin)) {
        return callback(null, true);
      }
    } catch (err) {
      console.error('Erreur CORS dynamique:', err);
    }
    console.log(`CORS error: ${origin} not allowed by CORS`);
    callback(new Error('Not allowed by CORS'));
  },
};

app.use(cors(corsOptions));

// Mount raw webhook route BEFORE any body parsers so Stripe signature verification can access the raw body
const expressRaw = require('express').raw;
app.post('/webhook', expressRaw({ type: 'application/json' }), async (req, res) => {
  // Delegate to the subscription module's handler
  return subscriptionModule.stripeWebhookHandler(req, res);
});

app.use(express.json({ limit: '500mb' })); 

app.use(bodyParser.json({ limit: '500mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// API externe (monté en premier pour éviter les conflits d'authentification)
app.use('/external-api', externalAPIRouter);

//
app.use('/api', apiRouter);
app.use(staticEditRouter); // Static site edits API (sans préfixe /api)
app.use(express.static('public'));
app.get('/blog-template-loader.js', (req, res) => {
 res.sendFile(path.join(__dirname, 'public', 'blog-loader.js'));
});
//
//
app.use(signUpNewsletterRouter);
app.use(sendEmailRouter);
//
//
app.use(authRoutes);
app.use(authorisationRouter);
//
//
//
app.use(notificationRouter);
//
//
////Static files
app.use('/media/blog', express.static(path.join(__dirname, 'images', 'blog_image')));
app.use('/media/portfolio', express.static(path.join(__dirname, 'images', 'portfolio_image')));
app.use('/media/page', express.static(path.join(__dirname, 'images', 'page_image')));
app.use('/media/blogGallery', express.static(path.join(__dirname, 'images', 'blog_gallery')));
app.use('/media/blog/richText', express.static(path.join(__dirname, 'images', 'richtext_blog_images')));
app.use('/media/profile', express.static(path.join(__dirname, 'images', 'profile_image')));

// Static sites pour le scraping - avec gestion des URLs sans extension
app.use('/static-sites/:siteId', async (req, res, next) => {
  const { siteId } = req.params;
  const requestPath = req.path.replace(/^\//, '');
  const sitePath = path.join(__dirname, 'scrapping', 'sites', siteId);
  
  // Si la requête se termine déjà par une extension connue, laisser passer
  if (requestPath.match(/\.(html|css|js|jpg|jpeg|png|gif|svg|webp|woff|woff2|ttf|eot|otf|ico)$/i)) {
    return next();
  }

  // Essayer différentes variantes pour les URLs sans extension
  const fs = require('fs-extra');
  const possiblePaths = [
    path.join(sitePath, requestPath + '.html'),
    path.join(sitePath, requestPath, 'index.html'),
    path.join(sitePath, requestPath === '' ? 'index.html' : requestPath),
  ];

  for (const filePath of possiblePaths) {
    try {
      if (await fs.pathExists(filePath)) {
        const stats = await fs.stat(filePath);
        if (stats.isFile()) {
          return res.sendFile(filePath);
        }
      }
    } catch (error) {
      // Continue to next path
    }
  }

  next();
});

app.use('/static-sites', express.static(path.join(__dirname, 'scrapping', 'sites')));
//
//
app.use(videoRouter);
//

//
app.use(profileRouter); // Routes de gestion du profil utilisateur (regroupé avec anciennes routes infoUser)
app.use(securityRouter);
app.use(userStatsRouter);
app.use(subscriptionModule.router);
app.use(billingRouter);
app.use(portfolioRouter);
app.use(pageRouter);
app.use(collectionRouter);
app.use(websiteRouter);
app.use(domainVerificationRouter);
app.use(workspaceRouter);
app.use(limitSizeRouter);
//app.use(orderRouter);
app.use(contactRouter);
app.use(contactEmailRouter);
//app.use(clientRouter);
app.use(sitemapRouter);
app.use(articleRouter);
app.use(analyticsRouter);
app.use(searchConsoleRouter);
app.use(newsletterRouter);
//app.use(updateCacheRouter);
app.use(generationStaticRouter);
// API Tokens management
app.use(apiTokensRouter);
// Scraping routes
app.use('/scraping', scrapingRouter);




app.listen(3002, ()=>{
  console.log('Server is running on port 3002')
})

//notificationServer.listen(3004, () => {
//  console.log('Server is running on port 3004');
//});

