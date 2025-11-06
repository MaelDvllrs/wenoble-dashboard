const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { supabaseServer, supabaseServerAdmin } = require('../supabase');
const { authenticateToken } = require('../middleware/authToken');
const { checkUserWorkspaceAccess } = require('../workspace/workspace');
const { addCustomDomain, removeCustomDomain, listCustomDomains, getDomainStatus } = require('../cloudflare/cloudflareDomains');

const router = express.Router();

router.use(cors());
router.use(express.json());

require('dotenv').config();

// Helpers: slugify name and generate a unique API key that includes the site name
const slugify = (str) => {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
};

const randomSegment = (length = 8) => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
};

// Attempts to generate a unique api_key based on the website slug/name
const generateUniqueApiKey = async (supabase, baseNameOrSlug) => {
  const base = slugify(baseNameOrSlug) || 'site';
  // Try a few candidates to avoid a round-trip race
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `wn-${base}-${randomSegment(10)}`;
    const { data, error } = await supabase
      .from('websites')
      .select('id')
      .eq('api_key', candidate)
      .maybeSingle();
    if (error) throw error;
    if (!data) return candidate;
  }
  // Fallback – add timestamp to guarantee uniqueness
  return `wn-${base}-${Date.now()}-${randomSegment(6)}`;
};

// Fonction helper pour vérifier l'accès d'un utilisateur à un site web (mise à jour avec workspaces)
const checkUserWebsiteAccess = async (supabase, userId, websiteId) => {
  // D'abord vérifier l'accès direct au site web
  const { data: directAccess, error: directError } = await supabase
    .from('user_websites')
    .select('role')
    .eq('user_id', userId)
    .eq('website_id', websiteId)
    .single();
    
  if (!directError && directAccess) {
    return { hasAccess: true, role: directAccess.role, accessType: 'direct' };
  }

  // Si pas d'accès direct, vérifier via le workspace
  const { data: websiteData, error: websiteError } = await supabase
    .from('websites')
    .select('workspace_id, visibility')
    .eq('id', websiteId)
    .single();
    
  if (websiteError) {
    if (websiteError.code === 'PGRST116') {
      return { hasAccess: false, role: null, accessType: null };
    }
    throw websiteError;
  }
  
  if (websiteData.workspace_id) {
    const { hasAccess, role } = await checkUserWorkspaceAccess(supabase, userId, websiteData.workspace_id);
    if (hasAccess) {
      // Vérifier la visibilité du site web
      if (websiteData.visibility === 'restricted') {
        // Site restreint : seuls les utilisateurs explicitement ajoutés peuvent y accéder
        // On a déjà vérifié l'accès direct plus haut, donc pas d'accès via workspace
        return { hasAccess: false, role: null, accessType: null };
      } else {
        // Site visible par tous les membres du workspace
        // Par défaut, tous les membres du workspace sont viewer pour les sites workspace
        const websiteRole = 'viewer';
        return { hasAccess: true, role: websiteRole, accessType: 'workspace' };
      }
    }
  }
  
  return { hasAccess: false, role: null, accessType: null };
};

