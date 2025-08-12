-- Script pour corriger les politiques RLS et éviter la récursion infinie
-- À exécuter pour remplacer les politiques problématiques

-- ============================
-- SUPPRESSION DES POLITIQUES EXISTANTES
-- ============================

-- Supprimer toutes les politiques existantes pour recommencer proprement
DROP POLICY IF EXISTS "Users can view workspaces they have access to" ON workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
DROP POLICY IF EXISTS "Workspace admins can update workspaces" ON workspaces;
DROP POLICY IF EXISTS "Workspace admins can delete workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can view their created workspaces" ON workspaces;
DROP POLICY IF EXISTS "Members can view workspace details" ON workspaces;
DROP POLICY IF EXISTS "Creators can update workspaces" ON workspaces;
DROP POLICY IF EXISTS "Admins can update workspace details" ON workspaces;
DROP POLICY IF EXISTS "Creators can delete workspaces" ON workspaces;
DROP POLICY IF EXISTS "Admins can delete non-default workspaces" ON workspaces;

DROP POLICY IF EXISTS "Users can view their workspace memberships" ON user_workspaces;
DROP POLICY IF EXISTS "Workspace admins can add users" ON user_workspaces;
DROP POLICY IF EXISTS "Workspace admins can update user roles" ON user_workspaces;
DROP POLICY IF EXISTS "Workspace admins can remove users" ON user_workspaces;
DROP POLICY IF EXISTS "Prevent creator role modification" ON user_workspaces;
DROP POLICY IF EXISTS "Prevent creator removal" ON user_workspaces;
DROP POLICY IF EXISTS "Users can view their own workspace memberships" ON user_workspaces;
DROP POLICY IF EXISTS "Admins can view workspace members" ON user_workspaces;
DROP POLICY IF EXISTS "Workspace creators and admins can add users" ON user_workspaces;
DROP POLICY IF EXISTS "Workspace creators and admins can update roles" ON user_workspaces;
DROP POLICY IF EXISTS "Users can leave or admins can remove" ON user_workspaces;
DROP POLICY IF EXISTS "Protect workspace creator" ON user_workspaces;
DROP POLICY IF EXISTS "Users can join workspaces" ON user_workspaces;
DROP POLICY IF EXISTS "Users can update their own membership" ON user_workspaces;
DROP POLICY IF EXISTS "Users can leave workspaces" ON user_workspaces;

-- ============================
-- POLITIQUES CORRIGÉES POUR USER_WORKSPACES (SANS RÉCURSION)
-- ============================

-- 1. POLITIQUE SELECT SIMPLE - Voir ses propres relations
CREATE POLICY "Users can view their own workspace memberships" ON user_workspaces
FOR SELECT USING (
    user_id = auth.uid()
);

-- 2. POLITIQUE INSERT - Très restrictive pour éviter la récursion
CREATE POLICY "Users can join workspaces" ON user_workspaces
FOR INSERT WITH CHECK (
    user_id = auth.uid()  -- On peut seulement s'ajouter soi-même
);

-- 3. POLITIQUE UPDATE - Très restrictive 
CREATE POLICY "Users can update their own membership" ON user_workspaces
FOR UPDATE USING (
    user_id = auth.uid()  -- On peut seulement modifier ses propres relations
) WITH CHECK (
    user_id = auth.uid()
);

-- 4. POLITIQUE DELETE - Se retirer soi-même
CREATE POLICY "Users can leave workspaces" ON user_workspaces
FOR DELETE USING (
    user_id = auth.uid()
);

-- ============================
-- POLITIQUES POUR WORKSPACES (SANS RÉCURSION)
-- ============================

-- 1. POLITIQUE SELECT - Voir ses propres workspaces créés UNIQUEMENT
CREATE POLICY "Users can view their created workspaces" ON workspaces
FOR SELECT USING (
    created_by = auth.uid()
);

-- 2. POLITIQUE INSERT - Créer des workspaces
CREATE POLICY "Users can create workspaces" ON workspaces
FOR INSERT WITH CHECK (
    created_by = auth.uid()
);

-- 3. POLITIQUE UPDATE - Seuls les créateurs peuvent modifier
CREATE POLICY "Creators can update workspaces" ON workspaces
FOR UPDATE USING (
    created_by = auth.uid()
) WITH CHECK (
    created_by = auth.uid()
);

-- 4. POLITIQUE DELETE - Seuls les créateurs peuvent supprimer
CREATE POLICY "Creators can delete workspaces" ON workspaces
FOR DELETE USING (
    created_by = auth.uid() 
    AND NOT COALESCE(is_default, false)
);

-- ============================
-- VÉRIFICATION DES POLITIQUES
-- ============================

-- Vérifier que RLS est activé
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('workspaces', 'user_workspaces');

-- Lister les nouvelles politiques
SELECT 
    tablename,
    policyname,
    cmd as operation
FROM pg_policies 
WHERE tablename IN ('workspaces', 'user_workspaces')
ORDER BY tablename, cmd;

-- ============================
-- TEST RAPIDE
-- ============================

-- Test simple pour vérifier qu'il n'y a plus de récursion
SELECT 'Test SELECT user_workspaces' as test, COUNT(*) as count FROM user_workspaces;
SELECT 'Test SELECT workspaces' as test, COUNT(*) as count FROM workspaces;

-- ============================
-- COMMENTAIRES
-- ============================

COMMENT ON POLICY "Users can view their own workspace memberships" ON user_workspaces IS 
'Permet aux utilisateurs de voir leurs propres relations workspace';

COMMENT ON POLICY "Users can view their created workspaces" ON workspaces IS 
'Permet aux utilisateurs de voir uniquement les workspaces qu ils ont créés';

/*
SOLUTION FINALE POUR ÉLIMINER COMPLÈTEMENT LA RÉCURSION :

APPROCHE SIMPLIFIÉE - AUCUNE RÉFÉRENCE CROISÉE :

WORKSPACES :
- Seuls les créateurs peuvent voir/modifier/supprimer leurs workspaces
- Aucune référence à user_workspaces pour éviter la récursion
- Les membres accèdent aux workspaces via l'API côté serveur

USER_WORKSPACES :
- Chaque utilisateur ne peut voir que ses propres relations
- Pas de vérification de permissions admin dans les politiques RLS
- La gestion des membres se fait côté serveur avec des requêtes directes

GESTION DES PERMISSIONS :
- Les permissions avancées (admin, ajout de membres) sont gérées côté serveur
- L'API vérifie les permissions avant d'effectuer les opérations
- Les politiques RLS sont simplifiées au maximum pour éviter la récursion

Cette approche sépare complètement les préoccupations :
- RLS : Sécurité de base (propriétaire/utilisateur)  
- API : Logique métier complexe (permissions admin, gestion des membres)
*/
