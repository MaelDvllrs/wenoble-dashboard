import TextField from '@mui/material/TextField';
import { styled } from '@mui/material/styles';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import LoadingButton from '@mui/lab/LoadingButton';
import CircularProgress from '@mui/material/CircularProgress';
import NoSsr from '@mui/material/NoSsr';
import Popper from '@mui/material/Popper';
import Paper from '@mui/material/Paper';
import { useAxisTooltip, useItemTooltip, useMouseTracker } from '@mui/x-charts/ChartsTooltip';
import { formatTime } from '../Components/Dashboard/utils/numberFormatted';
import Flag from 'react-world-flags';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import 'dayjs/locale/fr';
import React from 'react';


export const CssTextField = styled(TextField)(({ theme }) => ({

    '& label.MuiFormLabel-root': {
        color: theme.palette.text.primary,
    },
    '& label.Mui-focused': {
        color: "#0541b7", 
    },
    '& .MuiOutlinedInput-root': {
        '& fieldset': {
            borderColor: theme.palette.secondary.main,
        },
        '&:hover fieldset': {
            borderColor: theme.palette.secondary.main,
        },
        '&.Mui-focused fieldset': {
            borderColor: "var(--primary-color)",
        },
    },
}));

export const LoginTextField = styled(TextField)(({ theme }) => ({

    '& .MuiOutlinedInput-root': {
        '& fieldset': {
            borderColor: theme.palette.text.secondary, 
            borderRadius: '0.5rem',
        },
        '&:hover fieldset': {
            borderColor: theme.palette.text.secondary, 
        },
        '&.Mui-focused fieldset': {
            borderColor: theme.palette.text.secondary, 
        },
    },
    '& .MuiInputLabel-root': {
        color: theme.palette.text.secondary, 
    },
    '& .MuiInputLabel-root.Mui-focused': {
        color: theme.palette.text.secondary, 
    },
}));


export const SelectField = styled(Select)(({ theme }) => ({
    color: theme.palette.text.primary,
    borderColor: theme.palette.primary.third,
    transition: 'border-color 0.3s ease, background-color 0.3s ease', // Ajout de la transition

    '& .MuiSelect-select': {
        padding: ' 0.5rem 0.8rem',
    },

    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: theme.palette.primary.third,
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: theme.palette.text.secondary,
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: theme.palette.primary.third,
    },
    '& .MuiSvgIcon-root': {
      color: theme.palette.text.primary,
    },
  }));
  
  SelectField.defaultProps = {
    MenuProps: {
      PaperProps: {
        sx: (theme) => ({
          bgcolor: theme.palette.background.default,
          border: `1px solid ${theme.palette.primary.third}`,
          transition: 'border-color 0.3s ease, background-color 0.3s ease', // Ajout de la transition

          '& .MuiMenuItem-root': {
            color: theme.palette.text.primary,
            '&:hover': {
              bgcolor: theme.palette.primary.third,
            },
            '&.Mui-selected': {
              bgcolor: theme.palette.primary.third,
            },
            '&.Mui-selected:hover': {
              bgcolor: theme.palette.primary.dark,
            },
          },
        }),
      },
    },
  };

  export const SelectFieldSecondary = styled(Select)(({ theme }) => ({
    color: theme.palette.text.secondary,
    borderColor: theme.palette.primary.third,
    transition: 'border-color 0.3s ease, background-color 0.3s ease', // Ajout de la transition

    '& .MuiSelect-select': {
        padding: 0,
    },

    '& .MuiOutlinedInput-notchedOutline': {
      border: 'none',
    },
    '& .MuiSvgIcon-root': {
      color: theme.palette.text.secondary,
    },
  }));
  
  SelectFieldSecondary.defaultProps = {
    MenuProps: {
      PaperProps: {
        sx: (theme) => ({
          bgcolor: theme.palette.background.default,
          border: `1px solid ${theme.palette.primary.third}`,
          transition: 'border-color 0.3s ease, background-color 0.3s ease', // Ajout de la transition

          '& .MuiMenuItem-root': {
            color: theme.palette.text.primary,
            '&:hover': {
              bgcolor: theme.palette.primary.third,
            },
            '&.Mui-selected': {
              bgcolor: theme.palette.primary.third,
            },
            '&.Mui-selected:hover': {
              bgcolor: theme.palette.primary.dark,
            },
          },
        }),
      },
    },
  };
          
  
  dayjs.extend(customParseFormat);
  dayjs.locale('fr');

  export function CustomAxisTooltip({ themeColor, type, unite}) {
    const mousePosition = useMouseTracker();


    const tooltipData = type === 'axes' ? useAxisTooltip() : useItemTooltip();


    const items = type === 'axes' ? tooltipData?.seriesItems : tooltipData?.value;
    
    if (!tooltipData || !mousePosition) {
      // No data to display
      return null;
    }

    if (unite === 'country') {
      const [id, ...rest] = tooltipData.axisFormattedValue.split(' ');
      const country = rest.join(' ');
      items[0].value = { name: country, id: id };
    }


      // The pointer type can be used to have different behavior based on pointer type.
    const isMousePointer = mousePosition?.pointerType === 'mouse';
    // Adapt the tooltip offset to the size of the pointer.
    const yOffset = isMousePointer ? 0 : 40 - mousePosition.height;
  
    // Vérifier si tooltipData.axisFormattedValue est une date valide
    const formattedDate = dayjs(tooltipData.axisFormattedValue).isValid()
      ? dayjs(tooltipData.axisFormattedValue).format('ddd DD MMM')
      : tooltipData.axisFormattedValue;
      
    return (
      <NoSsr>
        <Popper
          sx={{
            pointerEvents: 'none',
            zIndex: (theme) => theme.zIndex.modal,
          }}
          open
          placement={isMousePointer ? 'top-end' : 'top'}
          anchorEl={{
            getBoundingClientRect: () => ({
              top: mousePosition.y,
              left: mousePosition.x,
              right: mousePosition.x,
              bottom: mousePosition.y,
              width: 0,
              height: 0,
            }),
          }}
          modifiers={[
            {
              name: 'offset',
              options: {
                offset: [0, yOffset],
              },
            },
          ]}
        >
          <Paper
            elevation={0}
            sx={{
              m: 1,
              border: 'solid',
              borderWidth: 1,
              borderColor: themeColor.palette.primary.third,
              backgroundColor: themeColor.palette.primary.main,
              table: { borderSpacing: 0 },
              thead: {
                td: {
                  px: 1.5,
                  py: 0.75,
                  borderBottom: 'solid',
                  borderWidth: 2,
                  borderColor: 'divider',
                },
              },
              tbody: {
                'tr:first-child': { td: { paddingTop: 1.5 } },
                'tr:last-child': { td: { paddingBottom: 1.5 } },
                tr: {
                  'td:first-child': { paddingLeft: 1.5 },
                  'td:last-child': { paddingRight: 1.5 },
                  td: {
                    paddingRight: '7px',
                    paddingBottom: '10px',
                  },
                },
              },
            }}
          >
            <div style={{ padding: "0.8rem" }}>
            {Array.isArray(items) ? (
              <div>
                <div style={{display: 'flex', alignItems:'center'}}>
                {unite === 'country'  && <Flag code={items[0].value.id} style={{ marginRight: 8, width: 20, height: 15, borderRadius: 5 }} />}
                  <p colSpan={3} style={{ fontSize: '0.8rem', color: themeColor.palette.text.secondary }}>
                    {unite === 'country' ? items[0].value.name : formattedDate}
                  </p>
                </div>
                {items.map((item) => (
                  <div key={item.seriesId} style={{ marginTop: "0.8rem", display: 'flex', gap: '0.5rem' }}>
                     
                    <p>
                      {item.formattedLabel} :
                    </p>
                    <p>
                      <b>{unite === 's' ? formatTime(item.formattedValue) : item.formattedValue}</b>
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '0.8rem', color: themeColor.palette.text.secondary }}>{items.id}</p>
                <p>{items.tooltip} <b>{unite === 's' ? formatTime(items.formattedValue) : items.formattedValue}</b></p>
              </div>
            )}
          </div>
          </Paper>
        </Popper>
      </NoSsr>
    );
  }




export const DefaultSwitch = styled(Switch)(({ theme }) => ({
    '& .MuiSwitch-switchBase.Mui-checked': {
      color: "var(--primary-color)",
    },
    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
      backgroundColor: "var(--primary-color)",
    },
    '& .MuiSwitch-track': {
        backgroundColor: theme.palette.secondary.main,
    },
}));

