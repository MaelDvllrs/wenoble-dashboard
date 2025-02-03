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
import { areaElementClasses, ChartsLegend } from '@mui/x-charts';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import Tooltip from '@mui/material/Tooltip';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CircularProgress from '@mui/material/CircularProgress';


import { PiSmileyMeltingFill } from "react-icons/pi";

import { formatNumber, formatTime } from '../../utils/numberFormatted';

import Cookies from 'js-cookie';


import { getStatistique } from './apiStatistique'; // Assurez-vous d'importer correctement votre fonction API
import dayjs from 'dayjs';
import './statistique.css';
import { color } from 'framer-motion';

export const EventStatistique = () => {
  const token = Cookies.get('token');
  const theme = useTheme();
  const [eventStatistique, setEventStatistique] = useState(null);
  const [dates, setDates] = useState([]);
  const [values, setValues] = useState([]);
  const [period, setPeriod] = useState('last14days');
  const [typeEvent, setTypeEvent] = useState('eventCount');
  const [totalValues, setTotalValues] = useState(0);
  const [totalCompareValues, setTotalCompareValues] = useState(0);
  const [totalDifferencePercentage, setTotalDifferencePercentage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [percentageChanges, setPercentageChanges] = useState([]);
  const [compareValues, setCompareValues] = useState([]);

  const handleChange = (event) => {
    setPeriod(event.target.value);
  };

  const handleChangeTypeEvent = (event) => {
    const selectedValue = event.target.value;
    setTypeEvent(selectedValue);
  };


  useEffect(() => {
    const fetchEventStatistique = async () => {
      const eventData = await getStatistique(period, typeEvent, token);
      setEventStatistique(eventData);
      setLoading(true);
    };
    fetchEventStatistique();
  }, [period, typeEvent, token]);


 


  useEffect(() => {
    if (eventStatistique) {
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
        const currentDataPoint = eventStatistique.data.currentPeriod.find(d => d.date === dateString);
        currentDates.push(date.format('YYYY-MM-DD'));
        currentValues.push(currentDataPoint ? parseInt(currentDataPoint.value) : 0);
      }

      const previousStartDate = startDate.subtract(parseInt(period.replace('last', '').replace('days', '')), 'day');
      const previousEndDate = endDate.subtract(parseInt(period.replace('last', '').replace('days', '')), 'day');

      for (let date = previousStartDate; date.isBefore(previousEndDate) || date.isSame(previousEndDate); date = date.add(1, 'day')) {
        const dateString = date.format('YYYYMMDD');
        const previousDataPoint = eventStatistique.data.comparePeriod.find(d => d.date === dateString);
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
  }, [eventStatistique, period]);


  
  const labelMap = {
    eventCount: { label: 'Nombre d\'événements', description: 'Le nombre d\'événements représente le total des interactions spécifiques (comme clics, téléchargements ou lectures de vidéos) enregistrées sur un site.' },
    eventCountPerUser: { label: 'Nombre d\'événements par utilisateur', description: 'Nombre moyen d\'événements par utilisateur (nombre d\'événements divisé par le nombre d\'utilisateurs actifs).' },
    eventsPerSession	: { label: 'Événements par session', description: 'Nombre moyen d\'événements par session (nombre d\'événements divisé par le nombre de sessions).' },
    keyEvents: { label: 'Événements clés', description: 'Nombre moyen d\'événements par session (nombre d\'événements divisé par le nombre de sessions).' },
    sessionKeyEventRate: { label: 'Taux d\'événements clés de la session', description: 'Pourcentage de sessions au cours desquelles un événement clé a été déclenché.' },
    userKeyEventRate: { label: 'Taux d\'événements clés par utilisateur', description: 'Pourcentage d\'utilisateurs ayant déclenché un événement clé.' },
  };

  const series = [
  {
      type: 'line',
      curve: 'linear',
      yAxisId: 'value',
      color: '#2ec96d',
      label: labelMap[typeEvent].label,
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
    <div className="statistique-container" style={{ boxShadow: theme.palette.shadow.main, backgroundColor: theme.palette.primary.main }}>
      <div className='select-stat-container'>  
        <SelectFieldSecondary
            id="period-select"
            value={typeEvent}
            onChange={handleChangeTypeEvent}
            theme={theme}
        >
            {Object.entries(labelMap).map(([value, { label }]) => (
                <MenuItem key={value} value={value}>
                    {label}
                </MenuItem>
            ))}
        </SelectFieldSecondary>
        <Tooltip title={labelMap[typeEvent].description} placement="right">
            <InfoOutlinedIcon className='icon-select-stat-container' style={{color: theme.palette.text.secondary}}/>
        </Tooltip>
      </div>
        <div className='total-statistique'>
          <p className='info-statistique'>
            {labelMap[typeEvent]?.unite === 's' ? formatTime(totalValues) : formatNumber(totalValues)}
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
        
        {!loading ? (
          <div className='loading-message-stats'>
            <CircularProgress sx={{color:"#2ec96d"}}/>
          </div>
        ) : (
          eventStatistique  ? (
            <ResponsiveChartContainer
              series={series}
              height={300}
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
                "& .MuiChartsLegend-series-auto-generated-id-1 .MuiChartsLegend-mark":{
                    strokeWidth: "2",
                    strokeDasharray: "6",
                    stroke: "#2ec96d",
                    fill: "none",
                },


                "& .MuiLineElement-series-auto-generated-id-1":{
                    strokeDasharray: "10 5",
                    strokeWidth: "1",
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
  );
};



