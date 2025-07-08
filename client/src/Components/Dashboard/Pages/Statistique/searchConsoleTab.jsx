import React, { useEffect, useState, useRef } from 'react';
import { useTheme } from '@mui/material/styles';
import MenuItem from '@mui/material/MenuItem';
import { SecondaryButton, SelectFieldSecondary } from '../../../../Theme/element';
import CircularProgress from '@mui/material/CircularProgress';
import Cookies from 'js-cookie';
import { getSearchConsoleTable } from './apiStatistique';
import dayjs from 'dayjs';

import ArrowForwardIosRoundedIcon from '@mui/icons-material/ArrowForwardIosRounded';
import ArrowBackIosRoundedIcon from '@mui/icons-material/ArrowBackIosRounded';


const columns = {
  query: 'Requête',
  page: 'Page',
};

export const SearchConsoleTab = () => {
  const theme = useTheme();
  const token = Cookies.get('token');
  const [type, setType] = useState('query');
  const [period, setPeriod] = useState('last14days');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [tableHeight, setTableHeight] = useState(null);
  const tableContainerRef = useRef(null);
  const rowsPerPage = 10;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const json = await getSearchConsoleTable(type, period, token);
        setTotalRows(json.rows ? json.rows.length : 0);
        setData(json.rows ? json.rows.slice(page * rowsPerPage, (page + 1) * rowsPerPage) : []);
      } catch (e) {
        setData([]);
        setTotalRows(0);
      }
      setLoading(false);
    };
    fetchData();
  }, [type, period, token, page]);

  useEffect(() => {
    if (!loading && tableContainerRef.current) {
      setTableHeight(tableContainerRef.current.offsetHeight);
    }
  }, [loading, data]);

  const handlePrev = () => setPage((p) => Math.max(0, p - 1));
  const handleNext = () => setPage((p) => (p + 1) * rowsPerPage < totalRows ? p + 1 : p);

  // Calcule la date de fin de la période sélectionnée
  const getLastDate = () => {
    const today = dayjs();
    switch (period) {
      case 'today':
        return today;
      case 'yesterday':
        return today.subtract(1, 'day');
      case 'last7days':
        return today.subtract(1, 'day');
      case 'last14days':
        return today.subtract(1, 'day');
      case 'last30days':
        return today.subtract(1, 'day');
      case 'last90days':
        return today.subtract(1, 'day');
      case 'last365days':
        return today.subtract(1, 'day');
      default:
        return today;
    }
  };

  return (
    <div className="statistique-container search-tab-statistique" style={{ boxShadow: theme.palette.shadow.main, backgroundColor: theme.palette.primary.main, minHeight: 320, width: '100%', padding: 24 }}>
      <div className='select-stat-container select-stat-container-tab'>
        <SelectFieldSecondary
          id="type-select"
          value={type}
          onChange={e => setType(e.target.value)}
          theme={theme}
        >
          <MenuItem value="query">Requêtes</MenuItem>
          <MenuItem value="page">Pages</MenuItem>
        </SelectFieldSecondary>
        <SelectFieldSecondary
          id="period-select"
          value={period}
          onChange={e => setPeriod(e.target.value)}
          theme={theme}
        >
          <MenuItem value={'today'}>Aujourd'hui</MenuItem>
          <MenuItem value={'yesterday'}>Hier</MenuItem>
          <MenuItem value={'last7days'}>7 jours</MenuItem>
          <MenuItem value={'last14days'}>14 jours</MenuItem>
          <MenuItem value={'last30days'}>30 jours</MenuItem>
          <MenuItem value={'last90days'}>90 jours</MenuItem>
          <MenuItem value={'last365days'}>12 mois</MenuItem>
        </SelectFieldSecondary>
      </div>
      {loading ? (
        <div className='loading-table-container' style={tableHeight ? { minHeight: tableHeight } : {}}>
          <CircularProgress sx={{ color: '#2ec96d' }} />
        </div>
      ) : (
        <div className='table-container' ref={tableContainerRef}>
          <table className='table-statistique'>
            <thead>
              <tr className="table-header searchconsole-table-header">
                <th className="searchconsole-th searchconsole-th-main">{columns[type]}</th>
                <th className="searchconsole-th searchconsole-th-clicks">Clics</th>
                <th className="searchconsole-th searchconsole-th-impr">Impressions</th>
                <th className="searchconsole-th searchconsole-th-ctr">CTR</th>
                <th className="searchconsole-th searchconsole-th-pos">Position</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr><td colSpan={5} className="searchconsole-td searchconsole-td-empty">Aucune donnée</td></tr>
              ) : (
                data.map((row, i) => (
                  <tr key={i} className="searchconsole-row" style={{ borderBottom: `1px solid ${theme.palette.primary.third}` }}>
                    <td className="searchconsole-td searchconsole-td-main" style={{ textAlign: 'left', padding: 8, color: theme.palette.text.primary, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.keys[0]}</td>
                    <td className="searchconsole-td searchconsole-td-clicks" style={{ textAlign: 'right', padding: 8 }}>{row.clicks}</td>
                    <td className="searchconsole-td searchconsole-td-impr" style={{ textAlign: 'right', padding: 8 }}>{row.impressions}</td>
                    <td className="searchconsole-td searchconsole-td-ctr" style={{ textAlign: 'right', padding: 8 }}>{(Number(row.ctr) * 100).toFixed(2)} %</td>
                    <td className="searchconsole-td searchconsole-td-pos" style={{ textAlign: 'right', padding: 8 }}>{Number(row.position).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      <div className='table-footer'>
        <span>
            Données disponibles jusqu'au : {getLastDate().format('DD/MM/YYYY')}
        </span>
        <div className='table-footer-info'>
            <span>{totalRows === 0 ? '0' : `${page * rowsPerPage + 1} - ${Math.min((page + 1) * rowsPerPage, totalRows)} sur ${totalRows}`}</span>
            <div className='table-footer-buttons'>
                <button className='table-arrow-button' onClick={handlePrev} disabled={page === 0}>
                    <ArrowBackIosRoundedIcon fontSize='16'/>
                </button>   
                <button className='table-arrow-button' onClick={handleNext} disabled={(page + 1) * rowsPerPage >= totalRows}>
                    <ArrowForwardIosRoundedIcon fontSize='16'/>
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SearchConsoleTab;
