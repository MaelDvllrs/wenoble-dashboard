import React, { useState, useEffect, useRef } from 'react';
import { fetchUserInfo, updateUserInfo, changeUserPassword } from './apiAccount'; // Assurez-vous d'avoir ces fonctions dans votre fichier API
import { useTheme } from '@mui/material/styles';
import Cookies from 'js-cookie';
import {jwtDecode} from 'jwt-decode';
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import { DefaultButton, SecondaryButton, LoginTextField } from '../../../../Theme/element';
import './Account.css';
import Avatar from '@mui/material/Avatar';
import config from '../../../../config';
import { compressImage } from '../../../../utils/imageUtils';
import { SnackbarProvider, enqueueSnackbar } from 'notistack'


const Account = () => {
  const theme = useTheme();
  const [userInfo, setUserInfo] = useState(null);
  const apiUrl = config.apiUrl;
  const [password, setPassword] = useState({ current: '', new: '', confirm: '' });
  const [message, setMessage] = useState('');
  const token = Cookies.get('token');
  const [open, setOpen] = useState(false);
  const [openPassword, setOpenPassword] = useState(false);
  const [fieldToEdit, setFieldToEdit] = useState('');
  const fileInputRef = useRef(null);
  const [isModified, setIsModified] = useState(false);

  const [userInfoNew, setUserInfoNew] = useState(false);

  const [newFieldValue, setNewFieldValue] = useState('');


  useEffect(() => {
    const fetchData = async () => {
      const userData = await fetchUserInfo(token);
      setUserInfo(jwtDecode(userData));
    };
    fetchData();
  }, [token]);

  const handleOpen = (field) => {
    setFieldToEdit(field);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleOpenPassword = () => {
    setOpenPassword(true);
  };

  const handleClosePassword = () => {
    setOpenPassword(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewFieldValue(value);
  };

  const handleInputValidate = async (e) => {
    e.preventDefault();
    setUserInfoNew((prevUserInfoNew) => ({
      ...prevUserInfoNew,
      [fieldToEdit]: newFieldValue,
    }));
    setIsModified(true);
    handleClose();
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPassword({ ...password, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const response = await updateUserInfo(userInfoNew, token);
    setMessage(response.message);
    enqueueSnackbar(`Informations sauvegardée avec succès.`, { variant: 'success' });
    setIsModified(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (password.new !== password.confirm) {
      setMessage('Les mots de passe ne correspondent pas');
      return;
    }
    const response = await changeUserPassword(userInfo.username, password.current, password.new);
    setMessage(response.message);
    handleClosePassword();
  };

  const handleAvatarClick = () => {
    fileInputRef.current.click();
  };


  const handleFileChange = async (file) => {
    if (file) {
      try {
        const fileCompress = await compressImage(file);
  
        const data = {
          data: fileCompress,
          url: URL.createObjectURL(file),
          name: file.name,
        };
    
        setUserInfoNew((prevUserInfoNew) => ({
          ...prevUserInfoNew,
          image: data,
        }));
  
        setIsModified(true);
      } catch (error) {
        console.error("Erreur lors du téléchargement de l'image :", error);
      }
    } else {
      console.error("Aucun fichier n'a été téléchargé.");
    }
  };

  return (
    <div className="account-container">
      {userInfo === null ? (
        <p>Chargement...</p>
      ) : (
        <SnackbarProvider maxSnack={3} autoHideDuration={2000}>
        <div className='account-info-container'>
          <div className='account-info-section'>
            <h2>Mon Compte</h2>
            <div className="account-info" style={{ backgroundColor: theme.palette.primary.main, boxShadow : theme.palette.shadow.main }}>
              <div className='bannerAccount'></div>
              <div className='accountInfoBox accountInfoBasicBox' style={{ borderColor: theme.palette.primary.third }}>
                {userInfo.image && userInfo.image[0] && userInfo.image[0].src_profile_image || userInfoNew.image ? (
                  <img
                    src={userInfoNew.image ? userInfoNew.image.url : `${apiUrl}/media/profile/${userInfo.image[0].src_profile_image}`}
                    className='profile_photo account_photo'
                    style={{ borderColor: theme.palette.primary.main }}
                    crossOrigin="anonymous"
                    onClick={handleAvatarClick}
                  />
                ) : (
                  <Avatar
                    alt="Avatar par défaut"
                    className='profile_photo account_photo'
                    onClick={handleAvatarClick}
                  />
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileChange(e.target.files[0])}
                />
                <div>
                  <p><b>{userInfo.user[0].username}</b></p>
                  <p style={{ color: theme.palette.text.secondary }}>#{String(userInfo.user[0].id_user).padStart(4, '0')}</p>
                </div>
              </div>
              <div className='accountInfoBox'>
                <div>
                  <p style={{ color: theme.palette.text.secondary, fontSize: "0.8rem" }}><b>NOM D'UTILISATEUR</b></p>
                  <p>@{userInfo.user[0].username}</p>
                </div>
              </div>
              <div className='accountInfoBox'>
                <div>
                  <p style={{ color: theme.palette.text.secondary, fontSize: "0.8rem" }}><b>EMAIL</b></p>
                  <p>{userInfoNew.email ? userInfoNew.email : userInfo.user[0].email}</p>
                  <p style={{ color: theme.palette.text.secondary, fontSize: "0.8rem" }}>
                    L'e-mail sert également à recevoir les messages du formulaire de contact.
                  </p>
                </div>
                <SecondaryButton onClick={() => handleOpen('email')}>Modifier</SecondaryButton>
              </div>
              <div className='accountInfoBox'>
                <div>
                  <p style={{ color: theme.palette.text.secondary, fontSize: "0.8rem" }}><b>WEBSITE</b></p>
                  <p>{userInfo.user[0].website}</p>
                </div>
              </div>
            </div>
          </div>
          <div className='account-info-section none-section'>
            <h2>Mot de passe</h2>
            <SecondaryButton onClick={handleOpenPassword}>Changer le mot de passe</SecondaryButton>
          </div>
          {isModified && (
            <div className="accountSave" style={{ backgroundColor: theme.palette.primary.main, borderColor: theme.palette.primary.third }}>
              Enregistrer les modifications
              <DefaultButton onClick={handleSubmit}>Enregistrer</DefaultButton>
            </div>
          )}
        </div>
        </SnackbarProvider>
      )}

      <Modal open={open} onClose={handleClose}>
        <Box sx={{ ...modalStyle, width: 400, backgroundColor: theme.palette.primary.main, borderColor: theme.palette.primary.third }} className="popupAccount">
          <p><b>Modifier {fieldToEdit}</b></p>
          <form onSubmit={handleInputValidate}>
            <p style={{ color: theme.palette.text.secondary }}>Entrez le nouveau {fieldToEdit} puis entrez votre mot de passe</p>
            <LoginTextField
              label={fieldToEdit}
              name={fieldToEdit}
              onChange={handleInputChange}
              fullWidth
              margin="normal"
            />
            <DefaultButton type="submit" style={{ marginTop: "1rem" }}>Valider</DefaultButton>
          </form>
        </Box>
      </Modal>

      <Modal open={openPassword} onClose={handleClosePassword}>
        <Box sx={{ ...modalStyle, width: 400, backgroundColor: theme.palette.primary.main, borderColor: theme.palette.primary.third }} className="popupAccount">
          <h2>Changer le mot de passe</h2>
          <form onSubmit={handleChangePassword}>
            <LoginTextField
              label="Mot de passe actuel"
              name="current"
              type="password"
              value={password.current}
              onChange={handlePasswordChange}
              fullWidth
              margin="normal"
            />
            <LoginTextField
              label="Nouveau mot de passe"
              name="new"
              type="password"
              value={password.new}
              onChange={handlePasswordChange}
              fullWidth
              margin="normal"
            />
            <LoginTextField
              label="Confirmer le nouveau mot de passe"
              name="confirm"
              type="password"
              value={password.confirm}
              onChange={handlePasswordChange}
              fullWidth
              margin="normal"
            />
            {message && <p>{message}</p>}
            <DefaultButton type="submit" style={{ marginTop: "1rem" }}>Changer le mot de passe</DefaultButton>
          </form>
        </Box>
      </Modal>
    </div>
  );
};

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  boxShadow: 24,
  p: 4,
};

export default Account;