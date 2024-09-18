const express = require('express');
const cors = require('cors');
const axios = require('axios');
const EventSource = require('eventsource');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();

router.use(cors());
router.use(express.json());

require('dotenv').config();
const secretKey = process.env.SECRET_KEY;

router.get('/ecommerce/getOrders', async (req, res) => {
  const sentIdUser = req.query.IdUser
  const sentStatus = req.query.Status
  const SQL = 'SELECT id_order_shop, customer_order, date_order, date_delivery, total_price FROM ecommerce_order WHERE id_user = ? AND status = ?'
  const Values = [sentIdUser, sentStatus]

  db.query(SQL, Values, (err, results) => {
    if (err) {
      res.send({ error: err })
      return;
    }
    const orders = results
    const ordersCrypt = jwt.sign({ orders: orders }, secretKey)
    res.send(ordersCrypt)
  })
});


// Route pour récupérer les details des commandes e-commerce
router.get('/ecommerce/getOrderDetail', async (req, res) => {
  try {
    // URL du serveur Symfony
    const symfonyServerUrl = 'https://your-symfony-server.com/api/order/get/id';

    // Faire une requête GET au serveur Symfony
    const response = await axios.get(symfonyServerUrl, {
      headers: {
        'Authorization': `Bearer ${secretKey}` // Ajouter l'en-tête d'autorisation si nécessaire
      }
    });

    // Envoyer les données récupérées au client
    res.json(response.data);
  } catch (error) {
    console.error('Erreur lors de la récupération des commandes:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des commandes' });
  }
});

// Configurer EventSource pour recevoir les notifications
//const mercureUrl = 'https://your-mercure-hub/.well-known/mercure?topic=https://example.com/books/1';
//const eventSource = new EventSource(mercureUrl, {
//  headers: {
//    'Authorization': `Bearer ${secretKey}`
//  }
//});
//
//eventSource.onmessage = (event) => {
//  const message = JSON.parse(event.data);
//  console.log('Nouvelle commande reçue:', message);
//  // Vous pouvez ajouter votre logique ici pour gérer la notification
//};
//
//eventSource.onerror = (error) => {
//  console.error('Erreur lors de la réception des notifications:', error);
//};

module.exports = router;