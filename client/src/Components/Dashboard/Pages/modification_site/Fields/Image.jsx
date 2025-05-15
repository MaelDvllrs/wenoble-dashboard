import React, { useState, useEffect } from 'react';
import { FileUploader } from "react-drag-drop-files";
import { compressImage } from "../../../../../utils/imageUtils";
import { SecondaryButton } from '../../../../../Theme/element';
import DeleteIcon from '@mui/icons-material/Delete';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import ImageIcon from '@mui/icons-material/Image';
import './Field.css';
import config from '../../../../../config';

const ImageUpload = ({ id_blog_page, type, id_config, onChange, dataValue, theme, imageDirectory }) => {
    const [imagesUploaded, setImagesUploaded] = useState([]);
    const [createBoolImage, setCreateBoolImage] = useState('')
    const fileTypes = ["JPG", "PNG"];
    const apiUrl = config.apiUrl;

    const handleImageChange = async (file, idToReplace) => {

      if (file instanceof File) {
        const fileCompress = await compressImage(file);

        const data = {
          id_blog_page: id_blog_page,
          id_config: id_config,
          data: fileCompress,
          name: file.name,
          alt: file.name,
          url: URL.createObjectURL(file),
          size: (fileCompress.size / 1024).toFixed(0),
          type: 'images',
          create : createBoolImage
        };

        setImagesUploaded(prevImages => {
          const foundIndex = prevImages.findIndex(img => img.id_config === idToReplace);
          if (idToReplace !== undefined && foundIndex !== -1) {
            onChange({ data });
        
            return prevImages.map((img, index) => index === foundIndex ? data : img);
          } else {
            onChange({ ...prevImages, data });

            return [...prevImages, data];
          }
        });
      } else {
        console.error("Aucun fichier n'a été téléchargé.");
      }
    };

    const handleAltChange = (idToUpdate, newAlt) => {
      setImagesUploaded(prevImages => 
        prevImages.map(image => 
          image.id_config === idToUpdate ? { ...image, alt: newAlt } : image
        )
      );
    };

    useEffect(() => {
      // Vérifiez si dataValue existe et si le type est 'image'
      if (dataValue && Object.keys(dataValue).length > 0 && type === 'image' && dataValue.src !== 'default.jpg' ) {
        // Préparez les données de l'image pour l'état initial de imagesUploaded
        const initialImages = [{
          id_blog_page: dataValue.id_blog_page || id_blog_page, // Utilisez id_blog_page de dataValue ou celui passé en prop
          id_config: dataValue.id_config || id_config, // Utilisez id_config de dataValue ou celui passé en prop
          data: dataValue.data, // Utilisez les données d'image en base64 de dataValue
          name: dataValue.name, // Utilisez le nom de l'image de dataValue
          alt: dataValue.alt, // Utilisez le texte alternatif de l'image de dataValue
          url: apiUrl + imageDirectory + dataValue.src, // Utilisez les données d'image en base64 comme URL
          size: dataValue.size, // Utilisez la taille de l'image de dataValue
          type: 'images', // Définissez le type comme 'images'
        }];

        // Initialisez l'état imagesUploaded avec les données de l'image
        setImagesUploaded(initialImages);
        setCreateBoolImage(dataValue.create);
      }
    }, [dataValue, type, id_blog_page, id_config]);
    function handleDeleteImage(idToDelete) {
      setImagesUploaded(imagesUploaded.filter(image => image.id_config !== idToDelete));
      const data = {
        id_config: id_config,
        type: 'images'
      }
      onChange({ data }, true);
    }

    return (
      <div className='image_blog' style={{ backgroundColor: theme.palette.primary.main, color: theme.palette.text.primary, borderColor: theme.palette.primary.main }}>
        {imagesUploaded.length > 0 && imagesUploaded.some(image => image.url) ? (
          imagesUploaded.map((image) => (
            <div key={image.id_config} className="ImageUploaded_contain">
              <img className='Image_uploaded' src={image.url} alt={image.alt} />
              <div className='info_image_blog'>
                <div>
                  <p className='titlePage'><b>{image.name}</b></p>
                  <p className='user_id titlePage' style={{ color: theme.palette.text.secondary }}>{image.alt}</p>
                </div>
                <div className='flex_contain flex_image'>
                  <p style={{ color: theme.palette.text.secondary }}>{image.size} Ko</p>
                  <a href={image.url} target="_blank">
                    <OpenInNewOutlinedIcon style={{ color: theme.palette.text.primary }} />
                  </a>
                </div>
                <div className='button_contain'>
                  <input className='input_image_blog' type="file" id={`file-input-${image.id_config}`} onChange={(e) => handleImageChange(e.target.files[0], image.id_config)} accept=".jpeg,.jpg,.png" />
                  <SecondaryButton theme={theme} className="button_image_blog" type="submit" variant="contained"><label className='label_input_image_blog' htmlFor={`file-input-${image.id_config}`} /><AutorenewIcon /> Remplacer</SecondaryButton>
                  <SecondaryButton theme={theme} className="button_image_blog" type="submit" variant="contained" onClick={() => handleDeleteImage(image.id_config)}><DeleteIcon /> Supprimer</SecondaryButton>
                </div>
              </div>
            </div>
          ))
        ) : (
          <FileUploader handleChange={handleImageChange} name="file" types={fileTypes} multiple={false}>
            <div className="DragAndDrop DragAndDropField">
              <span className="logoUploadImage">
                <ImageIcon />
              </span>
              Télécharger ou glisser une photo ici (jpeg, png)
            </div>
          </FileUploader>
        )}
      </div>
    );
};

export default ImageUpload;