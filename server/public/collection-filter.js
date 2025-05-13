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
  `;
  document.head.appendChild(style);

  const collection = document.querySelector('[wn-filter="list"]');
  if (!collection) return;

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

  // Attacher les événements de filtre
  filterForms.forEach((form) => {
    const fields = form.querySelectorAll('[wn-filter-field]');
    fields.forEach((field) => {
      const parent = field.closest('label') || field.parentElement;
      const input = parent.querySelector('input[type="checkbox"], input[type="radio"]');
      if (input) {
        input.addEventListener('change', () =>
          applyFilters(itemsToFilter, filterForms)
        );
      }
    });
  });

  // Appliquer les filtres au démarrage (sans animation)
  applyFilters(itemsToFilter, filterForms, true);

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
    clearButton.addEventListener('click', () => clearFilters(itemsToFilter, filterForms));
  }
}

function applyFilters(items, filterForms, initial = false) {
  // Masquer tout sauf si chargement initial
  if (!initial) {
    items.forEach((item) => {
      const el = item.closest('[wn-collection-element]');
      if (el) el.classList.add('wn-hidden');
    });
  }

  setTimeout(() => {
    items.forEach((item) => {
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

      const el = item.closest('[wn-collection-element]');
      if (!el) return;

      if (visible) {
        el.classList.remove('wn-fully-hidden');
        if (!initial) {
          void el.offsetWidth; // force reflow
        }
        el.classList.remove('wn-hidden');
      } else {
        el.classList.add('wn-fully-hidden');
      }
    });
  }, initial ? 0 : 250);
}

function clearFilters(items, filterForms) {
  filterForms.forEach((form) => {
    const fields = form.querySelectorAll('[wn-filter-field]');
    fields.forEach((field) => {
      const parent = field.closest('label') || field.parentElement;
      const input = parent.querySelector('input[type="checkbox"], input[type="radio"]');
      if (input) input.checked = false;
    });
  });

  applyFilters(items, filterForms);
}