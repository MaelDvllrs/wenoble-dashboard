import React, { useState, useEffect } from 'react';
import { useParams, NavLink } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { useWebsite } from '../../../../../Context/WebsiteContext';
import Axios from 'axios';
import config from '../../../../../config';
import { SecondaryButton, DefaultButton } from '../../../../../Theme/element';
import ReceiptIcon from '@mui/icons-material/Receipt';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PaymentIcon from '@mui/icons-material/Payment';
import './BillingPage.css';

const BillingPage = () => {
  const theme = useTheme();
  const { websiteId } = useParams();
  const { selectedWebsite } = useWebsite();
  
  const [subscription, setSubscription] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBillingData();
  }, [websiteId]);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      
      // Récupérer les informations d'abonnement
      const subResponse = await Axios.get(`${config.apiUrl}/subscription-status/${websiteId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (subResponse.data.success) {
        setSubscription(subResponse.data.subscription);
      }

      // Récupérer les factures
      const invoicesResponse = await Axios.get(`${config.apiUrl}/billing/invoices/${websiteId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (invoicesResponse.data.success) {
        setInvoices(invoicesResponse.data.invoices);
      }

      // Récupérer les moyens de paiement
      const paymentMethodsResponse = await Axios.get(`${config.apiUrl}/billing/payment-methods`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (paymentMethodsResponse.data.success) {
        setPaymentMethods(paymentMethodsResponse.data.paymentMethods);
      }

    } catch (error) {
      console.error('Erreur lors de la récupération des données de facturation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async (invoiceId) => {
    try {
      const response = await Axios.get(`${config.apiUrl}/billing/invoice/${invoiceId}/download`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        responseType: 'blob'
      });

      // Créer un lien de téléchargement
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `facture-${invoiceId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
    }
  };

  const handleViewInvoice = (invoiceUrl) => {
    window.open(invoiceUrl, '_blank');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatAmount = (amount) => {
    return (amount / 100).toFixed(2);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return theme.palette.success.main;
      case 'open':
        return theme.palette.warning.main;
      case 'void':
      case 'uncollectible':
        return theme.palette.error.main;
      default:
        return theme.palette.text.secondary;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'paid':
        return 'Payée';
      case 'open':
        return 'En attente';
      case 'void':
        return 'Annulée';
      case 'uncollectible':
        return 'Impayée';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="outlet">
        <div className="outlet-box">
          <div className="loading-container">
            <p>Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

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
              Facturation
            </span>
          </div>
        </div>

        <div className="billing-wrapper">
          {/* Section Bienvenue */}
          <div className="home-welcome-section">
            <div className="home-welcome-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div className="home-stat-icon" style={{ 
                  backgroundColor: theme.palette.primary.main,
                  borderRadius: '12px',
                  padding: '1rem',
                  height: 'auto'
                }}>
                  <ReceiptIcon style={{ fontSize: '2rem', color: theme.palette.text.primary }} />
                </div>
                <div>
                  <h2 className="home-welcome-title" style={{ color: theme.palette.text.primary }}>
                    Facturation & Paiements
                  </h2>
                  <p className="home-welcome-subtitle" style={{ color: theme.palette.text.secondary }}>
                    Gérez vos factures, abonnements et moyens de paiement
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section Abonnement actuel */}
          {subscription && (
            <div className="home-section">
              <h3 className="home-section-title" style={{ color: theme.palette.text.primary }}>
                Abonnement actuel
              </h3>
              <div className='modification_box' style={{
                backgroundColor: theme.palette.primary.secondary,
                boxShadow: theme.palette.shadow.main,
                padding: '1.5rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ color: theme.palette.text.primary, margin: '0 0 0.5rem 0' }}>
                      Plan {subscription.plan_name}
                    </h4>
                    <p style={{ color: theme.palette.text.secondary, margin: '0 0 0.5rem 0' }}>
                      {subscription.price}€ / {subscription.billing_period}
                    </p>
                    {(subscription.next_invoice_date || subscription.current_period_end) && (
                      <div>
                        <p style={{ color: theme.palette.text.secondary, margin: 0, fontSize: '0.875rem' }}>
                          Renouvellement le {formatDate(subscription.next_invoice_date || subscription.current_period_end)}{subscription.next_invoice_amount ? ` — ${formatAmount(subscription.next_invoice_amount)}` : null}
                        </p>
                        {subscription.price_may_vary && (
                          <p style={{ color: theme.palette.text.secondary, marginTop: '0.5rem', fontSize: '0.8rem' }}>
                            ⚠️ Le montant affiché est le prix récurrent du plan ; il peut varier (prorata) par rapport à la dernière facture.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <SecondaryButton onClick={() => window.location.href = `/dashboard/website/${websiteId}/subscription`}>
                    Gérer l'abonnement
                  </SecondaryButton>
                </div>
              </div>
            </div>
          )}

          {/* Section Factures */}
          <div className="home-section">
            <h3 className="home-section-title" style={{ color: theme.palette.text.primary }}>
              Historique des factures
            </h3>
            <div className='modification_box' style={{
              backgroundColor: theme.palette.primary.secondary,
              boxShadow: theme.palette.shadow.main,
              padding: '1.5rem'
            }}>
              {invoices.length === 0 ? (
                <p style={{ color: theme.palette.text.secondary, textAlign: 'center', margin: 0 }}>
                  Aucune facture disponible
                </p>
              ) : (
                <div className="invoices-table">
                  <div className="invoice-header" style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                    gap: '1rem',
                    padding: '1rem 0',
                    borderBottom: `1px solid ${theme.palette.primary.third}`,
                    fontWeight: 600,
                    color: theme.palette.text.primary
                  }}>
                    <span>Facture</span>
                    <span>Date</span>
                    <span>Montant</span>
                    <span>Statut</span>
                    <span>Actions</span>
                  </div>
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="invoice-row" style={{
                      display: 'grid', 
                      gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                      gap: '1rem',
                      padding: '1rem 0',
                      borderBottom: `1px solid ${theme.palette.primary.third}`,
                      alignItems: 'center'
                    }}>
                      <span style={{ color: theme.palette.text.primary }}>
                        #{invoice.number || invoice.id}
                      </span>
                      <span style={{ color: theme.palette.text.secondary }}>
                        {formatDate(invoice.created)}
                      </span>
                      <span style={{ color: theme.palette.text.primary, fontWeight: 600 }}>
                        {formatAmount(invoice.amount_paid)}€
                      </span>
                      <span style={{ 
                        color: getStatusColor(invoice.status),
                        fontWeight: 600
                      }}>
                        {getStatusText(invoice.status)}
                      </span>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {invoice.hosted_invoice_url && (
                          <SecondaryButton 
                            size="small"
                            onClick={() => handleViewInvoice(invoice.hosted_invoice_url)}
                            style={{ padding: '0.25rem 0.5rem', minWidth: 'auto' }}
                          >
                            <VisibilityIcon style={{ fontSize: '1rem' }} />
                          </SecondaryButton>
                        )}
                        {invoice.invoice_pdf && (
                          <SecondaryButton 
                            size="small"
                            onClick={() => handleDownloadInvoice(invoice.id)}
                            style={{ padding: '0.25rem 0.5rem', minWidth: 'auto' }}
                          >
                            <DownloadIcon style={{ fontSize: '1rem' }} />
                          </SecondaryButton>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section Moyens de paiement */}
          <div className="home-section">
            <h3 className="home-section-title" style={{ color: theme.palette.text.primary }}>
              Moyens de paiement
            </h3>
            <div className='modification_box' style={{
              backgroundColor: theme.palette.primary.secondary,
              boxShadow: theme.palette.shadow.main,
              padding: '1.5rem'
            }}>
              {paymentMethods.length === 0 ? (
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: theme.palette.text.secondary, marginBottom: '1rem' }}>
                    Aucun moyen de paiement enregistré
                  </p>
                  <DefaultButton>
                    <PaymentIcon style={{ marginRight: '0.5rem' }} />
                    Ajouter une carte
                  </DefaultButton>
                </div>
              ) : (
                <div className="payment-methods">
                  {paymentMethods.map((method) => (
                    <div key={method.id} className="payment-method" style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '1rem',
                      border: `1px solid ${theme.palette.primary.third}`,
                      borderRadius: '8px',
                      marginBottom: '1rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <PaymentIcon style={{ color: theme.palette.text.secondary }} />
                        <div>
                          <p style={{ color: theme.palette.text.primary, margin: '0 0 0.25rem 0' }}>
                            **** **** **** {method.card.last4}
                          </p>
                          <p style={{ color: theme.palette.text.secondary, margin: 0, fontSize: '0.875rem' }}>
                            {method.card.brand.toUpperCase()} • Expire {method.card.exp_month}/{method.card.exp_year}
                          </p>
                        </div>
                      </div>
                      <SecondaryButton size="small">
                        Supprimer
                      </SecondaryButton>
                    </div>
                  ))}
                  <DefaultButton>
                    <PaymentIcon style={{ marginRight: '0.5rem' }} />
                    Ajouter une carte
                  </DefaultButton>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingPage;