import Axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Configuration Axios avec le token
const getAuthHeaders = () => ({
    headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
    }
});

export const subscriptionService = {
    // Récupérer le statut d'abonnement d'un site
    getSubscriptionStatus: async (websiteId) => {
        try {
            const response = await Axios.get(
                `/subscription-status/${websiteId}`,
                getAuthHeaders()
            );
            return response.data;
        } catch (error) {
            console.error('Erreur getSubscriptionStatus:', error);
            throw error;
        }
    },

    // Récupérer tous les plans disponibles
    getPlans: async () => {
        try {
            const response = await Axios.get('/plans', getAuthHeaders());
            return response.data;
        } catch (error) {
            console.error('Erreur getPlans:', error);
            throw error;
        }
    },

    // Créer une session Stripe Checkout
    createCheckoutSession: async (websiteId, planId) => {
        try {
            const response = await Axios.post(
                '/create-checkout-session',
                { websiteId, planId },
                getAuthHeaders()
            );
            return response.data;
        } catch (error) {
            console.error('Erreur createCheckoutSession:', error);
            throw error;
        }
    },

    // Créer une session portail client Stripe
    createPortalSession: async (websiteId) => {
        try {
            const response = await Axios.post(
                '/create-portal-session',
                { websiteId },
                getAuthHeaders()
            );
            return response.data;
        } catch (error) {
            console.error('Erreur createPortalSession:', error);
            throw error;
        }
    },

    // Annuler un abonnement
    cancelSubscription: async (websiteId) => {
        try {
            const response = await Axios.post(
                '/cancel-subscription',
                { websiteId },
                getAuthHeaders()
            );
            return response.data;
        } catch (error) {
            console.error('Erreur cancelSubscription:', error);
            throw error;
        }
    }
};

export default subscriptionService;
