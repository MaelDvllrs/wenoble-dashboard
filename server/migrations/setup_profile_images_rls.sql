-- Politiques RLS pour la table profile_images selon les spécifications
-- À exécuter dans Dashboard Supabase > SQL Editor

-- 1. S'assurer que la table profile_images existe
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

-- 3. Supprimer toutes les anciennes politiques
DROP POLICY IF EXISTS "profile_images_select_own" ON public.profile_images;
DROP POLICY IF EXISTS "profile_images_insert_own" ON public.profile_images;
DROP POLICY IF EXISTS "profile_images_update_own" ON public.profile_images;
DROP POLICY IF EXISTS "profile_images_delete_own" ON public.profile_images;
DROP POLICY IF EXISTS "admins_view_all_profile_images" ON public.profile_images;
DROP POLICY IF EXISTS "Users can view their own profile image" ON public.profile_images;
DROP POLICY IF EXISTS "Users can insert their own profile image" ON public.profile_images;
DROP POLICY IF EXISTS "Users can update their own profile image" ON public.profile_images;
DROP POLICY IF EXISTS "Users can delete their own profile image" ON public.profile_images;

-- 4. POLITIQUE SELECT : Toutes les personnes authentifiées peuvent voir toutes les photos de profil
CREATE POLICY "authenticated_users_can_view_all_profile_images" ON public.profile_images
    FOR SELECT 
    TO authenticated
    USING (true); -- Pas de restriction, tous les utilisateurs authentifiés peuvent voir toutes les images

-- 5. POLITIQUE INSERT : Les personnes authentifiées peuvent ajouter une photo pour eux-mêmes
CREATE POLICY "authenticated_users_can_insert_own_profile_image" ON public.profile_images
    FOR INSERT 
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- 6. POLITIQUE UPDATE : Les personnes authentifiées peuvent modifier leur propre photo
CREATE POLICY "authenticated_users_can_update_own_profile_image" ON public.profile_images
    FOR UPDATE 
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 7. POLITIQUE DELETE : Les personnes authentifiées peuvent supprimer leur propre photo (optionnel)
CREATE POLICY "authenticated_users_can_delete_own_profile_image" ON public.profile_images
    FOR DELETE 
    TO authenticated
    USING (auth.uid() = user_id);

-- 8. Accorder les permissions nécessaires aux utilisateurs authentifiés
GRANT SELECT ON public.profile_images TO authenticated;
GRANT INSERT ON public.profile_images TO authenticated;
GRANT UPDATE ON public.profile_images TO authenticated;
GRANT DELETE ON public.profile_images TO authenticated;

-- 9. Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_profile_images_user_id ON public.profile_images(user_id);

-- 10. Vérifier les politiques créées
SELECT '✅ POLITIQUES CRÉÉES POUR profile_images:' as info;
SELECT 
    policyname as "Nom de la politique",
    cmd as "Commande",
    permissive as "Permissive",
    roles as "Rôles",
    CASE 
        WHEN qual = 'true' THEN 'Aucune restriction'
        WHEN qual LIKE '%auth.uid()%' THEN 'Restriction par utilisateur'
        ELSE 'Autre restriction'
    END as "Type de restriction"
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profile_images'
ORDER BY policyname;

-- 11. Vérifier que RLS est bien activé
SELECT '✅ STATUS RLS:' as info;
SELECT 
    tablename as "Table",
    CASE WHEN rowsecurity THEN '✅ RLS Activé' ELSE '❌ RLS Désactivé' END as "Status RLS"
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'profile_images';

-- 12. Vérifier les permissions accordées
SELECT '✅ PERMISSIONS ACCORDÉES:' as info;
SELECT 
    grantee as "Rôle",
    privilege_type as "Permission"
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'profile_images'
AND grantee = 'authenticated'
ORDER BY privilege_type;

SELECT '🎉 CONFIGURATION TERMINÉE!' as status;
SELECT 'RÉCAPITULATIF DES RÈGLES:' as recap;
SELECT '• SELECT: Toutes les personnes authentifiées peuvent voir toutes les photos' as rule1;
SELECT '• INSERT: Les personnes authentifiées peuvent ajouter leur propre photo' as rule2;
SELECT '• UPDATE: Les personnes authentifiées peuvent modifier leur propre photo' as rule3;
SELECT '• DELETE: Les personnes authentifiées peuvent supprimer leur propre photo' as rule4;