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

import { formatNumber, formatTime } from '../../utils/numberFormatted';

import Cookies from 'js-cookie';


import { getStatistique } from './apiStatistique'; // Assurez-vous d'importer correctement votre fonction API
import dayjs from 'dayjs';
import './statistique.css';

export const UserStatistique = () => {
  const token = Cookies.get('token');
  const theme = useTheme();
  const [userStatistique, setUserStatistique] = useState(null);
  const [dates, setDates] = useState([]);
  const [values, setValues] = useState([]);
  const [period, setPeriod] = useState('last14days');
  const [typeUser, setTypeUser] = useState('activeUsers');
  const [totalValues, setTotalValues] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setPeriod(event.target.value);
  };

  const handleChangeTypeUser = (event) => {
    const selectedValue = event.target.value;
    setTypeUser(selectedValue);
  };


  useEffect(() => {
    const fetchUserStatistique = async () => {
      const userData = await getStatistique(period, typeUser, token);
      setUserStatistique(userData);
      setLoading(true);
    };
    fetchUserStatistique();
  }, [period, typeUser, token]);

  console.log(userStatistique);


 
  useEffect(() => {
    if (userStatistique) {
      const dates = [];
      const values = [];
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
        const dataPoint = userStatistique.data.find(d => d.dimensionValues[0].value === dateString);
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
      yAxisId: 'value',
      color: '#2ec96d',
      label: labelMap[typeUser].label,
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

        {userStatistique && userStatistique.data.length > 0 && (
          <p className='info-statistique'>
            {labelMap[typeUser]?.unite === 's' ? formatTime(totalValues) : formatNumber(totalValues)}
          </p>
        )}

        {!loading ? (
          <div className='loading-message-stats'>
            <CircularProgress sx={{color:"#2ec96d"}}/>
          </div>
        ) : (
          userStatistique && userStatistique.data.length > 0 ? (
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
              <CustomAxisTooltip  themeColor={theme} type='axes' unite={labelMap[typeUser].unite}/>
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

export default UserStatistique;



