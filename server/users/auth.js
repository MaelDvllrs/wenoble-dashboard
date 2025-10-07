const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const { format } = require('date-fns');

const { supabaseServer, supabaseServerAdmin } = require('../supabase');

const router = express.Router();
router.use(cors());
router.use(express.json());

// IP and geolocation utilities - keep your existing ones
const getIpAddress = (req) => {
  return req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;
};

const getGeoLocation = async (ip) => {
  try {
    const response = await axios.get(`http://ipinfo.io/${ip}/json`);
    return response.data;
  } catch (error) {
    console.error("Error fetching geolocation:", error);
    return null;
  }
};

const getFormattedDate = () => {
  return format(new Date(), 'dd/MM/yyyy HH:mm:ss');
};

const logConnectionAttempt = async (req) => {
  const ip = getIpAddress(req);
  const geoLocation = await getGeoLocation(ip);

  console.log(getFormattedDate() + " | Connection attempt from " + ip + " with username " + req.body.email);

  if (geoLocation) {
    console.log("Location: " + geoLocation.city + ", " + geoLocation.region + ", " + geoLocation.country);
    
    // Optional: Store login attempts in Supabase
    const supabaseAdmin = supabaseServerAdmin();
    await supabaseAdmin.from('login_logs').insert({
      email: req.body.loginEmail,
      ip_address: ip,
      location: `${geoLocation.city}, ${geoLocation.region}, ${geoLocation.country}`,
      timestamp: new Date()
    });
  }
};

// Login endpoint - bridge to Supabase Auth
router.post('/login', async (req, res) => {

  console.log(getFormattedDate() + " | Login attempt with username " + req.body.loginEmail);

  await logConnectionAttempt(req);

  const { loginEmail, loginPassword } = req.body;

  if (!loginEmail || !loginPassword) {
    return res.status(400).send({ message: 'Email and password are required' });
  }
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: loginEmail,
    password: loginPassword,
  });

  if (error) {
    return res.status(400).send({ message: error.message });
  }

  // Success - Supabase returns session with access token
  
  // Vérifier si le profil utilisateur existe, sinon le créer (fallback)
  try {
    const supabaseAdmin = supabaseServerAdmin();
    const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', data.user.id)
      .single();
      
    if (profileCheckError && profileCheckError.code === 'PGRST116') {
      // Le profil n'existe pas, le créer
      console.log('Creating missing user profile for user:', data.user.id);
      
      // Chercher un username dans la table temporaire
      let pendingUsername = null;
      try {
        const { data: pendingData } = await supabaseAdmin
          .from('pending_user_profiles')
          .select('username')
          .eq('user_id', data.user.id)
          .single();
        pendingUsername = pendingData?.username;
      } catch (pendingError) {
        // Pas de username en attente, utiliser les métadonnées ou l'email
      }
      
      const { data: newProfile, error: createError } = await supabaseAdmin
        .from('users')
        .insert({
          id: data.user.id,
          email: data.user.email,
          username: pendingUsername || data.user.user_metadata?.username || data.user.email.split('@')[0],
          is_admin: false
        })
        .select();
        
      // Nettoyer la table temporaire si utilisée
      if (pendingUsername) {
        await supabaseAdmin
          .from('pending_user_profiles')
          .delete()
          .eq('user_id', data.user.id);
      }
        
      if (createError) {
        console.error('Error creating missing user profile:', createError);
      } else {
        console.log('Missing user profile created successfully:', newProfile);
      }
    }
  } catch (profileError) {
    console.error('Error checking/creating user profile:', profileError);
  }
  
  // Enregistrer un log de connexion
  try {
    const ip = getIpAddress(req);
    const user_agent = req.headers['user-agent'] || '';
    const location = await getGeoLocation(ip);

    console.log(getFormattedDate() + " | Successful login for user ID " + data.user.id + " from IP " + ip);

    await supabase
      .from('user_login_logs')
      .insert({
        user_id: data.user.id,
        ip,
        user_agent,
        success: true,
        method: 'password',
        location
      });
  } catch (e) {
    console.error('Failed to insert user_login_logs:', e?.message || e);
  }

  res.send({ token: data.session.access_token });
});



