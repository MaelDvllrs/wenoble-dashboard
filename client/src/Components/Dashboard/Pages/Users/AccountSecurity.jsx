import React, { useState,  useEffect, useMemo } from 'react';
import ComputerOutlinedIcon from '@mui/icons-material/ComputerOutlined';
import SmartphoneOutlinedIcon from '@mui/icons-material/SmartphoneOutlined';
import { useTheme } from '@mui/material/styles';
import { DefaultButton } from '../../../../Theme/element';
import { useSnackbar } from '../../../../Theme/snackbar';
import Axios from '../../../../service/AxiosConfig';
import Cookies from 'js-cookie';
import config from '../../../../config';

const AccountSecurity = () => {
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const [password, setPassword] = useState({ current: '', new: '', confirm: '' });
  const [logs, setLogs] = useState([]); 
  const [loadingLogs, setLoadingLogs] = useState(false);


  const apiUrl = config.apiUrl;
  const token = Cookies.get('token');

  const changePassword = async (e) => {
    e.preventDefault();
    try {
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
      await Axios.post(`${apiUrl}/user/change-password`, {
        currentPassword: password.current,
        newPassword: password.new
      }, { headers: { 'Authorization': `Bearer ${token}` } });
      setPassword({ current: '', new: '', confirm: '' });
      showSnackbar('success', 'Mot de passe modifié');
    } catch (e) {
      console.error('changePassword failed:', e);
      showSnackbar('error', 'Échec du changement de mot de passe');
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
        <form onSubmit={changePassword} style={{ width: '100%', marginBottom: '1rem' }}>
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
          <DefaultButton type='submit'>Enregistrer</DefaultButton>
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
                {logs.map((log) => {
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
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountSecurity;
