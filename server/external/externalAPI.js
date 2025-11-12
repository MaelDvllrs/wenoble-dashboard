const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { supabaseServer } = require('../supabase');
const { fi } = require('date-fns/locale/fi');

const router = express.Router();

router.use(cors());
router.use(express.json());

require('dotenv').config();
const secretKey = process.env.SECRET_KEY;

// Middleware d'authentification par clé API
const authenticateAPIKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.headers['api-key'];
    
    if (!apiKey) {
      return res.status(401).json({ 
        error: 'Clé API manquante. Utilisez le header "x-api-key" ou "api-key".' 
      });
    }

    // Décoder le token JWT
    const decoded = jwt.verify(apiKey, secretKey);
    
    // Vérifier que c'est bien un token API
    if (decoded.type !== 'api_token') {
      return res.status(401).json({ 
        error: 'Type de token invalide.' 
      });
    }

    // Utiliser l'instance Supabase configurée avec service key (bypass RLS)
    const { createClient } = require('@supabase/supabase-js');
    
    // Vérifier que la service key existe
    if (!process.env.SUPABASE_SERVICE_KEY) {
      console.error('SUPABASE_SERVICE_KEY manquante dans les variables d\'environnement');
      return res.status(500).json({ error: 'Configuration serveur incorrecte' });
    }
    
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    // Vérifier que le token existe et est actif en base
    const { data: tokenData, error: tokenError } = await supabase
      .from('api_tokens')
      .select('id, website_id, permissions, is_active, last_used_at')
      .eq('id', decoded.tokenId)
      .eq('is_active', true)
      .single();
    
    if (tokenError || !tokenData) {
      return res.status(401).json({ 
        error: 'Token API invalide ou désactivé.' 
      });
    }

    // Mettre à jour la dernière utilisation
    await supabase
      .from('api_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', decoded.tokenId);

    // Stocker les informations pour les routes suivantes
    req.supabase = supabase;
    req.apiKey = apiKey;
    req.tokenData = {
      ...tokenData,
      permissions: JSON.parse(tokenData.permissions || '[]'),
      userId: decoded.userId
    };
    
    next();
  } catch (error) {
    console.error('Erreur lors de l\'authentification API:', error);
    return res.status(401).json({ 
      error: 'Token API invalide ou expiré.' 
    });
  }
};

