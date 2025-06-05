const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const { format } = require('date-fns');

const { supabaseServer } = require('../supabase');

const router = express.Router();
router.use(cors());
router.use(express.json());

const supabase = supabaseServer;

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
    await supabase.from('login_logs').insert({
      email: req.body.loginEmail,
      ip_address: ip,
      location: `${geoLocation.city}, ${geoLocation.region}, ${geoLocation.country}`,
      timestamp: new Date()
    });
  }
};

// Login endpoint - bridge to Supabase Auth
router.post('/login', async (req, res) => {

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
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }
    
    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (authError) {
      return res.status(400).json({ 
        success: false, 
        message: authError.message 
      });
    }
    

    console.log('User created in Supabase Auth:', authData);
    // Create user profile record in 'users' table
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        username: req.body.username || email.split('@')[0],
        is_admin: false,
        api_key: 'API' + Date.now() + (req.body.username || email.split('@')[0]),
      })
      .select();
    
    if (profileError) {
      console.error('Error creating user profile:', profileError);
      console.error('Error details:', JSON.stringify(profileError, null, 2));
    } else {
      console.log('User profile created successfully:', profileData);
    }
    
    await logConnectionAttempt(req); // Log the registration attempt
    
    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      // If email confirmation is enabled:
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

module.exports = router;