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

const { notificationRouter, notificationServer } = require('./users/notification');




// Admin router
const clientRouter = require('./admin/client');


const whitelist = ['http://localhost:5173', 'https://dashboard.wenoble.fr', 'https://kristina-photogrphy.webflow.io', 'https://explora-production.webflow.io', 'https://perfoseos.webflow.io', 'https://perfoseos.com', 'https://www.perfoseos.com'];

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

app.use(notificationRouter);


app.use(clientRouter);

app.use('/api', apiRouter);

//Static files
app.use('/media/blog', express.static(path.join(__dirname, 'images', 'blog_image')));
app.use('/media/portfolio', express.static(path.join(__dirname, 'images', 'portfolio_image')));

app.listen(3002, ()=>{
  console.log('Server is running on port 3002')
})

notificationServer.listen(3004, () => {
  console.log('Server is running on port 3004');
});

