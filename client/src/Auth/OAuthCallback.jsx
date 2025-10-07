import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../service/supabaseAuth';
import Axios from '../service/AxiosConfig';
import config from '../config';
import { useTheme } from '@mui/material/styles';
import { GlobeComponent } from './globeComponent';
import './Login.css';

const OAuthCallback = () => {
    const navigate = useNavigate();
    const theme = useTheme();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const handleOAuthCallback = async () => {
            try {
                // Récupérer la session depuis l'URL (fragments)
                const { data, error } = await supabase.auth.getSession();
                
                if (error) {
                    console.error('Erreur OAuth:', error);
                    setError('Erreur lors de la connexion avec Google');
                    setLoading(false);
                    return;
                }

                if (data.session) {
                    const user = data.session.user;
                    console.log('Utilisateur OAuth connecté:', user);

                    // Vérifier si l'utilisateur existe déjà dans votre base de données
                    try {
                        const response = await Axios.get(`${config.apiUrl}/user/profile`, {
                            headers: { Authorization: `Bearer ${data.session.access_token}` }
                        });
                        
                        console.log('Profil utilisateur trouvé:', response.data);
                    } catch (profileError) {
                        // Si l'utilisateur n'existe pas, le créer
                        if (profileError.response?.status === 404) {
                            console.log('Création du profil utilisateur...');
                            
                            try {
                                // Pour OAuth, utiliser le nom complet ou générer un username basé sur l'email
                                const suggestedUsername = user.user_metadata?.full_name?.replace(/\s+/g, '').toLowerCase() || user.email.split('@')[0];
                                
                                await Axios.post(`${config.apiUrl}/register`, {
                                    email: user.email,
                                    username: suggestedUsername,
                                    oauth_provider: 'google',
                                    oauth_id: user.id
                                });
                                console.log('Profil utilisateur créé avec succès');
                            } catch (createError) {
                                console.error('Erreur lors de la création du profil:', createError);
                            }
                        }
                    }

                    // Enregistrer le log de connexion
                    try {
                        await Axios.post(
                            `${config.apiUrl}/user/login-logs`,
                            { success: true, method: 'google' },
                            { headers: { Authorization: `Bearer ${data.session.access_token}` } }
                        );
                    } catch (logError) {
                        console.warn('Erreur lors de l\'enregistrement du log:', logError);
                    }

                    // Déterminer la redirection (admin ou utilisateur normal)
                    const isAdmin = user.user_metadata?.isAdmin || user.app_metadata?.isAdmin;
                    
                    if (isAdmin) {
                        navigate('/dashboard-admin/home');
                    } else {
                        navigate('/dashboard/home');
                    }
                } else {
                    setError('Aucune session trouvée');
                    setLoading(false);
                }
            } catch (err) {
                console.error('Erreur dans handleOAuthCallback:', err);
                setError('Erreur lors de la connexion');
                setLoading(false);
            }
        };

        handleOAuthCallback();
    }, [navigate]);

    if (loading) {
        return (
            <div className="loginPage">
                <div className="loginContain" style={{ backgroundColor: theme.palette.background.secondary }}>
                    <div className="loginImageContain">
                        <GlobeComponent />
                        <div className="fonduLoginImage" style={{ background: `linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, ${theme.palette.background.secondary} 100%)` }} />
                    </div>
                    <div className="loginBox">
                        <div className="loginTextContain">
                            <p className="loginTitle">Connexion en cours...</p>
                            <p className="loginPresentation" style={{ color: theme.palette.text.secondary }}>
                                Finalisation de la connexion avec Google
                            </p>
                        </div>
                        <div style={{ textAlign: 'center', padding: '2rem' }}>
                            <div className="loading-spinner"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="loginPage">
                <div className="loginContain" style={{ backgroundColor: theme.palette.background.secondary }}>
                    <div className="loginImageContain">
                        <GlobeComponent />
                        <div className="fonduLoginImage" style={{ background: `linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, ${theme.palette.background.secondary} 100%)` }} />
                    </div>
                    <div className="loginBox">
                        <div className="loginTextContain">
                            <p className="loginTitle">Erreur de connexion</p>
                            <p className="loginPresentation" style={{ color: theme.palette.text.secondary }}>
                                {error}
                            </p>
                        </div>
                        <div style={{ textAlign: 'center', padding: '2rem' }}>
                            <button 
                                className="loginButton"
                                onClick={() => navigate('/login')}
                                style={{ 
                                    backgroundColor: theme.palette.colors.blue,
                                    color: 'white',
                                    border: 'none',
                                    padding: '12px 24px',
                                    borderRadius: '8px',
                                    cursor: 'pointer'
                                }}
                            >
                                Retour à la connexion
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};

export default OAuthCallback;