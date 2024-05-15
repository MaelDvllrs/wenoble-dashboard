import React, { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import "./EditPortfolio.css";
import { saveImagesPortfolio, orderportfolio } from "../../apiImage";

import { FileUploader } from "react-drag-drop-files";
import { LiaCloudUploadAltSolid } from "react-icons/lia";
import { PiControl, PiDotsThreeOutlineVerticalFill } from "react-icons/pi";
import { fetchImagesPortfolio } from "../../apiImage";
import { useParams } from "react-router-dom";
import { Reorder } from "framer-motion";


const EditPortfolio = () => {
  let { id } = useParams();


  const { register, control } = useForm();
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
        const reader = new FileReader();

        reader.onload = async (e) => {
          const base64Image = e.target.result;

          const image = {
            id_portfolio: id,
            id_photo: Date.now(),
            data: base64Image,
            name: file.name,
            alt: file.name,
          };

          await append(image);
          setChangesMade(true);
        };

        reader.readAsDataURL(file);
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
    let order = 1;
    const imagesToSave = [];
  
    fields.forEach((image) => {
      if (image.id_photo > initialDate) {
        imagesToSave.push(image);
      }
      order++;
    });
  
    try {
      await Promise.all(imagesToSave.map(saveImagesPortfolio));
      order = 1;
      imagesToSave.forEach((image) => {
        console.log(image);
        orderportfolio(order, image.id_photo);
        order++;
      });
      setChangesMade(false);
    } catch (error) {
      console.error("Une erreur s'est produite lors de l'enregistrement des images :", error);
      // Gérer l'erreur
    }
  };

  const reloadPage = () => {
    window.location.reload();
  }

  return (
    <div className="editPortfolio_contain">
      <FileUploader handleChange={handleChange} name="file" types={fileTypes} multiple={true}>
        <div className="DragAndDrop">
          <span className="logoUploadImage">
            <LiaCloudUploadAltSolid />
          </span>
          Télécharger ou glisser une photo ici
        </div>
      </FileUploader>

      <div className="Item_menu">
        <p className="Item_portfolio_element order_element">Ordre</p>
        <p className="Item_portfolio_element alt_element">Texte alternatif</p>
        <p className="Item_portfolio_element name_element">Nom</p>
        <p className="Item_portfolio_element Item_image_menu">Image</p>
        <p className="Item_portfolio_element option_element_menu">Option</p>
      </div>
      <div className="line_horizontal"></div>
      <div className="portfolio_edit_place">
        <Reorder.Group values={fields} onReorder={handleReorder}>
          {fields.map((image, index) => (
            <Reorder.Item
              value={image}
              key={image.id}
              onDragStart={() => setActive(index)}
            >
              <div className="Item_Portfolio">
                <p className="Item_portfolio_element order_element">{index}</p>
                <p className="Item_portfolio_element alt_element">{image.alt}</p>
                <p className="Item_portfolio_element name_element">{image.name}</p>
                <img className="Item_image Item_portfolio_element" src={image.data} alt={image.alt} />
                <PiDotsThreeOutlineVerticalFill className="Item_portfolio_element option_element" />
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      </div>

      {changesMade && ( // Render save button only if changes are made
        <div className="button_save_contain">
          <div className="button_save cancel" onClick={reloadPage}>Annuler</div>
          <div className="button_save save" onClick={handleSave}>Enregistrer</div>
        </div>
      )}
    </div>
  );
};

export default EditPortfolio;