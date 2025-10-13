import React from "react"
import Axios from 'axios';
import { useState, useEffect, useRef } from "react";
import Cookies from 'js-cookie';
import {jwtDecode} from 'jwt-decode'; 
import { NavLink,  useParams, Link, useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { useWebsite } from '../../../../Context/WebsiteContext';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import '../modification_site/Portfolio/portfolio.css';
import './Contact.css';
import config from "../../../../config";
import { useSnackbar } from '../../../../Theme/snackbar';
import { SkeletonBlog } from "../../../skeleton/skeleton";
import { formatDate } from "../../../../utils/dateUtils";
import IconButton from '@mui/material/IconButton';
import Popper  from '@mui/material/Popper';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Grow from '@mui/material/Grow';
import EmailIcon from '@mui/icons-material/Email';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { SecondaryButton, SimpleSearchField } from "../../../../Theme/element";
import { PiLockBold, PiUserBold, PiGearSixBold, PiPowerBold, PiChatCircleDotsBold, PiBellBold,  PiPlusBold } from "react-icons/pi";


const ContactList = () => {

    const theme = useTheme();
    const navigate = useNavigate();
    const { selectedWebsite, loading: websiteLoading } = useWebsite();

    const token = Cookies.get('token');
    const [InfoListeMessage, setInfoListeMessage] = useState([]);
    const apiUrl = config.apiUrl;
    const { id } = useParams();

    const [LoadingMessage, setLoadingMessage] = useState(true);


    const [openMenuMessage, setOpenMenuMessage] = useState(null);
    const anchorRefMessageOption = useRef([]);

    const [checkedMessages, setCheckedMessages] = useState({});
    const [allChecked, setAllChecked] = useState(false);
    const [searchValue, setSearchValue] = useState('');

    const { showSnackbar } = useSnackbar();



    const handleOpenMessageMenu = (event, index) => {
        event.stopPropagation();
        setOpenMenuMessage(openMenuMessage === index ? null : index);
    };


    const handleClickAway = () => {
        setOpenMenuMessage(null);
    };


    // Fonction pour cocher/décocher toutes les cases
    const handleCheckAll = (e) => {
      const checked = e.target.checked;
      setAllChecked(checked);
      const newChecked = {};
      if (InfoListeMessage.message && Array.isArray(InfoListeMessage.message)) {
        InfoListeMessage.message.forEach(msg => {
          newChecked[msg.id_message] = checked;
        });
      }
      setCheckedMessages(newChecked);
    };
    // Fonction pour cocher/décocher une case individuelle
    const handleCheckItem = (id) => (e) => {
      const checked = e.target.checked;
      setCheckedMessages(prev => {
        const updated = { ...prev, [id]: checked };
        if (!checked) setAllChecked(false);
        else if (Object.values(updated).every(Boolean)) setAllChecked(true);
        return updated;
      });
    };

    const handleDeleteSelected = () => {
        if (!selectedWebsite?.id) {
            showSnackbar('error', 'Aucun site web sélectionné');
            return;
        }

        const selectedMessages = Object.keys(checkedMessages).filter(id => checkedMessages[id]);
        if (selectedMessages.length === 0) return;
        Axios.delete(`${apiUrl}/deleteMessage`, {
            params: {
                idMessage: selectedMessages.join(','),
                websiteId: selectedWebsite.id
            },
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
        }).then(() => {
            // Rafraîchir la liste des messages après la suppression
            fetchMessages();
            setCheckedMessages({});
            setAllChecked(false);
            showSnackbar('success', 'Messages supprimés avec succès');
        }).catch((error) => {
            showSnackbar('error', '[CONT-LIST-002] Erreur lors de la suppression des messages');
            console.error('Erreur lors de la suppression des messages :', error);
        });
    };


    const fetchMessages = async () => {
        if (!selectedWebsite?.id) {
            return;
        }

        setLoadingMessage(true);
        try {
            const response = await Axios.get(`${apiUrl}/getMessage`, {
                params: {
                    websiteId: selectedWebsite.id
                },
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            setInfoListeMessage(jwtDecode(response.data));
            setLoadingMessage(false);
        } catch (error) {
            showSnackbar('error', '[CONT-LIST-003] Erreur lors de la récupération des messages');
            console.error('Erreur lors de la récupération des messages :', error);
            setLoadingMessage(false);
        }
    };

    useEffect(() => {    
        fetchMessages();
    }, [selectedWebsite?.id]);


    // Détermine si au moins une case est cochée
    const atLeastOneChecked = Object.values(checkedMessages).some(Boolean);


    // Filtrage des messages selon la recherche (expéditeur ou objet)
    const filteredMessages = InfoListeMessage && Array.isArray(InfoListeMessage.message)
      ? InfoListeMessage.message.filter(message => {
          const sender = message.mail_sender ? message.mail_sender.toLowerCase() : '';
          const subject = message.subject ? message.subject.toLowerCase() : '';
          const search = searchValue.toLowerCase();
          return sender.includes(search) || subject.includes(search);
        })
      : [];


    return(
        <div className="outlet-box">
            {/* Section titre avec breadcrumb */}
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
                        Contact
                    </span>
                </div>
            </div>

            <div className="dashboard_case_empty edit-case_empty">
                <div className="liste_contact_contain">
                    <div className="header_modification">
                        <h3 className="titlePage">Liste des messages</h3>
                    </div>
                    
                    <div className="Item_contact_wrapper">
                        <div className="modification_action_wrapper">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <SimpleSearchField
                              value={searchValue}
                              onChange={e => setSearchValue(e.target.value)}
                              placeholder="Rechercher par expéditeur, objet..."
                              theme={theme}
                            />
                            {atLeastOneChecked && (
                              <SecondaryButton className="delete_button_blog" onClick={handleDeleteSelected}>
                                <DeleteOutlineOutlinedIcon style={{ marginRight: 4, color: '#fff' }} fontSize='small'/>
                                Supprimer la sélection
                              </SecondaryButton>
                            )}
                            <span className="item_count">
                              {atLeastOneChecked
                                ? `${filteredMessages.filter(m => checkedMessages[m.id_message]).length} / ${filteredMessages.length} sélectionné(s)`
                                : `${filteredMessages.length} item(s)`}
                            </span>

                            <SecondaryButton
                              variant="outlined"
                              size="small"
                              sx={{
                                height:'2rem'
                              }}
                              onClick={() => navigate('/dashboard/website/contact/settings')}
                            >
                                <PiGearSixBold/>
                            </SecondaryButton>
                          </div>
                        </div>
                        <div className="Item_menu_contact">
                            
                            
                            <div className="Item_menu">
                              <div className="Item_portfolio_element message_name_element" style={{color: theme.palette.text.secondary}}>
                                <label className="custom-checkbox">
                                  <input type="checkbox"
                                    checked={allChecked}
                                    onChange={handleCheckAll}
                                    onClick={e => e.stopPropagation()}
                                  />
                                  <span className="checkmark"></span>
                                </label>
                                <p>Expéditeur</p>
                              </div>
                              <p style={{color: theme.palette.text.secondary}} className="Item_portfolio_element message_subject_element">Objet</p>
                              <p style={{color: theme.palette.text.secondary}} className="Item_portfolio_element message_date_element">Date de réception</p>
                              <p style={{color: theme.palette.text.secondary}} className="Item_portfolio_element message_option_element">Option</p>
                            </div>

                        </div>
        
                        <div className="liste_contact_box">
                            {LoadingMessage ? <SkeletonBlog /> :
                                <div className="liste_blog_box">
                                        {filteredMessages.length > 0 ? filteredMessages.map((message, index) => {
                                            const formattedMessageDate = formatDate(message.date);
                                            anchorRefMessageOption.current[index] = anchorRefMessageOption.current[index] || React.createRef();
                                        
                                            return (
                                                <div key={index} className="ItemMessage" style={{'--hover-background-color': theme.palette.secondary.secondary, color: theme.palette.text.primary}}>
                                                  <NavLink to={'message/' + message.id_message} className="Item_Portfolio Item_Blog" style={{color: theme.palette.text.primary}}>
                                                      
                                                      <div className="Item_portfolio_element message_name_element">
                                                        <label className="custom-checkbox" onClick={e => e.stopPropagation()}>
                                                          <input type="checkbox"
                                                            checked={!!checkedMessages[message.id_message]}
                                                            onChange={handleCheckItem(message.id_message)}
                                                            onClick={e => e.stopPropagation()}
                                                          />
                                                          <span className="checkmark"></span>
                                                        </label>
                                                        <p>{message.mail_sender}</p>
                                                      </div>
                                                      <p className="Item_portfolio_element message_subject_element">{message.subject}</p>
                                                      <p className="Item_portfolio_element message_date_element">{formattedMessageDate}</p>
                                                      <p className="Item_portfolio_element message_option_element">
                                                        <IconButton
                                                          key='menu'
                                                          style={{ color: theme.palette.text.primary }}
                                                          onClick={(event) => { event.preventDefault(); handleOpenMessageMenu(event, index); }}
                                                          ref={anchorRefMessageOption.current[index]}
                                                          >
                                                          <MoreHorizIcon />
                                                        </IconButton>
                                                        <ClickAwayListener onClickAway={handleClickAway}>
                                                          <Popper open={openMenuMessage === index} anchorEl={anchorRefMessageOption.current[index]?.current} transition placement="bottom-end">
                                                              {({ TransitionProps }) => (
                                                                  <Grow {...TransitionProps} timeout={350}>
                                                                      <div className='dashboard_case_empty option_menu' style={{backgroundColor : theme.palette.primary.primary, borderColor : theme.palette.primary.third}}>
                                                                          <div className=''>
                                                                              <Link className="option_menu_message" onClick={e => {e.preventDefault(); window.location = 'mailto:' + message.mail_sender}} style={{color: theme.palette.text.primary}}><EmailIcon/>Répondre</Link>
                                                                          </div>
                                                                      </div>
                                                                  </Grow>
                                                              )}
                                                          </Popper>
                                                      </ClickAwayListener>
                                                  </p>
                                                  </NavLink>
                                                </div>
                                            );
                                        
                                        }): <p style={{textAlign:'center', color: theme.palette.text.secondary}}>Aucun message trouvé</p>}
                                </div>
                            }
                        </div> 
                    </div>
                    
                    
                </div>
            </div>       
        </div>

        
    )
}

export default ContactList