import React, { useEffect, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import { useWebsite } from '../../../../Context/WebsiteContext';
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


import { getStatistique } from './apiStatistique'; // Assurez-vous d'importer correctement votre fonction API
import dayjs from 'dayjs';
import './statistique.css';

export const UserStatistique = () => {
  const token = Cookies.get('token');
  const theme = useTheme();
  const { selectedWebsite, websiteLoading } = useWebsite();
  const [userStatistique, setUserStatistique] = useState(null);
  const [dates, setDates] = useState([]);
  const [values, setValues] = useState([]);
  const [period, setPeriod] = useState('last14days');
  const [typeUser, setTypeUser] = useState('activeUsers');
  const [totalValues, setTotalValues] = useState(0);
  const [loading, setLoading] = useState(false);
  const [totalCompareValues, setTotalCompareValues] = useState(0);
  const [totalDifferencePercentage, setTotalDifferencePercentage] = useState(0);
  const [percentageChanges, setPercentageChanges] = useState([]);
  const [compareValues, setCompareValues] = useState([]);

  const handleChange = (event) => {
    setPeriod(event.target.value);
  };

  const handleChangeTypeUser = (event) => {
    const selectedValue = event.target.value;
    setTypeUser(selectedValue);
  };


  useEffect(() => {
    const fetchUserStatistique = async () => {
      if (!selectedWebsite?.id) {
        console.log('Aucun site web sélectionné');
        setLoading(false);
        return;
      }
      
      setLoading(false); // Réinitialiser le loading lors du changement
      
      try {
        const userData = await getStatistique(period, typeUser, selectedWebsite.id, token);
        setUserStatistique(userData);
        setLoading(true);
      } catch (error) {
        console.error('Erreur lors de la récupération des statistiques utilisateur:', error);
        setLoading(false);
      }
    };
    fetchUserStatistique();
  }, [period, typeUser, token, selectedWebsite]);


 
  useEffect(() => {
    if (userStatistique) {
      const currentDates = [];
      const currentValues = [];
      const previousValues = [];
      let startDate;
      const endDate = dayjs();

      if (period === 'today') {
        startDate = dayjs();
      } else if (period === 'yesterday') {
        startDate = dayjs().subtract(1, 'day');
      } else {
        startDate = dayjs().subtract(parseInt(period.replace('last', '').replace('days', '')), 'day');
      }

      for (let date = startDate; date.isBefore(endDate) || date.isSame(endDate); date = date.add(1, 'day')) {
        const dateString = date.format('YYYYMMDD');
        const currentDataPoint = userStatistique.data.currentPeriod.find(d => d.date === dateString);
        currentDates.push(date.format('YYYY-MM-DD'));
        currentValues.push(currentDataPoint ? parseInt(currentDataPoint.value) : 0);
      }

      const previousStartDate = startDate.subtract(parseInt(period.replace('last', '').replace('days', '')), 'day');
      const previousEndDate = endDate.subtract(parseInt(period.replace('last', '').replace('days', '')), 'day');

      for (let date = previousStartDate; date.isBefore(previousEndDate) || date.isSame(previousEndDate); date = date.add(1, 'day')) {
        const dateString = date.format('YYYYMMDD');
        const previousDataPoint = userStatistique.data.comparePeriod.find(d => d.date === dateString);
        previousValues.push(previousDataPoint ? parseInt(previousDataPoint.value) : 0);
      }

      const sortedCurrentData = currentDates.map((date, index) => ({ date, value: currentValues[index] }))
        .sort((a, b) => dayjs(a.date, 'YYYY-MM-DD').isBefore(dayjs(b.date, 'YYYY-MM-DD')) ? -1 : 1);

      const sortedPreviousData = currentDates.map((date, index) => ({ date, value: previousValues[index] }))
        .sort((a, b) => dayjs(a.date, 'YYYY-MM-DD').isBefore(dayjs(b.date, 'YYYY-MM-DD')) ? -1 : 1);

      setDates(sortedCurrentData.map(d => d.date));
      setValues(sortedCurrentData.map(d => d.value));
      setCompareValues(sortedPreviousData.map(d => d.value));

      const percentageChanges = sortedCurrentData.map((current, index) => {
        const previous = sortedPreviousData[index];
        if (previous.value === 0) {
          return 0;
        }
        return ((current.value - previous.value) / previous.value) * 100;
      });

      setPercentageChanges(percentageChanges.map(change => change.toFixed(2)));
      
      const totalCurrentValues = currentValues.reduce((acc, value) => acc + value, 0);
      const totalPreviousValues = previousValues.reduce((acc, value) => acc + value, 0);

      setTotalValues(totalCurrentValues);
      setTotalCompareValues(totalPreviousValues);

      // Calculer le pourcentage total de différence
      const totalDifference = totalPreviousValues === 0 ? 0 : ((totalCurrentValues - totalPreviousValues) / totalPreviousValues) * 100;
      setTotalDifferencePercentage(totalDifference.toFixed(2));
    }
  }, [userStatistique, period]);

  const labelMap = {
    activeUsers: { label: 'Utilisateurs actifs', description: 'Nombre d\'utilisateurs distincts ayant consulté votre site.' },
    newUsers: { label: 'Nouveaux utilisateurs', description: 'Nombre d\'utilisateurs ayant interagi avec votre site pour la première fois' },
    userEngagementDuration: { label: 'Durée d\'engagement des utilisateurs', description: 'Durée totale (en secondes) pendant laquelle votre site Web ou votre application ont été affichés au premier plan sur les appareils des utilisateurs.', unite:'s' },
    Sessions: { label: 'Sessions', description: 'Nombre de sessions commencées sur votre site.' },
    sessionsPerUser: { label: 'Sessions par utilisateur', description: 'Nombre moyen de sessions par utilisateur (le nombre de sessions divisé par le nombre d\'utilisateurs actifs).' },
    engagedSessions: { label: 'Sessions avec engagement', description: 'Nombre de sessions ayant duré plus de 10 secondes, ayant enregistré un événement clé ou ayant comptabilisé au moins deux visionnages d\'écran.' },
    bounceRate: { label: 'Taux de rebond', description: 'Le taux de rebond est le pourcentage de sessions d\'une seule page (c\'est-à-dire les sessions au cours desquelles l\'utilisateur a quitté votre site depuis la page d\'entrée sans interagir avec la page).' },
  };

  const series = [
  {
      type: 'line',
      curve: 'linear',
      yAxisId: 'value',
      color: '#2ec96d',
      label: labelMap[typeUser].label,
      data: values,
    },
    {
      type: 'line',
      curve: 'linear',
      yAxisId: 'value',
      color: '#2ec96d',
      label: 'Période précédente',
      data: compareValues,
    },
  ]

  return (
    <>
      {websiteLoading || !selectedWebsite ? (
        <div className="statistique-container" style={{ boxShadow: theme.palette.shadow.main, backgroundColor: theme.palette.primary.main }}>
          <div className='loading-message-stats'>
            <CircularProgress sx={{color:"#2ec96d"}}/>
          </div>
        </div>
      ) : (
        <div className="statistique-container" style={{ boxShadow: theme.palette.shadow.main, backgroundColor: theme.palette.primary.main }}>
            <div className='select-stat-container'>
              <SelectFieldSecondary
                  id="period-select"
                  value={typeUser}
                  onChange={handleChangeTypeUser}
                  theme={theme}
              >
                  {Object.entries(labelMap).map(([value, { label }]) => (
                      <MenuItem key={value} value={value}>
                          {label}
                      </MenuItem>
                  ))}
              </SelectFieldSecondary>
              <Tooltip title={labelMap[typeUser].description} placement="right">
                <InfoOutlinedIcon className='icon-select-stat-container' style={{color: theme.palette.text.secondary}}/>
              </Tooltip>
            </div>

            {userStatistique && (
              <div className='total-statistique'>
                <p className='info-statistique'>
                  {labelMap[typeUser]?.unite === 's' ? formatTime(totalValues) : formatNumber(totalValues)}
                </p>
                <div className='total-statistique-compare'>
                  <p style={{color: totalDifferencePercentage < 0 ? "red" : "green", fontSize: "0.7rem"}}><b>{totalDifferencePercentage}%</b></p>
                  <ArrowDropUpIcon 
                    style={{
                      color: totalDifferencePercentage < 0 ? "red" : "green", 
                      height: "2rem",
                      transform: `rotate(${totalDifferencePercentage < 0 ? 180 : 0}deg)`,
                    }}
                  />
                </div>
              </div>
            )}

            {!loading ? (
              <div className='loading-message-stats'>
                <CircularProgress sx={{color:"#2ec96d"}}/>
              </div>
            ) : (
              userStatistique ? (
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
                  <CustomAxisTooltip  
                    themeColor={theme} 
                    type='axes'
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
      )}
    </>
  );
};

export default UserStatistique;



