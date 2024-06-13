import React from "react"
import {  NavLink } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';



const Blog = () => {

    const theme = useTheme();


    return(
        <div>
            <div className="title_section">
                <div className="breadCrumbs"><NavLink style={{color: theme.palette.text.primary}} className={"breadCrumbsLink"} to={'/dashboard/home'}>Dashboard</NavLink> &gt; <NavLink style={{color: theme.palette.text.primary}} className={"breadCrumbsLink"} to={'/dashboard/modification'}>Modification</NavLink> &gt; Blog</div>
            </div>
            <br/>
            <b>COMING SOON</b>
        </div>

    )
}

export default Blog