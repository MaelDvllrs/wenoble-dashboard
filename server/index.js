const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser');
const path = require('path');


// Client router
const apiRouter = require('./api/api');

const authRoutes = require('./users/auth');
const authorisationRouter = require('./users/authorisation');
const infoUserRouter = require('./users/infoUser');
const portfolioRouter = require('./modification/portfolio');
const pageRouter = require('./modification/page');
const collectionRouter = require('./modification/collection');
const {router: websiteRouter}  = require('./website/website');
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
//const orderRouter = require('./ecommerce/order');
//
const sendEmailRouter = require('./contact/sendEmail');
const contactRouter = require('./contact/contact');
const contactEmailRouter = require('./contact/contactEmail');
const newsletterRouter = require('./newsletter/newsletter');
const signUpNewsletterRouter = require('./newsletter/signUpNewsletter');  
//
//
const { notificationRouter, notificationServer } = require('./users/notification');



//const clientRouter = require('./admin/client');


const whitelist = 
[ 
  'http://77.37.51.201',
  'http://testwenoble.fr',
  'http://localhost:5173', 
  'https://dashboard.wenoble.fr', 
  'http://127.0.0.1:5500',
  'http://localhost:3000',
  'http://localhost:4173',

  
  'https://kristina-photogrphy.webflow.io',
  'https://kristinaphotography.fr',
  'https://www.kristinaphotography.fr',
  
  
  'https://explora-production.webflow.io',
  'https://exploraprod.com',
  'https://www.exploraprod.com', 
  
  'https://perfoseos.webflow.io', 
  'https://perfoseos.com', 
  'https://www.perfoseos.com',
  'https://perfoseos.fr',
  'https://www.perfoseos.fr',

  'https://savoirfairetatouagepreview.webflow.io',
  'https://savoirfairetatouage.com',
  'https://www.savoirfairetatouage.com',

  'https://elodie-loots.webflow.io',
  'https://elodieloots.com',
  'https://www.elodieloots.com',

  'https://kayart-photograhy.webflow.io',
  'https://kayartphotography.fr',
  'https://www.kayartphotography.fr',

  'https://gil-tirlet-photography.webflow.io',
  'https://giltirletphotography.fr',
  'https://www.giltirletphotography.fr',

  'https://shine-photographie.webflow.io',
  'http://www.nathaliemathern.ch',
  'https://nathaliemathern.ch',


  'https://la-plume-au-carre.webflow.io',
  'https://laplumeaucarre.fr',
  'https://www.laplumeaucarre.fr',

  'https://deko-project.webflow.io',
  'https://dekoproject.fr',
  'https://www.dekoproject.fr',

  'https://emotion-sonore.webflow.io',

  'https://neo-interieur.webflow.io',
  'https://neo-interieur.fr',
  'https://www.neo-interieur.fr',

  'https://top-pizza-bd8e7e.webflow.io',
  'https://toppizzaburger.com',
  'https://www.toppizzaburger.com',  

  'https://psc-environnement-preview.webflow.io',
  'https://psc-environnement.fr',

  'https://wechoose-site.webflow.io',

  'https://thibault-laupretre-wenoble.webflow.io',
  'https://thibault-laupretre.com',  

  'https://salon-marco-d950f4.webflow.io',

  'https://kimberley-architecture.webflow.io',
  'https://kimberleygouno.fr',
  'https://www.kimberleygouno.fr',

  'https://billel-aissa-photography.webflow.io',
  'https://www.billelaissa.com',
  
  'https://artesia-66566b.webflow.io',
  'https://laboratoireartesia.fr',
  'https://www.laboratoireartesia.fr',

  'https://oceane-colasseau.webflow.io',
  'https://occhezvous.fr',
  'https://www.occhezvous.fr',


  'https://maison-astucieuse-emma-lamarqu-388c45.webflow.io',
  'https://maisonastucieuse.fr',

  'https://manuella-83b40f.webflow.io',

  'https://attique-b881c8.webflow.io',

  'https://goout-0d445f.webflow.io'
];




// Configuration de CORS
const corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1 || !origin || origin === 'null') { 
      callback(null, true);
    } else {
      console.log(`CORS error: ${origin} not allowed by CORS`);
      callback(new Error('Not allowed by CORS'));
    }
  },
};

app.use(cors(corsOptions));

app.use(express.json({ limit: '500mb' })); 

app.use(bodyParser.json({ limit: '500mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
//
app.use('/api', apiRouter);
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
//
//
app.use(videoRouter);
//

//
app.use(infoUserRouter);
app.use(portfolioRouter);
app.use(pageRouter);
app.use(collectionRouter);
app.use(websiteRouter);
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




app.listen(3002, ()=>{
  console.log('Server is running on port 3002')
})

//notificationServer.listen(3004, () => {
//  console.log('Server is running on port 3004');
//});

