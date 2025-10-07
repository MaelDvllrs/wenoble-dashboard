-- Politiques RLS pour la table profile_images - permettre aux utilisateurs de gérer leurs propres images
-- À exécuter dans Dashboard Supabase > SQL Editor

-- 1. Vérifier si la table profile_images existe, sinon la créer
CREATE TABLE IF NOT EXISTS public.profile_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    src_profile_image TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 2. Activer RLS sur la table profile_images
ALTER TABLE public.profile_images ENABLE ROW LEVEL SECURITY;

-- 3. Supprimer les anciennes politiques pour les recréer
DROP POLICY IF EXISTS "Users can view their own profile image" ON public.profile_images;
DROP POLICY IF EXISTS "Users can insert their own profile image" ON public.profile_images;
DROP POLICY IF EXISTS "Users can update their own profile image" ON public.profile_images;
DROP POLICY IF EXISTS "Users can delete their own profile image" ON public.profile_images;

-- 4. Politique pour permettre aux utilisateurs de voir leur propre image de profil
CREATE POLICY "profile_images_select_own" ON public.profile_images
    FOR SELECT 
    USING (auth.uid() = user_id);

-- 5. Politique pour permettre aux utilisateurs d'insérer leur propre image de profil
CREATE POLICY "profile_images_insert_own" ON public.profile_images
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- 6. Politique pour permettre aux utilisateurs de mettre à jour leur propre image de profil
CREATE POLICY "profile_images_update_own" ON public.profile_images
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 7. Politique pour permettre aux utilisateurs de supprimer leur propre image de profil
CREATE POLICY "profile_images_delete_own" ON public.profile_images
    FOR DELETE 
    USING (auth.uid() = user_id);

-- 8. Politique pour permettre aux admins de voir toutes les images (optionnel)
CREATE POLICY "admins_view_all_profile_images" ON public.profile_images
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND is_admin = true
        )
    );

-- 9. Accorder les permissions nécessaires
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_images TO authenticated;

-- 10. Créer un index pour les performances
CREATE INDEX IF NOT EXISTS idx_profile_images_user_id ON public.profile_images(user_id);

-- 11. Vérifier les politiques créées
SELECT 'POLITIQUES CRÉÉES POUR LA TABLE profile_images:' as info;
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profile_images'
ORDER BY policyname;

-- 12. Vérifier la structure de la table
SELECT 'STRUCTURE DE LA TABLE profile_images:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profile_images'
ORDER BY ordinal_position;

SELECT '✅ POLITIQUES RLS CONFIGURÉES POUR LA TABLE profile_images' as status;
SELECT 'Les utilisateurs peuvent maintenant gérer leurs propres images de profil' as note;