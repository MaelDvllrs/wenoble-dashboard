// Fonction asynchrone pour gérer les filtres des collections
async function handleCollectionFilters() {
    // Parcourir la page pour trouver la collection à filtrer
    const collection = document.querySelector('[wn-filter="list"]');
    if (!collection) {
        console.warn('Aucune collection avec l\'attribut wn-filter="list" trouvée.');
        return;
    }

    // Récupérer les éléments enfants directs sauf ceux avec la classe "ssr-wn-collection-box"
    const itemsToFilter = Array.from(collection.children).filter(
        (child) => !child.classList.contains('ssr-wn-collection-box')
    );

    // Chercher le formulaire de filtre
    const filterForm = document.querySelector('[wn-filter="filter"]');
    if (!filterForm) {
        console.warn('Aucun formulaire de filtre avec l\'attribut wn-filter="filter" trouvé.');
        return;
    }

    // Ajouter un événement pour chaque champ de filtre
    const filterFields = filterForm.querySelectorAll('[wn-filter-field]');
    filterFields.forEach((field) => {
        const input = field.closest('input[type="checkbox"], input[type="radio"], input[type="text"]');
        if (input) {
            input.addEventListener('input', () => applyFilters(itemsToFilter, filterFields));
        }
    });

    // Fonction pour appliquer les filtres
    function applyFilters(items, fields) {
        items.forEach((item) => {
            let isVisible = true;

            fields.forEach((field) => {
                const identifier = field.getAttribute('wn-filter-field');
                const input = field.closest('input[type="checkbox"], input[type="radio"], input[type="text"]');

                if (input) {
                    const value = input.type === 'text' ? input.value.toLowerCase() : input.checked;
                    const itemField = item.querySelector(`[wn-filter-field="${identifier}"]`);

                    if (itemField) {
                        const itemValue = itemField.textContent.toLowerCase();

                        if (input.type === 'text') {
                            if (!itemValue.includes(value)) {
                                isVisible = false;
                            }
                        } else if (!value) {
                            isVisible = false;
                        }
                    }
                }
            });

            // Afficher ou masquer l'élément en fonction des filtres
            item.style.display = isVisible ? '' : 'none';
        });
    }
}

// Appeler la fonction lorsque le script est chargé
document.addEventListener('DOMContentLoaded', handleCollectionFilters);