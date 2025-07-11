// External libraries
import React, { useRef, useLayoutEffect, useState} from "react";

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
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import Flag from 'react-world-flags';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import 'dayjs/locale/fr';
import InputAdornment from '@mui/material/InputAdornment';
import { FiSearch } from "react-icons/fi";

import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import SortIcon from '@mui/icons-material/Sort';
import CheckIcon from '@mui/icons-material/Check';
import ArrowDropDownOutlinedIcon from '@mui/icons-material/ArrowDropDownOutlined';
import ArrowDropUpOutlinedIcon from '@mui/icons-material/ArrowDropUpOutlined';
import { Snackbar, Alert } from '@mui/material';
import MuiAlert from '@mui/material/Alert';

// Internal utilities and hooks
import { useAxisTooltip, useItemTooltip, useMouseTracker } from '@mui/x-charts/ChartsTooltip';
import { formatTime } from '../utils/numberFormatted';
import { min } from "date-fns";
import { color } from "framer-motion";





// Initialize dayjs plugins
dayjs.extend(customParseFormat);
dayjs.locale('fr');

// Styled TextField components
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

export const SearchField = styled(TextField)(({ theme }) => ({
    '& .MuiOutlinedInput-root': {
        '& fieldset': {
            borderColor: theme.palette.primary.third,
            borderRadius: '0.3rem',
        },
        '&:hover fieldset': {
            borderColor: theme.palette.primary.third,
        },
        '&.Mui-focused fieldset': {
            borderColor: theme.palette.text.secondary,
            borderWidth: '1px',
        },
    },
    '& .MuiInputLabel-root': {
        color: theme.palette.text.secondary,
    },
    '& .MuiInputLabel-root.Mui-focused': {
        color: theme.palette.text.secondary,
    },
}));

export const SearchFieldSmall = styled(TextField)(({ theme, variant }) => ({
    variant: variant || 'outlined',
    '& .MuiOutlinedInput-input': {
        padding: '0.3rem 0.5rem',
    },
    '& .MuiOutlinedInput-root': {
        paddingLeft: '0.2rem',
        '& fieldset': {
            borderColor: theme.palette.primary.third,
            borderRadius: '0.3rem',
        },
        '&:hover fieldset': {
            borderColor: theme.palette.primary.third,
        },
        '&.Mui-focused fieldset': {
            borderColor: theme.palette.text.secondary,
            borderWidth: '1px',
        },
    },
    '& .MuiInputLabel-root': {
        fontSize: '0.8rem',
        color: theme.palette.text.secondary,

    },
    '& .MuiInputLabel-root.Mui-focused': {
        top: '0rem',
        color: theme.palette.text.secondary,
        padding: '0 0.2rem',
    },
}));

