import React, { useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { useTheme } from '@mui/material/styles';
import { BsFillBarChartFill } from "react-icons/bs";
import { HiSearch } from "react-icons/hi";
import { MdArrowForwardIos } from "react-icons/md"

import "./statistiqueHome.css";

const StatistiqueHome = () => {
  
  const theme = useTheme();

  return (
    <div className="outlet-box">
      <div className="title_section">
        <div className="breadCrumbs">
          <NavLink 
            className={'breadCrumbsLink'}
            to="/dashboard/home"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            Dashboard
          </NavLink>
          <span className="breadcrumb-separator" style={{ color: theme.palette.text.secondary }}> / </span>
          <span className="breadcrumb-item-active" style={{ color: theme.palette.text.primary }}>
            Statistiques
          </span>
        </div>
      </div>
      <div className="modification_page_contain">
        <div className="modification_link_contain statistique_contain">
            <NavLink
              to={'/dashboard/website/stats/analytics'}
              className="modification_box"
              style={{backgroundColor : theme.palette.primary.secondary, boxShadow: theme.palette.shadow.main}}
            >
                <div className="modification_title_box" style={{color: theme.palette.text.primary}}>
                  <div className="modification_title">
                    <BsFillBarChartFill  className="icon_modifiaction_title"/>
                    <b>Analytics</b>
                  </div>
                  <div className="button_modificationHome"><MdArrowForwardIos /></div>
                </div>
                <div className="texte_modification" style={{color: theme.palette.text.secondary}}>
                  Suivez les statistiques de visites, les sources de trafic et les pages vues de votre site.
                </div>
            </NavLink>
            <NavLink to={'/dashboard/website/stats/search-console'} className="modification_box" style={{backgroundColor : theme.palette.primary.secondary, boxShadow: theme.palette.shadow.main}}>
                <div className="modification_title_box" style={{color: theme.palette.text.primary}}>
                  <div className="modification_title">
                    <HiSearch className="icon_modifiaction_title" />
                    <b>Search Console</b>
                  </div>
                  <div className="button_modificationHome"><MdArrowForwardIos /></div>
                </div>
                <div className="texte_modification" style={{color: theme.palette.text.secondary}}>
                  Vérifiez l’indexation, les clics organiques et les performances SEO de votre site. 
                </div>
            </NavLink>
        </div>
      </div>
    </div>
  );
};

export default StatistiqueHome;
