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
            main: '#191c24',
        },
        secondary: {
            main: 'rgba(255, 255, 255, 0.8)',
            secondary: '#282A30'
        },
        background: {
            default: '#07080a',
        },
        text: {
            primary: 'rgba(255, 255, 255, 0.8)',
        },

    }
})

const LIGHT_THEME = createTheme({
    ...baseTheme,
    palette: {
        type: "light",
        primary: {
            main: 'hsl(215, 15%, 97%)',
        },
        secondary: {
            main: "#141414",
            secondary: '#E5E5E5'

        },
        background: {
            default: 'white',
        },
        text: {
            primary: '#141414',
        },
    }
})

export { DARK_THEME, LIGHT_THEME, LOCAL_STORAGE_KEY }