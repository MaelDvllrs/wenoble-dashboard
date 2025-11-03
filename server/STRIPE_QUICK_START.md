# Guide de démarrage rapide - Configuration Stripe

## 🚀 Résolution de l'erreur "Neither apiKey nor config.authenticator provided"

Cette erreur indique que Stripe n'est pas encore configuré. Voici comment la résoudre :

### Option 1: Configuration rapide pour les tests

1. **Ajoutez ces lignes à votre fichier `.env` :**
```env
STRIPE_SECRET_KEY=sk_test_placeholder_key
STRIPE_PUBLISHABLE_KEY=pk_test_placeholder_key  
STRIPE_WEBHOOK_SECRET=whsec_placeholder_secret
STRIPE_PREMIUM_PRICE_ID=price_placeholder_id
CLIENT_URL=http://localhost:5173
```

2. **Redémarrez votre serveur**

➡️ Le serveur démarrera maintenant, mais les paiements ne fonctionneront pas encore.

### Option 2: Configuration complète avec Stripe

#### Étape 1: Créer un compte Stripe
1. Allez sur [stripe.com](https://stripe.com)
2. Créez un compte gratuit
3. Confirmez votre email

#### Étape 2: Récupérer vos clés API
1. Dans le dashboard Stripe, allez à **Developers > API keys**
2. Copiez la **Clé secrète** (commence par `sk_test_`)
3. Copiez la **Clé publique** (commence par `pk_test_`)

#### Étape 3: Créer un produit
1. Allez dans **Products** dans le dashboard Stripe
2. Cliquez sur **Add product**
3. Nom: "Wenoble Premium"
4. Prix: 9.99 EUR, récurrent, mensuel
5. Sauvegardez et copiez l'**ID du prix** (commence par `price_`)

#### Étape 4: Mettre à jour votre .env
```env
STRIPE_SECRET_KEY=sk_test_votre_vraie_cle_ici
STRIPE_PUBLISHABLE_KEY=pk_test_votre_vraie_cle_ici
STRIPE_PREMIUM_PRICE_ID=price_votre_vraie_id_ici
```

#### Étape 5: Redémarrer
```bash
# Dans le dossier server
node index.js
```

## ✅ Vérification

Si tout fonctionne, vous verrez dans les logs :
- ✅ Aucune erreur Stripe au démarrage
- ✅ Les boutons d'abonnement fonctionnent
- ✅ Redirection vers Stripe lors du clic

## 🎯 Prochaines étapes

Une fois Stripe configuré, vous pourrez :
- Tester les paiements avec les cartes de test Stripe
- Configurer les webhooks pour la synchronisation automatique
- Mettre en place le portail client pour la gestion des abonnements

---

**Besoin d'aide ?** 
- Les cartes de test Stripe: [stripe.com/docs/testing](https://stripe.com/docs/testing)
- Documentation complète dans `/server/docs/stripe-configuration.md`