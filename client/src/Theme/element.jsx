import TextField from '@mui/material/TextField';
import { styled } from '@mui/material/styles';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import LoadingButton from '@mui/lab/LoadingButton';
import CircularProgress from '@mui/material/CircularProgress';


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
