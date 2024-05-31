const fs = require('fs');
const path = require('path');


const saveImageAsync = (data, fileName, directory, callback) => {
    console.log('Enregistrement de l\'image...');
    const imagePath = path.join(__dirname, 'images', directory, fileName);
  
    // Convertissez la chaîne base64 en données binaires
    const buffer = Buffer.from(data, 'base64');
  
    // Enregistrez les données binaires dans un fichier
    try {
      // Enregistrez les données binaires dans un fichier
      fs.writeFileSync(imagePath, buffer);
      callback(null);
    } catch (err) {
      console.error('Error writing file:', err);
      callback(err);
    }
  };

  exports.saveImageAsync = saveImageAsync;