// Token verification endpoint
router.post('/auth/verify', async (req, res) => {
  const token = req.body.token;

  const supabase = supabaseServer(token);



  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  // Verify token with Supabase
  const { data, error } = await supabase.auth.getUser(token);
  
  
  if (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }

  // Add user role data if needed
  const { data: userData } = await supabase
    .from('users')
    .select('id, username, is_admin')
    .eq('id', data.user.id)
    .single();

  return res.status(200).json({ 
    success: true, 
    user: {
      id: data.user.id,
      username: userData?.username || data.user.email,
      isAdmin: userData?.is_admin || false
    }
  });
});


router.post('/register', async (req, res) => {
  try {
    const { email, password, username, oauth_provider, oauth_id } = req.body;
    
    // Validation des champs requis
    if (!email || !username) {
      console.error('Email and username are required');
      return res.status(400).json({ 
        success: false, 
        message: 'Email and username are required' 
      });
    }
    
    // Pour l'inscription classique, le mot de passe est requis
    if (!oauth_provider && !password) {
      console.error('Password is required for email registration');
      return res.status(400).json({ 
        success: false, 
        message: 'Password is required for email registration' 
      });
    }
    
    let authData;
    
    if (oauth_provider) {
      // Pour OAuth, l'utilisateur est déjà créé dans Supabase Auth
      // On utilise oauth_id comme ID utilisateur
      authData = {
        user: {
          id: oauth_id,
          email: email
        }
      };
      
      // Stocker le username dans la table temporaire pour le trigger
      const supabaseAdmin = supabaseServerAdmin();
      try {
        await supabaseAdmin
          .from('pending_user_profiles')
          .insert({
            user_id: oauth_id,
            username: username,
            email: email,
            oauth_provider: oauth_provider
          });
        console.log('Username stored in pending_user_profiles for OAuth user:', oauth_id);
      } catch (pendingError) {
        console.error('Error storing pending username:', pendingError);
      }
      
      console.log('OAuth user registration:', authData);
    } else {
      // Create user in Supabase Auth (inscription classique)
      const supabaseAuth = supabaseServerAdmin(); // Utiliser la clé de service pour l'auth
      const { data: signUpData, error: authError } = await supabaseAuth.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username || email.split('@')[0]
          }
        }
      });
      if (authError) {
        console.error('Error during user sign-up:', authError);
        return res.status(400).json({ 
          success: false, 
          message: authError.message 
        });
      }
      authData = signUpData;
      console.log('User created in Supabase Auth:', authData);
    }
    
    // Si l'utilisateur n'a pas de session (confirmation email requise), 
    // ne pas créer le profil maintenant - le trigger le fera après confirmation
    if (authData.session) {
      // L'utilisateur est directement connecté (pas de confirmation email)
      // Créer le profil maintenant
      const supabaseAdmin = supabaseServerAdmin();
      const finalUsername = username || email.split('@')[0];
      
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from('users')
        .insert({
          id: authData.user.id,
          email: email,
          username: finalUsername,
          is_admin: false
        })
        .select();
        
      if (profileError) {
        console.error('Error creating user profile:', profileError);
        console.error('Error details:', JSON.stringify(profileError, null, 2));
      } else {
        console.log('User profile created successfully:', profileData);
        
        // Créer aussi le workspace par défaut
        try {
          const { data: workspaceResult, error: workspaceError } = await supabaseAdmin
            .rpc('create_default_workspace_for_user', {
              user_id: authData.user.id,
              username: finalUsername
            });
            
          if (workspaceError) {
            console.error('Error creating default workspace:', workspaceError);
          } else {
            console.log('Default workspace created successfully:', workspaceResult);
          }
        } catch (workspaceCreateError) {
          console.error('Error calling workspace creation function:', workspaceCreateError);
        }
      }
    } else {
      console.log('User requires email confirmation - profile will be created by trigger after confirmation');
    }
    await logConnectionAttempt(req); // Log the registration attempt
    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      requiresEmailConfirmation: !authData.session, // true if no session returned
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'An unexpected error occurred during registration' 
    });
  }
});

