const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

router.get('/streamVideo/:videoName', (req, res) => {
  const videoName = req.params.videoName;
  const videoDirectory = path.join(__dirname, '..', 'images', 'blog_video');
  const videoPath = path.join(videoDirectory, videoName);

  fs.stat(videoPath, (err, stats) => {
    if (err) {
      console.log("Erreur lors de l'accès au fichier vidéo :", err);
      res.status(404).send('Vidéo non trouvée');
      return;
    }

    const fileSize = stats.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(videoPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      };

      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(200, head);
      fs.createReadStream(videoPath).pipe(res);
    }
  });
});

module.exports = router;