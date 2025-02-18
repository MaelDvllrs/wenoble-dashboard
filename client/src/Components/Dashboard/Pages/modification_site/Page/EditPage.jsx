import React, { useState, useEffect } from "react";
import Axios from 'axios';
import { useParams, useNavigate } from "react-router-dom";
import config from "../../../../../config";
import { jwtDecode } from 'jwt-decode'; 
import Field from "../Fields/fields";
import '../Blog/createPageBlog.css';
import './EditPage.css';
import { DefaultButton, SecondaryButton, Popup } from '../../../../../Theme/element';
import { updateImagePage, updateTextPage, updateRichTextPage } from './apiPage';
import { useTheme } from '@mui/material/styles';
import { convertToRaw } from 'draft-js';
import CircularProgress from '@mui/material/CircularProgress';
import { SnackbarProvider,enqueueSnackbar } from 'notistack';
import Cookies from 'js-cookie';



const EditPage = () => {
    const theme = useTheme();
    const token = Cookies.get('token');

    const [savingPage, setSavingPage] = useState(false);

    const [InfoConfigPage, setConfigPage] = useState([]);
    const [DecodeConfigPage, setDecodeConfigPage] = useState([]);
    const [InfoPage, setInfoPage] = useState([]);
    const [DecodePage, setDecodePage] = useState([]);
    const [InfoItemspage, setInfoItemspage] = useState([]);
    const [deletedItems, setDeletedItems] = useState([]);
    const navigate = useNavigate();
    const [pageDataConfig, setPageDataConfig] = useState({
        text: [],
        images: [],
        richText: []
    });
    const [pageData, setPageData] = useState({
        text: [],
        images: [],
        richText: []
    });
    const apiUrl = config.apiUrl;
    const { idPage } = useParams();

    useEffect(() => {    
        Axios.get(`${apiUrl}/getConfigPage`, {
            params: {
                IdPage: idPage,
            },
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
        }).then((response) => {
            setConfigPage(response.data);
        }).catch((error) => {
            console.error('Erreur lors de la récupération de la configuration de la page :', error);
        });
    }, [idPage]); 


    useEffect(() => {
        if(InfoConfigPage !== null && typeof InfoConfigPage === 'string'){
            setSavingPage(true);
            const decodedConfig = jwtDecode(InfoConfigPage);
            setDecodeConfigPage(decodedConfig);
            if (decodedConfig.page.length === 0) {
                setSavingPage(false);
            }
        }
    }, [InfoConfigPage]);


    useEffect(() => {
        DecodeConfigPage.page && DecodeConfigPage.page.map((pageItem) => {
            if (pageItem.type === 'image') {
                setPageDataConfig(prevData => ({
                    ...prevData,
                    images: [...prevData.images, {id_config: pageItem.id_config}]
                }));
            } else if (pageItem.type === 'text') {
                setPageDataConfig(prevData => ({
                    ...prevData,
                    text: [...prevData.text, {id_config: pageItem.id_config}]
                }));
            } else if (pageItem.type === 'richText') {
                setPageDataConfig(prevData => ({
                    ...prevData,
                    richText: [...prevData.richText, {id_config: pageItem.id_config}]
                }));
            }
        });
    }, [DecodeConfigPage]);



    useEffect(() => {
        let allData = []; 
        const fetchData = async () => {

            for (const images of pageDataConfig.images) {
                try{
                    const response = await Axios.get(`${apiUrl}/getImagePage`, {
                        params: {
                            IdPage: idPage,
                            IdConfig: images.id_config
                        },
                        headers: {
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json'
                        }
                    });

                    if (response.data.length > 0) {
                        allData.push(response.data[0]); 
                    }
                } catch (error) {
                    console.error('Erreur lors de la récupération de l\'image :', error);
                }
            }

            for (const text of pageDataConfig.text) {
                try{
                    const response = await Axios.get(`${apiUrl}/getPageTexte`, {
                        params: {
                            IdPage: idPage,
                            IdConfig: text.id_config
                        },
                        headers: {
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json'
                        }
                    });
                    if (response.data.length > 0) {
                        allData.push(response.data[0]); 
                    }
                } catch (error) {
                    console.error('Erreur lors de la récupération du text :', error);
                }
            }

            for (const richText of pageDataConfig.richText) {
                try{
                    const response = await Axios.get(`${apiUrl}/getPageRichText`, {
                        params: {
                            IdPage: idPage,
                            IdConfig: richText.id_config
                        },
                        headers: {
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json'
                        }
                    });
                    if (response.data.length > 0) {
                        allData.push(response.data[0]); 
                    }
                } catch (error) {
                    console.error('Erreur lors de la récupération du rich text :', error);
                }
            }
            setInfoItemspage({ data: allData });
            setSavingPage(false);
        };
        
        fetchData(); 
        
    }, [pageDataConfig, idPage]);



    useEffect(() => {
        Axios.get(`${apiUrl}/getPageDetail`, {
            params: {
                IdPage: idPage,
            },
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
        }).then((response) => {
            setInfoPage(response.data);
        }).catch((error) => {
            console.error('Erreur lors de la récupération de la page :', error);
        });
    }, [idPage]);

    useEffect(() => {
        if(InfoPage !== null && typeof InfoPage === 'string'){
            const decodedPageInfo = jwtDecode(InfoPage);
            setDecodePage(decodedPageInfo);
        }
    }, [InfoPage]);



    const handlePageDataChange = (data, isDelete = false) => {
        setPageData(prevData => {
            const newData = { ...prevData };
            const type = data.data.type;

            if (isDelete) {
                const exists = deletedItems.some(item => item.id_config === data.data.id_config);
                if (!exists) {
                    setDeletedItems(prevItems => [...prevItems, data.data]);
                }
                newData[type] = newData[type].filter(item => item.id_config !== data.data.id_config);
            } else {
                let itemModified = false;
                for (let i = 0; i < newData[type].length; i++) {
                    if (newData[type][i].id_config === data.data.id_config) {
                        newData[type][i] = data.data;
                        itemModified = true;
                        break;
                    }
                }
                if (!itemModified) {
                    newData[type].push(data.data);
                }
            }
            return newData;
        });
    };





    const handleSave = async () => {
        setSavingPage(true);

        try {        
            if (pageData.text.length > 0) {
                try {
                    const response = await updateTextPage(idPage, pageData.text, token);
                    console.log(response);
                } catch (error) {
                    console.error('Erreur lors de la création des textes :', error);
                    return;
                }
            }

            if (pageData.richText.length > 0) {
                const infoRichText = [];
                pageData.richText.forEach(richText => {
                    const contentRichText = richText.value;
                    const richTextJS = convertToRaw(contentRichText);
                    const richTextJSON = JSON.stringify(richTextJS);
                    infoRichText.push({richText : richTextJSON, id_config: richText.id_config});
                });

                try {
                    const response = await updateRichTextPage(idPage, infoRichText, token);
                } catch (error) {
                    console.error('Erreur lors de la création des rich texts :', error);
                    return;
                }
            }

            if(pageData.images.length > 0){
                try {
                    await Promise.all(pageData.images.map(async (image) => {
                        await updateImagePage(image, idPage, token);
                    }));
                } catch (error) {
                    console.error(error);
                    return;
                }
            }

            if (deletedItems.length > 0) {
                console.log(deletedItems); 
                try {
                    await Axios.delete(`${apiUrl}/deletePageData`, {
                        data: {
                            data: deletedItems,
                            id_page : idPage
                        },
                        headers: {
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json'
                        }
                    });
                } catch (error) {
                    console.error('Erreur lors de la suppression des éléments :', error);
                    return;
                }
            }

        } catch (error) {
            console.error('Erreur lors de la création de la page :', error);
            return;
        }
        setSavingPage(false);
        enqueueSnackbar('Page modifiée avec succès.', { variant: 'success' });
    };



    return (
        <SnackbarProvider maxSnack={3} autoHideDuration={2000}>
            <div className="Page_creation_Page">
                {DecodePage.page ? (
                    <div className="Page_creation_Page">
                        <div className="header_modification">
                            <h3 className="titlePage">Modification de : {DecodePage.page[0].page_name}</h3>
                            <div className="button_save_contain">
                                <SecondaryButton variant="contained" theme={theme} onClick={() => navigate(`/dashboard/modification/page/${id}`)}>Annuler</SecondaryButton>

                                <DefaultButton type="submit" variant="contained" onClick={async () => { await handleSave(1,0) }}>Enregistrer</DefaultButton>  
                            </div>
                        </div>

                        <div className="Page_creation_field_contain">
                            {DecodeConfigPage.page && DecodeConfigPage.page.map((pageItem) => {
                                const correspondingData = InfoItemspage.data.find(data => data.id_config === pageItem.id_config);
                                return (
                                    <div key={pageItem.id_config} className="pageField_contain">
                                        <p style={{color: theme.palette.text.secondary}}>{pageItem.name}</p>
                                        <Field 
                                            id_page={idPage}
                                            type={pageItem.type} 
                                            id_config={pageItem.id_config} 
                                            onChange={handlePageDataChange} 
                                            dataValue={correspondingData || {}}
                                            imagefunction={false}
                                            imageDirectory={"/media/page/"}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                        {savingPage && (   
                            <Popup theme={theme}>
                                <CircularProgress sx={{color:"rgb(5, 65, 183)"}}/>
                            </Popup>
                        )}
                    </div>

                ) : null}
            </div>
        </SnackbarProvider>
    );
};

export default EditPage;