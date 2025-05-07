document.addEventListener('DOMContentLoaded', handleCollectionFilters);

async function waitForCollectionBox(container) {
  return new Promise((resolve) => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (
            node.classList &&
            node.classList.contains('ssr-wn-collection-box')
          ) {
            observer.disconnect();
            setTimeout(resolve, 200); // attendre encore un peu pour que les vrais items soient là
          }
        });
      });
    });
    observer.observe(container, { childList: true, subtree: true });
  });
}

async function handleCollectionFilters() {
  // Injecter les styles nécessaires
  const style = document.createElement('style');
  style.textContent = ` 
    [wn-collection-element] {
      transition: opacity 0.25s ease, transform 0.25s ease;
    }
    .wn-hidden {
      opacity: 0;
      transform: scale(0.95);
      pointer-events: none;
    }
    .wn-fully-hidden {
      display: none !important;
    }
  `;
  document.head.appendChild(style);

  const collection = document.querySelector('[wn-filter="list"]');
  if (!collection) {
    console.warn('Aucune collection avec wn-filter="list" trouvée.');
    return;
  }

  if (window.location.hostname.includes('webflow.io')) {
    console.log('Attente de .ssr-wn-collection-box...');
    await waitForCollectionBox(collection);
  }

  const itemsToFilter = Array.from(
    collection.querySelectorAll('[wn-filter-field]')
  );
  console.log('Items à filtrer:', itemsToFilter);

  // Sélectionner tous les formulaires de filtres
  const filterForms = document.querySelectorAll('[wn-filter="filter"]');
  if (!filterForms.length) {
    console.warn('Aucun formulaire de filtre trouvé.');
    return;
  }

  // Appliquer un événement à chaque formulaire de filtre
  filterForms.forEach((filterForm) => {
    const filterFields = filterForm.querySelectorAll('[wn-filter-field]');
    filterFields.forEach((field) => {
      const parent = field.closest('label') || field.parentElement;
      const input = parent.querySelector('input[type="checkbox"], input[type="radio"]');
      if (input) {
        input.addEventListener('change', () => applyFilters(itemsToFilter, filterForms));
      }
    });
  });

  // Appliquer les filtres dès le départ
  applyFilters(itemsToFilter, filterForms);

  // Gestion du bouton/lien ou case à cocher de réinitialisation des filtres
  const clearFilterButton = document.querySelector('[wn-filter="clear"]');
  if (clearFilterButton) {
    clearFilterButton.addEventListener('click', () => clearFilters(itemsToFilter, filterForms));
  }
}

function applyFilters(items, filterForms) {
  // Masquer tous les éléments en jouant uniquement sur l'opacité et la transformation
  items.forEach((item) => {
    const collectionElement = item.closest('[wn-collection-element]');
    if (collectionElement) {
      collectionElement.classList.add('wn-hidden');  // Animation de disparition
    }
  });

  // Attendre la fin de l'animation avant de procéder aux filtres
  setTimeout(() => {
    items.forEach((item) => {
      let isVisible = true;

      // Appliquer chaque filtre sur chaque item
      filterForms.forEach((filterForm) => {
        const filterFields = filterForm.querySelectorAll('[wn-filter-field]');
        
        filterFields.forEach((field) => {
          const identifier = field.getAttribute('wn-filter-field');
          const parent = field.closest('label') || field.parentElement;
          const input = parent.querySelector('input[type="checkbox"], input[type="radio"]');

          if (input && input.checked) {
            const filterValue = field.textContent.trim().toLowerCase();
            const itemField = item.getAttribute('wn-filter-field');
            const itemText = item.textContent.trim().toLowerCase();

            // Vérifier si l'élément correspond au filtre appliqué
            if (itemField === identifier && itemText !== filterValue) {
              isVisible = false; // Si non, masquer cet item
            }
          }
        });
      });

      const collectionElement = item.closest('[wn-collection-element]');
      if (!collectionElement) return;

      if (isVisible) {
        // Appliquer display: block et réinitialiser l'animation d'entrée
        collectionElement.classList.remove('wn-fully-hidden');
        void collectionElement.offsetWidth; // Reflow pour forcer le rechargement de l'élément
        collectionElement.classList.remove('wn-hidden');
      } else {
        // Cacher complètement l'élément si il ne correspond pas au filtre
        collectionElement.classList.add('wn-fully-hidden');
      }
    });
  }, 250); // Attendre la fin de la disparition initiale avant de filtrer
}

function clearFilters(items, filterForms) {
  // Réinitialiser tous les champs de filtre (checkboxes, radios)
  filterForms.forEach((filterForm) => {
    const filterFields = filterForm.querySelectorAll('[wn-filter-field]');
    filterFields.forEach((field) => {
      const parent = field.closest('label') || field.parentElement;
      const input = parent.querySelector('input[type="checkbox"], input[type="radio"]');
      if (input) {
        input.checked = false; // Décocher tous les champs
      }
    });
  });

  // Appliquer de nouveau les filtres (mais sans aucun filtre actif, donc tout sera visible)
  applyFilters(items, filterForms);
}
