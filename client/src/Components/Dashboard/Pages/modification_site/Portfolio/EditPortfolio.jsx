import React, { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import "./EditPortfolio.css";
import { compressImage } from "../../../../../utils/imageUtils";
import {fetchImagesPortfolio, saveImagesPortfolio, orderportfolio, deleteImagePortfolio } from "./apiPortfolio";

import { SkeletonPortfolio } from "../../../../skeleton/skeleton";
import { FileUploader } from "react-drag-drop-files";
import { LiaCloudUploadAltSolid } from "react-icons/lia";
import { useParams } from "react-router-dom";
import { Reorder } from "framer-motion";
import { SnackbarProvider, enqueueSnackbar } from 'notistack'
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import { v4 as uuidv4 } from 'uuid';
import Cookies from 'js-cookie';
import {jwtDecode} from 'jwt-decode'; 
import {DefaultButton, SecondaryButton} from '../../../../../Theme/element';
import { PiSmileyMeltingFill } from "react-icons/pi";




const EditPortfolio = () => {
  const { id } = useParams();


  const theme = useTheme();

  const [LoadingPortfolio, setLoadingPortfolio] = useState(true);
  const [loadingSave, setLoadingSave] = useState(false);


  const { control} = useForm();
  const { fields, remove, append, move } = useFieldArray({
    control: control,
    name: "images",
  });

  useEffect(() => {
    
    const user = Cookies.get('token');
    const decodedUser = jwtDecode(user);
    const fetchData = async () => {
      for (let i = fields.length - 1; i >= 0; i--) {
        remove(i);
      }
      const imagesData = await fetchImagesPortfolio(id, decodedUser.idUser);
      imagesData.forEach((image) => append(image));
    };

    fetchData();
  }, [id]);

  useEffect(() => {
    if (fields.length > 0) {
      setLoadingPortfolio(false);
    }
  }, [fields]);


  const [initialDate, setInitialDate] = useState(Date.now()); // Date d'initialisation de la page
  const [active, setActive] = useState(0);
  const [changesMade, setChangesMade] = useState(false);

  const fileTypes = ["JPG", "PNG"];

  const handleChange = (files) => {
    if (files instanceof FileList) {
      const fileListArray = Array.from(files);
  
      fileListArray.forEach(async (file) => {
        const fileCompress = await compressImage(file);
  
        const image = {
          id_portfolio: id,
          id_photo: uuidv4(),
          data: fileCompress,
          name: file.name,
          alt: file.name,
          size: (fileCompress.size / 1024).toFixed(0),
          publicationDate: Date.now(),
        };
  
        await append(image);
        setChangesMade(true);
      });
    } else {
      console.error("Aucun fichier n'a été téléchargé.");
    }
  };

  const handleReorder = (e) => {
    e.map((item, index) => {
      const activeElement = fields[active];
      if (item === activeElement) {
        move(active, index);
        setActive(index);
        setChangesMade(true);
      }
    });
  };

  const handleSave = async () => {
    setLoadingSave(true);
    let order = 1;
    const imagesToSave = [];

  
    fields.forEach((image) => {
      if (image.publicationDate > initialDate) {
        imagesToSave.push(image);
      }
      order++;
    });

    try {

      for (const image of imagesToSave) {
        try {
          await saveImagesPortfolio(image);
          enqueueSnackbar(`${image.name} sauvegardée avec succès.`, { variant: 'success' });
        } catch (error) {
          console.error(error);
          enqueueSnackbar(`Erreur lors de l'enregistrement de ${image.name} `, { variant: 'error' });
        }
      }
  
      // Attendre que toutes les opérations orderportfolio soient terminées
      const orderPromises = fields.map((image, index) => orderportfolio(index + 1, image.id_photo));
      await Promise.all(orderPromises);
  
      setChangesMade(false);
      setLoadingSave(false);
      setInitialDate(Date.now());
    } catch (error) {
      console.error("Une erreur s'est produite lors de l'enregistrement des images :", error);
      // Gérer l'erreur
    }

  };

  const handleDelete = async (id_photo, imageName, index) => {
    try {
      await deleteImagePortfolio(id_photo, "portfolio_image", imageName);
      remove(index);

      enqueueSnackbar('Image supprimée avec succès.', { variant: 'success' });

    } catch (error) {
      console.error('Erreur lors de la suppression de l\'image :', error);
      enqueueSnackbar('Erreur lors de la suppression de l\'image.', { variant: 'error' });
    }
  };

  const reloadPage = () => {
    window.location.reload();
  }

  return (
    <div className="editPortfolio_contain">
      <div className="header_modification">
          <h3>Ajout de photo</h3>
          <div className="button_save_contain">
              <SecondaryButton onClick={reloadPage}  variant="contained" theme={theme}>Annuler</SecondaryButton>
              <DefaultButton type="submit" variant="contained" onClick={ async () => {await handleSave()}}><span>Enregitrer</span></DefaultButton>
          </div>
      </div>
      <SnackbarProvider maxSnack={3} autoHideDuration={2000}>
      <FileUploader handleChange={handleChange} name="file" types={fileTypes} multiple={true}>
        <div className="DragAndDrop" >
          <span className="logoUploadImage">
            <LiaCloudUploadAltSolid />
          </span>
          Télécharger ou glisser une photo ici (jpeg, png)
        </div>
      </FileUploader>

      <div className="Item_menu">
        <p style={{color: theme.palette.text.secondary}} className="Item_portfolio_element order_element">Ordre</p>
        <p style={{color: theme.palette.text.secondary}} className="Item_portfolio_element alt_element">Texte alternatif</p>
        <p style={{color: theme.palette.text.secondary}} className="Item_portfolio_element name_element">Nom</p>
        <p style={{color: theme.palette.text.secondary}} className="Item_portfolio_element option_element_menu">Taille</p>
        <p style={{color: theme.palette.text.secondary}} className="Item_portfolio_element Item_image_menu">Image</p>
        <p style={{color: theme.palette.text.secondary}} className="Item_portfolio_element option_element_menu">Option</p>
      </div>
      <div className="line_horizontal" style={{ backgroundColor: theme.palette.text.secondary }}></div>
      <div className="portfolio_edit_place">
        {LoadingPortfolio ? (
          <SkeletonPortfolio />
        ) : fields.length === 0 ? (
          <div className="noImageContain">
            <PiSmileyMeltingFill style={{ fontSize: 50, color: theme.palette.text.primary }}/>
            <p style={{color: theme.palette.text.primary}}>Votre portfolio est vide.</p>  
          </div>
        ) : (
          <Reorder.Group values={fields} onReorder={handleReorder}>
            {fields.map((image, index) => {
              const isBlob = image.data instanceof Blob;
              const src = isBlob ? URL.createObjectURL(image.data) : image.data;

              return (
                <Reorder.Item
                  value={image}
                  key={image.id}
                  onDragStart={() => setActive(index)}
                >
                  <div className="Item_Portfolio" style={{ '--hover-background-color': theme.palette.secondary.secondary }}>
                    <p className="Item_portfolio_element order_element">{index}</p>
                    <p className="Item_portfolio_element alt_element">{image.alt}</p>
                    <p className="Item_portfolio_element name_element">{image.name}</p>
                    <p className="Item_portfolio_element option_element_menu">{image.size} Ko</p>

                    <img className="Item_image Item_portfolio_element" src={src} alt={image.alt} />
                    <div className="Item_portfolio_element option_element">
                      <div className="button_option_portfolio">
                        <IconButton aria-label="delete" onClick={() => handleDelete(image.id_photo, image.name, index)}>
                          <DeleteIcon style={{ color: theme.palette.text.primary }} />
                        </IconButton>
                      </div>
                    </div>
                  </div>
                </Reorder.Item>
              );
            })}
          </Reorder.Group>
        )}
      </div>
      </SnackbarProvider>
    </div>
    
  );
};

export default EditPortfolio;