// Endpoint pour créer un élément de collection
router.post('/collection/:collectionId/elements', authenticateAPIKey, async (req, res) => {
  try {
    const { collectionId } = req.params;
    const { 
      name, 
      slug, 
      status = 0, // 0 = brouillon, 1 = publié
      fields = {} // Objet contenant les champs personnalisés
    } = req.body;

    // Vérifier les permissions CMS
    if (!req.tokenData.permissions.includes('cms')) {
      return res.status(403).json({ 
        error: 'Ce token n\'a pas les permissions CMS nécessaires.' 
      });
    }

    if (!name) {
      return res.status(400).json({ 
        error: 'Le nom de l\'élément est requis.' 
      });
    }

    if (!slug) {
      return res.status(400).json({ 
        error: 'Le slug de l\'élément est requis.' 
      });
    }

    const supabase = req.supabase;
    const currentDate = new Date().toISOString();

    // Vérifier que la collection existe et appartient au bon site
    const { data: collection, error: collectionError } = await supabase
      .from('collection')
      .select('id, website_id')
      .eq('id', collectionId)
      .eq('website_id', req.tokenData.website_id)
      .single();

    console.log(collection, collectionError);

    if (collectionError || !collection) {
      return res.status(404).json({ 
        error: 'Collection non trouvée ou non autorisée pour ce token.' 
      });
    }

    // Vérifier que le slug n'existe pas déjà
    const { data: existingElement } = await supabase
      .from('collection_element')
      .select('id')
      .eq('collection_id', collectionId)
      .eq('collection_element_slug', slug)
      .maybeSingle();

    if (existingElement) {
      return res.status(409).json({ 
        error: 'Un élément avec ce slug existe déjà dans cette collection.' 
      });
    }

    console.log('Création de l\'élément dans la collection', collectionId);

    // Créer l'élément de collection
    // Normalize status: support strings during migration
    const normalizeStatusNumber = (s) => {
      if (typeof s === 'number') return s;
      if (!s) return null;
      const lowered = String(s).toLowerCase();
      if (lowered === 'publish' || lowered === 'published') return 1;
      if (lowered === 'draft') return 0;
      if (lowered === 'wait' || lowered === 'queued') return 2;
      const parsed = parseInt(s);
      return Number.isNaN(parsed) ? null : parsed;
    };

    const statusNum = normalizeStatusNumber(status);
    const statusText = (typeof status === 'string') ? status : (statusNum === 1 ? 'publish' : (statusNum === 0 ? 'draft' : null));

    const elementData = {
      collection_id: collectionId, // UUID, ne pas convertir en integer
      collection_element_name: name,
      collection_element_slug: slug,
      collection_element_status: statusNum,
      collection_element_status_text: statusText,
      collection_element_create_date: currentDate,
      collection_element_update_date: currentDate
    };

    // Ajouter created_by seulement si c'est un UUID valide
    if (req.tokenData.userId && req.tokenData.userId.length === 36) {
      elementData.created_by = req.tokenData.userId;
    }

    if (status === 1 || status === 'publish' || status === 'published' || statusNum === 1) {
      elementData.collection_element_publish_date = currentDate;
      if (req.tokenData.userId && req.tokenData.userId.length === 36) {
        elementData.published_by = req.tokenData.userId;
      }
    }

    console.log('Données de l\'élément à créer:', elementData);

    // Essayer l'insertion avec service role bypass
    const { data: createdElement, error: createError } = await supabase
      .from('collection_element')
      .insert(elementData)
      .select()
      .single();

    if (createError) {
      console.error('Erreur lors de la création de l\'élément:', createError);
      throw createError;
    }

    // Traiter les champs personnalisés
    const elementId = createdElement.id;
    const processedFields = {};

    console.log('Champs reçus à traiter:', fields);
    console.log('ID de l\'élément créé:', elementId);

    // Récupérer la configuration des champs pour cette collection
    const { data: fieldConfigs, error: configError } = await supabase
      .from('collection_config')
      .select('id, tab_field, name_field')
      .eq('collection_id', collectionId);

    console.log('Configuration des champs récupérée:', fieldConfigs);
    if (configError) {
      console.warn('Erreur lors de la récupération des configurations de champs:', configError);
    }

    // Traiter chaque champ fourni
    for (const [fieldName, fieldValue] of Object.entries(fields)) {
      try {
        console.log(`\nTraitement du champ "${fieldName}" avec la valeur:`, fieldValue);
        
        const fieldConfig = fieldConfigs?.find(config => 
          config.name_field.toLowerCase() === fieldName.toLowerCase()
        );

        if (!fieldConfig) {
          console.warn(`Champ "${fieldName}" non trouvé dans la configuration de la collection`);
          console.log('Champs disponibles:', fieldConfigs?.map(c => c.name_field));
          continue;
        }

        const fieldType = fieldConfig.tab_field;
        const configId = fieldConfig.id;
        console.log(`Type de champ: ${fieldType}, Config ID: ${configId}`);

        // Traiter selon le type de champ
        switch (fieldType) {
          case 'text':
            console.log('Insertion champ text avec:', {
              collection_element_id: elementId,
              id_config: configId,
              text: String(fieldValue)
            });
            const { error: textError } = await supabase
              .from('collection_field_text')
              .insert({
                collection_element_id: elementId,
                id_config: configId,
                text: String(fieldValue)
              });
            if (textError) {
              console.error('Erreur insertion champ text:', textError);
            } else {
              console.log('Champ text inséré avec succès');
              processedFields[fieldName] = { type: 'text', value: fieldValue };
            }
            break;

          case 'richText':
            // Pour le richText, on attend un objet DraftJS ou une chaîne HTML
            let richTextJSON;
            if (typeof fieldValue === 'object') {
              richTextJSON = JSON.stringify(fieldValue);
            } else {
              // Convertir HTML simple en format DraftJS basique
              richTextJSON = JSON.stringify({
                blocks: [{
                  key: uuidv4(),
                  text: String(fieldValue),
                  type: 'unstyled',
                  depth: 0,
                  inlineStyleRanges: [],
                  entityRanges: [],
                  data: {}
                }],
                entityMap: {}
              });
            }

            console.log('Insertion champ richText avec:', {
              collection_element_id: elementId,
              id_config: configId,
              text_json: richTextJSON,
              size: 0
            });
            const { error: richTextError } = await supabase
              .from('collection_field_richtext')
              .insert({
                collection_element_id: elementId,
                id_config: configId,
                text_json: richTextJSON,
                size: 0
              });
            if (richTextError) {
              console.error('Erreur insertion champ richText:', richTextError);
            } else {
              console.log('Champ richText inséré avec succès');
              processedFields[fieldName] = { type: 'richText', value: fieldValue };
            }
            break;

          case 'image':
            console.log(typeof fieldValue, fieldValue);
            // Pour les images, on attend un objet avec { url, alt } ou juste une URL string
            let imageData;
            if (typeof fieldValue === 'string') {
              // Si c'est juste une URL, utiliser l'URL comme alt aussi
              imageData = {
                url: fieldValue,
                alt: fieldValue,
                name: fieldValue
              };
            } else if (typeof fieldValue === 'object' && fieldValue.url) {
              console.log('Champ image reçu comme objet:', fieldValue);
              // Si c'est un objet avec url, alt, etc.
              imageData = {
                url: fieldValue.url,
                alt: fieldValue.alt || fieldValue.url,
                name: fieldValue.name || fieldValue.alt || fieldValue.url
              };
            } else {
              console.error(`Format invalide pour le champ image "${fieldName}":`, fieldValue);
              continue;
            }

            // Générer un ID unique pour l'image (comme dans collection.js)
            const imageId = uuidv4();

            console.log('Insertion champ image avec:', {
              id: imageId,
              collection_element_id: elementId,
              id_config: configId,
              src_image: imageData.url,
              alt_image: imageData.alt,
              name_image: imageData.name
            });

            const { error: imageError } = await supabase
              .from('collection_field_image')
              .insert({
                id: imageId,
                collection_element_id: elementId,
                id_config: configId,
                src_image: imageData.url,
                alt_image: imageData.alt,
                name_image: imageData.name,
                size: 0 
              });

            if (imageError) {
              console.error('Erreur insertion champ image:', imageError);
            } else {
              console.log('Champ image inséré avec succès');
              processedFields[fieldName] = { type: 'image', value: imageData };
            }
            break;

          case 'gallery':
            // Pour les galeries, on attend un tableau d'objets images
            let galleryData = [];
            
            if (Array.isArray(fieldValue)) {
              galleryData = fieldValue.map(item => {
                if (typeof item === 'string') {
                  // Si c'est juste une URL, utiliser l'URL comme alt et name aussi
                  return {
                    src_photo: item,
                    alt: item,
                    name: item
                  };
                } else if (typeof item === 'object' && item.url) {
                  // Si c'est un objet avec url, alt, etc.
                  return {
                    src_photo: item.url,
                    alt: item.alt || item.url,
                    name: item.name || item.alt || item.url
                  };
                }
                return null;
              }).filter(item => item !== null);
            } else {
              console.error(`Format invalide pour le champ galerie "${fieldName}": doit être un tableau`, fieldValue);
              continue;
            }

            if (galleryData.length === 0) {
              console.warn(`Aucune image valide trouvée pour la galerie "${fieldName}"`);
              continue;
            }

            // Générer un ID unique pour la galerie (comme dans collection.js)
            const galleryId = uuidv4();

            console.log('Insertion champ galerie avec:', {
              collection_element_id: elementId,
              id_config: configId,
              gallery: galleryData,
              size: 0
            });

            // Convertir le tableau d'images en JSON pour la base de données (utiliser 'gallery' pas 'gallery_json')
            const galleryJSON = JSON.stringify(galleryData);

            const { error: galleryError } = await supabase
              .from('collection_field_gallery')
              .insert({
                collection_element_id: elementId,
                id_config: configId,
                gallery: galleryJSON,
                size: 0 
              });

            if (galleryError) {
              console.error('Erreur insertion champ galerie:', galleryError);
            } else {
              console.log('Champ galerie inséré avec succès');
              processedFields[fieldName] = { type: 'gallery', value: galleryData };
            }
            break;

          case 'video':
            // Pour les vidéos, on attend un objet avec { url, name } ou juste une URL string
            let videoData;
            if (typeof fieldValue === 'string') {
              // Si c'est juste une URL, utiliser l'URL comme name aussi
              videoData = {
                url: fieldValue,
                name: fieldValue
              };
            } else if (typeof fieldValue === 'object' && fieldValue.url) {
              // Si c'est un objet avec url, name, etc.
              videoData = {
                url: fieldValue.url,
                name: fieldValue.name || fieldValue.url
              };
            } else {
              console.error(`Format invalide pour le champ vidéo "${fieldName}":`, fieldValue);
              continue;
            }

            // Générer un ID unique pour la vidéo
            const videoId = uuidv4();

            console.log('Insertion champ vidéo avec:', {
              id: videoId,
              collection_element_id: elementId,
              id_config: configId,
              src_video: videoData.url,
              name_video: videoData.name
            });

            const { error: videoError } = await supabase
              .from('collection_field_video')
              .insert({
                id: videoId,
                collection_element_id: elementId,
                id_config: configId,
                src_video: videoData.url,
                name_video: videoData.name,
                size: 0
              });

            if (videoError) {
              console.error('Erreur insertion champ vidéo:', videoError);
            } else {
              console.log('Champ vidéo inséré avec succès');
              processedFields[fieldName] = { type: 'video', value: videoData };
            }
            break;

          case 'multiReference':
            // Pour les multiréférences, on attend un tableau d'objets avec { value, label } ou juste des IDs
            let multiRefData = [];
            
            if (Array.isArray(fieldValue)) {
              multiRefData = fieldValue.map(item => {
                if (typeof item === 'string') {
                  // Si c'est un string, c'est le label directement
                  return {
                    value: String(item), // On utilise le label comme value aussi
                    label: String(item)
                  };
                } else if (typeof item === 'number') {
                  // Si c'est un number, on le convertit en string pour le label
                  return {
                    value: String(item),
                    label: String(item)
                  };
                } else if (typeof item === 'object' && item.label) {
                  // Si c'est un objet avec un label, on utilise le label
                  return {
                    value: String(item.label),
                    label: String(item.label)
                  };
                }
                return null;
              }).filter(item => item !== null);
            } else {
              console.error(`Format invalide pour le champ multiReference "${fieldName}": doit être un tableau`, fieldValue);
              continue;
            }

            if (multiRefData.length === 0) {
              console.warn(`Aucune référence valide trouvée pour la multiReference "${fieldName}"`);
              continue;
            }

            console.log('Insertion champ multiReference avec:', {
              collection_element_id: elementId,
              id_config: configId,
              info_ref: multiRefData
            });

            // Convertir le tableau de références en JSON pour la base de données
            const multiRefJSON = JSON.stringify(multiRefData);

            const { error: multiRefError } = await supabase
              .from('collection_field_multireference')
              .insert({
                collection_element_id: elementId,
                id_config: configId,
                info_ref: multiRefJSON
              });

            if (multiRefError) {
              console.error('Erreur insertion champ multiReference:', multiRefError);
            } else {
              console.log('Champ multiReference inséré avec succès');
              processedFields[fieldName] = { type: 'multiReference', value: multiRefData };
            }
            break;

          default:
            console.warn(`Type de champ "${fieldType}" non supporté pour le moment`);
        }
      } catch (fieldError) {
        console.error(`Erreur lors du traitement du champ "${fieldName}":`, fieldError);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Élément de collection créé avec succès',
      element: {
        id: createdElement.id,
        name: createdElement.collection_element_name,
        slug: createdElement.collection_element_slug,
        status: createdElement.collection_element_status,
        collection_id: createdElement.collection_id,
        created_at: createdElement.collection_element_create_date
      },
      processedFields
    });

  } catch (error) {
    console.error('Erreur lors de la création de l\'élément:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors de la création de l\'élément.',
      details: error.message 
    });
  }
});

