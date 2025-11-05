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
            setTimeout(resolve, 200);
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
      opacity: 1;
      transform: scale(1);
      pointer-events: auto;
    }

    [wn-collection-element].wn-animate {
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

    .wn-no-animation {
      transition: none !important;
    }

    [wn-pagination-number] {
      cursor: pointer;
    }

    [wn-pagination-number].active {
      font-weight: bold;
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);

  const collection = document.querySelector('[wn-filter="list"]');
  if (!collection) return;

  // Récupérer la configuration de pagination
  const paginationLimit = parseInt(collection.getAttribute('wn-filter-pagination')) || 0;
  const hasPagination = paginationLimit > 0;

  if (window.location.hostname.includes('webflow.io')) {
    await waitForCollectionBox(collection);
  }

  const itemsToFilter = Array.from(
    collection.querySelectorAll('[wn-filter-field]')
  );

  const filterForms = document.querySelectorAll('[wn-filter="filter"]');
  if (!filterForms.length) return;

  // Désactiver temporairement les animations au démarrage
  document
    .querySelectorAll('[wn-collection-element]')
    .forEach((el) => el.classList.add('wn-no-animation'));

  // Vérifier s'il y a un bouton de confirmation
  const filterButton = document.querySelector('[wn-filter-button]');
  const hasConfirmButton = !!filterButton;

  // Attacher les événements de filtre
  filterForms.forEach((form) => {
    const fields = form.querySelectorAll('[wn-filter-field]');
    fields.forEach((field) => {
      const parent = field.closest('label') || field.parentElement;
      const input = parent.querySelector('input[type="checkbox"], input[type="radio"]');
      const select = parent.querySelector('select');
      
      // Si pas de bouton de confirmation, appliquer les filtres immédiatement
      if (!hasConfirmButton) {
        if (input) {
          input.addEventListener('change', () =>
            applyFilters(itemsToFilter, filterForms)
          );
        }
        if (select) {
          select.addEventListener('change', () =>
            applyFilters(itemsToFilter, filterForms)
          );
        }
      }
    });
  });

  // Si un bouton de confirmation existe, écouter son clic
  if (filterButton) {
    filterButton.addEventListener('click', (e) => {
      e.preventDefault();
      applyFilters(itemsToFilter, filterForms);
    });
  } else {
    // Appliquer les filtres au démarrage seulement s'il n'y a PAS de bouton
    applyFilters(itemsToFilter, filterForms, true);
  }

  // Activer les animations après initialisation
  setTimeout(() => {
    document
      .querySelectorAll('[wn-collection-element]')
      .forEach((el) => {
        el.classList.remove('wn-no-animation');
        el.classList.add('wn-animate');
      });
  }, 50);

  // Bouton ou lien pour réinitialiser les filtres
  const clearButton = document.querySelector('[wn-filter="clear"]');
  if (clearButton) {
    clearButton.addEventListener('click', () => clearFilters(itemsToFilter, filterForms, hasPagination, paginationLimit));
  }

  // Initialiser la pagination si activée
  if (hasPagination) {
    initPagination(paginationLimit);
  }
}

// État global de la pagination
let currentPage = 1;
let visibleItems = [];

function initPagination(limit) {
  const paginationContainer = document.querySelector('[wn-collection-pagination]');
  if (!paginationContainer) {
    console.warn('Pagination activée mais [wn-collection-pagination] introuvable');
    return;
  }

  // Délégation d'événements pour les numéros de page
  paginationContainer.addEventListener('click', (e) => {
    const pageNumber = e.target.closest('[wn-pagination-number]');
    if (pageNumber) {
      const page = parseInt(pageNumber.textContent);
      if (!isNaN(page)) {
        goToPage(page, limit);
      }
    }
  });

  // Bouton précédent
  const prevButton = document.querySelector('[wn-pagination-prev]');
  if (prevButton) {
    prevButton.addEventListener('click', (e) => {
      e.preventDefault();
      if (currentPage > 1) {
        goToPage(currentPage - 1, limit);
      }
    });
  }

  // Bouton suivant
  const nextButton = document.querySelector('[wn-pagination-next]');
  if (nextButton) {
    nextButton.addEventListener('click', (e) => {
      e.preventDefault();
      const totalPages = Math.ceil(visibleItems.length / limit);
      if (currentPage < totalPages) {
        goToPage(currentPage + 1, limit);
      }
    });
  }
}

