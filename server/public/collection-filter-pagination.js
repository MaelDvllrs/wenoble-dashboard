document.addEventListener('DOMContentLoaded', handleCollectionFiltersPagination);

let allCollectionData = []; // Stocke toutes les données de toutes les pages
let filteredData = []; // Données après application des filtres
let currentPage = 1;
let itemsPerPage = 10; // Valeur par défaut
let isLoading = false;
let collectionConfig = null; // Configuration de la collection
let apiUrl = "https://api-wenoble.wenoble.fr/";
let userKey = null;

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
    
    // Récupérer l'API key depuis le script tag
    const scriptTag = document.querySelector('script[data-user-id]');
    if (scriptTag) {
      userKey = scriptTag.getAttribute('data-user-id');
    }
    
    if (!userKey) {
      console.error('User Key manquant pour les filtres');
      return;
    }

  } catch (error) {
    console.error('Erreur lors du décodage de la configuration:', error);
    return;
  }

  // Charger toutes les données de toutes les pages
  await loadAllCollectionData();

  // Initialiser les filtres depuis l'URL
  initializeFiltersFromURL();

  // Configurer les événements de filtres
  setupFilterEvents();

  // Appliquer les filtres initiaux et regénérer la collection
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

async function loadAllCollectionData() {
  if (isLoading) return;
  isLoading = true;

  try {
    // Construire les paramètres de requête pour récupérer TOUTES les données
    const paramsObj = {
      order: collectionConfig.order,
      colone: collectionConfig.colone,
      joinTable: collectionConfig.joinTable,
      configs: JSON.stringify(collectionConfig.config)
    };
    
    // Ajouter les paramètres de tri si définis
    if (collectionConfig.sorts && Object.keys(collectionConfig.sorts).length > 0) {
      paramsObj.sorts = JSON.stringify(collectionConfig.sorts);
    }
    
    // Ajouter les filtres dynamiques si définis
    if (collectionConfig.filters && collectionConfig.filters.length > 0) {
      paramsObj.filters = JSON.stringify(collectionConfig.filters);
    }
    
    // Ne pas limiter le nombre d'éléments pour récupérer tout
    // paramsObj.limit sera omis pour récupérer tous les éléments
    
    const params = new URLSearchParams(paramsObj);

    const response = await fetch(`${apiUrl}/api/sendBlog?${params.toString()}`, {
      method: "GET",
      headers: {
        'api_key': userKey,
        'ids': collectionConfig.blogId,
      }
    });

    if (response.ok) {
      const data = await response.json();
      allCollectionData = Array.isArray(data?.blog) ? data.blog : [];
      console.log(`Chargé ${allCollectionData.length} éléments de collection pour les filtres`);
    } else {
      console.error('Erreur lors du chargement des données:', response.status);
      allCollectionData = [];
    }

  } catch (error) {
    console.error('Erreur lors du chargement des données de collection:', error);
    allCollectionData = [];
  } finally {
    isLoading = false;
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
  // Appliquer les filtres sur toutes les données
  const filterForms = document.querySelectorAll('[wn-filter="filter"]');
  
  filteredData = allCollectionData.filter(blog => {
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
          
          // Vérifier si cette valeur correspond aux données du blog
          if (!matchesFilter(blog, identifier, filterValue)) {
            visible = false;
          }
        }
        
        // Gérer les selects
        const select = parent.querySelector('select') || field.closest('select');
        if (select && select.value && select.value !== '' && select.value !== 'default') {
          const selectedOption = select.options[select.selectedIndex];
          const filterValue = selectedOption ? selectedOption.textContent.trim().toLowerCase() : select.value.toLowerCase();
          
          // Vérifier si cette valeur correspond aux données du blog
          if (!matchesFilter(blog, identifier, filterValue)) {
            visible = false;
          }
        }
      });
    });
    
    return visible;
  });
  
  // Calculer la pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPageData = filteredData.slice(startIndex, endIndex);
  
  // Regénérer la collection avec les données filtrées de la page actuelle
  await regenerateCollection(currentPageData, initial);
  
  // Mettre à jour les contrôles de pagination existants
  updateExistingPaginationControls();
}

