import React, { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import "./EditPortfolio.css";
import { saveImagesPortfolio, orderportfolio, compressImage, deleteImage } from "../../../apiImage";
import { SkeletonPortfolio } from "../../../../skeleton/skeleton";
import { FileUploader } from "react-drag-drop-files";
import { LiaCloudUploadAltSolid } from "react-icons/lia";
import { PiControl, PiDotsThreeOutlineVerticalFill } from "react-icons/pi";
import { fetchImagesPortfolio } from "../../../apiImage";
import { useParams } from "react-router-dom";
import { Reorder } from "framer-motion";
import { SnackbarProvider, enqueueSnackbar } from 'notistack'
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import LoadingButton from '@mui/lab/LoadingButton';
import SaveIcon from '@mui/icons-material/Save';
import Button from '@mui/material/Button';













const EditPortfolio = () => {
  let { id } = useParams();

  const theme = useTheme();



  const [LoadingPortfolio, setLoadingPortfolio] = useState(true);
  const [loadingSave, setLoadingSave] = useState(false);


  const { control} = useForm();
  const { fields, remove, append, update, move, swap } = useFieldArray({
    control: control,
    name: "images",
  });

  useEffect(() => {
    const fetchData = async () => {
      for (let i = fields.length - 1; i >= 0; i--) {
        remove(i);
      }
      const imagesData = await fetchImagesPortfolio(id);
      imagesData.forEach((image) => append(image));
      setLoadingPortfolio(false);
    };

    fetchData();
  }, [id]);

  const [initialDate, setInitialDate] = useState(Date.now()); // Date d'initialisation de la page
  const [active, setActive] = useState(0);
  const [changesMade, setChangesMade] = useState(false);

  const fileTypes = ["JPG", "PNG"];

  const handleChange = (files) => {
    if (files instanceof FileList) {
      const fileListArray = Array.from(files);

      fileListArray.forEach(async (file) => {
        
        const fileCompress = await compressImage(file);

        const reader = new FileReader();

        reader.onload = async (e) => {
          const base64Image = e.target.result;
          console.log(fileCompress);

          

          const image = {
            id_portfolio: id,
            id_photo: Date.now(),
            data: base64Image,
            name: id + Date.now() + file.name,
            alt: file.name,
          };

          await append(image);
          setChangesMade(true);
        };

        reader.readAsDataURL(fileCompress);
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
        setChangesMade(true); // Indicate changes made
      }
    });
  };

  const handleSave = async () => {
    setLoadingSave(true);
    let order = 1;
    const imagesToSave = [];
  
    fields.forEach((image) => {
      if (image.id_photo > initialDate) {
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
      await deleteImage(id_photo, "portfolio_image", imageName);
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
      <SnackbarProvider maxSnack={3} autoHideDuration={2000}>
      <FileUploader handleChange={handleChange} name="file" types={fileTypes} multiple={true}>
        <div className="DragAndDrop">
          <span className="logoUploadImage">
            <LiaCloudUploadAltSolid />
          </span>
          Télécharger ou glisser une photo ici (jpeg, png)
        </div>
      </FileUploader>

      <div className="Item_menu">
        <p className="Item_portfolio_element order_element">Ordre</p>
        <p className="Item_portfolio_element alt_element">Texte alternatif</p>
        <p className="Item_portfolio_element name_element">Nom</p>
        <p className="Item_portfolio_element Item_image_menu">Image</p>
        <p className="Item_portfolio_element option_element_menu">Option</p>
      </div>
      <div className="line_horizontal" style={{ backgroundColor: theme.palette.secondary.secondary }}></div>
      <div className="portfolio_edit_place">
        {LoadingPortfolio ? <SkeletonPortfolio /> : <Reorder.Group values={fields} onReorder={handleReorder}>
          {fields.map((image, index) => (
            <Reorder.Item
              value={image}
              key={image.id}
              onDragStart={() => setActive(index)}
            >
              <div className="Item_Portfolio" style={{'--hover-background-color': theme.palette.secondary.secondary}}>
                <p className="Item_portfolio_element order_element">{index}</p>
                <p className="Item_portfolio_element alt_element">{image.alt}</p>
                <p className="Item_portfolio_element name_element">{image.name}</p>
                <img className="Item_image Item_portfolio_element" src={image.data} alt={image.alt} />
                <div className="Item_portfolio_element option_element">
                  <div className="button_option_portfolio">
                  <IconButton aria-label="delete"  onClick={() => {handleDelete(image.id_photo,image.name, index);}}>
                    <DeleteIcon color="secondary"/>
                  </IconButton>
                  </div>
                </div>
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>}
      </div>
      {changesMade && ( // Render save button only if changes are made

        <div className="button_save_contain">

          <Button  onClick={reloadPage}  color="secondary" variant="contained">Annuler</Button>

          <LoadingButton
            loadingPosition="start"
            startIcon={<SaveIcon />}
            loading={loadingSave}
            onClick={ async () => {await handleSave()}}
            color="success"
            variant="contained"
          >
            <span>Enregistrer</span>
          </LoadingButton>
        </div>
      )}
      </SnackbarProvider>
    </div>
    
  );
};

export default EditPortfolio;