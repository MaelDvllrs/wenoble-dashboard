import React, { useContext, useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { CircularProgress } from '@mui/material';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
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
import { DefaultButton, SecondaryButton, RedButton } from '../../../../Theme/element';

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
              <NavLink to="/dashboard/website/create">
                <DefaultButton>Créer un site web</DefaultButton>
              </NavLink>
            </div>
          </div>

          {websites && websites.length > 0 ? (
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
                {websites.map((website) => (
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