// Fonction pour aller à une page spécifique
function goToPage(pageNumber) {
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
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

// Fonction pour vérifier si un blog correspond à un filtre
function matchesFilter(blog, identifier, filterValue) {
  // Cette fonction doit être adaptée selon la structure de vos données
  // et comment les champs de filtres correspondent aux données du blog
  
  // Exemples de correspondance basés sur des champs courants :
  switch (identifier) {
    case 'title':
      return blog.collection_element_name?.toLowerCase().includes(filterValue);
    case 'slug':
      return blog.collection_element_slug?.toLowerCase().includes(filterValue);
    case 'category':
      // Si vous avez des catégories dans vos données
      return blog.category?.toLowerCase() === filterValue;
    default:
      // Par défaut, chercher dans le nom de l'élément
      return blog.collection_element_name?.toLowerCase().includes(filterValue);
  }
}

// Fonction pour regénérer la collection avec les nouvelles données
async function regenerateCollection(pageData, initial = false) {
  const collection = document.querySelector('[wn-filter="list"]');
  if (!collection) return;
  
  // Masquer les éléments existants avec animation
  if (!initial) {
    const existingElements = collection.querySelectorAll('[wn-collection-element]');
    existingElements.forEach(el => el.classList.add('wn-hidden'));
    
    // Attendre la fin de l'animation avant de supprimer
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  
  // Supprimer tous les éléments générés précédemment
  const existingElements = collection.querySelectorAll('[wn-collection-element]');
  existingElements.forEach(el => el.remove());
  
  // Récupérer ou recréer le template
  let template = collection.querySelector('[wn-collection-box]');
  if (!template) {
    // Si le template a été supprimé, essayer de le récupérer depuis les données sauvegardées
    console.error('Template wn-collection-box manquant pour la régénération');
    return;
  }
  
  // Générer les nouveaux éléments avec les données filtrées
  for (const blog of pageData) {
    try {
      const clone = template.cloneNode(true);
      clone.removeAttribute("wn-collection-box");
      clone.setAttribute("wn-collection-element", "true");
      
      // Récupérer le contenu de ce blog
      const response = await fetch(`${apiUrl}/api/sendBlogContent`, {
        method: "GET",
        headers: {
          'api_key': userKey,
          'id_blog': blog.collection_id,
          'id_blog_page': blog.id,
        }
      });

      const data = await response.json();
      if (!data) continue;

      // Traiter tous les éléments wn-* dans le clone (logique similaire à collection-loader.js)
      await processCollectionElement(clone, blog, data);
      
      // Ajouter le clone au DOM
      collection.appendChild(clone);
      
    } catch (error) {
      console.error("Erreur lors de la génération de l'élément:", error);
    }
  }
  
  // Afficher les nouveaux éléments avec animation
  if (!initial) {
    const newElements = collection.querySelectorAll('[wn-collection-element]');
    newElements.forEach(el => {
      void el.offsetWidth; // force reflow
      el.classList.remove('wn-hidden');
    });
  }
}

// Fonction pour traiter un élément de collection (extraite de collection-loader.js)
async function processCollectionElement(clone, blog, data) {
  const urlVideoBucket = "https://xgwszpuiiacukrvvtrze.supabase.co/storage/v1/object/public/collection-video//";
  const urlGalleryBucket = "https://xgwszpuiiacukrvvtrze.supabase.co/storage/v1/object/public/collection-gallery//";
  
  function isWebflowPreview() {
    return window.location.hostname.includes("webflow.io");
  }
  
  function getDateFormatOptions(formatString) {
    const options = {};
    const formatArray = formatString.split(' ');
    formatArray.forEach(part => {
      switch (part.toLowerCase()) {
        case 'dd': options.day = '2-digit'; break;
        case 'mm': options.month = '2-digit'; break;
        case 'yyyy': options.year = 'numeric'; break;
        case 'yy': options.year = '2-digit'; break;
        case 'month': options.month = 'long'; break;
        case 'day': options.weekday = 'long'; break;
      }
    });
    return options;
  }
  
  const elementsToProcess = [...clone.querySelectorAll("[wn-title], [wn-link], [wn-id], [wn-for], [wn-date-published], [wn-image], [wn-richtext], [wn-text], [wn-input], [wn-gallery], [wn-gallery-index],[wn-gallery-modal], [wn-video], [wn-multiReference-wrapper], [wn-filter-field]")];
  
  for (const el of elementsToProcess) {
    if (el.hasAttribute("wn-title")) {
      el.textContent = blog.collection_element_name;
    }
    
    if (el.hasAttribute("wn-filter-field")) {
      const identifier = el.getAttribute("wn-filter-field");
      // Définir le contenu de l'élément de filtre selon l'identifiant
      switch (identifier) {
        case 'title':
          el.textContent = blog.collection_element_name;
          break;
        case 'slug':
          el.textContent = blog.collection_element_slug;
          break;
        case 'category':
          el.textContent = blog.category || '';
          break;
        default:
          el.textContent = blog.collection_element_name;
      }
    }

    if (el.hasAttribute("wn-link")) {
      const prelinkAttr = el.getAttribute("wn-link");
      const linkData = blog.collection_element_slug;
      
      if (linkData) {
        if (prelinkAttr.includes(',')) {
          const [normalPrelink, webflowPrelink] = prelinkAttr.split(',', 2).map(p => p.trim());
          if (isWebflowPreview()) {
            const webflowPath = webflowPrelink || 'template';
            el.href = `./${webflowPath}?slug=${linkData}`;
          } else {
            el.href = `/${normalPrelink}/${linkData}`;
          }
        } else {
          if (isWebflowPreview()) {
            el.href = `./template?slug=${linkData}`;
          } else {
            el.href = `/${prelinkAttr}/${linkData}`;
          }
        }
      }
    }

    if (el.hasAttribute("wn-date-published")) {
      const format = el.getAttribute("wn-date-published");
      const date = new Date(blog.collection_element_publish_date);
      let options;
      try {
        options = getDateFormatOptions(format);
      } catch (e) {
        options = { year: 'numeric', month: 'long', day: 'numeric' };
      }
      el.textContent = date.toLocaleDateString(undefined, options);
    }
    
    if (el.hasAttribute("wn-image")) {
      const key = el.getAttribute("wn-image");
      const imageData = data.content.image.find(img => img.id_config == key);
      if (imageData && imageData.url) {
        el.src = `${imageData.url}`;
        el.alt = imageData.alt_image;
      } else {
        el.style.display = "none"; 
      }
    }

    if (el.hasAttribute("wn-text")) {
      const key = el.getAttribute("wn-text");
      const textData = data.content.text.find(text => text.id_config == key);
      if (textData) {
        el.textContent = textData.text;
      } else {
        el.style.display = "none";
      }
    }
    
    // Ajouter d'autres traitements selon vos besoins...
  }
}

// Fonction pour mettre à jour les contrôles de pagination existants
function updateExistingPaginationControls() {
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
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
      if (i === currentPage) clone.classList.add('active');
      else clone.classList.remove('active');
      numberTpl.parentNode.appendChild(clone);
    }
    numberTpl.style.display = 'none';
  }
}

// Gérer les changements d'historique (boutons précédent/suivant du navigateur)
window.addEventListener('popstate', () => {
  initializeFiltersFromURL();
  applyFiltersAndPagination();
});
