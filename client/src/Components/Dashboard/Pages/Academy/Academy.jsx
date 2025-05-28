import React from "react";
import { NavLink } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import { motion, AnimatePresence } from "framer-motion"; // <-- AJOUT FRAMER MOTION
import "./Academy.css";
import { SearchField } from "../../../../Theme/element";
import { useAcademy } from "./useAcademy";
import config from "../../../../config";

const Academy = () => {
    const theme = useTheme();
    const {

        academies,
        availableFilters,
        selectedFilters,
        searchTerm,
        handleSearch,
        handleFilterChange,
        resetFilters,
    } = useAcademy();



    return (
        <div className="outlet">
            <div className="title_section">
                <div className="breadCrumbs">
                    <NavLink
                        style={{ color: theme.palette.text.primary }}
                        className="breadCrumbsLink"
                        to="/dashboard/home"
                    >
                        Dashboard
                    </NavLink>
                    ‎ &gt; Academy
                </div>
            </div>

            <div className="academy_section">
                <div className="academy_contain">
                    <h1 className="academy_title">Academy</h1>

                    <div className="academy_grid">
                        {/* Search Field */}
                        <div className="academy_search">
                            <SearchField
                                label="Rechercher une formation"
                                variant="outlined"
                                theme={theme}
                                type="text"
                                value={searchTerm}
                                onChange={handleSearch}
                                style={{ width: "100%" }}
                                InputProps={{
                                    style: { color: theme.palette.text.primary },
                                }}
                            />
                        </div>

                        {/* Filters */}
                        <div className="academy_filter">
                            <p className="academy_filter_title">Filtres</p>
                            <button
                                className="reset_filters_button"
                                onClick={resetFilters}
                            >
                                Effacer
                            </button>
                            <div className="academy_filter_wrapper">
                                {availableFilters.map((filter) => (
                                    <div key={filter} className="academy_filter_box">
                                        <input
                                            type="checkbox"
                                            value={filter}
                                            checked={selectedFilters.includes(filter)}
                                            onChange={handleFilterChange}
                                            className="academy_filter_checkbox"
                                        />
                                        <p className="academy_filter_checkbox_label">{filter}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="academy_wrapper">
                          <div className="academy_list">
                            <AnimatePresence mode="popLayout">
                              {academies.length === 0 ? (
                                <motion.div
                                  key="no-results"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="no-results"
                                >
                                  Formation à venir prochainement
                                </motion.div>
                              ) : (
                                academies.map((academy) => (
                                  <motion.div
                                    key={academy.id_page_blog}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.3 }}
                                    className="academy_box"
                                    style={{ boxShadow: theme.palette.shadow.main }}
                                  >
                                    <NavLink
                                      to={`/dashboard/academy/${academy.collection_element_slug}`}
                                      className="academy_link"
                                    >
                                      <img
                                        src={academy.content.image?.[0]?.url}
                                        alt={academy.content.image?.[0]?.alt_image || "Formation"}
                                        className="academy_box_image"
                                      />
                                      <div className="academy_info_box">
                                        <p className="academy_title_list">{academy.collection_element_name}</p>
                                        <p style={{ color: theme.palette.text.secondary }}>
                                          {academy.content.text?.find(text => text.id_config === parseInt(config.idConfigAcademyResume))?.text}
                                        </p>
                                        <div className="academy_info_plus_box">
                                          {academy.content.multiReference?.map((ref) => (
                                            <p key={ref.value} className="academy_categories">
                                              {ref.label}
                                            </p>
                                          ))}
                                          <p className="academy_time_list">
                                            {academy.content.text?.find(text => text.id_config === parseInt(config.idConfigAcademyTime))?.text}
                                          </p>
                                        </div>
                                      </div>
                                    </NavLink>
                                  </motion.div>
                                ))
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Academy;
