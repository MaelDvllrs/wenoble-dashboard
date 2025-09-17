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
    const debugFilters = req.query.debugFilters === '1';
    // Nouveau: filtres dynamiques envoyés par collection-filter-plus.js
    let filters = {};
    if (req.query.filters) {
        try {
            filters = JSON.parse(req.query.filters);
        } catch (e) {
            return res.status(400).json({ message: 'Paramètre filters invalide (JSON attendu)' });
        }
    }

    console.log('Filters received:', filters);

    try {
        // Determine targeted collection(s)
        let targetCollectionIds = [];
        if (ids) {
            targetCollectionIds = ids.split(',').map(id => id.trim()).filter(Boolean);
        } else if (req.id_data) {
            targetCollectionIds = [req.id_data];
        }

        const ascending = order === 'asc';

        // Helper: fetch base elements for targeted collections
        const fetchBaseElements = async () => {
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
            const { data, error } = await query;
            if (error) throw error;
            console.log('Base elements fetched:', data);
            return data || [];
        };

        // Base columns present on collection_element
        const baseColumns = new Set([
            'id',
            'collection_id',
            'collection_element_name',
            'collection_element_slug',
            'collection_element_status',
            'collection_element_publish_date',
            'created_at',
            'updated_at'
        ]);

        // If sorting by a base column or no single collection targeted, use DB-side order for performance
        const canUseDbOrder = baseColumns.has(colone) || targetCollectionIds.length !== 1;
        if (canUseDbOrder) {
            // On ne met pas le limit tout de suite pour ne pas tronquer avant filtres
            let query = supabase
                .from('collection_element')
                .select('*')
                .eq('collection_element_status', true)
                .order(colone, { ascending });
            if (targetCollectionIds.length > 0) {
                if (targetCollectionIds.length === 1) query = query.eq('collection_id', targetCollectionIds[0]);
                else query = query.in('collection_id', targetCollectionIds);
            }
            const { data, error } = await query;
            if (error) throw error;
            let dataset = data || [];

            console.log('Dataset before filtering:', dataset);

            // Application des filtres sur colonnes de base + (optionnel) champs texte dynamiques
            let debugInfo = null;
            if (Object.keys(filters).length > 0 && dataset.length > 0) {
                const filtered = await applyFiltersToElements({
                    elements: dataset,
                    filters,
                    baseColumns,
                    targetCollectionIds,
                    debug: debugFilters
                });
                if (debugFilters && filtered && filtered.elements) {
                    debugInfo = filtered.debug;
                    dataset = filtered.elements;
                } else {
                    dataset = filtered;
                }
            }

            if (dataset.length === 0) return res.status(200).json({ message: 'Aucun blog trouvé' });

            const limited = typeof limit === 'number' ? dataset.slice(0, limit) : dataset;
            console.log('Blogs récupérés avec succès limited :', limited);
            return res.json(debugFilters ? { blog: limited, debug: debugInfo } : { blog: limited });
        }

        // Otherwise, attempt to sort by a configured field of the collection (text or multiReference)
        const targetCollectionId = targetCollectionIds[0];
        // Find config by name_field matching colone for this collection
        const { data: configRow, error: configError } = await supabase
            .from('collection_config')
            .select('id, tab_field, name_field, multiline_text')
            .eq('collection_id', targetCollectionId)
            .eq('name_field', colone)
            .maybeSingle();
        if (configError) throw configError;

        if (!configRow) {
            // Fallback to DB order by colone if no matching config
            let query = supabase
                .from('collection_element')
                .select('*')
                .eq('collection_element_status', true)
                .order(colone, { ascending });
            query = query.eq('collection_id', targetCollectionId);
            if (limit) query = query.limit(limit);
            const { data, error } = await query;
            if (error) throw error;
            if (!data || data.length === 0) return res.status(200).json({ message: 'Aucun blog trouvé' });
            console.log('Blogs récupérés avec succès :', data);
            return res.json({ blog: data });
        }

        // Fetch base elements (no order applied yet)
        const baseElements = await fetchBaseElements();
        if (!baseElements || baseElements.length === 0) return res.status(200).json({ message: 'Aucun blog trouvé' });

        // Build a value map for ordering depending on field type
        const valueMap = new Map();

        console.log('Config for ordering found:', configRow);

        if (configRow.tab_field === 'text') {
            const { data: texts, error: textError } = await supabase
                .from('collection_field_text')
                .select('collection_element_id, text')
                .eq('id_config', configRow.id);
            if (textError) throw textError;
            (texts || []).forEach(row => {
                valueMap.set(row.collection_element_id, (row.text || '').toString());
            });
        } else if (configRow.tab_field === 'multiReference') {
            // Tri sur multiReference: utiliser TOUS les labels référencés, triés alphabétiquement, concaténés
            const { data: refs, error: refError } = await supabase
                .from('collection_field_multireference')
                .select('collection_element_id, info_ref')
                .eq('id_config', configRow.id);
            if (refError) throw refError;

            // Map element -> array de IDs référencés (order natif du JSON)
            const allRefIds = new Set();
            const refsByElement = new Map();
            (refs || []).forEach(row => {
                let parsed;
                if (typeof row.info_ref === 'string') {
                    try { parsed = JSON.parse(row.info_ref); } catch { parsed = []; }
                } else {
                    parsed = row.info_ref || [];
                }
                const ids = [];
                if (Array.isArray(parsed)) {
                    parsed.forEach(entry => {
                        if (!entry) return;
                        if (typeof entry === 'object') {
                            if (entry.value) {
                                ids.push(entry.value);
                                allRefIds.add(entry.value);
                            }
                        } else {
                            ids.push(entry);
                            allRefIds.add(entry);
                        }
                    });
                }
                refsByElement.set(row.collection_element_id, ids);
            });

            if (allRefIds.size > 0) {
                const { data: refElements, error: refElError } = await supabase
                    .from('collection_element')
                    .select('id, collection_element_name')
                    .in('id', Array.from(allRefIds));
                if (refElError) throw refElError;
                const nameById = new Map((refElements || []).map(e => [e.id, (e.collection_element_name || '').toString()]));

                refsByElement.forEach((ids, elId) => {
                    if (!ids || ids.length === 0) {
                        valueMap.set(elId, '');
                        return;
                    }
                    // Récupère les noms, filtre vides, trie alphabétiquement
                    const names = ids.map(id => nameById.get(id) || '').filter(Boolean).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
                    const orderingKey = names.join(' | ');
                    valueMap.set(elId, orderingKey);
                });
            }
        } else {
            // Unsupported configured field type for ordering; fallback to DB order
            let query = supabase
                .from('collection_element')
                .select('*')
                .eq('collection_element_status', true)
                .order(colone, { ascending });
            query = query.eq('collection_id', targetCollectionId);
            if (limit) query = query.limit(limit);
            const { data, error } = await query;
            if (error) throw error;
            if (!data || data.length === 0) return res.status(200).json({ message: 'Aucun blog trouvé' });
            return res.json({ blog: data });
        }

        // Sort in Node based on valueMap
        const sorted = [...baseElements].sort((a, b) => {
            const va = (valueMap.get(a.id) || '').toString().toLowerCase();
            const vb = (valueMap.get(b.id) || '').toString().toLowerCase();
            if (va < vb) return ascending ? -1 : 1;
            if (va > vb) return ascending ? 1 : -1;
            return 0;
        });
        let finalData = sorted;
        // Filtres (base + texte dynamiques) appliqués après tri
        let debugInfo = null;
        if (Object.keys(filters).length > 0 && finalData.length > 0) {
            const filtered = await applyFiltersToElements({
                elements: finalData,
                filters,
                baseColumns,
                targetCollectionIds,
                debug: debugFilters
            });
            if (debugFilters && filtered && filtered.elements) {
                debugInfo = filtered.debug;
                finalData = filtered.elements;
            } else {
                finalData = filtered;
            }
        }

        if (finalData.length === 0) return res.status(200).json({ message: 'Aucun blog trouvé' });
        const limitedSorted = typeof limit === 'number' ? finalData.slice(0, limit) : finalData;
        return res.json(debugFilters ? { blog: limitedSorted, debug: debugInfo } : { blog: limitedSorted });
    } catch (err) {
        console.error('Erreur lors de la récupération des blogs :', err);
        res.status(500).send({ error: err.message });
    }
});

