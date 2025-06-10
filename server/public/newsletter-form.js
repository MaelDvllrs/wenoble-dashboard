// Newsletter form script that follows the same patterns as contact-form.js
function initNewsletterForm(apiEndpoint, apiKey, formElement) {
    
    async function subscribeToNewsletter(email) {
        // Find success and error elements (siblings of the form)
        const parentElement = formElement.parentNode;
        const successElement = parentElement.querySelector('[wn-success-form]');
        const errorElement = parentElement.querySelector('[wn-error-form]');
        
        // Find all submit and face buttons
        const submitButton = formElement.querySelector('[wn-submit-form]');
        const faceButtons = document.querySelectorAll(`[wn-submit-face-form][wn-target-form="${formElement.id}"], [wn-submit-face-form]`);
        const relevantFaceButtons = [...faceButtons].filter(btn => !btn.getAttribute('wn-target-form') || btn.getAttribute('wn-target-form') === formElement.id);
        
        // Disable buttons and add loading indicator
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.setAttribute('data-original-text', submitButton.innerHTML);
            submitButton.innerHTML = '<span class="loader"></span> Inscription...';
        }
        
        relevantFaceButtons.forEach(btn => {
            btn.disabled = true;
            btn.setAttribute('data-original-text', btn.innerHTML);
            btn.innerHTML = '<span class="loader"></span> Inscription...';
        });

        try {
            const response = await fetch(apiEndpoint || 'https://api-wenoble.wenoble.fr/signUpNewsletter', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    apiKey: apiKey,
                    mail: email
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                if (successElement) successElement.style.display = 'block';
                if (errorElement) errorElement.style.display = 'none';
                // Hide the form after successful submission
                formElement.style.display = 'none';
                return { success: true };
            } else {
                if (successElement) successElement.style.display = 'none';
                if (errorElement) errorElement.style.display = 'block';
                // Hide the form even if there was an error
                formElement.style.display = 'none';
                return { success: false, message: data.message || 'Error subscribing to newsletter' };
            }
        } catch (error) {
            console.error('Connection error:', error);
            if (successElement) successElement.style.display = 'none';
            if (errorElement) errorElement.style.display = 'block';
            // Hide the form when there's an error
            formElement.style.display = 'none';
            return { success: false, message: 'Server connection error' };
        } finally {
            // Re-enable buttons and restore original text
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

    // Set up form submission
    formElement.addEventListener('submit', async function(e) {
        e.preventDefault();
        const emailInput = formElement.querySelector('[wn-element-form]');
        const email = emailInput ? emailInput.value.trim() : '';
        
        if (email) {
            await subscribeToNewsletter(email);
        }
    });
}

// Auto-initialize newsletter forms when the script is loaded
document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('[wn-error-form]').forEach(el => {
            el.style.setProperty('display', 'none', 'important');
        });
    });


    // Find all forms with the wn-newsletter-form attribute
    const newsletterForms = document.querySelectorAll('[wn-newsletter-form]');
    
    newsletterForms.forEach(form => {
        // Get form parameters from data attributes
        const apiEndpoint = form.getAttribute('data-api-endpoint') || 'https://api-wenoble.wenoble.fr/signUpNewsletter';
        const apiKey = form.getAttribute('data-api-key');
        
        // If no API key is provided, look in meta tags
        let finalApiKey = apiKey;
        if (!finalApiKey) {
            const metaApiKey = document.querySelector('meta[name="wn-api-key"]');
            finalApiKey = metaApiKey ? metaApiKey.getAttribute('content') : null;
        }
        
        if (!finalApiKey) {
            console.error('Error: Missing API key for newsletter form. Add data-api-key to your form or a meta[name="wn-api-key"] tag');
            return;
        }
        
        // Initialize the form with a direct reference to the form element
        initNewsletterForm(
            apiEndpoint,
            finalApiKey,
            form
        );
        
        // Check if feedback elements are present
        const parentElement = form.parentNode;
        const successElement = parentElement.querySelector('[wn-success-form]');
        const errorElement = parentElement.querySelector('[wn-error-form]');
        
        if (!successElement) {
            console.warn('No element with wn-success-form attribute found to display success message.');
        }
        
        if (!errorElement) {
            console.warn('No element with wn-error-form attribute found to display error message.');
        }
    });
    
    // Set up face buttons that trigger submit buttons
    document.querySelectorAll('[wn-submit-face-form]').forEach(faceButton => {


        faceButton.addEventListener('click', function() {
            // Find parent or targeted form
            let targetFormId = faceButton.getAttribute('wn-target-form');
            let submitButton;
            
            if (targetFormId) {
                // If a target form ID is specified
                const targetForm = document.getElementById(targetFormId);
                if (targetForm) {
                    submitButton = targetForm.querySelector('[wn-submit-form]');
                }
            } else {
                // Look for submit button in the same form
                const parentForm = faceButton.closest('form[wn-newsletter-form]');
                if (parentForm) {
                    submitButton = parentForm.querySelector('[wn-submit-form]');
                }
            }
            
            // Click the submit button if found
            if (submitButton) {
                submitButton.click();
            } else {
                console.error('Submit button with wn-submit-form attribute not found');
            }
        });
    });
});

/* 
How to use this script:
1. IMPORTANT: Add the wn-newsletter-form attribute to your form for automatic detection
   <form wn-newsletter-form data-api-key="YOUR_API_KEY">

2. Provide an API key either:
   - As an attribute on the form: data-api-key="YOUR_API_KEY"
   - As a meta tag: <meta name="wn-api-key" content="YOUR_API_KEY">

3. Use these attributes to identify form elements:
   - Email input field: wn-element-form
   - Submit button: wn-submit-form
   - Alternative trigger button: wn-submit-face-form
   
4. For success/error messages:
   - wn-success-form for success element
   - wn-error-form for error element

Example HTML:
<form id="newsletter-form" wn-newsletter-form data-api-key="MY_API_KEY">
    <input type="email" wn-element-form placeholder="Email" required>
    
    <!-- Hidden button that actually submits the form -->
    <button type="submit" wn-submit-form style="display:none">Subscribe</button>
</form>

<!-- Visual button that triggers submission -->
<button wn-submit-face-form wn-target-form="newsletter-form">Subscribe to Newsletter</button>

<!-- Result messages -->
<div wn-success-form style="display: none">Thank you for subscribing!</div>
<div wn-error-form style="display: none">Error subscribing to newsletter.</div>
*/
