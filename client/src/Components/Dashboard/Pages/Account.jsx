import React from "react"
import { useState, useEffect } from "react";
import Axios from 'axios';
import Cookies from 'js-cookie';
import {jwtDecode} from 'jwt-decode'; 
import { fetchImages } from "../apiImage";
import './Account.css';
import {useNavigate} from 'react-router-dom';




const Account = () => {
  const user = Cookies.get('user');
  const decodedUser = jwtDecode(user);
  const username = decodedUser.user[0].username
  const email = decodedUser.user[0].email
  const website = decodedUser.user[0].website

  const [selectedImage, setSelectedImage] = useState(null);

  const [UserUsername, setUserUsername] = useState(null);
  const [UserEmail, setUserEmail] = useState(null);

  
  const handleImageChange = (event) => {
    setSelectedImage(event.target.files[0]);
  };
  
  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (selectedImage) {
      
      const formData = new FormData();
      formData.append('image', selectedImage);

      try {
        await Axios.post('http://localhost:3002/uploadProfileImage', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            username : username
          },
        });

        setSelectedImage(null);
      } catch (error) {
        console.error('Erreur lors du téléchargement de l\'image :', error);
      }

    }

    await Axios.post('http//localhost:3002/updateInfo',{
    UserUsername: UserUsername,
    UserEmail: UserEmail
  }).then((response)=>{
    if(response.data.message){
      console.error("erreur modification utilisateur")
    }
    else{
      useNavigate('./dashboard/account');
    }
  });

  }

  //recuperation Image profile
  const [images, setImages] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const imagesData = await fetchImages(username); 
      setImages(imagesData);
    };

    fetchData();
  }, []);

  
  return (
    <div>
      <div className="dashboard_case">
        <p className="dashboard_case_title"><b>Mon compte</b></p>
        <form className="form_profile" onSubmit={handleSubmit}>
          <div className="input_profile_image_box">
            <label for="profile_image" class="label_profile_image">Choisir une photo</label> 
            <input id="profile_image" className="input_profile_image" type="file" onChange={handleImageChange} accept="image/*"/>
            {images[0] && <img className="profile_image_account" src={`data:image/jpeg;base64,${images[0].data}`} alt={images[0].name} />}
            
          </div>
          {username && <input className="input_profil_text" value={username} onChange={(event)=>{setUserUsername(event.target.value)}} />}
          {email && <input className="input_profil_text" value={email} onChange={(event)=>{setUserEmail(event.target.value)}} />}
          {website && <p className="input_profil_text no_modif">{website}</p>}
          <button className="button_submit" type="submit">Enregistrer</button>
        </form>
      </div>
    </div>
  );
}

export default Account