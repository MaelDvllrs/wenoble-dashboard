import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Typography,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box
} from '@mui/material';
import {
  CreditCard as CreditCardIcon
} from '@mui/icons-material';
import Axios from 'axios';
import Cookies from 'js-cookie';
import config from '../../../../config';

const PaymentMethodDialog = ({ open, onClose, onSuccess, websiteId }) => {
  const token = Cookies.get('token');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentData, setPaymentData] = useState({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvc: '',
    cardholderName: ''
  });

  const handleChange = (field) => (event) => {
    setPaymentData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const formatCardNumber = (value) => {
    // Remove all non-digits
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    
    // Add spaces every 4 digits
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const handleCardNumberChange = (event) => {
    const formatted = formatCardNumber(event.target.value);
    if (formatted.replace(/\s/g, '').length <= 16) {
      setPaymentData(prev => ({
        ...prev,
        cardNumber: formatted
      }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    // Basic validation
    if (!paymentData.cardNumber || !paymentData.expiryMonth || !paymentData.expiryYear || !paymentData.cvc || !paymentData.cardholderName) {
      setError('Tous les champs sont requis');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // In a real implementation, you would use Stripe Elements
      // This is just a placeholder for the API call structure
      const response = await Axios.post(`${config.apiUrl}/add-payment-method`, {
        websiteId,
        paymentData: {
          ...paymentData,
          cardNumber: paymentData.cardNumber.replace(/\s/g, '') // Remove spaces
        }
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        onSuccess();
        onClose();
        // Reset form
        setPaymentData({
          cardNumber: '',
          expiryMonth: '',
          expiryYear: '',
          cvc: '',
          cardholderName: ''
        });
      } else {
        setError(response.data.message || 'Erreur lors de l\'ajout de la méthode de paiement');
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
      setError('');
    }
  };

  // Generate year options (current year + 10 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = [];
  for (let i = 0; i < 10; i++) {
    yearOptions.push(currentYear + i);
  }

  // Month options
  const monthOptions = [];
  for (let i = 1; i <= 12; i++) {
    monthOptions.push({
      value: i.toString().padStart(2, '0'),
      label: i.toString().padStart(2, '0')
    });
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <CreditCardIcon sx={{ mr: 1 }} />
          Ajouter une méthode de paiement
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Note :</strong> Cette fonctionnalité nécessite l'intégration complète avec Stripe Elements 
            pour la sécurité des données de carte. En production, utilisez Stripe Elements pour collecter 
            les informations de paiement de manière sécurisée.
          </Typography>
        </Alert>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nom du titulaire"
                value={paymentData.cardholderName}
                onChange={handleChange('cardholderName')}
                disabled={loading}
                required
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Numéro de carte"
                value={paymentData.cardNumber}
                onChange={handleCardNumberChange}
                placeholder="1234 5678 9012 3456"
                disabled={loading}
                required
                inputProps={{
                  maxLength: 19 // 16 digits + 3 spaces
                }}
              />
            </Grid>
            
            <Grid item xs={4}>
              <FormControl fullWidth required>
                <InputLabel>Mois</InputLabel>
                <Select
                  value={paymentData.expiryMonth}
                  onChange={handleChange('expiryMonth')}
                  disabled={loading}
                  label="Mois"
                >
                  {monthOptions.map(month => (
                    <MenuItem key={month.value} value={month.value}>
                      {month.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={4}>
              <FormControl fullWidth required>
                <InputLabel>Année</InputLabel>
                <Select
                  value={paymentData.expiryYear}
                  onChange={handleChange('expiryYear')}
                  disabled={loading}
                  label="Année"
                >
                  {yearOptions.map(year => (
                    <MenuItem key={year} value={year.toString()}>
                      {year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="CVC"
                value={paymentData.cvc}
                onChange={handleChange('cvc')}
                disabled={loading}
                required
                inputProps={{
                  maxLength: 4
                }}
              />
            </Grid>
          </Grid>
        </form>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Annuler
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Ajout...' : 'Ajouter'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PaymentMethodDialog;