// Endpoint pour mettre à jour un élément de collection
router.put('/collection/:collectionId/elements/:elementId', authenticateAPIKey, async (req, res) => {
  try {
    const { collectionId, elementId } = req.params;
    const { 
      name, 
      slug, 
      status,
      fields = {} // Objet contenant les champs personnalisés
    } = req.body;

    // Vérifier les permissions CMS
    if (!req.tokenData.permissions.includes('cms')) {
      return res.status(403).json({ 
        error: 'Ce token n\'a pas les permissions CMS nécessaires.' 
      });
    }

    const supabase = req.supabase;
    const currentDate = new Date().toISOString();

    // Vérifier que la collection existe et appartient au bon site
    const { data: collection, error: collectionError } = await supabase
      .from('collection')
      .select('id, website_id')
      .eq('id', collectionId)
      .eq('website_id', req.tokenData.website_id)
      .single();

    if (collectionError || !collection) {
      return res.status(404).json({ 
        error: 'Collection non trouvée ou non autorisée pour ce token.' 
      });
    }

    // Vérifier que l'élément existe dans cette collection
    const { data: existingElement, error: elementError } = await supabase
      .from('collection_element')
      .select('*')
      .eq('id', elementId)
      .eq('collection_id', collectionId)
      .single();

    if (elementError || !existingElement) {
      return res.status(404).json({ 
        error: 'Élément non trouvé dans cette collection.' 
      });
    }

    // Vérifier que le slug n'existe pas déjà (sauf pour cet élément)
    if (slug && slug !== existingElement.collection_element_slug) {
      const { data: duplicateElement } = await supabase
        .from('collection_element')
        .select('id')
        .eq('collection_id', collectionId)
        .eq('collection_element_slug', slug)
        .neq('id', elementId)
        .maybeSingle();

      if (duplicateElement) {
        return res.status(409).json({ 
          error: 'Un autre élément avec ce slug existe déjà dans cette collection.' 
        });
      }
    }

    console.log('Mise à jour de l\'élément', elementId, 'dans la collection', collectionId);

    // Préparer les données de mise à jour de l'élément
    const updateData = {
      collection_element_update_date: currentDate
    };

    if (name !== undefined) updateData.collection_element_name = name;
    if (slug !== undefined) updateData.collection_element_slug = slug;
    if (status !== undefined) {
      updateData.collection_element_status = status;
      if (status === 1 && existingElement.collection_element_status !== 1) {
        // Publication pour la première fois
        updateData.collection_element_publish_date = currentDate;
        if (req.tokenData.userId && req.tokenData.userId.length === 36) {
          updateData.published_by = req.tokenData.userId;
        }
      }
    }

    console.log('Données de mise à jour de l\'élément:', updateData);

    // Mettre à jour l'élément de collection
    const { data: updatedElement, error: updateError } = await supabase
      .from('collection_element')
      .update(updateData)
      .eq('id', elementId)
      .select()
      .single();

    if (updateError) {
      console.error('Erreur lors de la mise à jour de l\'élément:', updateError);
      throw updateError;
    }

    // Traiter les champs personnalisés (mise à jour ou création)
    const processedFields = {};

    console.log('Champs reçus à traiter:', fields);

    if (Object.keys(fields).length > 0) {
      // Récupérer la configuration des champs pour cette collection
      const { data: fieldConfigs, error: configError } = await supabase
        .from('collection_config')
        .select('id, tab_field, name_field')
        .eq('collection_id', collectionId);

      console.log('Configuration des champs récupérée:', fieldConfigs);
      if (configError) {
        console.warn('Erreur lors de la récupération des configurations de champs:', configError);
      }

      // Traiter chaque champ fourni
      for (const [fieldName, fieldValue] of Object.entries(fields)) {
        try {
          console.log(`\nTraitement du champ "${fieldName}" avec la valeur:`, fieldValue);
          
          const fieldConfig = fieldConfigs?.find(config => 
            config.name_field.toLowerCase() === fieldName.toLowerCase()
          );

          if (!fieldConfig) {
            console.warn(`Champ "${fieldName}" non trouvé dans la configuration de la collection`);
            console.log('Champs disponibles:', fieldConfigs?.map(c => c.name_field));
            continue;
          }

          const fieldType = fieldConfig.tab_field;
          const configId = fieldConfig.id;
          console.log(`Type de champ: ${fieldType}, Config ID: ${configId}`);

          // Supprimer les anciens champs de ce type pour cet élément et cette config
          const tableName = `collection_field_${fieldType === 'richText' ? 'richtext' : fieldType === 'multiReference' ? 'multireference' : fieldType}`;
          
          const { error: deleteError } = await supabase
            .from(tableName)
            .delete()
            .eq('collection_element_id', elementId)
            .eq('id_config', configId);

          if (deleteError) {
            console.warn(`Erreur lors de la suppression des anciens champs ${fieldType}:`, deleteError);
          }

          // Traiter selon le type de champ (même logique que dans la création)
          switch (fieldType) {
            case 'text':
              console.log('Mise à jour champ text avec:', {
                collection_element_id: elementId,
                id_config: configId,
                text: String(fieldValue)
              });
              const { error: textError } = await supabase
                .from('collection_field_text')
                .insert({
                  collection_element_id: elementId,
                  id_config: configId,
                  text: String(fieldValue)
                });
              if (textError) {
                console.error('Erreur mise à jour champ text:', textError);
              } else {
                console.log('Champ text mis à jour avec succès');
                processedFields[fieldName] = { type: 'text', value: fieldValue };
              }
              break;

            case 'richText':
              let richTextJSON;
              if (typeof fieldValue === 'object') {
                richTextJSON = JSON.stringify(fieldValue);
              } else {
                richTextJSON = JSON.stringify({
                  blocks: [{
                    key: uuidv4(),
                    text: String(fieldValue),
                    type: 'unstyled',
                    depth: 0,
                    inlineStyleRanges: [],
                    entityRanges: [],
                    data: {}
                  }],
                  entityMap: {}
                });
              }

              const { error: richTextError } = await supabase
                .from('collection_field_richtext')
                .insert({
                  collection_element_id: elementId,
                  id_config: configId,
                  text_json: richTextJSON,
                  size: 0
                });
              if (richTextError) {
                console.error('Erreur mise à jour champ richText:', richTextError);
              } else {
                console.log('Champ richText mis à jour avec succès');
                processedFields[fieldName] = { type: 'richText', value: fieldValue };
              }
              break;

            case 'image':
              let imageData;
              if (typeof fieldValue === 'string') {
                imageData = {
                  url: fieldValue,
                  alt: fieldValue,
                  name: fieldValue
                };
              } else if (typeof fieldValue === 'object' && fieldValue.url) {
                imageData = {
                  url: fieldValue.url,
                  alt: fieldValue.alt || fieldValue.url,
                  name: fieldValue.name || fieldValue.alt || fieldValue.url
                };
              } else {
                console.error(`Format invalide pour le champ image "${fieldName}":`, fieldValue);
                continue;
              }

              const imageId = uuidv4();
              const { error: imageError } = await supabase
                .from('collection_field_image')
                .insert({
                  id: imageId,
                  collection_element_id: elementId,
                  id_config: configId,
                  src_image: imageData.url,
                  alt_image: imageData.alt,
                  name_image: imageData.name
                });

              if (imageError) {
                console.error('Erreur mise à jour champ image:', imageError);
              } else {
                console.log('Champ image mis à jour avec succès');
                processedFields[fieldName] = { type: 'image', value: imageData };
              }
              break;

            case 'gallery':
              let galleryData = [];
              
              if (Array.isArray(fieldValue)) {
                galleryData = fieldValue.map(item => {
                  if (typeof item === 'string') {
                    return {
                      url: item,
                      alt: item,
                      name: item
                    };
                  } else if (typeof item === 'object' && item.url) {
                    return {
                      url: item.url,
                      alt: item.alt || item.url,
                      name: item.name || item.alt || item.url
                    };
                  }
                  return null;
                }).filter(item => item !== null);
              } else {
                console.error(`Format invalide pour le champ galerie "${fieldName}": doit être un tableau`, fieldValue);
                continue;
              }

              if (galleryData.length === 0) {
                console.warn(`Aucune image valide trouvée pour la galerie "${fieldName}"`);
                continue;
              }

              const galleryId = uuidv4();
              const galleryJSON = JSON.stringify(galleryData);

              const { error: galleryError } = await supabase
                .from('collection_field_gallery')
                .insert({
                  id: galleryId,
                  collection_element_id: elementId,
                  id_config: configId,
                  gallery: galleryJSON,
                  size: 0
                });

              if (galleryError) {
                console.error('Erreur mise à jour champ galerie:', galleryError);
              } else {
                console.log('Champ galerie mis à jour avec succès');
                processedFields[fieldName] = { type: 'gallery', value: galleryData };
              }
              break;

            case 'video':
              // Pour les vidéos, on attend un objet avec { url, name } ou juste une URL string
              let videoData;
              if (typeof fieldValue === 'string') {
                // Si c'est juste une URL, utiliser l'URL comme name aussi
                videoData = {
                  url: fieldValue,
                  name: fieldValue
                };
              } else if (typeof fieldValue === 'object' && fieldValue.url) {
                // Si c'est un objet avec url, name, etc.
                videoData = {
                  url: fieldValue.url,
                  name: fieldValue.name || fieldValue.url
                };
              } else {
                console.error(`Format invalide pour le champ vidéo "${fieldName}":`, fieldValue);
                continue;
              }

              // Générer un ID unique pour la vidéo
              const videoId = uuidv4();

              console.log('Mise à jour champ vidéo avec:', {
                id: videoId,
                collection_element_id: elementId,
                id_config: configId,
                src_video: videoData.url,
                name_video: videoData.name
              });

              const { error: videoError } = await supabase
                .from('collection_field_video')
                .insert({
                  id: videoId,
                  collection_element_id: elementId,
                  id_config: configId,
                  src_video: videoData.url,
                  name_video: videoData.name,
                  size: 0
                });

              if (videoError) {
                console.error('Erreur mise à jour champ vidéo:', videoError);
              } else {
                console.log('Champ vidéo mis à jour avec succès');
                processedFields[fieldName] = { type: 'video', value: videoData };
              }
              break;

            case 'multiReference':
              let multiRefData = [];
              
              if (Array.isArray(fieldValue)) {
                multiRefData = fieldValue.map(item => {
                  if (typeof item === 'string') {
                    return {
                      value: String(item),
                      label: String(item)
                    };
                  } else if (typeof item === 'number') {
                    return {
                      value: String(item),
                      label: String(item)
                    };
                  } else if (typeof item === 'object' && item.label) {
                    return {
                      value: String(item.label),
                      label: String(item.label)
                    };
                  }
                  return null;
                }).filter(item => item !== null);
              } else {
                console.error(`Format invalide pour le champ multiReference "${fieldName}": doit être un tableau`, fieldValue);
                continue;
              }

              if (multiRefData.length === 0) {
                console.warn(`Aucune référence valide trouvée pour la multiReference "${fieldName}"`);
                continue;
              }

              const multiRefJSON = JSON.stringify(multiRefData);

              const { error: multiRefError } = await supabase
                .from('collection_field_multireference')
                .insert({
                  collection_element_id: elementId,
                  id_config: configId,
                  info_ref: multiRefJSON
                });

              if (multiRefError) {
                console.error('Erreur mise à jour champ multiReference:', multiRefError);
              } else {
                console.log('Champ multiReference mis à jour avec succès');
                processedFields[fieldName] = { type: 'multiReference', value: multiRefData };
              }
              break;

            default:
              console.warn(`Type de champ "${fieldType}" non supporté pour le moment`);
          }
        } catch (fieldError) {
          console.error(`Erreur lors du traitement du champ "${fieldName}":`, fieldError);
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'Élément de collection mis à jour avec succès',
      element: {
        id: updatedElement.id,
        name: updatedElement.collection_element_name,
        slug: updatedElement.collection_element_slug,
        status: updatedElement.collection_element_status,
        collection_id: updatedElement.collection_id,
        created_at: updatedElement.collection_element_create_date,
        updated_at: updatedElement.collection_element_update_date,
        published_at: updatedElement.collection_element_publish_date
      },
      processedFields
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'élément:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors de la mise à jour de l\'élément.',
      details: error.message 
    });
  }
});

// Endpoint pour publier le site
router.post('/websites/publish', authenticateAPIKey, async (req, res) => {
  try {
    // Récupérer l'ID du site depuis le token
    const websiteId = req.tokenData.website_id;

    // Vérifier les permissions CMS
    if (!req.tokenData.permissions.includes('cms')) {
      return res.status(403).json({ 
        error: 'Ce token n\'a pas les permissions CMS nécessaires.' 
      });
    }

    const supabase = req.supabase;

    // Vérifier que le site existe
    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('id, folder_project')
      .eq('id', websiteId)
      .single();

    if (websiteError || !website) {
      return res.status(404).json({ 
        error: 'Site web non trouvé.' 
      });
    }

    // Déclencher la génération statique directement
    try {
      // Appel direct à la fonction de génération sans passer par HTTP
      const { generateFiles } = require('../function');
      
      const generateResponse = await generateFiles(parseInt(websiteId));

      res.status(200).json({
        success: true,
        message: 'Publication du site déclenchée avec succès',
        website_id: websiteId,
        folder_project: website.folder_project,
        timestamp: new Date().toISOString(),
        generation_result: generateResponse
      });

    } catch (generateError) {
      console.error('Erreur lors de la génération:', generateError);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la génération du site',
        details: generateError.message
      });
    }

  } catch (error) {
    console.error('Erreur lors de la publication du site:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors de la publication du site.',
      details: error.message 
    });
  }
});

