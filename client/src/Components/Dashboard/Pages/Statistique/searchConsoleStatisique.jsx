import React, { useEffect, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import MenuItem from '@mui/material/MenuItem';
import { SelectField, CustomAxisTooltip, SelectFieldSecondary } from '../../../../Theme/element';
import { LineHighlightPlot, LinePlot } from '@mui/x-charts/LineChart';
import { ResponsiveChartContainer } from '@mui/x-charts/ResponsiveChartContainer';

import { ChartsXAxis } from '@mui/x-charts/ChartsXAxis';
import { ChartsYAxis } from '@mui/x-charts/ChartsYAxis';
import { ChartsGrid } from '@mui/x-charts/ChartsGrid';
import { axisClasses } from '@mui/x-charts/ChartsAxis';
import { ChartsLegend } from '@mui/x-charts';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import Tooltip from '@mui/material/Tooltip';

import { PiSmileyMeltingFill } from "react-icons/pi";
import CircularProgress from '@mui/material/CircularProgress';

import { formatNumber, formatTime } from '../../../../utils/numberFormatted';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';

import Cookies from 'js-cookie';


import { getSearchConsoleStatistique } from './apiStatistique'; // Nouvelle fonction API à créer côté client
import dayjs from 'dayjs';
import './statistique.css';

export const SearchConsoleStatistique = () => {
  const token = Cookies.get('token');
  const theme = useTheme();
  const [userStatistique, setUserStatistique] = useState(null);
  const [dates, setDates] = useState([]);
  const [values, setValues] = useState([]);
  const [period, setPeriod] = useState('last14days');
  const [typeMetric, setTypeMetric] = useState('clicks');
  const [totalValues, setTotalValues] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setPeriod(event.target.value);
  };

  const handleChangeTypeMetric = (event) => {
    setTypeMetric(event.target.value);
  };

  useEffect(() => {
    const fetchStatistique = async () => {
      setLoading(false);
      const data = await getSearchConsoleStatistique(period, typeMetric, token);
      setUserStatistique(data);
      setLoading(true);
    };
    fetchStatistique();
  }, [period, typeMetric, token]);

  useEffect(() => {
    if (userStatistique && userStatistique.rows) {
      const currentDates = [];
      const currentValues = [];
      userStatistique.rows.forEach(row => {
        const date = row.keys[0];
        let value = 0;
        switch (typeMetric) {
          case 'clicks':
            value = typeof row.clicks !== 'undefined' ? Number(row.clicks) : 0;
            break;
          case 'impressions':
            value = typeof row.impressions !== 'undefined' ? Number(row.impressions) : 0;
            break;
          case 'ctr':
            value = typeof row.ctr !== 'undefined' ? Number(row.ctr) : 0;
            break;
          case 'position':
            value = typeof row.position !== 'undefined' ? Number(row.position) : 0;
            break;
          default:
            value = 0;
        }
        currentDates.push(date);
        currentValues.push(value);
      });
      setDates(currentDates);
      setValues(currentValues);
      // Somme pour clicks/impressions, moyenne pour ctr/position
      if (['ctr', 'position'].includes(typeMetric)) {
        const avg = currentValues.length > 0 ? currentValues.reduce((acc, value) => acc + value, 0) / currentValues.length : 0;
        setTotalValues(avg);
      } else {
        setTotalValues(currentValues.reduce((acc, value) => acc + value, 0));
      }
    }
  }, [userStatistique, typeMetric]);

  const labelMap = {
    clicks: { label: 'Clics', description: 'Le nombre total de clics correspond au nombre de fois qu\'un utilisateur a cliqué pour accéder à votre site.' },
    impressions: { label: 'Impressions', description: 'Le nombre total d\'impressions correspond au nombre de fois qu\'un internaute a vu un lien vers votre site dans les résultats de recherche.' },
    ctr: { label: 'CTR moyen', description: 'Le taux de clics moyen (CTR) correspond au pourcentage d\'impressions ayant abouti à un clic' },
    position: { label: 'Position moyenne', description: 'La position moyenne correspond à la position moyenne de votre site dans les résultats de recherche. Elle est calculée à l\'aide de sa position la plus élevée chaque fois qu\'il a été affiché dans les résultats de recherche. La position individuelle des pages est disponible dans le tableau sous le graphique.' },
  };

  const maxValue = values.length > 0 ? Math.max(...values) : 10;

  const series = [
    {
      type: 'line',
      curve: 'linear',
      yAxisId: 'value',
      color: '#2ec96d',
      label: labelMap[typeMetric].label,
      data: values,
    }
  ];

  return (
    <div className="statistique-container" style={{ boxShadow: theme.palette.shadow.main, backgroundColor: theme.palette.primary.main, minHeight: 320, width: '100%' }}>
      <div className='select-stat-container'>
        <SelectFieldSecondary
          id="metric-select"
          value={typeMetric}
          onChange={handleChangeTypeMetric}
          theme={theme}
        >
          {Object.entries(labelMap).map(([value, { label }]) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </SelectFieldSecondary>
        <Tooltip title={labelMap[typeMetric].description} placement="right">
          <InfoOutlinedIcon className='icon-select-stat-container' style={{color: theme.palette.text.secondary}}/>
        </Tooltip>
      </div>

      {userStatistique && (
        <div className='total-statistique'>
          <p className='info-statistique'>
            {typeMetric === 'ctr'
              ? `${(Number(totalValues) * 100).toFixed(2)} %`
              : typeMetric === 'position'
                ? Number(totalValues).toFixed(2)
                : formatNumber(totalValues)
            }
          </p>
        </div>
      )}

      {!loading ? (
        <div className='loading-message-stats' style={{ minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
          <CircularProgress sx={{color:"#2ec96d"}}/>
        </div>
      ) : (
        userStatistique && userStatistique.rows && userStatistique.rows.length > 0 ? (
          <div style={{ minHeight: 220, width: '100%' }}>
            <ResponsiveChartContainer
              series={series}
              xAxis={[
                {
                  id: 'date',
                  data: dates,
                  scaleType: 'band',
                },
              ]}
              yAxis={[
                {
                  id: 'value',
                  scaleType: 'linear',
                  // max: maxValue, // On retire le max pour laisser l'axe s'adapter
                },
              ]}
              sx={{
                "& .MuiLineElement-series-auto-generated-id-1":{
                    strokeDasharray: "10 5",
                    strokeWidth: "1",
                },
                "& .MuiChartsLegend-series-auto-generated-id-1 .MuiChartsLegend-mark":{
                    strokeWidth: "2",
                    strokeDasharray: "6",
                    stroke: "#2ec96d",
                    fill: "none",
                },
                "& .MuiChartsAxis-bottom .MuiChartsAxis-line":{
                  stroke:"none",
                },
                "& .MuiChartsAxis-left .MuiChartsAxis-line":{
                  stroke:"none",
                },
                "& .MuiChartsAxis-tick":{
                  stroke:"none !important", 
                },
                "& .MuiHighlightElement-root":{
                  transition: "transform 0.1s ease-in-out",
                },
              }}
            >
              <LinePlot />
              <ChartsXAxis
                label=""
                position="bottom"
                axisId="date"
                tickLabelStyle={{ fontSize: 10 }}
              />
              <ChartsYAxis
                label=""
                position="left"
                axisId="value"
                tickLabelStyle={{ fontSize: 10 }}
                sx={{
                  [`& .${axisClasses.label}`]: {
                    transform: 'translateX(-5px)',
                  },
                }}
              />
              <ChartsGrid 
                horizontal 
                sx={{
                    "& .MuiChartsGrid-line": {
                        stroke: theme.palette.primary.third,
                        opacity: 0.2,
                    },
                    }}  
              />
              <CustomAxisTooltip  
                themeColor={theme} 
                type='axes'
                typeMetric={typeMetric}
              />
              <LineHighlightPlot />
              <ChartsLegend
                direction="row"
                position={{
                  horizontal: 'right', 
                  vertical: 'top',
                }}
                labelStyle={{fontSize: 10}}
                itemMarkHeight={2}
                itemMarkWidth={20}
              />
            </ResponsiveChartContainer>
          </div>
        ) : (
          <div className='no-data-message-stats' style={{ minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
            <PiSmileyMeltingFill style={{ fontSize: 50, color: theme.palette.text.primary }} />
            Aucune donnée disponible.
          </div>
        )
      )}

      <SelectField
        id="period-select"
        value={period}
        onChange={handleChange}
        theme={theme}
      >
        <MenuItem value={'today'}>Aujourd'hui</MenuItem>
        <MenuItem value={'yesterday'}>Hier</MenuItem>
        <MenuItem value={'last7days'}>Les 7 derniers jours</MenuItem>
        <MenuItem value={'last14days'}>Les 14 derniers jours</MenuItem>
        <MenuItem value={'last30days'}>Les 30 derniers jours</MenuItem>
        <MenuItem value={'last90days'}>Les 90 derniers jours</MenuItem>
        <MenuItem value={'last365days'}>Les 12 derniers mois</MenuItem>
      </SelectField>
    </div>
  );
};

export default SearchConsoleStatistique;



