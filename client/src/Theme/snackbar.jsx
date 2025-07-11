// components/SnackbarProvider.jsx
import React, { createContext, useContext, useState, useCallback } from 'react';
import { Snackbar, Alert } from '@mui/material';
import Slide from '@mui/material/Slide';
import { styled } from '@mui/material/styles';


export const SnackbarContext = createContext();

export const useSnackbar = () => useContext(SnackbarContext);

const CustomAlert = styled(Alert)(({ theme, severity }) => ({
  width: '100%',
  fontSize: '1rem',
  fontWeight: '500',
  borderRadius: '0.5rem',
  color: theme.palette.text.primary,
  backgroundColor: theme.palette.primary.main,
  ...(severity === 'success' && {
    border: `1px solid ${theme.palette.colors.green}`,
    '& .MuiAlert-icon': {
      color: theme.palette.colors.green,
    },
  }),
  ...(severity === 'error' && {
    border: `1px solid ${theme.palette.colors.red}`,
    '& .MuiAlert-icon': {
      color: theme.palette.colors.red,
    },
  }),
  ...(severity === 'info' && {
    border: `1px solid ${theme.palette.primary.third}`,
    '& .MuiAlert-icon': {
      color: theme.palette.text.primary,
    },
  }),
}));

export const SnackbarProvider = ({ children }) => {
  const [snackbar, setSnackbar] = useState({
    open: false,
    type: 'info', // 'success' | 'error' | 'info'
    message: '',
  });

  const showSnackbar = (type, message) => {
    setSnackbar({ open: true, type, message });
  };

  const handleClose = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      {children}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        TransitionComponent={Slide}
      >
        <CustomAlert onClose={handleClose} severity={snackbar.type} sx={{ width: '100%' }}>
          {snackbar.message}
        </CustomAlert>
      </Snackbar>
    </SnackbarContext.Provider>
  );
};
