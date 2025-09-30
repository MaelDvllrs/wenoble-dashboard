const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { supabaseServer } = require('../supabase');

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
    const elementData = {
      collection_id: collectionId, // UUID, ne pas convertir en integer
      collection_element_name: name,
      collection_element_slug: slug,
      collection_element_status: status,
      collection_element_create_date: currentDate,
      collection_element_update_date: currentDate
    };

    // Ajouter created_by seulement si c'est un UUID valide
    if (req.tokenData.userId && req.tokenData.userId.length === 36) {
      elementData.created_by = req.tokenData.userId;
    }

    if (status === 1) {
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

module.exports = router;