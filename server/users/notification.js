const express = require('express');
const db = require('../db'); // Assurez-vous que le chemin est correct
const cors = require('cors');
const socketIo = require('socket.io');
const http = require('http');


const notificationRouter = express.Router();
const app = express();
const notificationServer = http.createServer(app);

require('dotenv').config();

const io = socketIo(notificationServer, {
    cors: {
      origin: process.env.SOCKET_URL,
      methods: ["GET", "POST"]
    }
  });


app.use(cors());
app.use(express.json());


notificationRouter.post('/createNotification', async (req, res) => {
    const sentIdUser = req.body.IdUser;
    const sentType = req.body.Type;
    const sentMessage = req.body.Message;
    const sentIdElement = req.body.IdElement;

    const date = new Date();

    const SQL = 'INSERT INTO notifications (id_user, type, message, id_element, date) VALUES (?, ?, ?, ?, ?)';
    const Values = [sentIdUser, sentType, sentMessage, sentIdElement, date];

    db.query(SQL, Values, (err, results) => {
        if (err) {
            res.send({ error: err });
        } else {
            io.to(sentIdUser).emit('notification', { message: sentMessage, type : sentType, date: date });

            res.send({ message: 'Notification created' });
        }
    });
});

notificationRouter.get('/getNotifications', (req, res) => {
    const sentIdUser = req.query.userId;
    const SQL = 'SELECT id_notif, type, message, id_element, date, is_read FROM notifications WHERE id_user = ? ORDER BY date DESC';
    const Values = [sentIdUser];

    db.query(SQL, Values, (err, results) => {
        if (err) {
            res.send({ error: err });
        } else {
            res.send(results);
        }
    });
});


notificationRouter.post('/readNotification', (req, res) => {
    const sentIdNotif = req.body.IdNotif;
    const SQL = 'UPDATE notifications SET is_read = 1 WHERE id_notif = ?';
    const Values = [sentIdNotif];
    db.query(SQL, Values, (err, results) => {
        if (err) {
            res.send({ error: err });
        } else {
            res.send({ message: 'Notification read' });
        }
    });
});

io.on('connection', (socket) => {

    // Écouter l'événement personnalisé pour rejoindre une salle
    socket.on('join', ({ idUser }) => {
        socket.join(idUser);
    });

    socket.on('disconnect', () => {
    });
});

module.exports = { notificationRouter, notificationServer };
