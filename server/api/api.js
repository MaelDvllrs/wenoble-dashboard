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
    'collection_element_status',
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
    const colone = req.query.colone || 'collection_element_publish_date';
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
                supabase, targetCollectionIds, baseColumns, colone, ascending, limit, res, templateCollectionId
            });
        }

        // Avec filtres ou tri personnalisé: utiliser la nouvelle logique DB-first
        const dataset = await applyFiltersAtDbLevel({
            supabase, targetCollectionIds, filters, baseColumns, colone, ascending, limit, sorts, templateCollectionId, templateElementId
        });

        if (dataset.length === 0) return res.status(200).json({ message: 'Aucun blog trouvé' });
        return res.json({ blog: dataset });
    } catch (err) {
        console.error('Erreur lors de la récupération des blogs :', err);
        res.status(500).send({ error: err.message });
    }
});

// Helper: gère le cas sans filtres (ancienne logique optimisée)
async function handleNoFiltersCase({ supabase, targetCollectionIds, baseColumns, colone, ascending, limit, res, templateCollectionId }) {
    let query = supabase
        .from('collection_element')
        .select('*')
        .eq('collection_element_status', true)
        .order(colone, { ascending });
    
    if (targetCollectionIds.length > 0) {
        if (targetCollectionIds.length === 1) {
            query = query.eq('collection_id', targetCollectionIds[0]);
        } else {
            query = query.in('collection_id', targetCollectionIds);
        }
    }
    
    if (limit) query = query.limit(limit);
    
    const { data, error } = await query;
    if (error) throw error;
    
    if (!data || data.length === 0) {
        return res.status(200).json({ message: 'Aucun blog trouvé' });
    }
    
    return res.json({ blog: data });
}

