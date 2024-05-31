const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser');


const apiRouter = require('./api/portfolio_api');
const authRoutes = require('./users/auth');
const infoUserRouter = require('./users/infoUser');
const portfolioRouter = require('./modification/portfolio');
const pageRouter = require('./modification/page');

app.use(cors())
app.use(express.json())


app.use(bodyParser.json({ limit: '500mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

app.use(authRoutes);
app.use(infoUserRouter);
app.use(portfolioRouter);
app.use(pageRouter);

app.use('/api', apiRouter);

app.listen(3002, ()=>{
  console.log('Server is running on port 3002')
})
