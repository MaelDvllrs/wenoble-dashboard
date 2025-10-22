import React, { useState, useEffect } from 'react';
import { useParams, NavLink } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Grid, 
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton
} from '@mui/material';
import {
  Download as DownloadIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import ReceiptIcon from '@mui/icons-material/Receipt';
import CardMembershipIcon from '@mui/icons-material/CardMembership';

import Axios from 'axios';
import Cookies from 'js-cookie';
import { useWebsite } from '../../../../Context/WebsiteContext';
import config from '../../../../config';
import PaymentMethodDialog from './PaymentMethodDialog';
import './BillingDashboard.css';

const BillingDashboard = () => {
  const { websiteId } = useParams();
  const { selectedWebsite } = useWebsite();
  const theme = useTheme();
  const token = Cookies.get('token');
  const [loading, setLoading] = useState(true);
  const [billingData, setBillingData] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [error, setError] = useState(null);
  const [addPaymentDialogOpen, setAddPaymentDialogOpen] = useState(false);

  useEffect(() => {
    if (websiteId || selectedWebsite?.id) {
      fetchBillingData();
    }
  }, [websiteId, selectedWebsite]);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const siteId = websiteId || selectedWebsite?.id;
      console.log('Fetching billing data for siteId:', siteId);
      
      // Récupérer les informations de facturation
      console.log('Making API calls...');
      console.log('URLs:', {
        subscription: `${config.apiUrl}/subscription-info/${siteId}`,
        invoices: `${config.apiUrl}/invoices/${siteId}`,
        paymentMethods: `${config.apiUrl}/payment-methods/${siteId}`
      });
      
      const [billingResponse, invoicesResponse, paymentMethodsResponse] = await Promise.all([
        Axios.get(`${config.apiUrl}/subscription-info/${siteId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        Axios.get(`${config.apiUrl}/invoices/${siteId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        Axios.get(`${config.apiUrl}/payment-methods/${siteId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      console.log('Invoices response:', invoicesResponse.data);
      console.log('Payment methods response:', paymentMethodsResponse.data);
      
      setBillingData(billingResponse.data);
      setSubscriptionInfo(billingResponse.data.subscription);
      setInvoices(invoicesResponse.data.invoices || []);
      setPaymentMethods(paymentMethodsResponse.data.paymentMethods || []);
      
    } catch (error) {
      console.error('Erreur lors de la récupération des données de facturation:', error);
      setError('Impossible de charger les informations de facturation');
    } finally {
      setLoading(false);
    }
  };

  const downloadInvoice = async (invoiceId) => {
    try {
      const response = await Axios.get(`${config.apiUrl}/invoice-pdf/${invoiceId}`, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `facture-${invoiceId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur lors du téléchargement de la facture:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatAmount = (amount, currency = 'EUR') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency
    }).format(amount / 100); // Stripe amounts are in cents
  };

  const getInvoiceStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'success';
      case 'open': return 'warning';
      case 'draft': return 'info';
      case 'void': return 'error';
      default: return 'default';
    }
  };

  const getInvoiceStatusLabel = (status) => {
    switch (status) {
      case 'paid': return 'Payée';
      case 'open': return 'En attente';
      case 'draft': return 'Brouillon';
      case 'void': return 'Annulée';
      default: return status;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ margin: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <div className='outlet-box'>
      {/* En-tête avec breadcrumbs */}
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
            to={`/dashboard/website/${websiteId || selectedWebsite?.id}`}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            {selectedWebsite?.website_name || 'Site'}
          </NavLink>
          <span className="breadcrumb-separator" style={{ color: theme.palette.text.secondary }}> / </span>
          <span className="breadcrumb-item-active" style={{ color: theme.palette.text.primary }}>
            Facturation
          </span>
        </div>
      </div>

      <div>
        
        <h3 className="home-section-title" style={{ color: theme.palette.text.primary }}>
            Facturation
        </h3>
        {subscriptionInfo?.cancel_at_period_end && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="body2">
              Votre abonnement sera annulé le {formatDate(subscriptionInfo.current_period_end)}
            </Typography>
          </Alert>
        )}

        <div className='billing-grid'>
        {/* Informations d'abonnement */}
          <div className="modification_box no-hover" style={{ 
            backgroundColor: theme.palette.primary.secondary,
            padding: "1rem",
            boxShadow: theme.palette.shadow?.main || '0 4px 6px rgba(0, 0, 0, 0.1)',
            gridArea: "1 / 1 / 2 / 2"
          }}>
            <div className='website-graph-wrapper'>
              <div className='website-graph-info'>
                <div className='modification_title'>
                  <CardMembershipIcon className='icon_modifiaction_title' fontSize='normal'/>
                  <b>Abonnement actuel</b>
                </div>
              
              {subscriptionInfo ? (
                <List style={{padding:"0"}}>
                  <ListItem>
                    <ListItemText 
                      primary="Plan" 
                      secondary={subscriptionInfo.plan_name || 'Free'}
                    />
                    <Chip 
                      label={subscriptionInfo.status || 'active'} 
                      color={subscriptionInfo.status === 'active' ? 'success' : 'default'}
                      size="small"
                    />
                  </ListItem>
                  
                  {subscriptionInfo.price && (
                    <ListItem>
                      <ListItemText 
                        primary="Prix" 
                        secondary={`${subscriptionInfo.price}€/${subscriptionInfo.billing_period === 'monthly' ? 'mois' : 'an'}`}
                      />
                    </ListItem>
                  )}
                  
                  {subscriptionInfo.current_period_end && (
                    <ListItem>
                      <ListItemText 
                        primary="Prochaine facturation" 
                        secondary={formatDate(subscriptionInfo.current_period_end)}
                      />
                    </ListItem>
                  )}
                  
                  {subscriptionInfo.trial_end && new Date(subscriptionInfo.trial_end) > new Date() && (
                    <ListItem>
                      <ListItemIcon>
                        <InfoIcon color="info" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Période d'essai" 
                        secondary={`Se termine le ${formatDate(subscriptionInfo.trial_end)}`}
                      />
                    </ListItem>
                  )}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Plan gratuit actuel
                </Typography>
              )}
              </div>
            </div>
          </div>

        {/* Méthodes de paiement */}
        <div className="modification_box no-hover" style={{ 
            backgroundColor: theme.palette.primary.secondary,
            padding: "1rem",
            boxShadow: theme.palette.shadow?.main || '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
            <div className='website-graph-wrapper'>
              <div className='website-graph-info'>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  marginBottom: '1rem' 
                }}>
                  <div className='modification_title'>
                    <AddIcon className='icon_modifiaction_title' fontSize='normal'/>
                    <b>Méthodes de paiement</b>
                  </div>
                  <Button
                    startIcon={<AddIcon />}
                    variant="outlined"
                    size="small"
                    onClick={() => setAddPaymentDialogOpen(true)}
                  >
                    Ajouter
                  </Button>
                </div>
              
              {paymentMethods.length > 0 ? (
                <List>
                  {paymentMethods.map((method) => (
                    <ListItem key={method.id}>
                      <ListItemIcon>
                      </ListItemIcon>
                      <ListItemText 
                        primary={`**** **** **** ${method.card?.last4}`}
                        secondary={`${method.card?.brand?.toUpperCase()} • Expire ${method.card?.exp_month}/${method.card?.exp_year}`}
                      />
                      {method.is_default && (
                        <Chip label="Par défaut" size="small" color="primary" />
                      )}
                      <IconButton edge="end" size="small">
                        <DeleteIcon />
                      </IconButton>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Aucune méthode de paiement enregistrée
                </Typography>
              )}
            </div>
          </div>
        </div>

        {/* Historique des factures */}
        <div style={{ gridColumn: '1 / -1' }}>
          <div className="modification_box no-hover" style={{ 
            backgroundColor: theme.palette.primary.secondary,
            padding: "1rem",
            boxShadow: theme.palette.shadow?.main || '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <div className='website-graph-wrapper'>
              <div className='website-graph-info'>
                <div className='modification_title' style={{ marginBottom: '1rem' }}>
                  <ReceiptIcon className='icon_modifiaction_title' fontSize='normal'/>
                  <b>Historique des factures</b>
                </div>
              
              {invoices.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>N° Facture</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell>Montant</TableCell>
                        <TableCell>Statut</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell>{invoice.number}</TableCell>
                          <TableCell>{formatDate(invoice.created)}</TableCell>
                          <TableCell>
                            {invoice.lines?.data?.[0]?.description || 'Abonnement'}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold">
                              {formatAmount(invoice.amount_paid, invoice.currency)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={getInvoiceStatusLabel(invoice.status)}
                              color={getInvoiceStatusColor(invoice.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">
                            {invoice.status === 'paid' && invoice.invoice_pdf && (
                              <IconButton 
                                size="small" 
                                onClick={() => downloadInvoice(invoice.id)}
                                title="Télécharger la facture"
                              >
                                <DownloadIcon />
                              </IconButton>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Aucune facture disponible
                </Typography>
              )}
              </div>
            </div>
          </div>
        </div>

        {/* Dialog pour ajouter une méthode de paiement */}
        <PaymentMethodDialog
          open={addPaymentDialogOpen}
          onClose={() => setAddPaymentDialogOpen(false)}
          onSuccess={fetchBillingData}
          websiteId={websiteId || selectedWebsite?.id}
        />
      </div>
      </div>
    </div>
  );
};

export default BillingDashboard;