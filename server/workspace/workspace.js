const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { supabaseServer } = require('../supabase');
const { authenticateToken } = require('../middleware/authToken');

const router = express.Router();

router.use(cors());
router.use(express.json());

require('dotenv').config();

// Fonction helper pour vérifier l'accès d'un utilisateur à un workspace
const checkUserWorkspaceAccess = async (supabase, userId, workspaceId) => {
  try {
    // Utiliser les fonctions SQL pour vérifier les permissions (elles contournent RLS)
    const { data: isAdmin, error: adminError } = await supabase
      .rpc('is_admin_of_workspace', {
        workspace_id: workspaceId,
        user_id: userId
      });
      
    if (adminError) {
      console.error('Erreur lors de la vérification admin:', adminError);
    } else if (isAdmin) {
      return { hasAccess: true, role: 'admin' };
    }

    // Si pas admin, vérifier si membre
    const { data: isMember, error: memberError } = await supabase
      .rpc('is_member_or_admin_of_workspace', {
        workspace_id: workspaceId,
        user_id: userId
      });
      
    if (memberError) {
      console.error('Erreur lors de la vérification membre:', memberError);
      return { hasAccess: false, role: null };
    }
    
    if (isMember) {
      // Si membre mais pas admin, c'est un member
      return { hasAccess: true, role: 'member' };
    }
    
    return { hasAccess: false, role: null };
  } catch (error) {
    console.error('Erreur dans checkUserWorkspaceAccess:', error);
    return { hasAccess: false, role: null };
  }
};

// Fonction helper pour générer un slug unique
const generateUniqueSlug = async (supabase, baseName) => {
  const baseSlug = baseName
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  let slug = baseSlug;
  let counter = 1;
  
  while (true) {
    const { data, error } = await supabase
      .from('workspaces')
      .select('id')
      .eq('workspace_slug', slug)
      .maybeSingle();
    
    if (error) throw error;
    if (!data) break;
    
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
};

// Récupérer les workspaces d'un utilisateur
router.get('/getUserWorkspaces', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.idUser;
    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);


    let allWorkspaces = [];

    // Essayer de récupérer les workspaces créés par l'utilisateur
    try {
      const { data: createdWorkspaces, error: createdError } = await supabase
        .from('workspaces')
        .select('id, workspace_name, workspace_slug, workspace_description, created_at, updated_at, is_default')
        .eq('created_by', userId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true });

      if (createdError) {
        console.error('Erreur lors de la récupération des workspaces créés:', createdError);
        // Ne pas lancer l'erreur, continuer avec les user_workspaces
      } else if (createdWorkspaces && createdWorkspaces.length > 0) {
        allWorkspaces = createdWorkspaces.map(workspace => ({
          ...workspace,
          user_role: 'admin'
        }));
      } else {
        console.log('Aucun workspace créé trouvé');
      }
    } catch (error) {
      console.error('Exception lors de la récupération des workspaces créés:', error);
    }

    // Essayer de récupérer les relations user_workspaces pour cet utilisateur
    try {
      const { data: userWorkspaces, error: userError } = await supabase
        .from('user_workspaces')
        .select('workspace_id, role')
        .eq('user_id', userId);

      if (userError) {
        console.error('Erreur lors de la récupération des relations user_workspaces:', userError);
        // Continue sans les user_workspaces
      } else if (userWorkspaces && userWorkspaces.length > 0) {
        
        // Ajouter les workspaces où l'utilisateur est membre
        for (const userWorkspace of userWorkspaces) {
          // Vérifier si ce workspace n'est pas déjà dans la liste (workspace créé)
          const alreadyExists = allWorkspaces.find(w => w.id === userWorkspace.workspace_id);
          if (!alreadyExists) {
            // Récupérer les détails du workspace
            try {
              const { data: workspaceDetails, error: detailsError } = await supabase
                .from('workspaces')
                .select('id, workspace_name, workspace_slug, workspace_description, created_at, updated_at, is_default')
                .eq('id', userWorkspace.workspace_id)
                .single();

              if (!detailsError && workspaceDetails) {
                allWorkspaces.push({
                  ...workspaceDetails,
                  user_role: userWorkspace.role
                });
              } else {
                console.error(`Erreur lors de la récupération du workspace ${userWorkspace.workspace_id}:`, detailsError);
              }
            } catch (error) {
              console.error(`Exception lors de la récupération du workspace ${userWorkspace.workspace_id}:`, error);
            }
          }
        }
      } else {
        console.log('Aucune relation user_workspaces trouvée');
      }
    } catch (error) {
      console.error('Exception lors de la récupération des relations user_workspaces:', error);
    }

    // Trier par défaut puis par date de création
    allWorkspaces.sort((a, b) => {
      if (a.is_default && !b.is_default) return -1;
      if (!a.is_default && b.is_default) return 1;
      return new Date(a.created_at) - new Date(b.created_at);
    });

    res.send({ workspaces: allWorkspaces });
  } catch (error) {
    console.error('Erreur générale lors de la récupération des workspaces:', error);
    res.status(500).send({ error: error.message });
  }
});

