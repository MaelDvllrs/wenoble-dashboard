import React, { useContext, useState, useRef, useMemo, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation, useParams } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { ClickAwayListener, Popper, Grow, IconButton } from '@mui/material';
import ThemeContext from '../../../../Theme/themeContext';
import { useWebsite } from '../../../../Context/WebsiteContext';
import { SimpleSearchField, DefaultButton, SecondaryButton } from '../../../../Theme/element';
import Snackbar from '@mui/material/Snackbar';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import PendingIcon from '@mui/icons-material/Pending';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { checkAuthorization } from '../../../../Authorisation/Authorisation';
import Cookies from 'js-cookie';
import { useSnackbar } from '../../../../Theme/snackbar';

import { generateStaticSite } from '../modification_site/Collection/apiCollection';
import Axios from 'axios';
import config from '../../../../config';

// Icons
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import CreateOutlinedIcon from '@mui/icons-material/CreateOutlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import EqualizerOutlinedIcon from '@mui/icons-material/EqualizerOutlined';
import NewspaperOutlinedIcon from '@mui/icons-material/NewspaperOutlined';
import { PiChatCircleDotsBold, PiPlusBold, PiGearSixBold } from 'react-icons/pi';
import LanguageIcon from '@mui/icons-material/Language';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import MailIcon from '@mui/icons-material/Mail';
import SettingsIcon from '@mui/icons-material/Settings';
import LockIcon from '@mui/icons-material/Lock';
import CardMembershipIcon from '@mui/icons-material/CardMembership';
import ReceiptIcon from '@mui/icons-material/Receipt';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

import '../Users/AccountSettings.css';