// Helper: applique les filtres sur un tableau d'éléments (colonnes de base + champs texte + multiReference dynamiques)
async function applyFiltersToElements({ elements, filters, baseColumns, targetCollectionIds, debug = false }) {
    if (!elements || elements.length === 0) return [];
    console.log('Applying filters:', filters);
    // Copie de travail pour normalisation éventuelle
    let workingFilters = { ...filters };
    let filterEntries = Object.entries(workingFilters);
    if (filterEntries.length === 0) return elements;

    // Une seule collection ? => on peut traduire id_config -> name_field
    const singleCollectionId = targetCollectionIds && targetCollectionIds.length === 1 ? targetCollectionIds[0] : null;
    let dynamicKeys = [];
    if (singleCollectionId) {
        try {
            const { data: allConfigs, error: cfgErr } = await supabase
                .from('collection_config')
                .select('id, name_field, tab_field')
                .eq('collection_id', singleCollectionId);
            if (!cfgErr && Array.isArray(allConfigs)) {
                const idToName = new Map(allConfigs.map(c => [c.id?.toString(), c.name_field]));
                // Accent-insensitive map for name_field
                const fold = (s) => (s || '').toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
                const foldedNameMap = new Map(allConfigs.map(c => [fold(c.name_field), c.name_field]));
                const normalized = {};
                for (const [k, v] of Object.entries(workingFilters)) {
                    if (baseColumns.has(k)) { normalized[k] = v; continue; }
                    const mapped = idToName.get(k.toString());
                    let targetName = mapped;
                    if (!targetName) {
                        // Tentative de match accent-insensitive sur name_field
                        const foldedKey = fold(k);
                        if (foldedNameMap.has(foldedKey)) targetName = foldedNameMap.get(foldedKey);
                    }
                    if (targetName) {
                        if (normalized[mapped]) {
                            const existing = Array.isArray(normalized[mapped]) ? normalized[mapped] : [normalized[mapped]];
                            const incoming = Array.isArray(v) ? v : [v];
                            normalized[mapped] = Array.from(new Set([...existing, ...incoming]));
                        } else {
                            normalized[targetName] = v;
                        }
                    } else {
                        normalized[k] = v;
                    }
                }
                workingFilters = normalized;
                filterEntries = Object.entries(workingFilters);
            }
        } catch (normErr) {
            console.warn('Normalisation filtres (id_config->name_field) échouée:', normErr.message);
        }
    } else {
        // Cas multi-collection: tenter de convertir les clés purement numériques id_config -> name_field globalement
        try {
            const numericKeys = filterEntries.map(([k]) => k).filter(k => /^\d+$/.test(k));
            if (numericKeys.length > 0) {
                const { data: cfgRows, error: cfgErr } = await supabase
                    .from('collection_config')
                    .select('id, name_field')
                    .in('id', numericKeys);
                if (!cfgErr && Array.isArray(cfgRows) && cfgRows.length > 0) {
                    const idToName = new Map(cfgRows.map(r => [r.id?.toString(), r.name_field]));
                    const remapped = { ...workingFilters };
                    let changed = false;
                    for (const k of numericKeys) {
                        const target = idToName.get(k);
                        if (target) {
                            if (remapped[target] === undefined) {
                                remapped[target] = remapped[k];
                            } else {
                                const existing = Array.isArray(remapped[target]) ? remapped[target] : [remapped[target]];
                                const incoming = Array.isArray(remapped[k]) ? remapped[k] : [remapped[k]];
                                remapped[target] = Array.from(new Set([...existing, ...incoming]));
                            }
                            delete remapped[k];
                            changed = true;
                        }
                    }
                    if (changed) {
                        workingFilters = remapped;
                        filterEntries = Object.entries(workingFilters);
                        console.log('Multi-collection numeric filter remap:', workingFilters);
                    }
                }
            }
        } catch (e) {
            console.warn('Normalisation multi-collection id_config échouée:', e.message);
        }
    }
    // Recalcule des clés dynamiques après normalisation
    for (const [key] of filterEntries) {
        if (!baseColumns.has(key)) dynamicKeys.push(key);
    }

    let textFieldValueMap = new Map();          // Map(element_id => { fieldName: value })
    let multiRefFieldValueMap = new Map();       // Map(element_id => { fieldName: Set(refIds) })

    if (singleCollectionId && dynamicKeys.length > 0) {
        // Récupérer toutes les configs de la collection puis filtrer par name_field OU id
        const { data: allConfigRows, error: configErr } = await supabase
            .from('collection_config')
            .select('id, name_field, tab_field')
            .eq('collection_id', singleCollectionId);
        if (!configErr && allConfigRows && allConfigRows.length > 0) {
            const dynKeySet = new Set(dynamicKeys.map(k => k.toString()));
            const configRows = allConfigRows.filter(r => dynKeySet.has(r.name_field) || dynKeySet.has(r.id?.toString()));
            if (configRows.length > 0) {
                // Remap: si le filtre était par id_config, on ajoute aussi une entrée par name_field pour uniformiser les maps ci-dessous
                const remappedFilters = { ...workingFilters };
                let changed = false;
                for (const row of configRows) {
                    const idStr = row.id?.toString();
                    if (idStr && remappedFilters[idStr] !== undefined && remappedFilters[row.name_field] === undefined) {
                        remappedFilters[row.name_field] = remappedFilters[idStr];
                        delete remappedFilters[idStr];
                        changed = true;
                    }
                }
                if (changed) {
                    workingFilters = remappedFilters;
                    filterEntries = Object.entries(workingFilters);
                }
                const textConfigs = configRows.filter(r => r.tab_field === 'text');
                const multiRefConfigs = configRows.filter(r => r.tab_field === 'multiReference');

                console.log('Config for filtering found:', configRows);
                console.log('Working filters after remap:', workingFilters);
                // Recalcul dynamicKeys (peut avoir changé après remap)
                dynamicKeys = filterEntries.map(([k]) => k).filter(k => !baseColumns.has(k));

                // --- TEXT --- //
                if (textConfigs.length > 0) {
                    const textConfigIds = textConfigs.map(r => r.id);
                    const idToNameText = new Map(textConfigs.map(r => [r.id, r.name_field]));
                    const { data: textValues, error: textValErr } = await supabase
                        .from('collection_field_text')
                        .select('collection_element_id, id_config, text')
                        .in('id_config', textConfigIds)
                        .in('collection_element_id', elements.map(e => e.id));
                    if (!textValErr && textValues) {
                        textValues.forEach(row => {
                            if (!textFieldValueMap.has(row.collection_element_id)) {
                                textFieldValueMap.set(row.collection_element_id, {});
                            }
                            const nameField = idToNameText.get(row.id_config);
                            if (nameField) {
                                textFieldValueMap.get(row.collection_element_id)[nameField] = row.text || '';
                            }
                        });
                    }
                }

                // --- MULTIREFERENCE --- //
                if (multiRefConfigs.length > 0) {
                    const multiRefConfigIds = multiRefConfigs.map(r => r.id);
                    const idToNameMulti = new Map(multiRefConfigs.map(r => [r.id, r.name_field]));
                    const { data: multiRefValues, error: multiRefErr } = await supabase
                        .from('collection_field_multireference')
                        .select('collection_element_id, id_config, info_ref')
                        .in('id_config', multiRefConfigIds)
                        .in('collection_element_id', elements.map(e => e.id));
                    if (!multiRefErr && multiRefValues) {
                        multiRefValues.forEach(row => {
                            if (!multiRefFieldValueMap.has(row.collection_element_id)) {
                                multiRefFieldValueMap.set(row.collection_element_id, {});
                            }
                            const nameField = idToNameMulti.get(row.id_config);
                            if (!nameField) return;
                            let parsed;
                            if (typeof row.info_ref === 'string') {
                                try { parsed = JSON.parse(row.info_ref); } catch { parsed = []; }
                            } else {
                                parsed = row.info_ref || [];
                            }
                            const refIds = new Set();
                            const fold = (s) => (s || '').toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
                            if (Array.isArray(parsed)) {
                                parsed.forEach(ref => {
                                    if (!ref) return;
                                    if (typeof ref === 'object') {
                                        if (ref.value) {
                                            const vLower = ref.value.toString().toLowerCase();
                                            refIds.add(vLower);
                                            refIds.add(fold(ref.value));
                                        }
                                        if (ref.label) {
                                            const lLower = ref.label.toString().toLowerCase();
                                            refIds.add(lLower);
                                            refIds.add(fold(ref.label));
                                        }
                                    } else {
                                        const raw = ref.toString().toLowerCase();
                                        refIds.add(raw);
                                        refIds.add(fold(ref));
                                    }
                                });
                            }
                            multiRefFieldValueMap.get(row.collection_element_id)[nameField] = refIds; 
                            console.log('MultiReference field values (ids + labels):', Array.from(refIds));
                        });
                    }
                }
            }
        }
    }
    else if (!singleCollectionId && dynamicKeys.length > 0) {
        // Construction des maps dynamiques pour plusieurs collections (ou collection non spécifiée)
        try {
            const collectionIds = Array.from(new Set(elements.map(e => e.collection_id).filter(Boolean)));
            if (collectionIds.length > 0) {
                // Récupérer les configs pertinentes par name_field
                const { data: configRows, error: cfgErr } = await supabase
                    .from('collection_config')
                    .select('id, collection_id, name_field, tab_field')
                    .in('collection_id', collectionIds)
                    .in('name_field', dynamicKeys);
                if (!cfgErr && Array.isArray(configRows) && configRows.length > 0) {
                    const textConfigs = configRows.filter(r => r.tab_field === 'text');
                    const multiRefConfigs = configRows.filter(r => r.tab_field === 'multiReference');

                    // TEXT
                    if (textConfigs.length > 0) {
                        const textConfigIds = textConfigs.map(r => r.id);
                        const idToNameText = new Map(textConfigs.map(r => [r.id, r.name_field]));
                        const { data: textValues, error: textValErr } = await supabase
                            .from('collection_field_text')
                            .select('collection_element_id, id_config, text')
                            .in('id_config', textConfigIds)
                            .in('collection_element_id', elements.map(e => e.id));
                        if (!textValErr && Array.isArray(textValues)) {
                            textValues.forEach(row => {
                                if (!textFieldValueMap.has(row.collection_element_id)) {
                                    textFieldValueMap.set(row.collection_element_id, {});
                                }
                                const nameField = idToNameText.get(row.id_config);
                                if (nameField) {
                                    textFieldValueMap.get(row.collection_element_id)[nameField] = row.text || '';
                                }
                            });
                        }
                    }

                    // MULTIREFERENCE
                    if (multiRefConfigs.length > 0) {
                        const multiRefConfigIds = multiRefConfigs.map(r => r.id);
                        const idToNameMulti = new Map(multiRefConfigs.map(r => [r.id, r.name_field]));
                        const { data: multiRefValues, error: multiRefErr } = await supabase
                            .from('collection_field_multireference')
                            .select('collection_element_id, id_config, info_ref')
                            .in('id_config', multiRefConfigIds)
                            .in('collection_element_id', elements.map(e => e.id));
                        if (!multiRefErr && Array.isArray(multiRefValues)) {
                            multiRefValues.forEach(row => {
                                if (!multiRefFieldValueMap.has(row.collection_element_id)) {
                                    multiRefFieldValueMap.set(row.collection_element_id, {});
                                }
                                const nameField = idToNameMulti.get(row.id_config);
                                if (!nameField) return;
                                let parsed;
                                if (typeof row.info_ref === 'string') {
                                    try { parsed = JSON.parse(row.info_ref); } catch { parsed = []; }
                                } else {
                                    parsed = row.info_ref || [];
                                }
                                const refIds = new Set();
                                const fold = (s) => (s || '').toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
                                if (Array.isArray(parsed)) {
                                    parsed.forEach(ref => {
                                        if (!ref) return;
                                        if (typeof ref === 'object') {
                                            if (ref.value) {
                                                const vLower = ref.value.toString().toLowerCase();
                                                refIds.add(vLower);
                                                refIds.add(fold(ref.value));
                                            }
                                            if (ref.label) {
                                                const lLower = ref.label.toString().toLowerCase();
                                                refIds.add(lLower);
                                                refIds.add(fold(ref.label));
                                            }
                                        } else {
                                            const raw = ref.toString().toLowerCase();
                                            refIds.add(raw);
                                            refIds.add(fold(ref));
                                        }
                                    });
                                }
                                multiRefFieldValueMap.get(row.collection_element_id)[nameField] = refIds;
                            });
                        }
                    }
                }
            }
        } catch (e) {
            console.warn('Construction maps dynamiques multi-collection échouée:', e.message);
        }
    }

    // Fonction de test: pour multiReference on exige qu'au moins UNE valeur attendue soit présente (logique OR)
    const debugPerElement = debug ? {} : null;
    function elementMatches(el) {
        const elementDebug = debug ? { id: el.id, checks: [] } : null;
        for (const [key, expected] of filterEntries) {
            const values = Array.isArray(expected) ? expected.map(v => v.toString()) : [expected.toString()];
            let actual;
            if (baseColumns.has(key)) {
                actual = el[key];
                if (actual === undefined || actual === null) {
                    if (debug) elementDebug.checks.push({ key, type: 'base', expected: values, matched: false, reason: 'valeur absente' });
                    return false;
                }
                const actualStr = actual.toString().toLowerCase();
                const match = values.some(v => actualStr === v.toLowerCase());
                if (!match) {
                    if (debug) elementDebug.checks.push({ key, type: 'base', expected: values, actual: actualStr, matched: false });
                    return false;
                }
                if (debug) elementDebug.checks.push({ key, type: 'base', expected: values, actual: actualStr, matched: true });
                continue;
            }

            // Texte dynamique
            if (textFieldValueMap.size > 0) {
                const obj = textFieldValueMap.get(el.id) || {};
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    actual = obj[key];
                    if (actual === undefined || actual === null) {
                        if (debug) elementDebug.checks.push({ key, type: 'text', expected: values, matched: false, reason: 'valeur absente' });
                        return false;
                    }
                    const actualStr = actual.toString().toLowerCase();
                    const match = values.some(v => actualStr === v.toLowerCase());
                    if (!match) {
                        if (debug) elementDebug.checks.push({ key, type: 'text', expected: values, actual: actualStr, matched: false });
                        return false;
                    }
                    if (debug) elementDebug.checks.push({ key, type: 'text', expected: values, actual: actualStr, matched: true });
                    continue;
                }
            }

            if (debug && !debugPerElement._multiRefSnapshot) {
                debugPerElement._multiRefSnapshot = Array.from(multiRefFieldValueMap.entries()).slice(0, 30);
            }

            // MultiReference dynamique
            if (multiRefFieldValueMap.size > 0) {
                const obj = multiRefFieldValueMap.get(el.id) || {};
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    const refSet = obj[key]; // Set
                    if (!(refSet instanceof Set)) {
                        if (debug) elementDebug.checks.push({ key, type: 'multiReference', expected: values, matched: false, reason: 'refSet invalide' });
                        return false;
                    }
                    const fold = (s) => (s || '').toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
                    const match = values.some(v => {
                        const lower = v.toString().toLowerCase();
                        return refSet.has(lower) || refSet.has(fold(v));
                    });
                    if (!match) {
                        if (debug) elementDebug.checks.push({ key, type: 'multiReference', expected: values, refSet: Array.from(refSet).slice(0,100), matched: false });
                        return false;
                    }
                    if (debug) elementDebug.checks.push({ key, type: 'multiReference', expected: values, refSet: Array.from(refSet).slice(0,100), matched: true });
                    continue;
                }
            }

            // Clé non gérée (ni base, ni text, ni multiReference) -> ignorer le filtre (ne pas exclure)
            if (debug) elementDebug.checks.push({ key, type: 'ignored', expected: values, matched: true, reason: 'clé non trouvée - filtre ignoré' });
            continue;
        }
        if (debug) { elementDebug.final = true; debugPerElement[el.id] = elementDebug; }
        return true;
    }
    const kept = [];
    for (const el of elements) {
        const ok = elementMatches(el);
        if (!ok && debug) {
            if (!debugPerElement[el.id]) debugPerElement[el.id] = { id: el.id, final: false };
        }
        if (ok) kept.push(el);
    }
    if (debug) {
        return {
            elements: kept,
            debug: {
                filtersApplied: workingFilters,
                totalBefore: elements.length,
                totalAfter: kept.length,
                perElement: debugPerElement
            }
        };
    }
    return kept;
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