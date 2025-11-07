(function() {
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    [wn-error-form]{
      display: none !important;
    }
    /* Honeypot - checkbox caché pour piéger les bots */
    .wn-honeypot {
      position: absolute !important;
      left: -9999px !important;
      width: 1px !important;
      height: 1px !important;
      opacity: 0 !important;
      pointer-events: none !important;
      tab-index: -1 !important;
    }
  `;
  document.head.appendChild(styleElement);
})();


function initContactForm(apiEndpoint, apiKey, formElement, submitButtonSelector = '#contact_submit_button', triggerButtonSelector = '#contact_button') {
    // Fonction modifiée pour utiliser les éléments frères avec attributs wn-success-form et wn-error-form
    
    // Variables anti-bot - stocker le temps de chargement comme propriété du formulaire
    if (!formElement.dataset.loadTime) {
        formElement.dataset.loadTime = Date.now().toString();
    }
    const MIN_SUBMIT_TIME = 3000; // Minimum 3 secondes avant soumission
    
    // Ajouter un checkbox honeypot si pas déjà présent
    if (!formElement.querySelector('.wn-honeypot')) {
        const honeypot = document.createElement('input');
        honeypot.type = 'checkbox';
        honeypot.name = 'bot_check';
        honeypot.className = 'wn-honeypot';
        honeypot.tabIndex = -1;
        honeypot.setAttribute('aria-hidden', 'true');
        honeypot.style.display = 'none';
        // Ajouter un label invisible pour tromper les bots
        const honeypotLabel = document.createElement('label');
        honeypotLabel.textContent = 'Please check this box if you are human';
        honeypotLabel.className = 'wn-honeypot';
        honeypotLabel.style.display = 'none';
        honeypotLabel.appendChild(honeypot);
        formElement.appendChild(honeypotLabel);
    }
    
    async function sendEmail(emailSender, subject, html, formData) {
        // Trouver les éléments de succès et d'erreur (frères du formulaire)
        const parentElement = formElement.parentNode;
        const successElement = parentElement.querySelector('[wn-success-form]');
        const errorElement = parentElement.querySelector('[wn-error-form]');
        
        // Trouver tous les boutons de soumission et de déclenchement
        const submitButton = formElement.querySelector('[wn-submit-form]');
        const faceButtons = document.querySelectorAll(`[wn-submit-face-form][wn-target-form="${formElement.id}"], [wn-submit-face-form]`);
        const relevantFaceButtons = [...faceButtons].filter(btn => !btn.getAttribute('wn-target-form') || btn.getAttribute('wn-target-form') === formElement.id);
        
        // Désactiver les boutons et ajouter l'indicateur de chargement
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.setAttribute('data-original-text', submitButton.innerHTML);
            submitButton.innerHTML = '<span class="loader"></span> Envoi en cours...';
        }
        
        relevantFaceButtons.forEach(btn => {
            btn.disabled = true;
            btn.setAttribute('data-original-text', btn.innerHTML);
            btn.innerHTML = '<span class="loader"></span> Envoi en cours...';
        });

        // Calculer le temps écoulé depuis le chargement du formulaire
        const formLoadTime = parseInt(formElement.dataset.loadTime || Date.now().toString());
        const submitTime = Date.now() - formLoadTime;
        
        const queryParams = new URLSearchParams({
            apiKey: apiKey,
            emailSender: emailSender,
            subject: subject,
            html: html
        }).toString();
    
        try {
            const response = await fetch(`${apiEndpoint}?${queryParams}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    apiKey: apiKey,
                    emailSender: emailSender,
                    subject: subject,
                    html: html,
                    formData: formData,
                    submitTime: submitTime,
                    userAgent: navigator.userAgent,
                    timestamp: Date.now()
                })
            });
    
            const data = await response.json();
    
            if (response.ok) {
                if (successElement) successElement.style.display = 'block';
                if (errorElement) errorElement.style.display = 'none';
                // Masquer le formulaire après une soumission réussie
                formElement.style.display = 'none';
            } else {
                if (successElement) successElement.style.display = 'none';
                if (errorElement) errorElement.style.display = 'block';
                // Masquer le formulaire même en cas d'erreur
                formElement.style.display = 'none';
            }
        } catch (error) {
            console.error('Error:', error);
            if (successElement) successElement.style.display = 'none';
            if (errorElement) errorElement.style.display = 'block';
            // Masquer le formulaire en cas d'erreur de connexion
            formElement.style.display = 'none';
        } finally {
            // Réactiver les boutons et restaurer leur texte original
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = submitButton.getAttribute('data-original-text');
            }
            
            relevantFaceButtons.forEach(btn => {
                btn.disabled = false;
                btn.innerHTML = btn.getAttribute('data-original-text');
            });
        }
    }
    
    // Trouver le bouton déclencheur relatif à ce formulaire
    const triggerButton = document.querySelector(triggerButtonSelector);
    if (triggerButton) {
        triggerButton.addEventListener("click", () => {
            const submitButton = formElement.querySelector(submitButtonSelector.replace('#', ''));
            if (submitButton) submitButton.click();
        });
    }
    
    // Utiliser directement l'élément formulaire au lieu d'un sélecteur
    if (formElement) {
        formElement.addEventListener("submit", function (event) {
            event.preventDefault();
            
            // === PROTECTIONS ANTI-BOT ===
            
            // 1. Vérifier le honeypot checkbox (si coché = bot)
            const honeypot = formElement.querySelector('.wn-honeypot input[type="checkbox"]');
            if (honeypot && honeypot.checked) {
                console.warn('Bot détecté: honeypot checkbox coché');
                // Ne rien afficher, juste ignorer silencieusement
                return;
            }
            
            // 2. Vérifier le temps minimum de soumission
            const formLoadTime = parseInt(formElement.dataset.loadTime || Date.now().toString());
            const submitTime = Date.now() - formLoadTime;
            if (submitTime < MIN_SUBMIT_TIME) {
                const parentElement = formElement.parentNode;
                const errorElement = parentElement.querySelector('[wn-error-form]');
                if (errorElement) {
                    errorElement.textContent = 'Veuillez prendre le temps de remplir le formulaire.';
                    errorElement.style.display = 'block';
                }
                console.warn('Bot détecté: soumission trop rapide', submitTime, 'ms');
                return;
            }
            
            // Collecte des champs avec attribut wn-element-form
            const formFields = formElement.querySelectorAll('[wn-element-form]');
            const formData = {};
            let senderEmail = '';
            
            formFields.forEach(field => {
                // Si c'est un label avec wn-element-form (cas radio)
                if (field.tagName === 'LABEL' && field.querySelector('input[type="radio"]')) {
                    const fieldName = field.getAttribute('wn-element-form');
                    // Cherche tous les radios enfants de ce label
                    const radios = field.querySelectorAll('input[type="radio"]');
                    radios.forEach(radio => {
                        if (radio.checked) {
                            formData[fieldName] = radio.value;
                            // Si c'est un champ email
                            if (fieldName.toLowerCase() === 'email') {
                                senderEmail = radio.value;
                            }
                        }
                    });
                } else {
                    // ...gestion classique (input, textarea, etc.)
                    const fieldName = field.getAttribute('wn-element-form');
                    let fieldValue;
                    if (field.type === 'checkbox') {
                        fieldValue = field.checked;
                        formData[fieldName] = fieldValue;
                    } else if (field.type === 'radio') {
                        if (field.checked) {
                            formData[fieldName] = field.value;
                        }
                    } else {
                        fieldValue = field.value || '';
                        formData[fieldName] = fieldValue;
                    }

                    if (fieldName.toLowerCase() === 'email') {
                        senderEmail = field.value;
                    }
                }
            });
            
            // 3. Validation des patterns spam
            const spamPatterns = [
                /viagra|cialis|pharmacy|casino|poker|lottery|winner|prize/i,
                /(http:\/\/|https:\/\/|www\.)[^\s]{50,}/g, // URLs très longues
                /(.)\1{10,}/g, // Caractères répétés (ex: aaaaaaaaaaa)
                /<script|<iframe|javascript:/i, // Tentatives XSS
            ];
            
            let isSpam = false;
            Object.values(formData).forEach(value => {
                if (typeof value === 'string') {
                    spamPatterns.forEach(pattern => {
                        if (pattern.test(value)) {
                            isSpam = true;
                        }
                    });
                }
            });
            
            if (isSpam) {
                console.warn('Spam détecté: contenu suspect');
                const parentElement = formElement.parentNode;
                const errorElement = parentElement.querySelector('[wn-error-form]');
                if (errorElement) {
                    errorElement.textContent = 'Le contenu du message a été rejeté.';
                    errorElement.style.display = 'block';
                }
                return;
            }
            
            // 4. Vérifier que les champs obligatoires ne sont pas juste des espaces
            let hasEmptyRequired = false;
            formFields.forEach(field => {
                if (field.required && typeof field.value === 'string') {
                    if (field.value.trim() === '') {
                        hasEmptyRequired = true;
                    }
                }
            });
            
            if (hasEmptyRequired) {
                console.warn('Champs obligatoires vides ou contenant uniquement des espaces');
                return;
            }
            
            // Construire le message HTML avec un template moderne
            let messageContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Nouveau message de contact</title>
                <style>
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        background-color: #ffffff;
                        border-radius: 8px;
                        overflow: hidden;
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        line-height: 1.6;
                        color: #333;
                    }
                    .header {
                        background-color: #2ec96d; /* Changement de la couleur d'accent en vert */
                        color: #ffffff;
                        padding: 25px;
                        text-align: center;
                    }
                    .header h1 {
                        margin: 0;
                        font-size: 24px;
                        font-weight: 600;
                    }
                    .content {
                        padding: 25px;
                    }
                    .field {
                        margin-bottom: 20px;
                        border-bottom: 1px solid #eaeaea;
                        padding-bottom: 15px;
                    }
                    .field:last-child {
                        border-bottom: none;
                        margin-bottom: 0;
                    }
                    .field-label {
                        font-weight: 600;
                        color: #555;
                        margin-bottom: 5px;
                        text-transform: capitalize;
                    }
                    .field-value {
                        color: #333;
                    }
                    .footer {
                        background-color: #f9f9f9;
                        padding: 15px;
                        text-align: center;
                        color: #777;
                        font-size: 12px;
                    }
                </style>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f5f5f5;">
                <div class="container">
                    <div class="header">
                        <h1>Nouveau message de contact</h1>
                    </div>
                    <div class="content">
            `;
            
            Object.entries(formData).forEach(([key, value]) => {
                messageContent += `
                        <div class="field">
                            <div class="field-label">${key}</div>
                            <div class="field-value">${value || '-'}</div>
                        </div>
                `;
            });
            
            messageContent += `
                    </div>
                    <div class="footer">
                        Ce message a été envoyé via le formulaire de contact de votre site web.
                    </div>
                </div>
            </body>
            </html>
            `;
            
            // Déterminer le sujet
            let subject = 'Nouveau message de contact';
            if (formData.nom) {
                subject = 'Message de ' + formData.nom;
            }
            
            // Envoyer l'email avec les données pour validation côté serveur
            sendEmail(senderEmail || 'contact@example.com', subject, messageContent, formData);
        });
    }
}

// Auto-initialisation du formulaire lorsque le script est chargé
document.addEventListener('DOMContentLoaded', () => {

    // Rechercher les formulaires avec l'attribut wn-contact-form
    const contactForms = document.querySelectorAll('[wn-contact-form]');
    
    contactForms.forEach(form => {
        // Récupérer les paramètres du formulaire à partir des attributs data-
        const apiEndpoint = form.getAttribute('data-api-endpoint') || 'https://api-wenoble.wenoble.fr/sendEmail';
        const apiKey = form.getAttribute('data-api-key');
        
        // Si aucune clé API n'est fournie, rechercher dans les meta tags
        let finalApiKey = apiKey;
        if (!finalApiKey) {
            const metaApiKey = document.querySelector('meta[name="wn-api-key"]');
            finalApiKey = metaApiKey ? metaApiKey.getAttribute('content') : null;
        }
        
        if (!finalApiKey) {
            console.error('Erreur: Clé API manquante pour le formulaire de contact. Ajoutez data-api-key à votre formulaire ou une balise meta[name="wn-api-key"]');
            return;
        }
        
        // Récupérer les sélecteurs relatifs à ce formulaire
        const submitButtonSelector = form.getAttribute('data-submit-button') || 'button[type="submit"]';
        const triggerButtonSelector = form.getAttribute('data-trigger-button') || '#contact_button';
        
        // Initialiser le formulaire avec une référence directe à l'élément form
        // Les éléments de succès et d'erreur sont désormais détectés automatiquement
        initContactForm(
            apiEndpoint,
            finalApiKey,
            form,
            submitButtonSelector,
            triggerButtonSelector
        );
        
        // Vérifier si les éléments de feedback sont présents
        const parentElement = form.parentNode;
        const successElement = parentElement.querySelector('[wn-success-form]');
        const errorElement = parentElement.querySelector('[wn-error-form]');
        
        if (!successElement) {
            console.warn('Aucun élément avec attribut wn-success-form trouvé pour afficher le message de succès.');
        }
        
        if (!errorElement) {
            console.warn('Aucun élément avec attribut wn-error-form trouvé pour afficher le message d\'erreur.');
        }
    });
    
    // Configurer les boutons face formulaire qui déclenchent les boutons de soumission
    document.querySelectorAll('[wn-submit-face-form]').forEach(faceButton => {
        faceButton.addEventListener('click', function() {
            // Trouver le formulaire parent ou ciblé
            let targetFormId = faceButton.getAttribute('wn-target-form');
            let submitButton;
            
            if (targetFormId) {
                // Si un ID de formulaire cible est spécifié
                const targetForm = document.getElementById(targetFormId);
                if (targetForm) {
                    submitButton = targetForm.querySelector('[wn-submit-form]');
                }
            } else {
                // Chercher le bouton de soumission dans le même formulaire
                const parentForm = faceButton.closest('form[wn-contact-form]');
                if (parentForm) {
                    submitButton = parentForm.querySelector('[wn-submit-form]');
                }
            }
            
            // Cliquer sur le bouton de soumission si trouvé
            if (submitButton) {
                submitButton.click();
            } else {
                console.error('Bouton de soumission avec attribut wn-submit-form non trouvé');
            }
        });
    });
});

/* 
Comment utiliser ce script:
1. IMPORTANT: Ajoutez l'attribut wn-contact-form à votre formulaire pour qu'il soit automatiquement détecté
   <form wn-contact-form data-api-key="VOTRE_CLE_API">

2. Fournissez une clé API soit:
   - Comme attribut sur le formulaire: data-api-key="VOTRE_CLE_API"
   - Comme balise meta: <meta name="wn-api-key" content="VOTRE_CLE_API">

3. Utilisez ces attributs pour identifier les éléments de formulaire:
   - Champs de formulaire: wn-element-form="nom_du_champ"
   - Bouton de soumission: wn-submit-form
   - Bouton déclencheur alternatif: wn-submit-face-form
   
4. Optionnel: pour les messages de succès/erreur:
   - wn-success-form pour l'élément de succès
   - wn-error-form pour l'élément d'erreur

5. Style pour l'indicateur de chargement (à ajouter à votre CSS):
   .loader {
     display: inline-block;
     width: 16px;
     height: 16px;
     border: 2px solid rgba(255,255,255,.3);
     border-radius: 50%;
     border-top-color: #fff;
     animation: spin 1s ease-in-out infinite;
     margin-right: 5px;
   }
   @keyframes spin {
     to { transform: rotate(360deg); }
   }

Exemple HTML complet:
<form id="formulaire-contact" wn-contact-form data-api-key="MA_CLE_API">
    <input type="text" wn-element-form="nom" placeholder="Nom" required>
    <input type="email" wn-element-form="email" placeholder="Email" required>
    <textarea wn-element-form="message" placeholder="Message"></textarea>
    
    <!-- Bouton caché qui effectue réellement la soumission -->
    <button type="submit" wn-submit-form style="display:none">Envoyer</button>
</form>

<!-- Bouton visuel qui déclenche la soumission -->
<button wn-submit-face-form wn-target-form="formulaire-contact">Envoyer le message</button>

<!-- Messages de résultat -->
<div wn-success-form style="display: none">Message envoyé avec succès!</div>
<div wn-error-form style="display: none">Erreur lors de l'envoi du message.</div>
*/