// Webhook pour la confirmation d'email (alternative au trigger)
router.post('/webhook/user-confirmed', async (req, res) => {
  try {
    const { type, table, record, old_record } = req.body;
    
    // Vérifier que c'est bien une confirmation d'email
    if (type === 'UPDATE' && table === 'users' && record.email_confirmed_at && !old_record.email_confirmed_at) {
      console.log('User email confirmed via webhook:', record.id);
      
      // Créer le profil utilisateur
      const supabaseAdmin = supabaseServerAdmin();
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from('users')
        .insert({
          id: record.id,
          email: record.email,
          username: record.raw_user_meta_data?.username || record.email.split('@')[0],
          is_admin: false
        })
        .select();
        
      if (profileError) {
        console.error('Error creating user profile via webhook:', profileError);
        return res.status(500).json({ success: false });
      } else {
        console.log('User profile created successfully via webhook:', profileData);
        return res.status(200).json({ success: true });
      }
    }
    
    return res.status(200).json({ success: true, message: 'Webhook received but no action taken' });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ success: false });
  }
});

// Endpoint pour vérifier l'état de confirmation d'un utilisateur
router.get('/user/confirmation-status/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const supabaseAdmin = supabaseServerAdmin();
    
    // Vérifier dans auth.users
    const { data: authUser, error: authError } = await supabaseAdmin
      .from('auth.users')
      .select('id, email, email_confirmed_at, created_at')
      .eq('email', email)
      .single();
    
    if (authError) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found in auth system' 
      });
    }
    
    // Vérifier dans public.users
    const { data: publicUser, error: publicError } = await supabaseAdmin
      .from('users')
      .select('id, email, username, is_admin, created_at')
      .eq('email', email)
      .single();
    
    return res.status(200).json({
      success: true,
      authUser: {
        id: authUser.id,
        email: authUser.email,
        email_confirmed: !!authUser.email_confirmed_at,
        email_confirmed_at: authUser.email_confirmed_at,
        created_at: authUser.created_at
      },
      publicUser: publicError ? null : publicUser,
      status: {
        auth_exists: true,
        email_confirmed: !!authUser.email_confirmed_at,
        profile_created: !publicError,
        ready_to_login: !!authUser.email_confirmed_at && !publicError
      }
    });
    
  } catch (error) {
    console.error('Error checking confirmation status:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error checking confirmation status' 
    });
  }
});

// Endpoint pour supprimer un utilisateur (admin uniquement)
router.delete('/admin/user/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const supabaseAdmin = supabaseServerAdmin();
    
    // Vérifier que c'est un email de test (sécurité)
    if (!email.includes('test') && !email.includes('example') && !email.includes('demo')) {
      return res.status(403).json({ 
        success: false, 
        message: 'Only test accounts can be deleted via this endpoint' 
      });
    }
    
    // Trouver l'utilisateur
    const { data: authUser, error: findError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (findError) {
      return res.status(500).json({ 
        success: false, 
        message: 'Error finding user: ' + findError.message 
      });
    }
    
    const user = authUser.users.find(u => u.email === email);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Supprimer le profil utilisateur d'abord
    await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', user.id);
    
    // Supprimer les données temporaires
    await supabaseAdmin
      .from('pending_user_profiles')
      .delete()
      .eq('user_id', user.id);
    
    // Supprimer l'utilisateur de l'auth
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    
    if (deleteError) {
      return res.status(500).json({ 
        success: false, 
        message: 'Error deleting user: ' + deleteError.message 
      });
    }
    
    return res.status(200).json({
      success: true,
      message: `User ${email} deleted successfully`,
      deleted_user_id: user.id
    });
    
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error deleting user' 
    });
  }
});

