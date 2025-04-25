import React, { useState, useEffect } from "react";
import { NavLink } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import './Academy.css';
import config from '../../../../config';
import { LoginTextField } from '../../../../Theme/element';

const Academy = () => {
    const theme = useTheme();
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const apiUrl = config.apiUrl;
        const script = document.createElement('script');
        script.src = apiUrl + '/collection-loader.js';
        script.setAttribute('data-user-id', 'APICLIENT');
        script.async = true;
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, []);

    const handleSearch = (e) => {
        const value = e.target.value.toLowerCase();
        setSearchTerm(value);
        console.log(value);
        document.querySelectorAll(".academy_box").forEach(box => {
            const title = box.querySelector("[wn-title]")?.textContent.toLowerCase() || "";
            if (value === "" || title.includes(value)) {
                box.style.transition = "opacity 0.2s ease-in-out, transform 0.2s ease-in-out";
                box.style.opacity = "1";
                box.style.transform = "scale(1)";
                box.style.display = "block";
            } else {
                box.style.transition = "opacity 0.2s ease-in-out, transform 0.2s ease-in-out";
                box.style.opacity = "0";
                box.style.transform = "scale(0.95)";
                setTimeout(() => {
                    box.style.display = "none";
                }, 200); // Correspond à la durée de la transition
            }
        });
    };

    return (
        <div className="outlet">
            <div className="title_section">
                <div className="breadCrumbs">
                    <NavLink style={{ color: theme.palette.text.primary }} className={"breadCrumbsLink"} to={'/dashboard/home'}>Dashboard</NavLink> &gt; Academy
                </div>
            </div>
            <div className="academy_section">
                <div className="academy_contain">
                    <h1 className="academy_title">Academy</h1>
                    <div className="academy_grid">
                        <div className="academy_search">
                            <LoginTextField 
                                placeholder="Rechercher un cours"
                                variant="outlined"
                                theme={theme} 
                                type="text"
                                value={searchTerm}
                                onChange={handleSearch}
                                style={{width: '100%'}}
                                InputProps={{
                                    style: {
                                        color: theme.palette.text.primary,
                                    },
                                }}
                            />
                        </div>
                        <div className="academy_wrapper">
                            <div className="academy_list" wn-collection-wrapper='eyJibG9nSWQiOiAiMjIiLCAibGltaXQiOiAiIiwgIm9yZGVyIjogIiIsICJjb2xvbmUiOiAiIiwgImpvaW5UYWJsZSI6ICIiLCAiY29uZmlnIjogIiJ9'>
                                <div wn-collection-box="" className="academy_box" style={{boxShadow: theme.palette.shadow.main}}>
                                    <img wn-image="130" alt="Blog Image" />
                                    <div className="academy_info_box">
                                        <p wn-title="" className="academy_title_list" ></p>
                                        <p wn-text="135" style={{color: theme.palette.text.secondary}}></p>
                                        <p wn-text="131"></p>
                                        <div wn-multireference-wrapper="132">
                                            <div wn-multireference-box="">
                                                <p wn-multireference-title="" wn-multireference-id="filtre"></p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                </div>
                            </div>
                        </div>
                        <div className="academy_filter">
                            <p className="academy_filter_title">Filtre</p>
                            <div wn-collection-wrapper="eyJibG9nSWQiOiAiMjMiLCAibGltaXQiOiAiIiwgIm9yZGVyIjogIiIsICJjb2xvbmUiOiAiIiwgImpvaW5UYWJsZSI6ICIiLCAiY29uZmlnIjogIiJ9">
                                <div wn-collection-box="">
                                    <input wn-input="133" type="checkbox" />
                                    <p wn-title=""></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Academy;