// Récupérer les sites web d'un workspace spécifique
router.get('/getUserWebsites', authenticateToken, async (req, res) => {
  try {
    const { workspaceId } = req.query;
    const userId = req.user.idUser;
    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);

    if (!workspaceId) {
      return res.status(400).send({ error: 'workspaceId est requis' });
    }

    // Vérifier l'accès de l'utilisateur au workspace
    const { hasAccess, role: workspaceRole } = await checkUserWorkspaceAccess(supabase, userId, workspaceId);
    if (!hasAccess) {
      return res.status(403).send({ error: 'Vous n\'avez pas accès à ce workspace' });
    }

    // Récupérer tous les sites web du workspace
    const { data: websites, error: websitesError } = await supabase
      .from('websites')
      .select('id, website_name, website_slug, website_preview, workspace_id, visibility, created_at, updated_at')
      .eq('workspace_id', workspaceId);

    if (websitesError) {
      console.error('Erreur lors de la récupération des sites web du workspace:', websitesError);
      throw websitesError;
    }


    if (!websites || websites.length === 0) {
      return res.send({ websites: [] });
    }

    // Récupérer les accès directs de l'utilisateur aux sites de ce workspace
    const websiteIds = websites.map(w => w.id);
    const { data: directAccess, error: directError } = await supabase
      .from('user_websites')
      .select('website_id, role')
      .eq('user_id', userId)
      .in('website_id', websiteIds);

    if (directError && directError.code !== 'PGRST116') {
      console.error('Erreur lors de la récupération des accès directs:', directError);
      throw directError;
    }

    // Créer une map des accès directs
    const directAccessMap = new Map();
    if (directAccess) {
      directAccess.forEach(da => {
        directAccessMap.set(da.website_id, da.role);
      });
    }

    // Filtrer et enrichir les sites web selon les règles d'accès
    const accessibleWebsites = [];
    
    websites.forEach(website => {
      const directRole = directAccessMap.get(website.id);

      let hasAccess = false;
      let userRole = 'viewer';
      let accessType = 'workspace';

      // Déterminer l'accès selon la visibilité
      if (website.visibility === 'workspace') {
        // Site visible par tous les membres du workspace
        hasAccess = true;
        if (directRole) {
          // Accès direct prioritaire
          userRole = directRole;
          accessType = 'direct';
        } else {
          // Par défaut, tous les membres du workspace sont viewer pour les sites workspace
          userRole = 'viewer';
          accessType = 'workspace';
        }
      } else if (website.visibility === 'restricted') {
        // Site restreint : seuls les utilisateurs avec accès direct
        if (directRole) {
          hasAccess = true;
          userRole = directRole;
          accessType = 'direct';
        }
      }

      if (hasAccess) {
        accessibleWebsites.push({
          ...website,
          user_role: userRole,
          access_type: accessType
        });
      }
    });

    
    res.send({ websites: accessibleWebsites });
  } catch (error) {
    console.error('Erreur lors de la récupération des sites web:', error);
    res.status(500).send({ error: error.message });
  }
});

// Récupérer les sites web d'un workspace spécifique
router.get('/getWorkspaceWebsites', authenticateToken, async (req, res) => {
  try {
    const { workspaceId } = req.query;
    const userId = req.user.idUser;
    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);

    if (!workspaceId) {
      return res.status(400).send({ error: 'workspaceId est requis' });
    }

    // Vérifier l'accès de l'utilisateur au workspace
    const { hasAccess, role: workspaceRole } = await checkUserWorkspaceAccess(supabase, userId, workspaceId);
    if (!hasAccess) {
      return res.status(403).send({ error: 'Vous n\'avez pas accès à ce workspace' });
    }

    // Récupérer tous les sites web du workspace
    const { data: websites, error: websitesError } = await supabase
      .from('websites')
      .select('id, website_name, website_slug, workspace_id, visibility, created_at, updated_at')
      .eq('workspace_id', workspaceId);

    if (websitesError) {
      console.error('Erreur lors de la récupération des sites web du workspace:', websitesError);
      throw websitesError;
    }

    if (!websites || websites.length === 0) {
      return res.send({ websites: [] });
    }

    // Récupérer les accès directs de l'utilisateur aux sites de ce workspace
    const websiteIds = websites.map(w => w.id);
    const { data: directAccess, error: directError } = await supabase
      .from('user_websites')
      .select('website_id, role')
      .eq('user_id', userId)
      .in('website_id', websiteIds);

    if (directError && directError.code !== 'PGRST116') {
      console.error('Erreur lors de la récupération des accès directs:', directError);
      throw directError;
    }

    // Créer une map des accès directs
    const directAccessMap = new Map();
    if (directAccess) {
      directAccess.forEach(da => {
        directAccessMap.set(da.website_id, da.role);
      });
    }

    // Filtrer et enrichir les sites web selon les règles d'accès
    const accessibleWebsites = [];
    
    websites.forEach(website => {
      const directRole = directAccessMap.get(website.id);

      let hasAccess = false;
      let userRole = 'viewer';
      let accessType = 'workspace';

      // Déterminer l'accès selon la visibilité
      if (website.visibility === 'workspace') {
        // Site visible par tous les membres du workspace
        hasAccess = true;
        if (directRole) {
          // Accès direct prioritaire
          userRole = directRole;
          accessType = 'direct';
        } else {
          // Par défaut, tous les membres du workspace sont viewer pour les sites workspace
          userRole = 'viewer';
          accessType = 'workspace';
        }
      } else if (website.visibility === 'restricted') {
        // Site restreint : seuls les utilisateurs avec accès direct
        if (directRole) {
          hasAccess = true;
          userRole = directRole;
          accessType = 'direct';
        }
      }

      if (hasAccess) {
        accessibleWebsites.push({
          ...website,
          user_role: userRole,
          access_type: accessType
        });
      }
    });

    
    res.send({ websites: accessibleWebsites });
  } catch (error) {
    console.error('Erreur lors de la récupération des sites web du workspace:', error);
    res.status(500).send({ error: error.message });
  }
});

