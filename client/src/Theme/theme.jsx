import { createTheme } from '@mui/material/styles';

const LOCAL_STORAGE_KEY = "isDark";

const baseTheme = createTheme({
    typography: {
        fontFamily: "'Montserrat', sans-serif",
        fontSize: 14,
        fontFamilySecondary: "'Roboto Condensed', sans-serif"
    }
})

const DARK_THEME = createTheme({
    ...baseTheme,
    palette: {
        type: "dark",
        primary: {
            main: 'rgba(14, 15, 17, 1)',
            secondary: 'rgba(22, 23, 28, 1)',
            third: 'rgba(51, 51, 51, 1)'
        },
        secondary: {
            main: 'rgba(255, 255, 255, 0.8)',
            secondary: 'rgba(40, 42, 48, 1)',
            third: 'rgba(53, 53, 53, 1)'
        },

        colors: {
            green: 'rgba(70, 254, 165, 0.83)',
            blue: 'rgb(146, 166, 255)',
            yellow: 'rgb(255, 253, 146)',
        },

        shadow: {
            main: '0 0 0 1px rgba(255, 255, 255, 0.145)',
            secondary: '0 0 0 1px rgba(255, 255, 255, 0.30)'
        },
        globe: {
            dark: '1.1',
        },
        background: {
            default: 'rgba(5, 5, 10, 1)',
            secondary: 'rgba(0, 0, 0, 1)'
        },
        text: {
            primary: 'rgba(255, 255, 255, 0.8)',
            secondary: 'rgba(255, 255, 255, 0.5)'
        },
    }
});

const LIGHT_THEME = createTheme({
    ...baseTheme,
    palette: {
        type: "light",
        primary: {
            main: 'rgb(246, 247, 248)',
            secondary: 'rgba(255, 255, 255, 1)',
            third: 'rgba(203, 203, 203, 1)'
        },
        secondary: {
            main: 'rgba(20, 20, 20, 1)',
            secondary: 'rgba(229, 229, 229, 1)',
            third: 'rgba(233, 233, 233, 1)'
        },

        colors: {
            green: 'rgb(0, 179, 92)',
            blue: 'rgb(0, 46, 252)',
            yellow: 'rgb(187, 184, 0)',
        },

        shadow: {
            main: '0 0 0 1px rgba(0, 0, 0, 0.08)',
            secondary: '0 0 0 1px rgba(0, 0, 0, 0.30)'
        },
        globe: {
            dark: '0',
        },
        background: {
            default: 'rgba(239, 241, 245, 1)',
            secondary: 'rgba(255, 255, 255, 1)'
        },
        text: {
            primary: 'rgba(20, 20, 20, 1)',
            secondary: 'rgba(117, 117, 117, 1)'
        },
    }
});

export { DARK_THEME, LIGHT_THEME, LOCAL_STORAGE_KEY }