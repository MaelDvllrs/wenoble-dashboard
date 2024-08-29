const express = require('express');
const db = require('../db'); // Assurez-vous que le chemin est correct
const cors = require('cors');
const socketIo = require('socket.io');
const http = require('http');

const notificationRouter = express.Router();
const app = express();
const notificationServer = http.createServer(app);

const io = socketIo(notificationServer, {
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST"]
    }
  });


app.use(cors()); // Appliquez le middleware CORS avant toutes les autres routes
app.use(express.json());


notificationRouter.post('/createNotification', async (req, res) => {
    const sentIdUser = req.body.IdUser;
    const sentType = req.body.Type;
    const sentDate = req.body.Date;
    const sentMessage = req.body.Message;

    const SQL = 'INSERT INTO notifications (id_user, type, message, date) VALUES (?, ?, ?, ?)';
    const Values = [sentIdUser, sentType, sentMessage, sentDate];

    db.query(SQL, Values, (err, results) => {
        if (err) {
            res.send({ error: err });
        } else {
            io.to(sentIdUser).emit('notification', results);
            res.send({ message: 'Notification created' });
        }
    });
});

notificationRouter.get('/getNotifications', (req, res) => {
    const sentIdUser = req.query.userId;
    const SQL = 'SELECT id_notif, type, message, date, is_read FROM notifications WHERE id_user = ?';
    const Values = [sentIdUser];

    db.query(SQL, Values, (err, results) => {
        if (err) {
            res.send({ error: err });
        } else {
            res.send(results);
        }
    });
});

io.on('connection', (socket) => {
    socket.on('disconnect', () => {
    });
});

module.exports = { notificationRouter, notificationServer };
