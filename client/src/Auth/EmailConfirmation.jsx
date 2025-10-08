import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../service/supabaseAuth';
import { useTheme } from '@mui/material/styles';
import { GlobeComponent } from './globeComponent';
import { SecondaryButton } from '../Theme/element';
import './Login.css';

const EmailConfirmation = () => {
    const navigate = useNavigate();
    const theme = useTheme();
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('loading'); // 'loading', 'success', 'error'
    const [message, setMessage] = useState('');

    useEffect(() => {
        const confirmEmail = async () => {
            try {
                // Récupérer les paramètres de l'URL
                const access_token = searchParams.get('access_token');
                const refresh_token = searchParams.get('refresh_token');
                const type = searchParams.get('type');
                
                console.log('Confirmation parameters:', { access_token, refresh_token, type });

                if (type === 'signup' && access_token && refresh_token) {
                    // Confirmation d'inscription
                    const { data, error } = await supabase.auth.setSession({
                        access_token,
                        refresh_token
                    });

                    if (error) {
                        console.error('Error confirming email:', error);
                        setStatus('error');
                        setMessage('Erreur lors de la confirmation de l\'email : ' + error.message);
                    } else {
                        console.log('Email confirmed successfully:', data);
                        setStatus('success');
                        setMessage('Votre email a été confirmé avec succès ! Vous pouvez maintenant vous connecter.');
                        
                        // Optionnel : déconnecter l'utilisateur pour qu'il se reconnecte explicitement
                        await supabase.auth.signOut();
                    }
                } else if (type === 'email_change' && access_token && refresh_token) {
                    // Confirmation de changement d'email
                    const { data, error } = await supabase.auth.setSession({
                        access_token,
                        refresh_token
                    });

                    if (error) {
                        console.error('Error confirming email change:', error);
                        setStatus('error');
                        setMessage('Erreur lors de la confirmation du changement d\'email : ' + error.message);
                    } else {
                        console.log('Email change confirmed successfully:', data);
                        setStatus('success');
                        setMessage('Votre adresse email a été mise à jour avec succès ! Vous pouvez continuer à utiliser votre compte.');
                    }
                } else {
                    setStatus('error');
                    setMessage('Lien de confirmation invalide ou expiré.');
                }
            } catch (error) {
                console.error('Unexpected error during email confirmation:', error);
                setStatus('error');
                setMessage('Une erreur inattendue s\'est produite.');
            }
        };

        confirmEmail();
    }, [searchParams]);

    const handleRedirect = () => {
        const type = searchParams.get('type');
        if (type === 'email_change' && status === 'success') {
            // Rediriger vers les paramètres de compte après un changement d'email réussi
            navigate('/dashboard/account/email');
        } else {
            // Rediriger vers login pour les autres cas
            navigate('/login');
        }
    };

    return (
        <div className="loginPage">
            <div className="loginContain" style={{ backgroundColor: theme.palette.background.secondary }}>
                <div className="loginImageContain">
                    <GlobeComponent />
                    <div className="fonduLoginImage" style={{ background: `linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, ${theme.palette.background.secondary} 100%)` }} />
                </div>
                <div className="loginBox">
                    <div className="successMessage">
                        {status === 'loading' && (
                            <>
                                <div style={{ marginBottom: '2rem' }}>
                                    <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
                                </div>
                                <p className="loginTitle">Confirmation en cours...</p>
                                <p className="loginPresentation" style={{ color: theme.palette.text.secondary }}>
                                    Veuillez patienter pendant que nous confirmons votre email.
                                </p>
                            </>
                        )}
                        
                        {status === 'success' && (
                            <>
                                <div style={{ marginBottom: '2rem' }}>
                                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ margin: '0 auto', display: 'block' }}>
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#4CAF50"/>
                                    </svg>
                                </div>
                                <p className="loginTitle">Email confirmé !</p>
                                <p className="loginPresentation" style={{ color: theme.palette.text.secondary }}>
                                    {message}
                                </p>
                                <SecondaryButton 
                                    theme={theme} 
                                    onClick={handleRedirect}
                                    style={{ width: '100%' }}
                                >
                                    {searchParams.get('type') === 'email_change' ? 'Continuer' : 'Se connecter'}
                                </SecondaryButton>
                            </>
                        )}
                        
                        {status === 'error' && (
                            <>
                                <div style={{ marginBottom: '2rem' }}>
                                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ margin: '0 auto', display: 'block' }}>
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="#f44336"/>
                                    </svg>
                                </div>
                                <p className="loginTitle" style={{ color: '#f44336' }}>Erreur de confirmation</p>
                                <p className="loginPresentation" style={{ color: theme.palette.text.secondary }}>
                                    {message}
                                </p>
                                <SecondaryButton 
                                    theme={theme} 
                                    onClick={handleRedirect}
                                    style={{ width: '100%' }}
                                >
                                    Retour à la connexion
                                </SecondaryButton>
                            </>
                        )}
                        
                        <div className="LoginPowered" style={{ color: theme.palette.text.secondary, marginTop: '2rem' }}>
                            Powered by <a href="https://www.wenoble.fr" className="blueText">Wenoble</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmailConfirmation;