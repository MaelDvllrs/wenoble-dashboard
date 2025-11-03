import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import Axios from 'axios';
import config from '../../../../../config';
import { DefaultButton, SecondaryButton } from '../../../../../Theme/element';
import './CustomCheckout.css';

// Initialiser Stripe avec votre clé publique
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_YOUR_KEY');

const CheckoutForm = ({ plan, websiteId, onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [clientSecret, setClientSecret] = useState('');

  useEffect(() => {
    // Créer le PaymentIntent côté serveur
    const createPaymentIntent = async () => {
      try {
        const response = await Axios.post(`${config.apiUrl}/create-payment-intent`, {
          planId: plan.id,
          websiteId: websiteId
        }, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });

        setClientSecret(response.data.clientSecret);
      } catch (err) {
        setError('Erreur lors de la création du paiement');
      }
    };

    createPaymentIntent();
  }, [plan.id, websiteId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!stripe || !elements) {
      return;
    }

    const card = elements.getElement(CardElement);

    // Confirmer le paiement
    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: card,
      }
    });

    if (error) {
      setError(error.message);
      setIsLoading(false);
    } else if (paymentIntent.status === 'succeeded') {
      onSuccess(paymentIntent);
    }
  };

  const cardOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: theme.palette.text.primary,
        backgroundColor: theme.palette.primary.secondary,
        '::placeholder': {
          color: theme.palette.text.secondary,
        },
      },
    },
  };

  return (
    <form onSubmit={handleSubmit} className="checkout-form">
      <div className="plan-summary" style={{
        backgroundColor: theme.palette.primary.secondary,
        padding: '1.5rem',
        borderRadius: '12px',
        marginBottom: '2rem'
      }}>
        <h3 style={{ color: theme.palette.text.primary, margin: '0 0 1rem 0' }}>
          Récapitulatif de votre commande
        </h3>
        <div className="plan-details">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: theme.palette.text.secondary }}>Plan :</span>
            <span style={{ color: theme.palette.text.primary, fontWeight: 600 }}>{plan.name}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: theme.palette.text.secondary }}>Prix :</span>
            <span style={{ color: theme.palette.text.primary, fontWeight: 600 }}>
              {plan.price}€/{plan.period}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${theme.palette.primary.third}`, paddingTop: '0.5rem', marginTop: '1rem' }}>
            <span style={{ color: theme.palette.text.primary, fontWeight: 600 }}>Total :</span>
            <span style={{ color: theme.palette.text.primary, fontWeight: 600, fontSize: '1.25rem' }}>
              {plan.price}€
            </span>
          </div>
        </div>
      </div>

      <div className="payment-form" style={{
        backgroundColor: theme.palette.primary.secondary,
        padding: '1.5rem',
        borderRadius: '12px',
        marginBottom: '2rem'
      }}>
        <h3 style={{ color: theme.palette.text.primary, margin: '0 0 1rem 0' }}>
          Informations de paiement
        </h3>
        
        <div className="card-element-container" style={{
          padding: '1rem',
          border: `1px solid ${theme.palette.primary.third}`,
          borderRadius: '8px',
          backgroundColor: theme.palette.primary.main
        }}>
          <CardElement options={cardOptions} />
        </div>

        {error && (
          <div className="error-message" style={{
            color: theme.palette.error.main,
            marginTop: '1rem',
            fontSize: '0.875rem'
          }}>
            {error}
          </div>
        )}
      </div>

      <div className="form-actions" style={{ display: 'flex', gap: '1rem' }}>
        <SecondaryButton onClick={onCancel} style={{ flex: 1 }}>
          Annuler
        </SecondaryButton>
        <DefaultButton 
          type="submit" 
          disabled={!stripe || isLoading}
          style={{ flex: 1 }}
        >
          {isLoading ? 'Traitement...' : `Payer ${plan.price}€`}
        </DefaultButton>
      </div>
    </form>
  );
};

const CustomCheckout = () => {
  const { websiteId, planId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const response = await Axios.get(`${config.apiUrl}/plans`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        const selectedPlan = response.data.plans.find(p => p.id === planId);
        setPlan(selectedPlan);
      } catch (error) {
        console.error('Erreur lors de la récupération du plan:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
  }, [planId]);

  const handleSuccess = (paymentIntent) => {
    console.log('Paiement réussi:', paymentIntent);
    navigate(`/dashboard/website/${websiteId}/subscription?success=true`);
  };

  const handleCancel = () => {
    navigate(`/dashboard/website/${websiteId}/subscription`);
  };

  if (loading) {
    return (
      <div className="checkout-loading">
        <p>Chargement...</p>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="checkout-error">
        <p>Plan introuvable</p>
      </div>
    );
  }

  return (
    <div className="custom-checkout-container">
      <div className="checkout-header" style={{ marginBottom: '2rem' }}>
        <h1 style={{ color: theme.palette.text.primary, marginBottom: '0.5rem' }}>
          Finaliser votre abonnement
        </h1>
        <p style={{ color: theme.palette.text.secondary }}>
          Vous êtes sur le point de vous abonner au plan {plan.name}
        </p>
      </div>

      <Elements stripe={stripePromise}>
        <CheckoutForm 
          plan={plan}
          websiteId={websiteId}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </Elements>
    </div>
  );
};

export default CustomCheckout;