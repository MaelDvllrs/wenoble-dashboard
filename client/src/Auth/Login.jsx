// Organize imports: external libraries first, then internal modules
import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';
import Axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import Cookies from 'js-cookie';
import CryptoJS from 'crypto-js';
import { useTheme } from '@mui/material/styles';

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
    const [loginUserName, setLoginUserName] = useState('');
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

        const presalt = CryptoJS.lib.WordArray.random(128 / 8);
        const salt = presalt.toString(CryptoJS.enc.Base64);
        const key = CryptoJS.PBKDF2(loginUserName, salt, { keySize: 256 / 32, iterations: 1000 });
        const keyString = key.toString(CryptoJS.enc.Base64);

        const encryptedPassword = CryptoJS.AES.encrypt(loginPassword, keyString, {
            mode: CryptoJS.mode.ECB,
            padding: CryptoJS.pad.Pkcs7
        }).toString();

        try {
            const response = await Axios.post(`${apiUrl}/login`, {
                LoginUserName: loginUserName,
                LoginPassword: encryptedPassword,
                salt: salt,
            });

            if (response.data.message) {
                navigateTo('/');
                setStatusHolder('showMessage');
                setLoading(false);
            } else {
                const token = response.data.token;
                const cookieOptions = {
                    expires: stayConnected ? 365 : undefined,
                    secure: true,
                    sameSite: 'Strict',
                    path: '/',
                };
                Cookies.set('token', token, cookieOptions);

                const decodedToken = jwtDecode(token);
                const isAdmin = decodedToken.isAdmin;

                if (isAdmin) {
                    navigateTo('/dashboard-admin/home');
                } else {
                    navigateTo('/dashboard/home');
                }
            }
        } catch (error) {
            setLoading(false);
            return error;
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
                        <SecondaryButton theme={theme} className="SignUpButton" href="https://www.wenoble.fr/contact">Contact</SecondaryButton>
                    </div>
                    <div className="loginTextContain">
                        <p className="loginTitle">Se Connecter à <span className="blueText">Wenoble Dashboard</span></p>
                        <p className="loginPresentation" style={{ color: theme.palette.text.secondary }}>Bienvenue sur le dashboard de Wenoble, entrez vos identifiants pour accéder à l'application</p>
                    </div>
                    <form className="loginForm">
                        <div className="inputContain">
                            <LoginTextField
                                autoComplete="username"
                                className="loginInput"
                                theme={theme}
                                label="Utilisateur"
                                type="text"
                                InputProps={{
                                    style: {
                                        color: theme.palette.text.primary,
                                    },
                                }}
                                onChange={(event) => {
                                    setLoginUserName(event.target.value);
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