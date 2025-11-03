import * as React from 'react';
import { ThemeProvider, useTheme } from '@emotion/react';
import ThemeContext from './themeContext';
import { LOCAL_STORAGE_KEY, DARK_THEME, LIGHT_THEME } from './theme';

// Composant interne pour appliquer les variables CSS
function ThemeVariables({ children }) {
    const theme = useTheme();

    React.useEffect(() => {
        // Appliquer les variables CSS à la racine du document
        const root = document.documentElement;
        root.style.setProperty('--color-primary-main', theme.palette.primary.main);
        root.style.setProperty('--color-primary-secondary', theme.palette.primary.secondary);
        root.style.setProperty('--color-primary-third', theme.palette.primary.third);
        root.style.setProperty('--color-secondary-main', theme.palette.secondary.main);
        root.style.setProperty('--color-secondary-secondary', theme.palette.secondary.secondary);
        root.style.setProperty('--color-secondary-third', theme.palette.secondary.third);
        root.style.setProperty('--color-shadow-main', theme.palette.shadow.main);
        root.style.setProperty('--color-shadow-secondary', theme.palette.shadow.secondary);
        root.style.setProperty('--color-globe-dark', theme.palette.globe.dark);
        root.style.setProperty('--color-background-default', theme.palette.background.default);
        root.style.setProperty('--color-background-secondary', theme.palette.background.secondary);
        root.style.setProperty('--color-text-primary', theme.palette.text.primary);
        root.style.setProperty('--color-text-secondary', theme.palette.text.secondary);
        root.style.setProperty('--color-green', theme.palette.colors.green);
        root.style.setProperty('--color-blue', theme.palette.colors.blue);
        root.style.setProperty('--color-yellow', theme.palette.colors.yellow);
        root.style.setProperty('--color-orange', theme.palette.colors.orange);
        root.style.setProperty('--color-red', theme.palette.colors.red);
        root.style.setProperty('--color-purple', theme.palette.colors.purple);
    }, [theme]);

    return children;
}

function ThemeHandler(props) {

    const [isDark, setDark] = React.useState(localStorage.getItem(LOCAL_STORAGE_KEY) === 'true');

    const ctxValue = {
        isDark: isDark,
        toggleTheme: toggleTheme
    }

    function toggleTheme (){
        setDark(!isDark)
        localStorage.setItem(LOCAL_STORAGE_KEY, !isDark);
    }

    function getTheme(){
        if(isDark){
            return DARK_THEME;
        } else {
            return LIGHT_THEME;
        }
    }

    return (
        <ThemeContext.Provider value={ctxValue}>
            <ThemeProvider theme={getTheme}>
                <ThemeVariables>
                    {props.children}
                </ThemeVariables>
            </ThemeProvider>
        </ThemeContext.Provider>
    )
}

export default ThemeHandler;