import React, { useState, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import {
  Alert,
  CircularProgress
} from '@mui/material';
import {
  CreditCard as CreditCardIcon
} from '@mui/icons-material';
import { SecondaryButton } from '../../../../Theme/element';
import StripePaymentForm from './StripePaymentForm';
import Axios from 'axios';
import Cookies from 'js-cookie';
import config from '../../../../config';
import '../website/website.css'; // Import des styles pour les modales

// Initialiser Stripe avec la clé publique
let stripePromise = null;

const getStripe = async () => {
  if (!stripePromise) {
    try {
      // Récupérer la clé publique depuis le serveur
      const response = await Axios.get(`${config.apiUrl}/stripe-config`);
      const publishableKey = response.data.publishableKey || process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
      
      if (publishableKey) {
        stripePromise = loadStripe(publishableKey);
      } else {
        throw new Error('Clé publique Stripe non configurée');
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de la configuration Stripe:', error);
      // Fallback sur la variable d'environnement
      const fallbackKey = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
      if (fallbackKey) {
        stripePromise = loadStripe(fallbackKey);
      }
    }
  }
  return stripePromise;
};

const PaymentMethodDialog = ({ open, onClose, onSuccess, websiteId }) => {
  const theme = useTheme();
  const token = Cookies.get('token');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [stripeInstance, setStripeInstance] = useState(null);

  useEffect(() => {
    if (open && websiteId) {
      initializeStripeAndSetup();
    }
  }, [open, websiteId]);

  const initializeStripeAndSetup = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Initialiser Stripe et créer le SetupIntent
      const stripePromiseResult = await getStripe();
      await createSetupIntent();
      
      setStripeInstance(stripePromiseResult);
    } catch (error) {
      console.error('Erreur lors de l\'initialisation:', error);
      setError('Erreur lors de l\'initialisation du paiement');
      setLoading(false);
    }
  };

  const createSetupIntent = async () => {
    try {
      const response = await Axios.post(`${config.apiUrl}/create-setup-intent`, {
        websiteId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setClientSecret(response.data.client_secret);
        setLoading(false);
      } else {
        throw new Error('Erreur lors de l\'initialisation du paiement');
      }
    } catch (error) {
      console.error('Erreur lors de la création du SetupIntent:', error);
      throw error;
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setError('');
      setClientSecret('');
      setStripeInstance(null);
    }
  };

  if (!open) return null;

  return (
    <div className="modal_overlay" onClick={handleClose}>
      <div className="modal_content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        {loading && !clientSecret ? (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            padding: '2rem' 
          }}>
            <CircularProgress size={40} style={{ marginBottom: '1rem' }} />
            <p style={{ color: theme.palette.text.primary }}>
              Initialisation du paiement sécurisé...
            </p>
          </div>
        ) : error ? (
          <div>
            <h3>
              <CreditCardIcon style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
              Erreur
            </h3>
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
            <div className="modal_actions">
              <SecondaryButton onClick={handleClose}>
                Fermer
              </SecondaryButton>
            </div>
          </div>
        ) : clientSecret && stripeInstance ? (
          <Elements 
            stripe={stripeInstance} 
            options={{
              clientSecret,
              appearance: {
                theme: theme.palette.mode === 'dark' ? 'night' : 'stripe',
              },
            }}
          >
            <StripePaymentForm
              clientSecret={clientSecret}
              websiteId={websiteId}
              onSuccess={onSuccess}
              onClose={handleClose}
            />
          </Elements>
        ) : (
          <div>
            <h3>
              <CreditCardIcon style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
              Ajouter une méthode de paiement
            </h3>
            <Alert severity="warning" sx={{ mb: 2 }}>
              Impossible de charger le formulaire de paiement. Veuillez réessayer.
            </Alert>
            <div className="modal_actions">
              <SecondaryButton onClick={handleClose}>
                Fermer
              </SecondaryButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentMethodDialog;