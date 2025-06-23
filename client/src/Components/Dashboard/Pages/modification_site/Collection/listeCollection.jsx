import React from "react"
import Axios from 'axios';
import { useState, useEffect } from "react";
import Cookies from 'js-cookie';
import {jwtDecode} from 'jwt-decode'; 
import { Outlet, NavLink, useNavigate, useParams } from 'react-router-dom';
import { DefaultButton, SecondaryButton} from '../../../../../Theme/element';
import { useTheme } from '@mui/material/styles';
import './listeCollection.css'
import '../Portfolio/portfolio.css';
import config from "../../../../../config";
import AddIcon from '@mui/icons-material/Add';
import { SkeletonBlog } from "../../../../skeleton/skeleton";
import { formatDate } from "../../../../../utils/dateUtils";
import { PiSmileyMeltingFill } from "react-icons/pi";
import { RiDatabase2Fill } from "react-icons/ri";
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import { SimpleSearchField } from '../../../../../Theme/element';



const ListeCollection = () => {

    const theme = useTheme();
    const token = Cookies.get('token')

    const [InfoListeblog, setInfoblog] = useState([]);
    const apiUrl = config.apiUrl;
    const { idCollection } = useParams();

    const [LoadingBlog, setLoadingBlog] = useState(true);

    // Ajoute cet état pour gérer les cases à cocher
    const [checkedItems, setCheckedItems] = useState({});
    const [allChecked, setAllChecked] = useState(false);

    // Ajout d'un état pour la recherche
    const [searchValue, setSearchValue] = useState("");

    useEffect(() => {    

            const user = Cookies.get('token');
            const decodedUser = jwtDecode(user);
    
            Axios.get(`${apiUrl}/getListeCollection`, {
                params: {
                    IdBlog: idCollection,
                    idUser: decodedUser.idUser,
                },
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
            }).then((response) => {
                setInfoblog(jwtDecode(response.data));
                setLoadingBlog(false);
            }).catch((error) => {
                console.error('Erreur lors de la récupération de la du Blog :', error);
            });
            
    }, [idCollection]);

    // Fonction pour cocher/décocher toutes les cases
    const handleCheckAll = (e) => {
      const checked = e.target.checked;
      setAllChecked(checked);
      // Suppose que tu as une liste d'items appelée 'items' (à adapter si besoin)
      const newChecked = {};
      InfoListeblog.blogList.forEach(item => {
        newChecked[item.id] = checked;
      });
      setCheckedItems(newChecked);
    };

    // Fonction pour cocher/décocher une case individuelle
    const handleCheckItem = (id) => (e) => {
      const checked = e.target.checked;
      setCheckedItems(prev => {
        const updated = { ...prev, [id]: checked };
        // Si on décoche une case, on décoche aussi le "tout cocher"
        if (!checked) setAllChecked(false);
        // Si toutes les cases sont cochées, on coche aussi le "tout cocher"
        else if (Object.values(updated).every(Boolean)) setAllChecked(true);
        return updated;
      });
    };

    // Filtrage des blogs selon la recherche
    const filteredBlogList = InfoListeblog && Array.isArray(InfoListeblog.blogList)
      ? InfoListeblog.blogList.filter(blogpage =>
          blogpage.collection_element_name && blogpage.collection_element_name.toLowerCase().includes(searchValue.toLowerCase())
        )
      : [];

    // Détermine si au moins une case est cochée
    const atLeastOneChecked = Object.values(checkedItems).some(Boolean);

    return(
        <div className="liste_blog_contain">
            <div className="modification_action_wrapper">
              <div className="button_save_contain">
                    <NavLink to={'createPage'} ><DefaultButton type="submit" variant="contained"><AddIcon/>Créer Page</DefaultButton></NavLink>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <SimpleSearchField
                  value={searchValue}
                  onChange={e => setSearchValue(e.target.value)}
                  placeholder="Rechercher par titre..."
                  theme={theme}
                />
                {atLeastOneChecked && (
                  <SecondaryButton
                    variant="contained"
                    color="error"
                    onClick={() => {/* Ajoute ici la logique de suppression */}}
                  >
                    Supprimer
                  </SecondaryButton>
                )}
              </div>
            </div>

            <div className="liste_blog_wrapper">

              <div className="Item_menu">  
                <div style={{color: theme.palette.text.secondary}} className="Item_portfolio_element blog_name_element">
                  <label className="custom-checkbox">
                    <input type="checkbox"
                      checked={allChecked}
                      onChange={handleCheckAll}
                      onClick={e => e.stopPropagation()}
                    />
                    <span className="checkmark"></span>
                  </label>
                  <span>Titre</span>
                </div>
                <p style={{color: theme.palette.text.secondary}} className="Item_portfolio_element blog_status">Status</p>
                <p style={{color: theme.palette.text.secondary}} className="Item_portfolio_element blog_date_element">Date de création</p>
                <p style={{color: theme.palette.text.secondary}} className="Item_portfolio_element blog_date_element">Date de modification</p>
                <p style={{color: theme.palette.text.secondary}} className="Item_portfolio_element blog_date_element">Date de Publication</p>
              </div>
              <div className="liste_blog_box">
                  {LoadingBlog ? (
                    <SkeletonBlog />
                    ) : filteredBlogList.length === 0 ? (
                      <div className="noImageContain">
                        <PiSmileyMeltingFill style={{ fontSize: 50, color: theme.palette.text.primary }} />
                        <p style={{ color: theme.palette.text.primary }}>Votre blog est vide.</p>
                      </div>
                    ) : (
                      filteredBlogList.map((blogpage, index) => {
                        const formattedCreateDate = formatDate(blogpage.collection_element_create_date);
                        const formattedUpdateDate = formatDate(blogpage.collection_element_update_date);
                        const formattedPublishDate = formatDate(blogpage.collection_element_publish_date);
                        return (
                          <NavLink
                            to={'editPage/' + blogpage.id}
                            key={index}
                            className="Item_Portfolio Item_Blog"
                            style={{ '--hover-background-color': theme.palette.secondary.secondary, color: theme.palette.text.primary }}
                          >
                            <p className="Item_portfolio_element blog_name_element">
                              <label className="custom-checkbox" onClick={e => e.stopPropagation()}>
                                <input type="checkbox"
                                  checked={!!checkedItems[blogpage.id]}
                                  onChange={handleCheckItem(blogpage.id)}
                                  onClick={e => e.stopPropagation()}
                                />
                                <span className="checkmark"></span>
                              </label>
                              <span>{blogpage.collection_element_name}</span>
                            </p>
                            <div className="Item_portfolio_element blog_status">
                              {blogpage.collection_element_status === true ? (
                                <p className="blog_status publish_status">Publié</p>
                              ) : (
                                <p className="blog_status draft_status">Brouillon</p>
                              )}
                            </div>
                            <p className="Item_portfolio_element blog_date_element">{formattedCreateDate}</p>
                            <p className="Item_portfolio_element blog_date_element">{formattedUpdateDate}</p>
                            <p className="Item_portfolio_element blog_date_element">{formattedPublishDate}</p>
                          </NavLink>
                        );
                      })
                    )}
              </div>
            </div>
        </div>
    )
}

export default ListeCollection