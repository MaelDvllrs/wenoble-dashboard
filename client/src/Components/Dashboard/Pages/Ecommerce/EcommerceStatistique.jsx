import React from "react"
import { useTheme } from '@mui/material/styles';
import { useEffect } from "react";

const EcommerceStatistique = () => {

    const theme = useTheme();

    useEffect(() => {
        localStorage.setItem('lastEcommerceRoute', location.pathname);
    }, [location.pathname]);

    return(
        <div className="ecommerce_statistique_grid">
            <div className="ecommerce_box principal_box stats_1">

            </div>
            <div className="ecommerce_box secondary stats_2" style={{backgroundColor : theme.palette.primary.secondary, borderColor : theme.palette.primary.third}}>

            </div>
            <div className="ecommerce_box secondary stats_3" style={{backgroundColor : theme.palette.primary.secondary, borderColor : theme.palette.primary.third}}>

            </div>
            <div className="ecommerce_box secondary stats_4" style={{backgroundColor : theme.palette.primary.secondary, borderColor : theme.palette.primary.third}}>

            </div>
            <div className="ecommerce_box secondary stats_5" style={{backgroundColor : theme.palette.primary.secondary, borderColor : theme.palette.primary.third}}>

            </div>
            
        </div>

    )
}

export default EcommerceStatistique