// Endpoint pour lister tous les utilisateurs (admin/debug)
router.get('/admin/users', async (req, res) => {
  try {
    const supabaseAdmin = supabaseServerAdmin();
    
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      return res.status(500).json({ 
        success: false, 
        message: 'Error fetching users: ' + authError.message 
      });
    }
    
    const { data: publicUsers, error: publicError } = await supabaseAdmin
      .from('users')
      .select('*');
    
    return res.status(200).json({
      success: true,
      auth_users: authUsers.users.map(u => ({
        id: u.id,
        email: u.email,
        email_confirmed_at: u.email_confirmed_at,
        created_at: u.created_at
      })),
      public_users: publicError ? [] : publicUsers,
      total_auth_users: authUsers.users.length,
      total_public_users: publicError ? 0 : publicUsers.length
    });
    
  } catch (error) {
    console.error('Error listing users:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error listing users' 
    });
  }
});

// Endpoint pour créer les workspaces manqués pour tous les utilisateurs
router.post('/admin/create-missing-workspaces', async (req, res) => {
  try {
    const supabaseAdmin = supabaseServerAdmin();
    
    // Appeler la fonction Supabase pour créer les workspaces manqués
    const { data: results, error } = await supabaseAdmin
      .rpc('create_missing_default_workspaces');
    
    if (error) {
      return res.status(500).json({ 
        success: false, 
        message: 'Error creating missing workspaces: ' + error.message 
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Missing workspaces creation completed',
      results: results || []
    });
    
  } catch (error) {
    console.error('Error creating missing workspaces:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error creating missing workspaces' 
    });
  }
});

// Endpoint pour vérifier les workspaces d'un utilisateur
router.get('/user/workspaces', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'No token provided' 
      });
    }
    
    const supabaseWithToken = supabaseServer(token);
    
    // Vérifier le token et récupérer l'utilisateur
    const { data: { user }, error: userError } = await supabaseWithToken.auth.getUser();
    
    if (userError || !user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token' 
      });
    }
    
    // Récupérer les workspaces de l'utilisateur
    const { data: workspaces, error: workspacesError } = await supabaseWithToken
      .from('workspaces')
      .select(`
        id,
        workspace_name,
        workspace_slug,
        workspace_description,
        is_default,
        created_at,
        user_workspaces!inner(role)
      `)
      .eq('user_workspaces.user_id', user.id);
    
    if (workspacesError) {
      return res.status(500).json({ 
        success: false, 
        message: 'Error fetching workspaces: ' + workspacesError.message 
      });
    }
    
    return res.status(200).json({
      success: true,
      workspaces: workspaces || [],
      user_id: user.id,
      total_workspaces: workspaces ? workspaces.length : 0,
      has_default_workspace: workspaces ? workspaces.some(w => w.is_default) : false
    });
    
  } catch (error) {
    console.error('Error fetching user workspaces:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error fetching workspaces' 
    });
  }
});

// Endpoint pour créer manuellement un workspace pour un utilisateur spécifique (debug)
router.post('/admin/create-workspace-for-user', async (req, res) => {
  try {
    const { user_email } = req.body;
    
    if (!user_email) {
      return res.status(400).json({ 
        success: false, 
        message: 'user_email is required' 
      });
    }
    
    const supabaseAdmin = supabaseServerAdmin();
    
    // Trouver l'utilisateur
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, username, email')
      .eq('email', user_email)
      .single();
    
    if (userError || !user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Vérifier s'il a déjà un workspace par défaut
    const { data: existingWorkspace } = await supabaseAdmin
      .from('workspaces')
      .select('id, workspace_name')
      .eq('created_by', user.id)
      .eq('is_default', true)
      .single();
    
    if (existingWorkspace) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already has a default workspace',
        existing_workspace: existingWorkspace
      });
    }
    
    // Créer le workspace manuellement
    const workspace_slug = user.username.toLowerCase().replace(/\s+/g, '-') + '-workspace';
    
    const { data: newWorkspace, error: workspaceError } = await supabaseAdmin
      .from('workspaces')
      .insert({
        workspace_name: user.username + ' - Workspace Personnel',
        workspace_slug: workspace_slug,
        workspace_description: 'Workspace personnel créé manuellement',
        created_by: user.id,
        is_default: true
      })
      .select()
      .single();
    
    if (workspaceError) {
      return res.status(500).json({ 
        success: false, 
        message: 'Error creating workspace: ' + workspaceError.message 
      });
    }
    
    // Ajouter l'utilisateur comme admin
    const { error: userWorkspaceError } = await supabaseAdmin
      .from('user_workspaces')
      .insert({
        user_id: user.id,
        workspace_id: newWorkspace.id,
        role: 'admin'
      });
    
    if (userWorkspaceError) {
      console.error('Error adding user to workspace:', userWorkspaceError);
      // Ne pas échouer pour cette erreur
    }
    
    return res.status(200).json({
      success: true,
      message: 'Workspace created successfully',
      user: user,
      workspace: newWorkspace
    });
    
  } catch (error) {
    console.error('Error creating workspace for user:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error creating workspace for user' 
    });
  }
});

