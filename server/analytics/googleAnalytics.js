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
  let startDate, endDate, compareStartDate, compareEndDate;

  switch (period) {
    case 'today':
      startDate = dayjs().format('YYYY-MM-DD');
      endDate = dayjs().format('YYYY-MM-DD');
      compareStartDate = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
      compareEndDate = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
      break;
    case 'yesterday':
      startDate = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
      endDate = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
      compareStartDate = dayjs().subtract(2, 'day').format('YYYY-MM-DD');
      compareEndDate = dayjs().subtract(2, 'day').format('YYYY-MM-DD');
      break;
    case 'last7days':
      startDate = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
      endDate = dayjs().format('YYYY-MM-DD');
      compareStartDate = dayjs().subtract(14, 'day').subtract(7, 'day').format('YYYY-MM-DD');
      compareEndDate = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
      break;
    case 'last14days':
      startDate = dayjs().subtract(14, 'day').format('YYYY-MM-DD');
      endDate = dayjs().format('YYYY-MM-DD');
      compareStartDate = dayjs().subtract(28, 'day').format('YYYY-MM-DD');
      compareEndDate = dayjs().subtract(14, 'day').format('YYYY-MM-DD');
      break;
    case 'last30days':
      startDate = dayjs().subtract(30, 'day').format('YYYY-MM-DD');
      endDate = dayjs().format('YYYY-MM-DD');
      compareStartDate = dayjs().subtract(60, 'day').subtract(30, 'day').format('YYYY-MM-DD');
      compareEndDate = dayjs().subtract(30, 'day').format('YYYY-MM-DD');
      break;
    case 'last90days':
      startDate = dayjs().subtract(90, 'day').format('YYYY-MM-DD');
      endDate = dayjs().format('YYYY-MM-DD');
      compareStartDate = dayjs().subtract(180, 'day').subtract(90, 'day').format('YYYY-MM-DD');
      compareEndDate = dayjs().subtract(90, 'day').format('YYYY-MM-DD');
      break;
    case 'last365days':
      startDate = dayjs().subtract(365, 'day').format('YYYY-MM-DD');
      endDate = dayjs().format('YYYY-MM-DD');
      compareStartDate = dayjs().subtract(730, 'day').subtract(365, 'day').format('YYYY-MM-DD');
      compareEndDate = dayjs().subtract(365, 'day').format('YYYY-MM-DD');
      break;
    default:
      startDate = '2020-03-31';
      endDate = dayjs().format('YYYY-MM-DD');
      compareStartDate = '2019-03-31';
      compareEndDate = '2020-03-30';
      break;
  }

  return { startDate, endDate, compareStartDate, compareEndDate };
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
              {
                startDate: dateRange.compareStartDate,
                endDate: dateRange.compareEndDate
              }
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

          

      const currentPeriodData = [];
      const comparePeriodData = [];
      
      response.rows.forEach(row => {
        const date = row.dimensionValues[0].value; // format YYYYMMDD
        const value = row.metricValues[0].value;
    
        // Convertir les dates du range en YYYYMMDD
        const startDate = dateRange.startDate.replace(/-/g, '');
        const endDate = dateRange.endDate.replace(/-/g, '');
        const compareStartDate = dateRange.compareStartDate.replace(/-/g, '');
        const compareEndDate = dateRange.compareEndDate.replace(/-/g, '');
    
        console.log('date: ' + date);
        console.log('value: ' + value);
        console.log('startDate: ' + startDate);
    
        if (date >= startDate && date <= endDate && value !== '0') {
            currentPeriodData.push({ date, value });
        } else if (date >= compareStartDate && date <= compareEndDate && value !== '0') {
            comparePeriodData.push({ date, value });
        }
    });

    
      console.log(currentPeriodData);
      console.log(comparePeriodData);

      const formattedData = {
          currentPeriod: currentPeriodData,
          comparePeriod: comparePeriodData,
      };

      res.json(formattedData);


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
