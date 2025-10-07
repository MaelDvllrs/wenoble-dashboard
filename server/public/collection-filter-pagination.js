document.addEventListener('DOMContentLoaded', handleCollectionFiltersPagination);

let allItems = []; // Stocke tous les éléments de toutes les pages
let filteredItems = []; // Éléments après application des filtres
let currentPage = 1;
let itemsPerPage = 10; // Valeur par défaut
let isLoading = false;

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

async function handleCollectionFiltersPagination() {
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

    .wn-pagination-loading {
      opacity: 0.5;
      pointer-events: none;
    }

    .wn-pagination-controls {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 10px;
      margin: 20px 0;
    }

    .wn-pagination-btn {
      padding: 8px 12px;
      border: 1px solid #ddd;
      background: white;
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.2s;
    }

    .wn-pagination-btn:hover {
      background: #f5f5f5;
    }

    .wn-pagination-btn.active {
      background: #007bff;
      color: white;
      border-color: #007bff;
    }

    .wn-pagination-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .wn-pagination-info {
      margin: 0 15px;
      font-size: 14px;
      color: #666;
    }
  `;
  document.head.appendChild(style);

  const collection = document.querySelector('[wn-filter="list"]');
  if (!collection) return;

  if (window.location.hostname.includes('webflow.io')) {
    await waitForCollectionBox(collection);
  }

  // Obtenir la limite de pagination depuis l'attribut ou par défaut
  const paginationLimit = collection.getAttribute('wn-pagination-limit');
  if (paginationLimit) {
    itemsPerPage = parseInt(paginationLimit, 10) || 10;
  }

  // Charger tous les éléments de toutes les pages
  await loadAllItems();

  // Initialiser les filtres depuis l'URL
  initializeFiltersFromURL();

  // Configurer les événements de filtres
  setupFilterEvents();

  // Appliquer les filtres initiaux
  applyFiltersAndPagination(true);

  // Créer les contrôles de pagination
  createPaginationControls();

  // Activer les animations après initialisation
  setTimeout(() => {
    document
      .querySelectorAll('[wn-collection-element]')
      .forEach((el) => {
        el.classList.remove('wn-no-animation');
        el.classList.add('wn-animate');
      });
  }, 50);
}

async function loadAllItems() {
  if (isLoading) return;
  isLoading = true;

  try {
    // Charger la page actuelle
    const currentPageItems = Array.from(
      document.querySelectorAll('[wn-filter-field]')
    );
    
    allItems = [...currentPageItems];

    // Détecter s'il y a plus de pages à charger
    const paginationWrapper = document.querySelector('[wn-pagination="wrapper"]');
    if (!paginationWrapper) {
      isLoading = false;
      return;
    }

    const nextButton = paginationWrapper.querySelector('[wn-pagination="next"]');
    const pageButtons = paginationWrapper.querySelectorAll('[wn-pagination="page"]');
    
    if (pageButtons.length > 1) {
      // Il y a plusieurs pages, charger toutes les autres
      for (let i = 2; i <= pageButtons.length; i++) {
        await loadPageItems(i);
      }
    }
  } catch (error) {
    console.error('Erreur lors du chargement des éléments:', error);
  } finally {
    isLoading = false;
  }
}

async function loadPageItems(pageNumber) {
  try {
    // Construire l'URL de la page
    const currentURL = new URL(window.location);
    const pageParam = currentURL.searchParams.get('page') || '1';
    
    // Remplacer ou ajouter le paramètre de page
    const pageURL = new URL(window.location);
    pageURL.searchParams.set('page', pageNumber.toString());
    
    const response = await fetch(pageURL.toString());
    const html = await response.text();
    
    // Parser le HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Extraire les éléments de la page
    const pageItems = Array.from(
      doc.querySelectorAll('[wn-filter-field]')
    );
    
    // Cloner les éléments avec leurs parents complets
    pageItems.forEach(item => {
      const element = item.closest('[wn-collection-element]');
      if (element) {
        const clonedElement = element.cloneNode(true);
        const clonedItem = clonedElement.querySelector('[wn-filter-field]');
        if (clonedItem) {
          // Marquer comme provenant d'une autre page
          clonedItem.setAttribute('data-original-page', pageNumber.toString());
          allItems.push(clonedItem);
        }
      }
    });
    
  } catch (error) {
    console.error(`Erreur lors du chargement de la page ${pageNumber}:`, error);
  }
}

function initializeFiltersFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  
  // Récupérer la page actuelle
  currentPage = parseInt(urlParams.get('page') || '1', 10);
  
  // Appliquer les filtres depuis l'URL
  const filterForms = document.querySelectorAll('[wn-filter="filter"]');
  filterForms.forEach((form) => {
    const fields = form.querySelectorAll('[wn-filter-field]');
    fields.forEach((field) => {
      const identifier = field.getAttribute('wn-filter-field');
      const filterValue = urlParams.get(`filter_${identifier}`);
      
      if (filterValue) {
        const parent = field.closest('label') || field.parentElement;
        const input = parent.querySelector('input[type="checkbox"], input[type="radio"]');
        if (input && field.textContent.trim().toLowerCase() === filterValue.toLowerCase()) {
          input.checked = true;
        }
      }
    });
  });
}

function setupFilterEvents() {
  const filterForms = document.querySelectorAll('[wn-filter="filter"]');
  
  filterForms.forEach((form) => {
    const fields = form.querySelectorAll('[wn-filter-field]');
    fields.forEach((field) => {
      const parent = field.closest('label') || field.parentElement;
      const input = parent.querySelector('input[type="checkbox"], input[type="radio"]');
      if (input) {
        input.addEventListener('change', () => {
          updateURLFilters();
          applyFiltersAndPagination();
        });
      }
    });
  });

  // Bouton pour réinitialiser les filtres
  const clearButton = document.querySelector('[wn-filter="clear"]');
  if (clearButton) {
    clearButton.addEventListener('click', () => {
      clearFilters();
    });
  }
}

function updateURLFilters() {
  const url = new URL(window.location);
  const filterForms = document.querySelectorAll('[wn-filter="filter"]');
  
  // Supprimer tous les anciens filtres
  Array.from(url.searchParams.keys()).forEach(key => {
    if (key.startsWith('filter_')) {
      url.searchParams.delete(key);
    }
  });
  
  // Ajouter les nouveaux filtres
  filterForms.forEach((form) => {
    const fields = form.querySelectorAll('[wn-filter-field]');
    fields.forEach((field) => {
      const identifier = field.getAttribute('wn-filter-field');
      const parent = field.closest('label') || field.parentElement;
      const input = parent.querySelector('input[type="checkbox"], input[type="radio"]');
      
      if (input && input.checked) {
        const filterValue = field.textContent.trim();
        url.searchParams.set(`filter_${identifier}`, filterValue);
      }
    });
  });
  
  // Réinitialiser à la page 1 lors d'un changement de filtre
  url.searchParams.set('page', '1');
  currentPage = 1;
  
  // Mettre à jour l'URL sans recharger la page
  window.history.pushState({}, '', url.toString());
}

function applyFiltersAndPagination(initial = false) {
  // Appliquer les filtres sur tous les éléments
  const filterForms = document.querySelectorAll('[wn-filter="filter"]');
  
  filteredItems = allItems.filter(item => {
    let visible = true;
    
    filterForms.forEach((form) => {
      const fields = form.querySelectorAll('[wn-filter-field]');
      fields.forEach((field) => {
        const identifier = field.getAttribute('wn-filter-field');
        const parent = field.closest('label') || field.parentElement;
        const input = parent.querySelector('input[type="checkbox"], input[type="radio"]');
        
        if (input && input.checked) {
          const filterValue = field.textContent.trim().toLowerCase();
          const itemValue = item.textContent.trim().toLowerCase();
          const itemField = item.getAttribute('wn-filter-field');
          
          if (itemField === identifier && itemValue !== filterValue) {
            visible = false;
          }
        }
      });
    });
    
    return visible;
  });
  
  // Appliquer la pagination
  displayPaginatedItems(initial);
  updatePaginationControls();
}

function displayPaginatedItems(initial = false) {
  // Masquer tous les éléments actuellement visibles
  if (!initial) {
    document.querySelectorAll('[wn-collection-element]').forEach(el => {
      el.classList.add('wn-hidden');
    });
  }
  
  setTimeout(() => {
    // Masquer tous les éléments
    document.querySelectorAll('[wn-collection-element]').forEach(el => {
      el.classList.add('wn-fully-hidden');
    });
    
    // Calculer les éléments à afficher pour la page actuelle
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const itemsToShow = filteredItems.slice(startIndex, endIndex);
    
    // Afficher les éléments de la page actuelle
    itemsToShow.forEach(item => {
      const element = item.closest('[wn-collection-element]');
      if (element) {
        // Si l'élément provient d'une autre page, l'insérer dans le DOM
        const originalPage = item.getAttribute('data-original-page');
        if (originalPage && originalPage !== '1') {
          const collection = document.querySelector('[wn-filter="list"]');
          const clonedElement = element.cloneNode(true);
          collection.appendChild(clonedElement);
          
          clonedElement.classList.remove('wn-fully-hidden');
          if (!initial) {
            void clonedElement.offsetWidth; // force reflow
          }
          clonedElement.classList.remove('wn-hidden');
        } else {
          element.classList.remove('wn-fully-hidden');
          if (!initial) {
            void element.offsetWidth; // force reflow
          }
          element.classList.remove('wn-hidden');
        }
      }
    });
    
  }, initial ? 0 : 250);
}

function createPaginationControls() {
  // Supprimer les anciens contrôles s'ils existent
  const existingControls = document.querySelector('.wn-pagination-controls');
  if (existingControls) {
    existingControls.remove();
  }
  
  const collection = document.querySelector('[wn-filter="list"]');
  if (!collection) return;
  
  const controlsWrapper = document.createElement('div');
  controlsWrapper.className = 'wn-pagination-controls';
  
  collection.parentNode.insertBefore(controlsWrapper, collection.nextSibling);
  
  updatePaginationControls();
}

function updatePaginationControls() {
  const controlsWrapper = document.querySelector('.wn-pagination-controls');
  if (!controlsWrapper) return;
  
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  
  if (totalPages <= 1) {
    controlsWrapper.style.display = 'none';
    return;
  }
  
  controlsWrapper.style.display = 'flex';
  controlsWrapper.innerHTML = '';
  
  // Bouton Précédent
  const prevBtn = document.createElement('button');
  prevBtn.className = 'wn-pagination-btn';
  prevBtn.textContent = 'Précédent';
  prevBtn.disabled = currentPage === 1;
  prevBtn.addEventListener('click', () => goToPage(currentPage - 1));
  controlsWrapper.appendChild(prevBtn);
  
  // Numéros de pages
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, currentPage + 2);
  
  if (startPage > 1) {
    const firstBtn = createPageButton(1);
    controlsWrapper.appendChild(firstBtn);
    
    if (startPage > 2) {
      const ellipsis = document.createElement('span');
      ellipsis.textContent = '...';
      ellipsis.className = 'wn-pagination-info';
      controlsWrapper.appendChild(ellipsis);
    }
  }
  
  for (let i = startPage; i <= endPage; i++) {
    const pageBtn = createPageButton(i);
    controlsWrapper.appendChild(pageBtn);
  }
  
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const ellipsis = document.createElement('span');
      ellipsis.textContent = '...';
      ellipsis.className = 'wn-pagination-info';
      controlsWrapper.appendChild(ellipsis);
    }
    
    const lastBtn = createPageButton(totalPages);
    controlsWrapper.appendChild(lastBtn);
  }
  
  // Bouton Suivant
  const nextBtn = document.createElement('button');
  nextBtn.className = 'wn-pagination-btn';
  nextBtn.textContent = 'Suivant';
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.addEventListener('click', () => goToPage(currentPage + 1));
  controlsWrapper.appendChild(nextBtn);
  
  // Info de pagination
  const info = document.createElement('div');
  info.className = 'wn-pagination-info';
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, filteredItems.length);
  info.textContent = `${startItem}-${endItem} sur ${filteredItems.length}`;
  controlsWrapper.appendChild(info);
}

function createPageButton(pageNumber) {
  const btn = document.createElement('button');
  btn.className = `wn-pagination-btn ${pageNumber === currentPage ? 'active' : ''}`;
  btn.textContent = pageNumber.toString();
  btn.addEventListener('click', () => goToPage(pageNumber));
  return btn;
}

function goToPage(pageNumber) {
  if (pageNumber < 1 || pageNumber > Math.ceil(filteredItems.length / itemsPerPage)) {
    return;
  }
  
  currentPage = pageNumber;
  
  // Mettre à jour l'URL
  const url = new URL(window.location);
  url.searchParams.set('page', pageNumber.toString());
  window.history.pushState({}, '', url.toString());
  
  // Afficher la nouvelle page
  displayPaginatedItems();
  updatePaginationControls();
  
  // Faire défiler vers le haut de la collection
  const collection = document.querySelector('[wn-filter="list"]');
  if (collection) {
    collection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function clearFilters() {
  const filterForms = document.querySelectorAll('[wn-filter="filter"]');
  
  filterForms.forEach((form) => {
    const fields = form.querySelectorAll('[wn-filter-field]');
    fields.forEach((field) => {
      const parent = field.closest('label') || field.parentElement;
      const input = parent.querySelector('input[type="checkbox"], input[type="radio"]');
      if (input) input.checked = false;
    });
  });
  
  // Nettoyer l'URL
  const url = new URL(window.location);
  Array.from(url.searchParams.keys()).forEach(key => {
    if (key.startsWith('filter_')) {
      url.searchParams.delete(key);
    }
  });
  url.searchParams.set('page', '1');
  window.history.pushState({}, '', url.toString());
  
  currentPage = 1;
  applyFiltersAndPagination();
}

// Gérer les changements d'historique (boutons précédent/suivant du navigateur)
window.addEventListener('popstate', () => {
  initializeFiltersFromURL();
  applyFiltersAndPagination();
});
