import React, { useEffect, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import MenuItem from '@mui/material/MenuItem';
import { SelectField, CustomAxisTooltip } from '../../../../Theme/element';
import { LineHighlightPlot } from '@mui/x-charts/LineChart';
import { ResponsiveChartContainer } from '@mui/x-charts/ResponsiveChartContainer';
import { PiePlot } from '@mui/x-charts/PieChart';
import { ChartsLegend } from '@mui/x-charts';
import Cookies from 'js-cookie';

import Tooltip from '@mui/material/Tooltip';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { SelectFieldSecondary } from '../../../../Theme/element';
import CircularProgress from '@mui/material/CircularProgress';


import { PiSmileyMeltingFill } from "react-icons/pi";


import { getPlatformCategorieStatistique } from './apiStatistique';
import './statistique.css';

export const PlatformCategorieStatistique = () => {
  const token = Cookies.get('token'); 
  const theme = useTheme();
  const [platformCategorieStatistique, setPlatformCategorieStatistique] = useState(null);
  const [platformCategorie, setPlatformCategorie] = useState([]);
  const [values, setValues] = useState([]);
  const [period, setPeriod] = useState('last14days');
  const [typePlatform, setTypePlatform] = useState('deviceCategory');
  const [dataLoaded, setDataLoaded] = useState(false);
  const [typeUser, setTypeUser] = useState('activeUsers');
  const [loading, setLoading] = useState(false);



  const handleChange = (event) => {
    setPeriod(event.target.value);
  };

  const handleChangeTypePlatform = (event) => {
    const selectedValue = event.target.value;
    setTypePlatform(selectedValue);
  };

  const handleChangeTypeUser = (event) => {
    const selectedValue = event.target.value;
    setTypeUser(selectedValue);
  };


  useEffect(() => {
    const fetchUserStatistique = async () => {
      const userData = await getPlatformCategorieStatistique(period, typePlatform, typeUser, token);
      setPlatformCategorieStatistique(userData);
      setLoading(true);
    };
    fetchUserStatistique();
  }, [period, typePlatform, typeUser, token]);

 
  useEffect(() => {
    if (platformCategorieStatistique) {
      const platformCategorie = [];
      const values = [];

      platformCategorieStatistique.data.forEach((data) => {
        if (data.dimensionValues[0].value === '(not set)' || data.dimensionValues[0].value === 'not set') {
          return;
        }
        let value = data.dimensionValues[0].value;
        if (!value || value.trim() === '') {
          value = 'autre';
        }
        platformCategorie.push(value);
        values.push(parseInt(data.metricValues[0].value));
      });


      setPlatformCategorie(platformCategorie);
      setValues(values);

      setTimeout(() => {
        setDataLoaded(true);
      }, 1000);
    }}, [platformCategorieStatistique, period]);


    const labelMap = {      
      deviceCategory: { label: 'Catégorie d\'appareil', description: 'Il s\'agit du type d\'appareil (ordinateur de bureau, tablette ou appareil mobile).' },
      platformDeviceCategory: { label: 'Catégorie de plate-forme et d\'appareil', description: 'Plate-forme et type d\'appareil sur lesquels votre site Web.' },
      deviceModel		: { label: 'Modèle de l\'appareil', description: 'Le modèle de l\'appareil mobile (par exemple, iPhone).' },
      mobileDeviceBranding: { label: 'Marque de l\'appareil (mobile uniquement)', description: 'Il s\'agit du nom du fabriquant ou de la marque (par exemple, Samsung, Apple).' },
      mobileDeviceMarketingName: { label: 'Appareil (mobile uniquement)', description: 'Nom de l\'appareil sur lequel porte la marque (par exemple, Galaxy S10 ou P30 Pro)' },
      mobileDeviceModel: { label: 'Modèle de mobile', description: 'Nom du modèle de l\'appareil mobile (par exemple, iPhone X ou SM-G950F).' },
    };

    const labelUser = {
      activeUsers: { label: 'Utilisateurs actifs', description: 'Nombre d\'utilisateurs distincts ayant consulté votre site.' },
      newUsers: { label: 'Nouveaux utilisateurs', description: 'Nombre d\'utilisateurs ayant interagi avec votre site pour la première fois' },
      userEngagementDuration: { label: 'Durée d\'engagement des utilisateurs', description: 'Durée totale (en secondes) pendant laquelle votre site Web ou votre application ont été affichés au premier plan sur les appareils des utilisateurs.', unite:'s' },
      screenPageViews: { label: 'Vues', description: 'Nombre d\'écrans ou de pages Web consultés par les utilisateurs. Les vues répétées d\'une même page ou d\'un même écran sont comptabilisées.' },
    };


  const colors = ['#2ec96d', '#58d985', '#82e89d', '#26a15a', '#2ebc96', '#45c92e'];
  const series = [
    {
      type: 'pie',
      yAxisId: 'value',
      color: '#2ec96d',
      label: labelUser[typeUser].label,
      highlightScope: { fade: 'global', highlight: 'item' },
      faded: { innerRadius: 30, additionalRadius: -30, color: 'gray' },
      data: values.map((value, index) => ({
        id: platformCategorie[index],
        value,
        color: colors[index % colors.length], 
        label: platformCategorie[index], 
        tooltip: labelUser[typeUser].label,
      })),
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
              value={typePlatform}
              onChange={handleChangeTypePlatform}
              theme={theme}
          >
              {Object.entries(labelMap).map(([value, { label }]) => (
                  <MenuItem key={value} value={value}>
                      {label}
                  </MenuItem>
              ))}
          </SelectFieldSecondary>
          <Tooltip title={labelMap[typePlatform].description} placement="right">
            <InfoOutlinedIcon className='icon-select-stat-container' style={{color: theme.palette.text.secondary}}/>
          </Tooltip>
        </div>
        {!loading ? (
          <div className='loading-message-stats'>
            <CircularProgress sx={{color:"#2ec96d"}}/>
          </div>
        ) : (
          platformCategorieStatistique && platformCategorieStatistique.data.length > 0 ? (
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
                direction="row"
                position={{
                  horizontal: 'middle', 
                  vertical: 'bottom',
                }}
                itemMarkHeight={10}
                itemMarkWidth={10}
              />
    
    
              {dataLoaded && (
                <CustomAxisTooltip
                  themeColor={theme}
                  type='item'
                  unite='country'
                />
              )}
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




