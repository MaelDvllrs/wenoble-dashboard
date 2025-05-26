// Organize imports: external libraries first, then internal modules
import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';
import Axios from '../service/AxiosConfig';
import { jwtDecode } from 'jwt-decode';
import Cookies from 'js-cookie';
import CryptoJS from 'crypto-js';
import { useTheme } from '@mui/material/styles';

import { signInWithEmail } from '../service/supabaseAuth';

// Internal imports
import './Login.css';
import config from "../config";
import { IsAuthenticated, IsAuthenticatedAdmin } from "./ProtectedRoutes";
import { LoginTextField, LoadingDefaultButton, SecondaryButton, DefaultSwitch } from '../Theme/element';
import { GlobeComponent } from "./globeComponent";

// Component definition
const Login = () => {
    // Theme hook
    const theme = useTheme();

    // Constants
    const apiUrl = config.apiUrl;

    // State variables
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [statusHolder, setStatusHolder] = useState('message');
    const [stayConnected, setStayConnected] = useState(false);
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

    // Functions
    const loginUser = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatusHolder('message');

        try {
            // Utilisation de signInWithEmail de supabaseAuth
            const authData = await signInWithEmail(
                loginEmail, 
                loginPassword,
                stayConnected
            );
            
            // Vérification si l'authentification a réussi
            if (!authData || !authData.session) {
                navigateTo('/');
                setStatusHolder('showMessage');
                setLoading(false);
                return;
            }
            
            // Récupération du token depuis la session Supabase
            const token = authData.session.access_token;
            
            // Vérifier le rôle de l'utilisateur (admin ou non)
            // Note: Nous devons déterminer si l'utilisateur est admin
            // Soit via les métadonnées utilisateur, soit via une API
            
            try {
                // Option 1: Métadonnées utilisateur
                let isAdmin = authData.user?.user_metadata?.isAdmin;
                
                // Option 2: Décodage du token JWT si les métadonnées contiennent cette info
                if (isAdmin === undefined) {
                    const decodedToken = jwtDecode(token);
                    isAdmin = decodedToken.isAdmin;
                }
                
                // Redirection basée sur le rôle
                if (isAdmin) {
                    navigateTo('/dashboard-admin/home');
                } else {
                    navigateTo('/dashboard/home');
                }
            } catch (roleError) {
                console.error("Erreur lors de la vérification du rôle:", roleError);
                // Redirection par défaut en cas d'erreur
                navigateTo('/dashboard/home');
            }
        } catch (error) {
            console.error("Erreur lors de la connexion:", error);
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
                    <div className="SignUpContain">
                        <span className="SignUpText" style={{ color: theme.palette.text.secondary }}>Vous n'avez pas de compte ?</span>
                        <SecondaryButton theme={theme} className="SignUpButton" onClick={() => navigateTo('/register')}>S'inscrire</SecondaryButton>
                    </div>
                    <div className="loginTextContain">
                        <p className="loginTitle">Se Connecter à <span className="blueText">Wenoble Dashboard</span></p>
                        <p className="loginPresentation" style={{ color: theme.palette.text.secondary }}>Bienvenue sur le dashboard de Wenoble, entrez vos identifiants pour accéder à l'application</p>
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
                                    setLoginEmail(event.target.value);
                                }}
                            />
                            <div>
                                <LoginTextField
                                    autoComplete="current-password"
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
                                        setLoginPassword(event.target.value);
                                    }}
                                />
                                <div className="loginError">
                                    <span className={statusHolder}>Identifiants incorrects</span>
                                </div>
                            </div>
                        </div>
                        <div className="stayConnectedContain">
                            <p className="loginPresentation" style={{ color: theme.palette.text.secondary }}>Rester connecté ?</p>
                            <DefaultSwitch
                                theme={theme}
                                checked={stayConnected}
                                onChange={(event) => {
                                    setStayConnected(event.target.checked);
                                }}
                            />
                        </div>

                        <LoadingDefaultButton loading={loading} className="loginButton" type="submit" theme={theme} onClick={loginUser}>
                            {!loading && 'Connexion'}
                        </LoadingDefaultButton>
                        <a className="forgotPassword" href="https://www.wenoble.fr/contact">Mot de passe oublié ?</a>
                    </form>
                    <div className="LoginPowered" href="https://www.wenoble.fr/contact" style={{ color: theme.palette.text.secondary }}>Powered by <a href="https://www.wenoble.fr" className="blueText">Wenoble</a></div>
                </div>
            </div>
        </div>
    );
};

export default Login;