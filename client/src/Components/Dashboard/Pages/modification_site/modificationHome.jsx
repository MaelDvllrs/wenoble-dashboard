import React from "react"
import { NavLink } from "react-router-dom"
import { useTheme } from '@mui/material/styles';


const ModificationHome = () => {

    const theme = useTheme();



    return(
        <div className="outlet">
            <div className="breadCrumbs"><NavLink style={{color: theme.palette.text.primary}} className={"breadCrumbsLink"} to={'/dashboard/home'}>Dashboard</NavLink> / Modification</div>
            <NavLink to={'/dashboard/modification/portfolio'} className="">
                <div className="dashboard_section" style={{color: theme.palette.text.primary, backgroundColor:theme.palette.primary.main}}>Portfolios</div>
            </NavLink>
            <NavLink to={'/dashboard/modification/page'} className="">
                <div className="dashboard_section" style={{color: theme.palette.text.primary, backgroundColor:theme.palette.primary.main}}>Pages</div>
            </NavLink>
            <NavLink to={'/dashboard/modification/Blog/'} className="">
                <div className="dashboard_section" style={{color: theme.palette.text.primary, backgroundColor:theme.palette.primary.main}}>Blogs</div>
            </NavLink>
        </div>
    )
}

export default ModificationHome