const WebsiteManager = () => {
  const theme = useTheme();
  const { isDark } = useContext(ThemeContext);
  const navigate = useNavigate();
  // Website selector from context (doit être appelé AVANT toute utilisation de selectedWebsite)
  const { websites, selectedWebsite, loading: loadingWebsites, selectWebsite } = useWebsite();

  const [newsAuth, setNewsAuth] = useState(false);
  const [analyticsAuth, setAnalyticsAuth] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showPublishPopup, setShowPublishPopup] = useState(false);
  const [dataRetrievalStatus, setDataRetrievalStatus] = useState(false);
  const [pageGenerationStatus, setPageGenerationStatus] = useState(false);
  const [sitePublishingStatus, setSitePublishingStatus] = useState(false);
  // Abonnement et popup domaine
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [showDomainPopup, setShowDomainPopup] = useState(false);
  const [publishCustomDomain, setPublishCustomDomain] = useState(false);


  const token = Cookies.get('token');
  const { showSnackbar } = useSnackbar();
  
  // Website selector from context
  const [openWebsiteMenu, setOpenWebsiteMenu] = useState(false);
  const [websiteSearch, setWebsiteSearch] = useState('');
  const websiteMenuRef = useRef(null);
  const websiteSearchInputRef = useRef(null);
  // Ref pour le bouton Publier (popup domaine)
  const publishBtnRef = useRef(null);



  // Récupérer l'abonnement du site sélectionné ET la feature custom_domain (nouvelle route GET)
  useEffect(() => {
    const fetchSubscriptionAndFeature = async () => {
      if (!selectedWebsite?.id) return;
      try {

        // Vérifier la feature custom_domain via la nouvelle route GET
        let customDomain = false;
        if (selectedWebsite?.id) {
          const authRes = await Axios.get(`${config.apiUrl}/custom-domain-authorisation/${selectedWebsite.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          customDomain = !!authRes.data.authorisation;
        }
        setSubscriptionInfo({ custom_domain: customDomain });
      } catch (e) {
        setSubscriptionInfo(null);
      }
    };
    fetchSubscriptionAndFeature();
  }, [selectedWebsite, token]);


  
  const filteredWebsites = useMemo(() => {
    const q = websiteSearch.trim().toLowerCase();
    if (!q) return websites || [];
    return (websites || []).filter(w => {
      const name = (w.website_name || '').toLowerCase();
      const slug = (w.website_slug || '').toLowerCase();
      return name.includes(q) || slug.includes(q);
    });
  }, [websites, websiteSearch]);

  const handleOpenWebsiteMenu = (event) => {
    event.stopPropagation();
    setOpenWebsiteMenu(true);

    setTimeout(() => {
      if (websiteSearchInputRef.current) {
        websiteSearchInputRef.current.focus();
      }
    }, 100);
  };

  

  const handleCloseWebsiteMenu = () => {
    setOpenWebsiteMenu(false);
    setWebsiteSearch('');
  };

  const handleSelectWebsite = (website) => {
    selectWebsite(website);
    setOpenWebsiteMenu(false);
  };

  const handleCreateWebsite = () => {
    navigate('/dashboard/website/create');
    setOpenWebsiteMenu(false);
  };

  const handleWebsiteSettings = () => {
    navigate('/dashboard/websites');
    setOpenWebsiteMenu(false);
  };

    // Effects
    useEffect(() => {
        const fetchAuth = async () => {
            if (selectedWebsite?.id) {
                const isAuthorisedNews = await checkAuthorization('auth_newsletter', selectedWebsite.id);
                const isAuthorisedAnalytics = await checkAuthorization('auth_analytics', selectedWebsite.id);
                setNewsAuth(isAuthorisedNews);
                setAnalyticsAuth(isAuthorisedAnalytics);
            } else {
                // Réinitialiser les autorisations si aucun site n'est sélectionné
                setNewsAuth(false);
                setAnalyticsAuth(false);
            }
        };
        if (!loadingWebsites) {
            fetchAuth();
        }
    }, [selectedWebsite, loadingWebsites]);



  // Breadcrumb dynamique multi-niveaux selon la route
  const location = useLocation();
  const params = useParams();
  let breadcrumbItems = [
    { label: 'Dashboard', to: '/dashboard/home' },
    { label: 'Sites Web', to: '/dashboard/website' }
  ];
  // Suppression du nom du site web dans le breadcrumb

  // Analyse du chemin pour générer dynamiquement les sous-niveaux
  // Exemples de routes :
  // /dashboard/website/modification/portfolio
  // /dashboard/website/modification/page
  // /dashboard/website/modification/collection
  // /dashboard/website/contact
  // /dashboard/website/newsletter
  // /dashboard/website/subscription/:id
  // /dashboard/website/billing/:id
  // /dashboard/website/settings/:id
  // /dashboard/website
  // /dashboard/website/:id

  // Découper le pathname pour détecter les sous/sous-sous-pages
  const pathParts = location.pathname.split('/').filter(Boolean); // remove empty
  // Cherche l'index de 'website' dans le chemin
  const websiteIdx = pathParts.indexOf('website');
  // Après 'website', on peut avoir : [id?], [subpage], [subsubpage], ...
  let afterWebsite = pathParts.slice(websiteIdx + 1);

  // Si la première partie est un ID (numérique ou uuid), on la saute (déjà dans breadcrumbItems)
  if (afterWebsite.length > 0 && (afterWebsite[0] === selectedWebsite?.id || /^(\d+|[a-f0-9\-]{8,})$/i.test(afterWebsite[0]))) {
    afterWebsite = afterWebsite.slice(1);
  }

  // Mapping des labels pour les sous-pages et sous-sous-pages
  const labelMap = {
    'modification': 'Modifications',
    'portfolio': 'Portfolio',
    'page': 'Page',
    'collection': 'Collection',
    'stats': 'Statistiques',
    'contact': 'Contacts',
    'newsletter': 'Newsletter',
    'subscription': 'Abonnement',
    'billing': 'Facturation',
    'settings': 'Paramètres',
    'create': 'Créer un site',
    'edit': 'Éditer',
    // Ajoutez d'autres sous-pages ici si besoin
  };

  // Ajoute dynamiquement chaque niveau de sous-page
  afterWebsite.forEach((part, idx) => {
    // Si c'est un id (numérique ou uuid), on ignore (déjà traité)
    if (/^(\d+|[a-f0-9\-]{8,})$/i.test(part)) return;
    const label = labelMap[part] || part.charAt(0).toUpperCase() + part.slice(1);
    // Le dernier élément est actif
    if (idx === afterWebsite.length - 1) {
      breadcrumbItems.push({ label, active: true });
    } else {
      // Construit le chemin jusqu'à ce niveau
      const to = '/dashboard/website/' + [ ...afterWebsite.slice(0, idx + 1)].filter(Boolean).join('/');
      breadcrumbItems.push({ label, to });
    }
  });

  console.log(selectedWebsite)

  return (
    <div className='outlet'>
      <div className="outlet-sidebar">
        <aside className="sidebar-secondary" style={{ borderColor: theme.palette.primary.third }}>
          
          {/* Website Selector */}
          <div className='website-selector' style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: `1px solid ${theme.palette.primary.third}` }}>
            <IconButton 
              className='website-selector-button'
              onClick={handleOpenWebsiteMenu} 
              ref={websiteMenuRef}
              sx={{ 
                color: theme.palette.text.primary, 
                padding: '0.5rem !important',
                display: 'flex !important',
                justifyContent: 'space-between !important',
                width: '100% !important'
              }}
              disabled={loadingWebsites}
            >
              {loadingWebsites ? (
                <div style={{ color: theme.palette.text.secondary }}>Chargement...</div>
              ) : (
                <>
                  <LanguageIcon fontSize='small' style={{color: theme.palette.text.secondary}}/>
                  <div className='website-info-button'>
                    <span className='website-selector-text'>
                      <b>{selectedWebsite ? selectedWebsite.website_name : 'Aucun site sélectionné'}</b>
                    </span>
                    {selectedWebsite && (
                      <span className={`website-selector-role ${selectedWebsite.user_role}`}>
                        {selectedWebsite.user_role}
                      </span>
                    )}
                    <UnfoldMoreIcon fontSize='small' className='icon' style={{color: theme.palette.text.secondary}} />
                  </div>
                </>
              )}
            </IconButton>
            
            <ClickAwayListener onClickAway={handleCloseWebsiteMenu}>
              <Popper 
                open={openWebsiteMenu} 
                anchorEl={websiteMenuRef.current} 
                transition 
                placement="bottom-start" 
                style={{zIndex: 120}}
              >
                {({ TransitionProps }) => (
                  <Grow {...TransitionProps} timeout={350}>
                    <div className='dashboard_case_empty user_menu_case' style={{
                      backgroundColor: theme.palette.primary.main, 
                      minWidth: '280px'
                    }}>
                      {/* En-tête avec infos site web */}
                      <div className='user_menu_header'>
                        <div className='user_info_section'>
                          <div className='user_profile_info'>
                            <div className='user_details'>
                              <div className='user_name_large' style={{ color: theme.palette.text.primary }}>
                                <b>Sites web</b>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <SimpleSearchField
                        theme={theme}
                        placeholder="Rechercher un site..."
                        value={websiteSearch}
                        onChange={(e) => setWebsiteSearch(e.target.value)}
                        inputRef={websiteSearchInputRef}
                        style={{ width: '100%' }}
                      />
                      
                      <div className="line_horizontal" style={{ backgroundColor: theme.palette.primary.third }}></div>

                      {/* Liste des sites */}
                      <div className='user_menu_actions'>
                        {loadingWebsites ? (
                          <div style={{ padding: '1rem', color: theme.palette.text.secondary }}>
                            Chargement...
                          </div>
                        ) : (filteredWebsites.length === 0) ? (
                          <div className='user_action_item' style={{ color: theme.palette.text.secondary }}>
                            Aucun site web trouvé
                          </div>
                        ) : (
                          filteredWebsites.map((website) => (
                            <div
                              key={website.id}
                              className={`user_action_item ${selectedWebsite?.id === website.id ? 'selected' : ''}`}
                              onClick={() => handleSelectWebsite(website)}
                              style={{ color: theme.palette.text.primary }}
                            >
                              <div className='button-selector'>
                                <div><b>{website.website_name}</b></div>
                                <div style={{ color: theme.palette.text.secondary, fontSize: '0.8rem' }}>
                                  {website.user_role}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="line_horizontal" style={{ backgroundColor: theme.palette.primary.third }}></div>
                          
                      {/* Actions */}
                      <div 
                        className='user_action_item'
                        onClick={handleCreateWebsite}
                        style={{ color: theme.palette.text.primary }}
                      >
                        <PiPlusBold className='action_icon' />
                        <span>Créer un nouveau site</span>
                      </div>
                      <div 
                        className='user_action_item'
                        onClick={handleWebsiteSettings}
                        style={{ color: theme.palette.text.primary }}
                      >
                        <PiGearSixBold className='action_icon' />
                        <span>Gérer les sites</span>
                      </div>
                    </div>
                  </Grow>
                )}
              </Popper>
            </ClickAwayListener>
          </div>

          {/* Navigation Links */}
          {selectedWebsite && (
            <>
              <NavLink 
                to="/dashboard/website"
                end
                className={({ isActive }) => `account-sidebar-link${isActive ? ' account-sidebar-link-active' : ''}`}
              >
                <DashboardOutlinedIcon fontSize='small'/>
                Vue d'ensemble
              </NavLink>
              
              <div className='line-sidebar small'></div>

              <NavLink 
                to={'/dashboard/website/modification/'}
                className={({ isActive }) => `account-sidebar-link${isActive ? ' account-sidebar-link-active' : ''}`}
              >
                <CreateOutlinedIcon fontSize='small'/>
                Modifications
              </NavLink>
              
              <NavLink 
                to={analyticsAuth ? "/dashboard/website/stats" : '#'}
                className={({ isActive }) => `account-sidebar-link${isActive && analyticsAuth ? ' account-sidebar-link-active' : ''}${!analyticsAuth ? ' disabled' : ''}`}
              >
                <EqualizerOutlinedIcon fontSize='small'/>
                Statistiques
                {!analyticsAuth && <span style={{ marginLeft: 'auto', fontSize: '0.75rem' }}><LockIcon fontSize='tiny'/></span>}
              </NavLink>
              
              <NavLink 
                to="/dashboard/website/contact"
                className={({ isActive }) => `account-sidebar-link${isActive ? ' account-sidebar-link-active' : ''}`}
              >
                <MailIcon fontSize='small'/>
                Contacts
              </NavLink>
              
              <NavLink 
                to={newsAuth ? '/dashboard/website/newsletter' : '#'}
                className={({ isActive }) => `account-sidebar-link${isActive && newsAuth ? ' account-sidebar-link-active' : ''}${!newsAuth ? ' disabled' : ''}`}
              >
                <NewspaperOutlinedIcon fontSize='small'/>
                Newsletter
                {!newsAuth && <span style={{ marginLeft: 'auto', fontSize: '0.75rem' }}><LockIcon fontSize='tiny'/></span>}
              </NavLink>

              <div className='line-sidebar small'></div>
              
              <NavLink 
                to={`/dashboard/website/subscription/${selectedWebsite.id}`}
                className={({ isActive }) => `account-sidebar-link${isActive ? ' account-sidebar-link-active' : ''}`}
              >
                <CardMembershipIcon fontSize='small'/>
                Abonnement
              </NavLink>
              
              <NavLink 
                to={`/dashboard/website/billing/${selectedWebsite.id}`}
                className={({ isActive }) => `account-sidebar-link${isActive ? ' account-sidebar-link-active' : ''}`}
              >
                <ReceiptIcon fontSize='small'/>
                Facturation
              </NavLink>
              
              {selectedWebsite.user_role === 'admin' && (
                <NavLink 
                  to={`/dashboard/website/settings/${selectedWebsite.id}`}
                  className={({ isActive }) => `account-sidebar-link${isActive ? ' account-sidebar-link-active' : ''}`}
                >
                  <SettingsIcon fontSize='small'/>
                  Paramètres
                </NavLink>
              )}
            </>
          )}
        </aside>
        
        <main className="outlet-sidebar-wrapper">
          <div className='outlet website-outlet'>
            {/* Header général de page (breadcrumb/actions) - version inline */}
            <div className="dashboard-header-section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem' }}>
              <div className="breadCrumbs">
                {breadcrumbItems.map((item, idx) => {
                  const isLast = idx === breadcrumbItems.length - 1;
                  return (
                    <span key={idx} style={{ display: 'inline-flex', alignItems: 'center' }}>
                      {!isLast && item.to ? (
                        <NavLink to={item.to} className="breadCrumbsLink" style={{ textDecoration: 'none', color: 'inherit' }}>{item.label}</NavLink>
                      ) : (
                        <span className="breadcrumb-item-active" style={{ color: 'var(--primary-text)' }}>{item.label}</span>
                      )}
                      {idx < breadcrumbItems.length - 1 && (
                        <span className="breadcrumb-separator" style={{ margin: '0 0.5rem', color: theme.palette.text.secondary }}>/</span>
                      )}
                    </span>
                  );
                })}
              </div>
              {/* Placez ici vos actions globales, ex: <GeneralPublishButton ... /> */}
              <div className="dashboard-header-actions">
                {/* Bouton Publier tout */}
                {selectedWebsite && (
                  <div className='dashboard-header-actions-box'>
                    <button 
                      className='download-button'
                      title="Voir le site public"
                      onClick={() => {
                        if (selectedWebsite?.website_slug) {
                          window.open(`https://${selectedWebsite.website_slug}`, '_blank');
                        }
                      }}
                    >
                      <OpenInNewIcon fontSize='small'/>
                    </button>

                    {/* Ref pour ancrer la popup */}
                    <span style={{ display: 'inline-block' }}>
                      <DefaultButton
                        ref={publishBtnRef}
                        onClick={() => {
                          if (isPublishing) return;
                          setShowDomainPopup(true);
                        }}
                        disabled={isPublishing}
                        size="large"
                      >
                        {isPublishing ? 'Publication...' : 'Publier'}
                      </DefaultButton>
                    </span>

                    {/* Popup de sélection de domaine pour la publication */}
                    <Popper
                      open={showDomainPopup}
                      anchorEl={publishBtnRef.current}
                      transition
                      placement="bottom-end"
                      style={{ zIndex: 1300 }}
                    >
                      {({ TransitionProps }) => (
                        <ClickAwayListener onClickAway={() => setShowDomainPopup(false)}>
                          <Grow {...TransitionProps} timeout={350}>
                            <div style={{marginTop:'0.5rem', background: theme.palette.primary.main, boxShadow: theme.palette.shadow.main, padding:'1rem', maxWidth: '350px', width: '60vw', borderRadius: '0.5rem'}}>
                              <Box sx={{ mb: 1 }}>
                                <h4 style={{ margin: 0, color: theme.palette.text.primary }}>Publication du site</h4>
                              </Box>
                              <div className='line-sidebar'></div>
                              <Box sx={{ mb: 1 }}>
                                {/* Domaine principal (toujours activé) */}
                                <div style={{display: 'flex', justifyContent: 'space-between', gap: '0.8rem'}}>
                                  <label className="custom-checkbox" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <input type="checkbox" checked disabled style={{ accentColor: theme.palette.primary.main }} />
                                    <span className="checkmark"></span>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
                                      <span style={{ color: theme.palette.text.secondary, fontSize: '0.85rem', lineHeight: 1 }}>
                                        Domaine preview
                                      </span>
                                      <span style={{ fontSize: '0.85rem', lineHeight: 1.2 }}>
                                        <b>{selectedWebsite?.website_preview}</b>
                                      </span>
                                    </div>
                                  </label>
                                  <button 
                                    className='download-button'
                                    title="Voir le site public"
                                    onClick={() => {
                                      if (selectedWebsite?.website_slug) {
                                        window.open(`https://${selectedWebsite.website_preview}`, '_blank');
                                      }
                                    }}
                                  >
                                    <OpenInNewIcon fontSize='tiny'/>
                                  </button>
                                </div>
                                <div className='line-sidebar'></div>
                                {/* Domaine personnalisé (si abonnement) */}
                                <div style={{display: 'flex', justifyContent: 'space-between', gap: '0.8rem'}}>
                                  <label className="custom-checkbox" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <input
                                      type="checkbox"
                                      checked={!!(subscriptionInfo?.custom_domain && publishCustomDomain)}
                                      onChange={e => setPublishCustomDomain(e.target.checked)}
                                      disabled={!subscriptionInfo?.custom_domain}
                                      style={{ accentColor: theme.palette.primary.main }}
                                    />
                                    <span className="checkmark"></span>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
                                      <span style={{ color: theme.palette.text.secondary, fontSize: '0.85rem', lineHeight: 1 }}>
                                        Domaine personnalisé
                                      </span>
                                      <span style={{ fontSize: '0.85rem', lineHeight: 1.2 }}>
                                        {subscriptionInfo?.custom_domain ? (
                                          <b>{selectedWebsite?.website_slug || 'Non configuré'}</b>
                                        ) : (
                                          <NavLink to={`/dashboard/website/subscription/${selectedWebsite.id}`} style={{ color: theme.palette.text.primary, marginLeft: 0, fontSize: 12 }}>
                                            Ajouter un domaine personnalisé
                                          </NavLink>
                                        )}
                                      </span>
                                    </div>
                                  </label>
                                  <button 
                                    className='download-button'
                                    title="Voir le site public"
                                    onClick={() => {
                                      if (selectedWebsite?.custom_domain) {
                                        window.open(`https://${selectedWebsite.custom_domain}`, '_blank');
                                      }
                                    }}
                                  >
                                    <OpenInNewIcon fontSize='tiny'/>
                                  </button>
                                </div>
                              </Box>
                              <div className='line-sidebar'></div>
                              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                <SecondaryButton
                                  variant="outlined"
                                  size="small"
                                  onClick={() => setShowDomainPopup(false)}
                                >
                                  Annuler
                                </SecondaryButton>
                                <DefaultButton
                                  disabled={isPublishing}
                                  onClick={async () => {
                                    setShowDomainPopup(false);
                                    setIsPublishing(true);
                                    setShowPublishPopup(true);
                                    setDataRetrievalStatus(true);
                                    setPageGenerationStatus(false);
                                    setSitePublishingStatus(false);
                                    try {
                                      setTimeout(() => setPageGenerationStatus(true), 900);
                                      // Appel API publication : customDomain = true si la checkbox est cochée ET autorisée
                                      const customDomain = !!(subscriptionInfo?.custom_domain && publishCustomDomain);
                                      const res = await generateStaticSite(token, selectedWebsite.id, 'all', customDomain);
                                      setTimeout(() => setSitePublishingStatus(true), 1800);
                                      await new Promise(r => setTimeout(r, 2600));
                                      if (res?.success === false) {
                                        showSnackbar('warning', "La génération du site a rencontré un problème partiel");
                                      } else {
                                        showSnackbar('success', res?.message || 'Site généré avec succès');
                                      }
                                    } catch (e) {
                                      console.error('Erreur publication site:', e);
                                      showSnackbar('error', 'Erreur lors de la génération du site');
                                    } finally {
                                      setIsPublishing(false);
                                      setTimeout(() => setShowPublishPopup(false), 800);
                                      setTimeout(() => {
                                        setDataRetrievalStatus(false);
                                        setPageGenerationStatus(false);
                                        setSitePublishingStatus(false);
                                      }, 1200);
                                    }
                                  }}
                                >
                                  Publier le site
                                </DefaultButton>
                              </Box>
                            </div>
                          </Grow>
                        </ClickAwayListener>
                      )}
                    </Popper>
                    <Snackbar
                      open={showPublishPopup}
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      sx={{ bottom: 24 }}
                    >
                      <Paper
                        elevation={6}
                        sx={{
                          p: 2,
                          minWidth: 300,
                          maxWidth: 400,
                          backgroundColor: theme.palette.background.default,
                          borderRadius: 2,
                        }}
                      >
                        <Box sx={{ mb: 2 }}>
                          <h3 style={{ margin: 0, color: theme.palette.text.primary }}>Publication du site</h3>
                        </Box>
                        {/* Étape 1: Récupération des données */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                          {!dataRetrievalStatus ? (
                            <>
                              <PendingIcon sx={{ color: theme.palette.text.secondary, width: 16, height: 16 }} />
                              <Box sx={{ color: theme.palette.text.secondary }}>Récupération des données</Box>
                            </>
                          ) : pageGenerationStatus ? (
                            <>
                              <CheckCircleIcon sx={{ color: "#2ec96d", width: 16, height: 16 }} />
                              <Box sx={{ color: theme.palette.text.secondary }}>Récupération des données</Box>
                            </>
                          ) : (
                            <>
                              <CircularProgress size={16} sx={{ color: "#2ec96d" }} />
                              <Box sx={{ color: theme.palette.text.primary }}>Récupération des données...</Box>
                            </>
                          )}
                        </Box>
                        {/* Étape 2: Génération des pages */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                          {!pageGenerationStatus ? (
                            <>
                              <PendingIcon sx={{ color: theme.palette.text.secondary, width: 16, height: 16 }} />
                              <Box sx={{ color: theme.palette.text.secondary }}>Génération des pages</Box>
                            </>
                          ) : sitePublishingStatus ? (
                            <>
                              <CheckCircleIcon sx={{ color: "#2ec96d", width: 16, height: 16 }} />
                              <Box sx={{ color: theme.palette.text.secondary }}>Génération des pages</Box>
                            </>
                          ) : (
                            <>
                              <CircularProgress size={16} sx={{ color: "#2ec96d" }} />
                              <Box sx={{ color: theme.palette.text.primary }}>Génération des pages...</Box>
                            </>
                          )}
                        </Box>
                        {/* Étape 3: Publication du site */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {!sitePublishingStatus ? (
                            <>
                              <PendingIcon sx={{ color: theme.palette.text.secondary, width: 16, height: 16 }} />
                              <Box sx={{ color: theme.palette.text.secondary }}>Publication du site</Box>
                            </>
                          ) : (
                            <>
                              <CheckCircleIcon sx={{ color: "#2ec96d", width: 16, height: 16 }} />
                              <Box sx={{ color: theme.palette.text.secondary }}>Publication du site</Box>
                            </>
                          )}
                        </Box>
                      </Paper>
                    </Snackbar>
                  </div>
                )}
              </div>
            </div>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default WebsiteManager;
