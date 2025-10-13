import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { useWebsite } from '../../../../Context/WebsiteContext';
import { Button, Card, CardContent, Typography, Grid, CircularProgress, Box, Chip } from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';
import CreateOutlinedIcon from '@mui/icons-material/CreateOutlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import EqualizerOutlinedIcon from '@mui/icons-material/EqualizerOutlined';
import NewspaperOutlinedIcon from '@mui/icons-material/NewspaperOutlined';
import { PiChatCircleDotsBold } from 'react-icons/pi';
import SettingsIcon from '@mui/icons-material/Settings';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockIcon from '@mui/icons-material/Lock';

const WebsiteHome = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { selectedWebsite, loading } = useWebsite();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px' 
      }}>
        <CircularProgress size={60} sx={{ color: theme.palette.colors.verPrimary }} />
      </div>
    );
  }

  // Si aucun site sélectionné, afficher un message
  if (!selectedWebsite) {
    return (
      <div>
        <div style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          backgroundColor: theme.palette.primary.secondary,
          borderRadius: '12px',
          border: `1px solid ${theme.palette.primary.third}`
        }}>
          <LanguageIcon sx={{ 
            fontSize: '4rem', 
            color: theme.palette.text.secondary,
            marginBottom: '1rem'
          }} />
          <Typography
            variant="h5"
            sx={{
              color: theme.palette.text.primary,
              fontWeight: 600,
              marginBottom: '0.5rem'
            }}
          >
            Aucun site sélectionné
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: theme.palette.text.secondary,
              marginBottom: '2rem'
            }}
          >
            Sélectionnez un site dans le menu ci-dessus ou créez-en un nouveau
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/dashboard/website/create')}
            sx={{
              backgroundColor: theme.palette.colors.verPrimary,
              color: 'white',
              textTransform: 'none',
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              fontWeight: 500,
              marginRight: '1rem',
              '&:hover': {
                backgroundColor: theme.palette.colors.verSecondary
              }
            }}
          >
            Créer un site
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate('/dashboard/websites')}
            sx={{
              borderColor: theme.palette.primary.third,
              color: theme.palette.text.primary,
              textTransform: 'none',
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              fontWeight: 500,
              '&:hover': {
                borderColor: theme.palette.colors.verPrimary,
                backgroundColor: `${theme.palette.colors.verPrimary}11`
              }
            }}
          >
            Voir tous mes sites
          </Button>
        </div>
      </div>
    );
  }

  // Vue d'ensemble du site sélectionné
  const quickActions = [
    {
      title: 'Modifications',
      description: 'Éditer le contenu de votre site',
      icon: <CreateOutlinedIcon sx={{ fontSize: '2rem' }} />,
      color: theme.palette.colors.verPrimary,
      path: '/dashboard/website/modification',
      enabled: true
    },
    {
      title: 'E-commerce',
      description: 'Gérer vos produits et commandes',
      icon: <ShoppingCartOutlinedIcon sx={{ fontSize: '2rem' }} />,
      color: theme.palette.colors.blue,
      path: '/dashboard/website/ecommerce',
      enabled: selectedWebsite.ecommerce_active
    },
    {
      title: 'Statistiques',
      description: 'Analyser les performances',
      icon: <EqualizerOutlinedIcon sx={{ fontSize: '2rem' }} />,
      color: theme.palette.colors.verPrimary,
      path: '/dashboard/website/stats',
      enabled: true
    },
    {
      title: 'Contacts',
      description: 'Messages de vos visiteurs',
      icon: <PiChatCircleDotsBold style={{ fontSize: '2rem' }} />,
      color: theme.palette.colors.verPrimary,
      path: '/dashboard/website/contact',
      enabled: true
    },
    {
      title: 'Newsletter',
      description: 'Gérer vos abonnés',
      icon: <NewspaperOutlinedIcon sx={{ fontSize: '2rem' }} />,
      color: theme.palette.colors.blue,
      path: '/dashboard/website/newsletter',
      enabled: selectedWebsite.newsletter_active
    },
    {
      title: 'Paramètres',
      description: 'Configurer votre site',
      icon: <SettingsIcon sx={{ fontSize: '2rem' }} />,
      color: theme.palette.text.secondary,
      path: `/dashboard/website/${selectedWebsite.id}/settings`,
      enabled: true
    }
  ];

  return (
    <div>
      {/* En-tête du site */}
      <Box sx={{ marginBottom: '3rem' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              backgroundColor: theme.palette.colors.verPrimary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <LanguageIcon sx={{ color: 'white', fontSize: '2.5rem' }} />
            </div>
            <div>
              <h1 style={{ 
                color: theme.palette.text.primary,
                fontSize: '2rem',
                fontWeight: 600,
                marginBottom: '0.5rem'
              }}>
                {selectedWebsite.website_name}
              </h1>
              <a
                href={`https://${selectedWebsite.website_slug}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: theme.palette.text.secondary,
                  fontSize: '1rem',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = theme.palette.colors.verPrimary}
                onMouseLeave={(e) => e.currentTarget.style.color = theme.palette.text.secondary}
              >
                {selectedWebsite.website_slug}
                <OpenInNewIcon sx={{ fontSize: '1rem' }} />
              </a>
            </div>
          </div>
          
          <Button
            variant="outlined"
            onClick={() => navigate('/dashboard/websites')}
            sx={{
              borderColor: theme.palette.primary.third,
              color: theme.palette.text.primary,
              textTransform: 'none',
              padding: '0.5rem 1rem',
              '&:hover': {
                borderColor: theme.palette.colors.verPrimary,
                backgroundColor: `${theme.palette.colors.verPrimary}11`
              }
            }}
          >
            Voir tous mes sites
          </Button>
        </div>

        {/* Badges de statut */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {selectedWebsite.is_published && (
            <Chip
              icon={<CheckCircleIcon sx={{ fontSize: '1rem' }} />}
              label="Publié"
              sx={{
                backgroundColor: `${theme.palette.colors.verPrimary}22`,
                color: theme.palette.colors.verPrimary,
                fontWeight: 500,
                border: `1px solid ${theme.palette.colors.verPrimary}44`
              }}
            />
          )}
          {selectedWebsite.ecommerce_active && (
            <Chip
              label="E-commerce"
              sx={{
                backgroundColor: `${theme.palette.colors.blue}22`,
                color: theme.palette.colors.blue,
                fontWeight: 500,
                border: `1px solid ${theme.palette.colors.blue}44`
              }}
            />
          )}
          {selectedWebsite.newsletter_active && (
            <Chip
              label="Newsletter"
              sx={{
                backgroundColor: `${theme.palette.colors.blue}22`,
                color: theme.palette.colors.blue,
                fontWeight: 500,
                border: `1px solid ${theme.palette.colors.blue}44`
              }}
            />
          )}
        </div>
      </Box>

      {/* Actions rapides */}
      <Box>
        <Typography
          variant="h6"
          sx={{
            color: theme.palette.text.primary,
            fontWeight: 600,
            marginBottom: '1.5rem',
            fontSize: '1.25rem'
          }}
        >
          Actions rapides
        </Typography>

        <Grid container spacing={2}>
          {quickActions.map((action, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card
                onClick={() => action.enabled && navigate(action.path)}
                sx={{
                  backgroundColor: theme.palette.primary.secondary,
                  border: `1px solid ${theme.palette.primary.third}`,
                  borderRadius: '12px',
                  cursor: action.enabled ? 'pointer' : 'not-allowed',
                  opacity: action.enabled ? 1 : 0.6,
                  transition: 'all 0.3s',
                  height: '100%',
                  position: 'relative',
                  '&:hover': action.enabled ? {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 8px 24px ${action.color}22`,
                    borderColor: action.color
                  } : {}
                }}
              >
                <CardContent sx={{ padding: '1.5rem' }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: '1rem'
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      backgroundColor: `${action.color}22`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: action.color
                    }}>
                      {action.icon}
                    </div>
                    {!action.enabled && (
                      <LockIcon sx={{ 
                        color: theme.palette.text.secondary,
                        fontSize: '1.25rem'
                      }} />
                    )}
                  </div>
                  
                  <Typography
                    variant="h6"
                    sx={{
                      color: theme.palette.text.primary,
                      fontWeight: 600,
                      fontSize: '1.125rem',
                      marginBottom: '0.5rem'
                    }}
                  >
                    {action.title}
                  </Typography>
                  
                  <Typography
                    variant="body2"
                    sx={{
                      color: theme.palette.text.secondary,
                      fontSize: '0.875rem',
                      lineHeight: 1.5
                    }}
                  >
                    {action.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Statistiques rapides */}
      <Box sx={{ marginTop: '3rem' }}>
        <Typography
          variant="h6"
          sx={{
            color: theme.palette.text.primary,
            fontWeight: 600,
            marginBottom: '1.5rem',
            fontSize: '1.25rem'
          }}
        >
          Aperçu
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{
              backgroundColor: theme.palette.primary.secondary,
              border: `1px solid ${theme.palette.primary.third}`,
              borderRadius: '12px',
              padding: '1.5rem'
            }}>
              <Typography sx={{ color: theme.palette.text.secondary, fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                Statut
              </Typography>
              <Typography sx={{ color: theme.palette.text.primary, fontSize: '1.5rem', fontWeight: 600 }}>
                {selectedWebsite.is_published ? 'En ligne' : 'Hors ligne'}
              </Typography>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{
              backgroundColor: theme.palette.primary.secondary,
              border: `1px solid ${theme.palette.primary.third}`,
              borderRadius: '12px',
              padding: '1.5rem'
            }}>
              <Typography sx={{ color: theme.palette.text.secondary, fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                Domaine
              </Typography>
              <Typography sx={{ 
                color: theme.palette.text.primary, 
                fontSize: '1rem', 
                fontWeight: 500,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {selectedWebsite.website_slug}
              </Typography>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{
              backgroundColor: theme.palette.primary.secondary,
              border: `1px solid ${theme.palette.primary.third}`,
              borderRadius: '12px',
              padding: '1.5rem'
            }}>
              <Typography sx={{ color: theme.palette.text.secondary, fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                E-commerce
              </Typography>
              <Typography sx={{ color: theme.palette.text.primary, fontSize: '1.5rem', fontWeight: 600 }}>
                {selectedWebsite.ecommerce_active ? 'Activé' : 'Désactivé'}
              </Typography>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{
              backgroundColor: theme.palette.primary.secondary,
              border: `1px solid ${theme.palette.primary.third}`,
              borderRadius: '12px',
              padding: '1.5rem'
            }}>
              <Typography sx={{ color: theme.palette.text.secondary, fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                Newsletter
              </Typography>
              <Typography sx={{ color: theme.palette.text.primary, fontSize: '1.5rem', fontWeight: 600 }}>
                {selectedWebsite.newsletter_active ? 'Activée' : 'Désactivée'}
              </Typography>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </div>
  );
};

export default WebsiteHome;
