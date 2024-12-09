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

import Tooltip from '@mui/material/Tooltip';
import Cookies from 'js-cookie';

import { getLocationStatistique } from './apiStatistique';
import './statistique.css';

export const CityStatistique = () => {
  const token = Cookies.get('token'); 
  const theme = useTheme();
  const [locationStatistique, setLocationStatistique] = useState(null);
  const [location, setLocation] = useState([]);
  const [typeLocation, setTypeLocation] = useState('city');

  const [values, setValues] = useState([]);
  const [period, setPeriod] = useState('last14days');

  const handleChange = (event) => {
    setPeriod(event.target.value);
  };

  const handleChangeTypeLocation = (event) => {
    const selectedValue = event.target.value;
    setTypeLocation(selectedValue);
  };

  useEffect(() => {
    const fetchLocationStatistique = async () => {
      const locationData = await getLocationStatistique(period, typeLocation, token);
      setLocationStatistique(locationData);
    };
    fetchLocationStatistique();
  }, [period, typeLocation, token]);


 
  useEffect(() => {
    if (locationStatistique) {
      const location = [];
      const values = [];

      locationStatistique.data.forEach((data) => {
        if (data.dimensionValues[0].value === '(not set)' || data.dimensionValues[0].value === 'not set') {
          return;
        }
        location.push(data.dimensionValues[0].value);
        values.push(parseInt(data.metricValues[0].value));
      });


      setLocation(location);
      setValues(values);
    }}, [locationStatistique, period]);

  const labelMap = {
    city: { label: 'Nombre d\'utilisateurs par ville', description: 'Ville dans laquelle l\'activité de l\'utilisateur a été enregistrée.' },
    country: { label: 'Nombre d\'utilisateurs par pays', description: 'Pays dans lequel l\'activité de l\'utilisateur a été enregistrée.', unite: 'country'},
  };
  
  const series = [
    {
      type: 'bar',
      yAxisId: 'value',
      color: '#2ec96d',
      label: labelMap[typeLocation].label,
      data: values,
    },
  ]

  return (
    <div className="statistique-container" style={{ borderColor: theme.palette.primary.third, backgroundColor: theme.palette.primary.main }}>
        <div className='select-stat-container'>  
        <SelectFieldSecondary
            id="period-select"
            value={typeLocation}
            onChange={handleChangeTypeLocation}
            theme={theme}
        >
            {Object.entries(labelMap).map(([value, { label }]) => (
                <MenuItem key={value} value={value}>
                    {label}
                </MenuItem>
            ))}
        </SelectFieldSecondary>
        <Tooltip title={labelMap[typeLocation].description} placement="right">
            <InfoOutlinedIcon className='icon-select-stat-container' style={{color: theme.palette.text.secondary}}/>
        </Tooltip>
      </div>
        
        
        <ResponsiveChartContainer
          
          series={series}
          height={300}
          xAxis={[
            {
              id: 'date',
              data: location,
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
            // Masquer la ligne de l'axe
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
          <CustomAxisTooltip  themeColor={theme} type='axes' unite={labelMap[typeLocation].unite}/>
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




