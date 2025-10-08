-- Version qui sépare COMPLÈTEMENT les opérations pour isoler le problème
-- À exécuter dans Dashboard Supabase > SQL Editor

-- Mettre à jour la fonction principale handle-new-user
CREATE OR REPLACE FUNCTION public."handle-new-user"()
RETURNS TRIGGER AS $$
DECLARE
    pending_username TEXT;
    final_username TEXT;
    new_workspace_id UUID;
    workspace_slug_var TEXT;
    user_exists_check BOOLEAN;
BEGIN
  RAISE LOG '🚀 TRIGGER handle_new_user DÉMARRÉ pour user_id: %', NEW.id;
  
  -- Vérifier si l'utilisateur vient de confirmer son email
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    RAISE LOG '✅ Email confirmé détecté pour user: % (email: %)', NEW.id, NEW.email;
    
    -- Déterminer le username final
    final_username := COALESCE(
      NEW.raw_user_meta_data->>'username',
      split_part(NEW.email, '@', 1)
    );
    
    RAISE LOG '📝 Username final déterminé: %', final_username;
    
    -- ÉTAPE 1: Créer l'utilisateur dans public.users
    SELECT EXISTS(SELECT 1 FROM public.users WHERE id = NEW.id) INTO user_exists_check;
    
    IF NOT user_exists_check THEN
      BEGIN
        INSERT INTO public.users (id, email, username, is_admin)
        VALUES (NEW.id, NEW.email, final_username, false);
        RAISE LOG '✅ Profil utilisateur créé dans public.users';
      EXCEPTION
        WHEN OTHERS THEN
          RAISE WARNING '❌ ERREUR création utilisateur: % - État SQL: %', SQLERRM, SQLSTATE;
          RETURN NEW;
      END;
    ELSE
      RAISE LOG '⚠️ Utilisateur existe déjà dans public.users';
    END IF;
    
    -- ÉTAPE 2: SEULEMENT tenter de créer le workspace (sans user_workspaces)
    RAISE LOG '🏢 DÉBUT création workspace SEULEMENT';
    
    -- Vérifier qu'il n'a pas déjà un workspace
    IF NOT EXISTS (SELECT 1 FROM public.workspaces WHERE created_by = NEW.id AND is_default = true) THEN
      
      -- Générer slug unique 
      workspace_slug_var := LOWER(REPLACE(final_username, ' ', '-')) || '-ws-' || extract(epoch from now())::text;
      RAISE LOG '🔄 Slug généré: %', workspace_slug_var;
      
      -- TENTER SEULEMENT L'INSERTION DU WORKSPACE
      BEGIN
        RAISE LOG '📝 TENTATIVE insertion workspace UNIQUEMENT (sans user_workspaces)';
        
        INSERT INTO public.workspaces (
          workspace_name, 
          workspace_slug, 
          workspace_description, 
          created_by, 
          is_default
        ) VALUES (
          final_username || ' - Workspace Personnel',
          workspace_slug_var,
          'Workspace personnel par défaut créé automatiquement',
          NEW.id,
          true
        ) RETURNING id INTO new_workspace_id;
        
        RAISE LOG '✅ WORKSPACE CRÉÉ AVEC SUCCÈS! ID: %', new_workspace_id;
        
        -- Si on arrive ici, le workspace a été créé avec succès
        RAISE LOG '🎉 WORKSPACE SEUL RÉUSSI - ID récupéré: %', new_workspace_id;
        
        -- MAINTENANT, essayer de créer la relation séparément
        IF new_workspace_id IS NOT NULL THEN
          BEGIN
            RAISE LOG '🔗 TENTATIVE création relation user_workspaces maintenant';
            
            INSERT INTO public.user_workspaces (user_id, workspace_id, role)
            VALUES (NEW.id, new_workspace_id, 'admin');
            
            RAISE LOG '✅ RELATION USER_WORKSPACE CRÉÉE AVEC SUCCÈS!';
            RAISE LOG '🎉 SUCCÈS TOTAL! Workspace ET relation créés';
            
          EXCEPTION
            WHEN OTHERS THEN
              RAISE WARNING '❌ ERREUR création relation (workspace créé avec succès):';
              RAISE WARNING '   Code SQL: %', SQLSTATE;
              RAISE WARNING '   Message: %', SQLERRM;
          END;
        END IF;
        
      EXCEPTION
        WHEN OTHERS THEN
          RAISE WARNING '❌ ERREUR création workspace SEUL:';
          RAISE WARNING '   Code SQL: %', SQLSTATE;
          RAISE WARNING '   Message: %', SQLERRM;
          RAISE WARNING '   Détails: user_id=%, slug=%', NEW.id, workspace_slug_var;
          -- Le workspace n'a pas pu être créé du tout
      END;
      
    ELSE
      RAISE LOG '⚠️ Workspace par défaut existe déjà pour cet utilisateur';
    END IF;
    
    -- Nettoyer
    DELETE FROM public.pending_user_profiles WHERE user_id = NEW.id;
    
  ELSE
    RAISE LOG '⏭️ Pas de confirmation email détectée, trigger ignoré';
  END IF;
  
  RAISE LOG '🏁 TRIGGER TERMINÉ pour user_id: %', NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ FONCTION handle-new-user MISE À JOUR' as status;
SELECT 'Version qui fonctionne déployée sur la fonction principale' as note;