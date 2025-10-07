document.addEventListener('DOMContentLoaded', handleCollectionFiltersPagination);

let allElements = []; // Stocke tous les éléments HTML de toutes les pages
let filteredElements = []; // Éléments après application des filtres
let currentPage = 1;
let itemsPerPage = 10; // Valeur par défaut
let isLoading = false;
let collectionConfig = null; // Configuration de la collection
let originalTemplate = null; // Template original sauvegardé

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
  // Vérifier s'il y a des filtres dans l'URL ou des formulaires de filtres
  const urlParams = new URLSearchParams(window.location.search);
  const hasUrlFilters = Array.from(urlParams.keys()).some(key => key.startsWith('filter_'));
  const hasFilterForms = document.querySelectorAll('[wn-filter="filter"]').length > 0;
  
  // Si aucun filtre n'est présent, ne pas activer le système de filtres
  if (!hasUrlFilters && !hasFilterForms) {
    console.log('Aucun filtre détecté, système de filtres désactivé');
    return;
  }

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
  `;
  document.head.appendChild(style);

  // Trouver la collection avec filtres
  const collection = document.querySelector('[wn-filter="list"]');
  if (!collection) return;

  // Attendre que la collection soit chargée
  if (window.location.hostname.includes('webflow.io')) {
    await waitForCollectionBox(collection);
  }

  // Récupérer la configuration depuis l'attribut wn-collection-wrapper
  const collectionWrapper = collection.closest('[wn-collection-wrapper]') || collection;
  const encodedData = collectionWrapper.getAttribute('wn-collection-wrapper');
  
  if (!encodedData) {
    console.error('Configuration de collection manquante');
    return;
  }

  try {
    collectionConfig = JSON.parse(atob(encodedData));
    itemsPerPage = collectionConfig.itemsPerPage || collectionConfig.limit || 10;
    
    // Sauvegarder le template original avant qu'il ne soit supprimé
    const template = collection.querySelector('[wn-collection-box]');
    if (template) {
      originalTemplate = template.cloneNode(true);
    }

  } catch (error) {
    console.error('Erreur lors du décodage de la configuration:', error);
    return;
  }

  // Attendre que collection-loader.js termine le chargement de la page actuelle
  await waitForCollectionLoaded(collection);

  // Récupérer les éléments de la page actuelle
  collectCurrentPageElements();

  // Charger les éléments des autres pages
  await loadAllPagesElements();

  // Initialiser les filtres depuis l'URL
  initializeFiltersFromURL();

  // Configurer les événements de filtres
  setupFilterEvents();

  // Appliquer les filtres initiaux
  await applyFiltersAndPagination(true);

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

// Attendre que collection-loader.js termine le chargement
async function waitForCollectionLoaded(collection) {
  return new Promise((resolve) => {
    const checkLoaded = () => {
      const marker = collection.querySelector('.ssr-wn-collection-box');
      if (marker && marker.getAttribute('data-collection-processed') === 'true') {
        resolve();
      } else {
        setTimeout(checkLoaded, 100);
      }
    };
    checkLoaded();
  });
}

// Récupérer les éléments de la page actuelle
function collectCurrentPageElements() {
  const collection = document.querySelector('[wn-filter="list"]');
  if (!collection) return;

  const currentElements = Array.from(collection.querySelectorAll('[wn-collection-element]'));
  currentElements.forEach(element => {
    element.setAttribute('data-original-page', '1');
    allElements.push(element.cloneNode(true));
  });
  
  console.log(`Collecté ${currentElements.length} éléments de la page actuelle`);
}

// Charger les éléments HTML des autres pages
async function loadAllPagesElements() {
  if (isLoading) return;
  isLoading = true;

  try {
    // Détecter s'il y a d'autres pages à charger
    const paginationWrapper = document.querySelector('[wn-collection-pagination]');
    if (!paginationWrapper) {
      console.log('Pas de pagination détectée');
      isLoading = false;
      return;
    }

    // Compter le nombre de pages depuis les liens de pagination
    const pageLinks = paginationWrapper.querySelectorAll('[wn-pagination-number]:not([style*="display: none"])');
    const totalPages = pageLinks.length;
    
    if (totalPages <= 1) {
      console.log('Une seule page détectée');
      isLoading = false;
      return;
    }

    console.log(`Chargement de ${totalPages - 1} pages supplémentaires...`);

    // Charger chaque page supplémentaire
    for (let pageNum = 2; pageNum <= totalPages; pageNum++) {
      await loadPageElements(pageNum);
    }

  } catch (error) {
    console.error('Erreur lors du chargement des pages:', error);
  } finally {
    isLoading = false;
  }
}

// Charger les éléments d'une page spécifique
async function loadPageElements(pageNumber) {
  try {
    // Construire l'URL de la page
    const currentURL = new URL(window.location);
    currentURL.searchParams.set('page', pageNumber.toString());
    
    console.log(`Chargement de la page ${pageNumber}...`);
    
    const response = await fetch(currentURL.toString());
    const html = await response.text();
    
    // Parser le HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Extraire les éléments de collection de cette page
    const pageElements = Array.from(doc.querySelectorAll('[wn-filter="list"] [wn-collection-element]'));
    
    pageElements.forEach(element => {
      const clonedElement = element.cloneNode(true);
      clonedElement.setAttribute('data-original-page', pageNumber.toString());
      allElements.push(clonedElement);
    });
    
    console.log(`Page ${pageNumber}: ${pageElements.length} éléments collectés`);
    
  } catch (error) {
    console.error(`Erreur lors du chargement de la page ${pageNumber}:`, error);
  }
}

// Cette fonction n'est plus nécessaire car nous chargeons directement toutes les données via l'API

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
        // Gérer les checkboxes et radio buttons
        const parent = field.closest('label') || field.parentElement;
        const input = parent.querySelector('input[type="checkbox"], input[type="radio"]');
        if (input && field.textContent.trim().toLowerCase() === filterValue.toLowerCase()) {
          input.checked = true;
        }
        
        // Gérer les selects
        const select = parent.querySelector('select') || field.closest('select');
        if (select) {
          const options = select.querySelectorAll('option');
          options.forEach(option => {
            if (option.textContent.trim().toLowerCase() === filterValue.toLowerCase() ||
                option.value.toLowerCase() === filterValue.toLowerCase()) {
              select.value = option.value;
            }
          });
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
      
      // Gérer les checkboxes et radio buttons
      const input = parent.querySelector('input[type="checkbox"], input[type="radio"]');
      if (input) {
        input.addEventListener('change', () => {
          updateURLFilters();
          applyFiltersAndPagination();
        });
      }
      
      // Gérer les selects
      const select = parent.querySelector('select') || field.closest('select');
      if (select) {
        select.addEventListener('change', () => {
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
      
      // Gérer les checkboxes et radio buttons
      const input = parent.querySelector('input[type="checkbox"], input[type="radio"]');
      if (input && input.checked) {
        const filterValue = field.textContent.trim();
        url.searchParams.set(`filter_${identifier}`, filterValue);
      }
      
      // Gérer les selects
      const select = parent.querySelector('select') || field.closest('select');
      if (select && select.value && select.value !== '' && select.value !== 'default') {
        // Utiliser le texte de l'option sélectionnée
        const selectedOption = select.options[select.selectedIndex];
        const filterValue = selectedOption ? selectedOption.textContent.trim() : select.value;
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

async function applyFiltersAndPagination(initial = false) {
  // Appliquer les filtres sur tous les éléments HTML
  const filterForms = document.querySelectorAll('[wn-filter="filter"]');
  
  filteredElements = allElements.filter(element => {
    let visible = true;
    
    filterForms.forEach((form) => {
      const fields = form.querySelectorAll('[wn-filter-field]');
      fields.forEach((field) => {
        const identifier = field.getAttribute('wn-filter-field');
        const parent = field.closest('label') || field.parentElement;
        
        // Gérer les checkboxes et radio buttons
        const input = parent.querySelector('input[type="checkbox"], input[type="radio"]');
        if (input && input.checked) {
          const filterValue = field.textContent.trim().toLowerCase();
          
          // Chercher l'élément correspondant dans l'élément HTML
          const elementFilterField = element.querySelector(`[wn-filter-field="${identifier}"]`);
          if (elementFilterField) {
            const elementValue = elementFilterField.textContent.trim().toLowerCase();
            if (elementValue !== filterValue) {
              visible = false;
            }
          }
        }
        
        // Gérer les selects
        const select = parent.querySelector('select') || field.closest('select');
        if (select && select.value && select.value !== '' && select.value !== 'default') {
          const selectedOption = select.options[select.selectedIndex];
          const filterValue = selectedOption ? selectedOption.textContent.trim().toLowerCase() : select.value.toLowerCase();
          
          // Chercher l'élément correspondant dans l'élément HTML
          const elementFilterField = element.querySelector(`[wn-filter-field="${identifier}"]`);
          if (elementFilterField) {
            const elementValue = elementFilterField.textContent.trim().toLowerCase();
            if (elementValue !== filterValue) {
              visible = false;
            }
          }
        }
      });
    });
    
    return visible;
  });
  
  console.log(`Filtres appliqués: ${filteredElements.length}/${allElements.length} éléments`);
  
  // Calculer la pagination
  const totalPages = Math.ceil(filteredElements.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPageElements = filteredElements.slice(startIndex, endIndex);
  
  // Afficher les éléments de la page actuelle
  displayFilteredElements(currentPageElements, initial);
  
  // Mettre à jour les contrôles de pagination existants
  updateExistingPaginationControls();
}

// Fonction pour aller à une page spécifique
function goToPage(pageNumber) {
  const totalPages = Math.ceil(filteredElements.length / itemsPerPage);
  if (pageNumber < 1 || pageNumber > totalPages) {
    return;
  }
  
  currentPage = pageNumber;
  
  // Mettre à jour l'URL
  const url = new URL(window.location);
  if (pageNumber === 1) {
    url.searchParams.delete('page');
  } else {
    url.searchParams.set('page', pageNumber.toString());
  }
  window.history.pushState({}, '', url.toString());
  
  // Réappliquer les filtres et la pagination
  applyFiltersAndPagination();
  
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
      
      // Réinitialiser les checkboxes et radio buttons
      const input = parent.querySelector('input[type="checkbox"], input[type="radio"]');
      if (input) input.checked = false;
      
      // Réinitialiser les selects
      const select = parent.querySelector('select') || field.closest('select');
      if (select) {
        select.selectedIndex = 0; // Sélectionner la première option (généralement vide ou "Tous")
      }
    });
  });
  
  // Nettoyer l'URL
  const url = new URL(window.location);
  Array.from(url.searchParams.keys()).forEach(key => {
    if (key.startsWith('filter_')) {
      url.searchParams.delete(key);
    }
  });
  url.searchParams.delete('page'); // Revenir à la page 1
  window.history.pushState({}, '', url.toString());
  
  currentPage = 1;
  applyFiltersAndPagination();
}

// Fonction pour afficher les éléments filtrés
function displayFilteredElements(elementsToShow, initial = false) {
  const collection = document.querySelector('[wn-filter="list"]');
  if (!collection) return;
  
  // Masquer tous les éléments existants avec animation
  if (!initial) {
    const existingElements = collection.querySelectorAll('[wn-collection-element]');
    existingElements.forEach(el => el.classList.add('wn-hidden'));
    
    // Attendre la fin de l'animation avant de continuer
    setTimeout(() => {
      replaceCollectionElements(collection, elementsToShow);
    }, 250);
  } else {
    replaceCollectionElements(collection, elementsToShow);
  }
}

// Fonction pour remplacer les éléments de la collection
function replaceCollectionElements(collection, newElements) {
  // Supprimer tous les éléments de collection existants
  const existingElements = collection.querySelectorAll('[wn-collection-element]');
  existingElements.forEach(el => el.remove());
  
  // Restaurer le template s'il n'existe plus
  if (!collection.querySelector('[wn-collection-box]') && originalTemplate) {
    collection.appendChild(originalTemplate.cloneNode(true));
  }
  
  // Ajouter les nouveaux éléments filtrés
  newElements.forEach(element => {
    const clonedElement = element.cloneNode(true);
    // S'assurer que l'élément a les bonnes classes pour les animations
    clonedElement.classList.remove('wn-hidden');
    clonedElement.classList.add('wn-animate');
    collection.appendChild(clonedElement);
  });
  
  console.log(`Affichage de ${newElements.length} éléments sur la page ${currentPage}`);
}

// Cette fonction n'est plus nécessaire car nous utilisons les éléments HTML déjà générés

// Fonction pour mettre à jour les contrôles de pagination existants
function updateExistingPaginationControls() {
  const totalPages = Math.ceil(filteredElements.length / itemsPerPage);
  const paginationWrapper = document.querySelector('[wn-collection-pagination]');
  
  if (!paginationWrapper || totalPages <= 1) {
    if (paginationWrapper) paginationWrapper.style.display = 'none';
    return;
  }
  
  paginationWrapper.style.display = '';
  
  const buildHref = (pageNumber) => {
    const url = new URL(window.location.href);
    if (pageNumber === 1) {
      url.searchParams.delete('page');
    } else {
      url.searchParams.set('page', String(pageNumber));
    }
    const qs = url.searchParams.toString();
    return url.pathname + (qs ? `?${qs}` : '');
  };

  // Mettre à jour les liens précédent/suivant
  const prevEl = paginationWrapper.querySelector('[wn-pagination-prev]');
  const nextEl = paginationWrapper.querySelector('[wn-pagination-next]');
  
  if (prevEl) {
    const prevPage = Math.max(1, currentPage - 1);
    prevEl.setAttribute('href', currentPage === 1 ? '#' : buildHref(prevPage));
    
    // Ajouter event listener pour navigation via filtres
    prevEl.onclick = (e) => {
      if (currentPage > 1) {
        e.preventDefault();
        goToPage(currentPage - 1);
      }
    };
    
    if (currentPage === 1) {
      prevEl.setAttribute('aria-disabled', 'true');
      prevEl.classList.add('disabled');
    } else {
      prevEl.removeAttribute('aria-disabled');
      prevEl.classList.remove('disabled');
    }
  }
  
  if (nextEl) {
    const nextPage = Math.min(totalPages, currentPage + 1);
    nextEl.setAttribute('href', currentPage >= totalPages ? '#' : buildHref(nextPage));
    
    // Ajouter event listener pour navigation via filtres
    nextEl.onclick = (e) => {
      if (currentPage < totalPages) {
        e.preventDefault();
        goToPage(currentPage + 1);
      }
    };
    
    if (currentPage >= totalPages) {
      nextEl.setAttribute('aria-disabled', 'true');
      nextEl.classList.add('disabled');
    } else {
      nextEl.removeAttribute('aria-disabled');
      nextEl.classList.remove('disabled');
    }
  }

  // Mettre à jour les numéros de pages
  const numberTpl = paginationWrapper.querySelector('[wn-pagination-number]');
  if (numberTpl && numberTpl.parentNode) {
    paginationWrapper.querySelectorAll('[data-generated="true"]').forEach(n => n.remove());

    for (let i = 1; i <= totalPages; i++) {
      const clone = numberTpl.cloneNode(true);
      clone.setAttribute('data-generated', 'true');
      clone.setAttribute('href', buildHref(i));
      clone.textContent = String(i);
      
      // Ajouter event listener pour navigation via filtres
      clone.onclick = (e) => {
        e.preventDefault();
        goToPage(i);
      };
      
      if (i === currentPage) clone.classList.add('active');
      else clone.classList.remove('active');
      numberTpl.parentNode.appendChild(clone);
    }
    numberTpl.style.display = 'none';
  }
  
  console.log(`Pagination mise à jour: page ${currentPage}/${totalPages} (${filteredElements.length} éléments)`);
}

// Gérer les changements d'historique (boutons précédent/suivant du navigateur)
window.addEventListener('popstate', () => {
  initializeFiltersFromURL();
  applyFiltersAndPagination();
});