// Créer un nouveau workspace
router.post('/createWorkspace', authenticateToken, async (req, res) => {
  try {
    const { workspace_name, workspace_description } = req.body;
    const userId = req.user.idUser;
    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);

    if (!workspace_name || !workspace_name.trim()) {
      return res.status(400).send({ error: 'Le nom du workspace est requis' });
    }

    // Générer un slug unique
    const workspace_slug = await generateUniqueSlug(supabase, workspace_name);

    // Créer le workspace
    const { data: workspaceData, error: workspaceError } = await supabase
      .from('workspaces')
      .insert({
        workspace_name: workspace_name.trim(),
        workspace_slug,
        workspace_description: workspace_description?.trim() || null,
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (workspaceError) throw workspaceError;

    // Essayer d'ajouter l'utilisateur comme admin du workspace
    // Avec les nouvelles politiques, cela pourrait échouer mais ce n'est pas critique
    try {
      const { error: userWorkspaceError } = await supabase
        .from('user_workspaces')
        .insert({
          user_id: userId,
          workspace_id: workspaceData.id,
          role: 'admin',
          created_at: new Date().toISOString()
        });

      if (userWorkspaceError) {
        console.log('Avertissement: Impossible d\'ajouter l\'utilisateur aux user_workspaces:', userWorkspaceError);
      }
    } catch (userWorkspaceError) {
      console.log('Avertissement: Erreur lors de l\'ajout à user_workspaces:', userWorkspaceError);
      // Continue, l'utilisateur a toujours accès en tant que créateur
    }
    
    res.send({ 
      message: 'Workspace créé avec succès', 
      workspace: { ...workspaceData, user_role: 'admin' }
    });
  } catch (error) {
    console.error('Erreur lors de la création du workspace:', error);
    res.status(500).send({ error: error.message });
  }
});

// Récupérer les sites web d'un workspace
router.get('/getWorkspaceWebsites', authenticateToken, async (req, res) => {
  try {
    const workspaceId = req.query.workspaceId;
    const userId = req.user.idUser;
    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);

    if (!workspaceId) {
      return res.status(400).send({ error: 'workspaceId est requis' });
    }

    // Vérifier l'accès de l'utilisateur au workspace
    const { hasAccess } = await checkUserWorkspaceAccess(supabase, userId, workspaceId);
    if (!hasAccess) {
      return res.status(403).send({ error: 'Vous n\'avez pas accès à ce workspace' });
    }

    // Récupérer tous les sites web du workspace
    const { data: allWebsites, error: allError } = await supabase
      .from('websites')
      .select('id, website_name, website_slug, visibility, created_at, updated_at')
      .eq('workspace_id', workspaceId);
      
    if (allError) throw allError;

    // Pour chaque site web, déterminer le rôle de l'utilisateur
    const websites = [];
    
    for (const website of allWebsites) {
      let userRole = null;
      let hasAccessToSite = false;

      // Vérifier l'accès direct au site
      const { data: directAccess, error: directError } = await supabase
        .from('user_websites')
        .select('role')
        .eq('user_id', userId)
        .eq('website_id', website.id)
        .maybeSingle();

      if (!directError && directAccess) {
        userRole = directAccess.role;
        hasAccessToSite = true;
      } else if (website.visibility === 'workspace') {
        // Site visible par tous les membres du workspace
        const { role: workspaceRole } = await checkUserWorkspaceAccess(supabase, userId, workspaceId);
        userRole = workspaceRole === 'admin' ? 'admin' : (workspaceRole === 'member' ? 'editor' : 'viewer');
        hasAccessToSite = true;
      }

      if (hasAccessToSite) {
        websites.push({
          ...website,
          user_role: userRole,
          access_type: directAccess ? 'direct' : 'workspace'
        });
      }
    }
    
    res.send({ websites });
  } catch (error) {
    console.error('Erreur lors de la récupération des sites web du workspace:', error);
    res.status(500).send({ error: error.message });
  }
});

