// Organize imports: external libraries first, then internal modules
import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';
import Axios from 'axios';
import { useTheme } from '@mui/material/styles';

// Internal imports
import './Login.css';
import config from "../config";
import { IsAuthenticated, IsAuthenticatedAdmin } from "./ProtectedRoutes";
import { LoginTextField, LoadingDefaultButton, SecondaryButton } from '../Theme/element';
import { GlobeComponent } from "./globeComponent";

// Component definition
const Register = () => {
    // Theme hook
    const theme = useTheme();

    // Constants
    const apiUrl = config.apiUrl;

    // State variables
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [statusHolder, setStatusHolder] = useState('message');
    const [statusMessage, setStatusMessage] = useState('');
    const [statusHolderError, setStatusHolderError] = useState('message');
    const [statusMessageError, setStatusMessageError] = useState('');
    const [loading, setLoading] = useState(false);

    // Navigation
    const navigateTo = useNavigate();

    // Authentication checks
    const isClient = IsAuthenticated();
    const isAdmin = IsAuthenticatedAdmin();

    if (isClient.isAuthenticating) {
        navigateTo('/dashboard/home');
    }

    if (isAdmin.isAuthenticating) {
        navigateTo('/dashboard-admin/home');
    }

    // Form validation
    const validateForm = () => {
        if (!email || !password) {
            setStatusMessageError('Veuillez remplir tous les champs');
            setStatusHolderError('showMessage');
            return false;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setStatusMessageError('Adresse email invalide');
            setStatusHolderError('showMessage');
            return false;
        }
        
        if (password.length < 8) {
            setStatusMessageError('Le mot de passe doit contenir au moins 8 caractères');
            setStatusHolderError('showMessage');
            return false;
        }
        
        return true;
    };

    // Functions
    const registerUser = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }
        
        setLoading(true);

        try {
            const response = await Axios.post(`${apiUrl}/register`, {
                email: email,
                password: password,
            });

            setLoading(false);
            
            if (response.data.success) {
                setStatusMessage('Inscription réussie ! Veuillez vérifier votre email pour confirmer votre compte.');
                setStatusHolder('showSuccessMessage');
                
            } else {
                setStatusMessageError(response.data.message || 'Une erreur est survenue');
                setStatusHolderError('showMessage');
            }
        } catch (error) {
            setLoading(false);
            setStatusMessageError(error.response?.data?.message || 'Une erreur est survenue');
            setStatusHolderError('showMessage');
        }
    };

    // JSX
    return (
        <div className="loginPage">
            <div className="loginContain" style={{ backgroundColor: theme.palette.background.secondary }}>
                <div className="loginImageContain">
                    <GlobeComponent />
                    <div className="fonduLoginImage" style={{ background: `linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, ${theme.palette.background.secondary} 100%)` }} />
                </div>
                <div className="loginBox">
                    <div className="SignUpContain">
                        <span className="SignUpText" style={{ color: theme.palette.text.secondary }}>Vous avez déjà un compte ?</span>
                        <SecondaryButton theme={theme} className="SignUpButton" onClick={() => navigateTo('/login')}>Connexion</SecondaryButton>
                    </div>
                    <div className="loginTextContain">
                        <p className="loginTitle">S'inscrire à <span className="blueText">Wenoble Dashboard</span></p>
                        <p className="loginPresentation" style={{ color: theme.palette.text.secondary }}>Créez votre compte pour accéder au dashboard de Wenoble</p>
                    </div>
                    <form className="loginForm">
                        <div className="inputContain">
                            <LoginTextField
                                autoComplete="email"
                                className="loginInput"
                                theme={theme}
                                label="Email"
                                type="email"
                                InputProps={{
                                    style: {
                                        color: theme.palette.text.primary,
                                    },
                                }}
                                onChange={(event) => {
                                    setEmail(event.target.value);
                                }}
                            />
                            <LoginTextField
                                autoComplete="new-password"
                                className="loginInput"
                                theme={theme}
                                label="Mot de passe"
                                type="password"
                                InputProps={{
                                    style: {
                                        color: theme.palette.text.primary,
                                    },
                                }}
                                onChange={(event) => {
                                    setPassword(event.target.value);
                                }}
                            />
                            <div>
                                <div className="loginError">
                                    <span className={statusHolderError}>{statusMessageError}</span>
                                </div>
                            </div>
                        </div>

                        <LoadingDefaultButton loading={loading} className="loginButton" type="submit" theme={theme} onClick={registerUser}>
                            {!loading && "S'inscrire"}
                        </LoadingDefaultButton>
                        <div className="loginMessage">
                            <span className={statusHolder}>{statusMessage}</span>
                        </div>
                    </form>
                    <div className="LoginPowered" style={{ color: theme.palette.text.secondary }}>Powered by <a href="https://www.wenoble.fr" className="blueText">Wenoble</a></div>
                </div>
            </div>
        </div>
    );
};

export default Register;