import React from "react"

const EcommerceOrderAll = () => {

    useEffect(() => {
        localStorage.setItem('lastEcommerceRoute', location.pathname);
    }, [location.pathname]);
    
    return(
        <div>All
            
        </div>

    )
}

export default EcommerceOrderAll