export const DefaultButton = styled(Button)(({ theme }) => ({
    '&.MuiButton-root': {
        backgroundColor: "var(--primary-color)", 
        color: 'rgba(255, 255, 255, 0.8)',
    },
    '&:hover': {
        backgroundColor: "var(--primary-color)", 
    },
}));

const WhiteCircularProgress = styled(CircularProgress)({
    color: 'white',
  });
  
  // Personnaliser le LoadingButton
  export const LoadingButtonBase = styled(LoadingButton)(({ theme }) => ({
    '&.MuiButton-root': {
      backgroundColor: "var(--primary-color)", 
      color: 'rgba(255, 255, 255, 0.8)',
    },
    '&:hover': {
      backgroundColor: "var(--primary-color)", 
    },
  }));
  
  export const LoadingDefaultButton = ({ loading, ...props }) => (
    <LoadingButtonBase
      loading={loading}
      loadingIndicator={<WhiteCircularProgress size={24} />}
      {...props}
    />
  );
  



export const SecondaryButton = styled(Button)(({ theme }) => ({
    '&.MuiButton-root': {
        backgroundColor : theme.palette.secondary.secondary, 
        color : theme.palette.text.primary
    },
    '&:hover': {
        backgroundColor: theme.palette.secondary.third, 
    },
}));

export const RedButton = styled(Button)(({ theme }) => ({
    '&.MuiButton-root': {
        backgroundColor : theme.palette.error.main, 
        color : '#ffffff'
    },
    '&:hover': {
        backgroundColor: theme.palette.error.dark, 
    },
}));

export const Popup = styled('div')(({ theme }) => ({
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', 
    zIndex: 10,
    display: 'flex',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    margin: 'auto',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderRadius: '0.5rem',
}));


export const notificationTitle = (type) => {
    const titles = {
        actu: 'Actualités Wenoble',
        message: 'Nouveau message',
        order: 'Nouvelle commande',
        info: 'Information',
    };

    return titles[type] || 'Notification';
};

export const notificationLink = (type) => {
    const links = {
        actu: '/dashboard/actu/article/',
        message: '/dashboard/contact/message/',
        order: '/order',
        info: '/info',
    };

    return links[type] || '/home';
}



