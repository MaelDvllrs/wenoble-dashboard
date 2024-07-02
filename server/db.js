require('dotenv').config();

const mysql = require('mysql')


const db = mysql.createConnection({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
})

db.connect(err => {
    if (err) {
        console.error('Erreur de connexion à la base de données :', err);
        process.exit(1);
    } else {
        console.log('Connecté à la base de données');
    }
});

module.exports = db
