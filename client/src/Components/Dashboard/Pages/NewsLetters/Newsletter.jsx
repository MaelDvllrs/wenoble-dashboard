import React, { useState, useEffect, useRef } from "react";
import Axios from 'axios';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';
import { NavLink, useParams } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { useWebsite } from '../../../../Context/WebsiteContext';
import IconButton from '@mui/material/IconButton';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { SecondaryButton, SimpleSearchField } from '../../../../Theme/element';
import config from "../../../../config";
import { SkeletonBlog } from "../../../skeleton/skeleton";
import { formatDate } from "../../../../utils/dateUtils";
import { useSnackbar } from '../../../../Theme/snackbar';
import '../modification_site/Portfolio/portfolio.css';
import './newsletter.css';

const NewsLetters = () => {
    // --- Hooks & Theme ---
    const theme = useTheme();
    const { selectedWebsite, loading: websiteLoading } = useWebsite();
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

    // --- Snackbar Hook ---
    const { showSnackbar } = useSnackbar();

    // --- Effects ---
    const fetchNewsletters = async () => {
        if (!selectedWebsite?.id) {
            return;
        }

        setLoadingMessage(true);
        try {
            const response = await Axios.get(`${apiUrl}/getNewsletter`, {
                params: {
                    websiteId: selectedWebsite.id
                },
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            setInfoListeMail(jwtDecode(response.data).mail || []);
            setLoadingMessage(false);
        } catch (error) {
            showSnackbar('error', '[NEWSLET-001] Erreur lors de la récupération des newsletters');
            console.error('Erreur lors de la récupération des messages :', error);
            setLoadingMessage(false);
        }
    };

    useEffect(() => {
        fetchNewsletters();
    }, [selectedWebsite?.id]);

    // --- Handlers & Functions ---
    const handleExport = () => {
        if (!selectedWebsite?.id) {
            showSnackbar('error', 'Aucun site web sélectionné');
            return;
        }

        Axios.get(`${apiUrl}/exportNewsletter`, {
            params: {
                websiteId: selectedWebsite.id
            },
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
            showSnackbar('success', 'Export des newsletters réussi');
        }).catch((error) => {
            showSnackbar('error', '[NEWSLET-002] Erreur lors de l\'export des newsletters');
            console.error('Erreur lors de la récupération des mail :', error);
        });
    };

    const handleDelete = (id_newsletter) => {
        if (!selectedWebsite?.id) {
            showSnackbar('error', 'Aucun site web sélectionné');
            return;
        }

        Axios.delete(`${apiUrl}/deleteNewsletter`, {
            data: { 
                id_newsletter,
                websiteId: selectedWebsite.id
            },
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        }).then(() => {
            showSnackbar('success', 'Newsletter supprimée avec succès');
            setInfoListeMail(InfoListeMail.filter(InfoMail => InfoMail.id_newsletter !== id_newsletter));
        }).catch((error) => {
            showSnackbar('error', '[NEWSLET-003] Erreur lors de la suppression de la newsletter');
            console.error('Erreur lors de la récupération des messages :', error);
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
        if (!selectedWebsite?.id) {
            showSnackbar('error', 'Aucun site web sélectionné');
            return;
        }

        const selectedIds = Object.entries(checkedMails)
            .filter(([id, checked]) => checked)
            .map(([id]) => id);
        if (selectedIds.length === 0) return;
        Promise.all(selectedIds.map(id_newsletter =>
            Axios.delete(`${apiUrl}/deleteNewsletter`, {
                data: { 
                    id_newsletter,
                    websiteId: selectedWebsite.id
                },
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })

        )).then(() => {
            // Rafraîchir la liste après suppression
            fetchNewsletters();
            setCheckedMails({});
            setAllChecked(false);
            showSnackbar('success', 'Sélection supprimée avec succès');
        }).catch((error) => {
            showSnackbar('error', '[NEWSLET-005] Erreur lors de la suppression des newsletters');
            console.error('Erreur lors de la suppression des mails :', error);
        });
    };

    // --- Render ---
    return (
        <div className="outlet-box">
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
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewsLetters;