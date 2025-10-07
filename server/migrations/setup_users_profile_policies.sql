-- Script complet pour configurer les politiques RLS des tables users et profile_images
-- À exécuter dans Dashboard Supabase > SQL Editor

-- ============================================================================
-- PARTIE 1: CONFIGURATION DE LA TABLE users
-- ============================================================================

-- Ajouter les colonnes first_name et last_name si elles n'existent pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'first_name'
    ) THEN
        ALTER TABLE public.users ADD COLUMN first_name TEXT;
        RAISE NOTICE '✅ Colonne first_name ajoutée';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'last_name'
    ) THEN
        ALTER TABLE public.users ADD COLUMN last_name TEXT;
        RAISE NOTICE '✅ Colonne last_name ajoutée';
    END IF;
END $$;

-- Activer RLS sur la table users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques users
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Allow read access to users" ON public.users;
DROP POLICY IF EXISTS "Allow update access to users" ON public.users;
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
DROP POLICY IF EXISTS "admins_view_all_users" ON public.users;

-- Créer les nouvelles politiques pour users
CREATE POLICY "users_select_own" ON public.users
    FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "users_update_own" ON public.users
    FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "users_insert_own" ON public.users
    FOR INSERT 
    WITH CHECK (auth.uid() = id);

CREATE POLICY "admins_view_all_users" ON public.users
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND is_admin = true
        )
    );

-- Accorder les permissions pour users
GRANT SELECT, UPDATE ON public.users TO authenticated;
GRANT INSERT ON public.users TO authenticated, anon;

-- ============================================================================
-- PARTIE 2: CONFIGURATION DE LA TABLE profile_images
-- ============================================================================

-- Créer la table profile_images si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.profile_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    src_profile_image TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Activer RLS sur la table profile_images
ALTER TABLE public.profile_images ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques profile_images
DROP POLICY IF EXISTS "Users can view their own profile image" ON public.profile_images;
DROP POLICY IF EXISTS "Users can insert their own profile image" ON public.profile_images;
DROP POLICY IF EXISTS "Users can update their own profile image" ON public.profile_images;
DROP POLICY IF EXISTS "Users can delete their own profile image" ON public.profile_images;
DROP POLICY IF EXISTS "profile_images_select_own" ON public.profile_images;
DROP POLICY IF EXISTS "profile_images_insert_own" ON public.profile_images;
DROP POLICY IF EXISTS "profile_images_update_own" ON public.profile_images;
DROP POLICY IF EXISTS "profile_images_delete_own" ON public.profile_images;
DROP POLICY IF EXISTS "admins_view_all_profile_images" ON public.profile_images;

-- Créer les nouvelles politiques pour profile_images
CREATE POLICY "profile_images_select_own" ON public.profile_images
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "profile_images_insert_own" ON public.profile_images
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profile_images_update_own" ON public.profile_images
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profile_images_delete_own" ON public.profile_images
    FOR DELETE 
    USING (auth.uid() = user_id);

CREATE POLICY "admins_view_all_profile_images" ON public.profile_images
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND is_admin = true
        )
    );

-- Accorder les permissions pour profile_images
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_images TO authenticated;

-- Créer un index pour les performances
CREATE INDEX IF NOT EXISTS idx_profile_images_user_id ON public.profile_images(user_id);

-- ============================================================================
-- PARTIE 3: VÉRIFICATION
-- ============================================================================

-- Vérifier les politiques créées
SELECT '✅ POLITIQUES CRÉÉES POUR users:' as info;
SELECT policyname, cmd FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'users'
ORDER BY policyname;

SELECT '✅ POLITIQUES CRÉÉES POUR profile_images:' as info;  
SELECT policyname, cmd FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'profile_images'
ORDER BY policyname;

-- Vérifier que RLS est activé
SELECT '✅ STATUS RLS:' as info;
SELECT 
    tablename,
    CASE WHEN rowsecurity THEN '✅ Activé' ELSE '❌ Désactivé' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'profile_images');

SELECT '🎉 CONFIGURATION TERMINÉE AVEC SUCCÈS!' as status;
SELECT 'Les utilisateurs peuvent maintenant modifier leurs propres informations de profil' as note;