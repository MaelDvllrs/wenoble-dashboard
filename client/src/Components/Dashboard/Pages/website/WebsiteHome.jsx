import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { useWebsite } from '../../../../Context/WebsiteContext';
import { CircularProgress } from '@mui/material';
import { IoGlobeOutline } from 'react-icons/io5';
import { MdArrowForwardIos, MdOutlineCreate, MdOutlineShoppingCart, MdOutlineBarChart, MdOutlineNewspaper, MdOutlineSettings, MdOutlineCheckCircle, MdOutlineLock, MdOutlineOpenInNew, MdOutlineAdd } from 'react-icons/md';
import { PiChatCircleDotsBold } from 'react-icons/pi';
import { checkAuthorization } from '../../../../Authorisation/Authorisation';
import { getStatistique } from '../Statistique/apiStatistique';
import { ResponsiveChartContainer } from '@mui/x-charts/ResponsiveChartContainer';
import { LinePlot } from '@mui/x-charts/LineChart';
import { PieChart, PiePlot } from '@mui/x-charts/PieChart';
import { ChartsXAxis } from '@mui/x-charts/ChartsXAxis';
import { ChartsYAxis } from '@mui/x-charts/ChartsYAxis';
import { CustomAxisTooltip, SecondaryButton } from '../../../../Theme/element';
import Axios from 'axios';
import Cookies from 'js-cookie';
import dayjs from 'dayjs';
import config from '../../../../config';

