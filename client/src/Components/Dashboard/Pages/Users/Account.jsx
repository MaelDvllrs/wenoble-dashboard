import React, { useState, useEffect, useRef } from 'react';
import { fetchUserInfo, updateUserInfo, changeUserPassword } from './apiAccount'; // Assurez-vous d'avoir ces fonctions dans votre fichier API
import { useTheme } from '@mui/material/styles';
import Cookies from 'js-cookie';
import {jwtDecode} from 'jwt-decode';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import {DefaultButton, SecondaryButton, LoginTextField} from '../../../../Theme/element';
import './Account.css';
import Avatar from '@mui/material/Avatar';
import config from '../../../../config';




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


  useEffect(() => {
    const fetchData = async () => {
      const userData = await fetchUserInfo(token);
      console.log(userData);
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
    setUserInfo({ ...userInfo, [name]: value });
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPassword({ ...password, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log(userInfo);
    const response = await updateUserInfo(userInfo);
    setMessage(response.message);
    handleClose();
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (password.new !== password.confirm) {
      setMessage('Les mots de passe ne correspondent pas');
      return;
    }
    const response = await changeUserPassword(username, password.current, password.new);
    setMessage(response.message);
    handleClosePassword();
  };


  
  return (
    <div className="account-container">
      
      {userInfo === null ? (
        <p>Chargement...</p>
      ) : (
        <div className='account-info-container'>
          <h2>Mon Compte</h2>
          <div className="account-info" style={{ backgroundColor: theme.palette.primary.main, borderColor: theme.palette.primary.third }}>
            <div className='bannerAccount'></div>
            <div className='accountInfoBox accountInfoBasicBox' style={{ borderColor: theme.palette.primary.third }}>
              {
                userInfo.image[0].src_profile_image ? (
                  <img
                    src={`${apiUrl}/media/profile/${userInfo.image[0].src_profile_image}`}
                    className='profile_photo account_photo'
                    style={{borderColor: theme.palette.primary.main}}
                />
                ) : (
                  <Avatar alt="Avatar par défaut" className='profile_photo account_photo'/>
                )
              }
              <div>
                <p><b>{userInfo.user[0].username}</b></p>
                <p style={{color : theme.palette.text.secondary}}>#{String(userInfo.user[0].id_user).padStart(4, '0')}</p>
              </div>
            </div>
            <div className='accountInfoBox'>
              <div>
                <p style={{color : theme.palette.text.secondary, fontSize: "0.8rem"}}><b>NOM D'UTILISATEUR</b></p>
                <p>{userInfo.user[0].username}</p>
              </div>
            </div>
            <div className='accountInfoBox'>
              <div>
                <p style={{color : theme.palette.text.secondary, fontSize: "0.8rem"}}><b>EMAIL</b></p>
                <p>{userInfo.user[0].email}</p>
                <p style={{color : theme.palette.text.secondary, fontSize: "0.8rem"}}>
                L'e-mail sert également à recevoir les messages du formulaire de contact.
                </p>
              </div>
              <SecondaryButton onClick={() => handleOpen('email')}>Modifier</SecondaryButton>
            </div>
            <div className='accountInfoBox'>
              <div>
                <p style={{color : theme.palette.text.secondary, fontSize: "0.8rem"}}><b>WEBSITE</b></p>
                <p>{userInfo.user[0].website}</p>
              </div>
            </div>
          </div>
          <h2>Mot de passe</h2>
          <SecondaryButton onClick={handleOpenPassword}>Changer le mot de passe</SecondaryButton>
        </div>
      )}
      

      <Modal open={open} onClose={handleClose}>
        <Box sx={{ ...modalStyle, width: 400, backgroundColor: theme.palette.primary.main, borderColor: theme.palette.primary.third }} className="popupAccount">
          <p><b>Modifier {fieldToEdit}</b></p>
          <form onSubmit={handleSubmit}>
            <p style={{color: theme.palette.text.secondary}}>Entrez le nouveau {fieldToEdit} puis entrez votre mot de passe</p>
            <LoginTextField
              label={fieldToEdit}
              name={fieldToEdit}
              onChange={handleInputChange}
              fullWidth
              margin="normal"
            />
            <LoginTextField
              label="mot de passe"
              name="password"
              onChange={handleInputChange}
              fullWidth
              margin="normal"
              type="password"
            />
            <DefaultButton type="submit" style={{marginTop: "1rem"}}>Enregistrer</DefaultButton>
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
            <DefaultButton type="submit" style={{marginTop: "1rem"}}>Changer le mot de passe</DefaultButton>
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