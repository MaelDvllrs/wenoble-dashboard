import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Select from 'react-select';
import { useTheme } from '@mui/material/styles';
import { 
    TextField, 
    Button, 
    MenuItem, 
    FormControl, 
    InputLabel, 
    Switch,
    FormControlLabel,
    Snackbar,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Typography,
    Box,
    Card,
    CardContent,
    Divider
} from '@mui/material';
import { 
    Add as AddIcon, 
    Delete as DeleteIcon, 
    Save as SaveIcon,
    ArrowBack as ArrowBackIcon,
    TextFields as TextFieldsIcon,
    Notes as NotesIcon,
    Image as ImageIcon,
    Collections as CollectionsIcon,
    Videocam as VideocamIcon,
    AccountTree as AccountTreeIcon,
    Edit as EditIcon,
    VisibilityOutlined as VisibilityOutlinedIcon,
    Cable as CableIcon
} from '@mui/icons-material';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';
import config from '../../../../../config';
import Axios from '../../../../../service/AxiosConfig';
import { useSnackbar } from '../../../../../Theme/snackbar';
import { useWebsite } from '../../../../../Context/WebsiteContext';
import './collection.css';
import '../Fields/Field.css';
import { SecondaryButton, DefaultButton, IconButton, MultiReferenceSelect, DefaultSwitch, CopyButton, CopyField, PopupSide, SelectField, SmallIconButton } from '../../../../../Theme/element';
import { PiEye, PiTextT, PiPencilSimple, PiTrash, PiArticleNyTimes, PiTreeStructure, PiPlugs, PiToggleRight } from 'react-icons/pi';

