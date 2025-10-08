// Organize imports: external libraries first, then internal modules
import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';
import Axios from '../service/AxiosConfig';
import { jwtDecode } from 'jwt-decode';
import Cookies from 'js-cookie';
import CryptoJS from 'crypto-js';
import { useTheme } from '@mui/material/styles';
import { IconButton, InputAdornment } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

import { signInWithEmail, resetPassword } from '../service/supabaseAuth';

// Internal imports
import './Login.css';
import config from "../config";
import { IsAuthenticated, IsAuthenticatedAdmin } from "./ProtectedRoutes";
import { LoginTextField, LoginDefaultButton, SecondaryButton, DefaultSwitch, DefaultButton } from '../Theme/element';
import { CircularProgress } from '@mui/material';
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
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    
    // Mot de passe oublié
    const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
    const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
    const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
    const [forgotPasswordMessage, setForgotPasswordMessage] = useState('');

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
    const handleTogglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const loginUser = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatusHolder('message');

        try {
            const authData = await signInWithEmail(
                loginEmail, 
                loginPassword,
            );
            if (!authData || !authData.session) {
                navigateTo('/');
                setStatusHolder('showMessage');
                setLoading(false);
                return;
            }

            const token = authData.session.access_token;

            // Enregistrer le log de connexion (succès) côté serveur
            // Ne bloque pas la redirection
            void Axios.post(
                `${apiUrl}/user/login-logs`,
                { success: true, method: 'password' },
                { headers: { Authorization: `Bearer ${token}` } }
            ).catch(() => { /* ignore */ });
            
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

    // Fonctions pour le mot de passe oublié
    const openForgotPasswordModal = (e) => {
        e.preventDefault();
        setForgotPasswordEmail(loginEmail || ''); // Pré-remplir avec l'email de connexion si présent
        setForgotPasswordMessage('');
        setShowForgotPasswordModal(true);
    };

    const closeForgotPasswordModal = () => {
        setShowForgotPasswordModal(false);
        setForgotPasswordEmail('');
        setForgotPasswordMessage('');
        setForgotPasswordLoading(false);
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        
        if (!forgotPasswordEmail) {
            setForgotPasswordMessage('Veuillez saisir votre adresse email');
            return;
        }

        if (!/\S+@\S+\.\S+/.test(forgotPasswordEmail)) {
            setForgotPasswordMessage('Veuillez saisir une adresse email valide');
            return;
        }

        setForgotPasswordLoading(true);
        setForgotPasswordMessage('');

        try {
            console.log('Tentative de réinitialisation pour:', forgotPasswordEmail);
            const result = await resetPassword(forgotPasswordEmail);
            console.log('Résultat de resetPassword:', result);
            
            setForgotPasswordMessage('Demande envoyée avec succès ! Si l\'email existe dans notre système, vous recevrez un lien de réinitialisation. Vérifiez votre boîte de réception et vos spams. Vous pouvez fermer cette fenêtre.');
        } catch (error) {
            console.error('Erreur lors de la réinitialisation:', error);
            console.error('Détails de l\'erreur:', {
                message: error.message,
                status: error.status,
                statusText: error.statusText
            });
            
            let errorMessage = 'Erreur lors de l\'envoi de l\'email. ';
            
            if (error.message?.includes('User not found')) {
                errorMessage = 'Aucun compte trouvé avec cette adresse email.';
            } else if (error.message?.includes('rate limit')) {
                errorMessage = 'Trop de tentatives. Veuillez attendre avant de réessayer.';
            } else {
                errorMessage += 'Vérifiez votre adresse email et réessayez.';
            }
            
            setForgotPasswordMessage(errorMessage);
        } finally {
            setForgotPasswordLoading(false);
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
                                    type={showPassword ? "text" : "password"}
                                    InputProps={{
                                        style: {
                                            color: theme.palette.text.primary,
                                        },
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    onClick={handleTogglePasswordVisibility}
                                                    edge="end"
                                                    sx={{ 
                                                        color: theme.palette.text.secondary,
                                                        '&:hover': {
                                                            color: theme.palette.text.primary,
                                                        }
                                                    }}
                                                >
                                                    {showPassword ? <VisibilityOff /> : <Visibility />}
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    }}
                                    onChange={(event) => {
                                        setLoginPassword(event.target.value);
                                    }}
                                />
                                
                            </div>
                        </div>
                        <div className="forgotPasswordWrapper">
                            <a className="forgotPassword" href="#" onClick={openForgotPasswordModal}>Mot de passe oublié ?</a>
                        </div>
                        
                        

                        <LoginDefaultButton loading={loading} className="loginButton" type="submit" theme={theme} onClick={loginUser}>
                            {!loading && 'Connexion'}
                        </LoginDefaultButton>
                        <div className="loginError">
                            <span className={statusHolder}>Identifiants incorrects</span>
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
                                Se connecter avec Google
                            </button>
                        </div>
                        
                    </form>
                    <div className="SignUpContain">
                        <span className="SignUpText" style={{ color: theme.palette.text.secondary }}>Vous n'avez pas de compte ?</span>
                        <a href="/register" className="SignUpLink">S'inscrire</a>
                    </div>
                    <div className="LoginPowered" href="https://www.wenoble.fr/contact" style={{ color: theme.palette.text.secondary }}>Powered by <a href="https://www.wenoble.fr" className="blueText">Wenoble</a></div>
                </div>
            </div>

            {/* Modal Mot de passe oublié */}
            {showForgotPasswordModal && (
                <div className="modal_overlay" onClick={closeForgotPasswordModal}>
                    <div className="modal_content" onClick={(e) => e.stopPropagation()} style={{ 
                        backgroundColor: theme.palette.background.secondary,
                        color: theme.palette.text.primary,
                        maxWidth: '450px'
                    }}>
                        <h3 style={{ marginBottom: '1rem', color: theme.palette.text.primary }}>
                            Réinitialiser le mot de passe
                        </h3>
                        <p style={{ 
                            marginBottom: '1.5rem', 
                            color: theme.palette.text.secondary,
                            fontSize: '0.95rem',
                            lineHeight: '1.4'
                        }}>
                            Saisissez votre adresse email pour recevoir un lien de réinitialisation de votre mot de passe.
                        </p>
                        
                        <form onSubmit={handleForgotPassword}>
                            <LoginTextField
                                label="Adresse email"
                                type="email"
                                value={forgotPasswordEmail}
                                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                                theme={theme}
                                style={{ width: '100%' }}
                                InputProps={{
                                    style: {
                                        color: theme.palette.text.primary,
                                    },
                                }}
                                disabled={forgotPasswordLoading}
                            />
                            
                            {forgotPasswordMessage && (
                                <div style={{ 
                                    marginBottom: '1rem',
                                    marginTop: '1rem',
                                    padding: '0.75rem',
                                    borderRadius: '6px',
                                    backgroundColor: forgotPasswordMessage.includes('succès') 
                                        ? 'rgba(76, 175, 80, 0.1)' 
                                        : 'rgba(244, 67, 54, 0.1)',
                                    color: forgotPasswordMessage.includes('succès') 
                                        ? '#4caf50' 
                                        : '#f44336',
                                    fontSize: '0.85rem',
                                    lineHeight: '1.4',
                                    border: `1px solid ${forgotPasswordMessage.includes('succès') 
                                        ? 'rgba(76, 175, 80, 0.3)' 
                                        : 'rgba(244, 67, 54, 0.3)'}`
                                }}>
                                    {forgotPasswordMessage}
                                </div>
                            )}
                            
                            <div className="modal_actions" style={{ gap: '1rem' }}>
                                <SecondaryButton 
                                    type="button"
                                    onClick={closeForgotPasswordModal}
                                    disabled={forgotPasswordLoading}
                                >
                                    Annuler
                                </SecondaryButton>
                                <DefaultButton
                                    theme={theme}
                                    type="submit"
                                    disabled={forgotPasswordLoading}
                                    startIcon={forgotPasswordLoading ? <CircularProgress size={12} sx={{ color: 'white' }} /> : undefined}
                                >
                                    Envoyer
                                </DefaultButton>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Login;