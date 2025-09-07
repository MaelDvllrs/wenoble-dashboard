import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { CircularProgress } from '@mui/material';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded';
import { PiGearSixBold } from "react-icons/pi";
import Cookies from 'js-cookie';
import './website.css';
import '../modification_site/Collection/collection.css';
import '../workspace/workspace.css';



// Internal imports
import config from '../../../../config';
import Axios from '../../../../service/AxiosConfig';
import { useSnackbar } from '../../../../Theme/snackbar';
import { WebsiteContext } from '../../../../Context/WebsiteContext';
import { DefaultButton, SecondaryButton, RedButton, IconButton, SimpleSearchField } from '../../../../Theme/element';

const WebsiteList = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const token = Cookies.get('token');
  const apiUrl = config.apiUrl;
  const { showSnackbar } = useSnackbar();
  const { websites, deleteWebsite } = useContext(WebsiteContext);
  
  // États pour les modales
  const [deleteModal, setDeleteModal] = useState({ open: false, websiteId: null, websiteName: '' });
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'list' | 'grid'
  const [search, setSearch] = useState('');

  // Charger/Enregistrer la préférence d'affichage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('websiteViewMode');
      if (saved === 'grid' || saved === 'list') setViewMode(saved);
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem('websiteViewMode', viewMode); } catch {}
  }, [viewMode]);

  const filteredWebsites = useMemo(() => {
    const q = (search || '').toLowerCase().trim();
    if (!Array.isArray(websites)) return [];
    if (!q) return websites;
    return websites.filter(w => {
      const name = (w.website_name || '').toLowerCase();
      const slug = (w.website_slug || '').toLowerCase();
      const role = (w.user_role || '').toLowerCase();
      return name.includes(q) || slug.includes(q) || role.includes(q);
    });
  }, [websites, search]);

  const handleDeleteConfirm = (website) => {
    setDeleteModal({ 
      open: true, 
      websiteId: website.id, 
      websiteName: website.website_name 
    });
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await Axios.delete(`${apiUrl}/deleteWebsite?websiteId=${deleteModal.websiteId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      deleteWebsite(deleteModal.websiteId);
      setDeleteModal({ open: false, websiteId: null, websiteName: '' });
      showSnackbar('Site web supprimé avec succès', 'success');
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Erreur lors de la suppression du site web';
      showSnackbar(errorMessage, 'error');
    }
    setLoading(false);
  };


  const getScreenshotUrl = (slug) =>
    `https://s.wordpress.com/mshots/v1/${encodeURIComponent(`https://${slug}`)}?w=600&h=360`;

  const PLACEHOLDER_IMG = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='360'><rect width='100%' height='100%' fill='%23161a22'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%236b7280' font-family='sans-serif' font-size='16'>Aperçu indisponible</text></svg>`;


  return (
    <div className="outlet">
      {/* Section titre avec breadcrumb */}
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
            Sites Web
          </span>
        </div>
      </div>

      <div className="dashboard_case_empty edit-case_empty">
        <div className='list-website-wrapper'>
          <div className="creation-website-header">
            <div className="content_page_header_left">
              <h3 className="heading_h3">Gestions Sites Web</h3>
            </div>
            <div className="content_page_header_right">
              {/* Barre de recherche (même composant que listeCollection) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '0.5rem' }}>
                <SimpleSearchField
                  placeholder="Rechercher un site..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  theme={theme}
                  sx={{ width: 260 }}
                />
              </div>
              
              {/* Toggle liste/grille */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginRight: '0.5rem' }}>
                <IconButton
                  ariaLabel="Vue liste"
                  onClick={() => setViewMode('list')}
                  size="small"
                  sx={{
                    color: viewMode === 'list' ? theme.palette.text.primary : theme.palette.text.secondary,
                    backgroundColor: viewMode === 'list' ? theme.palette.primary.third : 'transparent',
                    borderRadius: '0.35rem'
                  }}
                >
                  <FormatListBulletedIcon fontSize="small" />
                </IconButton>
                <IconButton
                  ariaLabel="Vue grille"
                  onClick={() => setViewMode('grid')}
                  size="small"
                  sx={{
                    color: viewMode === 'grid' ? theme.palette.text.primary : theme.palette.text.secondary,
                    backgroundColor: viewMode === 'grid' ? theme.palette.primary.third : 'transparent',
                    borderRadius: '0.35rem'
                  }}
                >
                  <GridViewRoundedIcon fontSize="small" />
                </IconButton>
              </div>
              <NavLink to="/dashboard/website/create">
                <DefaultButton>Créer un site web</DefaultButton>
              </NavLink>
            </div>
          </div>

          {Array.isArray(websites) && websites.length > 0 ? (
            filteredWebsites.length > 0 ? (
              viewMode === 'list' ? (
              <div className="liste_blog_wrapper">
                <div className="Item_menu">  
                  <div style={{color: theme.palette.text.secondary}} className="Item_portfolio_element website_name_element">
                    <span>Site Web</span>
                  </div>
                  <p style={{color: theme.palette.text.secondary}} className="Item_portfolio_element website_url_element">URL</p>
                  <p style={{color: theme.palette.text.secondary}} className="Item_portfolio_element website_role_element">Rôle</p>
                  <p style={{color: theme.palette.text.secondary}} className="Item_portfolio_element website_date_element">Date création</p>
                  <p style={{color: theme.palette.text.secondary}} className="Item_portfolio_element website_actions_element">Actions</p>
                </div>
                <div className="liste_blog_box">
                  {filteredWebsites.map((website) => (
                    <div
                      key={website.id}
                      className="Item_Portfolio Item_Blog"
                      style={{ '--hover-background-color': theme.palette.secondary.secondary, color: theme.palette.text.primary }}
                    >
                      <div className="Item_portfolio_element website_name_element">
                        <span style={{ fontWeight: 'bold', color: theme.palette.text.primary }}>
                          {website.website_name}
                        </span>
                      </div>
                      <div className="Item_portfolio_element website_url_element">
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.5rem',
                          color: theme.palette.text.secondary 
                        }}>
                          {website.website_slug}
                          <OpenInNewOutlinedIcon 
                            style={{ 
                              fontSize: '0.9rem',
                              cursor: 'pointer',
                              color: theme.palette.text.secondary
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`https://${website.website_slug}`, '_blank');
                            }}
                          />
                        </div>
                      </div>
                      <div className="Item_portfolio_element website_role_element">
                        <span className={`website-selector-role ${website.user_role}`}>
                          {website.user_role}
                        </span>
                      </div>
                      <p className="Item_portfolio_element website_date_element" style={{ color: theme.palette.text.secondary }}>
                        {new Date(website.created_at).toLocaleDateString('fr-FR')}
                      </p>
                      <div className="Item_portfolio_element website_actions_element">
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {website.user_role === 'admin' && (
                            <SecondaryButton
                              variant="outlined"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/dashboard/website/${website.id}/settings`);
                              }}
                              size="small"
                            >
                              <PiGearSixBold />
                            </SecondaryButton>
                          )}
                          {website.user_role === 'admin' && (
                            <RedButton
                              variant="outlined"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteConfirm(website);
                              }}
                              size="small"
                            >
                              Supprimer
                            </RedButton>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className='grid-website-wrapper'>
                {filteredWebsites.map((website) => (
                  <div
                    key={website.id}
                    style={{
                      
                      border: `1px solid ${theme.palette.primary.third}`,
                      borderRadius: '0.5rem',
                      padding: '0.8rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.6rem'
                    }}
                  >
                    {/* Aperçu du site */}
                    <div
                      style={{
                        position: 'relative',
                        borderRadius: '0.4rem',
                        overflow: 'hidden',
                        border: `1px solid ${theme.palette.primary.third}`,
                        backgroundColor: theme.palette.primary.third,
                        aspectRatio: '16 / 9'
                      }}
                    >
                      <img
                        src={getScreenshotUrl(website.website_slug)}
                        alt={`Capture de ${website.website_name}`}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = PLACEHOLDER_IMG;
                          e.currentTarget.style.objectFit = 'contain';
                          e.currentTarget.style.background = theme.palette.primary.main;
                        }}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                          objectPosition: 'center'
                        }}
                      />
                    </div>

                    {/* En‑tête carte */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <div style={{ fontWeight: 700 }}>{website.website_name}</div>
                      <span className={`website-selector-role ${website.user_role}`}>{website.user_role}</span>
                    </div>
                    {/* URL + bouton nouvel onglet */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: theme.palette.text.secondary }}>
                      {website.website_slug}
                      <OpenInNewOutlinedIcon
                        style={{ fontSize: '0.9rem', cursor: 'pointer' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`https://${website.website_slug}`, '_blank');
                        }}
                      />
                    </div>

                    {/* Pied de carte */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginTop: '0.25rem', alignItems: 'center' }}>
                      <div style={{ color: theme.palette.text.secondary, fontSize: '0.85rem' }}>
                        Créé le {new Date(website.created_at).toLocaleDateString('fr-FR')}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {website.user_role === 'admin' && (
                          <SecondaryButton
                            variant="outlined"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/dashboard/website/${website.id}/settings`);
                            }}
                            size="small"
                          >
                            <PiGearSixBold />
                          </SecondaryButton>
                        )}
                        {website.user_role === 'admin' && (
                          <RedButton
                            variant="outlined"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteConfirm(website);
                            }}
                            size="small"
                          >
                            Supprimer
                          </RedButton>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="empty_state">
              <div className="empty_state_content">
                <h3 style={{ color: theme.palette.text.secondary }}>
                  Aucun site ne correspond à votre recherche
                </h3>
                <p style={{ color: theme.palette.text.secondary }}>
                  Essayez un autre terme ou effacez la recherche
                </p>
              </div>
            </div>
          )
          ) : (
            <div className="empty_state">
              <div className="empty_state_content">
                <h3 style={{ color: theme.palette.text.secondary }}>
                  Aucun site web trouvé
                </h3>
                <p style={{ color: theme.palette.text.secondary }}>
                  Créez votre premier site web pour commencer
                </p>
                <NavLink to="/dashboard/website/create">
                  <DefaultButton>Créer un site web</DefaultButton>
                </NavLink>
              </div>
            </div>
          )}

        </div>

        {/* Modal de confirmation de suppression */}
        {deleteModal.open && (
          <div className="modal_overlay" onClick={() => setDeleteModal({ open: false, websiteId: null, websiteName: '' })}>
            <div className="modal_content" onClick={(e) => e.stopPropagation()}>
              <h3 style={{ color: '#f44336' }}>Supprimer le site web</h3>
              <p>
                Êtes-vous sûr de vouloir supprimer définitivement le site web <strong>{deleteModal.websiteName}</strong> ? 
                Cette action supprimera toutes les données associées et ne peut pas être annulée.
              </p>
              <div className="modal_actions">
                <SecondaryButton 
                  onClick={() => setDeleteModal({ open: false, websiteId: null, websiteName: '' })}
                >
                  Annuler
                </SecondaryButton>
                <RedButton onClick={handleDelete} disabled={loading}>
                  {loading ? <CircularProgress size={20} /> : 'Supprimer définitivement'}
                </RedButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WebsiteList;