const EditCollection = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const params = useParams('idCollection');
    const collectionId = params.idCollection;
    const token = Cookies.get('token');
    const idUser = jwtDecode(token).idUser;
    const apiUrl = config.apiUrl;
    const { showSnackbar } = useSnackbar();
    const { selectedWebsite, loading: websiteLoading } = useWebsite();

    // Vérification des permissions admin
    const isAdmin = selectedWebsite?.user_role === 'admin';

    // États principaux
    const [collectionName, setCollectionName] = useState('');
    const [collectionSlug, setCollectionSlug] = useState('');
    const [configFields, setConfigFields] = useState([]);
    
    // États UI
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(true);
    const [openPreview, setOpenPreview] = useState(false);
    const [openIntegration, setOpenIntegration] = useState(false);
    const [websiteApiKey, setWebsiteApiKey] = useState('');
    // Options for wrapper key generation
    const [wrapLimit, setWrapLimit] = useState(10);
    const [wrapLimitEnabled, setWrapLimitEnabled] = useState(false);
    const [wrapOffset, setWrapOffset] = useState(0);
    const [wrapPaginationEnabled, setWrapPaginationEnabled] = useState(false);
    const [wrapItemsPerPage, setWrapItemsPerPage] = useState(10);
    
    // États pour les filtres dynamiques
    const [wrapFilters, setWrapFilters] = useState([]);
    const [wrapSorts, setWrapSorts] = useState([]);
    const [isTemplateMode, setIsTemplateMode] = useState(false);
    const [selectedTemplateCollection, setSelectedTemplateCollection] = useState('');

    // Réinitialiser les champs de valeur des filtres quand la collection template change
    useEffect(() => {
        if (isTemplateMode && wrapFilters.length > 0) {
            setWrapFilters(prev => prev.map(filter => ({
                ...filter,
                value: '' // Réinitialiser la valeur quand la collection template change
            })));
        }
    }, [selectedTemplateCollection, isTemplateMode]);
    // Template SEO attribute selections
    const [templateTitleTag, setTemplateTitleTag] = useState('');
    const [templateMetaTag, setTemplateMetaTag] = useState('');
    const [templateMetaImageTag, setTemplateMetaImageTag] = useState('');
    
    // Options for template loader selects
    const textFieldOptions = useMemo(() => (
        (configFields || [])
            .filter(f => f?.tab_field === 'text')
            .map(f => ({ value: f.id, label: f.name_field }))
    ), [configFields]);
    const imageFieldOptions = useMemo(() => (
        (configFields || [])
            .filter(f => f?.tab_field === 'image')
            .map(f => ({ value: f.id, label: f.name_field }))
    ), [configFields]);

    const templateScript = useMemo(() => {
        const attrs = [
            'src="https://api-wenoble.wenoble.fr/collection-template-loader.js"',
            `data-user-id="${websiteApiKey || 'VOTRE_API_KEY'}"`,
            `data-blog-id="${collectionId}"`
        ];
        if (templateTitleTag) attrs.push(`title-tag="${templateTitleTag}"`);
        if (templateMetaTag) attrs.push(`meta-tag="${templateMetaTag}"`);
        if (templateMetaImageTag) attrs.push(`meta-tag-image="${templateMetaImageTag}"`);
        return `<script ${attrs.join(' ')}></script>`;
    }, [websiteApiKey, collectionId, templateTitleTag, templateMetaTag, templateMetaImageTag]);
    const encodedWrapperKey = useMemo(() => {
        try {
            const payload = {
                blogId: collectionId
            };
            // Inclure la limite uniquement si activée
            if (wrapLimitEnabled) {
                payload.limit = Math.max(0, Number(wrapLimit) || 0);
                payload.offset = Math.max(0, Number(wrapOffset) || 0);
            }
            // Inclure la pagination uniquement si activée
            if (wrapPaginationEnabled) {
                payload.pagination = true;
                const perPage = Math.max(1, Number(wrapItemsPerPage) || 10);
                payload.itemsPerPage = perPage;
            }
            // Inclure les filtres s'il y en a
            if (wrapFilters.length > 0) {
                payload.filters = wrapFilters;
            }
            // Inclure les tris s'il y en a - convertir du format array vers format objet attendu par l'API
            if (wrapSorts.length > 0) {
                const sortsObject = {};
                wrapSorts.forEach(sort => {
                    if (sort.field && sort.direction) {
                        sortsObject[sort.field] = { order: sort.direction };
                    }
                });
                if (Object.keys(sortsObject).length > 0) {
                    payload.sorts = sortsObject;
                }
            }
            // Inclure la collection template si en mode template
            if (isTemplateMode && selectedTemplateCollection) {
                payload.templateCollectionId = selectedTemplateCollection;
            }
            return btoa(JSON.stringify(payload));
        } catch {
            return '';
        }
    }, [collectionId, wrapLimit, wrapLimitEnabled, wrapOffset, wrapPaginationEnabled, wrapItemsPerPage, wrapFilters, wrapSorts, isTemplateMode, selectedTemplateCollection]);
    const [availableCollections, setAvailableCollections] = useState([]);
    const [showFieldTypeGrid, setShowFieldTypeGrid] = useState(false);
    const [selectedFieldType, setSelectedFieldType] = useState('');
    const [editingFieldIndex, setEditingFieldIndex] = useState(null);
    const [newFieldData, setNewFieldData] = useState({
        name_field: '',
        description_field: '',
        collection_id_ref: null,
        multiline_text: false
    });

    // Types de champs disponibles
    const fieldTypes = [
        { value: 'text', label: 'Texte' },
        { value: 'richText', label: 'Texte riche' },
        { value: 'image', label: 'Image' },
        { value: 'gallery', label: 'Galerie' },
        { value: 'video', label: 'Vidéo' },
        { value: 'multiReference', label: 'Multi-référence' },
        { value: 'switch', label: 'Switch' }
    ];

    // Générer automatiquement le slug à partir du nom
    const generateSlug = (name) => {
        return name
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    };

    const handleCollectionNameChange = (e) => {
        const name = e.target.value;
        setCollectionName(name);
        // Ne pas changer automatiquement le slug en mode édition
        // L'utilisateur peut le modifier manuellement si nécessaire
    };




    // Charger les données de la collection
    const loadCollectionData = async () => {
        if (!selectedWebsite?.id) return;
        setLoadingData(true);
        try {
            const response = await Axios.get(`${apiUrl}/getCollectionById`, {
                params: { collectionId, websiteId: selectedWebsite.id },
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data && response.data.data) {
                const collectionData = response.data.data;
                setCollectionName(collectionData.collection_name);
                setCollectionSlug(collectionData.collection_slug);
                
                // Charger la configuration des champs
                const configResponse = await Axios.get(`${apiUrl}/getConfigCollection`, {
                    params: { collectionId, websiteId: selectedWebsite.id },
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (configResponse.data && configResponse.data.data) {
                    setConfigFields(configResponse.data.data);
                }
            }
        } catch (error) {
            console.error('Erreur lors du chargement de la collection:', error);
            showSnackbar('error', 'Erreur lors du chargement de la collection');
            navigate('/dashboard/website/modification/collection');
        } finally {
            setLoadingData(false);
        }
    };



    // Charger les collections disponibles pour les multi-références
    const loadAvailableCollections = async () => {
        if (!selectedWebsite?.id) return;
        try {
            const response = await Axios.get(`${apiUrl}/getCollection`, {
                params: { websiteId: selectedWebsite.id },
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.data) {
                const decoded = jwtDecode(response.data);
                // Exclure la collection actuelle de la liste
                const collections = (decoded.blog || []).filter(col => col.id !== parseInt(collectionId));
                
                // Charger les champs de configuration pour chaque collection
                const collectionsWithFields = await Promise.all(collections.map(async (collection) => {
                    try {
                        const configResponse = await Axios.get(`${apiUrl}/getConfigCollection`, {
                            params: { collectionId: collection.id },
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            }
                        });
                        
                        
                        if (configResponse.data && configResponse.data.data) {
                            return {
                                ...collection,
                                config_fields: configResponse.data.data || []
                            };
                        }
                    } catch (error) {
                        console.error(`Erreur lors du chargement des champs pour la collection ${collection.id}:`, error);
                        if (error.response) {
                            console.error('Détails de l\'erreur:', error.response.data);
                        }
                        return {
                            ...collection,
                            config_fields: []
                        };
                    }
                    return collection;
                }));
                
                setAvailableCollections(collectionsWithFields);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des collections:', error);
        }
    };

    // Charger les données au montage du composant
    useEffect(() => {
        if (collectionId && selectedWebsite?.id) {
            loadCollectionData();
            loadAvailableCollections();
        }
    }, [collectionId, selectedWebsite?.id]);

    // Ajouter un nouveau champ de configuration
    const addConfigField = () => {
        setShowFieldTypeGrid(true);
        setSelectedFieldType('');
        setEditingFieldIndex(null);
        setNewFieldData({
            name_field: '',
            description_field: '',
            collection_id_ref: null,
            multiline_text: false
        });
    };

    // Éditer un champ existant
    const editConfigField = (index) => {
        const field = configFields[index];
        setEditingFieldIndex(index);
        setShowFieldTypeGrid(false); // Pas besoin d'afficher la grille
        setSelectedFieldType(field.tab_field);
        setNewFieldData({
            name_field: field.name_field,
            description_field: field.description_field,
            collection_id_ref: field.collection_id_ref,
            multiline_text: field.multiline_text
        });
        
        if (field.tab_field === 'multiReference') {
            loadAvailableCollections();
        }
    };

    // Sélectionner un type de champ
    const selectFieldType = (type) => {
        setSelectedFieldType(type);
        if (type === 'multiReference') {
            loadAvailableCollections();
        }
    };

    // Sauvegarder le nouveau champ
    const saveNewField = () => {
        if (!newFieldData.name_field.trim()) {
            showSnackbar('error', 'Le nom du champ est obligatoire');
            return;
        }

        if (editingFieldIndex !== null) {
            // Modifier un champ existant
            const newFields = [...configFields];
            newFields[editingFieldIndex] = {
                ...newFields[editingFieldIndex],
                tab_field: selectedFieldType,
                ...newFieldData
            };
            setConfigFields(newFields);
            showSnackbar('success', 'Champ modifié avec succès !');
        } else {
            // Ajouter un nouveau champ
            const newField = {
                id: `field_${Date.now()}`,
                tab_field: selectedFieldType,
                ...newFieldData
            };
            setConfigFields([...configFields, newField]);
            showSnackbar('success', 'Champ ajouté avec succès !');
        }

        setShowFieldTypeGrid(false);
        setSelectedFieldType('');
        setEditingFieldIndex(null);
        setNewFieldData({
            name_field: '',
            description_field: '',
            collection_id_ref: null,
            multiline_text: false
        });
    };

    // Annuler la création d'un champ
    const cancelFieldCreation = () => {
        setShowFieldTypeGrid(false);
        setSelectedFieldType('');
        setEditingFieldIndex(null);
        setNewFieldData({
            name_field: '',
            description_field: '',
            collection_id_ref: null,
            multiline_text: false
        });
    };

    // Supprimer un champ de configuration
    const removeConfigField = async (index) => {
        const fieldToRemove = configFields[index];
        
        try {
            // Vérifier si des éléments de collection utilisent ce champ
            const checkResponse = await Axios.get(`${apiUrl}/checkFieldUsage`, {
                params: { 
                    collectionId: collectionId,
                    fieldId: fieldToRemove.id
                },
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (checkResponse.data && checkResponse.data.hasUsage) {
                const elementCount = checkResponse.data.elementCount || 0;
                
                showSnackbar('error', 
                    `Impossible de supprimer ce champ : ${elementCount} élément(s) l'utilise(nt) encore.`
                );
                return;
            }

            // Si aucun élément n'utilise ce champ, supprimer directement
            const newFields = configFields.filter((_, i) => i !== index);
            setConfigFields(newFields);
            showSnackbar('success', `Champ "${fieldToRemove.name_field}" supprimé avec succès`);
            
        } catch (error) {
            console.error('Erreur lors de la vérification du champ:', error);
            showSnackbar('error', 'Erreur lors de la vérification du champ. Impossible de le supprimer.');
        }
    };

    // Fonctions pour gérer les filtres dynamiques
    const addFilter = () => {
        const newFilter = {
            id: Date.now(),
            // Pour mode normal: field = champ de collection actuelle, value = texte libre
            // Pour mode template: field = champ de collection actuelle, value = champ de la collection template sélectionnée
            field: '', // Champ de la collection actuelle
            operator: 'equals',
            value: '', // Texte libre (normal) ou champ de la collection template (template)
            pageType: isTemplateMode ? 'template' : 'normal',
        };
        setWrapFilters([...wrapFilters, newFilter]);
    };

    const updateFilter = (filterId, updates) => {
        setWrapFilters(prev => prev.map(filter => {
            if (filter.id === filterId) {
                return { ...filter, ...updates };
            }
            return filter;
        }));
    };

    const removeFilter = (filterId) => {
        setWrapFilters(prev => prev.filter(filter => filter.id !== filterId));
    };

    const addSort = () => {
        const newSort = {
            id: Date.now(),
            field: '', // Champ de la collection actuelle
            direction: 'asc',
            pageType: isTemplateMode ? 'template' : 'normal',
        };
        setWrapSorts([...wrapSorts, newSort]);
    };

    const updateSort = (sortId, updates) => {
        setWrapSorts(prev => prev.map(sort => {
            if (sort.id === sortId) {
                return { ...sort, ...updates };
            }
            return sort;
        }));
    };

    const removeSort = (sortId) => {
        setWrapSorts(prev => prev.filter(sort => sort.id !== sortId));
    };

    // Options disponibles selon le type de page
    const getFilterFieldOptions = () => {
        // Pour mode normal : champs de la collection actuelle (text, multiReference, switch)
        return [
            { value: 'collection_element_name', label: 'Titre', type: 'text' },
            { value: 'collection_element_slug', label: 'Slug', type: 'text' },
            { value: 'created_at', label: 'Date de création', type: 'text' },
            { value: 'collection_element_publish_date', label: 'Date de publication', type: 'text' },
            ...configFields.filter(field => 
                ['text', 'multiReference', 'switch'].includes(field.tab_field)
            ).map(field => ({
                value: field.id,
                label: `${field.name_field} (${field.tab_field})`,
                type: field.tab_field
            }))
        ];
    };

    const getSelectedCollectionFields = (selectedCollectionId) => {
        if (!selectedCollectionId) return [];
        
        // Trouver la collection sélectionnée en comparant avec les deux types
        const selectedCollection = availableCollections.find(col => 
            col.id == selectedCollectionId || 
            col.id === parseInt(selectedCollectionId) ||
            String(col.id) === String(selectedCollectionId)
        );
        
        if (!selectedCollection) {
            return [];
        }
        
        if (!selectedCollection.config_fields) {
            // Retourner au minimum les champs de base
            return [
                { value: 'collection_element_name', label: 'Titre' },
                { value: 'collection_element_slug', label: 'Slug' },
                { value: 'created_at', label: 'Date de création' },
                { value: 'collection_element_publish_date', label: 'Date de publication' }
            ];
        }

        // Retourner les champs de cette collection (seulement text et multiReference)
        const fields = [
            { value: 'collection_element_name', label: 'Titre' },
            { value: 'collection_element_slug', label: 'Slug' },
            { value: 'created_at', label: 'Date de création' },
            { value: 'collection_element_publish_date', label: 'Date de publication' },
            ...selectedCollection.config_fields.filter(field => 
                ['text', 'multiReference'].includes(field.tab_field)
            ).map(field => ({
                value: field.id,
                label: `${field.name_field} (${field.tab_field})`
            }))
        ];
        
        return fields;
    };

    // Fonction pour obtenir les champs de la collection template sélectionnée globalement
    const getTemplateCollectionFields = () => {
        return getSelectedCollectionFields(selectedTemplateCollection);
    };

    // Memo des champs de la collection template pour forcer la mise à jour
    const templateCollectionFields = useMemo(() => {
        return getTemplateCollectionFields();
    }, [selectedTemplateCollection, availableCollections]);

    // Valider les données avant sauvegarde
    const validateData = () => {
        if (!collectionName.trim()) {
            showSnackbar('error', 'Le nom de la collection est obligatoire');
            return false;
        }
        
        if (!collectionSlug.trim()) {
            showSnackbar('error', 'Le slug de la collection est obligatoire');
            return false;
        }

        // Vérifier que tous les champs ont un nom
        for (let i = 0; i < configFields.length; i++) {
            if (!configFields[i].name_field.trim()) {
                showSnackbar('error', `Le nom du champ ${i + 1} est obligatoire`);
                return false;
            }
        }

        return true;
    };

    // Sauvegarder les modifications
    const saveCollection = async () => {
        if (!validateData()) return;

        setLoading(true);
        try {
            // 1. Mettre à jour la collection principale
            await Axios.post(`${apiUrl}/updateCollection`, {
                collectionId: collectionId,
                collection_name: collectionName,
                collection_slug: collectionSlug
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            // 2. Mettre à jour la configuration des champs
            await Axios.post(`${apiUrl}/updateCollectionConfig`, {
                collectionId: collectionId,
                config_fields: configFields
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            showSnackbar('success', 'Collection mise à jour avec succès !');
            
            // Naviguer avec refresh des collections si le nom a changé
            navigate(`/dashboard/website/modification/collection/${collectionId}`, { 
                replace: true,
                state: { refreshCollections: true }
            });
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la collection:', error);
            showSnackbar('error', 'Erreur lors de la mise à jour de la collection');
        } finally {
            setLoading(false);
        }
    };

    if (loadingData || websiteLoading) {
        return (
            <div className="Blog_creation_Page">
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                    <CircularProgress />
                </div>
            </div>
        );
    }

    if (!selectedWebsite) {
        return (
            <div className="Blog_creation_Page">
                <div style={{ 
                    textAlign: 'center', 
                    padding: '2rem',
                    color: theme.palette.text.primary 
                }}>
                    <h3>Aucun site web sélectionné</h3>
                    <p>Veuillez sélectionner un site web depuis le menu principal pour modifier une collection.</p>
                    <SecondaryButton 
                        onClick={() => navigate('/dashboard/website/modification/collection')}
                        style={{ marginTop: '1rem' }}
                    >
                        Retour aux collections
                    </SecondaryButton>
                </div>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="Blog_creation_Page">
                <div style={{ 
                    textAlign: 'center', 
                    padding: '2rem',
                    color: theme.palette.text.primary 
                }}>
                    <h3>Accès refusé</h3>
                    <p>Seuls les administrateurs peuvent modifier des collections.</p>
                    <p style={{ color: theme.palette.text.secondary, fontSize: '0.9rem' }}>
                        Votre rôle actuel : <strong>{selectedWebsite.user_role}</strong>
                    </p>
                    <SecondaryButton 
                        onClick={() => navigate('/dashboard/website/modification/collection')}
                        style={{ marginTop: '1rem' }}
                    >
                        Retour aux collections
                    </SecondaryButton>
                </div>
            </div>
        );
    }
    return (
        <div className="Blog_creation_Page">
            <div className="header_modification header_page_modification">
                <h3 className="titlePage">Option de la collection</h3>
                <div className="actions-section">

                    <SmallIconButton
                        onClick={() => setOpenPreview(true)}
                        title="Aperçu"
                    >
                        <PiEye fontSize="1.3rem"/>
                    </SmallIconButton>

                    <SmallIconButton
                        onClick={async () => {
                        try {
                            if (selectedWebsite?.id) {
                                const resp = await Axios.get(`${apiUrl}/getWebsiteById`, {
                                    params: { websiteId: selectedWebsite.id },
                                    headers: { 'Authorization': `Bearer ${token}` }
                                });
                                setWebsiteApiKey(resp?.data?.data?.api_key || '');
                            }
                        } catch (e) {
                            console.error('Erreur récupération api_key website:', e);
                        } finally {
                            setOpenIntegration(true);
                        }
                    }}
                        title="Intégration"
                    >
                        <PiPlugs fontSize='1.3rem'/>
                    </SmallIconButton>


                    <SecondaryButton
                        variant="outlined"
                        onClick={() => navigate(`/dashboard/website/modification/collection/${collectionId}`)}
                        disabled={loading}
                    >
                        Annuler
                    </SecondaryButton>
                    <DefaultButton
                        variant="contained"
                        startIcon={loading ? <CircularProgress size={12} sx={{ color: 'white' }} /> : undefined}
                        onClick={saveCollection}
                        disabled={loading}
                        sx={{ backgroundColor: theme.palette.primary.main }}
                    >
                        Enregistrer
                    </DefaultButton>
                </div>
            </div>

            {/* Integration Side Panel */}
            <PopupSide 
                open={openIntegration}
                onClose={() => setOpenIntegration(false)}
                title="Intégration de la collection"
                width={'50%'}
                maxWidth={300}
            >
                <div className='integration-wrapper'>
                    <div className='header_modification header_page_modification'>
                        <h4 className="section-title">Liste de collection</h4>
                    </div>
                    <div className='input-container'>
                        <label className="blogField_name collection_edit_name">
                            Limite
                            <DefaultSwitch
                                checked={wrapLimitEnabled}
                                onChange={(e) => setWrapLimitEnabled(e.target.checked)}
                            />
                        </label>



                        {wrapLimitEnabled && (
                            <>
                                <div className="number-input-vertical">
                                    <input
                                        className="input_text_blog input-count"
                                        type="number"
                                        min={0}
                                        step={1}
                                        value={wrapLimit}
                                        onChange={(e) => setWrapLimit(e.target.value)}
                                        onWheel={(e) => e.currentTarget.blur()}
                                    />
                                    <div className="spin-buttons">
                                        <button
                                            type="button"
                                            className="spin-btn spin-up"
                                            aria-label="Augmenter"
                                            onClick={() => setWrapLimit(v => Math.max(0, (Number(v) || 0) + 1))}
                                        >
                                            ▲
                                        </button>
                                        <button
                                            type="button"
                                            className="spin-btn spin-down"
                                            aria-label="Diminuer"
                                            onClick={() => setWrapLimit(v => Math.max(0, (Number(v) || 0) - 1))}
                                        >
                                            ▼
                                        </button>
                                    </div>
                                </div>
                                <p className="blogField_name collection_edit_name" style={{ marginTop: '1rem' }}>Item de départ</p>
                                <div className="number-input-vertical">
                                    <input
                                        className="input_text_blog input-count"
                                        type="number"
                                        min={0}
                                        step={1}
                                        value={wrapOffset}
                                        onChange={(e) => setWrapOffset(e.target.value)}
                                        onWheel={(e) => e.currentTarget.blur()}
                                    />
                                    <div className="spin-buttons">
                                        <button
                                            type="button"
                                            className="spin-btn spin-up"
                                            aria-label="Augmenter"
                                            onClick={() => setWrapOffset(v => Math.max(0, (Number(v) || 0) + 1))}
                                        >
                                            ▲
                                        </button>
                                        <button
                                            type="button"
                                            className="spin-btn spin-down"
                                            aria-label="Diminuer"
                                            onClick={() => setWrapOffset(v => Math.max(0, (Number(v) || 0) - 1))}
                                        >
                                            ▼
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                    <div className='input-container'>
                        <label className="blogField_name collection_edit_name">
                            Pagination
                            <DefaultSwitch
                                checked={wrapPaginationEnabled}
                                onChange={(e) => setWrapPaginationEnabled(e.target.checked)}
                            />
                        </label>
                        {wrapPaginationEnabled && (
                            <div className="number-input-vertical">
                                <input
                                    className="input_text_blog input-count"
                                    type="number"
                                    min={1}
                                    step={1}
                                    value={wrapItemsPerPage}
                                    onChange={(e) => setWrapItemsPerPage(e.target.value)}
                                    onWheel={(e) => e.currentTarget.blur()}
                                />
                                <div className="spin-buttons">
                                    <button
                                        type="button"
                                        className="spin-btn spin-up"
                                        aria-label="Augmenter"
                                        onClick={() => setWrapItemsPerPage(v => Math.max(1, (Number(v) || 1) + 1))}
                                    >
                                        ▲
                                    </button>
                                    <button
                                        type="button"
                                        className="spin-btn spin-down"
                                        aria-label="Diminuer"
                                        onClick={() => setWrapItemsPerPage(v => Math.max(1, (Number(v) || 1) - 1))}
                                    >
                                        ▼
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className='line_horizontal' style={{backgroundColor: theme.palette.primary.third}}/>
                    
                    {/* Section Filtres et Tris Dynamiques */}
                    <div className='header_modification header_page_modification' style={{marginTop: '1rem'}}>
                        <h4 className="section-title">Filtres et Tris Dynamiques</h4>
                    </div>
                    
                    <div className='input-container'>
                        <label className="blogField_name collection_edit_name">
                            Mode Template (Pages dynamiques)
                            <DefaultSwitch
                                checked={isTemplateMode}
                                onChange={(e) => setIsTemplateMode(e.target.checked)}
                            />
                        </label>
                        <p style={{fontSize: '0.8rem', color: theme.palette.text.secondary, marginTop: '0.5rem'}}>
                            {isTemplateMode 
                                ? "Mode Template : Filtres entre collections pour les pages dynamiques" 
                                : "Mode Normal : Filtres dans la collection actuelle avec valeur libre"
                            }
                        </p>
                    </div>

                    {/* Sélecteur de collection template global */}
                    {isTemplateMode && (
                        <div className='input-container'>
                            <p className="blogField_name collection_edit_name">Collection Template</p>
                            <SelectField
                                className="input_text_blog"
                                value={selectedTemplateCollection}
                                onChange={(e) => setSelectedTemplateCollection(e.target.value)}
                                displayEmpty
                            >
                                <MenuItem value="">Sélectionner une collection template...</MenuItem>
                                {availableCollections.length === 0 ? (
                                    <MenuItem value="" disabled>Aucune collection disponible</MenuItem>
                                ) : (
                                    availableCollections.map(collection => (
                                        <MenuItem key={collection.id} value={collection.id}>
                                            {collection.collection_name || collection.name_collection || collection.name || `Collection ${collection.id}`}
                                        </MenuItem>
                                    ))
                                )}
                            </SelectField>
                            <p style={{fontSize: '0.8rem', color: theme.palette.text.secondary, marginTop: '0.5rem'}}>
                                Collection utilisée pour les champs de destination des filtres et tris
                                {availableCollections.length > 0 && (
                                    <span> ({availableCollections.length} collection(s) disponible(s))</span>
                                )}
                            </p>
                        </div>
                    )}

                    {/* Section Filtres */}
                    <div className='input-container'>
                        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem'}}>
                            <p className="blogField_name collection_edit_name" style={{margin: "0"}}>Filtres</p>
                            <button 
                                type="button" 
                                className="add-field-btn"
                                onClick={addFilter}
                                style={{
                                    backgroundColor: theme.palette.primary.main,
                                    border: 'none',
                                    color: theme.palette.text.primary,
                                    borderRadius: '4px',
                                    padding: '0.5rem 1rem',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem'
                                }}
                            >
                                + Ajouter un filtre
                            </button>
                        </div>
                        
                        {wrapFilters.map((filter) => (
                            <div key={filter.id} style={{
                                border: `1px solid ${theme.palette.divider}`,
                                borderRadius: '4px',
                                padding: '1rem',
                                marginBottom: '0.5rem',
                                backgroundColor: theme.palette.primary.secondary,
                                boxShadow: theme.palette.shadow.main,
                                position: "relative"
                            }}>
                                <div>
                                    {/* Premier champ : toujours les champs de la collection actuelle */}
                                        <p className="blogField_name collection_edit_name">Champ de la collection actuelle</p>
                                        <SelectField
                                            className="input_text_blog"
                                            value={filter.field}
                                            onChange={(e) => updateFilter(filter.id, { field: e.target.value })}
                                            displayEmpty
                                            style={{marginBottom: "1rem"}}
                                        >
                                            <MenuItem value="">Sélectionner un champ...</MenuItem>
                                            {getFilterFieldOptions().map(option => (
                                                <MenuItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </MenuItem>
                                            ))}
                                        </SelectField>
                                    
                                    <p className="blogField_name collection_edit_name">Opérateur</p>
                                    <SelectField
                                        className="input_text_blog"
                                        value={filter.operator || 'equals'}
                                        onChange={(e) => updateFilter(filter.id, { operator: e.target.value })}
                                        style={{marginBottom: "1rem"}}
                                    >
                                        {(() => {
                                            const selectedField = getFilterFieldOptions().find(opt => opt.value === filter.field);
                                            const fieldType = selectedField?.type;
                                            
                                            if (fieldType === 'switch') {
                                                return [
                                                    <MenuItem key="equals" value="equals">Égal à</MenuItem>,
                                                    <MenuItem key="notEquals" value="notEquals">Pas égal à</MenuItem>
                                                ];
                                            }
                                            
                                            return [
                                                <MenuItem key="equals" value="equals">Égal à</MenuItem>,
                                                <MenuItem key="notEquals" value="notEquals">Pas égal à</MenuItem>,
                                                <MenuItem key="contains" value="contains">Contient</MenuItem>,
                                                <MenuItem key="starts" value="starts">Commence par</MenuItem>,
                                                <MenuItem key="ends" value="ends">Finit par</MenuItem>
                                            ];
                                        })()}
                                    </SelectField>                                {/* Deuxième champ selon le mode */}
                                    <p className="blogField_name collection_edit_name">
                                        {isTemplateMode ? 'Champ de la collection template' : 'Valeur'}
                                    </p>
                                    {isTemplateMode ? (
                                        // Mode Template: Champs de la collection template sélectionnée globalement
                                        <SelectField
                                            key={`template-field-${selectedTemplateCollection}`} // Force la re-création du component
                                            className="input_text_blog"
                                            value={filter.value}
                                            onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                                            displayEmpty
                                            disabled={!selectedTemplateCollection}
                                        >
                                            <MenuItem value="">
                                                {selectedTemplateCollection ? 'Sélectionner un champ...' : 'Choisir d\'abord une collection template'}
                                            </MenuItem>
                                            {selectedTemplateCollection && templateCollectionFields.map(option => (
                                                <MenuItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </MenuItem>
                                            ))}
                                        </SelectField>
                                    ) : (() => {
                                        // Mode Normal: Adapter selon le type de champ
                                        const selectedField = getFilterFieldOptions().find(opt => opt.value === filter.field);
                                        const fieldType = selectedField?.type;
                                        
                                        if (fieldType === 'switch') {
                                            // Pour switch: Select avec true/false
                                            return (
                                                <SelectField
                                                    className="input_text_blog"
                                                    value={filter.value}
                                                    onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                                                    displayEmpty
                                                >
                                                    <MenuItem value="">Sélectionner une valeur...</MenuItem>
                                                    <MenuItem value="true">Vrai (activé)</MenuItem>
                                                    <MenuItem value="false">Faux (désactivé)</MenuItem>
                                                </SelectField>
                                            );
                                        }
                                        
                                        // Pour text et autres: Texte libre
                                        return (
                                            <input
                                                className="input_text_blog"
                                                type="text"
                                                placeholder="Valeur à filtrer"
                                                value={filter.value}
                                                onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                                            />
                                        );
                                    })()}                                    
                                </div>
                                <button
                                        type="button"
                                        onClick={() => removeFilter(filter.id)}
                                        style={{
                                            backgroundColor: "transparent",
                                            color: 'white',
                                            border: 'none',
                                            cursor: 'pointer',
                                            position: "absolute",
                                            top: "0.2rem",
                                            right: "0.2rem"
                                        }}
                                    >
                                        ✕
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Section Tris */}
                    <div className='input-container'>
                        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem'}}>
                            <p className="blogField_name collection_edit_name" style={{margin: "0"}}>Tris</p>
                            <button 
                                type="button" 
                                className="add-field-btn"
                                onClick={addSort}
                                style={{
                                    backgroundColor: theme.palette.primary.main,
                                    color: theme.palette.text.primary,
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '0.5rem 1rem',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                }}
                            >
                                + Ajouter un tri
                            </button>
                        </div>
                        
                        {wrapSorts.map((sort) => (
                            <div key={sort.id} style={{
                                border: `1px solid ${theme.palette.divider}`,
                                borderRadius: '4px',
                                padding: '1rem',
                                marginBottom: '0.5rem',
                                backgroundColor: theme.palette.primary.secondary,
                                boxShadow: theme.palette.shadow.main,
                                position: 'relative'
                            }}>
                                <div>
                                    {/* Premier champ : toujours les champs de la collection actuelle */}
                                    <div>
                                        <p className="blogField_name collection_edit_name">Champ de la collection actuelle</p>
                                        <SelectField
                                            className="input_text_blog"
                                            value={sort.field}
                                            onChange={(e) => updateSort(sort.id, { field: e.target.value })}
                                            displayEmpty
                                            style={{marginBottom: "1rem"}}
                                        >
                                            <MenuItem value="">Sélectionner un champ...</MenuItem>
                                            {getFilterFieldOptions().map(option => (
                                                <MenuItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </MenuItem>
                                            ))}
                                        </SelectField>
                                    </div>
                                    
                                    <div style={{flex: 1}}>
                                        <p className="blogField_name collection_edit_name">Direction</p>
                                        <SelectField
                                            className="input_text_blog"
                                            value={sort.direction}
                                            onChange={(e) => updateSort(sort.id, { direction: e.target.value })}
                                        >
                                            <MenuItem value="asc">Croissant</MenuItem>
                                            <MenuItem value="desc">Décroissant</MenuItem>
                                        </SelectField>
                                    </div>
                                </div>
                                
                                <button
                                    type="button"
                                    onClick={() => removeSort(sort.id)}
                                    style={{
                                        backgroundColor: "transparent",
                                        color: 'white',
                                        border: 'none',
                                        cursor: 'pointer',
                                        position: "absolute",
                                        top: "0rem",
                                        right: "0rem"
                                    }}
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                    
                    <div className='input-container'>
                        <p className="blogField_name collection_edit_name">Clé du wrapper</p>
                        <CopyField 
                            textToCopy={encodedWrapperKey || ''}
                            iconSize="0.9rem"
                        />
                    </div>
                    <div className='input-container'>
                        <p className="blogField_name collection_edit_name">Script Loader</p>
                        <CopyField 
                            textToCopy={`<script src="https://api-wenoble.wenoble.fr/collection-loader.js" data-user-id="${websiteApiKey || 'VOTRE_API_KEY'}"></script>`}
                            iconSize="0.9rem"
                        />
                    </div>
                    
                    
                    
                    <div className='line_horizontal' style={{backgroundColor: theme.palette.primary.third}}/>
                    <div className='header_modification header_page_modification' style={{marginTop: '1rem'}}>
                        <h4 className="section-title">Template de collection</h4>
                    </div>
                    <div className='input-container'>
                        <p className="blogField_name collection_edit_name">Titre Tag</p>
                        <SelectField
                            className="input_text_blog"
                            value={templateTitleTag}
                            displayEmpty
                            renderValue={(selected) => {
                                if (!selected) return 'Sélectionner le champ titre…';
                                const opt = textFieldOptions.find(o => o.value === selected);
                                return opt ? opt.label : selected;
                            }}
                            onChange={(e) => setTemplateTitleTag(e.target.value)}
                        >
                            {textFieldOptions.length === 0
                                ? (<MenuItem value="" disabled>Aucun champ texte</MenuItem>)
                                : ([
                                    ...textFieldOptions.map(opt => (
                                        <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                    ))
                                ])}
                        </SelectField>
                    </div>
                    <div className='input-container'>
                        <p className="blogField_name collection_edit_name">Meta description</p>
                        <SelectField
                            className="input_text_blog"
                            value={templateMetaTag}
                            displayEmpty
                            renderValue={(selected) => {
                                if (!selected) return 'Sélectionner la meta description…';
                                const opt = textFieldOptions.find(o => o.value === selected);
                                return opt ? opt.label : selected;
                            }}
                            onChange={(e) => setTemplateMetaTag(e.target.value)}
                        >
                            {textFieldOptions.length === 0
                                ? (<MenuItem value="" disabled>Aucun champ texte</MenuItem>)
                                : ([
                                    ...textFieldOptions.map(opt => (
                                        <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                    ))
                                ])}
                        </SelectField>
                    </div>
                    <div className='input-container'>
                        <p className="blogField_name collection_edit_name">Meta image</p>
                        <SelectField
                            className="input_text_blog"
                            value={templateMetaImageTag}
                            displayEmpty
                            renderValue={(selected) => {
                                if (!selected) return 'Sélectionner la meta image…';
                                const opt = imageFieldOptions.find(o => o.value === selected);
                                return opt ? opt.label : selected;
                            }}
                            onChange={(e) => setTemplateMetaImageTag(e.target.value)}
                        >
                            {imageFieldOptions.length === 0
                                ? (<MenuItem value="" disabled>Aucun champ image</MenuItem>)
                                : ([
                                    ...imageFieldOptions.map(opt => (
                                        <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                    ))
                                ])}
                        </SelectField>
                    </div>
                    <div className='input-container'>
                        <p className="blogField_name collection_edit_name">Script Template</p>
                        <CopyField 
                            textToCopy={templateScript}
                            iconSize="0.9rem"
                        />
                    </div>
                    
                </div>
                <div className='line_horizontal' style={{backgroundColor: theme.palette.primary.third}}/>
                <div className='header_modification header_page_modification' style={{marginTop: '1rem'}}>
                    <h4 className="section-title">Champs de collection</h4>
                </div>
                <div className='integration-fields-list' style={{ marginTop: '0.5rem' }}>
                    {configFields.length === 0 ? (
                        <p style={{ color: theme.palette.text.secondary, fontSize: '0.85rem' }}>Aucun champ configuré</p>
                    ) : (
                        configFields.map((field) => (
                            <CopyField 
                                key={field.id}
                                textToCopy={field.id}
                                displayText={field.name_field}
                                iconSize="0.9rem"
                            />
                        ))
                    )}
                </div>
            </PopupSide>

            <div className="Blog_creation_field_contain">
                {/* Informations de base */}
                <div className="collection-info-section">
                    <div className="header_modification header_page_modification">  
                        <h4 className="section-title">Informations de base</h4>
                    </div>
                    <div className="input-group">
                        <div className="input-container">
                            <p className='blogField_name collection_edit_name'>Nom de la collection *</p>
                            <input
                                id="collectionName"
                                className="input_text_blog"
                                value={collectionName}
                                onChange={handleCollectionNameChange}
                                required
                            />
                        </div>
                        <div className="input-container">
                            <p className="blogField_name collection_edit_name">Slug de la collection *</p>
                            <input
                                id="collectionSlug"
                                className="input_text_blog"
                                value={collectionSlug}
                                onChange={(e) => setCollectionSlug(e.target.value)}
                                required
                            />
                        </div>
                        <div className="input-container">
                            <p className="blogField_name collection_edit_name">Id de la collection</p>
                            <CopyField
                                textToCopy={collectionId}
                                successMessage="ID de la collection copié dans le presse-papiers"
                                errorMessage="Erreur lors de la copie de l'ID"
                                onSuccess={(message) => showSnackbar('success', message)}
                                onError={(message) => showSnackbar('error', message)}
                                iconSize="0.9rem"
                                style={{
                                    '&:hover': {
                                        boxShadow: `0 0 0 2px ${theme.palette.primary.main}40`,
                                        transform: 'translateY(-1px)'
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Configuration des champs */}
                <div className="config-fields-section">
                    <div className="header_modification header_page_modification">
                        <h4 className="section-title">Configuration des champs</h4>
                        <DefaultButton
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={addConfigField}
                        >
                            Ajouter un champ
                        </DefaultButton>
                    </div>

                    {/* Liste des champs configurés */}
                    <div className="configured-fields-list">
                        {/* Champs obligatoires statiques */}
                        <div className="configured-field-item">
                            <div className="field-item-info-wrapper">
                                <span className="field-item-type">
                                    <PiTextT fontSize='large'/>
                                </span>
                                <div className="field-item-header">
                                    <div className="field-item-info">
                                        <p className="blogField_name">
                                            Titre principal
                                        </p>
                                        <p className="field-item-description">Titre principal de l'élément de collection</p>
                                    </div>
                                </div>
                            </div>
                            <div className="field-item-actions">
                                <span className="field-required-badge">Obligatoire</span>
                            </div>
                        </div>

                        <div className="configured-field-item">
                            <div className="field-item-info-wrapper">
                                <span className="field-item-type">
                                    <PiTextT fontSize='large'/>
                                </span>
                                <div className="field-item-header">
                                    <div className="field-item-info">
                                        <p className="blogField_name">
                                            Slug
                                        </p>
                                        <p className="field-item-description">URL unique de l'élément de collection</p>
                                    </div>
                                </div>
                            </div>
                            <div className="field-item-actions">
                                <span className="field-required-badge">Obligatoire</span>
                            </div>
                        </div>

                        {/* Champs configurables */}                        
                        {configFields.map((field, index) => (
                            <div key={field.id}>
                                {/* Affichage normal du champ ou formulaire d'édition */}
                                {editingFieldIndex === index ? (
                                    /* Formulaire d'édition inline */
                                    <div className="field-config-form inline-edit">
                                        {/* Header avec le même design que la ligne normale */}
                                        <div className="field-item-info-wrapper inline-edit-wrapper" style={{ marginBottom: '1rem' }}>
                                            <div className='field-item-edit'>
                                                <span className="field-item-type">
                                                    {fieldTypes.find(t => t.value === selectedFieldType)?.value === 'text' && <PiTextT fontSize='large'/>}
                                                    {fieldTypes.find(t => t.value === selectedFieldType)?.value === 'richText' && <PiArticleNyTimes fontSize='large'/>}
                                                    {fieldTypes.find(t => t.value === selectedFieldType)?.value === 'image' && <ImageIcon fontSize='small'/>}
                                                    {fieldTypes.find(t => t.value === selectedFieldType)?.value === 'gallery' && <CollectionsIcon fontSize='small'/>}
                                                    {fieldTypes.find(t => t.value === selectedFieldType)?.value === 'video' && <VideocamIcon fontSize='small'/>}
                                                    {fieldTypes.find(t => t.value === selectedFieldType)?.value === 'multiReference' && <PiTreeStructure fontSize='large'/>}
                                                    {fieldTypes.find(t => t.value === selectedFieldType)?.value === 'switch' && <PiToggleRight fontSize='large'/>}
                                                </span>
                                                <div className="field-item-header">
                                                    <div className="field-item-info">
                                                        <p className="blogField_name">
                                                            {configFields[editingFieldIndex]?.name_field}
                                                        </p>
                                                        {configFields[editingFieldIndex]?.description_field && (
                                                            <p className="field-item-description">{configFields[editingFieldIndex]?.description_field}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                    
                                                {configFields[editingFieldIndex]?.multiline_text && (
                                                    <span className="field-option-badge">Texte multiligne</span>
                                                )}

                                                {configFields[editingFieldIndex]?.collection_id_ref && (
                                                    <span className="field-option-badge">
                                                        Réf: {availableCollections.find(c => c.id === configFields[editingFieldIndex]?.collection_id_ref)?.collection_name}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="config-form-actions">
                                                <SmallIconButton
                                                    variant="outlined"
                                                    onClick={() => {
                                                        removeConfigField(editingFieldIndex);
                                                        cancelFieldCreation();
                                                    }}
                                                >
                                                    <PiTrash fontSize="1.2rem"/>
                                                </SmallIconButton>
                                                <SecondaryButton
                                                    variant="outlined"
                                                    onClick={cancelFieldCreation}
                                                >
                                                    Annuler
                                                </SecondaryButton>
                                                <DefaultButton
                                                    variant="contained"
                                                    onClick={saveNewField}
                                                    sx={{ backgroundColor: theme.palette.primary.main }}
                                                >
                                                    Valider
                                                </DefaultButton>
                                            </div>
                                            </div>
                                        <div className="config-form-grid inline-edit-grid">
                                            <div className="input-container">
                                                <label className="blogField_name collection_edit_name">Nom du champ *</label>
                                                <input
                                                    className="input_text_blog"
                                                    value={newFieldData.name_field}
                                                    onChange={(e) => setNewFieldData({...newFieldData, name_field: e.target.value})}
                                                />
                                            </div>

                                            <div className="input-container">
                                                <label className="blogField_name collection_edit_name">Description</label>
                                                <textarea
                                                    className="input_text_blog textarea"
                                                    value={newFieldData.description_field}
                                                    onChange={(e) => setNewFieldData({...newFieldData, description_field: e.target.value})}
                                                    rows={3}
                                                />
                                            </div>

                                            {/* Options spécifiques selon le type */}
                                            {selectedFieldType === 'text' && (
                                                <div className="input-container">
                                                    <label className="blogField_name collection_edit_name">
                                                        Texte multiligne
                                                        <DefaultSwitch
                                                            checked={newFieldData.multiline_text}
                                                            onChange={(e) => setNewFieldData({...newFieldData, multiline_text: e.target.checked})}
                                                        />
                                                    </label>
                                                </div>
                                            )}

                                            {selectedFieldType === 'multiReference' && (
                                                <div className="input-container">
                                                    <label className="blogField_name collection_edit_name">Collection de référence</label>
                                                    <MultiReferenceSelect
                                                        options={availableCollections.map(collection => ({
                                                            value: collection.id,
                                                            label: collection.collection_name
                                                        }))}
                                                        value={newFieldData.collection_id_ref ? {
                                                            value: newFieldData.collection_id_ref,
                                                            label: availableCollections.find(c => c.id === newFieldData.collection_id_ref)?.collection_name
                                                        } : null}
                                                        onChange={(selectedOption) => {
                                                            setNewFieldData({
                                                                ...newFieldData, 
                                                                collection_id_ref: selectedOption?.value || null
                                                            });
                                                        }}
                                                        theme={theme}
                                                        isMulti={false}
                                                    />
                                                    {availableCollections.length === 0 && (
                                                        <p style={{ color: '#888', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                                                            Aucune collection disponible
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                    </div>
                                ) : (
                                    /* Affichage normal du champ */
                                    <>
                                    <div className="configured-field-item" onClick={() => editConfigField(index)} style={{ cursor: 'pointer' }}>
                                        <div className='field-item-info-wrapper'>
                                            <span className="field-item-type">
                                                {fieldTypes.find(t => t.value === field.tab_field)?.value === 'text' && <PiTextT fontSize='large'/>}
                                                {fieldTypes.find(t => t.value === field.tab_field)?.value === 'richText' && <PiArticleNyTimes fontSize='large'/>}
                                                {fieldTypes.find(t => t.value === field.tab_field)?.value === 'image' && <ImageIcon fontSize='small'/>}
                                                {fieldTypes.find(t => t.value === field.tab_field)?.value === 'gallery' && <CollectionsIcon fontSize='small'/>}
                                                {fieldTypes.find(t => t.value === field.tab_field)?.value === 'video' && <VideocamIcon fontSize='small'/>}
                                                {fieldTypes.find(t => t.value === field.tab_field)?.value === 'multiReference' && <PiTreeStructure fontSize='large'/>}
                                                {fieldTypes.find(t => t.value === field.tab_field)?.value === 'switch' && <PiToggleRight fontSize='large'/>}
                                            </span>
                                            <div className="field-item-header">
                                                <div className="field-item-info">
                                                    <p className="blogField_name">
                                                        {field.name_field}
                                                    </p>

                                                    {field.description_field && (
                                                        <p className="field-item-description">{field.description_field}</p>
                                                    )}
                                                </div>
                                            </div>

                                            {field.multiline_text && (
                                                <span className="field-option-badge">Texte multiligne</span>
                                            )}

                                            {field.collection_id_ref && (
                                                <span className="field-option-badge">
                                                    Réf: {availableCollections.find(c => c.id === field.collection_id_ref)?.collection_name}
                                                </span>
                                            )}
                                        </div>
                                            
                                        

                                        <div className="field-item-actions field-hover-action">
                                            <SmallIconButton
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    editConfigField(index);
                                                }}
                                            >
                                                <PiPencilSimple fontSize="1.2rem" />
                                            </SmallIconButton>
                                        </div>
                                    </div>
                                </>
                                )}
                            </div>
                        ))}
                        
                        {/* Ligne pour ajouter un nouveau champ - cachée si le formulaire est ouvert */}
                        {!showFieldTypeGrid && (
                            <div className="add-field-item" onClick={addConfigField}>
                                <div className="add-field-content">
                                    <span className="add-field-icon">
                                        <AddIcon fontSize='large'/>
                                    </span>
                                    <p className="add-field-text">Ajouter un champ</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Grille de sélection des types de champs - seulement pour l'ajout */}
                    {showFieldTypeGrid && editingFieldIndex === null && (
                        <div className="field-type-selection">
                            <h5 className="section-title">Choisissez le type de champ</h5>
                            <div className="field-type-grid">
                                {fieldTypes.map((type) => (
                                    <div
                                        key={type.value}
                                        className={`field-type-card ${selectedFieldType === type.value ? 'selected' : ''}`}
                                        onClick={() => selectFieldType(type.value)}
                                    >
                                        <div className="field-type-icon">
                                            {type.value === 'text' && <PiTextT fontSize='huge'/>}
                                            {type.value === 'richText' && <PiArticleNyTimes fontSize='huge'/>}
                                            {type.value === 'image' && <ImageIcon fontSize='huge'/>}
                                            {type.value === 'gallery' && <CollectionsIcon fontSize='huge'/>}
                                            {type.value === 'video' && <VideocamIcon fontSize='huge'/>}
                                            {type.value === 'multiReference' && <PiTreeStructure fontSize='huge'/>}
                                            {type.value === 'switch' && <PiToggleRight fontSize='huge'/>}
                                        </div>
                                        <p className="field-type-label">{type.label}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Formulaire de configuration du champ - seulement pour l'ajout */}
                            {selectedFieldType && editingFieldIndex === null && (
                                <div className="field-config-form">
                                    <h5 className="section-title">
                                        Configuration du champ : {fieldTypes.find(t => t.value === selectedFieldType)?.label}
                                    </h5>
                                    <div className="config-form-grid">
                                        <div className="input-container">
                                            <label className="blogField_name">Nom du champ *</label>
                                            <input
                                                className="input_text_blog"
                                                value={newFieldData.name_field}
                                                onChange={(e) => setNewFieldData({...newFieldData, name_field: e.target.value})}
                                            />
                                        </div>

                                        <div className="input-container">
                                            <label className="blogField_name">Description</label>
                                            <textarea
                                                className="input_text_blog textarea"
                                                value={newFieldData.description_field}
                                                onChange={(e) => setNewFieldData({...newFieldData, description_field: e.target.value})}
                                                rows={3}
                                            />
                                        </div>

                                        {/* Options spécifiques selon le type */}
                                        {selectedFieldType === 'text' && (
                                            <div className="input-container">
                                                <label className="blogField_name">
                                                    Texte multiligne
                                                    <DefaultSwitch
                                                        checked={newFieldData.multiline_text}
                                                        onChange={(e) => setNewFieldData({...newFieldData, multiline_text: e.target.checked})}
                                                    />
                                                </label>
                                            </div>
                                        )}

                                        {selectedFieldType === 'multiReference' && (
                                            <div className="input-container">
                                                <label className="blogField_name">Collection de référence</label>
                                                <MultiReferenceSelect
                                                    options={availableCollections.map(collection => ({
                                                        value: collection.id,
                                                        label: collection.collection_name
                                                    }))}
                                                    value={newFieldData.collection_id_ref ? {
                                                        value: newFieldData.collection_id_ref,
                                                        label: availableCollections.find(c => c.id === newFieldData.collection_id_ref)?.collection_name
                                                    } : null}
                                                    onChange={(selectedOption) => {
                                                        setNewFieldData({
                                                            ...newFieldData, 
                                                            collection_id_ref: selectedOption?.value || null
                                                        });
                                                    }}
                                                    theme={theme}
                                                    isMulti={false}
                                                />
                                                {availableCollections.length === 0 && (
                                                    <p style={{ color: '#888', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                                                        Aucune collection disponible
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="config-form-actions">
                                        <SecondaryButton
                                            variant="outlined"
                                            onClick={cancelFieldCreation}
                                        >
                                            Annuler
                                        </SecondaryButton>
                                        <DefaultButton
                                            variant="contained"
                                            onClick={saveNewField}
                                            sx={{ backgroundColor: theme.palette.primary.main }}
                                        >
                                            Valider
                                        </DefaultButton>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Dialog d'aperçu */}
            <Dialog 
                open={openPreview} 
                onClose={() => setOpenPreview(false)} 
                maxWidth="md" 
                fullWidth
                sx={{
                    '& .MuiDialog-paper': {
                        padding: "1rem",
                        borderRadius: "0.5rem",
                        backgroundColor: theme.palette.primary.main,
                        border: `1px solid ${theme.palette.primary.third}`,
                        boxShadow: theme.shadows[8],
                    }
                }}
            >
                <h4 className='section-title' style={{ color: theme.palette.text.primary }}>Aperçu de la collection</h4>
                <DialogContent sx={{ padding: '1rem 0' }}>
                    <Typography variant="h6" gutterBottom sx={{ color: theme.palette.text.primary }}>
                        {collectionName || 'Nom de la collection'}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                        Slug: {collectionSlug || 'slug-de-la-collection'}
                    </Typography>
                    
                    <div className="preview-fields-container">
                        {/* Champs obligatoires statiques */}
                        <div className='blogField_contain'>
                            <div className='blogField_name'>
                                Titre principal *
                            </div>
                            <div style={{ marginTop: '0.3rem' }}>
                                <input 
                                    className="input_text_blog"
                                    type="text"
                                    disabled
                                    style={{ 
                                        backgroundColor: theme.palette.primary.main,
                                        color: theme.palette.text.primary,
                                        border: `1px solid ${theme.palette.primary.third}`,
                                    }}
                                />
                            </div>
                        </div>

                        <div className='blogField_contain'>
                            <div className='blogField_name'>
                                Slug *
                            </div>
                            <div style={{ marginTop: '0.3rem' }}>
                                <input 
                                    className="input_text_blog"
                                    type="text"
                                    placeholder="Entrez le slug..."
                                    disabled
                                    style={{ 
                                        backgroundColor: theme.palette.primary.main,
                                        color: theme.palette.text.primary,
                                        border: `1px solid ${theme.palette.primary.third}`,
                                    }}
                                />
                            </div>
                        </div>

                        {/* Champs configurables */}
                        {configFields.map((field, index) => (
                            <div key={field.id} className='blogField_contain'>
                                <div className='blogField_name'>
                                    {field.name_field}
                                </div>
                                {field.description_field && (
                                    <div 
                                        className='blogField_description'
                                        style={{ color: theme.palette.text.secondary }}
                                    >
                                        {field.description_field}
                                    </div>
                                )}
                                <div style={{ marginTop: '0.3rem' }}>
                                    {/* Champ Texte */}
                                    {field.tab_field === 'text' && (
                                        field.multiline_text ? (
                                            <textarea 
                                                className="input_text_blog textarea"
                                                rows={4}
                                                disabled
                                                style={{ 
                                                    backgroundColor: theme.palette.primary.main,
                                                    color: theme.palette.text.primary,
                                                    border: `1px solid ${theme.palette.primary.third}`,
                                                }}
                                            />
                                        ) : (
                                            <input 
                                                className="input_text_blog"
                                                type="text"
                                                disabled
                                                style={{ 
                                                    backgroundColor: theme.palette.primary.main,
                                                    color: theme.palette.text.primary,
                                                    border: `1px solid ${theme.palette.primary.third}`,
                                                }}
                                            />
                                        )
                                    )}
                                    
                                    {/* Champ Texte Riche */}
                                    {field.tab_field === 'richText' && (
                                        <div className="editor-container" style={{
                                            backgroundColor: theme.palette.primary.main,
                                            border: `1px solid ${theme.palette.primary.third}`,
                                        }}>
                                            <div className="DraftEditor-root" style={{
                                                backgroundColor: theme.palette.primary.main,
                                                color: theme.palette.text.primary,
                                            }}>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Champ Image */}
                                    {field.tab_field === 'image' && (
                                        <div className="image_blog" style={{
                                            borderColor: theme.palette.primary.third,
                                            backgroundColor: theme.palette.primary.main,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            textAlign: 'center'
                                        }}>
                                            <div className="logoUploadImage">
                                                <ImageIcon style={{ fontSize: '4rem', color: theme.palette.text.secondary }} />
                                            </div>
                                            <p style={{ color: theme.palette.text.secondary, margin: '0.5rem 0 0 0' }}>
                                                Télécharger ou glisser une photo ici (jpeg, png)
                                            </p>
                                        </div>
                                    )}
                                    
                                    {/* Champ Galerie */}
                                    {field.tab_field === 'gallery' && (
                                        <div className="image_blog" style={{
                                            borderColor: theme.palette.primary.third,
                                            backgroundColor: theme.palette.primary.main,
                                            textAlign: 'center'
                                        }}>
                                            <div className="gallery_add_contain" style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <div className="logoUploadImage">
                                                    <CollectionsIcon style={{ fontSize: '4rem', color: theme.palette.text.secondary }} />
                                                </div>
                                                <p style={{ color: theme.palette.text.secondary, margin: '0.5rem 0 0 0' }}>
                                                    Télécharger ou glisser des photos ici (jpeg, png)
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Champ Vidéo */}
                                    {field.tab_field === 'video' && (
                                        <div className="image_blog" style={{
                                            borderColor: theme.palette.primary.third,
                                            backgroundColor: theme.palette.primary.main,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            textAlign: 'center'
                                        }}>
                                            <div className="logoUploadImage">
                                                <VideocamIcon style={{ fontSize: '4rem', color: theme.palette.text.secondary }} />
                                            </div>
                                            <p style={{ color: theme.palette.text.secondary, margin: '0.5rem 0 0 0' }}>
                                                Télécharger ou glisser une video ici (mp4)
                                            </p>
                                        </div>
                                    )}
                                    
                                    {/* Champ Multi-référence */}
                                    {field.tab_field === 'multiReference' && (
                                        <div className="mutliReference_input">
                                            <select 
                                                className="input_text_blog"
                                                disabled
                                                style={{ 
                                                    backgroundColor: theme.palette.primary.main,
                                                    color: theme.palette.text.primary,
                                                    border: `1px solid ${theme.palette.primary.third}`,
                                                    appearance: 'none',
                                                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                                                    backgroundPosition: 'right 0.5rem center',
                                                    backgroundRepeat: 'no-repeat',
                                                    backgroundSize: '1.5em 1.5em',
                                                    paddingRight: '2.5rem'
                                                }}
                                            >
                                            </select>
                                        </div>
                                    )}
                                    
                                    {/* Champ Switch */}
                                    {field.tab_field === 'switch' && (
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <DefaultSwitch
                                                checked={false}
                                                disabled
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </DialogContent>
                <DialogActions>
                    <SecondaryButton onClick={() => setOpenPreview(false)}>Fermer</SecondaryButton>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default EditCollection;
