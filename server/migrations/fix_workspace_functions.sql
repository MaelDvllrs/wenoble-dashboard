-- Script pour corriger les fonctions RLS des workspaces
-- Ces fonctions doivent contourner les politiques RLS pour fonctionner correctement

-- Supprimer les anciennes fonctions
DROP FUNCTION IF EXISTS is_member_or_admin_of_workspace(uuid, uuid);
DROP FUNCTION IF EXISTS is_admin_of_workspace(uuid, uuid);

-- Fonction corrigée pour vérifier si un utilisateur est membre ou admin d'un workspace
CREATE OR REPLACE FUNCTION is_member_or_admin_of_workspace(workspace_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- D'abord vérifier si l'utilisateur est le créateur du workspace
  IF EXISTS (
    SELECT 1 
    FROM public.workspaces 
    WHERE id = workspace_id 
    AND created_by = user_id
  ) THEN
    RETURN true;
  END IF;
  
  -- Puis vérifier dans user_workspaces (en contournant RLS avec SECURITY DEFINER)
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_workspaces 
    WHERE user_workspaces.workspace_id = $1 
    AND user_workspaces.user_id = $2 
    AND role IN ('admin', 'member')
  );
END;
$$;

-- Fonction corrigée pour vérifier si un utilisateur est admin d'un workspace
CREATE OR REPLACE FUNCTION is_admin_of_workspace(workspace_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- D'abord vérifier si l'utilisateur est le créateur du workspace (créateur = admin)
  IF EXISTS (
    SELECT 1 
    FROM public.workspaces 
    WHERE id = workspace_id 
    AND created_by = user_id
  ) THEN
    RETURN true;
  END IF;
  
  -- Puis vérifier dans user_workspaces (en contournant RLS avec SECURITY DEFINER)
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_workspaces 
    WHERE user_workspaces.workspace_id = $1 
    AND user_workspaces.user_id = $2 
    AND role = 'admin'
  );
END;
$$;

-- Commentaires sur les fonctions
COMMENT ON FUNCTION is_member_or_admin_of_workspace(uuid, uuid) IS 
'Vérifie si un utilisateur est membre ou admin d un workspace (créateur ou via user_workspaces)';

COMMENT ON FUNCTION is_admin_of_workspace(uuid, uuid) IS 
'Vérifie si un utilisateur est admin d un workspace (créateur ou admin via user_workspaces)';

-- Test des fonctions (optionnel)
-- SELECT is_member_or_admin_of_workspace('workspace-uuid-here'::uuid, auth.uid());
-- SELECT is_admin_of_workspace('workspace-uuid-here'::uuid, auth.uid());

/*
EXPLICATION DES CORRECTIONS :

1. SECURITY DEFINER : Les fonctions s'exécutent avec les privilèges du propriétaire (bypass RLS)
2. Vérification créateur : D'abord vérifier si user_id = workspaces.created_by 
3. Fallback user_workspaces : Si pas créateur, vérifier dans user_workspaces
4. Schema explicite : Utilisation de public.table_name pour éviter les ambiguïtés

Ces fonctions contournent maintenant les politiques RLS restrictives et permettent
aux politiques de workspaces de fonctionner correctement.
*/
