import React, { useEffect, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import MenuItem from '@mui/material/MenuItem';
import { SelectField, CustomAxisTooltip, SelectFieldSecondary } from '../../../../Theme/element';
import { LineHighlightPlot } from '@mui/x-charts/LineChart';
import { ResponsiveChartContainer } from '@mui/x-charts/ResponsiveChartContainer';
import { BarPlot } from '@mui/x-charts/BarChart';

import { ChartsXAxis } from '@mui/x-charts/ChartsXAxis';
import { ChartsYAxis } from '@mui/x-charts/ChartsYAxis';
import { ChartsGrid } from '@mui/x-charts/ChartsGrid';
import { axisClasses } from '@mui/x-charts/ChartsAxis';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CircularProgress from '@mui/material/CircularProgress';


import { PiSmileyMeltingFill } from "react-icons/pi";

import Tooltip from '@mui/material/Tooltip';
import Cookies from 'js-cookie';

import { getPageStatistique } from './apiStatistique';
import './statistique.css';

export const PageStatistique = () => {
  const token = Cookies.get('token'); 
  const theme = useTheme();
  const [pageStatistique, setPageStatistique] = useState(null);
  const [page, setPage] = useState([]);
  const [typePage, setTypePage] = useState('pageTitle');
  const [typeUser, setTypeUser] = useState('activeUsers');

  const [values, setValues] = useState([]);
  const [period, setPeriod] = useState('last14days');
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setPeriod(event.target.value);
  };

  const handleChangeTypePage = (event) => {
    const selectedValue = event.target.value;
    setTypePage(selectedValue);
  };

  const handleChangeTypeUser = (event) => {
    const selectedValue = event.target.value;
    setTypeUser(selectedValue);
  };

  useEffect(() => {
    const fetchPageStatistique = async () => {
      const pageData = await getPageStatistique(period, typePage, typeUser, token);
      setPageStatistique(pageData);
      setLoading(true);
    };
    fetchPageStatistique();
  }, [period, typePage, typeUser, token]);

  

 

  useEffect(() => {
    if (pageStatistique) {
      const page = [];
      const values = [];  
      pageStatistique.data.forEach((data) => {
        if (data.dimensionValues[0].value === '(not set)' || data.dimensionValues[0].value === 'not set') {
          return;
        }
        let value = data.dimensionValues[0].value;
        if (!value || value.trim() === '') {
          value = 'autre';
        }
        page.push(value);
        values.push(parseInt(data.metricValues[0].value));
      }); 
      setPage(page);
      setValues(values);
  }}, [pageStatistique, period]);

  const labelMap = {
    pageTitle: { label: 'Page (titre)', description: 'Nombre d\'utilisateur par page web utilisé sur votre site (titre)' },
    pagePath: { label: 'Page (chemin)', description: 'Nombre d\'utilisateur par page web utilisé sur votre site (chemin)'},
    pageReferrer: { label: 'Page de provenance', description: 'URL de provenance complète, y compris le nom d\'hôte et le chemin d\'accès Cette URL de provenance correspond à l\'URL précédente de l\'utilisateur. Il peut s\'agir du domaine du site Web ou d\'autres domaines.'},
    sessionDefaultChannelGroup: { label: 'Groupe de canaux par défaut pour la session', description: 'Le groupe de canaux par défaut de la session est principalement basé sur la source et le support.'},
    eventName: { label: 'Nom de l\'événement', description: 'Les événements représentent des interactions spécifiques (comme clics, scroll) enregistrées sur votre site' },

  };

  const labelUser = {
    activeUsers: { label: 'Utilisateurs actifs', description: 'Nombre d\'utilisateurs distincts ayant consulté votre site.' },
    newUsers: { label: 'Nouveaux utilisateurs', description: 'Nombre d\'utilisateurs ayant interagi avec votre site pour la première fois' },
    userEngagementDuration: { label: 'Durée d\'engagement des utilisateurs', description: 'Durée totale (en secondes) pendant laquelle votre site Web ou votre application ont été affichés au premier plan sur les appareils des utilisateurs.', unite:'s' },
    screenPageViews: { label: 'Vues', description: 'Nombre d\'écrans ou de pages Web consultés par les utilisateurs. Les vues répétées d\'une même page ou d\'un même écran sont comptabilisées.' },
  };

  
  
  const series = [
    {
      type: 'bar',
      yAxisId: 'value',
      color: '#2ec96d',
      label: labelUser[typeUser].label,
      data: values,
    },
  ]

  return (
    <div className="statistique-container" style={{ boxShadow: theme.palette.shadow.main, backgroundColor: theme.palette.primary.main }}>
        <div className='select-stat-container'>  
        <SelectFieldSecondary
            id="period-select"
            value={typeUser}
            onChange={handleChangeTypeUser}
            theme={theme}
        >
            {Object.entries(labelUser).map(([value, { label }]) => (
                <MenuItem key={value} value={value}>
                    {label}
                </MenuItem>
            ))}
        </SelectFieldSecondary>
        <p style={{marginRight:"1rem"}}>par</p>
        <SelectFieldSecondary
            id="period-select"
            value={typePage}
            onChange={handleChangeTypePage}
            theme={theme}
        >
            {Object.entries(labelMap).map(([value, { label }]) => (
                <MenuItem key={value} value={value}>
                    {label}
                </MenuItem>
            ))}
        </SelectFieldSecondary>
        
        
        <Tooltip title={labelMap[typePage].description} placement="right">
            <InfoOutlinedIcon className='icon-select-stat-container' style={{color: theme.palette.text.secondary}}/>
        </Tooltip>
      </div>
        
        {!loading ? (
          <div className='loading-message-stats'>
            <CircularProgress sx={{color:"#2ec96d"}}/>
          </div>
        ) : (
          pageStatistique && pageStatistique.data.length > 0 ? (
            <ResponsiveChartContainer
          
            series={series}
            height={300}
            xAxis={[
              {
                id: 'date',
                data: page,
                scaleType: 'band',
              },
            ]}
            yAxis={[
              {
                id: 'value',
                
                scaleType: 'linear',
              },
            ]}

            sx={{
              // bottomAxis Line Styles
              "& .MuiChartsAxis-bottom .MuiChartsAxis-line":{
                  stroke:"none",
              },

              // leftAxis Line Styles
              "& .MuiChartsAxis-left .MuiChartsAxis-line":{
                  stroke:"none",
              },
              "& .MuiChartsAxis-tick":{
                  stroke:"none !important", 
              },

            }}
          >

            <BarPlot/>
            <ChartsXAxis
              label=""
              position="bottom"
              axisId="date"
              tickLabelStyle={{
                fontSize: 10,
              }}        
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
            <CustomAxisTooltip  themeColor={theme} type='axes' unite={labelUser[typeUser].unite }/>
            <LineHighlightPlot/>
            
          </ResponsiveChartContainer>
          ) : (
            <div className='no-data-message-stats'>
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




