-- SOLUTION: Désactiver le trigger conflictuel et laisser handle_new_user gérer les relations
-- À exécuter dans Dashboard Supabase > SQL Editor

-- 1. Désactiver le trigger qui cause le conflit
DROP TRIGGER IF EXISTS add_workspace_creator_as_admin_trigger ON public.workspaces;

SELECT '✅ TRIGGER CONFLICTUEL DÉSACTIVÉ' as status;

-- 2. Vérifier qu'il n'y a plus de triggers sur workspaces
SELECT 'VÉRIFICATION - Triggers restants sur workspaces:' as info;
SELECT 
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'workspaces' 
AND event_object_schema = 'public'
ORDER BY trigger_name;

-- 3. Si aucun trigger n'apparaît, c'est bon !
SELECT 'Si aucun résultat ci-dessus = PROBLÈME RÉSOLU ✅' as note;
SELECT 'Maintenant testez avec test_trigger_direct.sql' as next_step;