// ENDPOINT DE DEBUG - À supprimer après résolution
router.get('/debugUserWebsites', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.idUser;
    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);



    // 1. Vérifier les données dans user_websites
    const { data: userWebsitesData, error: userWebsitesError } = await supabase
      .from('user_websites')
      .select('*')
      .eq('user_id', userId);
    


    // 2. Vérifier les données dans websites
    const { data: websitesData, error: websitesError } = await supabase
      .from('websites')
      .select('*');
    

    // 3. Test de la requête avec jointure
    const { data: joinData, error: joinError } = await supabase
      .from('user_websites')
      .select(`
        role,
        websites (
          id,
          website_name,
          website_slug,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', userId);
    

    res.send({
      userId,
      userWebsitesData,
      userWebsitesError,
      websitesData,
      websitesError,
      joinData,
      joinError
    });
  } catch (error) {
    console.error('Erreur dans le debug:', error);
    res.status(500).send({ error: error.message });
  }
});

// Créer un nouveau site web
router.post('/createWebsite', authenticateToken, async (req, res) => {
  try {
    const { website_name, workspace_id, visibility = 'workspace' } = req.body;

    const userId = req.user.idUser;
    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);

    if (!website_name) {
      return res.status(400).send({ error: 'Le nom du site web est requis' });
    }

    if (!['workspace', 'restricted'].includes(visibility)) {
      return res.status(400).send({ error: 'Visibilité invalide. Utilisez: workspace ou restricted' });
    }

    let finalWorkspaceId = workspace_id;

    // Si aucun workspace spécifié, utiliser le workspace par défaut de l'utilisateur
    if (!finalWorkspaceId) {
      const { data: defaultWorkspace, error: workspaceError } = await supabase
        .from('workspaces')
        .select('id')
        .eq('created_by', userId)
        .eq('is_default', true)
        .single();

      if (workspaceError) {
        if (workspaceError.code === 'PGRST116') {
          return res.status(400).send({ error: 'Aucun workspace par défaut trouvé. Veuillez spécifier un workspace.' });
        }
        throw workspaceError;
      }

      finalWorkspaceId = defaultWorkspace.id;
    } else {
      // Vérifier l'accès au workspace spécifié
      const { hasAccess, role } = await checkUserWorkspaceAccess(supabase, userId, finalWorkspaceId);
      if (!hasAccess || (role !== 'admin' && role !== 'member')) {
        return res.status(403).send({ error: 'Vous n\'avez pas les droits pour créer un site web dans ce workspace' });
      }
    }

  // Générer une API key unique qui contient le nom du site
  const apiKey = await generateUniqueApiKey(supabase, website_name);

  // Créer le site web
    const { data: websiteData, error: websiteError } = await supabase
      .from('websites')
      .insert({
        website_name,
        api_key: apiKey,
        workspace_id: finalWorkspaceId,
        visibility,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (websiteError) throw websiteError;

    // Ajouter l'utilisateur comme admin du site web
    const { error: userWebsiteError } = await supabase
      .from('user_websites')
      .insert({
        user_id: userId,
        website_id: websiteData.id,
        role: 'admin',
        created_at: new Date().toISOString()
      });

    if (userWebsiteError) throw userWebsiteError;

    // Créer un abonnement gratuit par défaut pour le nouveau site (server-side)
    try {
      const { data: freePlan, error: freePlanError } = await supabase
        .from('subscription_plans')
        .select('id, name')
        .eq('name', 'free')
        .maybeSingle();

      if (freePlan && !freePlanError) {
        // Use admin client to avoid RLS issues when writing server-side
        const supabaseAdmin = supabaseServerAdmin();
        const upsertPayload = {
          website_id: websiteData.id,
          subscription_plan_id: freePlan.id,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data: upserted, error: upsertError } = await supabaseAdmin
          .from('website_subscriptions')
          .upsert(upsertPayload, { onConflict: 'website_id' })
          .maybeSingle();

        if (upsertError) {
          console.error('Erreur lors de la création/upsert de l\'abonnement gratuit:', upsertError);
        } else {
          // free subscription upserted for the site
        }
      } else if (freePlanError) {
        console.error('Erreur lors de la récupération du plan free:', freePlanError);
      }
    } catch (e) {
      console.error('Exception lors de la création de l\'abonnement gratuit:', e);
    }
    // Les features sont maintenant déterminées par le plan d'abonnement du site
    // Pas besoin de créer d'entrée dans website_feature
    
    res.send({ 
      message: 'Site web créé avec succès', 
      website: { ...websiteData, user_role: 'admin', access_type: 'direct' }
    });
  } catch (error) {
    console.error('Erreur lors de la création du site web:', error);
    res.status(500).send({ error: error.message });
  }
});

// Récupérer un site web par son ID
router.get('/getWebsiteById', authenticateToken, async (req, res) => {
  try {
    const websiteId = req.query.websiteId;
    const userId = req.user.idUser;
    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);
    

    if (!websiteId) {
      return res.status(400).send({ error: 'websiteId est requis' });
    }

    // Vérifier l'accès de l'utilisateur au site web
    const { hasAccess, role } = await checkUserWebsiteAccess(supabase, userId, websiteId);
    if (!hasAccess) {
      return res.status(403).send({ error: 'Vous n\'avez pas accès à ce site web' });
    }

    // Récupérer les informations du site web
    const { data, error } = await supabase
      .from('websites')
      .select('id, api_key, website_name, website_slug, website_preview, workspace_id, visibility, created_at, updated_at')
      .eq('id', websiteId)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).send({ error: 'Site web non trouvé' });
      }
      throw error;
    }
    
    res.send({ 
      data: { 
        ...data, 
        user_role: role 
      } 
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du site web:', error);
    res.status(500).send({ error: error.message });
  }
});

// Mettre à jour un site web
router.post('/updateWebsite', authenticateToken, async (req, res) => {
  try {
    const { website_id, website_name, analytics_id, visibility } = req.body;
    const userId = req.user.idUser;
    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);

    if (!website_id) {
      return res.status(400).send({ error: 'website_id est requis' });
    }

    // Vérifier l'accès de l'utilisateur au site web (doit être admin)
    const { hasAccess, role } = await checkUserWebsiteAccess(supabase, userId, website_id);
    if (!hasAccess || role !== 'admin') {
      return res.status(403).send({ error: 'Vous devez être administrateur pour modifier ce site web' });
    }

    // Préparer les données de mise à jour
    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (website_name) updateData.website_name = website_name;
    if (analytics_id !== undefined) updateData.analytics_id = analytics_id || null;
    if (visibility && ['workspace', 'restricted'].includes(visibility)) {
      updateData.visibility = visibility;
    }

    // Mettre à jour le site web
    const { data, error } = await supabase
      .from('websites')
      .update(updateData)
      .eq('id', website_id)
      .select()
      .single();
      
    if (error) throw error;
    
    res.send({ 
      message: 'Site web mis à jour avec succès', 
      website: { ...data, user_role: role }
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du site web:', error);
    res.status(500).send({ error: error.message });
  }
});

// Supprimer un site web
router.delete('/deleteWebsite', authenticateToken, async (req, res) => {
  try {
    const websiteId = req.query.websiteId;
    const userId = req.user.idUser;
    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);

    if (!websiteId) {
      return res.status(400).send({ error: 'websiteId est requis' });
    }

    // Vérifier l'accès de l'utilisateur au site web (doit être admin)
    const { hasAccess, role } = await checkUserWebsiteAccess(supabase, userId, websiteId);
    if (!hasAccess || role !== 'admin') {
      return res.status(403).send({ error: 'Vous devez être administrateur pour supprimer ce site web' });
    }

    const { error: userWebsitesDeleteError } = await supabase
      .from('user_websites')
      .delete()
      .eq('website_id', websiteId);
      
    if (userWebsitesDeleteError) throw userWebsitesDeleteError;
      
    // Supprimer le site web (les contraintes de clé étrangère supprimeront automatiquement les relations restantes)
    const { error } = await supabase
      .from('websites')
      .delete()
      .eq('id', websiteId);
      
    if (error) throw error;
    
    res.send({ message: 'Site web supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du site web:', error);
    res.status(500).send({ error: error.message });
  }
});

// Ajouter un utilisateur à un site web
router.post('/addUserToWebsite', authenticateToken, async (req, res) => {
  
  try {
    const { website_id, user_email, role = 'editor' } = req.body;
    const userId = req.user.idUser;
    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);
    console.log('Ajout de l\'utilisateur au site web:', { website_id, user_email, role });
    

    if (!website_id || !user_email) {
      return res.status(400).send({ error: 'website_id et user_email sont requis' });
    }

    // Vérifier l'accès de l'utilisateur au site web (doit être admin)
    const { hasAccess, role: userRole } = await checkUserWebsiteAccess(supabase, userId, website_id);
    if (!hasAccess || userRole !== 'admin') {
      return res.status(403).send({ error: 'Vous devez être administrateur pour ajouter des utilisateurs' });
    }

    // Trouver l'utilisateur par email
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', user_email)
      .single();

    if (userError) {
      if (userError.code === 'PGRST116') {
        return res.status(404).send({ error: 'Utilisateur non trouvé' });
      }
      throw userError;
    }

    // Vérifier si l'utilisateur n'est pas déjà associé au site web
    const { data: existing, error: existingError } = await supabase
      .from('user_websites')
      .select('id')
      .eq('user_id', userData.id)
      .eq('website_id', website_id)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing) {
      return res.status(400).send({ error: 'Cet utilisateur est déjà associé à ce site web' });
    }

    // Ajouter l'utilisateur au site web
    const { error: insertError } = await supabase
      .from('user_websites')
      .insert({
        user_id: userData.id,
        website_id: website_id,
        role: role,
        created_at: new Date().toISOString()
      });

    if (insertError) throw insertError;
    
    res.send({ message: 'Utilisateur ajouté au site web avec succès' });
  } catch (error) {
    console.error('Erreur lors de l\'ajout de l\'utilisateur au site web:', error);
    res.status(500).send({ error: error.message });
  }
});

// Endpoint pour récupérer les utilisateurs d'un site web
router.get('/getUsersWebsite', authenticateToken, async (req, res) => {
  try {
    const websiteId = req.query.websiteId;
    const userId = req.user.idUser;
    const authToken = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(authToken);
    
    if (!websiteId) {
      return res.status(400).send({ error: 'websiteId est requis' });
    }
    
    // Vérifier l'accès au site web
    const { hasAccess, role } = await checkUserWebsiteAccess(supabase, userId, websiteId);
    if (!hasAccess) {
      return res.status(403).send({ error: 'Accès non autorisé à ce site web' });
    }

    // Récupérer tous les utilisateurs du site web
    const { data: users, error } = await supabase
      .from('user_websites')
      .select(`
        id,
        role,
        created_at,
        user_id,
        users!inner (
          id,
          email,
          username
        )
      `)
      .eq('website_id', websiteId);

    if (error) throw error;

    // Formater les données pour le frontend
    const formattedUsers = users.map(userWebsite => ({
      id: userWebsite.id,
      user_id: userWebsite.user_id,
      email: userWebsite.users.email,
      first_name: userWebsite.users.username || '', // Utiliser username comme nom
      last_name: '', // Pas de last_name dans la table users
      role: userWebsite.role,
      access_type: 'direct',
      created_at: userWebsite.created_at
    }));

    res.send({ users: formattedUsers });
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).send({ error: error.message });
  }
});

// Endpoint pour modifier le rôle d'un utilisateur
router.put('/updateUserRoleWebsite', authenticateToken, async (req, res) => {
  try {
    const { userWebsiteId, website_id, role } = req.body;
    const userId = req.user.idUser;
    const authToken = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(authToken);
    
    if (!userWebsiteId || !website_id || !role) {
      return res.status(400).send({ error: 'userWebsiteId, website_id et role sont requis' });
    }
    
    // Vérifier l'accès au site web avec rôle admin
    const { hasAccess, role: userRole } = await checkUserWebsiteAccess(supabase, userId, website_id);
    if (!hasAccess || userRole !== 'admin') {
      return res.status(403).send({ error: 'Seuls les administrateurs peuvent modifier les rôles' });
    }

    // Vérifier que le rôle est valide
    const validRoles = ['viewer', 'editor', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).send({ error: 'Rôle invalide' });
    }

    // Mettre à jour le rôle
    const { error } = await supabase
      .from('user_websites')
      .update({ role })
      .eq('id', userWebsiteId)
      .eq('website_id', website_id);

    if (error) throw error;

    res.send({ message: 'Rôle mis à jour avec succès' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du rôle:', error);
    res.status(500).send({ error: error.message });
  }
});

// Endpoint pour supprimer un utilisateur d'un site web
router.delete('/deleteUserWebsite', authenticateToken, async (req, res) => {
  try {
    const { userWebsiteId, website_id } = req.body;
    const userId = req.user.idUser;
    const authToken = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(authToken);
    
    if (!userWebsiteId || !website_id) {
      return res.status(400).send({ error: 'userWebsiteId et website_id sont requis' });
    }
    
    // Vérifier l'accès au site web avec rôle admin
    const { hasAccess, role } = await checkUserWebsiteAccess(supabase, userId, website_id);
    if (!hasAccess || role !== 'admin') {
      return res.status(403).send({ error: 'Seuls les administrateurs peuvent supprimer des utilisateurs' });
    }

    // Supprimer l'utilisateur du site web
    const { error } = await supabase
      .from('user_websites')
      .delete()
      .eq('id', userWebsiteId)
      .eq('website_id', website_id);

    if (error) throw error;

    res.send({ message: 'Utilisateur supprimé du site web avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'utilisateur:', error);
    res.status(500).send({ error: error.message });
  }
});

// Endpoint pour récupérer les features d'un site web basées sur son plan d'abonnement
router.get('/getFeaturesWebsite', authenticateToken, async (req, res) => {
  try {
    const websiteId = req.query.websiteId;
    const userId = req.user.idUser;
    const authToken = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(authToken);
    
    if (!websiteId) {
      return res.status(400).send({ error: 'websiteId est requis' });
    }
    
    // Vérifier l'accès au site web
    const { hasAccess } = await checkUserWebsiteAccess(supabase, userId, websiteId);
    if (!hasAccess) {
      return res.status(403).send({ error: 'Accès non autorisé à ce site web' });
    }

    // Récupérer l'abonnement actif du site web avec les features du plan
    // Utiliser supabaseServerAdmin pour bypass RLS (Row Level Security)
    const supabaseAdmin = supabaseServerAdmin();
    const { data: subscription, error: subscriptionError } = await supabaseAdmin
      .from('website_subscriptions')
      .select(`
        status,
        cancel_at_period_end,
        subscription_plans (
          name,
          features
        )
      `)
      .eq('website_id', websiteId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subscriptionError && subscriptionError.code !== 'PGRST116') {
      throw subscriptionError;
    }

    // Déterminer le plan et les features
    let planName = 'free';
    let features = {
      pages: false,
      contact: true,
      portfolio: false,
      newsletter: true,
      collections: false,
      custom_domain: false,
      webflow_preview_only: true
    };

    if (subscription && subscription.subscription_plans) {
      planName = subscription.subscription_plans.name;
      // Récupérer les features depuis la BDD
      features = subscription.subscription_plans.features || features;
    }

    res.send({ 
      features,
      plan: planName,
      cancel_at_period_end: subscription?.cancel_at_period_end || false
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des features:', error);
    res.status(500).send({ error: error.message });
  }
});

// Endpoint pour mettre à jour les informations d'un site web
router.post('/updateWebsite', authenticateToken, async (req, res) => {
  try {
    const { website_id, website_name, website_slug, analytics_id, visibility } = req.body;
    const userId = req.user.idUser;
    const authToken = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(authToken);
    
    // Vérifier l'accès au site web avec rôle admin
    const { hasAccess, role } = await checkUserWebsiteAccess(supabase, userId, website_id);
    if (!hasAccess || role !== 'admin') {
      return res.status(403).send({ error: 'Seuls les administrateurs peuvent modifier les informations du site' });
    }

    // Valider les données
    if (!website_name || !website_slug) {
      return res.status(400).send({ error: 'Le nom et le slug du site sont requis' });
    }

    // Vérifier l'unicité du slug
    const { data: existingSlug, error: slugError } = await supabase
      .from('websites')
      .select('id')
      .eq('website_slug', website_slug)
      .neq('id', website_id)
      .single();

    if (slugError && slugError.code !== 'PGRST116') {
      throw slugError;
    }

    if (existingSlug) {
      return res.status(400).send({ error: 'Ce slug est déjà utilisé par un autre site' });
    }

    // Mettre à jour le site web
    const updateData = {
      website_name,
      website_slug,
      analytics_id: analytics_id || null,
      visibility: visibility || 'workspace',
      updated_at: new Date().toISOString()
    };

    const { data: updatedWebsite, error } = await supabase
      .from('websites')
      .update(updateData)
      .eq('id', website_id)
      .select()
      .single();

    if (error) throw error;

    res.send({ 
      message: 'Site web mis à jour avec succès',
      website: updatedWebsite
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du site web:', error);
    res.status(500).send({ error: error.message });
  }
});

// ==================== CLOUDFLARE DOMAINS MANAGEMENT ====================

/**
 * Configure un domaine personnalisé sur Cloudflare Pages
 * Vérifie l'autorisation custom_domain avant de configurer
 */
router.post('/configure-custom-domain/:websiteId', authenticateToken, async (req, res) => {
  const { websiteId } = req.params;
  const { domain } = req.body;
  const userId = req.user.idUser;
  const token = req.headers['authorization']?.split(' ')[1];
  const supabase = supabaseServer(token);
  const supabaseAdmin = supabaseServerAdmin();

  console.log(`[Domain Config] Configuration du domaine ${domain} pour le site ${websiteId}`);

  try {
    // 1. Vérifier l'accès de l'utilisateur au site web
    const { hasAccess } = await checkUserWebsiteAccess(supabase, userId, websiteId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Vous n\'avez pas accès à ce site web' });
    }

    // 2. Récupérer les informations du site web (folder + subscription)
    const { data: website, error: websiteError } = await supabaseAdmin
      .from('websites')
      .select('folder_project, website_slug')
      .eq('id', websiteId)
      .single();

      console.log('folder_project:', website?.folder_project);

    if (websiteError || !website) {
      console.error('[Domain Config] Site web non trouvé:', websiteError);
      return res.status(404).json({ error: 'Site web non trouvé' });
    }

    if (!website.folder_project) {
      return res.status(400).json({ 
        error: 'Aucun projet Cloudflare associé à ce site. Veuillez d\'abord déployer le site.' 
      });
    }

    // 3. Vérifier l'autorisation custom_domain
    const { data: subscription } = await supabaseAdmin
      .from('website_subscriptions')
      .select('plan_id')
      .eq('website_id', websiteId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!subscription || !subscription.plan_id) {
      return res.status(403).json({ 
        error: 'Aucun abonnement actif trouvé pour ce site' 
      });
    }

    // Récupérer les features du plan
    const { data: plan } = await supabaseAdmin
      .from('subscription_plans')
      .select('features')
      .eq('id', subscription.plan_id)
      .single();

    if (!plan) {
      return res.status(403).json({ error: 'Plan d\'abonnement non trouvé' });
    }

    // Vérifier la feature custom_domain
    let hasCustomDomain = false;
    if (Array.isArray(plan.features)) {
      const entry = plan.features.find(f => f.key === 'custom_domain');
      hasCustomDomain = !!(entry && (entry.included === true || entry.value === true));
    } else if (typeof plan.features === 'object' && plan.features !== null) {
      hasCustomDomain = plan.features.custom_domain === true;
    }

    if (!hasCustomDomain) {
      return res.status(403).json({ 
        error: 'Votre abonnement ne permet pas l\'utilisation de domaines personnalisés',
        upgradeRequired: true
      });
    }

    // 4. Mettre à jour le site web avec le domaine personnalisé dans website_slug
    const { error: updateError } = await supabaseAdmin
      .from('websites')
      .update({ website_slug: domain })
      .eq('id', websiteId);

    if (updateError) {
      console.error('[Domain Config] Erreur mise à jour website_slug:', updateError);
      return res.status(500).json({ 
        error: 'Erreur lors de la sauvegarde du domaine'
      });
    }

    // 5. Configurer le domaine sur Cloudflare Pages (optionnel, peut échouer sans bloquer)
    try {
      await addCustomDomain(website.folder_project, domain);
      console.log(`[Domain Config] ✅ Domaine ${domain} ajouté à Cloudflare Pages`);
    } catch (cfError) {
      console.error('[Domain Config] Erreur Cloudflare (non bloquante):', cfError);
    }

    console.log(`[Domain Config] ✅ Domaine ${domain} configuré avec succès pour ${website.folder_project}`);

    res.json({
      success: true,
      message: `Domaine ${domain} configuré avec succès`,
      domain: domain
    });

  } catch (error) {
    console.error('[Domain Config] Erreur:', error);
    res.status(500).json({ 
      error: error.message || 'Erreur lors de la configuration du domaine',
      details: error.toString()
    });
  }
});

// Route de vérification DNS déplacée dans domainVerification.js

/**
 * Liste les domaines configurés pour un site web
 */
router.get('/list-custom-domains/:websiteId', authenticateToken, async (req, res) => {
  const { websiteId } = req.params;
  const userId = req.user.idUser;
  const token = req.headers['authorization']?.split(' ')[1];
  const supabase = supabaseServer(token);
  const supabaseAdmin = supabaseServerAdmin();

  try {
    const { hasAccess } = await checkUserWebsiteAccess(supabase, userId, websiteId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Vous n\'avez pas accès à ce site web' });
    }

    const { data: website } = await supabaseAdmin
      .from('websites')
      .select('folder')
      .eq('id', websiteId)
      .single();

    if (!website || !website.folder) {
      return res.json({ domains: [] });
    }

    const result = await listCustomDomains(website.folder);
    
    res.json({
      success: true,
      domains: result.domains,
      projectName: website.folder
    });

  } catch (error) {
    console.error('[Domain List] Erreur:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Supprime un domaine personnalisé
 */
router.delete('/remove-custom-domain/:websiteId', authenticateToken, async (req, res) => {
  const { websiteId } = req.params;
  const { domain } = req.body;
  const userId = req.user.idUser;
  const token = req.headers['authorization']?.split(' ')[1];
  const supabase = supabaseServer(token);
  const supabaseAdmin = supabaseServerAdmin();

  try {
    const { hasAccess } = await checkUserWebsiteAccess(supabase, userId, websiteId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Vous n\'avez pas accès à ce site web' });
    }

    const { data: website } = await supabaseAdmin
      .from('websites')
      .select('folder')
      .eq('id', websiteId)
      .single();

    if (!website || !website.folder) {
      return res.status(404).json({ error: 'Site web ou projet Cloudflare non trouvé' });
    }

    const result = await removeCustomDomain(website.folder, domain);

    res.json({
      success: true,
      message: `Domaine ${domain} supprimé avec succès`,
      domain: result.domain
    });

  } catch (error) {
    console.error('[Domain Remove] Erreur:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Vérifie le statut d'un domaine personnalisé
 */
router.get('/check-domain-status/:websiteId', authenticateToken, async (req, res) => {
  const { websiteId } = req.params;
  const { domain } = req.query;
  const userId = req.user.idUser;
  const token = req.headers['authorization']?.split(' ')[1];
  const supabase = supabaseServer(token);
  const supabaseAdmin = supabaseServerAdmin();

  try {
    const { hasAccess } = await checkUserWebsiteAccess(supabase, userId, websiteId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Vous n\'avez pas accès à ce site web' });
    }

    const { data: website } = await supabaseAdmin
      .from('websites')
      .select('folder')
      .eq('id', websiteId)
      .single();

    if (!website || !website.folder) {
      return res.status(404).json({ error: 'Site web non trouvé' });
    }

    const result = await getDomainStatus(website.folder, domain);

    res.json({
      success: true,
      status: result.status
    });

  } catch (error) {
    console.error('[Domain Status] Erreur:', error);
    res.status(500).json({ error: error.message });
  }
});

// Exporter la fonction helper pour utilisation dans d'autres modules
module.exports = { router, checkUserWebsiteAccess };