// Styled Select components
export const SelectField = styled(Select)(({ theme }) => ({
    color: theme.palette.text.primary,
    borderColor: theme.palette.primary.third,
    transition: 'border-color 0.3s ease, background-color 0.3s ease',
    '& .MuiSelect-select': {
        padding: '0.5rem 0.8rem',
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
                transition: 'border-color 0.3s ease, background-color 0.3s ease',
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
    transition: 'background-color 0.2s ease',

    '& .MuiSelect-select': {
        padding: '0',
        transition: 'color 0.2s ease',
        marginRight: '0.5rem',
    },
    '& .MuiOutlinedInput-notchedOutline': {
        border: 'none',
    },

    '& .MuiSvgIcon-root': {
        color: theme.palette.text.secondary,
        right: '8px',
    },

    '&:hover .MuiSelect-select': {
        color: theme.palette.text.primary,
    },

}));

SelectFieldSecondary.defaultProps = {
    MenuProps: {
        PaperProps: {
            sx: (theme) => ({
                bgcolor: theme.palette.background.default,
                border: `1px solid ${theme.palette.primary.third}`,
                transition: 'border-color 0.3s ease, background-color 0.3s ease',
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

// Styled Button components
export const DefaultButton = styled(Button)(({ theme }) => ({
    '&.MuiButton-root': {
        backgroundColor: "var(--primary-color)",
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: '0.8rem',
        padding: '0.15rem 0.5rem 0.05rem 0.5rem',
        boxShadow: 'none',
    },
    '&:hover': {
        backgroundColor: "var(--primary-color-hover)",
    },
    '&.Mui-disabled': {
        backgroundColor: "var(--primary-color)",
        color: 'rgba(255,255,255,0.4)',
        opacity: 0.7,
        cursor: 'not-allowed',
    },
}));

export const SecondaryButton = styled(Button)(({ theme }) => ({
    '&.MuiButton-root': {
        backgroundColor: "transparent",
        color: theme.palette.text.primary,
        fontSize: '0.8rem',
        padding: '0.15rem 0.5rem 0.05rem 0.5rem',
        boxShadow: theme.palette.shadow.main,
        minWidth: '0',
    },
    '&:hover': {
        boxShadow: theme.palette.shadow.secondary,
    },
    '&.Mui-disabled': {
        opacity: 0.7,
        cursor: 'not-allowed',
    },
}));

export const RedButton = styled(Button)(({ theme }) => ({
    '&.MuiButton-root': {
        backgroundColor: theme.palette.error.main,
        color: '#ffffff',
    },
    '&:hover': {
        backgroundColor: theme.palette.error.dark,
    },
}));

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

const WhiteCircularProgress = styled(CircularProgress)({
    color: 'white',
});

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

// Champ de texte simple avec loupe, placeholder, fond transparent et bordure personnalisée
export function SimpleSearchField({ value, onChange, placeholder = "Rechercher...", theme, ...props }) {
  return (
    <TextField
      variant="outlined"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      autoComplete="off"
      {...props}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <FiSearch  style={{ color: theme?.palette?.text?.secondary || '#888' }} />
          </InputAdornment>
        ),
        style: {
          background: 'transparent',
          borderRadius: 6,
          padding: '0.2rem 0.5rem 0.1rem 0.5rem',
          height: '2rem',
        },
        ...props.InputProps,
      }}
      sx={{
        minWidth: 160,
        background: 'transparent',
        height: '2rem',

        '& .MuiFormControl-root': {
            height: '2rem',
        },
        '& .MuiOutlinedInput-root': {
          background: 'transparent',
          borderRadius: 1,
          height: '2rem',
          fontSize: '0.8rem',
          '& fieldset': {
            borderColor: theme?.palette?.primary?.third || '#1976d2',
          },
          '&:hover fieldset': {
            borderColor: theme?.palette?.primary?.third || '#1976d2',
          },
          '&.Mui-focused fieldset': {
            borderColor: theme?.palette?.primary?.third || '#1976d2',
          },
          '& input': {
            background: 'transparent !important',
          },
        },
        '& input': {
          background: 'transparent !important',
          padding: 0,
          fontSize: '0.8rem',
        },
        '& .MuiAutocomplete-listbox': {
          background: 'transparent',
        },
      }}
    />
  );
}



export function SimpleInputField({ value, onChange, placeholder = "", theme, ...props }) {
  const spanRef = useRef(null);
  const [inputWidth, setInputWidth] = useState(20);
  const [isFocused, setIsFocused] = useState(false);

  useLayoutEffect(() => {
    if (spanRef.current) {
      setInputWidth(spanRef.current.offsetWidth + 17); // 16px de marge/padding
    }
  }, [value, placeholder]);

  return (
    <div style={{ display: "inline-block", position: "relative" }}>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          width: inputWidth,
          minWidth: 40,
          maxWidth: 400,
          fontSize: "0.8rem",
          background: "transparent",
          color: theme?.palette?.text?.secondary,
          border: `1px solid ${isFocused ? '#2ec96d' : (theme?.palette?.primary?.third || '#ccc')}`,
          borderRadius: 4,
          padding: "0.2rem 0.5rem",
          outline: "none",
          transition: 'border 0.2s, box-shadow 0.2s',
          fontFamily: "'Montserrat',sans-serif",
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      />
      <span
        ref={spanRef}
        style={{
          position: "absolute",
          visibility: "hidden",
          height: 0,
          whiteSpace: "pre",
          fontSize: "0.8rem",
        }}
      >
        {value || placeholder}
      </span>
    </div>
  );
}

// Utility functions
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
};

export function CustomAxisTooltip({ themeColor, type, unite, typeMetric }) {
    const mousePosition = useMouseTracker();
    const tooltipData = type === 'axes' ? useAxisTooltip() : useItemTooltip();
    const items = type === 'axes' ? tooltipData?.seriesItems : tooltipData?.value;

    if (!tooltipData || !mousePosition) {
        return null;
    }

    if (items.length === 2) {
        const value1 = items[0].value;
        const value2 = items[1].value;
        const percentageDifference = value2 === 0 ? 0 : ((value1 - value2) / value2) * 100;
        items.push({
            label: 'Différence en %',
            value: `${percentageDifference.toFixed(2)}%`,
        });
    }

    if (unite === 'country' && tooltipData.axisFormattedValue) {
        const [id, ...rest] = tooltipData.axisFormattedValue.split(' ');
        const country = rest.join(' ');
        items[0].value = { name: country, id: id };
    }

    const isMousePointer = mousePosition?.pointerType === 'mouse';
    const yOffset = isMousePointer ? 0 : 40 - mousePosition.height;

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
                            'tr:first-of-type': { td: { paddingTop: 1.5, paddingBottom: 1.5 } },
                            tr: {
                                'td:first-of-type': { paddingLeft: 1.5, paddingRight: 1.5 },
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
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    {unite === 'country' && <Flag code={items[0].value.id} style={{ marginRight: 8, width: 20, height: 15, borderRadius: 5 }} />}
                                    <p colSpan={3} style={{ fontSize: '0.8rem', color: themeColor.palette.text.secondary }}>
                                        {unite === 'country' ? items[0].value.name : formattedDate}
                                    </p>
                                </div>

                                <div key={items[0].seriesId} style={{ marginTop: "0.8rem", display: 'flex', gap: '0.5rem' }}>
                                    <p>
                                        {items[0].formattedLabel} :
                                    </p>
                                    <p>
                                        <b>{

                                            unite === 's'
                                                ? formatTime(items[0].formattedValue)
                                                : typeMetric === 'ctr'
                                                    ? `${(Number(items[0].value) * 100).toFixed(2)} %`
                                                    : items[0].formattedValue
                                        }</b>
                                    </p>
                                </div>

                                {items.length > 1 && (
                                    <div className='total-statistique-compare'>
                                        <p style={{ color: items[2]?.value.startsWith('-') ? "red" : "green", fontSize: "0.7rem" }}><b>{items[2].value}</b></p>
                                        <ArrowDropUpIcon
                                            style={{
                                                color: items[2]?.value.startsWith('-') ? "red" : "green",
                                                height: "1.5rem",
                                                transform: `rotate(${items[2]?.value.startsWith('-') ? 180 : 0}deg)`,
                                            }}
                                        />
                                    </div>
                                )}
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

// Composant menu de tri réutilisable
export function SortMenu({
  anchorEl, open, onClose, options, sorts = [], addColumn, setAddColumn, onAddSort, onRemoveSort, onToggleSortDir, theme
}) {
  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      sx={{
        '& .MuiPaper-root': {
          backgroundColor: theme.palette.background.default,
          color: theme.palette.text.primary,
          minWidth: 260,
          border: `1px solid ${theme.palette.primary.third}`,
        },
        '& .MuiList-root': {
          padding: 0,
        }

      }}
    >
      {/* Liste des tris actifs */}
      <div style={{padding: '0.5rem 1rem 0.5rem 1rem', minWidth: 220}}>
        {sorts.length === 0 && <div style={{fontSize: 13, opacity: 0.7}}>Aucun tri actif</div>}
        {sorts.map((sort, idx) => {
          const col = options.find(o => o.key === sort.key);
          return (
            <div key={sort.key} style={{display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center'}}>
              <div style={{fontSize: '0.87rem', minWidth: 70, textAlign: 'center', color: theme.palette.text.secondary, display: 'flex', justifyContent: 'center', gap: '0.5rem'}}><SortIcon fontSize="small"/>trier par :</div>
              <span style={{flex: 1}}>{col ? col.label : sort.key}</span>
              <Switch
                size="small"
                checked={sort.dir === 'asc'}
                onChange={() => onToggleSortDir(sort.key)}
                inputProps={{ 'aria-label': 'asc/desc' }}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: 'var(--primary-color)',
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: 'var(--primary-color)',
                  },
                  '& .MuiSwitch-track': {
                    backgroundColor: 'var(--primary-color-light, #b3d4fc)',
                  },
                }}
              />
              <span style={{fontSize: '0.87rem', minWidth: 70, textAlign: 'center', color: theme.palette.text.secondary}}>{sort.dir === 'asc' ? 'Ascendant' : 'Descendant'}</span>
              <IconButton size="small" onClick={() => onRemoveSort(sort.key)}>
                <CloseIcon 
                    fontSize="small"
                    sx={{ color: theme.palette.text.secondary, '&:hover': { color: theme.palette.text.primary } }} 
                />
              </IconButton>
            </div>
          );
        })}
      </div>
      <div style={{borderTop: '1px solid ' + theme.palette.primary.third}} />
      {/* Ajout d'un tri */}
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '0.5rem 1rem 0.5rem 1rem'}}>
        <SelectFieldSecondary
          size="small"
          value={addColumn}
          theme={theme}
          displayEmpty
          onChange={e => setAddColumn(e.target.value)}
          renderValue={selected => {
            if (!selected) return <span>Sélectionner une colonne</span>;
            const opt = options.find(o => o.key === selected);
            return opt ? opt.label : '';
          }}
        >   
          <MenuItem value="" disabled>
            Sélectionner une colonne
          </MenuItem>
          {options.filter(opt => !sorts.some(s => s.key === opt.key)).map(opt => (
            <MenuItem key={opt.key} value={opt.key}>{opt.label}</MenuItem>
          ))}
        </SelectFieldSecondary>
        <SecondaryButton
          variant="contained"
          color="success"
          size="small"
          disabled={false}
          onClick={onAddSort}
        >
          Valider
        </SecondaryButton>
      </div>
    </Menu>
  );
}




const CustomAlert = styled(Alert)(({ theme, severity }) => ({
  color: theme.palette.text.primary,
  borderRadius: 8,
  fontWeight: 500,
  fontSize: '1rem',
  alignItems: 'center',
  border: severity === 'info' ? `1.5px solid ${theme.palette.primary.main}` : undefined,
  '.MuiAlert-icon': {
    color: severity === 'info' ? theme.palette.primary.main : undefined,
    fontSize: 28,
  },
}));

export function GlobalSnackbar({ open, message, type = 'info', onClose, autoHideDuration = 3000 }) {
  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <CustomAlert onClose={onClose} severity={type} sx={{ width: '100%' }}>
        {message}
      </CustomAlert>
    </Snackbar>
  );
}








