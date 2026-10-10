(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  async function fetchSiteConfig() {
    const defaults = {
      name: 'Kajaria Shop',
      city: 'Roorkee',
      state: 'Uttarakhand',
      configured: false
    };

    try {
      const response = await fetch('/api/site-config');
      if (response.ok) return { ...defaults, ...(await response.json()) };
    } catch (error) {
      console.warn('Site settings could not be loaded:', error.message);
    }

    return defaults;
  }

  function applySiteConfig(config) {
    $$('[data-business-name]').forEach((element) => {
      element.textContent = config.name;
    });
    $$('[data-business-city]').forEach((element) => {
      element.textContent = config.city;
    });
    $$('[data-business-state]').forEach((element) => {
      element.textContent = config.state || '';
    });
    $$('[data-business-postal]').forEach((element) => {
      element.textContent = config.postalCode || '';
    });
    $$('[data-business-address]').forEach((element) => {
      element.textContent = config.address || 'Add the verified showroom address in your environment settings.';
    });
    $$('[data-business-phone]').forEach((element) => {
      if (config.phoneDisplay && config.phoneE164) {
        element.textContent = config.phoneDisplay;
        element.href = `tel:${config.phoneE164}`;
      } else {
        element.textContent = 'Phone number to be configured';
        element.removeAttribute('href');
      }
    });
    $$('[data-business-email]').forEach((element) => {
      if (config.email) {
        element.textContent = config.email;
        element.href = `mailto:${config.email}`;
      } else {
        element.textContent = 'Email to be configured';
        element.removeAttribute('href');
      }
    });
    $$('[data-business-hours]').forEach((element) => {
      element.textContent = config.hours || 'Please confirm showroom hours';
    });
    $$('[data-whatsapp]').forEach((element) => {
      if (config.whatsapp) {
        const message = encodeURIComponent('Hello, I would like to enquire about tile collections.');
        element.href = `https://wa.me/${config.whatsapp}?text=${message}`;
        element.classList.remove('hide');
      } else {
        element.classList.add('hide');
      }
    });
  }

  function setupNavigation() {
    const toggle = $('.menu-toggle');
    const navigation = $('.nav-links');
    if (!toggle || !navigation) return;

    toggle.addEventListener('click', () => {
      const isOpen = navigation.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
      toggle.textContent = isOpen ? '×' : '☰';
    });

    $$('a', navigation).forEach((link) => {
      link.addEventListener('click', () => {
        navigation.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.textContent = '☰';
      });
    });
  }

  function setupEnquiryForm() {
    const form = $('[data-enquiry-form]');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const message = $('.form-message', form);
      const submitButton = $('button[type="submit"]', form);
      const formData = Object.fromEntries(new FormData(form).entries());

      submitButton.disabled = true;
      submitButton.textContent = 'Sending…';
      message.textContent = '';
      message.className = 'form-message';

      try {
        const response = await fetch('/api/enquiries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        const result = await response.json();

        if (!response.ok) throw new Error(result.error || 'Could not send enquiry.');

        message.textContent = result.message;
        message.classList.add('success');
        form.reset();

        const interestField = $('[name="interest"]', form);
        const requestedInterest = new URLSearchParams(location.search).get('interest');
        if (interestField && requestedInterest) interestField.value = requestedInterest;
      } catch (error) {
        message.textContent = error.message || 'Something went wrong. Please try again.';
        message.classList.add('error');
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Send enquiry';
      }
    });
  }

  function setupTileCalculator() {
    const form = $('[data-calculator]');
    if (!form) return;

    function updateEstimate() {
      const length = Number($('#room-length', form).value) || 0;
      const width = Number($('#room-width', form).value) || 0;
      const tileSize = Number($('#tile-size', form).value) || 0;
      const wastage = Number($('#wastage', form).value) || 0;
      const area = Math.max(0, length * width);
      const totalArea = area * (1 + Math.max(0, Math.min(30, wastage)) / 100);

      $('#result-area').textContent = area ? `${area.toFixed(1)} sq ft` : '—';
      $('#result-total').textContent = area ? `${totalArea.toFixed(1)} sq ft` : '—';
      $('#result-tiles').textContent = area && tileSize
        ? Math.ceil(totalArea / tileSize).toLocaleString()
        : '—';
    }

    form.addEventListener('input', updateEstimate);
    form.addEventListener('change', updateEstimate);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      updateEstimate();
    });
    updateEstimate();
  }

  function setupCollectionGrid() {
    const grid = $('[data-product-grid]');
    if (!grid) return;

    const filterButtons = $$('.filter-btn');
    const searchInput = $('[data-product-search]');
    let catalogue = [];

    async function loadCatalogue() {
      try {
        const response = await fetch('/api/catalog');
        if (!response.ok) throw new Error('Catalogue request failed.');
        const data = await response.json();
        catalogue = data.items || [];
      } catch (error) {
        console.warn('Could not load tile catalogue:', error.message);
        grid.innerHTML = '<p class="empty-state">Collections could not be loaded right now. Please try again later.</p>';
        return;
      }

      const requestedCategory = new URLSearchParams(location.search).get('category') || '';
      if (requestedCategory) {
        const initialButton = filterButtons.find((button) =>
          button.dataset.category.toLowerCase() === requestedCategory.toLowerCase()
        );
        if (initialButton) {
          filterButtons.forEach((button) => {
            button.setAttribute('aria-pressed', String(button === initialButton));
          });
        }
      }

      renderCatalogue();
    }

    function renderCatalogue() {
      const activeCategory = $('.filter-btn[aria-pressed="true"]')?.dataset.category || '';
      const query = (searchInput?.value || '').toLowerCase().trim();
      const matchingItems = catalogue.filter((item) => {
        const searchable = [item.name, item.category, item.description, ...(item.tags || [])]
          .join(' ')
          .toLowerCase();
        return (!activeCategory || item.category === activeCategory) &&
          (!query || searchable.includes(query));
      });

      if (!matchingItems.length) {
        grid.innerHTML = '<p class="empty-state">No matching collections. Try a different search.</p>';
        return;
      }

      grid.innerHTML = matchingItems.map((item) => `
        <article class="collection-card">
          <a class="card-image" href="/contact.html?interest=${encodeURIComponent(item.name)}" aria-label="Ask about ${escapeAttribute(item.name)}">
            <img src="${escapeAttribute(item.image)}" alt="${escapeAttribute(item.name)} showroom inspiration" loading="lazy" width="800" height="600">
          </a>
          <div class="card-body">
            <span class="pill">${escapeHtml(item.category)}</span>
            <h3>${escapeHtml(item.name)}</h3>
            <p>${escapeHtml(item.description)}</p>
            <a class="text-link" href="/contact.html?interest=${encodeURIComponent(item.name)}">Ask about this collection <span>↗</span></a>
          </div>
        </article>
      `).join('');
    }

    filterButtons.forEach((button) => {
      button.addEventListener('click', () => {
        filterButtons.forEach((otherButton) => {
          otherButton.setAttribute('aria-pressed', String(otherButton === button));
        });
        renderCatalogue();
      });
    });
    searchInput?.addEventListener('input', renderCatalogue);

    loadCatalogue();
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character]);
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }

  async function initializeSite() {
    const config = await fetchSiteConfig();
    applySiteConfig(config);
    setupNavigation();
    setupEnquiryForm();
    setupTileCalculator();
    setupCollectionGrid();

    const year = $('[data-year]');
    if (year) year.textContent = new Date().getFullYear();
  }

  initializeSite();
})();
