-- Politiques RLS pour la table users - permettre aux utilisateurs de modifier leurs propres infos
-- À exécuter dans Dashboard Supabase > SQL Editor

-- 1. Activer RLS sur la table users si ce n'est pas déjà fait
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. Supprimer les anciennes politiques pour les recréer
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Allow read access to users" ON public.users;
DROP POLICY IF EXISTS "Allow update access to users" ON public.users;

-- 3. Politique pour permettre aux utilisateurs de voir leur propre profil
CREATE POLICY "users_select_own" ON public.users
    FOR SELECT 
    USING (auth.uid() = id);

-- 4. Politique pour permettre aux utilisateurs de mettre à jour leur propre profil
CREATE POLICY "users_update_own" ON public.users
    FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 5. Politique pour permettre l'insertion lors de la création de compte (via trigger)
CREATE POLICY "users_insert_own" ON public.users
    FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- 6. Politique pour permettre aux admins de voir tous les utilisateurs (optionnel)
CREATE POLICY "admins_view_all_users" ON public.users
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND is_admin = true
        )
    );

-- 7. Vérifier les politiques créées
SELECT 'POLITIQUES CRÉÉES POUR LA TABLE users:' as info;
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'users'
ORDER BY policyname;

-- 8. Accorder les permissions nécessaires aux rôles authentifiés
GRANT SELECT, UPDATE ON public.users TO authenticated;
GRANT INSERT ON public.users TO authenticated, anon; -- Pour la création de compte

SELECT '✅ POLITIQUES RLS CONFIGURÉES POUR LA TABLE users' as status;
SELECT 'Les utilisateurs peuvent maintenant modifier leurs propres informations' as note;