// Endpoint pour récupérer les collections d'un site
router.get('/collections', authenticateAPIKey, async (req, res) => {
  try {
    // Récupérer l'ID du site depuis le token
    const websiteId = req.tokenData.website_id;
    const supabase = req.supabase;

    const { data: collections, error } = await supabase
      .from('collection')
      .select(`
        id, 
        collection_name, 
        collection_slug,
        created_at,
        updated_at
      `)
      .eq('website_id', websiteId);

    if (error) throw error;

    res.status(200).json({
      success: true,
      collections: collections || []
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des collections:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors de la récupération des collections.',
      details: error.message 
    });
  }
});

// Endpoint pour récupérer la configuration d'une collection
router.get('/collections/:collectionId/config', authenticateAPIKey, async (req, res) => {
  try {
    const { collectionId } = req.params;
    const supabase = req.supabase;

    const { data: config, error } = await supabase
      .from('collection_config')
      .select('id, tab_field, name_field, description_field')
      .eq('collection_id', collectionId)
      .order('field_order', { ascending: true });

    if (error) throw error;

    res.status(200).json({
      success: true,
      config: config || []
    });

  } catch (error) {
    console.error('Erreur lors de la récupération de la configuration:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors de la récupération de la configuration.',
      details: error.message 
    });
  }
});

