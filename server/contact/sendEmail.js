//const express = require('express');
//const cors = require('cors');
//const axios = require('axios');
//const db = require('../db');
//const {Resend} = require('resend');
//const router = express.Router();
//
//router.use(cors());
//router.use(express.json());
//
//
//require('dotenv').config();
//
//
//const resend = new Resend("re_h4S2xteq_JywJQ2N9yFFrky95nVXBkrut")
//
//
//
//router.get('/sendEmail', async (req, res) => {
//        const { to, subject, text } = req.query;
//
//        console.log(to, subject, text);
//
//        const { data, error }  = await resend.emails.send({
//            from: "mael.devillers@wenoble.fr",
//            to: [to],
//            subject: subject,
//            html: text,
//        });
//
//        if (error) {
//            return res.status(400).json({ error });
//        }
//
//        res.status(200).json({ message: 'Email sent successfully', data });
//});
//
//
//module.exports = router;