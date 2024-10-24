import React, { useState, useEffect } from 'react';
import config from '../../../../../config';
import { v4 as uuidv4 } from 'uuid';
import { FileUploader } from "react-drag-drop-files";
import { SecondaryButton } from '../../../../../Theme/element';
import DeleteIcon from '@mui/icons-material/Delete';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import VideocamIcon from '@mui/icons-material/Videocam';
import './Field.css';

const VideoUpload = ({ id_blog_page,type, id_config, onChange, slugValue, fieldValue, dataValue, id_collection_ref, theme }) => {
    const videoTypes = ["MP4"];
    const apiUrl = config.apiUrl;

    const [videoUploaded, setVideoUploaded] = useState([]);
    const [createBoolVideo, setCreateBoolVideo] = useState('')
    const handleVideoChange = async (file, idToReplace) => {

      if (file instanceof File) {

        const data = {
          id_blog_page: id_blog_page,
          id_config: id_config,
          id_video: uuidv4(), // Assurez-vous que cela génère un ID unique pour chaque nouvelle image
          data: file,
          name: file.name,
          alt: file.name,
          url: URL.createObjectURL(file),
          size: (file.size / 1024).toFixed(0),
          type: 'video',
          create : createBoolVideo
        };

        setVideoUploaded(prevVideoq => {
          const foundIndex = prevVideoq.findIndex(img => img.id_config === idToReplace);
          if (idToReplace !== undefined && foundIndex !== -1) {
            onChange({ data });
            return prevVideoq.map((img, index) => index === foundIndex ? data : img);
          } else {
            onChange({ ...prevVideoq, data });

            return [...prevVideoq, data];
          }
        });
      } else {
        console.error("Aucun fichier n'a été téléchargé.");
      }
    };
    useEffect(() => {
      // Vérifiez si dataValue existe et si le type est 'image'
      if (dataValue && Object.keys(dataValue).length > 0 && type === 'video') {

        const initialImages = [{
          id_blog_page: dataValue.id_blog_page || id_blog_page, // Utilisez id_blog_page de dataValue ou celui passé en prop
          id_config: dataValue.id_config || id_config, // Utilisez id_config de dataValue ou celui passé en prop
          id_video: uuidv4(), // Générez un nouvel UUID pour l'image
          data: dataValue.data, // Utilisez les données d'image en base64 de dataValue
          name: dataValue.name, // Utilisez le nom de l'image de dataValue
          alt: dataValue.alt, // Utilisez le texte alternatif de l'image de dataValue
          src: dataValue.src,
          size: dataValue.size,
          type: 'video' ,
        }];

        // Initialisez l'état imagesUploaded avec les données de l'image
        setVideoUploaded(initialImages);
        setCreateBoolVideo(dataValue.create);
      }
    }, [dataValue, type, id_blog_page, id_config]);
    function handleDeleteVideo(idToDelete) {
      setVideoUploaded(imagesUploaded.filter(video => video.id_config !== idToDelete));
      const data = {
        id_config: id_config,
        type: 'video'
      }
      onChange({ data }, true);
    }

    return (
        <div className='image_blog' style={{backgroundColor : theme.palette.primary.main, color : theme.palette.text.primary, borderColor : theme.palette.primary.main}}>
        {videoUploaded.length > 0 ? (
          videoUploaded.map((video) => ( // Map over the images array
            <div key={video.id_config} className="ImageUploaded_contain">
              <video
                  className='Image_uploaded'
                  src={video.url || `${apiUrl}/streamVideo/${video.src}`}
                  controls
                  alt={video.alt}
              />
              <div className='info_image_blog'>
                <div>
                  <p><b>{video.name}</b></p>
                  <p style={{color: theme.palette.text.secondary}}>{video.alt}</p>
                </div>
                <div className='flex_contain flex_image'>
                  <p style={{color: theme.palette.text.secondary}}>{(video.size / 1024).toFixed(2)} Mo</p>
                  <a href={video.url ? video.url : `${apiUrl}/streamVideo/${video.src}`} target="_blank">
                    <OpenInNewOutlinedIcon style={{color: theme.palette.text.primary}}/>
                  </a>                                  
                </div>
                <div className='button_contain'>
                <input className='input_image_blog' type="file" id={`file-input-${video.id_config}`} onChange={(e) => handleVideoChange(e.target.files[0], video.id_config)} accept="video/*"/>
                <SecondaryButton theme={theme} className="button_image_blog" type="submit" variant="contained"><label className='label_input_image_blog' htmlFor={`file-input-${video.id_config}`}/><AutorenewIcon/> Remplacer</SecondaryButton>
                <SecondaryButton theme={theme} className="button_image_blog" type="submit" variant="contained" onClick={() => handleDeleteVideo(video.id_config)}><DeleteIcon/> Supprimer</SecondaryButton>
                </div>
              </div>
            </div>
          ))
        ) : (
          <FileUploader handleChange={handleVideoChange} name="file" types={videoTypes} multiple={false}>
            <div className="DragAndDrop DragAndDropField">
              <span className="logoUploadImage">
                <VideocamIcon />
              </span>
              Télécharger ou glisser une video ici (mp4)
            </div>
          </FileUploader>
        )}
      </div>
    );
};

export default VideoUpload;