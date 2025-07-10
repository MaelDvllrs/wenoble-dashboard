import React, { useEffect, useState, useRef } from 'react';
import { useTheme } from '@mui/material/styles';
import MenuItem from '@mui/material/MenuItem';
import { SecondaryButton, SelectFieldSecondary, SortMenu } from '../../../../Theme/element';
import CircularProgress from '@mui/material/CircularProgress';
import Cookies from 'js-cookie';
import { getSearchConsoleTable } from './apiStatistique';
import dayjs from 'dayjs';
import ArrowForwardIosRoundedIcon from '@mui/icons-material/ArrowForwardIosRounded';
import ArrowBackIosRoundedIcon from '@mui/icons-material/ArrowBackIosRounded';
import ArrowDropDownOutlinedIcon from '@mui/icons-material/ArrowDropDownOutlined';
import ArrowDropUpOutlinedIcon from '@mui/icons-material/ArrowDropUpOutlined';
import SortIcon from '@mui/icons-material/Sort';

// Colonnes du tableau
const columns = {
  query: 'Requête',
  page: 'Page',
  clicks: 'Clics',
  impressions: 'Impressions',
  ctr: 'CTR',
  position: 'Position',
};

export const SearchConsoleTab = () => {
  // --- Hooks & States ---
  const theme = useTheme();
  const token = Cookies.get('token');
  const [type, setType] = useState('query');
  const [period, setPeriod] = useState('last14days');
  const [allData, setAllData] = useState([]); // toutes les lignes
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [tableHeight, setTableHeight] = useState(null);
  const tableContainerRef = useRef(null);
  const rowsPerPage = 10;
  // Tri
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('desc');
  const [sortMenuAnchor, setSortMenuAnchor] = useState(null);
  const [addColumn, setAddColumn] = useState('');
  const [pendingSorts, setPendingSorts] = useState([]); // Liste temporaire de tris
  const [appliedSorts, setAppliedSorts] = useState([]); // Tris appliqués au tableau

  // --- Options de tri dynamiques ---
  const sortOptions = [
    { key: 'main', label: columns[type] },
    { key: 'clicks', label: columns.clicks },
    { key: 'impressions', label: columns.impressions },
    { key: 'ctr', label: columns.ctr },
    { key: 'position', label: columns.position },
  ];

  // --- Data Fetching ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const json = await getSearchConsoleTable(type, period, token);
        setTotalRows(json.rows ? json.rows.length : 0);
        setAllData(json.rows || []);
        setPage(0);
      } catch (e) {
        setAllData([]);
        setTotalRows(0);
      }
      setLoading(false);
    };
    fetchData();
  }, [type, period, token]);

  // --- UI: Table Height ---
  useEffect(() => {
    if (!loading && tableContainerRef.current) {
      setTableHeight(tableContainerRef.current.offsetHeight);
    }
  }, [loading, allData]);

  // --- Pagination ---
  const handlePrev = () => setPage((p) => Math.max(0, p - 1));
  const handleNext = () => setPage((p) => (p + 1) * rowsPerPage < totalRows ? p + 1 : p);

  // --- Tri multi-colonnes ---
  const getSortedData = () => {
    let arr = [...allData];
    if (!appliedSorts || appliedSorts.length === 0) return arr.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
    arr.sort((a, b) => {
      for (let i = 0; i < appliedSorts.length; i++) {
        const sort = appliedSorts[i];
        let aValue, bValue;
        switch (sort.key) {
          case 'main':
            aValue = a.keys[0];
            bValue = b.keys[0];
            break;
          case 'clicks':
            aValue = a.clicks;
            bValue = b.clicks;
            break;
          case 'impressions':
            aValue = a.impressions;
            bValue = b.impressions;
            break;
          case 'ctr':
            aValue = a.ctr;
            bValue = b.ctr;
            break;
          case 'position':
            aValue = a.position;
            bValue = b.position;
            break;
          default:
            aValue = a.keys[0];
            bValue = b.keys[0];
        }
        let cmp;
        if (typeof aValue === 'string') {
          cmp = aValue.localeCompare(bValue);
        } else {
          cmp = aValue - bValue;
        }
        if (cmp !== 0) {
          return sort.dir === 'asc' ? cmp : -cmp;
        }
      }
      return 0;
    });
    return arr.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  };

  // --- Gestion du tri via l'en-tête du tableau ---
  const handleSort = (col) => {
    if (appliedSorts.length > 0 && appliedSorts[0].key === col) {
      setAppliedSorts([{ key: col, dir: appliedSorts[0].dir === 'asc' ? 'desc' : 'asc' }]);
    } else {
      setAppliedSorts([{ key: col, dir: 'desc' }]);
    }
    setSortColumn(col);
    setSortDirection(appliedSorts.length > 0 && appliedSorts[0].key === col && appliedSorts[0].dir === 'asc' ? 'desc' : 'asc');
    setPage(0);
  };

  // --- Gestion du menu de tri ---
  const handleOpenSortMenu = (e) => {
    setPendingSorts(appliedSorts.length > 0 ? [...appliedSorts] : []);
    setSortMenuAnchor(e.currentTarget);
  };
  const handleCloseSortMenu = () => setSortMenuAnchor(null);
  const handleAddSortColumn = (colKey) => {
    if (!pendingSorts.some(s => s.key === colKey)) {
      setPendingSorts([...pendingSorts, { key: colKey, dir: 'desc' }]);
    }
    setAddColumn('');
  };
  const handleRemoveSort = (colKey) => {
    setPendingSorts(pendingSorts.filter(s => s.key !== colKey));
  };
  const handleToggleSortDir = (colKey) => {
    setPendingSorts(pendingSorts.map(s =>
      s.key === colKey ? { ...s, dir: s.dir === 'asc' ? 'desc' : 'asc' } : s
    ));
  };
  const handleValidateSorts = () => {
    setAppliedSorts(pendingSorts);
    if (pendingSorts.length > 0) {
      setSortColumn(pendingSorts[0]?.key || null);
      setSortDirection(pendingSorts[0]?.dir || 'desc');
    }
    setSortMenuAnchor(null);
  };

  // --- Utilitaires ---
  const getLastDate = () => {
    const today = dayjs();
    switch (period) {
      case 'today':
        return today;
      case 'yesterday':
      case 'last7days':
      case 'last14days':
      case 'last30days':
      case 'last90days':
      case 'last365days':
        return today.subtract(1, 'day');
      default:
        return today;
    }
  };

  // --- Rendu UI ---
  return (
    <div className="statistique-container search-tab-statistique" style={{ boxShadow: theme.palette.shadow.main, backgroundColor: theme.palette.primary.main, minHeight: 320, width: '100%', padding: 24 }}>
      <div className='select-stat-container select-stat-container-tab' style={{gap: 16}}>
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
        <SecondaryButton
          variant="contained"
          onClick={handleOpenSortMenu}
          sx={{
            border: appliedSorts.length > 0 ? '1px solid var(--primary-color)' : '1px solid transparent',
            color: appliedSorts.length > 0 ? 'var(--primary-color)' : theme.palette.text.primary,
            background: appliedSorts.length > 0 ? 'rgba(46,201,109,0.08)' : 'transparent',
            transition: 'all 0.2s',
            minWidth: 0,
            padding: '0.2rem 0.7rem',
            gap: 1,
            '& .MuiButton-root': {
              boxShadow: theme.palette.shadow.main,
            },
          }}
        >
          <SortIcon fontSize='small' sx={{ color: appliedSorts.length > 0 ? 'var(--primary-color)' : theme.palette.text.secondary, mr: 0.5 }} />
          <span>
            {appliedSorts.length === 0
              ? 'Trier'
              : `Trier par ${appliedSorts.length} règle${appliedSorts.length > 1 ? 's' : ''}`}
          </span>
        </SecondaryButton>
        <SortMenu
          anchorEl={sortMenuAnchor}
          open={Boolean(sortMenuAnchor)}
          onClose={handleCloseSortMenu}
          options={sortOptions}
          sorts={pendingSorts}
          addColumn={addColumn}
          setAddColumn={col => {
            setAddColumn(col);
            if (col) handleAddSortColumn(col);
          }}
          onAddSort={handleValidateSorts}
          onRemoveSort={handleRemoveSort}
          onToggleSortDir={handleToggleSortDir}
          theme={theme}
        />
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
                <th className="searchconsole-th searchconsole-th-main" onClick={() => handleSort('main')} style={{cursor:'pointer'}}>
                  {columns[type]}
                  <div className="searchconsole-sort-icon">
                    {appliedSorts.length > 0 && appliedSorts[0].key === 'main' && (appliedSorts[0].dir === 'asc' ? <ArrowDropUpOutlinedIcon /> : <ArrowDropDownOutlinedIcon />)}
                  </div>
                </th>
                <th className="searchconsole-th searchconsole-th-clicks" onClick={() => handleSort('clicks')} style={{cursor:'pointer'}}>
                  Clics
                  <div className="searchconsole-sort-icon">
                    {appliedSorts.length > 0 && appliedSorts[0].key === 'clicks' && (appliedSorts[0].dir === 'asc' ? <ArrowDropUpOutlinedIcon /> : <ArrowDropDownOutlinedIcon />)}
                  </div>
                </th>
                <th className="searchconsole-th searchconsole-th-impr" onClick={() => handleSort('impressions')} style={{cursor:'pointer'}}>
                  Impressions
                  <div className="searchconsole-sort-icon">
                    {appliedSorts.length > 0 && appliedSorts[0].key === 'impressions' && (appliedSorts[0].dir === 'asc' ? <ArrowDropUpOutlinedIcon /> : <ArrowDropDownOutlinedIcon />)}
                  </div>
                </th>
                <th className="searchconsole-th searchconsole-th-ctr" onClick={() => handleSort('ctr')} style={{cursor:'pointer'}}>
                  CTR
                  <div className="searchconsole-sort-icon">
                    {appliedSorts.length > 0 && appliedSorts[0].key === 'ctr' && (appliedSorts[0].dir === 'asc' ? <ArrowDropUpOutlinedIcon /> : <ArrowDropDownOutlinedIcon />)}
                  </div>
                </th>
                <th className="searchconsole-th searchconsole-th-pos" onClick={() => handleSort('position')} style={{cursor:'pointer'}}>
                  Position
                  <div className="searchconsole-sort-icon">
                    {appliedSorts.length > 0 && appliedSorts[0].key === 'position' && (appliedSorts[0].dir === 'asc' ? <ArrowDropUpOutlinedIcon /> : <ArrowDropDownOutlinedIcon />)}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {getSortedData().length === 0 ? (
                <tr><td colSpan={5} className="searchconsole-td searchconsole-td-empty">Aucune donnée</td></tr>
              ) : (
                getSortedData().map((row, i) => (
                  <tr key={i} className="searchconsole-row" style={{ borderBottom: `1px solid ${theme.palette.primary.third}` }}>
                    <td className="searchconsole-td searchconsole-td-main">{row.keys[0]}</td>
                    <td className="searchconsole-td searchconsole-td-clicks">{row.clicks}</td>
                    <td className="searchconsole-td searchconsole-td-impr">{row.impressions}</td>
                    <td className="searchconsole-td searchconsole-td-ctr">{(Number(row.ctr) * 100).toFixed(2)} %</td>
                    <td className="searchconsole-td searchconsole-td-pos">{Number(row.position).toFixed(2)}</td>
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
