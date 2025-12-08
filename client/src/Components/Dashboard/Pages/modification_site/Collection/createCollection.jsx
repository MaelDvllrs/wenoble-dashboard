import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    Visibility as VisibilityIcon,
} from '@mui/icons-material';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';
import config from '../../../../../config';
import Axios from '../../../../../service/AxiosConfig';
import { useSnackbar } from '../../../../../Theme/snackbar';
import { useWebsite } from '../../../../../Context/WebsiteContext';
import './collection.css';
import '../Fields/Field.css';
import { SecondaryButton, DefaultButton, MultiReferenceSelect, DefaultSwitch, SmallIconButton } from '../../../../../Theme/element';
import { PiEye, PiTextT, PiPencilSimple, PiTrash, PiArticleNyTimes, PiTreeStructure } from 'react-icons/pi';

const CreateCollection = () => {
    const theme = useTheme();
    const navigate = useNavigate();
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
    const [openPreview, setOpenPreview] = useState(false);
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
        { value: 'multiReference', label: 'Multi-référence' }
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
        if (!collectionSlug || collectionSlug === generateSlug(collectionName)) {
            setCollectionSlug(generateSlug(name));
        }
    };

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
    const removeConfigField = (index) => {
        const newFields = configFields.filter((_, i) => i !== index);
        setConfigFields(newFields);
        showSnackbar('info', 'Champ supprimé');
    };

    // Mettre à jour un champ de configuration
    const updateConfigField = (index, field, value) => {
        const newFields = [...configFields];
        newFields[index][field] = value;
        
        // Si c'est une multi-référence, charger les collections disponibles
        if (field === 'tab_field' && value === 'multiReference') {
            loadAvailableCollections();
        }
        
        setConfigFields(newFields);
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
                setAvailableCollections(decoded.blog || []);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des collections:', error);
        }
    };

    // Charger les collections au montage du composant
    useEffect(() => {
        loadAvailableCollections();
    }, [selectedWebsite?.id]);

    // Valider les données avant création
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

    // Créer la collection
    const createCollection = async () => {
        if (!selectedWebsite) {
            showSnackbar('error', 'Veuillez sélectionner un site web');
            return;
        }
        if (!validateData()) return;
        setLoading(true);
        try {
            const res = await Axios.post(`${apiUrl}/createCollectionMain`, {
                collection_name: collectionName,
                collection_slug: collectionSlug,
                website_id: selectedWebsite.id,
                config_fields: configFields
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const collectionId = res.data.id;
            showSnackbar('success', 'Collection créée avec succès !');
            navigate(`/dashboard/website/modification/collection/${collectionId}`, { 
                replace: true,
                state: { refreshCollections: true }
            });
        } catch (error) {
            console.error('Erreur lors de la création de la collection:', error);
            showSnackbar('error', error?.response?.data?.error || 'Erreur lors de la création de la collection');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="Blog_creation_Page">
            {websiteLoading ? (
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    height: '200px',
                    color: theme.palette.text.primary 
                }}>
                    <CircularProgress />
                    <span style={{ marginLeft: '1rem' }}>Chargement...</span>
                </div>
            ) : !selectedWebsite ? (
                <div style={{ 
                    textAlign: 'center', 
                    padding: '2rem',
                    color: theme.palette.text.primary 
                }}>
                    <h3>Aucun site web sélectionné</h3>
                    <p>Veuillez sélectionner un site web depuis le menu principal pour créer une collection.</p>
                    <SecondaryButton 
                        onClick={() => navigate('/dashboard/website/modification/collection')}
                        style={{ marginTop: '1rem' }}
                    >
                        Retour aux collections
                    </SecondaryButton>
                </div>
            ) : !isAdmin ? (
                <div style={{ 
                    textAlign: 'center', 
                    padding: '2rem',
                    color: theme.palette.text.primary 
                }}>
                    <h3>Accès refusé</h3>
                    <p>Seuls les administrateurs peuvent créer des collections.</p>
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
            ) : (
                <>
            <div className="header_modification header_page_modification">
                <h3 className="titlePage">Nouvelle collection</h3>
                <div className="actions-section">
                    <SmallIconButton
                        onClick={() => setOpenPreview(true)}
                        title="Aperçu"
                    >
                        <PiEye fontSize="1.3rem" />
                    </SmallIconButton>

                    <SecondaryButton
                        variant="outlined"
                        onClick={() => navigate('/dashboard/website/modification/collection')}
                        disabled={loading}
                    >
                        Annuler
                    </SecondaryButton>
                    <DefaultButton
                        variant="contained"
                        startIcon={loading ? <CircularProgress size={12} sx={{ color: 'white' }} /> : undefined}
                        onClick={createCollection}
                        disabled={loading}
                        sx={{ backgroundColor: theme.palette.primary.main }}
                    >
                        Créer
                    </DefaultButton>
                </div>
            </div>

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
                                                    {fieldTypes.find(t => t.value === selectedFieldType)?.value === 'multiReference' && <PiTreeStructure  fontSize='large'/>}
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
                                    <div className="configured-field-item" onClick={() => editConfigField(index)} style={{ cursor: 'pointer' }}>
                                        <div className="field-item-info-wrapper">
                                            <span className="field-item-type">
                                                {fieldTypes.find(t => t.value === field.tab_field)?.value === 'text' && <PiTextT fontSize='large'/>}
                                                {fieldTypes.find(t => t.value === field.tab_field)?.value === 'richText' && <PiArticleNyTimes fontSize='large'/>}
                                                {fieldTypes.find(t => t.value === field.tab_field)?.value === 'image' && <ImageIcon fontSize='small'/>}
                                                {fieldTypes.find(t => t.value === field.tab_field)?.value === 'gallery' && <CollectionsIcon fontSize='small'/>}
                                                {fieldTypes.find(t => t.value === field.tab_field)?.value === 'video' && <VideocamIcon fontSize='small'/>}
                                                {fieldTypes.find(t => t.value === field.tab_field)?.value === 'multiReference' && <PiTreeStructure  fontSize='large'/>}
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
                                            <PiPencilSimple fontSize="1.2rem" />
                                        </div>
                                    </div>
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
                                </div>
                            </div>
                        ))}
                    </div>
                </DialogContent>
                <DialogActions>
                    <SecondaryButton onClick={() => setOpenPreview(false)}>Fermer</SecondaryButton>
                </DialogActions>
            </Dialog>
                </>
            )}
        </div>
    );
};

export default CreateCollection;
