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
import Tooltip from '@mui/material/Tooltip';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

import { formatNumber, formatTime } from '../../utils/numberFormatted';

import Cookies from 'js-cookie';


import { getStatistique } from './apiStatistique'; // Assurez-vous d'importer correctement votre fonction API
import dayjs from 'dayjs';
import './statistique.css';

export const EventStatistique = () => {
  const token = Cookies.get('token');
  const theme = useTheme();
  const [eventStatistique, setEventStatistique] = useState(null);
  const [dates, setDates] = useState([]);
  const [values, setValues] = useState([]);
  const [period, setPeriod] = useState('last14days');
  const [typeEvent, setTypeEvent] = useState('eventCount');
  const [totalValues, setTotalValues] = useState(0);

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
    };
    fetchEventStatistique();
  }, [period, typeEvent, token]);


 
  useEffect(() => {
    if (eventStatistique) {
      const dates = [];
      const values = [];
      const startDate = dayjs().subtract(parseInt(period.replace('last', '').replace('days', '')), 'day');
      const endDate = dayjs();

      for (let date = startDate; date.isBefore(endDate) || date.isSame(endDate); date = date.add(1, 'day')) {
        const dateString = date.format('YYYYMMDD');
        const dataPoint = eventStatistique.data.find(d => d.dimensionValues[0].value === dateString);
        dates.push(date.format('MM-DD'));
        values.push(dataPoint ? parseInt(dataPoint.metricValues[0].value) : 0);
      }

      const sortedData = dates.map((date, index) => ({ date, value: values[index] }))
        .sort((a, b) => dayjs(a.date).isBefore(dayjs(b.date)) ? -1 : 1);

      setDates(sortedData.map(d => d.date));
      setValues(sortedData.map(d => d.value));

      const total = values.reduce((acc, value) => acc + value, 0);
      setTotalValues(total);
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
      yAxisId: 'value',
      color: '#2ec96d',
      label: labelMap[typeEvent].label,
      data: values,
    },
  ]

  return (
    <div className="statistique-container" style={{ borderColor: theme.palette.primary.third, backgroundColor: theme.palette.primary.main }}>
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

        <p className='info-statistique'>
          {labelMap[typeEvent]?.unite === 's' ? formatTime(totalValues) : formatNumber(totalValues)}
        </p>
        
        
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
          <CustomAxisTooltip  themeColor={theme} type='axes'/>
          <LineHighlightPlot />
          <ChartsLegend
            direction="row"
            position={{
              horizontal: 'right', 
              vertical: 'top',
            }}
            labelStyle={{fontSize: 10}}
            itemMarkHeight={10}
            itemMarkWidth={10}
          />
          
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



