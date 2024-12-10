const express = require('express');
const { BetaAnalyticsDataClient } = require('@google-analytics/data');
const db = require('../db')
const cors = require('cors')
const keys = require('./API-ANALYTICS-39ab7998278f.json');
const dayjs = require('dayjs');

const router = express.Router();

router.use(cors())
router.use(express.json());


const analyticsDataClient = new BetaAnalyticsDataClient({
  credentials: keys
});


const getDateRange = (period) => {
  switch (period) {
    case 'today':
      return { startDate: dayjs().format('YYYY-MM-DD'), endDate: dayjs().format('YYYY-MM-DD') };
    case 'yesterday':
      return { startDate: dayjs().subtract(1, 'day').format('YYYY-MM-DD'), endDate: dayjs().subtract(1, 'day').format('YYYY-MM-DD') };
    case 'last7days':
      return { startDate: dayjs().subtract(7, 'day').format('YYYY-MM-DD'), endDate: dayjs().format('YYYY-MM-DD') };
    case 'last14days':
      return { startDate: dayjs().subtract(14, 'day').format('YYYY-MM-DD'), endDate: dayjs().format('YYYY-MM-DD') };
    case 'last30days':
      return { startDate: dayjs().subtract(30, 'day').format('YYYY-MM-DD'), endDate: dayjs().format('YYYY-MM-DD') };
    case 'last90days':
      return { startDate: dayjs().subtract(90, 'day').format('YYYY-MM-DD'), endDate: dayjs().format('YYYY-MM-DD') };
    case 'last365days':
      return { startDate: dayjs().subtract(365, 'day').format('YYYY-MM-DD'), endDate: dayjs().format('YYYY-MM-DD') };
    
      default:
      return { startDate: '2020-03-31', endDate: 'today' };
  }
};


router.get('/getUserAnalytics', async (req, res) => {
  const id_user = req.user.idUser
  const period = req.query.period
  const typeUser = req.query.typeUser


  db.query('SELECT id_analytic FROM users_info WHERE id_user = ?', [id_user], async (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).send('Database query error');
    }

    if (results.length === 0) {
      return res.status(404).send('Site not found');
    }
    const id_analytic = results[0].id_analytic;
    const dateRange = getDateRange(period);

    try {
        const [response] = await analyticsDataClient.runReport({
            property: `properties/${id_analytic}`,
            dateRanges: [
              {
                startDate: dateRange.startDate,
                endDate: dateRange.endDate,
              },
            ],
            dimensions: [
              {
                name: 'date',
              },
            ],
            metrics: [
              {
                name: typeUser,
              },
            ],
          });


          res.json(response.rows);

    } catch (error) {
        console.error('Error querying Google Analytics API:', JSON.stringify(error, null, 2));
        res.status(500).send(`Error querying Google Analytics API: ${error.message}`);
    }
  });
});


router.get('/getEventAnalytics', async (req, res) => {
  const id_user = req.user.idUser
  const period = req.query.period


  db.query('SELECT id_analytic FROM users_info WHERE id_user = ?', [id_user], async (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).send('Database query error');
    }

    if (results.length === 0) {
      return res.status(404).send('Site not found');
    }
    const id_analytic = results[0].id_analytic;
    const dateRange = getDateRange(period);

    try {
        const [response] = await analyticsDataClient.runReport({
            property: `properties/${id_analytic}`,
            dateRanges: [
              {
                startDate: dateRange.startDate,
                endDate: dateRange.endDate,
              },
            ],
            dimensions: [
              {
                name: 'date',
              },
            ],
            metrics: [
              {
                name: 'eventCount',
              },
              {
                name: 'eventCountPerUser',
              },
            ],
          });




          res.json(response.rows);

    } catch (error) {
        console.error('Error querying Google Analytics API:', JSON.stringify(error, null, 2));
        res.status(500).send(`Error querying Google Analytics API: ${error.message}`);
    }
  });
});

router.get('/getLocationAnalytics', async (req, res) => {
  const id_user = req.user.idUser
  const period = req.query.period
  const typeLocation = req.query.typeLocation 
  const locationID = req.query.locationID
  const typeUser = req.query.typeUser


  db.query('SELECT id_analytic FROM users_info WHERE id_user = ?', [id_user], async (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).send('Database query error');
    }

    if (results.length === 0) {
      return res.status(404).send('Site not found');
    }
    const id_analytic = results[0].id_analytic;
    const dateRange = getDateRange(period);

    try {
        const [response] = await analyticsDataClient.runReport({
            property: `properties/${id_analytic}`,
            dateRanges: [
              {
                startDate: dateRange.startDate,
                endDate: dateRange.endDate,
              },
            ],
            dimensions: [
              {
                name: typeLocation,
              },
              {
                name: locationID,
              }
            ],
            metrics: [
              {
                name: typeUser,
              },
            ],
          });


          res.json(response.rows);

    } catch (error) {
        console.error('Error querying Google Analytics API:', JSON.stringify(error, null, 2));
        res.status(500).send(`Error querying Google Analytics API: ${error.message}`);
    }
  });
});


router.get('/getPlateformCategorieAnalytics', async (req, res) => {
  const id_user = req.user.idUser
  const period = req.query.period
  const typePlatform = req.query.typePlatform
  const typeUser = req.query.typeUser



  db.query('SELECT id_analytic FROM users_info WHERE id_user = ?', [id_user], async (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).send('Database query error');
    }

    if (results.length === 0) {
      return res.status(404).send('Site not found');
    }
    const id_analytic = results[0].id_analytic;
    const dateRange = getDateRange(period);

    try {
        const [response] = await analyticsDataClient.runReport({
            property: `properties/${id_analytic}`,
            dateRanges: [
              {
                startDate: dateRange.startDate,
                endDate: dateRange.endDate,
              },
            ],
            dimensions: [
              {
                name: typePlatform,
              },
            ],
            metrics: [
              {
                name: typeUser,
              },
            ],
          });




          res.json(response.rows);

    } catch (error) {
        console.error('Error querying Google Analytics API:', JSON.stringify(error, null, 2));
        res.status(500).send(`Error querying Google Analytics API: ${error.message}`);
    }
  });
});


router.get('/getPageAnalytics', async (req, res) => {
  const id_user = req.user.idUser
  const period = req.query.period
  const typePage = req.query.typePage 
  const typeUser = req.query.typeUser



  db.query('SELECT id_analytic FROM users_info WHERE id_user = ?', [id_user], async (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).send('Database query error');
    }

    if (results.length === 0) {
      return res.status(404).send('Site not found');
    }
    const id_analytic = results[0].id_analytic;
    const dateRange = getDateRange(period);

    try {
        const [response] = await analyticsDataClient.runReport({
            property: `properties/${id_analytic}`,
            dateRanges: [
              {
                startDate: dateRange.startDate,
                endDate: dateRange.endDate,
              },
            ],
            dimensions: [
              {
                name: typePage,
              },
            ],
            metrics: [
              {
                name: typeUser,
              },
            ],
          });


          res.json(response.rows);

    } catch (error) {
        console.error('Error querying Google Analytics API:', JSON.stringify(error, null, 2));
        res.status(500).send(`Error querying Google Analytics API: ${error.message}`);
    }
  });
});





module.exports = router;
