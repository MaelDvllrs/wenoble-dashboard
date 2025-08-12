const { supabaseServer } = require('./supabase');

async function runCollectionPoliciesMigration() {
  const supabase = supabaseServer();
  
  console.log('Début de la migration des politiques RLS pour les collections...');
  
  try {
    // Migration 1: Politiques pour collection et collection_config
    const migration1 = `
      -- Activer RLS sur la table collection si ce n'est pas déjà fait
      ALTER TABLE collection ENABLE ROW LEVEL SECURITY;

      -- Politique pour permettre aux utilisateurs de voir les collections des sites web auxquels ils ont accès
      CREATE POLICY "Users can view collections from accessible websites" ON collection
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM website w
            INNER JOIN user_workspaces uw ON uw.workspace_id = w.workspace_id
            WHERE w.id = collection.website_id
            AND uw.user_id = auth.uid()
            AND uw.user_role IN ('admin', 'editor')
          )
        );

      -- Politique pour permettre aux utilisateurs admin et editor de créer des collections
      CREATE POLICY "Users can create collections on accessible websites" ON collection
        FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM website w
            INNER JOIN user_workspaces uw ON uw.workspace_id = w.workspace_id
            WHERE w.id = collection.website_id
            AND uw.user_id = auth.uid()
            AND uw.user_role IN ('admin', 'editor')
          )
        );

      -- Politique pour permettre aux utilisateurs admin et editor de modifier des collections
      CREATE POLICY "Users can update collections on accessible websites" ON collection
        FOR UPDATE
        USING (
          EXISTS (
            SELECT 1 FROM website w
            INNER JOIN user_workspaces uw ON uw.workspace_id = w.workspace_id
            WHERE w.id = collection.website_id
            AND uw.user_id = auth.uid()
            AND uw.user_role IN ('admin', 'editor')
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM website w
            INNER JOIN user_workspaces uw ON uw.workspace_id = w.workspace_id
            WHERE w.id = collection.website_id
            AND uw.user_id = auth.uid()
            AND uw.user_role IN ('admin', 'editor')
          )
        );

      -- Politique pour permettre aux utilisateurs admin de supprimer des collections
      CREATE POLICY "Admins can delete collections on accessible websites" ON collection
        FOR DELETE
        USING (
          EXISTS (
            SELECT 1 FROM website w
            INNER JOIN user_workspaces uw ON uw.workspace_id = w.workspace_id
            WHERE w.id = collection.website_id
            AND uw.user_id = auth.uid()
            AND uw.user_role = 'admin'
          )
        );

      -- Ajouter des politiques pour la table collection_config également
      ALTER TABLE collection_config ENABLE ROW LEVEL SECURITY;

      -- Politique pour voir les configurations de collection
      CREATE POLICY "Users can view collection configs from accessible websites" ON collection_config
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM collection c
            INNER JOIN website w ON w.id = c.website_id
            INNER JOIN user_workspaces uw ON uw.workspace_id = w.workspace_id
            WHERE c.id = collection_config.collection_id
            AND uw.user_id = auth.uid()
            AND uw.user_role IN ('admin', 'editor')
          )
        );

      -- Politique pour créer des configurations de collection
      CREATE POLICY "Users can create collection configs on accessible websites" ON collection_config
        FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM collection c
            INNER JOIN website w ON w.id = c.website_id
            INNER JOIN user_workspaces uw ON uw.workspace_id = w.workspace_id
            WHERE c.id = collection_config.collection_id
            AND uw.user_id = auth.uid()
            AND uw.user_role IN ('admin', 'editor')
          )
        );

      -- Politique pour modifier des configurations de collection
      CREATE POLICY "Users can update collection configs on accessible websites" ON collection_config
        FOR UPDATE
        USING (
          EXISTS (
            SELECT 1 FROM collection c
            INNER JOIN website w ON w.id = c.website_id
            INNER JOIN user_workspaces uw ON uw.workspace_id = w.workspace_id
            WHERE c.id = collection_config.collection_id
            AND uw.user_id = auth.uid()
            AND uw.user_role IN ('admin', 'editor')
          )
        );

      -- Politique pour supprimer des configurations de collection
      CREATE POLICY "Admins can delete collection configs on accessible websites" ON collection_config
        FOR DELETE
        USING (
          EXISTS (
            SELECT 1 FROM collection c
            INNER JOIN website w ON w.id = c.website_id
            INNER JOIN user_workspaces uw ON uw.workspace_id = w.workspace_id
            WHERE c.id = collection_config.collection_id
            AND uw.user_id = auth.uid()
            AND uw.user_role = 'admin'
          )
        );
    `;

    console.log('Exécution de la migration 1: Politiques pour collection et collection_config...');
    const { error: error1 } = await supabase.rpc('exec_sql', { sql: migration1 });
    if (error1) {
      console.error('Erreur migration 1:', error1);
      throw error1;
    }
    console.log('Migration 1 terminée avec succès');

    console.log('Migration des politiques RLS terminée avec succès!');
  } catch (error) {
    console.error('Erreur lors de la migration:', error);
    throw error;
  }
}

// Exécuter la migration si le script est appelé directement
if (require.main === module) {
  runCollectionPoliciesMigration()
    .then(() => {
      console.log('Migration terminée avec succès');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Erreur lors de la migration:', error);
      process.exit(1);
    });
}

module.exports = { runCollectionPoliciesMigration };