// Helper: récupère les collection_element_id filtrés via les champs text
async function getFilteredElementIdsByText({ supabase, targetCollectionIds, textFilters, isTemplateMode = false }) {
    if (Object.keys(textFilters).length === 0) return null;
    
    let elementIds = new Set();
    
    for (const [configId, filterConfig] of Object.entries(textFilters)) {
        // Les filtres peuvent être soit un objet {field, operator, value} ou une valeur simple
        let operator = 'equals';
        let values = [];
        
        if (typeof filterConfig === 'object' && filterConfig.operator) {
            // Format: {field: "...", operator: "contains", value: "..."}
            operator = filterConfig.operator;
            values = Array.isArray(filterConfig.value) ? filterConfig.value : [filterConfig.value];
        } else {
            // Format simple: valeur directe
            values = Array.isArray(filterConfig) ? filterConfig : [filterConfig];
        }
        
        console.log('Filtrage text - Mode template:', isTemplateMode, 'ConfigId:', configId, 'Values:', values);
        
        // Récupérer les collection_element_id qui matchent ces valeurs selon l'opérateur
        let textQuery = supabase
            .from('collection_field_text')
            .select('collection_element_id')
            .eq('id_config', configId);
            
        // Appliquer les filtres selon l'opérateur
        for (const value of values) {
            if (!value) continue;
            
            switch (operator) {
                case 'equals':
                    textQuery = textQuery.eq('text', value);
                    break;
                case 'contains':
                    textQuery = textQuery.ilike('text', `%${value}%`);
                    break;
                case 'starts':
                    textQuery = textQuery.ilike('text', `${value}%`);
                    break;
                case 'ends':
                    textQuery = textQuery.ilike('text', `%${value}`);
                    break;
                default:
                    textQuery = textQuery.eq('text', value);
            }
        }
        
        const { data: textResults, error: textErr } = await textQuery;
        if (textErr || !textResults) {
            console.log('Erreur ou pas de résultats text:', textErr);
            continue;
        }
        
        console.log('Résultats text trouvés:', textResults.length);
        
        let matchingIds = textResults.map(r => r.collection_element_id);
        
        // En mode template, les IDs récupérés sont ceux de la collection template
        // Il faut les retourner tels quels car ils correspondent aux éléments à filtrer
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
        
        // Les filtres peuvent être soit un objet {operator, value} ou une valeur simple
        let operator = 'equals';
        let values = [];
        
        if (typeof filterConfig === 'object' && filterConfig.operator) {
            // Format: {operator: "equals", value: "test categorie"}
            operator = filterConfig.operator;
            values = Array.isArray(filterConfig.value) ? filterConfig.value : [filterConfig.value];
        } else {
            // Format simple: valeur directe
            values = Array.isArray(filterConfig) ? filterConfig : [filterConfig];
        }
        
        console.log('Recherche de multiRef avec operator:', operator, 'values:', values);
        
        if (isTemplateMode && templateCollectionId) {
            // Mode template: récupérer le collection_element_name de l'élément template spécifique
            console.log('Mode template: récupération du nom de l\'élément template', templateElementId, 'de la collection', templateCollectionId);
            
            let templateElements = [];
            
            if (templateElementId) {
                // 1a. Récupérer l'élément template spécifique
                const { data: specificTemplateElement, error: specificTemplateErr } = await supabase
                    .from('collection_element')
                    .select('id, collection_element_name')
                    .eq('id', templateElementId)
                    .eq('collection_element_status', true)
                    .maybeSingle();
                    
                if (specificTemplateErr || !specificTemplateElement) {
                    console.log('Erreur ou élément template spécifique non trouvé:', specificTemplateErr);
                    continue;
                }
                templateElements = [specificTemplateElement];
            } else {
                // 1b. Récupérer tous les éléments de la collection template (fallback)
                const { data: allTemplateElements, error: allTemplateElementsErr } = await supabase
                    .from('collection_element')
                    .select('id, collection_element_name')
                    .eq('collection_id', templateCollectionId)
                    .eq('collection_element_status', true);
                    
                if (allTemplateElementsErr || !allTemplateElements || allTemplateElements.length === 0) {
                    console.log('Erreur ou pas d\'éléments dans la collection template:', allTemplateElementsErr);
                    continue;
                }
                templateElements = allTemplateElements;
            }
            
            // 2. Extraire les noms des éléments template comme valeurs à rechercher
            const templateNames = templateElements.map(elem => elem.collection_element_name).filter(Boolean);
            console.log('Noms des éléments template à rechercher:', templateNames);
            
            // 3. Récupérer les éléments de la collection cible qui ont le champ configId
            const { data: targetMultiRefResults, error: targetMultiRefErr } = await supabase
                .from('collection_field_multireference')
                .select('collection_element_id, info_ref')
                .eq('id_config', configId);
                
            if (targetMultiRefErr || !targetMultiRefResults) {
                console.log('Erreur récupération multiRef collection cible:', targetMultiRefErr);
                continue;
            }

            console.log('Résultats multiRef trouvés dans collection cible:', targetMultiRefResults.length);
            
            // Collecter tous les IDs référencés pour les récupérer en une seule requête
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

            // Récupérer les éléments référencés avec leurs propriétés
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
            
            // Filtrer côté serveur: chercher les éléments qui référencent un élément avec le nom des éléments template
            const matchingIds = [];
            for (const row of targetMultiRefResults) {
                let parsed;
                if (typeof row.info_ref === 'string') {
                    try { parsed = JSON.parse(row.info_ref); } catch { continue; }
                } else {
                    parsed = row.info_ref || [];
                }
                
                if (!Array.isArray(parsed)) continue;
                
                // Vérifier si au moins un nom d'élément template correspond
                const hasMatch = templateNames.some(templateName => {
                    return parsed.some(ref => {
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
                        if (!refElement) return false;

                        // Comparer avec le nom de l'élément template
                        const templateNameLower = templateName.toString().toLowerCase();
                        const elementName = (refElement.collection_element_name || '').toLowerCase();
                        const elementSlug = (refElement.collection_element_slug || '').toLowerCase();
                        const refLabel = (typeof ref === 'object' && ref.label ? ref.label.toLowerCase() : '');
                        
                        switch (operator) {
                            case 'equals':
                                return elementName === templateNameLower ||
                                       elementSlug === templateNameLower ||
                                       refLabel === templateNameLower;
                            case 'contains':
                                return elementName.includes(templateNameLower) ||
                                       elementSlug.includes(templateNameLower) ||
                                       refLabel.includes(templateNameLower);
                            case 'starts':
                                return elementName.startsWith(templateNameLower) ||
                                       elementSlug.startsWith(templateNameLower) ||
                                       refLabel.startsWith(templateNameLower);
                            case 'ends':
                                return elementName.endsWith(templateNameLower) ||
                                       elementSlug.endsWith(templateNameLower) ||
                                       refLabel.endsWith(templateNameLower);
                            default:
                                return elementName === templateNameLower ||
                                       elementSlug === templateNameLower ||
                                       refLabel === templateNameLower;
                        }
                    });
                });
                
                if (hasMatch) {
                    matchingIds.push(row.collection_element_id);
                }
            }
            
            console.log('IDs correspondants trouvés:', matchingIds);
            
            if (elementIds.size === 0) {
                matchingIds.forEach(id => elementIds.add(id));
            } else {
                const intersection = new Set();
                matchingIds.forEach(id => {
                    if (elementIds.has(id)) intersection.add(id);
                });
                elementIds = intersection;
            }
            
        } else {
            // Mode normal: recherche directe dans la collection cible
            const { data: multiRefResults, error: multiRefErr } = await supabase
                .from('collection_field_multireference')
                .select('collection_element_id, info_ref')
                .eq('id_config', configId);
                
            if (multiRefErr || !multiRefResults) {
                console.log('Erreur ou pas de résultats multiRef:', multiRefErr);
                continue;
            }

            console.log('Résultats multiRef trouvés:', multiRefResults.length);
            
            // Collecter tous les IDs référencés pour les récupérer en une seule requête
            const allRefIds = new Set();
            multiRefResults.forEach(row => {
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

            // Récupérer les éléments référencés avec leurs propriétés
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
            
            // Filtrer côté serveur en parsant le JSON et en comparant avec les éléments référencés
            const matchingIds = [];
            for (const row of multiRefResults) {
                let parsed;
                if (typeof row.info_ref === 'string') {
                    try { parsed = JSON.parse(row.info_ref); } catch { continue; }
                } else {
                    parsed = row.info_ref || [];
                }
                
                if (!Array.isArray(parsed)) continue;
                
                // Vérifier si au moins une valeur attendue est présente selon l'opérateur
                const hasMatch = values.some(expectedValue => {
                    return parsed.some(ref => {
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
                        if (!refElement) return false;

                        // Appliquer l'opérateur de comparaison
                        const expectedLower = expectedValue.toString().toLowerCase();
                        const elementName = (refElement.collection_element_name || '').toLowerCase();
                        const elementSlug = (refElement.collection_element_slug || '').toLowerCase();
                        const refLabel = (typeof ref === 'object' && ref.label ? ref.label.toLowerCase() : '');
                        
                        switch (operator) {
                            case 'equals':
                                return refElement.id?.toString() === expectedValue.toString() ||
                                       elementName === expectedLower ||
                                       elementSlug === expectedLower ||
                                       refLabel === expectedLower;
                            case 'contains':
                                return elementName.includes(expectedLower) ||
                                       elementSlug.includes(expectedLower) ||
                                       refLabel.includes(expectedLower);
                            case 'starts':
                                return elementName.startsWith(expectedLower) ||
                                       elementSlug.startsWith(expectedLower) ||
                                       refLabel.startsWith(expectedLower);
                            case 'ends':
                                return elementName.endsWith(expectedLower) ||
                                       elementSlug.endsWith(expectedLower) ||
                                       refLabel.endsWith(expectedLower);
                            default:
                                return refElement.id?.toString() === expectedValue.toString() ||
                                       elementName === expectedLower ||
                                       elementSlug === expectedLower ||
                                       refLabel === expectedLower;
                        }
                    });
                });
                
                if (hasMatch) {
                    matchingIds.push(row.collection_element_id);
                }
            }
            
            console.log('IDs correspondants trouvés:', matchingIds);
            
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
async function applyFiltersAtDbLevel({ supabase, targetCollectionIds, filters, baseColumns, colone, ascending, limit, sorts = {}, templateCollectionId = null, templateElementId = null }) {
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
            .eq('collection_element_status', true);
        
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
    
    // Séparer les filtres par type : base columns, text, multiReference
    const baseFilters = {};
    const textFilters = {};
    const multiRefFilters = {};
    
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
            } else {
                console.log(`Type de champ non géré pour ${fieldId}: ${fieldType} (configs disponibles: ${Array.from(configMap.keys()).join(', ')})`);
            }
            // Les autres types sont ignorés pour le moment
        }
    }
    
    console.log('Filtres classifiés:', { baseFilters, textFilters, multiRefFilters });
    
    // Récupérer les IDs filtrés par les champs text
    const textFilteredIds = await getFilteredElementIdsByText({ 
        supabase, 
        targetCollectionIds: templateCollectionId ? [templateCollectionId] : targetCollectionIds, 
        textFilters,
        isTemplateMode: !!templateCollectionId
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
    
    // Calculer l'intersection des IDs si plusieurs types de filtres dynamiques
    let dynamicFilteredIds = null;
    if (textFilteredIds !== null && multiRefFilteredIds !== null) {
        // Intersection des deux ensembles
        const textSet = new Set(textFilteredIds);
        dynamicFilteredIds = multiRefFilteredIds.filter(id => textSet.has(id));
    } else if (textFilteredIds !== null) {
        dynamicFilteredIds = textFilteredIds;
    } else if (multiRefFilteredIds !== null) {
        dynamicFilteredIds = multiRefFilteredIds;
    }
    
    // Construire la requête finale sur collection_element
    let query = supabase
        .from('collection_element')
        .select('*')
        .eq('collection_element_status', true);
    
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
        if (limit) query = query.limit(limit);
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
        
        // Appliquer la limite après le tri dynamique
        if (limit && finalResults.length > limit) {
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
            const { data: publicUrlData } = supabase.storage
                .from('collection-images')
                .getPublicUrl(image.src_image);
            return {
                id_config: image.id_config,
                alt_image: image.alt_image,
                url: publicUrlData?.publicUrl || ''
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
                        const { data: publicUrlData } = supabase.storage
                            .from('collection-images')
                            .getPublicUrl(image.src_image);

                        return {
                            id_config: image.id_config,
                            alt_image: image.alt_image,
                            url: publicUrlData?.publicUrl || ''
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