function updatePagination(items, limit) {
  const paginationContainer = document.querySelector('[wn-collection-pagination]');
  if (!paginationContainer) return;

  const totalPages = Math.ceil(items.length / limit);
  
  // Sauvegarder les éléments visibles
  visibleItems = items;

  // Réinitialiser à la page 1 si la page actuelle dépasse le nombre de pages
  if (currentPage > totalPages) {
    currentPage = 1;
  }

  // Générer les numéros de page
  const pageNumberTemplate = paginationContainer.querySelector('[wn-pagination-number]');
  if (!pageNumberTemplate) {
    console.warn('[wn-pagination-number] template introuvable dans [wn-collection-pagination]');
    return;
  }

  // Vider le contenu actuel (sauf le template)
  const parent = pageNumberTemplate.parentElement;
  Array.from(parent.children).forEach(child => {
    if (child !== pageNumberTemplate) {
      child.remove();
    }
  });

  // Masquer le template
  pageNumberTemplate.style.display = 'none';

  // Créer les numéros de page
  for (let i = 1; i <= totalPages; i++) {
    const pageElement = pageNumberTemplate.cloneNode(true);
    pageElement.style.display = '';
    pageElement.textContent = i;
    
    if (i === currentPage) {
      pageElement.classList.add('active');
    } else {
      pageElement.classList.remove('active');
    }
    
    parent.appendChild(pageElement);
  }

  // Masquer la pagination si une seule page ou aucun élément
  if (totalPages <= 1) {
    paginationContainer.style.display = 'none';
  } else {
    paginationContainer.style.display = '';
  }

  // Afficher les éléments de la page actuelle
  displayPage(currentPage, limit);

  // Mettre à jour l'état des boutons prev/next
  updatePrevNextButtons();
}

function goToPage(page, limit) {
  currentPage = page;
  displayPage(page, limit);
  updatePaginationUI();
}

function displayPage(page, limit) {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  visibleItems.forEach((item, index) => {
    const el = item.closest('[wn-collection-element]');
    if (!el) return;

    if (index >= startIndex && index < endIndex) {
      el.classList.remove('wn-fully-hidden');
      el.classList.remove('wn-hidden');
    } else {
      el.classList.add('wn-fully-hidden');
    }
  });
}

function updatePaginationUI() {
  const paginationContainer = document.querySelector('[wn-collection-pagination]');
  if (!paginationContainer) return;

  const pageNumbers = paginationContainer.querySelectorAll('[wn-pagination-number]');
  pageNumbers.forEach(pageNum => {
    if (pageNum.style.display === 'none') return; // Skip template
    
    const pageValue = parseInt(pageNum.textContent);
    if (pageValue === currentPage) {
      pageNum.classList.add('active');
    } else {
      pageNum.classList.remove('active');
    }
  });

  // Mettre à jour les boutons prev/next
  updatePrevNextButtons();
}

function updatePrevNextButtons() {
  const collection = document.querySelector('[wn-filter="list"]');
  if (!collection) return;

  const paginationLimit = parseInt(collection.getAttribute('wn-filter-pagination')) || 0;
  const totalPages = Math.ceil(visibleItems.length / paginationLimit);

  const prevButton = document.querySelector('[wn-pagination-prev]');
  const nextButton = document.querySelector('[wn-pagination-next]');

  // Désactiver le bouton précédent si on est sur la première page
  if (prevButton) {
    if (currentPage <= 1) {
      prevButton.classList.add('disabled');
      prevButton.style.pointerEvents = 'none';
      prevButton.style.opacity = '0.5';
    } else {
      prevButton.classList.remove('disabled');
      prevButton.style.pointerEvents = '';
      prevButton.style.opacity = '';
    }
  }

  // Désactiver le bouton suivant si on est sur la dernière page
  if (nextButton) {
    if (currentPage >= totalPages) {
      nextButton.classList.add('disabled');
      nextButton.style.pointerEvents = 'none';
      nextButton.style.opacity = '0.5';
    } else {
      nextButton.classList.remove('disabled');
      nextButton.style.pointerEvents = '';
      nextButton.style.opacity = '';
    }
  }
}

