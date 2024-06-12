import React, { useState, useEffect, useRef  } from "react"
import { useForm, useFieldArray } from "react-hook-form";
import { useParams } from "react-router-dom";
import { fetchImagesPage, fetchTextePage, compressImage, saveImagePage } from "../../../apiImage";
import "./EditPage.css";
import TextField from '@mui/material/TextField';
import { useTheme } from '@mui/material/styles';
import { styled } from '@mui/material/styles';
import { LiaCloudUploadAltSolid } from "react-icons/lia";
import { PiPencilSimpleBold } from "react-icons/pi";    
import { motion, AnimatePresence } from 'framer-motion';
import LoadingButton from '@mui/lab/LoadingButton';
import SaveIcon from '@mui/icons-material/Save';
import Button from '@mui/material/Button';
import { saveTextPage } from "../../../apiImage";
import { v4 as uuidv4 } from 'uuid';




const EditPage = () => {

    let { id } = useParams();
    const theme = useTheme();

    const [LoadingPage, setLoadingPage] = useState(true);
    const { control} = useForm();

    const { fields: fieldsImage, remove: removeImage, append: appendImage } = useFieldArray({
      control: control,
        name: "images",
    });

    const { fields: fieldsText, remove: removeText, append: appendText } = useFieldArray({
      control: control,
      name: "textes",
  });


    
    const [showTooltip, setShowTooltip] = useState(false);

    const [selectedImages, setSelectedImages] = useState({});
    const [modifiedData, setModifiedData] = useState({});


    const [modifiedText, setModifiedText] = useState({});


    const [inputValues, setInputValues] = useState({});

    const [isHovering, setIsHovering] = useState({});
    const tooltipTimeout = useRef();

    const [saveCountImage, setSaveCountImage] = useState(0);




    const [isCardImageOpen, setisCardImageOpen] = useState(false);
    const [isCardTextOpen, setisCardTextOpen] = useState(false);


    const [currentImageId, setCurrentImageId] = useState(null);
    const [currentTextId, setCurrentTextId] = useState(null);

    const [loadingSave, setLoadingSave] = useState(false);
    const inputRef = useRef();

    const [activeMenu, setActiveMenu] = useState('Image');

    const handleMenuClick = (menuName) => {
      setActiveMenu(menuName);
    };


    const reloadPage = () => {
      window.location.reload();
    }


    // --------------MODIFICATION IMAGE----------------
  const handleImageChange = async (event, imageId, imageAlt) => {
    const file = event.target.files[0];
    const compressedFile = await compressImage(file); 
  
    const imageData = URL.createObjectURL(compressedFile);
    setSelectedImages(prevState => ({
      ...prevState,
      [imageId]: imageData
    }));
  
    setModifiedData(prevState => ({
      ...prevState,
      [imageId]: {
        ...prevState[imageId],
        id: imageId,
        data: compressedFile, 
        name: file.name,
        alt: imageAlt.alt,
        src: uuidv4(),
      }
    }));
  };


  const handleSaveText = () => {
    setModifiedData(prevData => ({
      ...prevData,
      [currentImageId]: {
        ...prevData[currentImageId],
        id: currentImageId,
        alt: inputRef.current.value
      }
    }));
    setisCardImageOpen(false);
  };


  const handleSave = async () => {

    try {
      // Convertir l'objet modifiedData en tableau
      Object.values(modifiedData).forEach(async (image) => {

        await saveImagePage(image);
      });
      setLoadingSave(false);
      setModifiedData({});
      setSaveCountImage(saveCount => saveCount + 1);
    } catch (error) {
      // Gérer l'erreur ici
      console.error(error);
    }
  };



  const handleOpenCard = (imageId) => {
    setCurrentImageId(imageId);
    setisCardImageOpen(true);
  };

  const handleCloseCard = () => {
    setisCardImageOpen(false);
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 }
  };


  const CssTextField = styled(TextField)({
      '& .MuiOutlinedInput-root': {
        '& fieldset': {
          borderColor: theme.palette.secondary.main,
      },
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      for (let i = fieldsImage.length - 1; i >= 0; i--) {
        removeImage(i);
      }
      const imagesData = await fetchImagesPage(id);
      imagesData.forEach((image) => {
        appendImage({
          ...image,
          id: image.id_photo, 
        });
      });
      setLoadingPage(false);
    };
  
    fetchData();
  }, [id, saveCountImage]);


  //-----------MODIFICATION TEXTE----------------
  useEffect(() => {

    const fetchData = async () => {
      for (let i = fieldsText.length - 1; i >= 0; i--) {
        removeText(i);
      }
      const textData = await fetchTextePage(id);
      textData.forEach((text) => {
        appendText({
          ...text,
          id: text.id_text, 
        });
      });
      setLoadingPage(false);
    };
  
    fetchData();
  }, [id]);





  const handleOpenCardText = (textId) => {
    setCurrentTextId(textId);
    setisCardTextOpen(true);
  };

  const handleCloseCardText = () => {
    setisCardTextOpen(false);
  };


  const handleSaveTextText = () => {
    setModifiedText(prevData => ({
      ...prevData,
      [currentTextId]: {
        ...prevData[currentTextId],
        id: currentTextId,
        text: inputRef.current.value
      }
    }));
    setisCardTextOpen(false);
  };



  const handleSaveTextAll = async () => {
    try {
      // Convertir l'objet modifiedData en tableau
      const dataToSave = Object.values(modifiedText);
  
      // Appeler la fonction saveImagePage avec dataToSave
      const response = await saveTextPage(dataToSave);
  
      // Gérer la réponse ici
      console.log(response);

    } catch (error) {
      // Gérer l'erreur ici
      console.error(error);
    }
  };
  


    return(
        <div className="editPage_contain">
          <div className="editPage_menu">
          <div 
            className={`editPage_menu_element ${activeMenu === 'Image' ? 'editPage_menu_active' : ''}`} 
            onClick={() => handleMenuClick('Image')}
          >
            Image
          </div> 
          <div 
            className={`editPage_menu_element ${activeMenu === 'Texte' ? 'editPage_menu_active' : ''}`} 
            onClick={() => handleMenuClick('Texte')}
          >
            Texte
          </div>
          </div>
          <div 
            className="editPage_contain_page" 
            style={{ transform: `translateX(${activeMenu === 'Texte' ? '-50%' : '0'})` }}
          >
          <div className="editPage_contain_element">
            {fieldsImage.map((image) => (
                <div key={image.id_photo} className="editPage_image_contain">
                    <div className="input_page_image_box">
                      <label htmlFor={`page_image_${image.id_photo}`} className="label_page_image"><LiaCloudUploadAltSolid /></label> 
                      <input 
                        id={`page_image_${image.id_photo}`} 
                        className="input_profile_image" 
                        type="file" 
                        onChange={(e) => handleImageChange(e, image.id_photo, {alt: modifiedData[image.id_photo]?.alt || image.alt})}                      
                        accept="image/*"
                      />
                      <img className="editPage_image" src={selectedImages[image.id_photo] || image.data} alt={image.name} />
                    </div>
                    <div className="editPage_image_infos">
                        <div className="tooltip-container"
                          onMouseEnter={() => {
                            const isHoveringCurrent = true;
                            setIsHovering(prevState => ({ ...prevState, [image.id_photo]: isHoveringCurrent }));
                            tooltipTimeout.current = setTimeout(() => {
                              if (isHoveringCurrent) {
                                setShowTooltip(prevState => ({ ...prevState, [image.id_photo]: true }));
                              }
                            }, 1000);
                          }}
                          onMouseLeave={() => {
                            setIsHovering(prevState => ({ ...prevState, [image.id_photo]: false }));
                            clearTimeout(tooltipTimeout.current);
                            setShowTooltip(prevState => ({ ...prevState, [image.id_photo]: false }));
                          }}
                        >
                          <p className="editPage_image_name">{modifiedData[image.id_photo]?.name || image.name}</p>
                          {showTooltip[image.id_photo] && (
                            <div className="tooltip">
                              {modifiedData[image.id_photo]?.name || image.name}
                            </div>
                          )}
                        </div>
                        <div className="editPage_image_alt" onClick={() => handleOpenCard(image.id_photo)}><p className="editPage_alt_name">{modifiedData[image.id_photo]?.alt || image.alt}</p><PiPencilSimpleBold className="pencil-icon"/></div>
                    </div>
                    <div className="editPage_image_actions">
                    </div>
                </div> 
            ))}
            {Object.keys(modifiedData).length > 0 && (
              <div className="button_save_contain">
                <Button onClick={reloadPage} color="secondary" variant="contained">Annuler</Button>
                <LoadingButton
                  loadingPosition="start"
                  startIcon={<SaveIcon />}
                  loading={loadingSave}
                  onClick={handleSave}
                  color="success"
                  variant="contained"
                >
                  <span>Enregistrer</span>
                </LoadingButton>
              </div>
            )}
          </div>
          <div className="editPage_contain_element">
            {fieldsText.map((text) => (
              <div key={text.id_text} className="editPage_text_contain">
              <div className="editPage_text_button" onClick={() => handleOpenCardText(text.id_text)}><p className="editPage_text"></p><PiPencilSimpleBold className="pencil-icon"/></div>

                <div className="editPage_text_infos">
                  <div className="editPage_text">{text.id_text} {modifiedText[text.id_text]?.text || text.text}</div>
                </div>
              </div>
            ))}
            {Object.keys(modifiedText).length > 0 && (
              <div className="button_save_contain">
                <Button onClick={reloadPage} color="secondary" variant="contained">Annuler</Button>
                <LoadingButton
                  loadingPosition="start"
                  startIcon={<SaveIcon />}
                  loading={loadingSave}
                  onClick={handleSaveTextAll}
                  color="success"
                  variant="contained"
                >
                  <span>Enregistrer</span>
                </LoadingButton>
              </div>
            )}
          </div>
          </div>

          <AnimatePresence>
            {isCardImageOpen && (

              <div className="cardText_contain">
                <motion.div
                  className="cardText" 
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={cardVariants}>
                  <CssTextField 
                    className="input_alt_text"
                    id="outlined-basic" 
                    variant="outlined"
                    sx={{ label: { color: theme.palette.secondary.main }}}
                    color="secondary"
                    defaultValue={modifiedData[currentImageId]?.alt || fieldsImage.find((image) => image.id_photo === currentImageId).alt}                  
                    multiline
                    inputRef={inputRef}
                  />

                  <div className="button_save_contain">

                    <Button  onClick={handleCloseCard}  color="secondary" variant="contained">Annuler</Button>

                    <LoadingButton
                      loadingPosition="start"
                      startIcon={<SaveIcon />}
                      loading={loadingSave}
                      onClick={handleSaveText}
                      color="success"
                      variant="contained"
                    >
                      <span>Enregistrer</span>
                    </LoadingButton>
                  </div>  
                </motion.div>
              </div>
          )}
          </AnimatePresence>

          <AnimatePresence>
            {isCardTextOpen && (

              <div className="cardText_contain">
                <motion.div
                  className="cardText" 
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={cardVariants}>
                  <CssTextField 
                    className="input_alt_text"
                    id="outlined-basic" 
                    variant="outlined"
                    sx={{ label: { color: theme.palette.secondary.main }}}
                    color="secondary"
                    defaultValue={modifiedText[currentTextId]?.text || fieldsText.find((text) => text.id_text === currentTextId).text}                  
                    multiline
                    inputRef={inputRef}
                  />

                  <div className="button_save_contain">

                    <Button  onClick={handleCloseCardText}  color="secondary" variant="contained">Annuler</Button>

                    <LoadingButton
                      loadingPosition="start"
                      startIcon={<SaveIcon />}
                      loading={loadingSave}
                      onClick={handleSaveTextText}
                      color="success"
                      variant="contained"
                    >
                      <span>Enregistrer</span>
                    </LoadingButton>
                  </div>  
                </motion.div>
              </div>
          )}
          </AnimatePresence>
        </div>
    ) 
}

export default EditPage