const WebsiteHome = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { selectedWebsite, loading } = useWebsite();
  const token = Cookies.get('token');

  const [ecommAuth, setEcommAuth] = useState(false);
  const [newsAuth, setNewsAuth] = useState(false);
  const [userStats, setUserStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [eventStats, setEventStats] = useState(null);
  const [eventStatsLoading, setEventStatsLoading] = useState(false);
  const [collectionsCount, setCollectionsCount] = useState(0);
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  const [storageSize, setStorageSize] = useState(0);
  const [storageLoading, setStorageLoading] = useState(false);

  const apiUrl = config.apiUrl;

  // Effects - Fetch authorizations
  useEffect(() => {
    const fetchAuth = async () => {
      if (selectedWebsite?.id) {
        const isAuthorizedEcom = await checkAuthorization('auth_ecom', selectedWebsite.id);
        setEcommAuth(isAuthorizedEcom);
        const isAuthorisedNews = await checkAuthorization('auth_newsletter', selectedWebsite.id);
        setNewsAuth(isAuthorisedNews);
      } else {
        // Réinitialiser les autorisations si aucun site n'est sélectionné
        setEcommAuth(false);
        setNewsAuth(false);
      }
    };
    if (!loading) {
      fetchAuth();
    }
  }, [selectedWebsite, loading]);

  // Fetch user statistics for last 14 days
  useEffect(() => {
    const fetchUserStats = async () => {
      if (!selectedWebsite?.id || !token) {
        setUserStats(null);
        return;
      }
      
      setStatsLoading(true);
      setUserStats(null); // Réinitialiser les données avant de charger les nouvelles
      try {
        const data = await getStatistique('last14days', 'activeUsers', selectedWebsite.id, token);
        setUserStats(data);
      } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        setUserStats(null);
      } finally {
        setStatsLoading(false);
      }
    };
    
    if (!loading && selectedWebsite?.id) {
      fetchUserStats();
    } else {
      setUserStats(null);
    }
  }, [selectedWebsite?.id, loading, token]);

  // Fetch event statistics for last 14 days
  useEffect(() => {
    const fetchEventStats = async () => {
      if (!selectedWebsite?.id || !token) {
        setEventStats(null);
        return;
      }
      
      setEventStatsLoading(true);
      setEventStats(null); // Réinitialiser les données avant de charger les nouvelles
      try {
        const data = await getStatistique('last14days', 'eventCount', selectedWebsite.id, token);
        setEventStats(data);
      } catch (error) {
        console.error('Erreur lors de la récupération des statistiques d\'événements:', error);
        setEventStats(null);
      } finally {
        setEventStatsLoading(false);
      }
    };
    
    if (!loading && selectedWebsite?.id) {
      fetchEventStats();
    } else {
      setEventStats(null);
    }
  }, [selectedWebsite?.id, loading, token]);

  // Fetch collections count
  useEffect(() => {
    const fetchCollections = async () => {
      if (!selectedWebsite?.id || !token) {
        setCollectionsCount(0);
        return;
      }
      
      setCollectionsLoading(true);
      setCollectionsCount(0);
      try {
        const response = await Axios.get(`${apiUrl}/getCollectionCount`, {
          params: { websiteId: selectedWebsite.id },
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        setCollectionsCount(response.data.count || 0);
      } catch (error) {
        console.error('Erreur lors de la récupération du nombre de collections:', error);
        setCollectionsCount(0);
      } finally {
        setCollectionsLoading(false);
      }
    };
    
    if (!loading && selectedWebsite?.id) {
      fetchCollections();
    } else {
      setCollectionsCount(0);
    }
  }, [selectedWebsite?.id, loading, token, apiUrl]);

  // Fetch storage size
  useEffect(() => {
    const fetchStorageSize = async () => {
      if (!selectedWebsite?.id || !token) {
        setStorageSize(0);
        return;
      }
      
      setStorageLoading(true);
      setStorageSize(0);
      try {
        const response = await Axios.get(`${apiUrl}/getSizeItem`, {
          params: { websiteId: selectedWebsite.id },
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        // Convertir de bytes vers GB : bytes / 1024 (KB) / 1024 (MB)
        // Note: Même calcul que dans modificationHome.jsx pour cohérence
        const totalSizeInMB = response.data.totalSize / 1024; // MB
        const totalSizeInGB = (totalSizeInMB / 1024).toFixed(4); // GB
        setStorageSize(parseFloat(totalSizeInGB) || 0);
      } catch (error) {
        console.error('Erreur lors de la récupération de la taille de stockage:', error);
        setStorageSize(0);
      } finally {
        setStorageLoading(false);
      }
    };
    
    if (!loading && selectedWebsite?.id) {
      fetchStorageSize();
    } else {
      setStorageSize(0);
    }
  }, [selectedWebsite?.id, loading, token, apiUrl]);

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
      <div className='outlet-box'>
        <div style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          backgroundColor: theme.palette.primary.secondary,
          borderRadius: '12px',
          border: `1px solid ${theme.palette.primary.third}`
        }}>
          <IoGlobeOutline style={{ 
            fontSize: '4rem', 
            color: theme.palette.text.secondary,
            marginBottom: '1rem'
          }} />
          <h2 style={{
            color: theme.palette.text.primary,
            fontWeight: 600,
            marginBottom: '0.5rem',
            fontSize: '1.75rem'
          }}>
            Aucun site sélectionné
          </h2>
          <p style={{
            color: theme.palette.text.secondary,
            marginBottom: '2rem',
            fontSize: '1rem'
          }}>
            Sélectionnez un site dans le menu ci-dessus ou créez-en un nouveau
          </p>
          <button
            onClick={() => navigate('/dashboard/website/create')}
            style={{
              backgroundColor: theme.palette.colors.verPrimary,
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              fontWeight: 500,
              marginRight: '1rem',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <MdOutlineAdd style={{ fontSize: '1.25rem' }} />
            Créer un site
          </button>
          <SecondaryButton onClick={() => navigate('/dashboard/websites')}>
            Voir tous mes sites
          </SecondaryButton>
        </div>
      </div>
    );
  }

  // Vue d'ensemble du site sélectionné
  const quickActions = [
    {
      title: 'Modifications',
      description: 'Éditer le contenu de votre site',
      icon: MdOutlineCreate,
      path: '/dashboard/website/modification/',
      enabled: true
    },
    {
      title: 'E-commerce',
      description: 'Gérer vos produits et commandes',
      icon: MdOutlineShoppingCart,
      path: '/dashboard/website/ecommerce',
      enabled: ecommAuth
    },
    {
      title: 'Statistiques',
      description: 'Analyser les performances',
      icon: MdOutlineBarChart,
      path: '/dashboard/website/stats',
      enabled: true
    },
    {
      title: 'Contacts',
      description: 'Messages de vos visiteurs',
      icon: PiChatCircleDotsBold,
      path: '/dashboard/website/contact',
      enabled: true
    },
    {
      title: 'Newsletter',
      description: 'Gérer vos abonnés',
      icon: MdOutlineNewspaper,
      path: '/dashboard/website/newsletter',
      enabled: newsAuth
    },
    ...(selectedWebsite.user_role === 'admin' ? [{
      title: 'Paramètres',
      description: 'Configurer votre site',
      icon: MdOutlineSettings,
      path: `/dashboard/website/settings/${selectedWebsite.id}`,
      enabled: true
    }] : [])
  ];

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
          <span className="breadcrumb-item-active" style={{ color: theme.palette.text.primary }}>
            {selectedWebsite.website_name}
          </span>
        </div>
      </div>

      <div>

      
      {/* En-tête du site */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className='website-icon'>
              <IoGlobeOutline style={{ color: theme.palette.text.primary, fontSize: '2.5rem' }} />
            </div>
            <div>
              <h1 className='website-home-title'>
                {selectedWebsite.website_name}
              </h1>
              <a
                href={`https://${selectedWebsite.website_slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className='website-home-link'
              >
                {selectedWebsite.website_slug}
                <MdOutlineOpenInNew style={{ fontSize: '1rem' }} />
              </a>
            </div>
          </div>
          
          <SecondaryButton onClick={() => navigate('/dashboard/websites')}>
            Voir tous mes sites
          </SecondaryButton>
        </div>

        {/* Badges de statut */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {selectedWebsite.is_published && (
            <span style={{
              backgroundColor: `${theme.palette.colors.verPrimary}22`,
              color: theme.palette.colors.verPrimary,
              fontWeight: 500,
              border: `1px solid ${theme.palette.colors.verPrimary}44`,
              padding: '0.35rem 0.75rem',
              borderRadius: '16px',
              fontSize: '0.875rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <MdOutlineCheckCircle style={{ fontSize: '1rem' }} />
              Publié
            </span>
          )}
        </div>

      {/* Actions rapides */}
      <div className="website-home-box">
        <h2 className='website-home-title-h2'>
          Actions rapides
        </h2>

        <div className="website-home-link-contain">
          {quickActions.map((action, index) => {
            const IconComponent = action.icon;
            if (action.enabled) {
              return (
                <NavLink
                  key={index}
                  to={action.path}
                  className="modification_box"
                  style={{
                    backgroundColor: theme.palette.primary.secondary,
                    boxShadow: theme.palette.shadow.main,
                    position: 'relative'
                  }}
                >
                  <div className="modification_title_box" style={{ color: theme.palette.text.primary }}>
                    <div className="modification_title">
                      <IconComponent className="icon_modifiaction_title" />
                      <b>{action.title}</b>
                    </div>
                    <div className="button_modificationHome">
                      <MdArrowForwardIos />
                    </div>
                  </div>
                  <div className="texte_modification" style={{ color: theme.palette.text.secondary }}>
                    {action.description}
                  </div>
                </NavLink>
              );
            } else {
              return (
                <div
                  key={index}
                  className="modification_box"
                  style={{
                    backgroundColor: theme.palette.primary.secondary,
                    boxShadow: theme.palette.shadow.main,
                    opacity: 0.6,
                    cursor: 'not-allowed',
                    position: 'relative'
                  }}
                >
                  <MdOutlineLock style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    color: theme.palette.text.secondary,
                    fontSize: '1.25rem'
                  }} />
                  <div className="modification_title_box" style={{ color: theme.palette.text.primary }}>
                    <div className="modification_title">
                      <IconComponent className="icon_modifiaction_title" />
                      <b>{action.title}</b>
                    </div>
                  </div>
                  <div className="texte_modification" style={{ color: theme.palette.text.secondary }}>
                    {action.description}
                  </div>
                </div>
              );
            }
          })}
        </div>
      </div>

      {/* Statistiques rapides */}
      <div style={{ marginTop: '3rem' }}>
        <h2 className='website-home-title-h2'>
          Aperçu
        </h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1rem'
        }}>
          {/* Mini graphique utilisateurs actifs */}
          <NavLink className='modification_box'
            to={"/dashboard/website/stats/analytics"}
            style={{
              backgroundColor: theme.palette.primary.secondary,
              padding: "1rem",
              boxShadow: theme.palette.shadow.main,              
            }}  
          >
            <div className='website-graph-wrapper'>
              <div className='website-graph-info'>
                <p style={{ 
                  color: theme.palette.text.secondary, 
                  fontSize: '0.875rem',
                  margin: '0 0 0.5rem 0',
                  whiteSpace: "nowrap",
                }}>
                  Utilisateurs actifs
                </p>
                {statsLoading ? (
                  <CircularProgress size={20} sx={{ color: theme.palette.colors.verPrimary }} />
                ) : userStats && userStats.data ? (
                  (() => {
                    const sortedData = [...userStats.data.currentPeriod].sort((a, b) => 
                      dayjs(a.date, 'YYYYMMDD').isBefore(dayjs(b.date, 'YYYYMMDD')) ? -1 : 1
                    );
                    const values = sortedData.map(d => parseInt(d.value || 0));
                    return (
                      <p style={{ 
                        color: theme.palette.text.primary, 
                        fontSize: '1.5rem', 
                        fontWeight: 600,
                        margin: 0
                      }}>
                        {values.reduce((acc, v) => acc + v, 0)}
                      </p>
                    );
                  })()
                ) : (
                  <p style={{ 
                    color: theme.palette.text.secondary, 
                    fontSize: '0.875rem',
                    margin: 0
                  }}>
                    Données non disponibles
                  </p>
                )}
              </div>
              {userStats && userStats.data && !statsLoading && (
                (() => {
                  // Trier les données par date
                  const sortedData = [...userStats.data.currentPeriod].sort((a, b) => 
                    dayjs(a.date, 'YYYYMMDD').isBefore(dayjs(b.date, 'YYYYMMDD')) ? -1 : 1
                  );

                  const dates = sortedData.map(d => dayjs(d.date, 'YYYYMMDD').format('YYYY-MM-DD'));
                  const values = sortedData.map(d => parseInt(d.value || 0));

                  return (
                    <ResponsiveChartContainer
                      series={[
                        {
                          type: 'line',
                          data: values,
                          color: '#2ec96d',
                          curve: 'linear',
                          label: 'Utilisateurs actifs',
                          showMark: false
                        }
                      ]}
                      xAxis={[
                        {
                          data: dates,
                          scaleType: 'band',
                          id: 'date'
                        }
                      ]}
                      yAxis={[
                        {
                          id: 'value',
                          scaleType: 'linear'
                        }
                      ]}
                      height={80}
                      margin={{ top: 5, bottom: 5, left: 5, right: 5 }}
                      sx={{
                        '.MuiLineElement-root': {
                          strokeWidth: 1.5,
                        },
                        '.MuiChartsAxis-root': {
                          display: 'none'
                        }
                      }}
                    >
                      <LinePlot />
                      <ChartsXAxis axisId="date" sx={{ display: 'none' }} />
                      <ChartsYAxis axisId="value" sx={{ display: 'none' }} />
                      <CustomAxisTooltip themeColor={theme} type="axes" />
                    </ResponsiveChartContainer>
                  );
                })()
              )}
            </div>
          </NavLink>

          {/* Mini graphique événements */}
          <NavLink className='modification_box'
            to={"/dashboard/website/stats/analytics"}
            style={{
              backgroundColor: theme.palette.primary.secondary,
              padding: "1rem",
              boxShadow: theme.palette.shadow.main,              
            }}  
          >
            <div className='website-graph-wrapper'>
              <div className='website-graph-info'>
                <p style={{ 
                  color: theme.palette.text.secondary, 
                  fontSize: '0.875rem',
                  margin: '0 0 0.5rem 0',
                  whiteSpace: "nowrap",
                }}>
                  Nombre d'événements
                </p>
                {eventStatsLoading ? (
                  <CircularProgress size={20} sx={{ color: theme.palette.colors.verPrimary }} />
                ) : eventStats && eventStats.data ? (
                  (() => {
                    const sortedData = [...eventStats.data.currentPeriod].sort((a, b) => 
                      dayjs(a.date, 'YYYYMMDD').isBefore(dayjs(b.date, 'YYYYMMDD')) ? -1 : 1
                    );
                    const values = sortedData.map(d => parseInt(d.value || 0));
                    return (
                      <p style={{ 
                        color: theme.palette.text.primary, 
                        fontSize: '1.5rem', 
                        fontWeight: 600,
                        margin: 0
                      }}>
                        {values.reduce((acc, v) => acc + v, 0)}
                      </p>
                    );
                  })()
                ) : (
                  <p style={{ 
                    color: theme.palette.text.secondary, 
                    fontSize: '0.875rem',
                    margin: 0
                  }}>
                    Données non disponibles
                  </p>
                )}
              </div>
              {eventStats && eventStats.data && !eventStatsLoading && (
                (() => {
                  // Trier les données par date
                  const sortedData = [...eventStats.data.currentPeriod].sort((a, b) => 
                    dayjs(a.date, 'YYYYMMDD').isBefore(dayjs(b.date, 'YYYYMMDD')) ? -1 : 1
                  );

                  const dates = sortedData.map(d => dayjs(d.date, 'YYYYMMDD').format('YYYY-MM-DD'));
                  const values = sortedData.map(d => parseInt(d.value || 0));

                  return (
                    <ResponsiveChartContainer
                      series={[
                        {
                          type: 'line',
                          data: values,
                          color: '#2ec96d',
                          curve: 'linear',
                          label: 'Nombre d\'événements',
                          showMark: false
                        }
                      ]}
                      xAxis={[
                        {
                          data: dates,
                          scaleType: 'band',
                          id: 'date'
                        }
                      ]}
                      yAxis={[
                        {
                          id: 'value',
                          scaleType: 'linear'
                        }
                      ]}
                      height={80}
                      margin={{ top: 5, bottom: 5, left: 5, right: 5 }}
                      sx={{
                        '.MuiLineElement-root': {
                          strokeWidth: 1.5,
                        },
                        '.MuiChartsAxis-root': {
                          display: 'none'
                        }
                      }}
                    >
                      <LinePlot />
                      <ChartsXAxis axisId="date" sx={{ display: 'none' }} />
                      <ChartsYAxis axisId="value" sx={{ display: 'none' }} />
                      <CustomAxisTooltip themeColor={theme} type="axes" />
                    </ResponsiveChartContainer>
                  );
                })()
              )}
            </div>
          </NavLink>

          {/* Collections CMS */}
          <NavLink className='modification_box'
            to="/dashboard/website/modification/collection"
            style={{
              backgroundColor: theme.palette.primary.secondary,
              padding: "1rem",
              boxShadow: theme.palette.shadow.main,              
            }}  
          >
            <div className='website-graph-wrapper'>
              <div className='website-graph-info'>
                <p style={{ 
                  color: theme.palette.text.secondary, 
                  fontSize: '0.875rem',
                  margin: '0 0 0.5rem 0',
                  whiteSpace: "nowrap",
                }}>
                  Collections CMS
                </p>
                {collectionsLoading ? (
                  <CircularProgress size={20} sx={{ color: theme.palette.colors.verPrimary }} />
                ) : (
                  <p style={{ 
                    color: theme.palette.text.primary, 
                    fontSize: '1.5rem', 
                    fontWeight: 600,
                    margin: 0
                  }}>
                    {collectionsCount}
                  </p>
                )}
              </div>
              {!collectionsLoading && (
                <ResponsiveChartContainer
                  series={[
                    {
                      type: 'pie',
                      data: [
                        { id: 'collections', value: collectionsCount || 1, color: '#2ec96d', label: `Nombre de collections: ${collectionsCount || 0}` },
                        { id: 'restantes', value: Math.max(10 - (collectionsCount || 0), 0), color: 'rgba(46, 201, 109, 0.15)', label: `Collections restantes: ${Math.max(10 - (collectionsCount || 0), 0)}` }
                      ],
                      innerRadius: 28,
                      outerRadius: 32,
                      paddingAngle: 0,
                      cornerRadius: 0
                    }
                  ]}
                  width={100}
                  height={80}
                  margin={{ top: 0, bottom: 0, left: 0, right: 0 }}
                  sx={{
                    '.MuiChartsLegend-root': {
                      display: 'none'
                    },
                    '& .MuiPieArc-root': {
                      stroke: 'none',
                      strokeWidth: 0
                    }
                  }}
                >
                  <PiePlot />
                  <CustomAxisTooltip themeColor={theme} type='item' />
                </ResponsiveChartContainer>
              )}
            </div>
          </NavLink>
          
          {/* Espace utilisé */}
          <NavLink className='modification_box'
            to="/dashboard/website/modification"
            style={{
              backgroundColor: theme.palette.primary.secondary,
              padding: "1rem",
              boxShadow: theme.palette.shadow.main,              
            }}  
          >
            <div className='website-graph-wrapper'>
              <div className='website-graph-info'>
                <p style={{ 
                  color: theme.palette.text.secondary, 
                  fontSize: '0.875rem',
                  margin: '0 0 0.5rem 0',
                  whiteSpace: "nowrap",
                }}>
                  Espace utilisé
                </p>
                {storageLoading ? (
                  <CircularProgress size={20} sx={{ color: theme.palette.colors.verPrimary }} />
                ) : (
                  <p style={{ 
                    color: theme.palette.text.primary, 
                    fontSize: '1.5rem', 
                    fontWeight: 600,
                    margin: 0
                  }}>
                    {(storageSize || 0).toFixed(2)} GB
                  </p>
                )}
              </div>
              {!storageLoading && (
                <ResponsiveChartContainer
                  series={[
                    {
                      type: 'pie',
                      data: [
                        { id: 'utilise', value: Math.max(storageSize || 0.001, 0.001), color: '#2ec96d', label: `Espace utilisé: ${(storageSize || 0).toFixed(2)} GB` },
                        { id: 'restant', value: Math.max(5 - (storageSize || 0), 0.001), color: 'rgba(46, 201, 109, 0.15)', label: `Espace restant: ${Math.max(5 - (storageSize || 0), 0).toFixed(2)} GB` }
                      ],
                      innerRadius: 28,
                      outerRadius: 32,
                      paddingAngle: 0,
                      cornerRadius: 0
                    }
                  ]}
                  width={100}
                  height={80}
                  margin={{ top: 0, bottom: 0, left: 0, right: 0 }}
                  sx={{
                    '.MuiChartsLegend-root': {
                      display: 'none'
                    },
                    '& .MuiPieArc-root': {
                      stroke: 'none',
                      strokeWidth: 0
                    }
                  }}
                >
                  <PiePlot />
                  <CustomAxisTooltip themeColor={theme} type='item' />
                </ResponsiveChartContainer>
              )}
            </div>
          </NavLink>
        </div>
        </div>
      </div>
    </div>
  );
};

export default WebsiteHome;
