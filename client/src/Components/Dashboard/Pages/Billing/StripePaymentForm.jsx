import React, { useState } from 'react';
import { useTheme } from '@mui/material/styles';
import {
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import {
  CircularProgress,
  Alert
} from '@mui/material';
import { InfoAlert } from '../../../../Theme/element';
import {
  CreditCard as CreditCardIcon
} from '@mui/icons-material';
import { DefaultButton, SecondaryButton, CssTextField } from '../../../../Theme/element';
import Axios from 'axios';
import Cookies from 'js-cookie';
import config from '../../../../config';

const StripePaymentForm = ({ clientSecret, websiteId, onSuccess, onClose }) => {
  const theme = useTheme();
  const stripe = useStripe();
  const elements = useElements();
  const token = Cookies.get('token');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  // setAsDefault removed: payment methods are set as default automatically

  const cardOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: theme.palette.text.primary,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        backgroundColor: theme.palette.primary.main,
        '::placeholder': {
          color: theme.palette.text.secondary,
        },
        iconColor: theme.palette.text.primary,
      },
      invalid: {
        color: theme.palette.error.main,
        iconColor: theme.palette.error.main,
      },
      complete: {
        color: theme.palette.success?.main || '#4caf50',
        iconColor: theme.palette.success?.main || '#4caf50',
      },
    },
    hidePostalCode: true,
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    if (!cardholderName.trim()) {
      setError('Veuillez saisir le nom du titulaire de la carte');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    
    if (!cardElement) {
      setError('Élément de carte non trouvé');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Confirmer le SetupIntent avec Stripe
      const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: cardholderName.trim(),
            },
          },
        }
      );

      if (stripeError) {
        setError(stripeError.message || 'Erreur lors de l\'ajout de la carte');
        setLoading(false);
        return;
      }

      if (setupIntent && setupIntent.status === 'succeeded') {
        // Notifier le serveur que la méthode de paiement a été ajoutée
        await Axios.post(`${config.apiUrl}/payment-method-added`, {
          websiteId,
          setupIntentId: setupIntent.id,
          paymentMethodId: setupIntent.payment_method
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        // Petit délai pour laisser le temps à Stripe de traiter
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1000);
      } else {
        setError('Erreur lors de la confirmation du paiement');
      }

    } catch (error) {
      console.error('Erreur lors de l\'ajout de la méthode de paiement:', error);
      setError('Erreur lors de l\'ajout de la méthode de paiement');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <div className="payment-form-container">
      <h3>
        Ajouter une méthode de paiement
      </h3>

      <InfoAlert>
        <strong>Sécurisé :</strong> Vos informations de paiement sont cryptées et traitées de manière sécurisée par Stripe.
      </InfoAlert>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form_grid" style={{ marginTop: '1.5rem' }}>
          <div className="form_group">
            <CssTextField
              label="Nom du titulaire"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              disabled={loading}
              required
              theme={theme}
              fullWidth
              placeholder="Ex: Jean Dupont"
            />
          </div>
          
          <div className="form_group">
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              color: theme.palette.text.primary,
              fontSize: '0.875rem',
              fontWeight: 500 
            }}>
              Informations de carte
            </label>
            <div style={{
              padding: '1rem',
              border: `1px solid ${theme.palette.primary.third}`,
              borderRadius: '8px',
              backgroundColor: theme.palette.primary.main,
              transition: 'border-color 0.2s ease',
            }}>
              <CardElement 
                options={cardOptions}
                onChange={(e) => {
                  if (e.error) {
                    setError(e.error.message);
                  } else {
                    setError('');
                  }
                }}
              />
            </div>
          </div>
          
          {/* setAsDefault removed: Stripe will set the method as default automatically */}
        </div>

        <div className="modal_actions" style={{ marginTop: '2rem' }}>
          <SecondaryButton onClick={handleClose} disabled={loading}>
            Annuler
          </SecondaryButton>
          <DefaultButton 
            type="submit"
            disabled={!stripe || loading}
          >
            {loading ? (
              <>
                <CircularProgress size={16} style={{ marginRight: '0.5rem' }} />
                Ajout en cours...
              </>
            ) : (
              'Ajouter la carte'
            )}
          </DefaultButton>
        </div>
      </form>
    </div>
  );
};

export default StripePaymentForm;