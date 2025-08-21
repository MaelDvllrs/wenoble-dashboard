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
            secondary: '#0d0e11', // légèrement plus sombre
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
            red: 'rgb(255, 0, 0)',
            purple: 'rgba(227, 27, 227, 1)',
        },

        shadow: {
            // Effet "liquid glass" : fine bordure + glow interne léger + profondeur
            main: [
                '0 0 0 1px rgba(255,255,255,0.06)',          // stroke très discret
                '0 2px 3px -1px rgba(0,0,0,0.55)',           // ombre proche
                '0 6px 14px -6px rgba(0,0,0,0.50)',          // profondeur légère
                'inset 0 0 0 1px rgba(255,255,255,0.04)'     // liseré interne subtil
            ].join(', '),
            secondary: [
                '0 0 0 1px rgba(255,255,255,0.10)',          // un peu plus visible
                '0 3px 10px -4px rgba(0,0,0,0.55)',
                'inset 0 0 0 1px rgba(255,255,255,0.05)'
            ].join(', ')
        },
        globe: {
            dark: '1.1',
        },
        background: {
            default: 'rgba(5, 5, 10, 1)',
            secondary: '#08090b'
        },
        text: {
            primary: 'rgba(255, 255, 255, 0.8)',
            secondary: 'rgba(255, 255, 255, 0.5)'
        },
        gradients: {
            // Plus sombre globalement: linear plus profond + highlight plus doux et un peu remonté
            surface: 'radial-gradient(at 50% 118%, rgba(255,255,255,0.08) 0%, rgba(160,170,180,0.035) 22%, rgba(18,20,23,0) 48%) , linear-gradient(180deg, #060708 0%, #090b0d 55%, #0d1013 100%)',
            surfaceHover: 'radial-gradient(at 50% 120%, rgba(255,255,255,0.12) 0%, rgba(180,190,200,0.05) 26%, rgba(18,20,23,0) 52%) , linear-gradient(180deg, #07080a 0%, #0b0d10 55%, #111519 100%)'
        }
    }
});

const LIGHT_THEME = createTheme({
    ...baseTheme,
    palette: {
        type: "light",
        primary: {
            main: 'rgb(246, 247, 248)',
            secondary: 'rgba(255, 255, 255, 1)',
            third: 'rgba(240, 240, 240, 1)'
        },
        secondary: {
            main: 'rgba(20, 20, 20, 1)',
            secondary: 'rgba(229, 229, 229, 1)',
            third: 'rgba(240, 240, 240, 1)'
        },

        colors: {
            green: 'rgb(1, 154, 80)',
            blue: 'rgb(0, 46, 252)',
            yellow: 'rgb(187, 184, 0)',
            red: 'rgb(255, 0, 0)',
            purple: 'rgba(149, 0, 149, 1)',
        },

        shadow: {
            // Effet "liquid glass" version clair : couche externe + halo doux + relief interne
            main: [
                '0 0 0 1px rgba(0,0,0,0.06)',                // stroke externe discret
                '0 2px 3px -1px rgba(0,0,0,0.10)',           // petite ombre proche
                '0 6px 18px -6px rgba(0,0,0,0.10)',          // profondeur
                'inset 0 0 0 1px rgba(255,255,255,0.65)',    // liseré interne lumineux
                'inset 0 1px 4px rgba(255,255,255,0.35)'     // diffusion interne verre
            ].join(', '),
            secondary: [
                '0 0 0 1px rgba(0,0,0,0.10)',
                '0 4px 10px -2px rgba(0,0,0,0.18)',
                'inset 0 0 0 1px rgba(255,255,255,0.55)'
            ].join(', ')
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