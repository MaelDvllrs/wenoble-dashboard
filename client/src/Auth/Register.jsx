// Organize imports: external libraries first, then internal modules
import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';
import Axios from '../service/AxiosConfig';
import { useTheme } from '@mui/material/styles';

import { signUpWithEmail } from '../service/supabaseAuth';

// Internal imports
import './Login.css';
import config from "../config";
import { IsAuthenticated, IsAuthenticatedAdmin } from "./ProtectedRoutes";
import { LoginTextField, LoginDefaultButton, SecondaryButton } from '../Theme/element';
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
    const [username, setUsername] = useState('');
    const [statusHolder, setStatusHolder] = useState('message');
    const [loading, setLoading] = useState(false);
    const [registrationSuccess, setRegistrationSuccess] = useState(false);

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
        if (!email || !password || !username) {
            setStatusHolder('showMessage');
            return false;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setStatusHolder('showMessage');
            return false;
        }
        
        if (password.length < 8) {
            setStatusHolder('showMessage');
            return false;
        }
        
        if (username.length < 2) {
            setStatusHolder('showMessage');
            return false;
        }
        
        return true;
    };

    // Functions
    const registerUser = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatusHolder('message');
        
        if (!validateForm()) {
            setLoading(false);
            return;
        }

        try {
            // Appeler l'API backend pour créer le compte et le profil utilisateur
            await Axios.post(`${apiUrl}/register`, {
                email: email,
                password: password,
                username: username,
            });

            setLoading(false);
            setRegistrationSuccess(true);
            
        } catch (error) {
            console.error("Erreur lors de l'inscription:", error);
            setStatusHolder('showMessage');
            setLoading(false);
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
                    {!registrationSuccess ? (
                        <>
                            <div className="loginTextContain">
                                <p className="loginTitle">S'inscrire à <span className="blueText">Wenoble Dashboard</span></p>
                                <p className="loginPresentation" style={{ color: theme.palette.text.secondary }}>Créez votre compte pour accéder au dashboard de Wenoble</p>
                            </div>
                            <form className="loginForm">
                        <div className="inputContain">
                            <LoginTextField
                                autoComplete="username"
                                className="loginInput"
                                theme={theme}
                                label="Nom d'utilisateur"
                                type="text"
                                InputProps={{
                                    style: {
                                        color: theme.palette.text.primary,
                                    },
                                }}
                                onChange={(event) => {
                                    setUsername(event.target.value);
                                }}
                            />
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
                            <div>
                                <LoginTextField
                                    autoComplete="new-password"
                                    className="loginInput"
                                    theme={theme}
                                    label="Mot de passe"
                                    type="password"
                                    InputProps={{
                                        style: {
                                            color: theme.palette.text.primary,
                                            marginBottom:"2rem"
                                        },
                                    }}
                                    onChange={(event) => {
                                        setPassword(event.target.value);
                                    }}
                                />
                            </div>
                        </div>

                        <LoginDefaultButton loading={loading} className="loginButton" type="submit" theme={theme} onClick={registerUser}>
                            {!loading && "S'inscrire"}
                        </LoginDefaultButton>
                        <div className="loginError">
                            <span className={statusHolder}>Erreur lors de l'inscription</span>
                        </div>
                        <div className="line-login-wrapper">
                            <div className="line-login"></div>
                            <span>OU</span>
                            <div className="line-login"></div>
                        </div>
                        <div className="oauthButtonsWrapper" style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '16px 0' }}>
                            <button
                                type="button"
                                className="oauthButton oauthGoogle"
                                onClick={() => window.location.href = `${config.supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(window.location.origin + '/oauth-callback')}`}
                            >
                                <img src="https://upload.wikimedia.org/wikipedia/commons/2/2d/Google-favicon-2015.png" alt="Google" className="oauthIcon" />
                                S'inscrire avec Google
                            </button>
                        </div>
                    </form>
                    <div className="SignUpContain">
                        <span className="SignUpText" style={{ color: theme.palette.text.secondary }}>Vous avez déjà un compte ?</span>
                        <a href="/login" className="SignUpLink">Se connecter</a>
                    </div>
                    <div className="LoginPowered" style={{ color: theme.palette.text.secondary }}>Powered by <a href="https://www.wenoble.fr" className="blueText">Wenoble</a></div>
                        </>
                    ) : (
                        <div className="successMessage">
                            <div style={{ marginBottom: '2rem' }}>
                                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ margin: '0 auto', display: 'block' }}>
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#2ec96d"/>
                                </svg>
                            </div>
                            <p className="loginTitle">
                                Inscription réussie !
                            </p>
                            <p className="loginPresentation" style={{ color: theme.palette.text.secondary }}>
                                Nous avons envoyé un email de vérification à <strong>{email}</strong>. 
                                Veuillez cliquer sur le lien dans l'email pour activer votre compte.
                            </p>
                            <SecondaryButton 
                                theme={theme} 
                                onClick={() => navigateTo('/login')}
                                style={{ width: '100%' }}
                            >
                                Retour à la connexion
                            </SecondaryButton>
                            <div className="LoginPowered" style={{ color: theme.palette.text.secondary, marginTop: '2rem' }}>
                                Powered by <a href="https://www.wenoble.fr" className="blueText">Wenoble</a>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Register;