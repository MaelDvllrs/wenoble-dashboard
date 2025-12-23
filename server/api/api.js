// Optimisé : Route /sendBlog et fonction applyFiltersToElements simplifiées et commentées
const express = require('express');
const router = express.Router();

const { stateToHTML } = require('draft-js-export-html');
const { convertFromRaw } = require('draft-js');

const { ca } = require('date-fns/locale/ca');
const { createClient } = require('@supabase/supabase-js');
const e = require('express');

require('dotenv').config();

// Création d'une instance Supabase avec la clé de service pour accès administrateur
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

// Helpers communs
const fold = (s) => (s || '').toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
const BASE_COLLECTION_COLUMNS = new Set([
    'id',
    'collection_id',
    'collection_element_name',
    'collection_element_slug',
    'collection_element_status_text',
    'collection_element_publish_date',
    'created_at',
    'updated_at'
]);


const apiKeyMiddleware = async (req, res, next) => {
    const apiKey = req.headers['api_key'];
    const id_data = req.headers['id_data']; // identifiant principal passé par le client (collection_id, page_id, etc.)
    const ids = req.headers['ids']; // liste éventuelle d'IDs séparés par des virgules

    if (!apiKey) {
        return res.status(401).json({ message: 'Clé API manquante.' });
    }

    try {
        // La clé API est désormais stockée sur la table "websites"
        const { data: website, error } = await supabase
            .from('websites')
            .select('id, api_key')
            .eq('api_key', apiKey)
            .maybeSingle();

        if (error) throw error;
        if (!website) {
            return res.status(403).json({ message: 'Clé API invalide.' });
        }

        // Exposer l'id du site pour les routes si besoin futur
        req.website_id = website.id;
        req.id_data = id_data;
        req.ids = ids;
        next();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};



//------------------- API pour le portfolio -------------------//

// Images portfolio : renvoie les URLs publiques Supabase
router.get('/sendPhoto', apiKeyMiddleware, async (req, res) => {
    const id_portfolio = req.id_data;
    try {
        const { data, error } = await supabase
            .from('photo_portfolio')
            .select('src_photo, alt_photo')
            .eq('id_portfolio', id_portfolio)
            .order('order_photo', { ascending: true });
        if (error) throw error;
        if (!data || data.length === 0) return res.status(403).json({ message: 'Aucune photo trouvée' });
        // Générer les URLs publiques Supabase pour chaque image
        const images = data.map(photo => {
            const { data: publicUrlData } = supabase.storage
                .from('portfolio-image')
                .getPublicUrl(photo.src_photo);
            return {
                src_photo: photo.src_photo,
                alt_photo: photo.alt_photo,
                url: publicUrlData?.publicUrl || ''
            };
        });
        res.json({ images });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});

router.get('/sendPhotoPortfolio', apiKeyMiddleware, async (req, res) => {
    const id_portfolio = req.id_data;
    try {
        const { data, error } = await supabase
            .from('photo_portfolio')
            .select('src_photo, alt_photo')
            .eq('id_portfolio', id_portfolio)
            .order('order_photo', { ascending: true });
        if (error) throw error;
        if (!data || data.length === 0) return res.status(403).json({ message: 'Aucune photo trouvée' });
        res.json({ images: data });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});

//------------------- API pour les blogs (collections) -------------------//

// Récupérer toutes les pages de blogs (collections)
router.get('/sendBlog', apiKeyMiddleware, async (req, res) => {
    const ids = req.ids;
    const order = (req.query.order || 'desc').toString().toLowerCase();
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;
    const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;
    const colone = (req.query.colone && req.query.colone.trim() !== '') ? req.query.colone : 'collection_element_publish_date';

    console.log('Requête /sendBlog avec params - ids:', ids, 'order:', order, 'limit:', limit, 'offset:', offset, 'colone:', colone);
    // Nouveau: filtres dynamiques envoyés par collection-filter-plus.js
    let filters = {};
    if (req.query.filters) {
        try {
            filters = JSON.parse(req.query.filters);
        } catch (e) {
            return res.status(400).json({ message: 'Paramètre filters invalide (JSON attendu)' });
        }
    }
    
    // Nouveau: paramètres de tri dynamiques
    let sorts = {};
    if (req.query.sorts) {
        try {
            sorts = JSON.parse(req.query.sorts);
        } catch (e) {
            return res.status(400).json({ message: 'Paramètre sorts invalide (JSON attendu)' });
        }
    }
    
    // Nouveau: collection template pour le mode template
    const templateCollectionId = req.query.templateCollectionId || null;
    let templateElementId = req.query.templateElementId || null;
    
    // Log pour debugging
    if (templateCollectionId) {
        console.log('Mode template - Collection ID:', templateCollectionId, 'Element ID:', templateElementId);
    }

    try {
        // Determine targeted collection(s)
        let targetCollectionIds = [];
        if (ids) {
            targetCollectionIds = ids.split(',').map(id => id.trim()).filter(Boolean);
        } else if (req.id_data) {
            targetCollectionIds = [req.id_data];
        }

        const ascending = order === 'asc';
        const baseColumns = BASE_COLLECTION_COLUMNS;
        const hasFilters = Object.keys(filters).length > 0;
        const hasSorts = Object.keys(sorts).length > 0;

        // Si pas de filtres ni de tri personnalisé, utiliser la logique de base simple
        if (!hasFilters && !hasSorts) {
            return await handleNoFiltersCase({
                supabase, targetCollectionIds, baseColumns, colone, ascending, limit, offset, res, templateCollectionId
            });
        }

        // Avec filtres ou tri personnalisé: utiliser la nouvelle logique DB-first
        const dataset = await applyFiltersAtDbLevel({
            supabase, targetCollectionIds, filters, baseColumns, colone, ascending, limit, offset, sorts, templateCollectionId, templateElementId
        });

        if (dataset.length === 0) return res.status(200).json({ message: 'Aucun blog trouvé' });
        return res.json({ blog: dataset });
    } catch (err) {
        console.error('Erreur lors de la récupération des blogs :', err);
        res.status(500).send({ error: err.message });
    }
});

// Helper: gère le cas sans filtres (ancienne logique optimisée)
async function handleNoFiltersCase({ supabase, targetCollectionIds, baseColumns, colone, ascending, limit, offset, res, templateCollectionId }) {
    let query = supabase
        .from('collection_element')
        .select('*')
        .eq('collection_element_status_text', "publish");
    
    // Vérifier si la colonne de tri est une colonne de base valide
    const isBaseColumn = colone && baseColumns.has(colone);
    
    // Appliquer le tri au niveau DB seulement si c'est une colonne de base
    if (isBaseColumn) {
        query = query.order(colone, { ascending });
    } else {
        // Tri par défaut pour récupérer les données
        query = query.order('collection_element_publish_date', { ascending: false });
    }
    
    if (targetCollectionIds.length > 0) {
        if (targetCollectionIds.length === 1) {
            query = query.eq('collection_id', targetCollectionIds[0]);
        } else {
            query = query.in('collection_id', targetCollectionIds);
        }
    }
    
    // Appliquer offset/limit au niveau DB seulement si tri sur colonne de base
    if (isBaseColumn) {
        if (offset && offset > 0) query = query.range(offset, offset + (limit || 1000) - 1);
        else if (limit) query = query.limit(limit);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    if (!data || data.length === 0) {
        return res.status(200).json({ message: 'Aucun blog trouvé' });
    }
    
    let finalData = data;
    
    // Si la colonne de tri n'est pas une colonne de base, trier en mémoire
    if (!isBaseColumn && colone && colone !== 'undefined' && colone.trim() !== '') {
        // Trier par la colonne demandée (si elle existe dans les données)
        finalData = [...data].sort((a, b) => {
            const aVal = a[colone] || '';
            const bVal = b[colone] || '';
            if (aVal < bVal) return ascending ? -1 : 1;
            if (aVal > bVal) return ascending ? 1 : -1;
            return 0;
        });
        
        // Appliquer offset et limite en mémoire
        if (offset && offset > 0) {
            finalData = finalData.slice(offset, offset + (limit || finalData.length));
        } else if (limit && finalData.length > limit) {
            finalData = finalData.slice(0, limit);
        }
    }
    
    return res.json({ blog: finalData });
}

// Helper: récupère les collection_element_id filtrés via les champs text
async function getFilteredElementIdsByText({ supabase, targetCollectionIds, textFilters, isTemplateMode = false, templateCollectionId = null, templateElementId = null }) {
    if (Object.keys(textFilters).length === 0) return null;
    
    let elementIds = new Set();
    
    for (const [configId, filterConfig] of Object.entries(textFilters)) {
        console.log('Traitement du filtre text pour configId:', configId, 'filterConfig:', filterConfig, 'Mode template:', isTemplateMode);
        
        // 1. Extraire l'opérateur et la valeur depuis le token
        let operator = 'equals';
        let tokenValue = null;
        
        if (typeof filterConfig === 'object' && filterConfig.operator) {
            operator = filterConfig.operator;
            tokenValue = filterConfig.value;
        } else {
            tokenValue = filterConfig;
        }
        
        console.log('Valeur du token text:', tokenValue, 'Opérateur:', operator);
        
        // 2. Récupérer la valeur finale à filtrer
        let filterValue = null;
        
        if (isTemplateMode && templateCollectionId && templateElementId) {
            // Mode template: déterminer le type de filtrage selon la valeur du token
            if (tokenValue === 'collection_element_name') {
                // Filtrage par nom d'élément template
                console.log('Mode template: récupération du nom de l\'élément template', templateElementId);
                
                const { data: templateElement, error: templateErr } = await supabase
                    .from('collection_element')
                    .select('collection_element_name')
                    .eq('id', templateElementId)
                    .eq('collection_element_status_text', "publish")
                    .maybeSingle();
                    
                if (templateErr || !templateElement) {
                    console.log('Erreur ou élément template non trouvé:', templateErr);
                    continue;
                }
                
                filterValue = templateElement.collection_element_name;
                console.log('Nom de l\'élément template récupéré:', filterValue);
            } else if (tokenValue === 'collection_element_slug') {
                // Filtrage par slug d'élément template
                console.log('Mode template: récupération du slug de l\'élément template', templateElementId);
                
                const { data: templateElement, error: templateErr } = await supabase
                    .from('collection_element')
                    .select('collection_element_slug')
                    .eq('id', templateElementId)
                    .eq('collection_element_status_text', "publish")
                    .maybeSingle();
                    
                if (templateErr || !templateElement) {
                    console.log('Erreur ou élément template non trouvé:', templateErr);
                    continue;
                }
                
                filterValue = templateElement.collection_element_slug;
                console.log('Slug de l\'élément template récupéré:', filterValue);
            } else if (tokenValue === 'collection_element_publish_date' || tokenValue.includes('collection_element_')) {
                // Filtrage par champ de base de l'élément template
                const fieldName = tokenValue;
                console.log('Mode template: récupération du champ de base', fieldName, 'de l\'élément template', templateElementId);
                
                const { data: templateElement, error: templateErr } = await supabase
                    .from('collection_element')
                    .select(fieldName)
                    .eq('id', templateElementId)
                    .eq('collection_element_status_text', "publish")
                    .maybeSingle();
                    
                if (templateErr || !templateElement) {
                    console.log('Erreur ou élément template non trouvé:', templateErr);
                    continue;
                }
                
                filterValue = templateElement[fieldName];
                console.log('Champ de base de l\'élément template récupéré:', fieldName, '=', filterValue);
            } else {
                // Filtrage par champ text de l'élément template
                console.log('Mode template: récupération de la valeur du champ text', configId, 'depuis l\'élément template', templateElementId);
                
                const { data: templateText, error: templateTextErr } = await supabase
                    .from('collection_field_text')
                    .select('text')
                    .eq('id_config', configId)
                    .eq('collection_element_id', templateElementId)
                    .maybeSingle();
                    
                if (templateTextErr) {
                    console.log('Erreur lors de la récupération du champ text template:', templateTextErr);
                    continue;
                }
                
                if (!templateText || !templateText.text) {
                    console.log('Élément template n\'a pas de valeur pour le champ text', configId, '- pas de filtrage pour ce champ');
                    continue;
                }
                
                filterValue = templateText.text;
                console.log('Valeur text extraite du template:', filterValue);
            }
        } else {
            // Mode normal: vérifier si la valeur du token est un ID de config (nombre) ou une vraie valeur
            if (tokenValue && tokenValue.toString() === configId) {
                console.log('Mode normal: la valeur du token correspond à l\'ID de config, pas de filtrage à effectuer');
                continue;
            }
            
            filterValue = tokenValue;
            console.log('Valeur text directe du token:', filterValue);
        }
        
        if (!filterValue) {
            console.log('Aucune valeur text à filtrer trouvée');
            continue;
        }
        
        // 3. Récupérer les collection_element_id qui matchent cette valeur selon l'opérateur
        let textQuery = supabase
            .from('collection_field_text')
            .select('collection_element_id')
            .eq('id_config', configId);
            
        // Appliquer les filtres selon l'opérateur
        switch (operator) {
            case 'equals':
                textQuery = textQuery.eq('text', filterValue);
                break;
            case 'notEquals':
                textQuery = textQuery.neq('text', filterValue);
                break;
            case 'contains':
                textQuery = textQuery.ilike('text', `%${filterValue}%`);
                break;
            case 'starts':
                textQuery = textQuery.ilike('text', `${filterValue}%`);
                break;
            case 'ends':
                textQuery = textQuery.ilike('text', `%${filterValue}`);
                break;
            default:
                textQuery = textQuery.eq('text', filterValue);
        }
        
        const { data: textResults, error: textErr } = await textQuery;
        if (textErr || !textResults) {
            console.log('Erreur ou pas de résultats text:', textErr);
            continue;
        }
        
        console.log('Résultats text trouvés:', textResults.length);
        
        let matchingIds = textResults.map(r => r.collection_element_id);
        console.log('IDs text correspondants:', matchingIds);
        
        if (elementIds.size === 0) {
            // Premier filtre : ajouter tous les IDs
            matchingIds.forEach(id => elementIds.add(id));
        } else {
            // Filtres suivants : intersection (ET logique)
            const intersection = new Set();
            matchingIds.forEach(id => {
                if (elementIds.has(id)) intersection.add(id);
            });
            elementIds = intersection;
        }
    }
    
    return elementIds.size > 0 ? Array.from(elementIds) : [];
}

// Helper: récupère les collection_element_id filtrés via les champs multiReference
async function getFilteredElementIdsByMultiRef({ supabase, targetCollectionIds, multiRefFilters, isTemplateMode = false, templateCollectionId = null, templateElementId = null }) {
    if (Object.keys(multiRefFilters).length === 0) return null;
    
    let elementIds = new Set();
    
    for (const [configId, filterConfig] of Object.entries(multiRefFilters)) {
        console.log('Traitement du filtre multiRef pour configId:', configId, 'filterConfig:', filterConfig, 'Mode template:', isTemplateMode);
        
        // 1. Extraire l'opérateur et la valeur depuis le token
        let operator = 'equals';
        let tokenValue = null;
        
        if (typeof filterConfig === 'object' && filterConfig.operator) {
            operator = filterConfig.operator;
            tokenValue = filterConfig.value;
        } else {
            tokenValue = filterConfig;
        }
        
        console.log('Valeur du token:', tokenValue, 'Opérateur:', operator);
        
        // 2. Récupérer la valeur finale à filtrer
        let filterValue = null;
        
        if (isTemplateMode && templateCollectionId && templateElementId) {
            // Mode template: déterminer le type de filtrage selon la valeur du token
            if (tokenValue === 'collection_element_name') {
                // Filtrage par nom d'élément template
                console.log('Mode template: récupération du nom de l\'élément template', templateElementId);
                
                const { data: templateElement, error: templateErr } = await supabase
                    .from('collection_element')
                    .select('collection_element_name')
                    .eq('id', templateElementId)
                    .eq('collection_element_status_text', "publish")
                    .maybeSingle();
                    
                if (templateErr || !templateElement) {
                    console.log('Erreur ou élément template non trouvé:', templateErr);
                    continue;
                }
                
                filterValue = templateElement.collection_element_name;
                console.log('Nom de l\'élément template récupéré:', filterValue);
            } else {
                // Filtrage par champ multiReference de l'élément template
                console.log('Mode template: récupération de la valeur du champ', configId, 'depuis l\'élément template', templateElementId);
                
                const { data: templateMultiRef, error: templateMultiRefErr } = await supabase
                    .from('collection_field_multireference')
                    .select('info_ref')
                    .eq('id_config', configId)
                    .eq('collection_element_id', templateElementId)
                    .maybeSingle();
                    
                if (templateMultiRefErr) {
                    console.log('Erreur lors de la récupération du champ multiRef template:', templateMultiRefErr);
                    continue;
                }
                
                if (!templateMultiRef || !templateMultiRef.info_ref) {
                    console.log('Élément template n\'a pas de valeur pour le champ', configId, '- pas de filtrage pour ce champ');
                    // Pas d'erreur, juste pas de filtrage pour ce champ
                    continue;
                }
                
                // Parser le champ info_ref du template pour récupérer les IDs/labels référencés
                let templateRefs = [];
                try {
                    templateRefs = typeof templateMultiRef.info_ref === 'string' 
                        ? JSON.parse(templateMultiRef.info_ref) 
                        : (templateMultiRef.info_ref || []);
                } catch (e) {
                    console.log('Erreur parsing info_ref template:', e);
                    continue;
                }
                
                if (!Array.isArray(templateRefs) || templateRefs.length === 0) {
                    console.log('Élément template n\'a pas de références valides pour le champ', configId, '- pas de filtrage pour ce champ');
                    continue;
                }
                
                console.log('Références du template:', templateRefs);
                
                // On va utiliser ces références comme critères de filtrage
                // Plutôt qu'une seule valeur, on a maintenant une liste de références à rechercher
                filterValue = templateRefs;
                console.log('Valeurs extraites du template:', filterValue);
            }
        } else {
            // Mode normal: vérifier si la valeur du token est un ID de config (nombre) ou une vraie valeur
            // Si c'est juste un nombre qui correspond au configId, on skip ce filtre
            if (tokenValue && tokenValue.toString() === configId) {
                console.log('Mode normal: la valeur du token correspond à l\'ID de config, pas de filtrage à effectuer');
                continue;
            }
            
            // Sinon utiliser la valeur directement depuis le token
            filterValue = tokenValue;
            console.log('Valeur directe du token:', filterValue);
        }
        
        if (!filterValue) {
            console.log('Aucune valeur à filtrer trouvée');
            continue;
        }
        
        // 3. Récupérer tous les éléments de la collection cible qui ont le champ configId
        const { data: targetMultiRefResults, error: targetMultiRefErr } = await supabase
            .from('collection_field_multireference')
            .select('collection_element_id, info_ref')
            .eq('id_config', configId);
            
        if (targetMultiRefErr || !targetMultiRefResults) {
            console.log('Erreur récupération multiRef collection cible:', targetMultiRefErr);
            continue;
        }
        
        console.log('Résultats multiRef trouvés dans collection cible:', targetMultiRefResults.length);
        
        // 4. Collecter tous les IDs référencés pour les récupérer en une seule requête
        const allRefIds = new Set();
        targetMultiRefResults.forEach(row => {
            let parsed;
            if (typeof row.info_ref === 'string') {
                try { parsed = JSON.parse(row.info_ref); } catch { return; }
            } else {
                parsed = row.info_ref || [];
            }
            
            if (Array.isArray(parsed)) {
                parsed.forEach(ref => {
                    if (!ref) return;
                    if (typeof ref === 'object' && ref.value) {
                        allRefIds.add(ref.value);
                    } else if (typeof ref !== 'object') {
                        allRefIds.add(ref);
                    }
                });
            }
        });
        
        // 5. Récupérer les éléments référencés avec leurs propriétés
        let refElementsMap = new Map();
        if (allRefIds.size > 0) {
            const { data: refElements, error: refErr } = await supabase
                .from('collection_element')
                .select('id, collection_element_name, collection_element_slug')
                .in('id', Array.from(allRefIds));
            
            if (!refErr && refElements) {
                refElements.forEach(element => {
                    refElementsMap.set(element.id, element);
                });
            }
        }
        
        console.log('Éléments référencés récupérés:', refElementsMap.size);
        
        // Debug: Afficher tous les éléments référencés
        console.log('Détail des éléments référencés:');
        refElementsMap.forEach((element, id) => {
            console.log(`  ID: ${id}, Name: ${element.collection_element_name}, Slug: ${element.collection_element_slug}`);
        });
        
        // 6. Filtrer les éléments qui correspondent à la valeur
        const matchingIds = [];
        for (const row of targetMultiRefResults) {
            let parsed;
            if (typeof row.info_ref === 'string') {
                try { parsed = JSON.parse(row.info_ref); } catch { continue; }
            } else {
                parsed = row.info_ref || [];
            }
            
            if (!Array.isArray(parsed)) continue;
            
            console.log(`Analyse de l'élément ${row.collection_element_id}, refs:`, parsed);
            
            // Vérifier si la valeur correspond
            let hasMatch = false;
            
            if (isTemplateMode && Array.isArray(filterValue)) {
                // Mode template avec références multiRef: comparer les références du template avec celles de l'élément
                hasMatch = filterValue.some(templateRef => {
                    if (!templateRef) return false;
                    
                    let templateRefId = null;
                    let templateRefLabel = null;
                    
                    if (typeof templateRef === 'object' && templateRef.value) {
                        templateRefId = templateRef.value;
                        templateRefLabel = templateRef.label;
                    } else if (typeof templateRef !== 'object') {
                        templateRefId = templateRef;
                    }
                    
                    console.log(`  Recherche de correspondance pour templateRef: ID=${templateRefId}, Label=${templateRefLabel}`);
                    
                    return parsed.some(ref => {
                        if (!ref) return false;
                        
                        let refId;
                        let refLabel = '';
                        if (typeof ref === 'object' && ref.value) {
                            refId = ref.value;
                            refLabel = ref.label || '';
                        } else if (typeof ref !== 'object') {
                            refId = ref;
                        } else {
                            return false;
                        }
                        
                        // Comparer les IDs directement
                        const idMatch = templateRefId && refId && templateRefId.toString() === refId.toString();
                        
                        // Comparer les labels si disponibles
                        const labelMatch = templateRefLabel && refLabel && 
                            templateRefLabel.toLowerCase() === refLabel.toLowerCase();
                        
                        console.log(`    Comparaison: templateRefId=${templateRefId} vs refId=${refId}, templateRefLabel="${templateRefLabel}" vs refLabel="${refLabel}", idMatch=${idMatch}, labelMatch=${labelMatch}`);
                        
                        return idMatch || labelMatch;
                    });
                });
            } else if (isTemplateMode && typeof filterValue === 'string') {
                // Mode template avec nom d'élément: chercher des éléments qui référencent un élément avec ce nom
                hasMatch = parsed.some(ref => {
                    if (!ref) return false;
                    
                    let refId;
                    if (typeof ref === 'object' && ref.value) {
                        refId = ref.value;
                    } else if (typeof ref !== 'object') {
                        refId = ref;
                    } else {
                        return false;
                    }
                    
                    // Récupérer l'élément référencé
                    const refElement = refElementsMap.get(refId);
                    if (!refElement) {
                        console.log(`  RefId ${refId} non trouvé dans refElementsMap`);
                        return false;
                    }
                    
                    // Comparer avec le nom de l'élément template
                    const filterValueLower = filterValue.toString().toLowerCase();
                    const elementName = (refElement.collection_element_name || '').toLowerCase();
                    const elementSlug = (refElement.collection_element_slug || '').toLowerCase();
                    const refLabel = (typeof ref === 'object' && ref.label ? ref.label.toLowerCase() : '');
                    
                    console.log(`  Comparaison nom template: filterValue="${filterValueLower}" vs elementName="${elementName}" vs elementSlug="${elementSlug}" vs refLabel="${refLabel}"`);
                    
                    let matches = false;
                    switch (operator) {
                        case 'equals':
                            matches = elementName === filterValueLower ||
                                   elementSlug === filterValueLower ||
                                   refLabel === filterValueLower;
                            break;
                        case 'notEquals':
                            matches = elementName !== filterValueLower &&
                                   elementSlug !== filterValueLower &&
                                   refLabel !== filterValueLower;
                            break;
                        case 'contains':
                            matches = elementName.includes(filterValueLower) ||
                                   elementSlug.includes(filterValueLower) ||
                                   refLabel.includes(filterValueLower);
                            break;
                        case 'starts':
                            matches = elementName.startsWith(filterValueLower) ||
                                   elementSlug.startsWith(filterValueLower) ||
                                   refLabel.startsWith(filterValueLower);
                            break;
                        case 'ends':
                            matches = elementName.endsWith(filterValueLower) ||
                                   elementSlug.endsWith(filterValueLower) ||
                                   refLabel.endsWith(filterValueLower);
                            break;
                        default:
                            matches = elementName === filterValueLower ||
                                   elementSlug === filterValueLower ||
                                   refLabel === filterValueLower;
                    }
                    
                    console.log(`  Match nom template: ${matches}`);
                    return matches;
                });
            } else {
                // Mode normal: logique originale
                hasMatch = parsed.some(ref => {
                    if (!ref) return false;
                    
                    let refId;
                    if (typeof ref === 'object' && ref.value) {
                        refId = ref.value;
                    } else if (typeof ref !== 'object') {
                        refId = ref;
                    } else {
                        return false;
                    }
                    
                    // Récupérer l'élément référencé
                    const refElement = refElementsMap.get(refId);
                    if (!refElement) {
                        console.log(`  RefId ${refId} non trouvé dans refElementsMap`);
                        return false;
                    }
                    
                    // Comparer avec la valeur à filtrer
                    const filterValueLower = filterValue.toString().toLowerCase();
                    const elementName = (refElement.collection_element_name || '').toLowerCase();
                    const elementSlug = (refElement.collection_element_slug || '').toLowerCase();
                    const refLabel = (typeof ref === 'object' && ref.label ? ref.label.toLowerCase() : '');
                    
                    console.log(`  Comparaison: filterValue="${filterValueLower}" vs elementName="${elementName}" vs elementSlug="${elementSlug}" vs refLabel="${refLabel}"`);
                    
                    let matches = false;
                    switch (operator) {
                        case 'equals':
                            matches = elementName === filterValueLower ||
                                   elementSlug === filterValueLower ||
                                   refLabel === filterValueLower;
                            break;
                        case 'notEquals':
                            matches = elementName !== filterValueLower &&
                                   elementSlug !== filterValueLower &&
                                   refLabel !== filterValueLower;
                            break;
                        case 'contains':
                            matches = elementName.includes(filterValueLower) ||
                                   elementSlug.includes(filterValueLower) ||
                                   refLabel.includes(filterValueLower);
                            break;
                        case 'starts':
                            matches = elementName.startsWith(filterValueLower) ||
                                   elementSlug.startsWith(filterValueLower) ||
                                   refLabel.startsWith(filterValueLower);
                            break;
                        case 'ends':
                            matches = elementName.endsWith(filterValueLower) ||
                                   elementSlug.endsWith(filterValueLower) ||
                                   refLabel.endsWith(filterValueLower);
                            break;
                        default:
                            matches = elementName === filterValueLower ||
                                   elementSlug === filterValueLower ||
                                   refLabel === filterValueLower;
                    }
                    
                    console.log(`  Match: ${matches}`);
                    return matches;
                });
            }
            
            console.log(`  Résultat final pour l'élément ${row.collection_element_id}: ${hasMatch}`);
            
            if (hasMatch) {
                matchingIds.push(row.collection_element_id);
            }
        }
        
        console.log('IDs correspondants trouvés:', matchingIds);
        
        // 7. Ajouter les IDs trouvés (ET logique entre les filtres)
        if (elementIds.size === 0) {
            matchingIds.forEach(id => elementIds.add(id));
        } else {
            const intersection = new Set();
            matchingIds.forEach(id => {
                if (elementIds.has(id)) intersection.add(id);
            });
            elementIds = intersection;
        }
    }
    
    return elementIds.size > 0 ? Array.from(elementIds) : [];
}

// Helper: récupère les collection_element_id filtrés via les champs switch
async function getFilteredElementIdsBySwitch({ supabase, targetCollectionIds, switchFilters, isTemplateMode = false, templateCollectionId = null, templateElementId = null }) {
    if (Object.keys(switchFilters).length === 0) return null;
    
    let elementIds = new Set();
    
    for (const [configId, filterConfig] of Object.entries(switchFilters)) {
        console.log('Traitement du filtre switch pour configId:', configId, 'filterConfig:', filterConfig, 'Mode template:', isTemplateMode);
        
        // 1. Extraire l'opérateur et la valeur depuis le token
        let operator = 'equals';
        let tokenValue = null;
        
        if (typeof filterConfig === 'object' && filterConfig.operator) {
            operator = filterConfig.operator;
            tokenValue = filterConfig.value;
        } else {
            tokenValue = filterConfig;
        }
        
        console.log('Valeur du token switch:', tokenValue, 'Opérateur:', operator);
        
        // 2. Récupérer la valeur finale à filtrer
        let filterValue = null;
        
        if (isTemplateMode && templateCollectionId && templateElementId) {
            // Mode template: récupérer la valeur du champ switch de l'élément template
            console.log('Mode template: récupération de la valeur du champ switch', configId, 'depuis l\'élément template', templateElementId);
            
            const { data: templateSwitch, error: templateSwitchErr } = await supabase
                .from('collection_field_switch')
                .select('value')
                .eq('id_config', configId)
                .eq('collection_element_id', templateElementId)
                .maybeSingle();
                
            if (templateSwitchErr) {
                console.log('Erreur lors de la récupération du champ switch template:', templateSwitchErr);
                continue;
            }
            
            if (templateSwitch === null || templateSwitch.value === undefined) {
                console.log('Élément template n\'a pas de valeur pour le champ switch', configId, '- pas de filtrage pour ce champ');
                continue;
            }
            
            filterValue = templateSwitch.value;
            console.log('Valeur switch extraite du template:', filterValue);
        } else {
            // Mode normal: utiliser la valeur du token
            filterValue = tokenValue;
            console.log('Valeur switch directe du token:', filterValue);
        }
        
        if (filterValue === null || filterValue === undefined) {
            console.log('Aucune valeur switch à filtrer trouvée');
            continue;
        }
        
        // Convertir la valeur en booléen
        const boolValue = filterValue === true || filterValue === 'true' || filterValue === 1 || filterValue === '1';
        console.log('Valeur switch convertie en booléen:', boolValue);
        
        // 3. Récupérer les collection_element_id qui matchent cette valeur selon l'opérateur
        let switchQuery = supabase
            .from('collection_field_switch')
            .select('collection_element_id')
            .eq('id_config', configId);
            
        // Appliquer les filtres selon l'opérateur
        switch (operator) {
            case 'equals':
                switchQuery = switchQuery.eq('value', boolValue);
                break;
            case 'notEquals':
                switchQuery = switchQuery.neq('value', boolValue);
                break;
            default:
                switchQuery = switchQuery.eq('value', boolValue);
        }
        
        const { data: switchResults, error: switchErr } = await switchQuery;
        if (switchErr || !switchResults) {
            console.log('Erreur ou pas de résultats switch:', switchErr);
            continue;
        }
        
        console.log('Résultats switch trouvés:', switchResults.length);
        
        let matchingIds = switchResults.map(r => r.collection_element_id);
        console.log('IDs switch correspondants:', matchingIds);
        
        if (elementIds.size === 0) {
            // Premier filtre : ajouter tous les IDs
            matchingIds.forEach(id => elementIds.add(id));
        } else {
            // Filtres suivants : intersection (ET logique)
            const intersection = new Set();
            matchingIds.forEach(id => {
                if (elementIds.has(id)) intersection.add(id);
            });
            elementIds = intersection;
        }
    }
    
    return elementIds.size > 0 ? Array.from(elementIds) : [];
}

// Helper: applique le tri dynamique sur les éléments
async function applySortsToElements({ supabase, targetCollectionIds, elements, sorts }) {
    if (!sorts || Object.keys(sorts).length === 0 || !elements || elements.length === 0) {
        return elements;
    }


    // Récupérer les configs pour identifier les types de champs
    let allConfigs = [];
    if (targetCollectionIds.length > 0) {
        const { data: configs, error: configErr } = await supabase
            .from('collection_config')
            .select('id, tab_field, name_field')
            .in('collection_id', targetCollectionIds);
        if (!configErr && configs) {
            allConfigs = configs;
        }
    }

    const configMap = new Map(allConfigs.map(c => [c.id?.toString(), { tab_field: c.tab_field, name_field: c.name_field }]));

    // Collecter les valeurs de tri pour chaque élément
    const sortValuesMap = new Map(); // elementId => { sortKey: value }

    for (const [sortKey, sortConfig] of Object.entries(sorts)) {
        const { order: sortOrder = 'asc' } = sortConfig;
        const configInfo = configMap.get(sortKey);

        if (!configInfo) {
            // Tri sur une colonne de base ou alias
            if (sortKey === 'title') {
                elements.forEach(el => {
                    if (!sortValuesMap.has(el.id)) sortValuesMap.set(el.id, {});
                    sortValuesMap.get(el.id)[sortKey] = el.collection_element_name || '';
                });
            } else if (sortKey === 'slug') {
                elements.forEach(el => {
                    if (!sortValuesMap.has(el.id)) sortValuesMap.set(el.id, {});
                    sortValuesMap.get(el.id)[sortKey] = el.collection_element_slug || '';
                });
            } else {
                // Colonne de base
                elements.forEach(el => {
                    if (!sortValuesMap.has(el.id)) sortValuesMap.set(el.id, {});
                    sortValuesMap.get(el.id)[sortKey] = el[sortKey] || '';
                });
            }
            continue;
        }

        // Tri sur un champ dynamique
        if (configInfo.tab_field === 'text') {
            const { data: textValues, error: textErr } = await supabase
                .from('collection_field_text')
                .select('collection_element_id, text')
                .eq('id_config', sortKey)
                .in('collection_element_id', elements.map(e => e.id));

            if (!textErr && textValues) {
                const textMap = new Map(textValues.map(t => [t.collection_element_id, t.text || '']));
                elements.forEach(el => {
                    if (!sortValuesMap.has(el.id)) sortValuesMap.set(el.id, {});
                    sortValuesMap.get(el.id)[sortKey] = textMap.get(el.id) || '';
                });
            }
        } else if (configInfo.tab_field === 'multiReference') {
            const { data: multiRefValues, error: multiRefErr } = await supabase
                .from('collection_field_multireference')
                .select('collection_element_id, info_ref')
                .eq('id_config', sortKey)
                .in('collection_element_id', elements.map(e => e.id));

            if (!multiRefErr && multiRefValues) {
                // Collecter les IDs référencés
                const allRefIds = new Set();
                multiRefValues.forEach(row => {
                    let parsed;
                    if (typeof row.info_ref === 'string') {
                        try { parsed = JSON.parse(row.info_ref); } catch { return; }
                    } else {
                        parsed = row.info_ref || [];
                    }

                    if (Array.isArray(parsed)) {
                        parsed.forEach(ref => {
                            if (ref && typeof ref === 'object' && ref.value) {
                                allRefIds.add(ref.value);
                            }
                        });
                    }
                });

                // Récupérer les noms des éléments référencés
                let refElementsMap = new Map();
                if (allRefIds.size > 0) {
                    const { data: refElements, error: refErr } = await supabase
                        .from('collection_element')
                        .select('id, collection_element_name')
                        .in('id', Array.from(allRefIds));

                    if (!refErr && refElements) {
                        refElements.forEach(element => {
                            refElementsMap.set(element.id, element.collection_element_name || '');
                        });
                    }
                }

                // Construire les valeurs de tri (concaténation des noms triés alphabétiquement)
                multiRefValues.forEach(row => {
                    let parsed;
                    if (typeof row.info_ref === 'string') {
                        try { parsed = JSON.parse(row.info_ref); } catch { return; }
                    } else {
                        parsed = row.info_ref || [];
                    }

                    const refNames = [];
                    if (Array.isArray(parsed)) {
                        parsed.forEach(ref => {
                            if (ref && typeof ref === 'object' && ref.value) {
                                const refName = refElementsMap.get(ref.value);
                                if (refName) refNames.push(refName);
                            }
                        });
                    }

                    const sortValue = refNames.sort().join(' | ');
                    if (!sortValuesMap.has(row.collection_element_id)) {
                        sortValuesMap.set(row.collection_element_id, {});
                    }
                    sortValuesMap.get(row.collection_element_id)[sortKey] = sortValue;
                });
            }
        }
    }

    // Appliquer le tri
    const sortedElements = [...elements].sort((a, b) => {
        for (const [sortKey, sortConfig] of Object.entries(sorts)) {
            const { order: sortOrder = 'asc' } = sortConfig;
            const ascending = sortOrder === 'asc';

            const aValues = sortValuesMap.get(a.id) || {};
            const bValues = sortValuesMap.get(b.id) || {};

            const aValue = (aValues[sortKey] || '').toString().toLowerCase();
            const bValue = (bValues[sortKey] || '').toString().toLowerCase();

            if (aValue < bValue) return ascending ? -1 : 1;
            if (aValue > bValue) return ascending ? 1 : -1;
            // Si égalité, continuer avec le prochain critère de tri
        }
        return 0;
    });

    return sortedElements;
}

// Helper: applique les filtres au niveau base de données quand possible
async function applyFiltersAtDbLevel({ supabase, targetCollectionIds, filters, baseColumns, colone, ascending, limit, offset = 0, sorts = {}, templateCollectionId = null, templateElementId = null }) {
    // Vérifier si filters est un array (nouveau format) ou un objet (ancien format)
    let filterArray = [];
    if (Array.isArray(filters)) {
        filterArray = filters;
    } else if (filters && typeof filters === 'object') {
        // Convertir l'ancien format objet en array pour compatibilité
        filterArray = Object.entries(filters).map(([key, value]) => ({
            field: key,
            operator: 'equals',
            value: value
        }));
    }
    
    if (filterArray.length === 0) {
        // Pas de filtres, récupérer tous les éléments
        let query = supabase
            .from('collection_element')
            .select('*')
            .eq('collection_element_status_text', "publish")
        
        if (colone && baseColumns.has(colone)) {
            query = query.order(colone, { ascending });
        }
        
        if (targetCollectionIds.length > 0) {
            if (targetCollectionIds.length === 1) {
                query = query.eq('collection_id', targetCollectionIds[0]);
            } else {
                query = query.in('collection_id', targetCollectionIds);
            }
        }
        
        if (limit && colone && baseColumns.has(colone)) query = query.limit(limit);
        
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }
    
    // Séparer les filtres par type : base columns, text, multiReference, switch
    const baseFilters = {};
    const textFilters = {};
    const multiRefFilters = {};
    const switchFilters = {};
    
    // Récupérer les configs pour identifier les types de champs dynamiques
    let allConfigs = [];
    let configCollectionIds = targetCollectionIds;
    
    // En mode template, récupérer les configs des deux collections : template ET cible
    if (templateCollectionId) {
        configCollectionIds = [...targetCollectionIds, templateCollectionId];
        console.log('Mode template: récupération des configs depuis les collections cible ET template:', configCollectionIds);
    }
    
    if (configCollectionIds.length > 0) {
        const { data: configs, error: configErr } = await supabase
            .from('collection_config')
            .select('id, tab_field')
            .in('collection_id', configCollectionIds);
        if (!configErr && configs) {
            allConfigs = configs;
        }
    }

    console.log('Filtres normalisés :', filterArray);
    console.log('Template Collection ID :', templateCollectionId);
    
    // Si mode template, log pour debugging
    if (templateCollectionId) {
        console.log('Mode template activé avec collection:', templateCollectionId);
    }
    
    const configMap = new Map(allConfigs.map(c => [c.id?.toString(), c.tab_field]));
    console.log('ConfigMap créée avec', configMap.size, 'entrées:', Array.from(configMap.entries()));
    
    // Classifier les filtres par type directement avec les IDs
    for (const filter of filterArray) {
        const { field, operator = 'equals', value } = filter;
        
        // Dans le nouveau format, 'field' contient directement l'ID de la config
        const fieldId = field.toString(); // S'assurer que c'est une string pour la Map
        
        if (baseColumns.has(field)) {
            baseFilters[field] = value;
            console.log(`Champ de base ${field}: valeur = ${value}`);
        } else {
            const fieldType = configMap.get(fieldId);
            console.log(`Champ ${fieldId}: type trouvé dans collection_config = ${fieldType}`);
            
            if (fieldType === 'text') {
                textFilters[fieldId] = { operator, value };
            } else if (fieldType === 'multiReference') {
                multiRefFilters[fieldId] = { operator, value };
            } else if (fieldType === 'switch') {
                switchFilters[fieldId] = { operator, value };
            } else {
                // En mode template, même si le type n'est pas trouvé, 
                // on peut avoir des valeurs spéciales comme 'collection_element_name'
                if (templateCollectionId && (
                    value === 'collection_element_name' || 
                    value === 'collection_element_slug' || 
                    value === 'collection_element_publish_date' ||
                    (typeof value === 'string' && value.includes('collection_element_'))
                )) {
                    // C'est un filtrage par champ de base via template
                    console.log(`Mode template: filtrage par champ de base via template pour ${fieldId}, valeur = ${value}`);
                    
                    // Déterminer si c'est un champ text ou multiReference selon le fieldType trouvé ou par défaut
                    if (fieldType === 'multiReference') {
                        multiRefFilters[fieldId] = { operator, value };
                    } else {
                        // Par défaut, traiter comme text pour les champs de base
                        textFilters[fieldId] = { operator, value };
                    }
                } else {
                    console.log(`Type de champ non géré pour ${fieldId}: ${fieldType} (configs disponibles: ${Array.from(configMap.keys()).join(', ')})`);
                }
            }
            // Les autres types sont ignorés pour le moment
        }
    }
    
    console.log('Filtres classifiés:', { baseFilters, textFilters, multiRefFilters, switchFilters });
    
    // Récupérer les IDs filtrés par les champs text
    const textFilteredIds = await getFilteredElementIdsByText({ 
        supabase, 
        targetCollectionIds: templateCollectionId ? [templateCollectionId] : targetCollectionIds, 
        textFilters,
        isTemplateMode: !!templateCollectionId,
        templateCollectionId,
        templateElementId
    });
    
    // Récupérer les IDs filtrés par les champs multiReference  
    const multiRefFilteredIds = await getFilteredElementIdsByMultiRef({ 
        supabase, 
        targetCollectionIds: templateCollectionId ? [templateCollectionId] : targetCollectionIds, 
        multiRefFilters,
        isTemplateMode: !!templateCollectionId,
        templateCollectionId,
        templateElementId
    });
    
    // 🔷 Filtrage des éléments via les champs switch
    const switchFilteredIds = await getFilteredElementIdsBySwitch({ 
        supabase, 
        targetCollectionIds: templateCollectionId ? [templateCollectionId] : targetCollectionIds, 
        switchFilters,
        isTemplateMode: !!templateCollectionId,
        templateCollectionId,
        templateElementId
    });
    
    // Calculer l'intersection des IDs si plusieurs types de filtres dynamiques
    let dynamicFilteredIds = null;
    if (textFilteredIds !== null && multiRefFilteredIds !== null && switchFilteredIds !== null) {
        // Intersection des trois ensembles
        const textSet = new Set(textFilteredIds);
        const multiRefSet = new Set(multiRefFilteredIds);
        dynamicFilteredIds = switchFilteredIds.filter(id => textSet.has(id) && multiRefSet.has(id));
    } else if (textFilteredIds !== null && multiRefFilteredIds !== null) {
        // Intersection des deux ensembles
        const textSet = new Set(textFilteredIds);
        dynamicFilteredIds = multiRefFilteredIds.filter(id => textSet.has(id));
    } else if (textFilteredIds !== null && switchFilteredIds !== null) {
        // Intersection text et switch
        const textSet = new Set(textFilteredIds);
        dynamicFilteredIds = switchFilteredIds.filter(id => textSet.has(id));
    } else if (multiRefFilteredIds !== null && switchFilteredIds !== null) {
        // Intersection multiRef et switch
        const multiRefSet = new Set(multiRefFilteredIds);
        dynamicFilteredIds = switchFilteredIds.filter(id => multiRefSet.has(id));
    } else if (textFilteredIds !== null) {
        dynamicFilteredIds = textFilteredIds;
    } else if (multiRefFilteredIds !== null) {
        dynamicFilteredIds = multiRefFilteredIds;
    } else if (switchFilteredIds !== null) {
        dynamicFilteredIds = switchFilteredIds;
    }
    
    // Construire la requête finale sur collection_element
    let query = supabase
        .from('collection_element')
        .select('*')
        .eq('collection_element_status_text', "publish")
    
    if (targetCollectionIds.length > 0) {
        if (targetCollectionIds.length === 1) {
            query = query.eq('collection_id', targetCollectionIds[0]);
        } else {
            query = query.in('collection_id', targetCollectionIds);
        }
    }
    
    // Appliquer les filtres sur colonnes de base
    for (const [key, value] of Object.entries(baseFilters)) {
        if (Array.isArray(value)) {
            query = query.in(key, value);
        } else {
            query = query.eq(key, value);
        }
    }
    
    // Appliquer le filtre sur les IDs issus des champs dynamiques
    if (dynamicFilteredIds !== null) {
        if (dynamicFilteredIds.length === 0) {
            // Aucun élément ne correspond aux filtres dynamiques
            return [];
        }
        query = query.in('id', dynamicFilteredIds);
    }
    
    // Appliquer le tri et la limite si possible
    const hasDynamicSorts = sorts && Object.keys(sorts).length > 0;
    
    if (!hasDynamicSorts && colone && baseColumns.has(colone)) {
        query = query.order(colone, { ascending });
        if (offset && offset > 0) {
            query = query.range(offset, offset + (limit || 1000) - 1);
        } else if (limit) {
            query = query.limit(limit);
        }
    }
    
    const { data: results, error } = await query;
    if (error) throw error;
    
    let finalResults = results || [];
    
    // Appliquer le tri dynamique si nécessaire
    if (hasDynamicSorts) {
        finalResults = await applySortsToElements({
            supabase,
            targetCollectionIds,
            elements: finalResults,
            sorts
        });
        
        // Appliquer l'offset et la limite après le tri dynamique
        if (offset && offset > 0) {
            finalResults = finalResults.slice(offset, offset + (limit || finalResults.length));
        } else if (limit && finalResults.length > limit) {
            finalResults = finalResults.slice(0, limit);
        }
    } else if (!baseColumns.has(colone)) {
        // Si pas de tri dynamique mais la colonne n'est pas dans baseColumns,
        // appliquer quand même l'offset et la limite en mémoire
        if (offset && offset > 0) {
            finalResults = finalResults.slice(offset, offset + (limit || finalResults.length));
        } else if (limit && finalResults.length > limit) {
            finalResults = finalResults.slice(0, limit);
        }
    }
    
    return finalResults;
}

// Récupérer les infos d'une page de blog (collection_element)
router.get('/sendBlogInfo', apiKeyMiddleware, async (req, res) => {
    const id_blog_page = req.id_data;
    try {
        const { data, error } = await supabase
            .from('collection_element')
            .select('*')
            .eq('id', id_blog_page)
            .maybeSingle();
        if (error) throw error;
        if (!data) return res.status(403).json({ message: 'Aucun blog trouvé' });
        return res.json({ blog: [data] });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});


// Récupérer le slug d'un blog (collection)
router.get('/sendBlogSlug', apiKeyMiddleware, async (req, res) => {
    const id_blog = req.id_data;
    
    try {
        const { data, error } = await supabase
            .from('collection')
            .select('collection_slug')
            .eq('id', id_blog)
            .maybeSingle();
        if (error) throw error;
        if (!data) return res.status(403).json({ message: 'Aucun blog trouvé' });
        return res.json({ slug: data.collection_slug });
    } catch (err) {
        console.error('Erreur lors de la récupération du slug du blog :', err);
        res.status(500).send({ error: err.message });
    }
});


// Récupérer les infos d'une page de blog par slug
router.get('/sendBlogInfoSlug', apiKeyMiddleware, async (req, res) => {
    const slug = req.headers.slug;
    let id_blog = req.headers.id_blog;
    if (typeof id_blog === 'string' && id_blog.includes(',')) {
        id_blog = id_blog.split(',').map(id => id.trim());
    } else {
        id_blog = [id_blog];
    }
    try {
        const { data, error } = await supabase
            .from('collection_element')
            .select('*')
            .eq('collection_element_slug', slug)
            .in('collection_id', id_blog);
        if (error) throw error;
        if (!data || data.length === 0) return res.status(403).json({ message: 'Aucun blog trouvé' });
        return res.json({ blog: data });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});

// RichText d'une page de blog (collection)
router.get('/sendBlogRichText', apiKeyMiddleware, async (req, res) => {
    const id_blog_page = req.id_data;
    try {
        const { data, error } = await supabase
            .from('collection_field_richtext')
            .select('id_config, text_json')
            .eq('collection_element_id', id_blog_page);
        if (error) throw error;
        if (!data || data.length === 0) return res.status(200).json({ message: 'Aucun texte riche trouvé' });
        const convertedResults = data.map(result => {
            if (!result.text_json) return { id_config: result.id_config, text_html: '' };
            let rawContent;
            if (typeof result.text_json === 'string') {
                try {
                    rawContent = JSON.parse(result.text_json);
                } catch (e) {
                    console.error('Erreur lors du parsing JSON sendBlogRichText:', e, result.text_json);
                    return { id_config: result.id_config, text_html: '' };
                }
            } else {
                rawContent = result.text_json;
            }
            const contentState = convertFromRaw(rawContent);
            const html = stateToHTML(contentState, {
                entityStyleFn: (entity) => {
                    const entityType = entity.getType();
                    if (entityType === 'IMAGE') {
                        // Pour toutes les images, laisser Draft.js générer seulement la figure automatique
                        return undefined;
                    }
                    if (entityType === 'LINK') {
                        const data = entity.getData();
                        return {
                            element: 'a',
                            attributes: {
                                href: data.url,
                                target: '_blank',
                                rel: 'noopener noreferrer'
                            }
                        };
                    }
                    return undefined;
                },
                blockRenderers: {
                    atomic: (block) => {
                        const entityKey = block.getEntityAt(0);
                        if (entityKey) {
                            const entity = contentState.getEntity(entityKey);
                            if (entity.getType() === 'EMBED') {
                                const data = entity.getData();
                                return data.html || '';
                            }
                        }
                        return undefined;
                    }
                }
            });
            return { id_config: result.id_config, text_html: html };
        });
        return res.json({ richText: convertedResults });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});

// Textes d'une page de blog (collection)
router.get('/sendBlogText', apiKeyMiddleware, async (req, res) => {
    const id_blog_page = req.id_data;
    try {
        const { data, error } = await supabase
            .from('collection_field_text')
            .select('id_config, text')
            .eq('collection_element_id', id_blog_page);
        if (error) throw error;
        if (!data || data.length === 0) return res.status(200).json({ message: 'Aucun texte trouvé' });
        return res.json({ text: data });
    } catch (err) {
        console.error('Erreur lors de la récupération des textes de la page de blog :', err);
        res.status(500).send({ error: err.message });
    }
});

// Images d'une page de blog (collection)
router.get('/sendBlogImage', apiKeyMiddleware, async (req, res) => {
    const id_blog_page = req.id_data;
    try {
        const { data, error } = await supabase
            .from('collection_field_image')
            .select('id_config, src_image, alt_image')
            .eq('collection_element_id', id_blog_page);
        if (error) throw error;
        if (!data || data.length === 0) return res.status(200).json({ message: 'Aucune image trouvée' });
        // Générer les URLs publiques Supabase pour chaque image
        const images = data.map(image => {
            // Si l'image a déjà une URL complète, l'utiliser directement
            let imageUrl = image.src_image;
            if (!image.src_image.startsWith('http')) {
                const { data: publicUrlData } = supabase.storage
                    .from('collection-images')
                    .getPublicUrl(image.src_image);
                imageUrl = publicUrlData?.publicUrl || '';
            }
            return {
                id_config: image.id_config,
                alt_image: image.alt_image,
                url: imageUrl
            };
        });
        return res.json({ images });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});

// Infos images d'une page de blog (collection)
router.get('/sendBlogInfoImage', apiKeyMiddleware, async (req, res) => {
    const id_blog_page = req.id_data;
    try {
        const { data, error } = await supabase
            .from('collection_field_image')
            .select('id_config, src_image, alt_image')
            .eq('collection_element_id', id_blog_page);
        if (error) throw error;
        if (!data || data.length === 0) return res.status(200).json({ message: 'Aucune image trouvée' });
        return res.json({ images: data });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});

// Gallery d'une page de blog (collection)
router.get('/sendBlogInfoGallery', apiKeyMiddleware, async (req, res) => {
    const id_blog_page = req.id_data;
    try {
        const { data, error } = await supabase
            .from('collection_field_gallery')
            .select('id_config, gallery')
            .eq('collection_element_id', id_blog_page);
        if (error) throw error;
        if (!data || data.length === 0) return res.status(200).json({ message: 'Aucune gallery trouvée' });
        return res.json({ gallery: data });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});

// Vidéos d'une page de blog (collection)
router.get('/sendBlogVideo', apiKeyMiddleware, async (req, res) => {
    const id_blog_page = req.id_data;
    try {
        const { data, error } = await supabase
            .from('collection_field_video')
            .select('id_config, src_video')
            .eq('collection_element_id', id_blog_page);
        if (error) throw error;
        if (!data || data.length === 0) return res.status(200).json({ message: 'Aucune vidéo trouvée' });
        return res.json({ video: data });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});

// MultiReference d'une page de blog (collection)
router.get('/sendMultiReference', apiKeyMiddleware, async (req, res) => {
    const id_blog_page = req.id_data;
    try {
        const { data, error } = await supabase
            .from('collection_field_multireference')
            .select('id_config, info_ref')
            .eq('collection_element_id', id_blog_page);
        if (error) throw error;
        if (!data || data.length === 0) return res.status(200).json({ message: 'Aucune référence trouvée' });
        // Parse chaque référence et ajoute id_config à chaque objet
        const references = data.flatMap(result => {
            const parsedRefs = JSON.parse(result.info_ref);
            return parsedRefs.map(ref => ({ ...ref, id_config: result.id_config }));
        });
        return res.json({ references });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});

// Blog content (tous les champs dynamiques d'une page de collection)
router.get('/sendBlogContent', apiKeyMiddleware, async (req, res) => {
    const id_blog_page = req.headers.id_blog_page;
    const id_blog = req.headers.id_blog;

    
    
    try {
        // Récupérer la config des champs dynamiques
        const { data: configData, error: configError } = await supabase
            .from('collection_config')
            .select('tab_field, id')
            .eq('collection_id', id_blog);
        if (configError) {
            console.error('Erreur lors de la récupération de la config des champs dynamiques :', configError);
            return res.status(500).send({ error: configError.message });
        }


        if (!configData || configData.length === 0) return res.status(200).json({ message: 'Aucun contenu trouvé' });
        // Pour chaque champ, récupérer la data correspondante
        const contentPromises = configData.map(async (field) => {
            switch (field.tab_field) {
                case 'text': {
                    const { data, error } = await supabase
                        .from('collection_field_text')
                        .select('id_config, text')
                        .eq('collection_element_id', id_blog_page)
                        .eq('id_config', field.id);

                    if (error) {
                     console.error('Erreur lors de la récupération des blogs :', error.message);
                     // Tu peux aussi afficher un message à l'utilisateur ou gérer l'erreur autrement
                     return;
                    }
                    return { type: 'text', data };
                }
                case 'richText': {
                    const { data } = await supabase
                        .from('collection_field_richtext')
                        .select('id_config, text_json')
                        .eq('collection_element_id', id_blog_page)
                        .eq('id_config', field.id);
                    const convertedResults = (data || []).map(result => {
                        if (!result.text_json) return { id_config: result.id_config, text_html: '' };
                        let rawContent;
                        if (typeof result.text_json === 'string') {
                            try {
                                rawContent = JSON.parse(result.text_json);
                            } catch (e) {
                                console.error('Erreur lors du parsing JSON richText:', e, result.text_json);
                                return { id_config: result.id_config, text_html: '' };
                            }
                        } else {
                            rawContent = result.text_json;
                        }
                        const contentState = convertFromRaw(rawContent);
                        const html = stateToHTML(contentState, {
                            entityStyleFn: (entity) => {
                                const entityType = entity.getType();
                                if (entityType === 'IMAGE') {
                                    // Pour toutes les images, laisser Draft.js générer seulement la figure automatique
                                    return undefined;
                                }
                                if (entityType === 'LINK') {
                                    const data = entity.getData();
                                    return {
                                        element: 'a',
                                        attributes: {
                                            href: data.url,
                                            target: '_blank',
                                            rel: 'noopener noreferrer'
                                        }
                                    };
                                }
                                return undefined;
                            },
                            blockRenderers: {
                                atomic: (block) => {
                                    const entityKey = block.getEntityAt(0);
                                    if (entityKey) {
                                        const entity = contentState.getEntity(entityKey);
                                        if (entity.getType() === 'EMBED') {
                                            const data = entity.getData();
                                            return data.html || '';
                                        }
                                    }
                                    return undefined;
                                }
                            }
                        });
                        return { id_config: result.id_config, text_html: html };
                    });
                    return { type: 'richText', data: convertedResults };
                }
                case 'image': {
                    const { data } = await supabase
                        .from('collection_field_image')
                        .select('id_config, src_image, alt_image')
                        .eq('collection_element_id', id_blog_page)
                        .eq('id_config', field.id);
                    const images = (data || []).map(image => {
                        // Si l'image a déjà une URL complète, l'utiliser directement
                        let imageUrl = image.src_image;
                        if (!image.src_image.startsWith('http')) {
                            const { data: publicUrlData } = supabase.storage
                                .from('collection-images')
                                .getPublicUrl(image.src_image);
                            imageUrl = publicUrlData?.publicUrl || '';
                        }
                        return {
                            id_config: image.id_config,
                            alt_image: image.alt_image,
                            url: imageUrl
                        };
                        
                    });
                    return { type: 'image', data: images };

                }
                case 'video': {
                    const { data, error } = await supabase
                        .from('collection_field_video')
                        .select('id_config, src_video')
                        .eq('collection_element_id', id_blog_page)
                        .eq('id_config', field.id);

                    if (error) {
                        console.error('Erreur lors de la récupération des vidéos :', error.message);
                        return;
                    }
                    return { type: 'video', data };
                }
                case 'gallery': {
                    const { data, error } = await supabase
                        .from('collection_field_gallery')
                        .select('id_config, gallery')
                        .eq('collection_element_id', id_blog_page)
                        .eq('id_config', field.id);
                    if (error) {
                        console.error('Erreur lors de la récupération de la gallery :', error.message);
                        return;
                    }
                    return { type: 'gallery', data };
                }
                case 'multiReference': {
                   // 1. Récupérer la ligne multireference
                   const { data: multiRefRow } = await supabase
                       .from('collection_field_multireference')
                       .select('id_config, info_ref')
                       .eq('collection_element_id', id_blog_page)
                       .eq('id_config', field.id)
                       .maybeSingle();

                   let references = [];
                   if (multiRefRow && multiRefRow.info_ref) {
                        let parsedRefs;
                        if (typeof multiRefRow.info_ref === 'string') {
                            try {
                                parsedRefs = JSON.parse(multiRefRow.info_ref); // tableau d'objets { label, value }
                            } catch (e) {
                                console.error('Erreur lors du parsing JSON multiReference:', e, multiRefRow.info_ref);
                                parsedRefs = [];
                            }
                        } else {
                            parsedRefs = multiRefRow.info_ref;
                        }

                        const values = Array.isArray(parsedRefs) ? parsedRefs.map(ref => ref.value).filter(Boolean) : [];

                        let elementRows = [];
                        if (values.length > 0) {
                            const { data: elementData, error: elementErr } = await supabase
                                .from('collection_element')
                                .select('id, collection_id')
                                .in('id', values);
                            if (elementErr) {
                                console.error('Erreur récupération collection_id multiReference:', elementErr.message);
                            } else {
                                elementRows = elementData || [];
                            }
                        }

                        const idToCollectionId = new Map(elementRows.map(r => [r.id, r.collection_id]));
                        const uniqueCollectionIds = Array.from(new Set(elementRows.map(r => r.collection_id).filter(Boolean)));

                        // 2. Récupérer toutes les configs 'text' pour les collections concernées
                        let textConfigs = [];
                        if (uniqueCollectionIds.length > 0) {
                            const { data: cfgData, error: cfgErr } = await supabase
                                .from('collection_config')
                                .select('id, collection_id, name_field, tab_field')
                                .in('collection_id', uniqueCollectionIds)
                                .eq('tab_field', 'text');
                            if (cfgErr) {
                                console.error('Erreur récupération configs text multiReference:', cfgErr.message);
                            } else {
                                textConfigs = cfgData || [];
                            }
                        }

                        const textConfigIds = textConfigs.map(c => c.id);
                        const configIdToName = new Map(textConfigs.map(c => [c.id, c.name_field]));

                        // 3. Récupérer les valeurs texte pour tous les éléments référencés
                        let elementTextsMap = new Map(); // element_id -> { fieldName: text }
                        if (values.length > 0 && textConfigIds.length > 0) {
                            const { data: textVals, error: textValsErr } = await supabase
                                .from('collection_field_text')
                                .select('collection_element_id, id_config, text')
                                .in('collection_element_id', values)
                                .in('id_config', textConfigIds);
                            if (textValsErr) {
                                console.error('Erreur récupération textes multiReference:', textValsErr.message);
                            } else if (textVals) {
                                textVals.forEach(row => {
                                    if (!elementTextsMap.has(row.collection_element_id)) {
                                        elementTextsMap.set(row.collection_element_id, {});
                                    }
                                    const nameField = configIdToName.get(row.id_config);
                                    if (nameField) {
                                        elementTextsMap.get(row.collection_element_id)[nameField] = row.text || '';
                                    }
                                });
                            }
                        }

                        // 4. Construire la réponse enrichie
                        references = parsedRefs.map(ref => {
                            const elId = ref.value;
                            return {
                                ...ref,
                                id_config: multiRefRow.id_config,
                                collection_id: idToCollectionId.get(elId) || null,
                                texts: elementTextsMap.get(elId) || {}
                            };
                        });
                   }
                   return { type: 'multiReference', data: references };
                }
                default:
                    return { type: field.tab_field, data: [] };
            }
        });
        
        const contentResults = await Promise.all(contentPromises);
        
        const combinedResults = contentResults.reduce((acc, result) => {
            if (!acc[result.type]) {
                acc[result.type] = [];
            }
            acc[result.type] = acc[result.type].concat(result.data || []);
            return acc;
        }, {});
        return res.json({ content: combinedResults });
    } catch (err) {
        console.error('Erreur lors de la récupération du contenu du blog :', err);
        res.status(500).send({ error: err.message });
    }
});

//------------------- API pour les pages -------------------//

// PAGE : Utilise Supabase (structure inchangée)
router.get('/sendPage', apiKeyMiddleware, async (req, res) => {
    const id = req.id_data;
    try {
        const { data, error } = await supabase
            .from('page')
            .select('*')
            .eq('id_page', id)
            .maybeSingle();
        if (error) throw error;
        if (!data) return res.status(403).json({ message: 'Aucune page trouvée' });
        return res.json({ page: [data] });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});

router.get('/sendPageImage', apiKeyMiddleware, async (req, res) => {
    const id = req.id_data;
    console.log('ID de la page:', id);

    try {
        const { data, error } = await supabase
            .from('page_photo')
            .select('id_config, src_image, alt_image')
            .eq('id_page', id);
        if (error) throw error;
        if (!data || data.length === 0) return res.status(200).json({ message: 'Aucune image trouvée' });
        return res.json({ images: data });
    } catch (err) {
        console.error('Erreur lors de la récupération des images de la page :', err);
        res.status(500).send({ error: err.message });
    }
});

router.get('/sendPageRichText', apiKeyMiddleware, async (req, res) => {
    const id = req.id_data;
    console.log('ID de la page pour RichText:', id);
    try {
        const { data, error } = await supabase
            .from('page_richtext')
            .select('id_config, text_json')
            .eq('id_page', id);
        if (error) throw error;
        if (!data || data.length === 0) return res.status(200).json({ message: 'Aucun texte riche trouvé' });
        const convertedResults = data.map(result => {
            if (!result.text_json) return { id_config: result.id_config, text_html: '' };
            let rawContent;
            if (typeof result.text_json === 'string') {
                try {
                    rawContent = JSON.parse(result.text_json);
                } catch (e) {
                    console.error('Erreur lors du parsing JSON sendPageRichText:', e, result.text_json);
                    return { id_config: result.id_config, text_html: '' };
                }
            } else {
                rawContent = result.text_json;
            }
            const contentState = convertFromRaw(rawContent);
            const html = stateToHTML(contentState, {
                entityStyleFn: (entity) => {
                    const entityType = entity.getType();
                    if (entityType === 'IMAGE') {
                        // Pour toutes les images, laisser Draft.js générer seulement la figure automatique
                        return undefined;
                    }
                    if (entityType === 'LINK') {
                        const data = entity.getData();
                        return {
                            element: 'a',
                            attributes: {
                                href: data.url,
                                target: '_blank',
                                rel: 'noopener noreferrer'
                            }
                        };
                    }
                    return undefined;
                },
                blockRenderers: {
                    atomic: (block) => {
                        const entityKey = block.getEntityAt(0);
                        if (entityKey) {
                            const entity = contentState.getEntity(entityKey);
                            if (entity.getType() === 'EMBED') {
                                const data = entity.getData();
                                return data.html || '';
                            }
                        }
                        return undefined;
                    }
                }
            });
            return { id_config: result.id_config, text_html: html };
        });
        return res.json({ richText: convertedResults });
    } catch (err) {
        console.error('Erreur lors de la récupération du RichText de la page :', err);
        res.status(500).send({ error: err.message });
    }
});

router.get('/sendPageText', apiKeyMiddleware, async (req, res) => {
    const id = req.id_data;
    try {
        const { data, error } = await supabase
            .from('page_text')
            .select('id_config, text')
            .eq('id_page', id);
        if (error) throw error;
        if (!data || data.length === 0) return res.status(200).json({ message: 'Aucun texte trouvé' });
        return res.json({ text: data });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});

// BLOG AUTEUR : Adapté à la nouvelle structure (collection.js)
router.get('/sendBlogAuteur', apiKeyMiddleware, async (req, res) => {
    const id_blog = req.id_data;
    try {
        // 1. Récupérer l'user_id du blog (table blog)
        const { data: blogData, error: blogError } = await supabase
            .from('collection')
            .select('user_id')
            .eq('id', id_blog)
            .maybeSingle();
        if (blogError) throw blogError;
        if (!blogData) return res.status(200).json({ message: 'Aucun auteur trouvé' });
        const user_id = blogData.user_id;
        // 2. Récupérer le username (table users)
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('username')
            .eq('id', user_id)
            .maybeSingle();
        if (userError) throw userError;
        if (!userData) return res.status(200).json({ message: 'Aucun auteur trouvé' });
        // 3. Récupérer la photo de profil (table profile_images)
        const { data: imageData, error: imageError } = await supabase
            .from('profile_images')
            .select('src_profile_image')
            .eq('user_id', user_id)
            .maybeSingle();
        if (imageError) throw imageError;
        const author = {
            username: userData.username,
            src_profile_image: imageData ? imageData.src_profile_image : null
        };
        return res.json({ author });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});






    





module.exports = router;