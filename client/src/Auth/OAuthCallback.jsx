import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, extractOAuthUserData } from '../service/supabaseAuth';
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

                    // Extraire les données OAuth (nom, photo, etc.)
                    const oauthData = extractOAuthUserData(user);

                    // Vérifier si l'utilisateur existe déjà dans votre base de données
                    try {
                        const response = await Axios.get(`${config.apiUrl}/user/profile`, {
                            headers: { Authorization: `Bearer ${data.session.access_token}` }
                        });
                        
                        // Mettre à jour le profil avec les dernières infos OAuth si nécessaire
                        if (oauthData.firstName || oauthData.lastName || oauthData.fullName || oauthData.avatarUrl) {
                            try {
                                // Extraire le profil de la réponse
                                const currentUser = response.data.profile || response.data.user?.[0];
                                
                                // Vérifier si le username est vide ou basé sur l'email (à mettre à jour)
                                const shouldUpdateUsername = !currentUser?.username || 
                                                            currentUser.username === user.email.split('@')[0];
                                
                                // Préparer les données à mettre à jour
                                const updateData = {};
                                if (oauthData.firstName) updateData.first_name = oauthData.firstName;
                                if (oauthData.lastName) updateData.last_name = oauthData.lastName;
                                
                                // Mettre à jour le username avec le nom Google si nécessaire
                                if (shouldUpdateUsername && oauthData.fullName) {
                                    const suggestedUsername = oauthData.fullName.replace(/\s+/g, '').toLowerCase();
                                    updateData.username = suggestedUsername;
                                }
                                
                                // Mettre à jour le profil si des données existent
                                if (Object.keys(updateData).length > 0) {
                                    await Axios.post(`${config.apiUrl}/update-profile`, updateData, {
                                        headers: { Authorization: `Bearer ${data.session.access_token}` }
                                    });
                                }
                                
                                // Télécharger et sauvegarder l'avatar Google si disponible
                                if (oauthData.avatarUrl) {
                                    try {
                                        await Axios.post(`${config.apiUrl}/sync-oauth-avatar`, {
                                            avatarUrl: oauthData.avatarUrl
                                        }, {
                                            headers: { Authorization: `Bearer ${data.session.access_token}` }
                                        });
                                    } catch (avatarError) {
                                        console.error('Erreur synchronisation avatar:', avatarError);
                                    }
                                }
                            } catch (updateError) {
                                console.warn('Erreur lors de la mise à jour du profil OAuth:', updateError);
                            }
                        }
                    } catch (profileError) {
                        // Si l'utilisateur n'existe pas, le créer
                        if (profileError.response?.status === 404) {
                            try {
                                // Pour OAuth, utiliser le nom complet ou générer un username basé sur l'email
                                const suggestedUsername = oauthData.fullName?.replace(/\s+/g, '').toLowerCase() || user.email.split('@')[0];
                                
                                await Axios.post(`${config.apiUrl}/register`, {
                                    email: user.email,
                                    username: suggestedUsername,
                                    first_name: oauthData.firstName,
                                    last_name: oauthData.lastName,
                                    oauth_provider: 'google',
                                    oauth_id: user.id
                                });
                                
                                // Télécharger l'avatar Google après la création du compte
                                if (oauthData.avatarUrl) {
                                    try {
                                        await Axios.post(`${config.apiUrl}/user/sync-oauth-avatar`, {
                                            avatarUrl: oauthData.avatarUrl
                                        }, {
                                            headers: { Authorization: `Bearer ${data.session.access_token}` }
                                        });
                                    } catch (avatarError) {
                                        console.error('Erreur sync avatar:', avatarError);
                                    }
                                }
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