// Modification de la fonction pour gérer les filtres avec deux wn-filter-field
async function handleCollectionFilters() {
    // Parcourir la page pour trouver la collection à filtrer
    const collection = document.querySelector('[wn-filter="list"]');
    if (!collection) {
        console.warn('Aucune collection avec l\'attribut wn-filter="list" trouvée.');
        return;
    }

    // Récupérer les éléments enfants avec l'attribut wn-filter-field
    const itemsToFilter = Array.from(collection.querySelectorAll('[wn-filter-field]'));
    console.log('Items à filtrer:', itemsToFilter);

    // Chercher le formulaire de filtre
    const filterForm = document.querySelector('[wn-filter="filter"]');
    console.log('Formulaire de filtre trouvé:', filterForm);
    if (!filterForm) {
        console.warn('Aucun formulaire de filtre avec l\'attribut wn-filter="filter" trouvé.');
        return;
    }

    // Ajouter un événement pour chaque champ de filtre
    const filterFields = filterForm.querySelectorAll('[wn-filter-field]');
    filterFields.forEach((field) => {
        const input = field.closest('input[type="checkbox"], input[type="radio"]');
        if (input) {
            input.addEventListener('change', () => applyFilters(itemsToFilter, filterFields));
        }
    });

    // Fonction pour appliquer les filtres
    function applyFilters(items, fields) {
        items.forEach((item) => {
            let isVisible = true;

            fields.forEach((field) => {
                const identifier = field.getAttribute('wn-filter-field');
                const input = field.closest('input[type="checkbox"], input[type="radio"]');

                if (input && input.checked) {
                    const filterText = field.textContent.trim().toLowerCase();
                    const itemField = item.getAttribute('wn-filter-field');
                    const itemText = item.textContent.trim().toLowerCase();

                    if (itemField === identifier) {
                        if (itemText !== filterText) {
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