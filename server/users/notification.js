const express = require('express');
const { supabaseServer } = require('../supabase');
const { authenticateToken } = require('../middleware/authToken');
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
    const sentIdUsers = req.body.IdUsers;
    const sentType = req.body.Type;
    const sentMessage = req.body.Message;
    const sentIdElement = req.body.IdElement;
    const date = new Date();
    try {
        // Préparer les notifications à insérer
        const notifications = sentIdUsers.map(user_id => ({
            user_id,
            type: sentType,
            message: sentMessage,
            id_element: sentIdElement,
            date
        }));
        // Insertion dans Supabase
        const { error } = await supabaseServer
            .from('notifications')
            .insert(notifications);
        if (error) {
            return res.send({ error });
        }
        // Émettre la notification via socket à chaque utilisateur
        sentIdUsers.forEach(user_id => {
            io.to(user_id).emit('notification', { message: sentMessage, type: sentType, date: date });
        });
        res.send({ message: 'Notifications created' });
    } catch (err) {
      console.error('Error creating notifications:', err);
        res.send({ error: err.message });
    }
});

notificationRouter.get('/getNotifications',authenticateToken, async (req, res) => {
    const sentIdUser = req.user.idUser;
    if (!sentIdUser) {
        return res.status(400).send({ error: 'Le paramètre id_user est requis.' });
    }
    try {
        const { data, error } = await supabaseServer
            .from('notifications')
            .select('id_notif, type, message, id_element, date, is_read')
            .eq('user_id', sentIdUser)
            .order('date', { ascending: false });
        if (error) {
            return res.send({ error });
        }
        res.send(data);
    } catch (err) {
        res.send({ error: err.message });
    }
});

notificationRouter.post('/readNotification', async (req, res) => {
    const sentIdNotif = req.body.IdNotif;
    try {
        const { error } = await supabaseServer
            .from('notifications')
            .update({ is_read: true })
            .eq('id_notif', sentIdNotif);
        if (error) {
            return res.send({ error });
        }
        res.send({ message: 'Notification read' });
    } catch (err) {
        res.send({ error: err.message });
    }
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
