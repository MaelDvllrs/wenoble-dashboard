# Description Produit Stripe - Wenoble Premium

## 🏷️ Informations générales

**Nom du produit :** Wenoble Premium
**Type :** Abonnement récurrent mensuel
**Prix :** 9,99 € / mois

---

## 📝 Description du produit (à copier dans Stripe)

### Description courte
```
Abonnement Premium Wenoble - Créez et publiez votre site web professionnel avec domaine personnalisé
```

### Description détaillée
```
Transformez votre présence en ligne avec Wenoble Premium ! 

✨ FONCTIONNALITÉS INCLUSES :
• Domaine personnalisé avec SSL automatique
• Collections CMS illimitées pour vos contenus
• Pages personnalisées sans limitation
• Portfolio professionnel intégré
• Formulaires de contact avancés
• Newsletter et marketing par email
• Analytics détaillées et reporting
• Suppression complète du badge Wenoble
• Support client prioritaire

🚀 AVANTAGES PREMIUM :
• Publication sur votre propre domaine (ex: votresite.com)
• Certificat SSL inclus pour la sécurité
• Bande passante et stockage étendus
• Personnalisation avancée du design
• Intégrations tierces premium
• Sauvegarde automatique quotidienne

💼 IDÉAL POUR :
• Entrepreneurs et freelances
• Petites et moyennes entreprises  
• Portfolios professionnels
• Sites e-commerce
• Blogs et sites de contenu

📞 SUPPORT INCLUS :
• Support prioritaire par email
• Guides et tutoriels exclusifs
• Assistance technique dédiée
• Mises à jour automatiques

⚡ MISE EN ROUTE INSTANTANÉE :
Activez votre abonnement et publiez votre site en quelques minutes. Aucun engagement de durée, résiliable à tout moment.
```

---

## 🏪 Configuration dans Stripe Dashboard

### Étape par étape :

1. **Aller dans Products** → **Add product**

2. **Informations produit :**
   - **Name :** `Wenoble Premium`
   - **Description :** (utiliser la description détaillée ci-dessus)

3. **Pricing :**
   - **Pricing model :** Standard pricing
   - **Price :** `9.99 EUR`
   - **Billing period :** Monthly
   - **Usage type :** Licensed (per user/seat)

4. **Options avancées :**
   - **Statement descriptor :** `WENOBLE PREMIUM`
   - **Unit label :** `Abonnement`
   - **Tax behavior :** Exclusive (TVA en sus)

5. **Métadonnées suggérées :**
   ```
   category: website_builder
   tier: premium
   features: custom_domain,ssl,analytics,support
   target: small_business,freelancer,entrepreneur
   ```

---

## 🎨 Images et assets pour Stripe

### Suggestions d'images à ajouter :

1. **Logo produit :** Logo Wenoble Premium (400x400px)
2. **Image hero :** Capture d'écran d'un site créé avec Wenoble (1200x600px)
3. **Icônes fonctionnalités :** 
   - Domaine personnalisé
   - SSL sécurisé
   - Analytics
   - Support prioritaire

---

## 📋 Checklist configuration

- [ ] Produit créé dans Stripe
- [ ] Prix configuré (9.99 EUR/mois)
- [ ] Description ajoutée
- [ ] Images uploadées
- [ ] Métadonnées renseignées
- [ ] Statement descriptor défini
- [ ] ID du prix copié (commence par `price_`)
- [ ] ID ajouté dans le fichier .env (`STRIPE_PREMIUM_PRICE_ID`)

---

## 💡 Messages marketing complémentaires

### Pour les emails de bienvenue :
```
Félicitations ! Votre abonnement Wenoble Premium est maintenant actif. 
Vous pouvez dès maintenant connecter votre domaine personnalisé et 
bénéficier de toutes les fonctionnalités premium.
```

### Pour la page de confirmation de paiement :
```
🎉 Bienvenue dans Wenoble Premium !
Votre site est maintenant prêt à être publié sur votre propre domaine. 
Connectez-vous à votre dashboard pour commencer.
```

### Pour la facturation :
```
Abonnement mensuel Wenoble Premium
Création et hébergement de site web professionnel avec domaine personnalisé
```

---

## 🔄 Gestion des abonnements

### Messages pour les clients :
- **Activation :** "Votre abonnement Premium est maintenant actif"
- **Renouvellement :** "Votre abonnement Premium a été renouvelé avec succès"
- **Échec de paiement :** "Problème avec votre paiement Premium - Mettez à jour votre carte"
- **Annulation :** "Votre abonnement Premium sera actif jusqu'au [date]"

Cette description met en valeur les bénéfices concrets tout en restant claire et professionnelle pour Stripe et vos clients.