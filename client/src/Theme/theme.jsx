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
            main: 'rgb(14 15 17)',
            secondary: '#1F2225',
            third: 'hsl(210, 14%, 13%)'
        },
        secondary: {
            main: 'rgba(255, 255, 255, 0.8)',
            secondary: '#282A30',
            third: '#131416'

        },
        background: {
            default: '#17181C',
        },
        text: {
            primary: 'rgba(255, 255, 255, 0.8)',
            secondary: 'rgba(255, 255, 255, 0.5)'
        },

    }
})

const LIGHT_THEME = createTheme({
    ...baseTheme,
    palette: {
        type: "light",
        primary: {
            main: 'hsl(215, 15%, 97%)',
            secondary:'#ffffff',
            third: '#ffffff'
        },
        secondary: {
            main: "#141414",
            secondary: '#E5E5E5',
            third: '#b9b7b7'

        },
        background: {
            default: '#eff1f5',
        },
        text: {
            primary: '#141414',
            secondary: '#b9b7b7'
        },
    }
})

export { DARK_THEME, LIGHT_THEME, LOCAL_STORAGE_KEY }