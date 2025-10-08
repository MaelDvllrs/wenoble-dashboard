import React, { useState,  useEffect, useMemo } from 'react';
import ComputerOutlinedIcon from '@mui/icons-material/ComputerOutlined';
import SmartphoneOutlinedIcon from '@mui/icons-material/SmartphoneOutlined';
import ArrowForwardIosRoundedIcon from '@mui/icons-material/ArrowForwardIosRounded';
import ArrowBackIosRoundedIcon from '@mui/icons-material/ArrowBackIosRounded';
import { useTheme } from '@mui/material/styles';
import { DefaultButton, SecondaryButton } from '../../../../Theme/element';
import { useSnackbar } from '../../../../Theme/snackbar';
import Axios from '../../../../service/AxiosConfig';
import Cookies from 'js-cookie';
import config from '../../../../config';
import '../website/website.css'; // Import des styles pour les modales

const AccountSecurity = () => {
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const [password, setPassword] = useState({ current: '', new: '', confirm: '' });
  const [logs, setLogs] = useState([]); 
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [page, setPage] = useState(0);
  const rowsPerPage = 5;

  // Fonction pour vérifier si le formulaire de mot de passe est valide
  const isPasswordFormValid = () => {
    return password.current.trim() !== '' && 
           password.new.trim() !== '' && 
           password.confirm.trim() !== '' &&
           password.new.length >= 8 &&
           password.new === password.confirm;
  };

  const apiUrl = config.apiUrl;
  const token = Cookies.get('token');

  // Fonctions de pagination
  const handlePrev = () => setPage((p) => Math.max(0, p - 1));
  const handleNext = () => setPage((p) => (p + 1) * rowsPerPage < logs.length ? p + 1 : p);

  // Obtenir les logs de la page actuelle
  const getCurrentPageLogs = () => {
    const startIndex = page * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return logs.slice(startIndex, endIndex);
  };

  // Fonction pour gérer la déconnexion après changement de mot de passe
  const handleLogout = () => {
    console.log('🔐 Déconnexion pour sécurité après changement de mot de passe');
    Cookies.remove('token');
    window.location.href = '/login';
  };

  // Fonction pour annuler le changement de mot de passe
  const handleCancelPasswordChange = () => {
    console.log('❌ Changement de mot de passe annulé');
    setShowLogoutDialog(false);
    showSnackbar('info', 'Changement de mot de passe annulé');
  };

  // Fonction de validation qui affiche la popup de confirmation
  const validateAndShowConfirmation = (e) => {
    e.preventDefault();
    
    // Validations côté client
    if (!password.current) {
      showSnackbar('error', 'Entrez votre mot de passe actuel');
      return;
    }
    if (!password.new || password.new.length < 8) {
      showSnackbar('error', 'Mot de passe trop court (min 8)');
      return;
    }
    if (password.new !== password.confirm) {
      showSnackbar('error', 'Confirmation incorrecte');
      return;
    }

    // Si toutes les validations passent, afficher la popup de confirmation
    console.log('✅ Validation réussie, affichage de la popup de confirmation');
    setShowLogoutDialog(true);
  };

  // Fonction qui exécute réellement le changement de mot de passe
  const executePasswordChange = async () => {
    try {
      console.log('🔄 Exécution du changement de mot de passe...');
      
      const response = await Axios.post(`${apiUrl}/user/change-password`, {
        currentPassword: password.current,
        newPassword: password.new
      }, { headers: { 'Authorization': `Bearer ${token}` } });
      
      // Gérer la réponse du serveur
      if (response.data.success) {
        console.log('✅ Mot de passe changé avec succès');
        
        // Nettoyer les champs
        setPassword({ current: '', new: '', confirm: '' });
        
        // Déconnexion immédiate
        handleLogout();
      }
    } catch (e) {
      console.error('❌ Erreur changement mot de passe:', e);
      
      // Fermer la popup d'abord
      setShowLogoutDialog(false);
      
      // Afficher l'erreur
      if (e.response?.status === 401) {
        showSnackbar('error', 'Mot de passe actuel incorrect');
      } else if (e.response?.status === 400) {
        showSnackbar('error', e.response.data.message || 'Données invalides');
      } else {
        showSnackbar('error', 'Erreur lors du changement de mot de passe');
      }
    }
  };


  // Récupération des logs de connexion
  useEffect(() => {
    let mounted = true;
    const fetchLogs = async () => {
      if (!token) return;
      setLoadingLogs(true);
      try {
  const { data } = await Axios.get(`${apiUrl}/user/login-logs`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { limit: 20 } // ajuste si besoin
        });
        if (mounted) {
          if (data?.success) {
            setLogs(Array.isArray(data.logs) ? data.logs : []);
            setPage(0); // Remettre à la première page
          } else {
            showSnackbar('error', data?.message || 'Impossible de récupérer les connexions');
          }
        }
      } catch (e) {
        console.error('fetch login-logs failed:', e);
        if (mounted) showSnackbar('error', 'Erreur lors du chargement des connexions');
      } finally {
        if (mounted) setLoadingLogs(false);
      }
    };
    fetchLogs();
    return () => { mounted = false; };
  }, [apiUrl, token, showSnackbar]);



  return (
    <div className='security-form'>
      <div className='profile-form-row' style={{ backgroundColor: theme.palette.primary.main, boxShadow: theme.palette.shadow.main }}>
        <h3 className='titlePage'>Sécurité</h3>
        <div className='line-sidebar'/>
        <h4 className='account-setting-title'>Mot de passe</h4>
        <form onSubmit={validateAndShowConfirmation} style={{ width: '100%', marginBottom: '1rem' }}>
          <div className='input-container'>
            <p className='blogField_name collection_edit_name'>Mot de passe actuel</p>
            <input className='input_text_blog' type='password' value={password.current} onChange={(e) => setPassword(prev => ({ ...prev, current: e.target.value }))} />
          </div>
          <div className='input-container'>
            <p className='blogField_name collection_edit_name'>Nouveau mot de passe</p>
            <input className='input_text_blog' type='password' value={password.new} onChange={(e) => setPassword(prev => ({ ...prev, new: e.target.value }))} />
          </div>
            <div className='input-container'>
              <p className='blogField_name collection_edit_name'>Confirmer le nouveau mot de passe</p>
              <input className='input_text_blog' type='password' value={password.confirm} onChange={(e) => setPassword(prev => ({ ...prev, confirm: e.target.value }))} />
            </div>
          <DefaultButton type='submit' disabled={!isPasswordFormValid()}>Enregistrer</DefaultButton>
        </form>
        <div className='line-sidebar'/>
        <h4 className='account-setting-title'>Connexions récentes</h4>
        {loadingLogs ? (
          <p className='account-settings-subtitle' style={{ color: theme.palette.text.secondary }}>
            Chargement des connexions…
          </p>
        ) : logs.length === 0 ? (
          <p className='account-settings-subtitle'>Aucune connexion récente.</p>
        ) : (
          <div className='logs-table-wrapper'>
            <table className='security-logs-table'>
              <thead>
                <tr>
                  <th className='col-date'>Date</th>
                  <th className='col-time'>Heure</th>
                  <th className='col-ip'>IP</th>
                  <th className='col-method'>Méthode</th>
                  <th className='col-status'>Statut</th>
                  <th className='col-device'>Appareil</th>
                  <th className='col-location'>Localisation</th>
                </tr>
              </thead>
              <tbody>
                {getCurrentPageLogs().map((log) => {
                  const d = new Date(log.created_at);
                  const dateStr = isNaN(d) ? '-' : d.toLocaleDateString('fr-FR');
                  const timeStr = isNaN(d) ? '-' : d.toLocaleTimeString('fr-FR');
                  const method = log.method || '-';
                  const status = log.success ? 'Succès' : 'Échec';
                  const uaFull = log.user_agent || '';
                  const isMobile = /mobile|iphone|ipad|android|ipod|blackberry|phone/i.test(uaFull);
                  const deviceLabel = isMobile ? 'Mobile' : 'PC';
                  let location = '-';
                  if (log.location && typeof log.location === 'object') {
                    const city = log.location.city || log.location.town || log.location.village || '';
                    const country = log.location.country || log.location.country_name || '';
                    const parts = [city, country].filter(Boolean);
                    if (parts.length) location = parts.join(', ');
                  }
                  return (
                    <tr key={log.id} className={`log-row ${log.success ? 'log-success' : 'log-fail'}`}>
                      <td className='col-date'>{dateStr}</td>
                      <td className='col-time'>{timeStr}</td>
                      <td className='col-ip mono'>{log.ip || '-'}</td>
                      <td className='col-method'><span className='badge-method'>{method}</span></td>
                      <td className='col-status'>
                        <span className={`badge-status ${log.success ? 'ok' : 'fail'}`}>{status}</span>
                      </td>
                      <td className='col-device' title={uaFull}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          {isMobile ? (
                            <SmartphoneOutlinedIcon style={{ fontSize: '0.95rem' }} />
                          ) : (
                            <ComputerOutlinedIcon style={{ fontSize: '1rem' }} />
                          )}
                          {deviceLabel}
                        </span>
                      </td>
                      <td className='col-location'>{location}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {logs.length > rowsPerPage && (
              <div className='table-footer table-footer-security'>
                <span></span>
                <div className='table-footer-info'>
                  <span>{logs.length === 0 ? '0' : `${page * rowsPerPage + 1} - ${Math.min((page + 1) * rowsPerPage, logs.length)} sur ${logs.length}`}</span>
                  <div className='table-footer-buttons'>
                    <button className='table-arrow-button' onClick={handlePrev} disabled={page === 0}>
                      <ArrowBackIosRoundedIcon fontSize='16'/>
                    </button>   
                    <button className='table-arrow-button' onClick={handleNext} disabled={(page + 1) * rowsPerPage >= logs.length}>
                      <ArrowForwardIosRoundedIcon fontSize='16'/>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Popup de confirmation de déconnexion après changement de mot de passe */}
      {/* Modal de confirmation du changement de mot de passe */}
      {showLogoutDialog && (
        <div className="modal_overlay" onClick={handleCancelPasswordChange}>
          <div className="modal_content" onClick={(e) => e.stopPropagation()}>
            <h3>Confirmer le changement de mot de passe</h3>
            <p>
              Vous êtes sur le point de changer votre mot de passe.
            </p>
            <p>
              <strong>Pour votre sécurité :</strong> Tous vos appareils seront automatiquement déconnectés 
              et vous devrez vous reconnecter avec votre nouveau mot de passe.
            </p>
            <p style={{ color: '#f57c00', fontSize: '0.9rem', marginTop: '1rem' }}>
              Cette action est irréversible. Assurez-vous de bien retenir votre nouveau mot de passe.
            </p>
            <div className="modal_actions">
              <SecondaryButton onClick={handleCancelPasswordChange}>
                Annuler
              </SecondaryButton>
              <DefaultButton onClick={executePasswordChange}>
                Confirmer et changer le mot de passe
              </DefaultButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountSecurity;
