import React, { useState, useEffect, useRef } from "react";
import Axios from 'axios';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';
import { NavLink, useParams } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { SnackbarProvider, enqueueSnackbar } from 'notistack';
import { SecondaryButton, SimpleSearchField } from '../../../../Theme/element';
import config from "../../../../config";
import { SkeletonBlog } from "../../../skeleton/skeleton";
import { formatDate } from "../../../../utils/dateUtils";
import '../modification_site/Portfolio/portfolio.css';
import './newsletter.css';

const NewsLetters = () => {
    // --- Hooks & Theme ---
    const theme = useTheme();
    const { id } = useParams();
    const token = Cookies.get('token');
    const anchorRefMessageOption = useRef([]);

    // --- State ---
    const [InfoListeMail, setInfoListeMail] = useState([]);
    const [LoadingMessage, setLoadingMessage] = useState(true);
    const [checkedMails, setCheckedMails] = useState({});
    const [allChecked, setAllChecked] = useState(false);
    const [searchValue, setSearchValue] = useState('');

    // --- Constants ---
    const apiUrl = config.apiUrl;

    // --- Effects ---
    useEffect(() => {
        Axios.get(`${apiUrl}/getNewsletter`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        }).then((response) => {
            setInfoListeMail(jwtDecode(response.data).mail);
            setLoadingMessage(false);
        }).catch((error) => {
            console.error('Erreur lors de la récupération des messages :', error);
        });
    }, [id]);

    // --- Handlers & Functions ---
    const handleExport = () => {
        Axios.get(`${apiUrl}/exportNewsletter`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        }).then((response) => {
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const date = new Date();
            const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
            link.setAttribute('download', `newsletters-${formattedDate}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        }).catch((error) => {
            console.error('Erreur lors de la récupération des mail :', error);
        });
    };

    const handleDelete = (id_newsletter) => {
        Axios.delete(`${apiUrl}/deleteNewsletter`, {
            data: { id_newsletter },
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        }).then(() => {
            enqueueSnackbar('mail supprimée avec succès.', { variant: 'success' });
            setInfoListeMail(InfoListeMail.filter(InfoMail => InfoMail.id_newsletter !== id_newsletter));
        }).catch((error) => {
            console.error('Erreur lors de la récupération des messages :', error);
            enqueueSnackbar('Erreur lors de la suppression du mail.', { variant: 'error' });
        });
    };

    // Sélection et recherche
    const handleCheckAll = (e) => {
        const checked = e.target.checked;
        setAllChecked(checked);
        const newChecked = {};
        if (InfoListeMail && Array.isArray(InfoListeMail)) {
            InfoListeMail.forEach(mail => {
                newChecked[mail.id_newsletter] = checked;
            });
        }
        setCheckedMails(newChecked);
    };

    const handleCheckItem = (id) => (e) => {
        const checked = e.target.checked;
        setCheckedMails(prev => {
            const updated = { ...prev, [id]: checked };
            if (!checked) setAllChecked(false);
            else if (Object.values(updated).every(Boolean)) setAllChecked(true);
            return updated;
        });
    };

    const atLeastOneChecked = Object.values(checkedMails).some(Boolean);

    const filteredMails = InfoListeMail && Array.isArray(InfoListeMail)
        ? InfoListeMail.filter(mail => {
            const mailValue = mail.mail ? mail.mail.toLowerCase() : '';
            const search = searchValue.toLowerCase();
            return mailValue.includes(search);
        })
        : [];

    const handleDeleteSelected = () => {
        const selectedIds = Object.entries(checkedMails)
            .filter(([id, checked]) => checked)
            .map(([id]) => id);
        if (selectedIds.length === 0) return;
        Promise.all(selectedIds.map(id_newsletter =>
            Axios.delete(`${apiUrl}/deleteNewsletter`, {
                data: { id_newsletter },
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })
        )).then(() => {
            enqueueSnackbar('Sélection supprimée avec succès.', { variant: 'success' });
            // Rafraîchir la liste après suppression
            Axios.get(`${apiUrl}/getNewsletter`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }).then((response) => {
                setInfoListeMail(jwtDecode(response.data).mail);
                setCheckedMails({});
                setAllChecked(false);
            }).catch((error) => {
                enqueueSnackbar('Erreur lors du rafraîchissement de la liste.', { variant: 'error' });
                console.error('Erreur lors du rafraîchissement des messages :', error);
            });
        }).catch((error) => {
            enqueueSnackbar('Erreur lors de la suppression.', { variant: 'error' });
            console.error('Erreur lors de la suppression des mails :', error);
        });
    };

    // --- Render ---
    return (
        <div className="outlet">
            <div className="title_section">
                <div className="breadCrumbs">
                    <NavLink style={{ color: theme.palette.text.primary }} className={"breadCrumbsLink"} to={'/dashboard/home'}>Dashboard</NavLink> &gt; Newsletter
                </div>
            </div>
            <div className="dashboard_case_empty edit-case_empty">
                <div className="liste_contact_contain">
                    <div className="header_modification header_page_modification">
                        <h3 className="titlePage">Newsletter</h3>
                        <SecondaryButton onClick={handleExport} variant="contained" theme={theme}><FileDownloadIcon />Exporter</SecondaryButton>
                    </div>
                    <div className="Item_contact_wrapper">
                        <div className="modification_action_wrapper">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <SimpleSearchField
                                    value={searchValue}
                                    onChange={e => setSearchValue(e.target.value)}
                                    placeholder="Rechercher par mail..."
                                    theme={theme}
                                />
                                {atLeastOneChecked && (
                                    <SecondaryButton className="delete_button_blog" onClick={handleDeleteSelected}>
                                        <DeleteOutlineOutlinedIcon style={{ marginRight: 4, color: '#fff' }} fontSize='small' />
                                        Supprimer la sélection
                                    </SecondaryButton>
                                )}
                                <span className="item_count">
                                    {atLeastOneChecked
                                        ? `${filteredMails.filter(m => checkedMails[m.id_newsletter]).length} / ${filteredMails.length} sélectionné(s)`
                                        : `${filteredMails.length} item(s)`}
                                </span>
                            </div>
                        </div>
                        <div className="Item_menu_contact">
                            <div className="Item_menu">
                                <div className="Item_portfolio_element message_name_element" style={{ color: theme.palette.text.secondary }}>
                                    <label className="custom-checkbox">
                                        <input type="checkbox"
                                            checked={allChecked}
                                            onChange={handleCheckAll}
                                            onClick={e => e.stopPropagation()}
                                        />
                                        <span className="checkmark"></span>
                                    </label>
                                    <p>Mail</p>
                                </div>
                                <p style={{ color: theme.palette.text.secondary }} className="Item_portfolio_element message_date_element">Date d'inscription</p>
                                <p style={{ color: theme.palette.text.secondary }} className="Item_portfolio_element message_option_element">Option</p>
                            </div>
                        </div>
                        <SnackbarProvider maxSnack={3} autoHideDuration={2000}>
                            <div className="liste_contact_box">
                                {LoadingMessage ? <SkeletonBlog /> :
                                    <div className="liste_blog_box">
                                        {filteredMails.length > 0 ? filteredMails.map((mail, index) => {
                                            const formattedMessageDate = formatDate(mail.date);
                                            anchorRefMessageOption.current[index] = anchorRefMessageOption.current[index] || React.createRef();
                                            return (
                                                <div key={index} className="Item_Portfolio Item_Blog newsletter-box" style={{ '--hover-background-color': theme.palette.secondary.secondary, color: theme.palette.text.primary }}>
                                                    <div className="Item_portfolio_element message_name_element">
                                                        <label className="custom-checkbox" onClick={e => e.stopPropagation()}>
                                                            <input type="checkbox"
                                                                checked={!!checkedMails[mail.id_newsletter]}
                                                                onChange={handleCheckItem(mail.id_newsletter)}
                                                                onClick={e => e.stopPropagation()}
                                                            />
                                                            <span className="checkmark"></span>
                                                        </label>
                                                        <p>{mail.mail}</p>
                                                    </div>
                                                    <p className="Item_portfolio_element message_date_element">{formattedMessageDate}</p>
                                                    <div className="Item_portfolio_element message_option_element">
                                                        <IconButton aria-label="delete" onClick={() => handleDelete(mail.id_newsletter)}>
                                                            <DeleteOutlineOutlinedIcon style={{ color: theme.palette.text.primary }} />
                                                        </IconButton>
                                                    </div>
                                                </div>
                                            );
                                        }) : <p style={{ textAlign: 'center', color: theme.palette.text.secondary }}>Aucun mail trouvé</p>}
                                    </div>
                                }
                            </div>
                        </SnackbarProvider>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewsLetters;