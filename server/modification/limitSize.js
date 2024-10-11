const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const db = require('../db'); 


const router = express.Router();

router.use(cors())
router.use(express.json());

require('dotenv').config();
const secretKey = process.env.SECRET_KEY; 

router.get('/getSizeItem', (req, res) => {
    const token = req.query.token;
    const idUser = jwt.verify(token, secretKey).idUser;

    const SQL = `SELECT size FROM photo_portfolio 
                 JOIN portfolio ON photo_portfolio.id_portfolio = portfolio.id_portfolio
                 WHERE portfolio.id_user = ?
                 UNION ALL
                 SELECT size FROM page_photo 
                 JOIN page ON page_photo.id_page = page.id_page
                 WHERE page.id_user = ?
                 UNION ALL
                 SELECT size FROM blog_field_image 
                 JOIN blog_page ON blog_field_image.id_blog_page = blog_page.id_page_blog
                 JOIN blog ON blog_page.id_blog = blog.id_blog
                 WHERE blog.id_user = ?
                 UNION ALL
                 SELECT size FROM blog_field_video 
                 JOIN blog_page ON blog_field_video.id_blog_page = blog_page.id_page_blog
                 JOIN blog ON blog_page.id_blog = blog.id_blog
                 WHERE blog.id_user = ?
                 UNION ALL
                 SELECT size FROM blog_field_gallery 
                 JOIN blog_page ON blog_field_gallery.id_blog_page = blog_page.id_page_blog
                 JOIN blog ON blog_page.id_blog = blog.id_blog
                 WHERE blog.id_user = ?
             ) AS sizes; `;
    
    const Values = [idUser, idUser, idUser, idUser];

    db.query(SQL, Values, (err, results) => {
        if (err) {
        console.log(err);
        res.send({ error: err })
        return;
        }
        
        const totalSize = results[0].total_size;
        res.send( {totalSize : totalSize})
    });
});

module.exports = router;