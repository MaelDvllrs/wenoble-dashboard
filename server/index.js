const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser');
const path = require('path');


// Client router
const apiRouter = require('./api/api');
const authRoutes = require('./users/auth');
const infoUserRouter = require('./users/infoUser');
const portfolioRouter = require('./modification/portfolio');
const pageRouter = require('./modification/page');
const blogRouter = require('./modification/blog');
const limitSizeRouter = require('./modification/limitSize');

const orderRouter = require('./ecommerce/order');

const sendEmailRouter = require('./contact/sendEmail');
const contactRouter = require('./contact/contact');

const { notificationRouter, notificationServer } = require('./users/notification');




// Admin router
const clientRouter = require('./admin/client');


const whitelist = 
[ 
  'http://77.37.51.201',
  'https://testwenoble.fr',
  'http://localhost:5173', 
  'https://dashboard.wenoble.fr', 

  
  'https://kristina-photogrphy.webflow.io',
  'https://kristinaphotography.fr',
  'https://www.kristinaphotography.fr',
  
  
  'https://explora-production.webflow.io',
  'https://exploraprod.com',
  'https://www.exploraprod.com', 
  
  'https://perfoseos.webflow.io', 
  'https://perfoseos.com', 
  'https://www.perfoseos.com',

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
];

// Configuration de CORS
const corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
};

app.use(cors(corsOptions));
app.use(express.json())

app.use(bodyParser.json({ limit: '500mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

app.use(authRoutes);
app.use(infoUserRouter);
app.use(portfolioRouter);
app.use(pageRouter);
app.use(blogRouter);
app.use(limitSizeRouter);

app.use(orderRouter);

app.use(contactRouter);

app.use(notificationRouter);

app.use(sendEmailRouter);


app.use(clientRouter);


app.use('/api', apiRouter);


//Static files
app.use('/media/blog', express.static(path.join(__dirname, 'images', 'blog_image')));
app.use('/media/portfolio', express.static(path.join(__dirname, 'images', 'portfolio_image')));
app.use('/media/page', express.static(path.join(__dirname, 'images', 'page_image')));


app.listen(3002, ()=>{
  console.log('Server is running on port 3002')
})

notificationServer.listen(3004, () => {
  console.log('Server is running on port 3004');
});

