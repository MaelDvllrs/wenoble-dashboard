import React, { useEffect, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import MenuItem from '@mui/material/MenuItem';
import { SelectField, CustomAxisTooltip } from '../../../../Theme/element';
import { LineHighlightPlot } from '@mui/x-charts/LineChart';
import { ResponsiveChartContainer } from '@mui/x-charts/ResponsiveChartContainer';
import { PiePlot } from '@mui/x-charts/PieChart';
import { ChartsLegend } from '@mui/x-charts';
import Cookies from 'js-cookie';


import { getPlatformCategorieStatistique } from './apiStatistique';
import './statistique.css';

export const PlatformCategorieStatistique = () => {
  const token = Cookies.get('token'); 
  const theme = useTheme();
  const [platformCategorieStatistique, setPlatformCategorieStatistique] = useState(null);
  const [platformCategorie, setPlatformCategorie] = useState([]);
  const [values, setValues] = useState([]);
  const [period, setPeriod] = useState('last14days');

  const handleChange = (event) => {
    setPeriod(event.target.value);
  };

  useEffect(() => {
    const fetchPlatformCategorieStatistique = async () => {
      const platformCategorieData = await getPlatformCategorieStatistique(period, token);
      setPlatformCategorieStatistique(platformCategorieData);
    };
    fetchPlatformCategorieStatistique();
  }, [period, token]);


 
  useEffect(() => {
    if (platformCategorieStatistique) {
      const platformCategorie = [];
      const values = [];

      platformCategorieStatistique.data.forEach((data) => {
        if (data.dimensionValues[0].value === '(not set)' || data.dimensionValues[0].value === 'not set') {
          return;
        }
        platformCategorie.push(data.dimensionValues[0].value);
        values.push(parseInt(data.metricValues[0].value));
      });


      setPlatformCategorie(platformCategorie);
      setValues(values);
    }}, [platformCategorieStatistique, period]);


  const colors = ['#2ec96d', '#58d985', '#82e89d', '#26a15a', '#2ebc96', '#45c92e'];
  const series = [
    {
      type: 'pie',
      yAxisId: 'value',
      color: '#2ec96d',
      label: 'Nombre d\'utilisateurs :',
      highlightScope: { fade: 'global', highlight: 'item' },
      faded: { innerRadius: 30, additionalRadius: -30, color: 'gray' },
      data: values.map((value, index) => ({
        id: platformCategorie[index],
        value,
        color: colors[index % colors.length], 
        label: platformCategorie[index], 
      })),
    },
  ]

  return (
    <div className="statistique-container" style={{ borderColor: theme.palette.primary.third, backgroundColor: theme.palette.primary.main }}>
        <p className='title-statistique' style={{color: theme.palette.text.secondary}}>Nombres d'utilisateurs par catégories de plateforme</p>
        <ResponsiveChartContainer
          
          series={series}
          height={300}

          sx={{
            "& .MuiPieArc-series-auto-generated-id-0":{
              stroke: theme.palette.primary.main,
            },
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

          <PiePlot />

          <ChartsLegend
            direction="column"
            position={{
              horizontal: 'right', 
              vertical: 'middle',
            }}
          />

          <CustomAxisTooltip  themeColor={theme} type='item'/>
          <LineHighlightPlot/>
          
        </ResponsiveChartContainer>

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




