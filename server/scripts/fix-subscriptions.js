const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixMissingSubscriptions() {
    try {
        console.log('🔍 Recherche des sites sans abonnement...');
        
        // Récupérer tous les sites
        const { data: websites, error: websitesError } = await supabase
            .from('websites')
            .select('id, name');
        
        if (websitesError) {
            throw websitesError;
        }

        console.log(`📊 Nombre total de sites: ${websites.length}`);

        // Récupérer le plan gratuit
        const { data: freePlan, error: planError } = await supabase
            .from('subscription_plans')
            .select('*')
            .eq('name', 'free')
            .single();

        if (planError || !freePlan) {
            throw new Error('Plan gratuit introuvable');
        }

        console.log(`✅ Plan gratuit trouvé: ${freePlan.name} (ID: ${freePlan.id})`);

        let fixedCount = 0;
        let alreadyHasSubscription = 0;

        for (const website of websites) {
            // Vérifier si le site a un abonnement actif
            const { data: existingSubscription, error: checkError } = await supabase
                .from('website_subscriptions')
                .select('id, subscription_plan_id, status')
                .eq('website_id', website.id)
                .eq('status', 'active')
                .maybeSingle();

            if (existingSubscription) {
                alreadyHasSubscription++;
                console.log(`✓ Site "${website.name}" a déjà un abonnement`);
                continue;
            }

            // Créer un abonnement gratuit pour ce site
            const { data: newSubscription, error: createError } = await supabase
                .from('website_subscriptions')
                .insert({
                    website_id: website.id,
                    subscription_plan_id: freePlan.id,
                    status: 'active',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select('id')
                .single();

            if (createError) {
                console.error(`❌ Erreur lors de la création de l'abonnement pour "${website.name}":`, createError);
            } else {
                fixedCount++;
                console.log(`✅ Abonnement gratuit créé pour "${website.name}"`);
            }
        }

        console.log('\n📋 Résumé:');
        console.log(`- Sites avec abonnement existant: ${alreadyHasSubscription}`);
        console.log(`- Abonnements gratuits créés: ${fixedCount}`);
        console.log(`- Total vérifié: ${websites.length}`);

    } catch (error) {
        console.error('❌ Erreur lors de la correction des abonnements:', error);
    }
}

// Fonction pour diagnostiquer les abonnements
async function diagnoseSubscriptions() {
    try {
        console.log('🔍 Diagnostic des abonnements...\n');

        // Compter les sites
        const { count: websiteCount } = await supabase
            .from('websites')
            .select('id', { count: 'exact' });

        // Compter les abonnements actifs
        const { count: activeSubscriptionCount } = await supabase
            .from('website_subscriptions')
            .select('id', { count: 'exact' })
            .eq('status', 'active');

        // Compter par plan
        const { data: planCounts, error: planError } = await supabase
            .from('website_subscriptions')
            .select(`
                subscription_plan_id,
                subscription_plans (name)
            `)
            .eq('status', 'active');

        const planStats = {};
        if (planCounts) {
            planCounts.forEach(sub => {
                const planName = sub.subscription_plans?.name || 'Unknown';
                planStats[planName] = (planStats[planName] || 0) + 1;
            });
        }

        console.log('📊 Statistiques:');
        console.log(`- Nombre total de sites: ${websiteCount}`);
        console.log(`- Abonnements actifs: ${activeSubscriptionCount}`);
        console.log(`- Sites sans abonnement: ${websiteCount - activeSubscriptionCount}`);
        console.log('\n📋 Répartition par plan:');
        Object.entries(planStats).forEach(([plan, count]) => {
            console.log(`- ${plan}: ${count} sites`);
        });

    } catch (error) {
        console.error('❌ Erreur lors du diagnostic:', error);
    }
}

// Exécuter selon l'argument
const action = process.argv[2];

if (action === 'diagnose') {
    diagnoseSubscriptions();
} else if (action === 'fix') {
    fixMissingSubscriptions();
} else {
    console.log('Usage:');
    console.log('  node fix-subscriptions.js diagnose  - Diagnostiquer les abonnements');
    console.log('  node fix-subscriptions.js fix       - Corriger les abonnements manquants');
}