function applyFilters(items, filterForms, initial = false, hasPagination = false, paginationLimit = 0) {
  console.log('applyFilters called', { itemsCount: items.length, initial, hasPagination, paginationLimit });
  
  // Récupérer la config de pagination depuis le DOM si non fournie
  if (!hasPagination) {
    const collection = document.querySelector('[wn-filter="list"]');
    if (collection) {
      paginationLimit = parseInt(collection.getAttribute('wn-filter-pagination')) || 0;
      hasPagination = paginationLimit > 0;
    }
  }
  
  // Masquer tout sauf si chargement initial
  if (!initial) {
    items.forEach((item) => {
      const el = item.closest('[wn-collection-element]');
      if (el) el.classList.add('wn-hidden');
    });
  }

  setTimeout(() => {
    // Collecter tous les filtres actifs groupés par identifier
    const activeFilters = {};
    filterForms.forEach((form) => {
      const fields = form.querySelectorAll('[wn-filter-field]');
      fields.forEach((field) => {
        const identifier = field.getAttribute('wn-filter-field');
        const parent = field.closest('label') || field.parentElement;
        const input = parent.querySelector('input[type="checkbox"], input[type="radio"]');
        const select = parent.querySelector('select');

        // Checkbox/Radio cochés
        if (input && input.checked) {
          const filterValue = field.textContent.trim().toLowerCase();
          if (!activeFilters[identifier]) {
            activeFilters[identifier] = [];
          }
          activeFilters[identifier].push(filterValue);
        }

        // Select avec valeur
        if (select && select.value && select.value !== '') {
          const selectedOption = select.options[select.selectedIndex];
          const filterValue = selectedOption.textContent.trim().toLowerCase();
          if (!activeFilters[identifier]) {
            activeFilters[identifier] = [];
          }
          activeFilters[identifier].push(filterValue);
        }
      });
    });

    const hasActiveFilters = Object.keys(activeFilters).length > 0;
    console.log('Active filters:', activeFilters);

    // Collecter les éléments visibles après filtrage
    const filteredItems = [];

    // Appliquer les filtres à chaque élément
    items.forEach((item) => {
      let visible = true;

      // Si aucun filtre actif, tout afficher
      if (!hasActiveFilters) {
        visible = true;
      } else {
        // Récupérer tous les champs de l'élément de collection parent
        const collectionElement = item.closest('[wn-collection-element]');
        if (!collectionElement) {
          visible = false;
          return;
        }

        // Récupérer tous les champs filtrables de cet élément
        const itemFields = {};
        collectionElement.querySelectorAll('[wn-filter-field]').forEach((field) => {
          const fieldName = field.getAttribute('wn-filter-field');
          const fieldValue = field.textContent.trim().toLowerCase();
          itemFields[fieldName] = fieldValue;
        });

        console.log('Item fields:', itemFields);

        // Pour chaque catégorie de filtre actif, vérifier si l'élément correspond
        for (const [identifier, filterValues] of Object.entries(activeFilters)) {
          const itemValue = itemFields[identifier];

          // Si l'élément n'a pas ce champ, il ne correspond pas
          if (!itemValue) {
            console.log('Item missing field:', identifier);
            visible = false;
            break;
          }

          // Vérifier si la valeur correspond à AU MOINS UN filtre actif de cette catégorie
          const matches = filterValues.includes(itemValue);
          console.log('Checking item:', { identifier, itemValue, filterValues, matches });
          
          if (!matches) {
            visible = false;
            break; // Si un champ ne correspond pas, l'item est masqué
          }
        }
      }

      const el = item.closest('[wn-collection-element]');
      if (!el) return;

      console.log('Final visibility:', { visible, itemText: item.textContent.trim().substring(0, 30) });

      if (visible) {
        filteredItems.push(item);
        
        // Si pas de pagination, afficher directement
        if (!hasPagination) {
          el.classList.remove('wn-fully-hidden');
          if (!initial) {
            void el.offsetWidth; // force reflow
          }
          el.classList.remove('wn-hidden');
        }
      } else {
        el.classList.add('wn-fully-hidden');
      }
    });

    // Si pagination activée, mettre à jour la pagination avec les éléments filtrés
    if (hasPagination) {
      console.log('Updating pagination with', filteredItems.length, 'items');
      currentPage = 1; // Réinitialiser à la page 1 après filtrage
      updatePagination(filteredItems, paginationLimit);
    }
  }, initial ? 0 : 250);
}

function clearFilters(items, filterForms, hasPagination = false, paginationLimit = 0) {
  filterForms.forEach((form) => {
    const fields = form.querySelectorAll('[wn-filter-field]');
    fields.forEach((field) => {
      const parent = field.closest('label') || field.parentElement;
      const input = parent.querySelector('input[type="checkbox"], input[type="radio"]');
      const select = parent.querySelector('select');
      
      if (input) input.checked = false;
      if (select) select.selectedIndex = 0; // Réinitialiser au premier élément (généralement le placeholder)
    });
  });

  applyFilters(items, filterForms, false, hasPagination, paginationLimit);
}