// Endpoint pour récupérer les éléments d'une collection
router.get('/collections/:collectionId/elements', authenticateAPIKey, async (req, res) => {
  try {
    const { collectionId } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;
    const supabase = req.supabase;

    // Vérifier que la collection existe et appartient au bon site
    const { data: collection, error: collectionError } = await supabase
      .from('collection')
      .select('id, website_id, collection_name')
      .eq('id', collectionId)
      .eq('website_id', req.tokenData.website_id)
      .single();

    if (collectionError || !collection) {
      return res.status(404).json({ 
        error: 'Collection non trouvée ou non autorisée pour ce token.' 
      });
    }

    // Construire la requête pour récupérer les éléments
    let query = supabase
      .from('collection_element')
      .select(`
        id,
        collection_element_name,
        collection_element_slug,
        collection_element_status,
        collection_element_create_date,
        collection_element_update_date,
        collection_element_publish_date,
        created_by,
        published_by
      `)
      .eq('collection_id', collectionId)
      .order('collection_element_create_date', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    // Filtrer par statut si spécifié
    if (status !== undefined) {
      query = query.eq('collection_element_status', parseInt(status));
    }

    const { data: elements, error: elementsError } = await query;

    if (elementsError) {
      throw elementsError;
    }

    // Compter le total d'éléments pour la pagination
    let countQuery = supabase
      .from('collection_element')
      .select('id', { count: 'exact', head: true })
      .eq('collection_id', collectionId);

    if (status !== undefined) {
      countQuery = countQuery.eq('collection_element_status', parseInt(status));
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.warn('Erreur lors du comptage des éléments:', countError);
    }

    res.status(200).json({
      success: true,
      collection: {
        id: collection.id,
        name: collection.collection_name
      },
      elements: (elements || []).map(element => ({
        id: element.id,
        name: element.collection_element_name,
        slug: element.collection_element_slug,
        status: element.collection_element_status,
        created_at: element.collection_element_create_date,
        updated_at: element.collection_element_update_date,
        published_at: element.collection_element_publish_date,
        created_by: element.created_by,
        published_by: element.published_by
      })),
      pagination: {
        total: count || 0,
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more: count ? (parseInt(offset) + parseInt(limit)) < count : false
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des éléments:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors de la récupération des éléments.',
      details: error.message 
    });
  }
});

module.exports = router;