import React, { useState, useEffect } from 'react';
import config from '../../../../../config';
import { FileUploader } from "react-drag-drop-files";
import { Reorder } from 'framer-motion';
import { useFieldArray, useForm } from 'react-hook-form';
import { compressImage } from "../../../../../utils/imageUtils";
import { SecondaryButton } from '../../../../../Theme/element';
import DeleteIcon from '@mui/icons-material/Delete';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import CollectionsIcon from '@mui/icons-material/Collections';
import CircularProgress from '@mui/material/CircularProgress';
import './Field.css';

const GalleryUpload = ({ id_blog_page, type, id_config, onChange, slugValue, fieldValue, dataValue, id_collection_ref, theme }) => {
    const { control } = useForm();
    const { fields, append, remove, move } = useFieldArray({
      control,
      name: "images",
    });

    const [active, setActive] = useState(0);
    const [isLoading, setIsLoading] = useState(false); // Loading state
    const fileTypes = ["JPG", "PNG"];
    const urlBucketCollectionGallery = config.urlBucketCollectionGallery;
    const apiUrl = config.apiUrl; 

    const handleGalleryChange = async (file, addImage = true) => {
      if (addImage) {
        setIsLoading(true); // Start loading only when adding images
      }

      const files = Array.from(file);

      const newImages = await Promise.all(
        files.map(async (file) => {
          if (!file.create) {
            if (file instanceof File) {
              const fileCompress = await compressImage(file);
              return {
                data: fileCompress,
                name: file.name,
                alt: file.name,
                url: URL.createObjectURL(file),
                size: (fileCompress.size / 1024).toFixed(0),
              };
            } else {
              console.error("Aucun fichier n'a été téléchargé.");
              return null;
            }
          } else {
            return file;
          }
        })
      );

      const validNewImages = newImages.filter((image) => image !== null);

      let createBoolGallery = false;
      if (dataValue) {
        if (dataValue.create) {
          createBoolGallery = true;
        }
      }

      if (addImage) {
        const combinedImages = [...fields, ...validNewImages];
        const data = { gallery: combinedImages, id_config: id_config, type: 'gallery', create: createBoolGallery };
        onChange({ data: data });
        validNewImages.forEach((data) => append(data));
      } else {
        const data = { gallery: validNewImages, id_config: id_config, type: 'gallery', create: createBoolGallery };
        onChange({ data: data });
      }

      if (addImage) {
        setIsLoading(false); // End loading only when adding images
      }
    };

    const [imagesAdded, setImagesAdded] = useState(false);

    useEffect(() => {
      // Vérifiez si dataValue existe, si le type est 'gallery' et si les images n'ont pas déjà été ajoutées
      if (dataValue && Object.keys(dataValue).length > 0 && type === 'gallery' && !imagesAdded) {
        const galleryArray = JSON.parse(dataValue.gallery);
  
        galleryArray.forEach(image => {
          const imageUpload = {
            alt: image.alt,
            data: image.data,
            name: image.name,
            size: image.size,
            src: image.src_photo,
            url: urlBucketCollectionGallery + image.src_photo,
            type: 'gallery',
            create: true
          };
  
          append(imageUpload);
        });
  
        // Marquez les images comme ajoutées
        setImagesAdded(true);
      }
    }, [dataValue, type, imagesAdded, append]);

    function handleDeleteGallery(indexToDelete) {
      // Supprimer l'image à l'index spécifié
      remove(indexToDelete);
    
      // Récupérer les fichiers restants après suppression
    
      const remainingFiles = fields.filter((_, index) => index !== indexToDelete).map(item => {
        if (item.create) {
          return item;
        }
        return new File([item.data], item.name, { type: item.data.type });
      });

      // Appeler handleGalleryChange avec les fichiers restants et un indicateur de suppression
      handleGalleryChange(remainingFiles, false);
    }

    function handleReorderGallery(e) {
      e.forEach((item, index) => {
        const activeElement = fields[active];
        if (item === activeElement) {
          move(active, index);
          setActive(index);
        }
      });

      const reorderedFiles = e.map(item => {

        if (item.create) {
          return item;
        }
        const file = new File([item.data], item.name, { type: item.data.type });
        return file;
      });
  
      // Passer les fichiers réordonnés à handleGalleryChange
      handleGalleryChange(reorderedFiles, false);
    }

  return (
    <div className='image_blog gallery_blog' style={{backgroundColor : theme.palette.primary.main, color : theme.palette.text.primary, borderColor : theme.palette.primary.main}}>
        {isLoading && 
          <div className='loading_field'>
            <CircularProgress sx={{ color: "#2ec96d" }} />
          </div>
        }
        {fields.length > 0 ? (
          <div>
            <Reorder.Group values={fields} onReorder={handleReorderGallery} className='gallery_contain'>
              {fields.map((image, index) => (
                <Reorder.Item
                  value={image}
                  key={image.name}
                  onDragStart={() => setActive(index)}
                  className="ImageUploaded_contain gallery_box"
                >
                  <img className='Image_uploaded image_gallery' src={image.url} alt={image.alt} />
                  <p className='titlePage gallery_text'><b>{image.name}</b></p>
                  <p className='user_id titlePage gallery_text' style={{color: theme.palette.text.secondary}}>{image.alt}</p>
                  <div className='flex_contain  flex_gallery'>
                    <p style={{color: theme.palette.text.secondary}}>{image.size} Ko</p>
                    <div className='button_contain'>
                    <SecondaryButton theme={theme} className="button_image_blog" type="submit" variant="contained" onClick={() => handleDeleteGallery(index)}>
                      <DeleteIcon/>
                    </SecondaryButton>
                    </div>
                    <a href={image.url} target="_blank" className='link_image_gallery'>
                      <OpenInNewOutlinedIcon style={{color: theme.palette.text.primary}}/>
                    </a> 
                  </div>
                </Reorder.Item>
              ))}
            </Reorder.Group>
            <div className='ImageUploaded_contain gallery_add_contain'>
              <FileUploader handleChange={handleGalleryChange} name="file" types={fileTypes} multiple={true}>
                <div className="DragAndDrop DragAndDropGallery" >
                  <span className="logoUploadImage">
                    <CollectionsIcon />
                  </span>
                  Télécharger ou glisser des photos ici (jpeg, png)
                </div>
              </FileUploader>
            </div>
          </div>
        ) : (
          <FileUploader handleChange={handleGalleryChange} name="file" types={fileTypes} multiple={true}>
            <div className="DragAndDrop DragAndDropField">
              <span className="logoUploadImage">
                <CollectionsIcon />
              </span>
              Télécharger ou glisser des photos ici (jpeg, png)
            </div>
          </FileUploader>
        )}
      </div>
    );
}

export default GalleryUpload;