// Endpoint de diagnostic pour les problèmes de workspace
router.post('/admin/debug-workspace-creation', async (req, res) => {
  try {
    const { user_email } = req.body;
    
    if (!user_email) {
      return res.status(400).json({ 
        success: false, 
        message: 'user_email is required' 
      });
    }
    
    console.log('🔍 DEBUG: Démarrage diagnostic workspace pour:', user_email);
    const supabaseAdmin = supabaseServerAdmin();
    const debug_info = {};
    
    // 1. Vérifier l'utilisateur dans auth.users
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserByEmail(user_email);
    debug_info.auth_user = { data: authUser?.user || null, error: authError };
    
    // 2. Vérifier l'utilisateur dans public.users
    const { data: publicUser, error: publicError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', user_email)
      .single();
    debug_info.public_user = { data: publicUser, error: publicError };
    
    // 3. Vérifier les workspaces existants pour cet utilisateur
    if (publicUser) {
      const { data: workspaces, error: workspacesError } = await supabaseAdmin
        .from('workspaces')
        .select('*')
        .eq('created_by', publicUser.id);
      debug_info.workspaces = { data: workspaces, error: workspacesError };
      
      // 4. Vérifier les relations user_workspaces
      const { data: userWorkspaces, error: userWorkspacesError } = await supabaseAdmin
        .from('user_workspaces')
        .select('*')
        .eq('user_id', publicUser.id);
      debug_info.user_workspaces = { data: userWorkspaces, error: userWorkspacesError };
    }
    
    // 5. Vérifier les permissions des tables
    const { data: workspacesSchema, error: schemaError } = await supabaseAdmin
      .rpc('check_table_permissions', { table_name: 'workspaces' })
      .catch(e => ({ data: null, error: 'RPC not available: ' + e.message }));
    debug_info.table_permissions = { data: workspacesSchema, error: schemaError };
    
    // 6. Tester une insertion basique
    try {
      const test_slug = `test-${Date.now()}`;
      const { data: testWorkspace, error: testError } = await supabaseAdmin
        .from('workspaces')
        .insert({
          workspace_name: 'Test Workspace',
          workspace_slug: test_slug,
          workspace_description: 'Test de création',
          created_by: publicUser?.id || '00000000-0000-0000-0000-000000000000',
          is_default: false
        })
        .select()
        .single();
      
      debug_info.test_insertion = { data: testWorkspace, error: testError };
      
      // Nettoyer le test si réussi
      if (testWorkspace) {
        await supabaseAdmin.from('workspaces').delete().eq('id', testWorkspace.id);
      }
    } catch (insertError) {
      debug_info.test_insertion = { data: null, error: insertError.message };
    }
    
    return res.status(200).json({
      success: true,
      message: 'Debug information collected',
      debug_info
    });
    
  } catch (error) {
    console.error('Error in debug workspace creation:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error in debug: ' + error.message 
    });
  }
});

// Endpoint pour récupérer le profil utilisateur
router.get('/user/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token manquant' 
      });
    }

    // Vérifier le token avec Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token invalide' 
      });
    }

    // Récupérer le profil utilisateur
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return res.status(404).json({ 
        success: false, 
        message: 'Profil utilisateur non trouvé' 
      });
    }

    res.json({
      success: true,
      user: profile
    });

  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

module.exports = router;