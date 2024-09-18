import React from "react"
import { useEffect } from "react";


const EcommerceProduct = () => {

    useEffect(() => {
        localStorage.setItem('lastEcommerceRoute', location.pathname);
    }, [location.pathname]);

    return(
        <div>Produis
            
        </div>

    )
}

export default EcommerceProduct