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

import { PiSmileyMeltingFill } from "react-icons/pi";

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
  const [typeUser, setTypeUser] = useState('activeUsers');

  const [values, setValues] = useState([]);
  const [period, setPeriod] = useState('last14days');

  const handleChange = (event) => {
    setPeriod(event.target.value);
  };

  const handleChangeTypeLocation = (event) => {
    const selectedValue = event.target.value;
    setTypeLocation(selectedValue);
  };

  const handleChangeTypeUser = (event) => {
    const selectedValue = event.target.value;
    setTypeUser(selectedValue);
  };

  useEffect(() => {
    const fetchLocationStatistique = async () => {
      const locationData = await getLocationStatistique(period, typeLocation, labelMap[typeLocation].locationID, typeUser, token);
      setLocationStatistique(locationData);
    };
    fetchLocationStatistique();
  }, [period, typeLocation, typeUser, token]);

  const formatLocation = (location) => {
    console.log(location);
    const locationArray = location.split(' ');
    return locationArray[0];  
  }
 
  useEffect(() => {
    if (locationStatistique) {
      const location = [];
      const values = [];

      locationStatistique.data.forEach((data) => {
        if (data.dimensionValues[0].value === '(not set)' || data.dimensionValues[0].value === 'not set') {
          return;
        }
        location.push({ name: data.dimensionValues[0].value, id: data.dimensionValues[1].value });
        values.push(parseInt(data.metricValues[0].value));
      });


      setLocation(location);
      setValues(values);
    }}, [locationStatistique, period]);

  const labelMap = {
    city: { label: 'Ville', description: 'Ville dans laquelle l\'activité de l\'utilisateur a été enregistrée.' , unite: 'country', locationID: 'countryId'},
    country: { label: 'Pays', description: 'Pays dans lequel l\'activité de l\'utilisateur a été enregistrée.', unite: 'country', locationID: 'countryId' },
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
    <div className="statistique-container" style={{ borderColor: theme.palette.primary.third, backgroundColor: theme.palette.primary.main }}>
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
        
        {locationStatistique && locationStatistique.data.length > 0 ? (
          <ResponsiveChartContainer
            series={series}
            height={300}
            xAxis={[
              {
                id: 'date',
                data: location[0] ? location.map((loc) => `${loc.id} ${loc.name}`) : [],
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
            <CustomAxisTooltip  themeColor={theme} type='axes' unite={labelMap[typeLocation].unite}/>
            <LineHighlightPlot/>
            
          </ResponsiveChartContainer>
        ) : (
          <div className='no-data-message-stats'>
            <PiSmileyMeltingFill style={{ fontSize: 50, color: theme.palette.text.primary }} />
            Aucune donnée disponible.
          </div>
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




