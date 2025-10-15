import React, { useState, useEffect } from 'react';
import { NavLink, useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { useWebsite } from '../../../../Context/WebsiteContext';
import Axios from 'axios';
import './subscription.css';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import CardMembershipIcon from '@mui/icons-material/CardMembership';
import { SecondaryButton } from '../../../../Theme/element';

const SubscriptionPlans = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const { websiteId } = useParams();
    const { selectedWebsite, loading: websiteLoading } = useWebsite();
    
    const [currentPlan, setCurrentPlan] = useState('free'); // 'free' ou 'premium'
    const [loading, setLoading] = useState(true);

    // Plans disponibles
    const plans = [
        {
            id: 'free',
            name: 'Gratuit',
            price: 0,
            period: 'mois',
            description: 'Parfait pour commencer et tester la plateforme',
            features: [
                { name: 'Collections CMS illimitées', included: true },
                { name: 'Pages personnalisées', included: true },
                { name: 'Portfolio', included: true },
                { name: 'Formulaire de contact', included: true },
                { name: 'Newsletter', included: true },
                { name: 'Analytics de base', included: true },
                { name: 'Preview Webflow uniquement', included: true, note: true },
                { name: 'Domaine personnalisé', included: false },
                { name: 'Support prioritaire', included: false },
            ],
            color: '#6c757d',
            recommended: false
        },
        {
            id: 'premium',
            name: 'Premium',
            price: 9.99,
            period: 'mois',
            description: 'Toutes les fonctionnalités pour un site professionnel',
            features: [
                { name: 'Toutes les fonctionnalités Gratuit', included: true },
                { name: 'Domaine personnalisé', included: true, highlight: true },
                { name: 'SSL inclus', included: true },
                { name: 'Support prioritaire', included: true },
                { name: 'Analytics avancées', included: true },
                { name: 'Suppression du badge Wenoble', included: true },
            ],
            color: theme.palette.colors.verPrimary,
            recommended: true
        }
    ];

    useEffect(() => {
        // Récupérer le plan actuel du site
        const fetchCurrentPlan = async () => {
            if (!websiteId) return;
            
            try {
                setLoading(true);
                const response = await Axios.get(`/subscription-status/${websiteId}`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                });
                
                if (response.data.success) {
                    // Déterminer si c'est 'free' ou 'premium' basé sur le nom du plan
                    const planName = response.data.subscription.plan_name.toLowerCase();
                    setCurrentPlan(planName === 'premium' ? 'premium' : 'free');
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

    const handleSubscribe = async (planId) => {
        if (planId === 'free') {
            // Le plan gratuit est toujours actif, pas besoin de s'abonner
            return;
        }

        try {
            // Récupérer l'ID du plan depuis la base de données
            const plansResponse = await Axios.get('/plans', {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });

            const selectedPlan = plansResponse.data.plans.find(p => p.name.toLowerCase() === planId);
            
            if (!selectedPlan) {
                console.error('Plan introuvable');
                return;
            }

            // Créer une session Stripe Checkout
            const response = await Axios.post('/create-checkout-session', {
                websiteId,
                planId: selectedPlan.id
            }, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
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
        }
    };

    const handleManageSubscription = async () => {
        try {
            // Créer une session portail Stripe
            const response = await Axios.post('/create-portal-session', {
                websiteId
            }, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
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

    if (websiteLoading || loading) {
        return (
            <div className="outlet-box">
                <div className="loading-container">
                    <p>Chargement...</p>
                </div>
            </div>
        );
    }

    return (
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

            {/* En-tête */}
            <div className="subscription-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                        backgroundColor: theme.palette.primary.secondary,
                        borderRadius: '12px',
                        padding: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <CardMembershipIcon style={{ fontSize: '2rem', color: theme.palette.text.primary }} />
                    </div>
                    <div>
                        <h1 className='subscription-title' style={{ color: theme.palette.text.primary }}>
                            Choisissez votre plan
                        </h1>
                        <p className='subscription-subtitle' style={{ color: theme.palette.text.secondary }}>
                            Sélectionnez le plan qui correspond le mieux à vos besoins
                        </p>
                    </div>
                </div>
            </div>

            {/* Badge du plan actuel */}
            {currentPlan && (
                <div style={{ 
                    marginBottom: '2rem',
                    padding: '1rem',
                    backgroundColor: theme.palette.primary.secondary,
                    borderRadius: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <p style={{ margin: 0, color: theme.palette.text.secondary, fontSize: '0.875rem' }}>
                            Plan actuel
                        </p>
                        <p style={{ margin: 0, color: theme.palette.text.primary, fontSize: '1.25rem', fontWeight: 600 }}>
                            {plans.find(p => p.id === currentPlan)?.name}
                        </p>
                    </div>
                    {currentPlan === 'premium' && (
                        <SecondaryButton onClick={handleManageSubscription}>
                            Gérer mon abonnement
                        </SecondaryButton>
                    )}
                </div>
            )}

            {/* Cartes des plans */}
            <div className="subscription-plans-container">
                {plans.map((plan) => (
                    <div 
                        key={plan.id}
                        className={`subscription-plan-card ${plan.id === currentPlan ? 'current-plan' : ''} ${plan.recommended ? 'recommended' : ''}`}
                        style={{
                            backgroundColor: theme.palette.primary.secondary,
                            boxShadow: theme.palette.shadow.main,
                            border: plan.id === currentPlan ? `2px solid ${plan.color}` : '2px solid transparent'
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
                                {plan.price}€
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
                                <button 
                                    className="plan-button current"
                                    style={{
                                        backgroundColor: theme.palette.primary.main,
                                        color: theme.palette.text.secondary,
                                        cursor: 'default'
                                    }}
                                    disabled
                                >
                                    Plan actuel
                                </button>
                            ) : plan.id === 'free' ? (
                                <button 
                                    className="plan-button"
                                    style={{
                                        backgroundColor: theme.palette.primary.main,
                                        color: theme.palette.text.primary,
                                        border: `1px solid ${theme.palette.primary.third}`
                                    }}
                                    onClick={() => handleSubscribe(plan.id)}
                                >
                                    Gratuit
                                </button>
                            ) : (
                                <button 
                                    className="plan-button premium"
                                    style={{
                                        backgroundColor: plan.color,
                                        color: 'white'
                                    }}
                                    onClick={() => handleSubscribe(plan.id)}
                                >
                                    S'abonner maintenant
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* FAQ / Info supplémentaire */}
            <div style={{ 
                marginTop: '3rem',
                padding: '1.5rem',
                backgroundColor: theme.palette.primary.secondary,
                borderRadius: '12px'
            }}>
                <h3 style={{ color: theme.palette.text.primary, marginTop: 0 }}>
                    Questions fréquentes
                </h3>
                <div className="faq-item">
                    <p style={{ color: theme.palette.text.primary, fontWeight: 600 }}>
                        Puis-je changer de plan à tout moment ?
                    </p>
                    <p style={{ color: theme.palette.text.secondary }}>
                        Oui, vous pouvez passer au plan Premium à tout moment. La facturation sera proratisée.
                    </p>
                </div>
                <div className="faq-item">
                    <p style={{ color: theme.palette.text.primary, fontWeight: 600 }}>
                        Comment fonctionne le domaine personnalisé ?
                    </p>
                    <p style={{ color: theme.palette.text.secondary }}>
                        Avec le plan Premium, vous pouvez connecter votre propre nom de domaine. Le SSL est inclus automatiquement.
                    </p>
                </div>
                <div className="faq-item">
                    <p style={{ color: theme.palette.text.primary, fontWeight: 600 }}>
                        Que se passe-t-il si j'annule mon abonnement Premium ?
                    </p>
                    <p style={{ color: theme.palette.text.secondary }}>
                        Votre site reviendra automatiquement au plan Gratuit. Votre domaine personnalisé sera désactivé mais vos données seront conservées.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionPlans;
