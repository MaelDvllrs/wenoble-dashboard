import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { supabase, signOut } from '../service/supabaseAuth';
import Cookies from 'js-cookie';
import { LoginTextField, LoginDefaultButton } from '../Theme/element';
import './Login.css';

const ResetPassword = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [isValidSession, setIsValidSession] = useState(false);

    useEffect(() => {
        // Vérifier si nous avons une session valide pour la réinitialisation
        const checkSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    setIsValidSession(true);
                } else {
                    setMessage('Lien de réinitialisation invalide ou expiré.');
                }
            } catch (error) {
                console.error('Erreur lors de la vérification de session:', error);
                setMessage('Erreur lors de la vérification du lien.');
            }
        };

        checkSession();
    }, []);

    const handleResetPassword = async (e) => {
        e.preventDefault();
        
        if (!newPassword || newPassword.length < 6) {
            setMessage('Le mot de passe doit contenir au moins 6 caractères.');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            setMessage('Les mots de passe ne correspondent pas.');
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) {
                throw error;
            }

            setMessage('Votre mot de passe a été mis à jour avec succès ! Vous allez être déconnecté pour sécurité.');
            
            // Déconnecter l'utilisateur et nettoyer les cookies/session
            setTimeout(async () => {
                try {
                    // Supprimer le token des cookies
                    Cookies.remove('token');
                    // Déconnecter de Supabase
                    await signOut();
                    // Rediriger vers la page de connexion
                    navigate('/login');
                } catch (err) {
                    console.error('Erreur lors de la déconnexion:', err);
                    // Rediriger quand même vers la page de connexion
                    navigate('/login');
                }
            }, 2500);

        } catch (error) {
            console.error('Erreur lors de la mise à jour du mot de passe:', error);
            setMessage('Erreur lors de la mise à jour du mot de passe. Veuillez réessayer.');
        } finally {
            setLoading(false);
        }
    };

    if (!isValidSession && !message.includes('Erreur')) {
        return (
            <div className="loginPage">
                <div className="loginContain" style={{ backgroundColor: theme.palette.background.secondary }}>
                    <div className="loginBox">
                        <div className="loginTextContain">
                            <p className="loginTitle">Réinitialisation du mot de passe</p>
                            <p className="loginPresentation" style={{ color: theme.palette.text.secondary }}>
                                Chargement...
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!isValidSession) {
        return (
            <div className="loginPage">
                <div className="loginContain" style={{ backgroundColor: theme.palette.background.secondary }}>
                    <div className="loginBox">
                        <div className="loginTextContain">
                            <p className="loginTitle">Lien invalide</p>
                            <p className="loginPresentation" style={{ color: theme.palette.text.secondary }}>
                                {message}
                            </p>
                            <button 
                                onClick={() => navigate('/login')} 
                                style={{
                                    marginTop: '1rem',
                                    padding: '0.5rem 1rem',
                                    backgroundColor: theme.palette.primary.main,
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
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

    return (
        <div className="loginPage">
            <div className="loginContain" style={{ backgroundColor: theme.palette.background.secondary }}>
                <div className="loginBox">
                    <div className="loginTextContain">
                        <p className="loginTitle">Nouveau mot de passe</p>
                        <p className="loginPresentation" style={{ color: theme.palette.text.secondary }}>
                            Choisissez un nouveau mot de passe sécurisé pour votre compte.
                        </p>
                    </div>
                    
                    <form className="loginForm" onSubmit={handleResetPassword}>
                        <div className="inputContain">
                            <LoginTextField
                                label="Nouveau mot de passe"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                theme={theme}
                                InputProps={{
                                    style: {
                                        color: theme.palette.text.primary,
                                    },
                                }}
                                disabled={loading}
                            />
                            <LoginTextField
                                label="Confirmer le mot de passe"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                theme={theme}
                                InputProps={{
                                    style: {
                                        color: theme.palette.text.primary,
                                        marginBottom: "1rem"
                                    },
                                }}
                                disabled={loading}
                            />
                        </div>

                        {message && (
                            <div style={{ 
                                marginBottom: '1rem',
                                padding: '0.75rem',
                                borderRadius: '4px',
                                backgroundColor: message.includes('succès') 
                                    ? 'rgba(76, 175, 80, 0.1)' 
                                    : 'rgba(244, 67, 54, 0.1)',
                                color: message.includes('succès') 
                                    ? '#4caf50' 
                                    : '#f44336',
                                fontSize: '0.9rem',
                                textAlign: 'center',
                                border: `1px solid ${message.includes('succès') 
                                    ? 'rgba(76, 175, 80, 0.3)' 
                                    : 'rgba(244, 67, 54, 0.3)'}`
                            }}>
                                {message}
                            </div>
                        )}

                        <LoginDefaultButton 
                            loading={loading} 
                            className="loginButton" 
                            type="submit" 
                            theme={theme}
                            disabled={!newPassword || !confirmPassword}
                        >
                            {!loading && 'Mettre à jour le mot de passe'}
                        </LoginDefaultButton>
                    </form>
                    
                    <div className="SignUpContain">
                        <button 
                            onClick={() => navigate('/login')} 
                            style={{
                                background: 'none',
                                border: 'none',
                                color: theme.palette.text.secondary,
                                textDecoration: 'underline',
                                cursor: 'pointer',
                                fontSize: '0.9rem'
                            }}
                        >
                            Retour à la connexion
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;