// Récupérer un workspace par son ID
router.get('/getWorkspaceById', authenticateToken, async (req, res) => {
  try {
    const workspaceId = req.query.workspaceId;
    const userId = req.user.idUser;
    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);

    if (!workspaceId) {
      return res.status(400).send({ error: 'workspaceId est requis' });
    }

    // Vérifier l'accès de l'utilisateur au workspace
    const { hasAccess, role } = await checkUserWorkspaceAccess(supabase, userId, workspaceId);
    if (!hasAccess) {
      return res.status(403).send({ error: 'Vous n\'avez pas accès à ce workspace' });
    }

    // Récupérer les informations du workspace
    const { data, error } = await supabase
      .from('workspaces')
      .select('id, workspace_name, workspace_slug, workspace_description, created_at, updated_at, is_default')
      .eq('id', workspaceId)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).send({ error: 'Workspace non trouvé' });
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
    console.error('Erreur lors de la récupération du workspace:', error);
    res.status(500).send({ error: error.message });
  }
});

// Mettre à jour un workspace
router.post('/updateWorkspace', authenticateToken, async (req, res) => {
  try {
    const { workspace_id, workspace_name, workspace_description } = req.body;
    const userId = req.user.idUser;
    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);

    if (!workspace_id) {
      return res.status(400).send({ error: 'workspace_id est requis' });
    }

    // Vérifier l'accès de l'utilisateur au workspace (doit être admin)
    const { hasAccess, role } = await checkUserWorkspaceAccess(supabase, userId, workspace_id);
    if (!hasAccess || role !== 'admin') {
      return res.status(403).send({ error: 'Vous devez être administrateur pour modifier ce workspace' });
    }

    // Préparer les données de mise à jour
    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (workspace_name && workspace_name.trim()) {
      updateData.workspace_name = workspace_name.trim();
      // Générer un nouveau slug si le nom a changé
      updateData.workspace_slug = await generateUniqueSlug(supabase, workspace_name);
    }
    
    if (workspace_description !== undefined) {
      updateData.workspace_description = workspace_description?.trim() || null;
    }

    // Mettre à jour le workspace
    const { data, error } = await supabase
      .from('workspaces')
      .update(updateData)
      .eq('id', workspace_id)
      .select()
      .single();
      
    if (error) throw error;
    
    res.send({ 
      message: 'Workspace mis à jour avec succès', 
      workspace: { ...data, user_role: role }
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du workspace:', error);
    res.status(500).send({ error: error.message });
  }
});

// Supprimer un workspace
router.delete('/deleteWorkspace', authenticateToken, async (req, res) => {
  try {
    const workspaceId = req.query.workspaceId;
    const userId = req.user.idUser;
    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);

    if (!workspaceId) {
      return res.status(400).send({ error: 'workspaceId est requis' });
    }

    // Vérifier l'accès de l'utilisateur au workspace (doit être admin)
    const { hasAccess, role } = await checkUserWorkspaceAccess(supabase, userId, workspaceId);
    if (!hasAccess || role !== 'admin') {
      return res.status(403).send({ error: 'Vous devez être administrateur pour supprimer ce workspace' });
    }

    // Vérifier que ce n'est pas le workspace par défaut
    const { data: workspaceData, error: workspaceError } = await supabase
      .from('workspaces')
      .select('is_default')
      .eq('id', workspaceId)
      .single();

    if (workspaceError) throw workspaceError;

    if (workspaceData.is_default) {
      return res.status(400).send({ error: 'Impossible de supprimer le workspace par défaut' });
    }

    // Déplacer les sites web vers le workspace par défaut de l'utilisateur
    const { data: defaultWorkspace, error: defaultError } = await supabase
      .from('workspaces')
      .select('id')
      .eq('created_by', userId)
      .eq('is_default', true)
      .single();

    if (defaultError) throw defaultError;

    // Mettre à jour les sites web pour les déplacer vers le workspace par défaut
    const { error: updateError } = await supabase
      .from('websites')
      .update({ workspace_id: defaultWorkspace.id })
      .eq('workspace_id', workspaceId);

    if (updateError) throw updateError;

    const { error: userWorkspaceDeleteError } = await supabase
      .from('user_workspaces')
      .delete()
      .eq('workspace_id', workspaceId);

    if (userWorkspaceDeleteError) throw userWorkspaceDeleteError;

    // Supprimer le workspace (les contraintes de clé étrangère supprimeront automatiquement les relations restantes)
    const { error } = await supabase
      .from('workspaces')
      .delete()
      .eq('id', workspaceId);

    if (error) throw error;
      
    
    res.send({ 
      message: 'Workspace supprimé avec succès. Les sites web ont été déplacés vers votre workspace par défaut.' 
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du workspace:', error);
    res.status(500).send({ error: error.message });
  }
});

// Ajouter un utilisateur à un workspace
router.post('/addUserToWorkspace', authenticateToken, async (req, res) => {
  try {
    const { workspace_id, user_email, role = 'member' } = req.body;
    const userId = req.user.idUser;
    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);

    if (!workspace_id || !user_email) {
      return res.status(400).send({ error: 'workspace_id et user_email sont requis' });
    }

    if (!['admin', 'member', 'viewer'].includes(role)) {
      return res.status(400).send({ error: 'Rôle invalide. Utilisez: admin, member, viewer' });
    }

    // Vérifier l'accès de l'utilisateur au workspace (doit être admin)
    const { hasAccess, role: userRole } = await checkUserWorkspaceAccess(supabase, userId, workspace_id);
    if (!hasAccess || userRole !== 'admin') {
      return res.status(403).send({ error: 'Vous devez être administrateur pour ajouter des utilisateurs' });
    }

    // Trouver l'utilisateur par email
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, username')
      .eq('email', user_email)
      .single();

    if (userError) {
      if (userError.code === 'PGRST116') {
        return res.status(404).send({ error: 'Utilisateur non trouvé' });
      }
      throw userError;
    }

    // Vérifier si l'utilisateur n'est pas déjà associé au workspace
    const { data: existing, error: existingError } = await supabase
      .from('user_workspaces')
      .select('id')
      .eq('user_id', userData.id)
      .eq('workspace_id', workspace_id)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing) {
      return res.status(400).send({ error: 'Cet utilisateur est déjà associé à ce workspace' });
    }

    // Ajouter l'utilisateur au workspace
    const { error: insertError } = await supabase
      .from('user_workspaces')
      .insert({
        user_id: userData.id,
        workspace_id: workspace_id,
        role: role,
        created_at: new Date().toISOString()
      });

    if (insertError) throw insertError;
    
    res.send({ 
      message: `Utilisateur ${userData.username} ajouté au workspace avec succès`,
      user: {
        id: userData.id,
        email: userData.email,
        username: userData.username,
        role: role
      }
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout de l\'utilisateur au workspace:', error);
    res.status(500).send({ error: error.message });
  }
});

// Récupérer les membres d'un workspace
router.get('/getWorkspaceMembers', authenticateToken, async (req, res) => {
  try {
    const workspaceId = req.query.workspaceId;
    const userId = req.user.idUser;
    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);

    if (!workspaceId) {
      return res.status(400).send({ error: 'workspaceId est requis' });
    }

    // Vérifier l'accès de l'utilisateur au workspace
    const { hasAccess } = await checkUserWorkspaceAccess(supabase, userId, workspaceId);
    if (!hasAccess) {
      return res.status(403).send({ error: 'Vous n\'avez pas accès à ce workspace' });
    }

    let allMembers = [];

    // 1. Récupérer le créateur du workspace
    const { data: workspaceData, error: workspaceError } = await supabase
      .from('workspaces')
      .select(`
        created_by,
        users!workspaces_created_by_fkey (
          id,
          username,
          email
        )
      `)
      .eq('id', workspaceId)
      .single();

    if (workspaceError) throw workspaceError;

    if (workspaceData && workspaceData.users) {
      allMembers.push({
        id: workspaceData.users.id,
        username: workspaceData.users.username,
        email: workspaceData.users.email || 'Email non disponible',
        role: 'admin',
        joined_at: null, // Le créateur n'a pas de date d'ajout
        source: 'creator'
      });
    }

    // 2. Récupérer les membres ajoutés via user_workspaces
    const { data: userWorkspaceMembers, error: membersError } = await supabase
      .from('user_workspaces')
      .select(`
        role,
        created_at,
        users (
          id,
          username,
          email
        )
      `)
      .eq('workspace_id', workspaceId);
      
    if (membersError) throw membersError;
    
    // Ajouter les membres en évitant les doublons
    if (userWorkspaceMembers) {
      userWorkspaceMembers.forEach(item => {
        // Vérifier si ce membre n'est pas déjà dans la liste (éviter les doublons avec le créateur)
        const alreadyExists = allMembers.find(member => member.id === item.users.id);
        if (!alreadyExists) {
          allMembers.push({
            id: item.users.id,
            username: item.users.username,
            email: item.users.email || 'Email non disponible',
            role: item.role,
            joined_at: item.created_at,
            source: 'invited'
          });
        }
      });
    }
    
    res.send({ members: allMembers });
  } catch (error) {
    console.error('Erreur lors de la récupération des membres du workspace:', error);
    res.status(500).send({ error: error.message });
  }
});

