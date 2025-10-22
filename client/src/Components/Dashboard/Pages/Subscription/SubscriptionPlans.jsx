import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { NavLink, useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { useWebsite } from '../../../../Context/WebsiteContext';
import Axios from 'axios';
import config from '../../../../config';
import './subscription.css';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import CardMembershipIcon from '@mui/icons-material/CardMembership';
import WarningIcon from '@mui/icons-material/Warning';
import { SecondaryButton, DefaultButton, RedButton } from '../../../../Theme/element';

const SubscriptionPlans = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const token = Cookies.get('token');
    
    const { websiteId } = useParams();
    const { selectedWebsite, loading: websiteLoading } = useWebsite();
    
    const [currentPlan, setCurrentPlan] = useState('free'); // 'free', 'starter', ou 'cms'
    const [loading, setLoading] = useState(true);
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [subscriptionInfo, setSubscriptionInfo] = useState(null);

    // Plans disponibles
    const plans = [
        {
            id: 'free',
            name: 'Gratuit',
            price: 0,
            period: 'mois',
            description: 'Parfait pour commencer et tester la plateforme',
            features: [
                { name: 'Formulaire de contact', included: true },
                { name: 'Newsletter', included: true },
                { name: 'Preview Webflow uniquement', included: true },
                { name: 'CMS (Collections)', included: true },
                { name: 'Pages personnalisées', included: true },
                { name: 'Portfolio', included: true },
                { name: 'Domaine personnalisé', included: false },
                { name: 'SSL inclus', included: false },
                { name: 'Analytics', included: false },
                { name: 'Support prioritaire', included: false },
                
            ],
            color: theme.palette.text.green,
            recommended: false
        },
        {
            id: 'starter',
            name: 'Starter',
            price: 9.90,
            period: 'mois',
            description: 'Idéal pour un site professionnel avec domaine personnalisé',
            features: [
                { name: 'Domaine personnalisé', included: true, highlight: true },
                { name: 'SSL inclus', included: true, highlight: true },
                { name: 'Analytics', included: true, highlight: true },
                { name: 'CMS (Collections)', included: false },
                { name: 'Pages personnalisées', included: false },
                { name: 'Portfolio', included: false },
                { name: 'Support prioritaire', included: false },
            ],
            color: theme.palette.colors.green,
            recommended: false
        },
        {
            id: 'cms',
            name: 'CMS',
            price: 29.90,
            period: 'mois',
            description: 'Solution complète avec CMS, pages personnalisées et portfolio',
            features: [
                { name: 'Toutes les fonctionnalités Starter', included: true },
                { name: 'CMS (Collections illimitées)', included: true, highlight: true },
                { name: 'Pages personnalisées', included: true, highlight: true },
                { name: 'Portfolio', included: true, highlight: true },
                { name: 'Support prioritaire', included: true },
            ],
            color: theme.palette.colors.green,
            recommended: true
        }
    ];

    useEffect(() => {
        // Vérifier si on revient d'un paiement réussi
        const urlParams = new URLSearchParams(window.location.search);
        const success = urlParams.get('success');
        const sessionId = urlParams.get('session_id');

        if (success === 'true' && sessionId) {
            // Vérifier et finaliser l'abonnement
            verifySubscription(sessionId);
        }

        // Récupérer le plan actuel du site
        const fetchCurrentPlan = async () => {
            if (!websiteId) return;
            
            try {
                setLoading(true);
                const response = await Axios.get(`${config.apiUrl}/subscription-status/${websiteId}`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                console.log(response)
                
                if (response.data.success) {
                    // Stocker les informations d'abonnement
                    setSubscriptionInfo(response.data.subscription);
                    
                    // Déterminer le plan basé sur le nom du plan
                    const planName = response.data.subscription.plan_name.toLowerCase();
                    if (planName === 'starter') {
                        setCurrentPlan('starter');
                    } else if (planName === 'cms') {
                        setCurrentPlan('cms');
                    } else {
                        setCurrentPlan('free');
                    }
                }
            } catch (error) {
                console.error('Erreur lors de la récupération du plan:', error);
                setCurrentPlan('free'); // Par défaut en cas d'erreur
            } finally {
                setLoading(false);
            }
        };

        fetchCurrentPlan();
    }, [websiteId]);

    const verifySubscription = async (sessionId) => {
        try {
            const response = await Axios.post(`${config.apiUrl}/verify-subscription`, {
                sessionId: sessionId,
                websiteId: websiteId
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (response.data.success) {
                console.log('Abonnement vérifié avec succès!');
                // Récupérer le plan depuis la réponse
                const planName = response.data.subscription?.plan_name?.toLowerCase();
                if (planName === 'starter') {
                    setCurrentPlan('starter');
                } else if (planName === 'cms') {
                    setCurrentPlan('cms');
                } else {
                    setCurrentPlan('free');
                }
                
                // Nettoyer l'URL
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        } catch (error) {
            console.error('Erreur lors de la vérification de l\'abonnement:', error);
        }
    };

    const handleSubscribe = async (planId) => {
        if (planId === 'free') {
            // Le plan gratuit est toujours actif, pas besoin de s'abonner
            return;
        }

        try {
            // Récupérer l'ID du plan depuis la base de données
            const plansResponse = await Axios.get(`${config.apiUrl}/plans`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            console.log(plansResponse)

            const selectedPlan = plansResponse.data.plans.find(p => p.name.toLowerCase() === planId);
            
            if (!selectedPlan) {
                console.error('Plan introuvable');
                return;
            }

            // Créer une session Stripe Checkout
            const response = await Axios.post(`${config.apiUrl}/create-checkout-session`, {
                websiteId,
                planId: selectedPlan.id
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (response.data.success && response.data.checkoutUrl) {
                // Rediriger vers Stripe Checkout
                window.location.href = response.data.checkoutUrl;
            } else {
                console.log('Stripe Checkout sera disponible prochainement');
            }
        } catch (error) {
            console.error('Erreur lors de la création de la session Checkout:', error);
            
            // Afficher un message plus clair à l'utilisateur
            if (error.response?.data?.error_code === 'STRIPE_NOT_CONFIGURED') {
                alert('Service de paiement temporairement indisponible. Veuillez réessayer plus tard.');
            } else {
                alert('Erreur lors de la création du paiement. Veuillez réessayer.');
            }
        }
    };

    const handleManageSubscription = async () => {
        try {
            // Créer une session portail Stripe
            const response = await Axios.post(`${config.apiUrl}/create-portal-session`, {
                websiteId
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (response.data.success && response.data.portalUrl) {
                // Rediriger vers le portail client Stripe
                window.location.href = response.data.portalUrl;
            } else {
                console.log('Portail de gestion sera disponible prochainement');
            }
        } catch (error) {
            console.error('Erreur lors de la création de la session Portal:', error);
        }
    };

    const handleCancelSubscription = async () => {
        try {
            setLoading(true);
            setCancelModalOpen(false);
            
            const response = await Axios.post(`${config.apiUrl}/cancel-subscription`, {
                websiteId
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (response.data.success) {
                // Mettre à jour les informations d'abonnement
                if (subscriptionInfo) {
                    setSubscriptionInfo({
                        ...subscriptionInfo,
                        cancel_at_period_end: true
                    });
                }
                // Note: Le plan reste actif jusqu'à la fin de la période
                // Ne pas changer currentPlan immédiatement
            }
        } catch (error) {
            console.error('Erreur lors de l\'annulation:', error);
        } finally {
            setLoading(false);
        }
    };

    if (websiteLoading || loading) {
        return (
            <div className="outlet-box">
                <div className="loading-container">
                    <p>Chargement...</p>
                </div>
            </div>
        );
    }

    console.log(currentPlan)

    return (
        <div className="outlet">
            <div className="outlet-box">
                {/* Breadcrumbs */}
                <div className="title_section">
                    <div className="breadCrumbs">
                        <NavLink 
                            className={'breadCrumbsLink'}
                            to="/dashboard/home"
                            style={{ textDecoration: 'none', color: 'inherit' }}
                        >
                            Dashboard
                        </NavLink>
                        <span className="breadcrumb-separator" style={{ color: theme.palette.text.secondary }}> / </span>
                        <NavLink 
                            className={'breadCrumbsLink'}
                            to="/dashboard/website"
                            style={{ textDecoration: 'none', color: 'inherit' }}
                        >
                            {selectedWebsite?.website_name}
                        </NavLink>
                        <span className="breadcrumb-separator" style={{ color: theme.palette.text.secondary }}> / </span>
                        <span className="breadcrumb-item-active" style={{ color: theme.palette.text.primary }}>
                            Abonnement
                        </span>
                    </div>
                </div>

                
                <div className='subscription-wrapper'>

                {/* Bandeau d'information si annulation programmée */}
                {subscriptionInfo?.cancel_at_period_end && currentPlan !== 'free' && (
                    <div className="home-section" style={{ marginBottom: '2rem' }}>
                        <div className="home-welcome-card" style={{
                            backgroundColor: theme.palette.colors.yellow + '20',
                            border: `1px solid ${theme.palette.colors.yellow}40`,
                            borderRadius: '12px',
                            padding: '1.5rem'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{
                                    backgroundColor: theme.palette.colors.yellow,
                                    borderRadius: '50%',
                                    padding: '0.75rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <WarningIcon style={{ fontSize: '1.5rem', color: theme.palette.primary.main }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ color: theme.palette.text.primary, margin: 0 }}>
                                        Annulation programmée
                                    </h3>
                                    <p style={{ color: theme.palette.text.secondary, margin: '0.5rem 0 0 0' }}>
                                        Votre abonnement <strong>{plans.find(p => p.id === currentPlan)?.name}</strong> sera annulé le{' '}
                                        <strong>
                                            {subscriptionInfo.current_period_end && new Date(subscriptionInfo.current_period_end).toLocaleDateString('fr-FR', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </strong>
                                        . Vous conservez l'accès aux fonctionnalités premium jusqu'à cette date.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Section Plans */}
                <div>
                    <h3 className="home-section-title" style={{ color: theme.palette.text.primary }}>
                        Plans disponibles
                    </h3>
                    <div className="subscription-plans-container">
                        {plans.map((plan) => (
                            <div 
                                key={plan.id}
                                className={`modification_box subscription-plan-card ${plan.id === currentPlan ? 'current-plan' : ''} ${plan.recommended ? 'recommended' : ''}`}
                                style={{
                                    boxShadow: theme.palette.shadow.main,
                                }}
                            >
                        {plan.recommended && (
                            <div className="recommended-badge" style={{ backgroundColor: plan.color }}>
                                Recommandé
                            </div>
                        )}

                        <div className="plan-header">
                            <h2 style={{ color: theme.palette.text.primary, margin: 0 }}>
                                {plan.name}
                            </h2>
                            <p style={{ color: theme.palette.text.secondary, fontSize: '0.875rem', margin: '0.5rem 0' }}>
                                {plan.description}
                            </p>
                        </div>

                        <div className="plan-price">
                            <span className="price-amount" style={{ color: theme.palette.text.primary }}>
                                {plan.price.toFixed(2)}€
                            </span>
                            <span className="price-period" style={{ color: theme.palette.text.secondary }}>
                                /{plan.period}
                            </span>
                        </div>

                        <ul className="plan-features">
                            {plan.features.map((feature, index) => (
                                <li 
                                    key={index}
                                    className={`plan-feature ${feature.included ? 'included' : 'not-included'} ${feature.highlight ? 'highlighted' : ''}`}
                                    style={{ 
                                        color: feature.included ? theme.palette.text.primary : theme.palette.text.secondary 
                                    }}
                                >
                                    {feature.included ? (
                                        <CheckIcon style={{ color: plan.color, fontSize: '1.25rem' }} />
                                    ) : (
                                        <CloseIcon style={{ color: theme.palette.text.secondary, fontSize: '1.25rem' }} />
                                    )}
                                    <span>
                                        {feature.name}
                                        {feature.note && (
                                            <span style={{ fontSize: '0.75rem', marginLeft: '0.5rem', opacity: 0.7 }}>
                                                (pas de domaine custom)
                                            </span>
                                        )}
                                    </span>
                                </li>
                            ))}
                        </ul>

                            <div className="plan-action">
                                {plan.id === currentPlan ? (
                                    <SecondaryButton 
                                        disabled
                                        style={{
                                            width: '100%',
                                            opacity: 0.7,
                                            padding: "0.5rem",
                                            fontSize: "1rem"
                                        }}
                                    >
                                        Plan actuel
                                    </SecondaryButton>
                                ) : plan.id === 'free' && currentPlan !== 'free' ? (
                                    <RedButton 
                                        onClick={() => setCancelModalOpen(true)}
                                        style={{ 
                                            width: '100%',
                                            padding: "0.5rem",
                                            fontSize: "1rem"
                                        }}
                                    >
                                        Passer au gratuit
                                    </RedButton>
                                ) : plan.id === 'free' ? (
                                    <SecondaryButton 
                                        disabled
                                        style={{ 
                                            width: '100%',
                                            padding: "0.5rem",
                                            fontSize: "1rem",
                                            opacity: 0.7
                                         }}
                                    >
                                        Plan actuel
                                    </SecondaryButton>
                                ) : (
                                    <DefaultButton 
                                        onClick={() => handleSubscribe(plan.id)}
                                        style={{ 
                                            width: '100%',
                                            padding: "0.5rem",
                                            fontSize: "1rem"
                                        }}
                                    >
                                        S'abonner maintenant
                                    </DefaultButton>
                                )}
                            </div>
                    </div>
                        ))}
                    </div>
                </div>
                </div>

                {/* Modal de confirmation d'annulation */}
                <Dialog 
                    open={cancelModalOpen} 
                    onClose={() => setCancelModalOpen(false)} 
                    maxWidth="sm" 
                    fullWidth
                    sx={{
                        '& .MuiPaper-root': {
                            backgroundColor: theme.palette.primary.main,
                            color: theme.palette.text.primary,
                            border: `1px solid ${theme.palette.primary.third}`,
                        }
                    }}
                >
                    <DialogTitle style={{ color: theme.palette.text.primary }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <WarningIcon style={{ color: theme.palette.colors.yellow, fontSize: '1.75rem' }} />
                            <span>Annuler votre abonnement</span>
                        </div>
                    </DialogTitle>
                    <DialogContent>
                        <p style={{ color: theme.palette.text.primary, marginBottom: '1rem' }}>
                            Êtes-vous sûr de vouloir annuler votre abonnement <strong>{plans.find(p => p.id === currentPlan)?.name}</strong> ?
                        </p>
                        <div style={{ 
                            backgroundColor: theme.palette.primary.secondary, 
                            padding: '1rem', 
                            borderRadius: '8px',
                            border: `1px solid ${theme.palette.primary.third}`
                        }}>
                            <p style={{ color: theme.palette.text.secondary, fontSize: '0.9rem', margin: '0 0 0.5rem 0' }}>
                                <strong>📅 Ce qui va se passer :</strong>
                            </p>
                            <ul style={{ color: theme.palette.text.secondary, fontSize: '0.875rem', marginLeft: '1.25rem' }}>
                                <li>Vous conservez l'accès à toutes les fonctionnalités premium <strong>jusqu'à la fin de votre période de facturation</strong></li>
                                <li>Aucune nouvelle facturation ne sera effectuée</li>
                                <li>À la fin de la période, votre site passera automatiquement au plan gratuit</li>
                                <li>Vous perdrez alors l'accès aux fonctionnalités premium (domaine personnalisé, SSL, Analytics, CMS, etc.)</li>
                            </ul>
                        </div>
                        {subscriptionInfo?.current_period_end && (
                            <p style={{ 
                                color: theme.palette.colors.blue, 
                                fontSize: '0.875rem', 
                                marginTop: '1rem',
                                padding: '0.75rem',
                                backgroundColor: theme.palette.primary.secondary,
                                borderRadius: '6px',
                                border: `1px solid ${theme.palette.colors.blue}40`
                            }}>
                                📆 Fin de la période : <strong>{new Date(subscriptionInfo.current_period_end).toLocaleDateString('fr-FR', { 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                })}</strong>
                            </p>
                        )}
                        <p style={{ color: theme.palette.colors.green, fontSize: '0.875rem', marginTop: '1rem', marginBottom: 0 }}>
                            💡 Vous pourrez vous réabonner à tout moment
                        </p>
                    </DialogContent>
                    <DialogActions style={{ padding: '1rem 1.5rem' }}>
                        <SecondaryButton onClick={() => setCancelModalOpen(false)}>
                            Conserver mon abonnement
                        </SecondaryButton>
                        <RedButton 
                            onClick={handleCancelSubscription}
                            disabled={loading}
                        >
                            {loading ? 'Annulation...' : 'Confirmer l\'annulation'}
                        </RedButton>
                    </DialogActions>
                </Dialog>
            </div>
        </div>
    );
};

export default SubscriptionPlans;
