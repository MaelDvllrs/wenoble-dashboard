import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { 
  Box, 
  Typography, 
  Button,
  Alert,
  CircularProgress,
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
import ArrowForwardIosRoundedIcon from '@mui/icons-material/ArrowForwardIosRounded';
import ArrowBackIosRoundedIcon from '@mui/icons-material/ArrowBackIosRounded';
import ReceiptIcon from '@mui/icons-material/Receipt';
import CardMembershipIcon from '@mui/icons-material/CardMembership';

import Axios from 'axios';
import Cookies from 'js-cookie';
import { useWebsite } from '../../../../Context/WebsiteContext';
import config from '../../../../config';
import PaymentMethodDialog from './PaymentMethodDialog';
import './BillingDashboard.css';
import { SecondaryButton, InfoAlert, GreenCircularProgress } from '../../../../Theme/element';

const BillingDashboard = () => {
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
  const [invoicePage, setInvoicePage] = useState(0);
  const invoicesPerPage = 5;

  useEffect(() => {
    if (selectedWebsite?.id) {
      fetchBillingData();
    }
  }, [selectedWebsite]);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      setError(null);
      
  const siteId = selectedWebsite?.id;
      

      
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
      // Chercher la facture dans les données locales pour utiliser hosted_invoice_url si disponible
      const invoice = invoices.find(inv => inv.id === invoiceId);
      
      if (invoice && invoice.hosted_invoice_url) {
        // Utiliser l'URL hébergée par Stripe directement (pas de CORS)
        window.open(invoice.hosted_invoice_url, '_blank', 'noopener,noreferrer');
        return;
      }
      
      // Fallback: utiliser notre endpoint avec authentification par paramètre
  const siteId = selectedWebsite?.id;
  const urlWithAuth = `${config.apiUrl}/invoice-pdf/${siteId}/${invoiceId}?token=${encodeURIComponent(token)}`;
      
      window.open(urlWithAuth, '_blank', 'noopener,noreferrer');
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

  const getInvoiceStatusLabel = (status) => {
    switch (status) {
      case 'paid': return 'Payée';
      case 'open': return 'En attente';
      case 'draft': return 'Brouillon';
      case 'void': return 'Annulée';
      default: return status;
    }
  };

  const getCardIcon = (brand) => {
    const brandLower = brand?.toLowerCase();
    switch (brandLower) {
      case 'visa':
        return <div className="card-icon visa" title="Visa" />;
      case 'mastercard':
        return <div className="card-icon mastercard" title="Mastercard" />;
      case 'amex':
      case 'american_express':
        return <div className="card-icon amex" title="American Express" />;
      case 'discover':
        return <div className="card-icon discover" title="Discover" />;
      case 'diners':
      case 'diners_club':
        return <div className="card-icon diners" title="Diners Club" />;
      case 'jcb':
        return <div className="card-icon jcb" title="JCB" />;
      case 'unionpay':
        return <div className="card-icon unionpay" title="UnionPay" />;
      default:
        return <div className="card-icon generic" title={brand || 'Carte'} />;
    }
  };

  // Fonctions de pagination pour les factures
  const handleInvoicePrev = () => setInvoicePage((p) => Math.max(0, p - 1));
  const handleInvoiceNext = () => setInvoicePage((p) => (p + 1) * invoicesPerPage < invoices.length ? p + 1 : p);

  // Obtenir les factures de la page actuelle
  const getCurrentPageInvoices = () => {
    const startIndex = invoicePage * invoicesPerPage;
    const endIndex = startIndex + invoicesPerPage;
    return invoices.slice(startIndex, endIndex);
  };

  // Supprimer une méthode de paiement
  const deletePaymentMethod = async (paymentMethodId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette méthode de paiement ?')) {
      return;
    }

    try {
      const siteId = selectedWebsite?.id;
      const response = await Axios.delete(`${config.apiUrl}/payment-methods/${siteId}/${paymentMethodId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        // Rafraîchir les données
        fetchBillingData();
      } else {
        console.error('Erreur lors de la suppression:', response.data.message);
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de la méthode de paiement:', error);
    }
  };

  if (loading) {
    return (
      <div className='outlet-box'>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height:'100%'}}>
          <GreenCircularProgress />
        </div>
      </div>
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
      

      <div>
        
        <h3 className="home-section-title" style={{ color: theme.palette.text.primary }}>
            Facturation
        </h3>

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
                <div className="billing-info-list">
                  <div className="billing-info-item">
                    <div className="billing-info-content">
                      <div className="billing-info-primary">Plan</div>
                      <div className="billing-info-secondary">{subscriptionInfo.plan_name || 'Free'}</div>
                    </div>
                    <div className={`billing-status ${subscriptionInfo.status === 'active' ? 'active' : 'inactive'}`}>
                      {subscriptionInfo.status === 'active' ? 'Actif' : 'Inactif'}
                    </div>
                  </div>
                  
                  {subscriptionInfo.price && (
                    <div className="billing-info-item">
                      <div className="billing-info-content">
                        <div className="billing-info-primary">Prix</div>
                        <div className="billing-info-secondary">{`${subscriptionInfo.price}€/${subscriptionInfo.billing_period === 'monthly' ? 'mois' : 'an'}`}</div>
                      </div>
                    </div>
                  )}
                  
                  {(subscriptionInfo.next_invoice_date || subscriptionInfo.current_period_end) && (
                    <div className="billing-info-item">
                      <div className="billing-info-content">
                        <div className="billing-info-primary">Prochaine facturation</div>
                        <div className="billing-info-secondary">
                          {formatDate(subscriptionInfo.next_invoice_date || subscriptionInfo.current_period_end)}
                          {subscriptionInfo.next_invoice_amount ? (` — ${formatAmount(subscriptionInfo.next_invoice_amount)}`) : null}
                        </div>
                        {subscriptionInfo.price_may_vary && (
                          <InfoAlert>
                            Le montant affiché est le prix récurrent du plan ; il peut varier (prorata) par rapport à la dernière facture.
                          </InfoAlert>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {subscriptionInfo.trial_end && new Date(subscriptionInfo.trial_end) > new Date() && (
                    <div className="billing-info-item">
                      <div className="billing-info-icon">
                        <InfoIcon color="info" />
                      </div>
                      <div className="billing-info-content">
                        <div className="billing-info-primary">Période d'essai</div>
                        <div className="billing-info-secondary">{`Se termine le ${formatDate(subscriptionInfo.trial_end)}`}</div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="billing-info-empty">
                  Plan gratuit actuel
                </div>
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
                  <SecondaryButton
                    startIcon={<AddIcon />}
                    variant="outlined"
                    size="small"
                    onClick={() => setAddPaymentDialogOpen(true)}
                  >
                    Ajouter
                  </SecondaryButton>
                </div>
              
              {paymentMethods.length > 0 ? (
                <div className="payment-methods-list">
                  {paymentMethods.map((method) => (
                    <div key={method.id} className="payment-method-item">
                      <div className="payment-method-content">
                        <div className="payment-method-icon">
                          {getCardIcon(method.card?.brand)}
                        </div>
                        <div className="payment-method-details">
                          
                          <div className="payment-method-primary">
                            
                            **** **** **** {method.card?.last4}
                          </div>
                          <div className="payment-method-secondary">
                            Expire: {method.card?.exp_month}/{method.card?.exp_year}
                          </div>
                          {method.card?.name && (
                            <span style={{ marginRight: '0.5rem', color: theme.palette.text.secondary }}>
                              {method.card.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="payment-method-actions">
                        {method.is_default && (
                          <div className="billing-status active">Par défaut</div>
                        )}
                        
                        {!method.is_default && (
                          <button 
                            className='download-button'
                            onClick={() => deletePaymentMethod(method.id)}
                            title="Supprimer cette méthode de paiement"
                          >
                            <DeleteIcon fontSize='small'/>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="billing-info-empty">
                  Aucune méthode de paiement enregistrée
                </div>
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
                <div className='logs-table-wrapper'>
                  <table className='security-logs-table invoices-table'>
                    <thead>
                      <tr>
                        <th className='col-invoice-number'>N° Facture</th>
                        <th className='col-invoice-date'>Date</th>
                        <th className='col-invoice-description'>Description</th>
                        <th className='col-invoice-amount'><div className='billing-table-box'>Montant</div></th>
                        <th className='col-invoice-status'><div className='billing-table-box'>Statut</div></th>
                        <th className='col-invoice-actions'><div className='billing-table-box'>Actions</div></th>
                      </tr>
                    </thead>
                    <tbody>
                      {getCurrentPageInvoices().map((invoice) => (
                        <tr key={invoice.id} className="invoice-row">
                          <td className='col-invoice-number mono'>{invoice.number}</td>
                          <td className='col-invoice-date'>{formatDate(invoice.created)}</td>
                          <td className='col-invoice-description'>
                            {invoice.lines?.data?.[0]?.description || 'Abonnement'}
                          </td>
                          <td className='col-invoice-amount'>
                            <div className='billing-table-box'>
                              <span style={{ fontWeight: 'bold' }}>
                                {formatAmount(invoice.amount_paid, invoice.currency)}
                              </span>
                            </div>
                          </td>
                          <td className='col-invoice-status'>
                            <div className='billing-table-box'>
                              <div className={`billing-status ${invoice.status === 'paid' ? 'active' : invoice.status === 'open' ? 'pending' : 'cancelled'}`}>
                                {getInvoiceStatusLabel(invoice.status)}
                              </div>
                            </div>
                          </td>
                          <td className='col-invoice-actions'>
                            <div className='billing-table-box'>
                              {invoice.status === 'paid' && invoice.invoice_pdf && (
                                <button 
                                  className="download-button"
                                  onClick={() => downloadInvoice(invoice.id)}
                                  title="Télécharger la facture"
                                >
                                  <DownloadIcon fontSize="small" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {invoices.length > invoicesPerPage && (
                    <div className='table-footer table-footer-security'>
                      <span></span>
                      <div className='table-footer-info'>
                        <span>{invoices.length === 0 ? '0' : `${invoicePage * invoicesPerPage + 1} - ${Math.min((invoicePage + 1) * invoicesPerPage, invoices.length)} sur ${invoices.length}`}</span>
                        <div className='table-footer-buttons'>
                          <button className='table-arrow-button' onClick={handleInvoicePrev} disabled={invoicePage === 0}>
                            <ArrowBackIosRoundedIcon fontSize='16'/>
                          </button>   
                          <button className='table-arrow-button' onClick={handleInvoiceNext} disabled={(invoicePage + 1) * invoicesPerPage >= invoices.length}>
                            <ArrowForwardIosRoundedIcon fontSize='16'/>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="billing-info-empty">
                  Aucune facture disponible
                </div>
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
          websiteId={selectedWebsite?.id}
        />
      </div>
      </div>
    </div>
  );
};

export default BillingDashboard;