// Modifier le rôle d'un utilisateur dans un workspace
router.post('/updateUserWorkspaceRole', authenticateToken, async (req, res) => {
  try {
    const { workspace_id, user_id, role } = req.body;
    const adminUserId = req.user.idUser;
    const token = req.headers['authorization']?.split(' ')[1];
    const supabase = supabaseServer(token);

    if (!workspace_id || !user_id || !role) {
      return res.status(400).send({ error: 'workspace_id, user_id et role sont requis' });
    }

    if (!['admin', 'member', 'viewer'].includes(role)) {
      return res.status(400).send({ error: 'Rôle invalide. Utilisez: admin, member, viewer' });
    }

    // Vérifier que l'utilisateur qui fait la demande est admin du workspace
    const { hasAccess, role: adminRole } = await checkUserWorkspaceAccess(supabase, adminUserId, workspace_id);
    if (!hasAccess || adminRole !== 'admin') {
      return res.status(403).send({ error: 'Vous devez être administrateur pour modifier les rôles' });
    }

    // Empêcher un admin de modifier son propre rôle
    if (adminUserId === user_id) {
      return res.status(400).send({ error: 'Vous ne pouvez pas modifier votre propre rôle' });
    }

    // Vérifier que l'utilisateur cible existe dans le workspace
    const { data: existingMember, error: existingError } = await supabase
      .from('user_workspaces')
      .select('id, role')
      .eq('user_id', user_id)
      .eq('workspace_id', workspace_id)
      .single();

    if (existingError) {
      if (existingError.code === 'PGRST116') {
        return res.status(404).send({ error: 'Utilisateur non trouvé dans ce workspace' });
      }
      throw existingError;
    }

    // Mettre à jour le rôle
    const { error: updateError } = await supabase
      .from('user_workspaces')
      .update({ 
        role: role,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user_id)
      .eq('workspace_id', workspace_id);

    if (updateError) throw updateError;

    res.send({ 
      message: `Rôle mis à jour avec succès`,
      oldRole: existingMember.role,
      newRole: role
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du rôle:', error);
    res.status(500).send({ error: error.message });
  }
});

// Mise à jour de la fonction checkUserWebsiteAccess pour prendre en compte les workspaces
const checkUserWebsiteAccessWithWorkspace = async (supabase, userId, websiteId) => {
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
    .select('workspace_id')
    .eq('id', websiteId)
    .single();
    
  if (websiteError) throw websiteError;
  
  if (websiteData.workspace_id) {
    const { hasAccess, role } = await checkUserWorkspaceAccess(supabase, userId, websiteData.workspace_id);
    if (hasAccess) {
      // Mapper les rôles workspace vers les rôles website
      const websiteRole = role === 'admin' ? 'admin' : (role === 'member' ? 'editor' : 'viewer');
      return { hasAccess: true, role: websiteRole, accessType: 'workspace' };
    }
  }
  
  return { hasAccess: false, role: null, accessType: null };
};

// Exporter les fonctions helper pour utilisation dans d'autres modules
module.exports = { 
  router, 
  checkUserWorkspaceAccess, 
  checkUserWebsiteAccessWithWorkspace 
};
