import React, { useRef } from "react"
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import '../../Dashboard/Pages/modification_site/Portfolio/portfolio.css';
import './AddClient.css';
import config from "../../../config";
import { useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import { styled } from '@mui/material/styles';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import { PiUserPlus } from "react-icons/pi";
import { fetchSaveClient } from "./apiClient";






const AddClient = () => {

    const theme = useTheme();

    const apiUrl = config.apiUrl;
    
    const CssTextField = styled(TextField)({
        '& label.MuiFormLabel-root': {
            color: theme.palette.text.primary,

        },
        '& label.Mui-focused': {
            color: "#0541b7", // change this to your desired color
        },
        '& .MuiOutlinedInput-root': {
            '& fieldset': {
                borderColor: theme.palette.secondary.main,
            },
            '&:hover fieldset': {
                borderColor: theme.palette.secondary.main,
            },
            '&.Mui-focused fieldset': {
                borderColor: "#0541b7",
            },
        },
    });

  

    const DefaultSwitch = styled(Switch)(({ theme }) => ({
        '& .MuiSwitch-switchBase.Mui-checked': {
          color: "#0541b7",
        },
        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
          backgroundColor: "#0541b7",
        },
        '& .MuiSwitch-track': {
            backgroundColor: theme.palette.secondary.main,
        },
      }));

      const DefaultButton = styled(Button)(({ theme }) => ({
        '&.MuiButton-root': {
            backgroundColor: "#0541b7", // change this to your desired color
            color: 'rgba(255, 255, 255, 0.8)',
        },
        '&:hover': {
            backgroundColor: "#05286f", // change this to your desired color on hover
        },
    }));


    const usernameRef = useRef();
    const emailRef = useRef();
    const websiteRef = useRef();
    const isAdminRef = useRef();

    const handleSave = () => {
        const fields = {
            username: usernameRef.current.value,
            email: emailRef.current.value,
            website: websiteRef.current.value,
            isAdmin: isAdminRef.current.checked,
        };

        const areAllTextFieldsFilled = Object.values(fields).every(value => {
            return typeof value === 'boolean' || value.trim() !== '';
        });

        if (areAllTextFieldsFilled) {
            console.log(fields);
            fetchSaveClient(fields);
        } else {
            console.error('Tous les champs de texte ne sont pas remplis');
        }
    };




    return(
        <div className="outlet">
            <div className="title_section">
            <div className="breadCrumbs"><NavLink style={{color: theme.palette.text.primary}} className={"breadCrumbsLink"} to={'/dashboard/home'}>Dashboard</NavLink> &gt; Clients</div>
            </div>

            <div className="dashboard_case_empty">
                <div className="form_add_client">
                    <CssTextField id="username" label="username" variant="outlined" color="warning" inputRef={usernameRef} />
                    <CssTextField id="email" label="email" variant="outlined" inputRef={emailRef} />
                    <CssTextField id="website" label="website" variant="outlined" inputRef={websiteRef} />
                    <div>Admin : <DefaultSwitch inputRef={isAdminRef} /></div>
                    <DefaultButton onClick={handleSave} variant="contained"><PiUserPlus className="icon space_icon"/>Ajouter</DefaultButton>
                </div>
                
            </div>       
        </div>
    )
}
export default AddClient