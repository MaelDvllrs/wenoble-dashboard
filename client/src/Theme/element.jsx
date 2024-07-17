import { useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import { styled } from '@mui/material/styles';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';







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
            borderColor: "#0541b7",
        },
    },
}));

export const DefaultSwitch = styled(Switch)(({ theme }) => ({
    '& .MuiSwitch-switchBase.Mui-checked': {
      color: "#0541b7",
    },
    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
      backgroundColor: "#0541b7",
    },
    '& .MuiSwitch-track': {
        backgroundColor: theme.palette.secondary.main,
    },
}));

export const DefaultButton = styled(Button)(({ theme }) => ({
    '&.MuiButton-root': {
        backgroundColor: "#0541b7", 
        color: 'rgba(255, 255, 255, 0.8)',
    },
    '&:hover': {
        backgroundColor: "#05286f", 
    },
}));

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
        color : theme.palette.text.primary
    },
    '&:hover': {
        backgroundColor: theme.palette.error.dark, 
    },
}));

export const Popup = styled('div')(({ theme }) => ({
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.3)', 
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
