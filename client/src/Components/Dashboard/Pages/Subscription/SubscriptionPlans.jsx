import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { CircularProgress } from '@mui/material';
import { InfoAlert, CssTextField } from '../../../../Theme/element';
import { useWebsite } from '../../../../Context/WebsiteContext';
import Axios from 'axios';
import config from '../../../../config';
import './subscription.css';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import CardMembershipIcon from '@mui/icons-material/CardMembership';
import WarningIcon from '@mui/icons-material/Warning';
import { SecondaryButton, DefaultButton, RedButton, GreenCircularProgress } from '../../../../Theme/element';

const SubscriptionPlans = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const token = Cookies.get('token');
    
    const { selectedWebsite, loading: websiteLoading } = useWebsite();
    // Use website id strictly from context (no URL fallback)
    const websiteId = selectedWebsite?.id;
    
    const [currentPlan, setCurrentPlan] = useState('free'); // 'free', 'starter', ou 'cms'
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [confirmChangeOpen, setConfirmChangeOpen] = useState(false);
    const [pendingPlan, setPendingPlan] = useState(null);
    const [subscriptionInfo, setSubscriptionInfo] = useState(null);
    const [subscribingPlanId, setSubscribingPlanId] = useState(null);
    const [confirmLoading, setConfirmLoading] = useState(false);
    const [cancelLoading, setCancelLoading] = useState(false);
    // Modal d'information après annulation programmée
    const [cancelInfoModalOpen, setCancelInfoModalOpen] = useState(false);

    // Plans disponibles (par défaut local, seront remplacés par les données en base)
    const DEFAULT_PLANS = [
        {
            id: 'free',
            name: 'Gratuit',
            price: 0,
            period: 'mois',
            description: 'Parfait pour commencer et tester la plateforme',
            features: [],
            color: theme.palette.text.green,
            recommended: false
        },
        {
            id: 'starter',
            name: 'Starter',
            price: 9.90,
            period: 'mois',
            description: 'Idéal pour un site professionnel avec domaine personnalisé',
            features: [],
            color: theme.palette.colors.green,
            recommended: false
        },
        {
            id: 'cms',
            name: 'CMS',
            price: 29.90,
            period: 'mois',
            description: 'Solution complète avec CMS, pages personnalisées et portfolio',
            features: [],
            color: theme.palette.colors.green,
            recommended: true
        }
    ];

    const [plans, setPlans] = useState(DEFAULT_PLANS);

    // Charger les plans depuis la base de données (table subscription_plans)
    useEffect(() => {
        let mounted = true;
        const loadPlans = async () => {
            try {
                const res = await Axios.get(`${config.apiUrl}/plans`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (mounted && res.data && Array.isArray(res.data.plans) && res.data.plans.length > 0) {
                    // Normaliser les plans retournés
                    const normalized = res.data.plans.map(p => {
                        // Normalize features: accept either array or object map
                        let features = [];
                        if (Array.isArray(p.features)) {
                            features = p.features;
                        } else if (p.features && typeof p.features === 'object') {
                            // Map known keys to display labels and highlight important ones
                            const LABELS = {
                                analytics: 'Analytics',
                                collections: 'CMS (Collections)',
                                contact: 'Formulaire de contact',
                                custom_domain: 'Domaine personnalisé',
                                newsletter: 'Newsletter',
                                pages: 'Pages personnalisées',
                                portfolio: 'Portfolio',
                                webflow_preview_only: 'Preview Webflow uniquement'
                            };
                            const HIGHLIGHT_KEYS = new Set(['custom_domain', 'analytics', 'collections']);
                            features = Object.keys(p.features).map(key => {
                                const raw = p.features[key];
                                // Determine inclusion and optional value for collections
                                let included = !!raw;
                                let value = null;
                                if (key === 'collections') {
                                    if (typeof raw === 'number' && raw > 0) {
                                        included = true;
                                        value = String(raw);
                                    } else if (raw === true) {
                                        // true means unlimited in our semantics
                                        included = true;
                                        value = 'illimités';
                                    } else if (typeof raw === 'string' && raw.toLowerCase() === 'unlimited') {
                                        included = true;
                                        value = 'illimités';
                                    } else {
                                        included = false;
                                        value = null;
                                    }
                                }

                                return {
                                    key,
                                    name: LABELS[key] || key,
                                    included,
                                    highlight: HIGHLIGHT_KEYS.has(key),
                                    value
                                };
                            });
                        }

                        // Put included features first (keep relative order within included/excluded)
                        if (features && Array.isArray(features) && features.length > 0) {
                            features = [
                                ...features.filter(f => f.included),
                                ...features.filter(f => !f.included)
                            ];
                        }

                        return {
                            id: p.id || (p.name && String(p.name).toLowerCase()),
                            name: p.name,
                            price: typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0,
                            period: p.billing_period || 'mois',
                            description: p.description || '',
                            features,
                            recommended: !!p.recommended,
                            color: theme.palette.colors?.green || theme.palette.text.primary
                        };
                    });
                    setPlans(normalized);
                }
            } catch (err) {
                console.warn('Impossible de charger les plans depuis l\'API, utilisation des valeurs par défaut', err && err.message);
            }
        };
        loadPlans();
        return () => { mounted = false; };
    }, []);

    // Helper to determine if a plan is the current one.
    const isPlanCurrent = (plan) => {
        // Prefer authoritative name from subscriptionInfo if available
        const subName = subscriptionInfo?.plan_name?.toString().toLowerCase();
        const planName = plan?.name?.toString().toLowerCase();
        if (subName && planName) {
            return subName === planName;
        }
        // Fallback to legacy currentPlan id (kept for backward compatibility)
        return plan.id === currentPlan;
    };

    // Récupérer le plan actuel du site (déplacé hors du useEffect)
    const fetchCurrentPlan = async (isRefresh = false) => {
        if (!websiteId) return;
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            const response = await Axios.get(`${config.apiUrl}/subscription-status/${websiteId}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
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
            setRefreshing(false);
        }
    };

    const formatAmount = (amountInCents, currency = 'EUR') => {
        if (amountInCents == null) return null;
        try {
            return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amountInCents / 100);
        } catch (e) {
            return `${(amountInCents / 100).toFixed(2)} €`;
        }
    };

    useEffect(() => {
        // Vérifier si on revient d'un paiement réussi
        const urlParams = new URLSearchParams(window.location.search);
        const success = urlParams.get('success');
        const sessionId = urlParams.get('session_id');

        if (success === 'true' && sessionId) {
            // Vérifier et finaliser l'abonnement
            verifySubscription(sessionId);
        }
        fetchCurrentPlan();
    }, [websiteId]);

    // Effet pour rafraîchir les données quand on revient sur la page (après paiement)
    useEffect(() => {
        const handleFocus = () => {
            if (document.hidden === false && websiteId) {
                fetchCurrentPlan(true);
            }
        };

        const handleVisibilityChange = () => {
            if (!document.hidden && websiteId) {
                fetchCurrentPlan(true);
            }
        };

        // Écouter quand la page reprend le focus ou devient visible
        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [websiteId]);

    // Effet pour détecter un retour de paiement et forcer le rafraîchissement
    useEffect(() => {
        const urlParams = new URLSearchParams(location.search);
        const paymentSuccess = urlParams.get('payment_success');
        const subscriptionUpdated = urlParams.get('subscription_updated');
        
        if (paymentSuccess === 'true' || subscriptionUpdated === 'true') {
            // Attendre un peu que les webhooks Stripe se traitent
            setTimeout(() => {
                fetchCurrentPlan(true);
            }, 2000);
            
            // Nettoyer l'URL
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
        }
    }, [location.search]);

    // Rafraîchissement périodique léger pendant les premières minutes (pour les webhooks lents)
    useEffect(() => {
        let refreshInterval;
        
        // Si on vient d'arriver sur la page, rafraîchir plus souvent pendant 2 minutes
        const startTime = Date.now();
        refreshInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            
            if (elapsed < 120000) { // 2 minutes
                if (document.visibilityState === 'visible' && websiteId) {
                    fetchCurrentPlan(true);
                }
            } else {
                clearInterval(refreshInterval);
            }
        }, 30000); // Toutes les 30 secondes pendant 2 minutes

        return () => {
            if (refreshInterval) {
                clearInterval(refreshInterval);
            }
        };
    }, []); // Se déclenche seulement au montage du composant

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
            // Si déjà sur le plan gratuit, rien à faire
            if (currentPlan === 'free') return;
            // Si l'utilisateur a un plan payant actif, annuler l'abonnement Stripe
            if (subscriptionInfo && subscriptionInfo.plan_name !== 'free' && !subscriptionInfo.is_free) {
                setCancelLoading(true);
                try {
                    const response = await Axios.post(`${config.apiUrl}/cancel-subscription`, {
                        websiteId
                    }, {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    });
                    if (response.data.success) {
                        setSubscriptionInfo({
                            ...subscriptionInfo,
                            cancel_at_period_end: true
                        });
                        setCancelModalOpen(false);
                        setTimeout(() => {
                            setCancelInfoModalOpen(true);
                        }, 200); // Laisse le temps à l'ancien modal de se fermer
                    }
                } catch (error) {
                    console.error('Erreur lors de l\'annulation:', error);
                    alert('Erreur lors de l\'annulation de l\'abonnement.');
                } finally {
                    setCancelLoading(false);
                }
                return;
            }
            // Sinon, déjà gratuit
            return;
        }

        // Récupérer l'ID du plan depuis la base de données
        try {
            // show loading on the clicked plan button until popup appears
            setSubscribingPlanId(planId);
            const plansResponse = await Axios.get(`${config.apiUrl}/plans`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            // Try to find by id first (stringified), then by name (lowercased) for backward compatibility
            const selectedPlan = plansResponse.data.plans.find(p => String(p.id) === String(planId) || (p.name && String(p.name).toLowerCase() === String(planId).toLowerCase()));
            if (!selectedPlan) {
                console.error('Plan introuvable', { requested: planId, returnedPlans: plansResponse.data.plans });
                alert('Plan introuvable. Veuillez réessayer plus tard.');
                return;
            }
            // Vérifier si l'utilisateur a déjà un abonnement payant
            const hasPaymentMethod = subscriptionInfo && 
                                   subscriptionInfo.plan_name !== 'free' && 
                                   !subscriptionInfo.is_free;
            if (hasPaymentMethod) {
                // Ouvrir la popup de confirmation avant de changer
                setPendingPlan(selectedPlan);
                setConfirmChangeOpen(true);
                // popup is shown, stop the button loading
                setSubscribingPlanId(null);
            } else {
                // Premier abonnement payant - utiliser Checkout
                const response = await Axios.post(`${config.apiUrl}/create-checkout-session`, {
                    websiteId,
                    planId: selectedPlan.id
                }, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                if (response.data.success && response.data.checkoutUrl) {
                    window.location.href = response.data.checkoutUrl;
                } else {
                    console.log('Stripe Checkout sera disponible prochainement');
                    // stop loading since no redirect
                    setSubscribingPlanId(null);
                }
            }
        } catch (error) {
            console.error('Erreur lors de la sélection du plan:', error);
            if (error.response?.data?.error_code === 'STRIPE_NOT_CONFIGURED') {
                alert('Service de paiement temporairement indisponible. Veuillez réessayer plus tard.');
            } else if (error.response?.data?.message) {
                alert(error.response.data.message);
            } else {
                alert('Erreur lors du traitement. Veuillez réessayer.');
            }
            setSubscribingPlanId(null);
        }
    };

    // Fonction pour confirmer le changement de plan après popup
    const confirmPlanChange = async () => {
        if (!pendingPlan) return;
        try {
            setConfirmLoading(true);
            const response = await Axios.post(`${config.apiUrl}/change-subscription-plan`, {
                websiteId,
                planId: pendingPlan.id
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setConfirmLoading(false);
            setConfirmChangeOpen(false);
            setPendingPlan(null);
            if (response.data.success) {
                fetchCurrentPlan(true);
                alert(`Plan changé avec succès vers ${pendingPlan.name}`);
            } else {
                alert('Erreur lors du changement de plan');
            }
        } catch (error) {
            setConfirmLoading(false);
            setConfirmChangeOpen(false);
            setPendingPlan(null);
            alert('Erreur lors du changement de plan.');
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
            setCancelLoading(true);
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
            setCancelLoading(false);
        }
    };

    if (websiteLoading || loading) {
        return (
            <div className='outlet-box'>
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height:'100%'}}>
                    <GreenCircularProgress />
                </div>
            </div>
        );
    }


    return (
        <div className="outlet">
            <div className="outlet-box">
                
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <h3 className="home-section-title" style={{ color: theme.palette.text.primary }}>
                            Plans disponibles
                        </h3>
                        {refreshing && (
                            <CircularProgress size={16} thickness={4} />
                        )}
                    </div>
                    <div className="subscription-plans-container">
                        {plans.map((plan) => (
                            <div 
                                key={plan.id}
                                className={`modification_box subscription-plan-card no-hover ${isPlanCurrent(plan) ? 'current-plan' : ''} ${plan.recommended ? 'recommended' : ''}`}
                                style={{
                                    boxShadow: theme.palette.shadow.main,
                                }}
                            >
                        {plan.recommended && (
                            <div className="recommended-badge">
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
                                        <CheckIcon style={{  fontSize: '1.25rem' }} />
                                    ) : (
                                        <CloseIcon style={{ color: theme.palette.text.secondary, fontSize: '1.25rem' }} />
                                    )}
                                    <span>
                                        {feature.name}
                                        {feature.value ? (
                                            <span style={{ fontSize: '0.85rem', marginLeft: '0.5rem', opacity: 0.9, fontWeight: 600 }}>
                                                {feature.value === 'illimités' ? '- Illimités' : `- ${feature.value} collections`}
                                            </span>
                                        ) : feature.note ? (
                                            <span style={{ fontSize: '0.75rem', marginLeft: '0.5rem', opacity: 0.7 }}>
                                                (pas de domaine custom)
                                            </span>
                                        ) : null}
                                    </span>
                                </li>
                            ))}
                        </ul>

                            <div className="plan-action">
                                {isPlanCurrent(plan) ? (
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
                                ) : plan.id === 'free' && !isPlanCurrent({ id: 'free', name: 'free' }) ? (
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
                                        startIcon={subscribingPlanId === plan.id ? <CircularProgress size={12} sx={{ color: 'white' }} /> : undefined}
                                        disabled={subscribingPlanId === plan.id}
                                    >
                                        {subscribingPlanId === plan.id ? 'Chargement...' : "S'abonner maintenant"}
                                    </DefaultButton>
                                )}
                            </div>
                    </div>
                        ))}
                    </div>
                </div>
                </div>

                {/* Modal de confirmation de changement de plan (custom overlay) */}
                {confirmChangeOpen && (
                    <div
                        role="dialog"
                        aria-modal="true"
                        className="custom-modal-overlay"
                        onClick={(e) => {
                            // fermer si clic sur le backdrop
                            if (e.target.classList && e.target.classList.contains('custom-modal-overlay')) {
                                setConfirmChangeOpen(false);
                                setPendingPlan(null);
                            }
                        }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1400
                        }}
                    >
                        <div className="modal_content" style={{
                            backgroundColor: theme.palette.primary.main,
                            color: theme.palette.text.primary,
                            border: `1px solid ${theme.palette.primary.third}`
                        }}>                            
                            <h3>Confirmer le changement de plan</h3>
                            <p>
                                Vous êtes sur le point de passer du plan <strong>{subscriptionInfo?.plan_name}</strong> au plan <strong>{pendingPlan?.name}</strong>.
                            </p>

                            <InfoAlert>
                                <div style={{ fontSize: '0.9rem', margin: '0 0 0.5rem 0' }}>
                                    <strong>Paiement au prorata :</strong>
                                </div>
                                <ul style={{ fontSize: '0.875rem' }}>
                                    <li>Stripe ajustera automatiquement le montant en fonction du temps restant sur votre période actuelle.</li>
                                    <li>Vous ne payerez que la différence entre les deux plans pour la période en cours.</li>
                                    <li>Le changement est effectif immédiatement.</li>
                                </ul>
                            </InfoAlert>
                            <p style={{ color: theme.palette.colors.green, fontSize: '0.875rem', marginTop: '1rem', marginBottom: 0 }}>
                                Vous recevrez une facture de régularisation si nécessaire.
                            </p>

                            <div className="modal_actions" style={{ marginTop: '1.25rem', gap: '0.75rem' }}>
                                <SecondaryButton onClick={() => { setConfirmChangeOpen(false); setPendingPlan(null); }} disabled={confirmLoading}>
                                    Annuler
                                </SecondaryButton>
                                <DefaultButton onClick={confirmPlanChange} startIcon={confirmLoading ? <CircularProgress size={12} sx={{ color: 'white' }} /> : undefined} disabled={confirmLoading}>
                                    {confirmLoading ? 'Confirmation...' : 'Confirmer le changement'}
                                </DefaultButton>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal de confirmation d'annulation (custom overlay) */}
                {cancelModalOpen && (
                    <div
                        role="dialog"
                        aria-modal="true"
                        className="custom-modal-overlay"
                        onClick={(e) => {
                            if (e.target.classList && e.target.classList.contains('custom-modal-overlay')) {
                                setCancelModalOpen(false);
                            }
                        }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1400
                        }}
                    >
                        <div className="modal_content" style={{
                            backgroundColor: theme.palette.primary.main,
                            color: theme.palette.text.primary,
                            border: `1px solid ${theme.palette.primary.third}`
                        }}>
                                <h3>Annuler votre abonnement</h3>

                            <p>
                                Êtes-vous sûr de vouloir annuler votre abonnement <strong>{plans.find(p => p.id === currentPlan)?.name}</strong> ?
                            </p>

                            <InfoAlert>
                                <div style={{ fontSize: '0.9rem', margin: '0 0 0.5rem 0' }}>
                                    <strong>Ce qui va se passer :</strong>
                                </div>
                                <ul style={{ fontSize: '0.875rem', marginLeft: '1.25rem' }}>
                                    <li>Vous conservez l'accès à toutes les fonctionnalités premium <strong>jusqu'à la fin de votre période de facturation</strong></li>
                                    <li>Aucune nouvelle facturation ne sera effectuée</li>
                                    <li>À la fin de la période, votre site passera automatiquement au plan gratuit</li>
                                    <li>Vous perdrez alors l'accès aux fonctionnalités premium (domaine personnalisé, SSL, Analytics, CMS, etc.)</li>
                                </ul>
                            </InfoAlert>
                            {(subscriptionInfo?.next_invoice_date || subscriptionInfo?.current_period_end) && (
                                <p style={{ 
                                    color: theme.palette.colors.blue, 
                                    fontSize: '0.875rem', 
                                    marginTop: '1rem',
                                }}>
                                    Fin de la période : <strong>{new Date(subscriptionInfo.next_invoice_date || subscriptionInfo.current_period_end).toLocaleDateString('fr-FR', { 
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric' 
                                    })}</strong>
                                </p>
                            )}
                            {subscriptionInfo?.price_may_vary && (
                                <p style={{ color: theme.palette.text.secondary, fontSize: '0.875rem', marginTop: '0.75rem' }}>
                                    Le montant affiché correspond au prix du plan courant. Le montant facturé peut varier (prorata) par rapport à la dernière facture.
                                </p>
                            )}
                            <p style={{ color: theme.palette.colors.green, fontSize: '0.875rem', marginTop: '1rem', marginBottom: 0 }}>
                                Vous pourrez vous réabonner à tout moment
                            </p>

                            <div className="modal_actions" style={{ marginTop: '1.25rem', gap: '0.75rem' }}>
                                <SecondaryButton onClick={() => setCancelModalOpen(false)} disabled={cancelLoading}>
                                    Conserver mon abonnement
                                </SecondaryButton>
                                <RedButton onClick={handleCancelSubscription} disabled={cancelLoading} startIcon={cancelLoading ? <CircularProgress size={12} sx={{ color: 'white' }} /> : undefined}>
                                    {cancelLoading ? 'Annulation...' : `Confirmer l'annulation`}
                                </RedButton>
                            </div>
                        </div>
                    </div>
                )}
                {/* Modal d'information après annulation programmée */}
                {cancelInfoModalOpen && (
                    <div
                        role="dialog"
                        aria-modal="true"
                        className="custom-modal-overlay"
                        onClick={(e) => {
                            if (e.target.classList && e.target.classList.contains('custom-modal-overlay')) {
                                setCancelInfoModalOpen(false);
                            }
                        }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1400
                        }}
                    >
                        <div className="modal_content" style={{
                            backgroundColor: theme.palette.primary.main,
                            color: theme.palette.text.primary,
                            border: `1px solid ${theme.palette.primary.third}`
                        }}>
                            <h3>Annulation programmée</h3>
                            <InfoAlert>
                                <div style={{ fontSize: '0.95rem', margin: '0 0 0.5rem 0' }}>
                                    <strong>Votre abonnement sera annulé à la fin de la période de facturation en cours.</strong>
                                </div>
                                <ul style={{ fontSize: '0.875rem', marginLeft: '1.25rem' }}>
                                    <li>Vous conservez l'accès à toutes les fonctionnalités premium jusqu'à cette date.</li>
                                    <li>Aucune nouvelle facturation ne sera effectuée.</li>
                                    <li>À la fin de la période, votre site passera automatiquement au plan gratuit.</li>
                                </ul>
                            </InfoAlert>
                            <div className="modal_actions" style={{ marginTop: '1.25rem', gap: '0.75rem' }}>
                                <DefaultButton onClick={() => setCancelInfoModalOpen(false)}>
                                    OK
                                </DefaultButton>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SubscriptionPlans;
