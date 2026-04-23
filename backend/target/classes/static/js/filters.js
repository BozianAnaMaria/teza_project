(function () {
  'use strict';

  const API = '/api';
  let currentFilters = {};
  let availableLabels = [];
  let savedFilters = [];

  // Initialize filter panel
  function initFilters() {
    loadLabels();
    loadSavedFilters();
    setupFilterEvents();
  }

  // Load available labels
  async function loadLabels() {
    try {
      const res = await fetch(API + '/manager/labels', { credentials: 'include' });
      if (res.ok) {
        availableLabels = await res.json();
        renderLabels();
      }
    } catch (error) {
      console.log('Labels not available (requires manager access)');
    }
  }

  // Load saved filters
  async function loadSavedFilters() {
    try {
      const res = await fetch(API + '/filters', { credentials: 'include' });
      if (res.ok) {
        savedFilters = await res.json();
        renderSavedFilters();
      }
    } catch (error) {
      console.error('Error loading filters:', error);
    }
  }

  // Render labels as checkboxes
  function renderLabels() {
    const container = document.getElementById('filter-labels');
    if (!container || availableLabels.length === 0) return;

    container.innerHTML = availableLabels.map(label => `
      <label class="label-checkbox">
        <input type="checkbox" name="label" value="${label.id}">
        ${label.color ? `<span class="label-dot" style="background-color: ${label.color}"></span>` : ''}
        <span>${label.name}</span>
      </label>
    `).join('');
  }

  // Render saved filters
  function renderSavedFilters() {
    const container = document.getElementById('saved-filters-list');
    if (!container || savedFilters.length === 0) {
      const section = document.getElementById('saved-filters-section');
      if (section) section.style.display = 'none';
      return;
    }

    container.innerHTML = savedFilters.map(filter => `
      <div class="saved-filter-item">
        <div class="saved-filter-info">
          <div class="saved-filter-name">${filter.name}</div>
          ${filter.description ? `<div class="saved-filter-desc">${filter.description}</div>` : ''}
        </div>
        <div class="saved-filter-actions">
          <button class="btn btn-outline btn-subscribe-filter ${filter.subscribed ? 'subscribed' : ''}"
                  data-filter-id="${filter.id}">
            ${filter.subscribed ? '✓ Subscribed' : 'Subscribe'}
          </button>
          <button class="btn btn-cta" onclick="applyFilterById(${filter.id})">Apply</button>
        </div>
      </div>
    `).join('');

    // Add subscribe button event listeners
    container.querySelectorAll('.btn-subscribe-filter').forEach(btn => {
      btn.addEventListener('click', function() {
        const filterId = this.getAttribute('data-filter-id');
        toggleFilterSubscription(filterId, this);
      });
    });
  }

  // Toggle filter panel visibility
  function setupFilterEvents() {
    const toggle = document.getElementById('filter-toggle');
    const content = document.getElementById('filter-content');

    if (toggle && content) {
      toggle.addEventListener('click', function() {
        content.classList.toggle('hidden');
      });
    }

    // Apply filters button
    const applyBtn = document.getElementById('filter-apply');
    if (applyBtn) {
      applyBtn.addEventListener('click', applyCurrentFilters);
    }

    // Clear filters button
    const clearBtn = document.getElementById('filter-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', clearAllFilters);
    }
  }

  // Apply current filter criteria
  async function applyCurrentFilters() {
    const criteria = {};

    // Category
    const category = document.getElementById('filter-category').value;
    if (category) {
      criteria.categories = [category];
    }

    // Price range
    const minPrice = document.getElementById('filter-min-price').value;
    const maxPrice = document.getElementById('filter-max-price').value;
    if (minPrice) criteria.minPrice = parseFloat(minPrice);
    if (maxPrice) criteria.maxPrice = parseFloat(maxPrice);

    // Location
    const location = document.getElementById('filter-location').value;
    if (location) criteria.location = location;

    // Labels
    const selectedLabels = Array.from(document.querySelectorAll('input[name="label"]:checked'))
      .map(cb => parseInt(cb.value));
    if (selectedLabels.length > 0) {
      criteria.labelIds = selectedLabels;
    }

    currentFilters = criteria;

    // Apply filters
    try {
      const res = await fetch(API + '/filters/apply', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(criteria)
      });

      if (res.ok) {
        const data = await res.json();
        updateOffersList(data.content);
        updateActiveFiltersDisplay();
        updateFilterCount();
      }
    } catch (error) {
      console.error('Error applying filters:', error);
    }
  }

  // Apply a saved filter by ID
  window.applyFilterById = async function(filterId) {
    const filter = savedFilters.find(f => f.id === filterId);
    if (!filter) return;

    // Populate filter form with saved filter criteria
    const criteria = filter.criteria;

    if (criteria.categories && criteria.categories.length > 0) {
      document.getElementById('filter-category').value = criteria.categories[0];
    }

    if (criteria.minPrice) {
      document.getElementById('filter-min-price').value = criteria.minPrice;
    }

    if (criteria.maxPrice) {
      document.getElementById('filter-max-price').value = criteria.maxPrice;
    }

    if (criteria.location) {
      document.getElementById('filter-location').value = criteria.location;
    }

    if (criteria.labelIds) {
      document.querySelectorAll('input[name="label"]').forEach(cb => {
        cb.checked = criteria.labelIds.includes(parseInt(cb.value));
      });
    }

    // Apply the filter
    await applyCurrentFilters();
  };

  // Toggle filter subscription
  async function toggleFilterSubscription(filterId, button) {
    const isSubscribed = button.classList.contains('subscribed');
    const method = isSubscribed ? 'DELETE' : 'POST';

    try {
      const res = await fetch(API + `/filters/${filterId}/subscribe`, {
        method: method,
        credentials: 'include'
      });

      if (res.ok || res.status === 204) {
        button.classList.toggle('subscribed');
        button.textContent = isSubscribed ? 'Subscribe' : '✓ Subscribed';

        // Update the filter in savedFilters array
        const filter = savedFilters.find(f => f.id == filterId);
        if (filter) filter.subscribed = !isSubscribed;
      } else if (res.status === 401) {
        alert('Please log in to subscribe to filters');
      }
    } catch (error) {
      console.error('Error toggling subscription:', error);
    }
  }

  // Clear all filters
  function clearAllFilters() {
    document.getElementById('filter-category').value = '';
    document.getElementById('filter-min-price').value = '';
    document.getElementById('filter-max-price').value = '';
    document.getElementById('filter-location').value = '';
    document.querySelectorAll('input[name="label"]:checked').forEach(cb => cb.checked = false);

    currentFilters = {};
    updateActiveFiltersDisplay();
    updateFilterCount();

    // Reload all offers
    if (window.loadOffers) {
      window.loadOffers();
    }
  }

  // Update active filters display
  function updateActiveFiltersDisplay() {
    const container = document.getElementById('active-filters');
    const tagsContainer = document.getElementById('active-filters-tags');

    if (!container || !tagsContainer) return;

    const tags = [];

    if (currentFilters.categories && currentFilters.categories.length > 0) {
      tags.push({ label: `Category: ${currentFilters.categories.join(', ')}`, key: 'categories' });
    }

    if (currentFilters.minPrice || currentFilters.maxPrice) {
      const priceLabel = currentFilters.minPrice && currentFilters.maxPrice
        ? `${currentFilters.minPrice} - ${currentFilters.maxPrice}`
        : currentFilters.minPrice ? `From ${currentFilters.minPrice}`
        : `Up to ${currentFilters.maxPrice}`;
      tags.push({ label: `Price: ${priceLabel}`, key: 'price' });
    }

    if (currentFilters.location) {
      tags.push({ label: `Location: ${currentFilters.location}`, key: 'location' });
    }

    if (currentFilters.labelIds && currentFilters.labelIds.length > 0) {
      const labelNames = currentFilters.labelIds.map(id => {
        const label = availableLabels.find(l => l.id === id);
        return label ? label.name : id;
      }).join(', ');
      tags.push({ label: `Labels: ${labelNames}`, key: 'labelIds' });
    }

    if (tags.length === 0) {
      container.classList.add('hidden');
      return;
    }

    tagsContainer.innerHTML = tags.map(tag => `
      <div class="filter-tag">
        <span>${tag.label}</span>
        <button class="filter-tag-remove" onclick="removeFilterTag('${tag.key}')">&times;</button>
      </div>
    `).join('');

    container.classList.remove('hidden');
  }

  // Remove individual filter tag
  window.removeFilterTag = function(key) {
    if (key === 'categories') {
      delete currentFilters.categories;
      document.getElementById('filter-category').value = '';
    } else if (key === 'price') {
      delete currentFilters.minPrice;
      delete currentFilters.maxPrice;
      document.getElementById('filter-min-price').value = '';
      document.getElementById('filter-max-price').value = '';
    } else if (key === 'location') {
      delete currentFilters.location;
      document.getElementById('filter-location').value = '';
    } else if (key === 'labelIds') {
      delete currentFilters.labelIds;
      document.querySelectorAll('input[name="label"]:checked').forEach(cb => cb.checked = false);
    }

    applyCurrentFilters();
  };

  // Update filter count badge
  function updateFilterCount() {
    const badge = document.getElementById('filter-count');
    if (!badge) return;

    let count = 0;
    if (currentFilters.categories && currentFilters.categories.length > 0) count++;
    if (currentFilters.minPrice || currentFilters.maxPrice) count++;
    if (currentFilters.location) count++;
    if (currentFilters.labelIds && currentFilters.labelIds.length > 0) count++;

    if (count > 0) {
      badge.textContent = count;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  // Update offers list
  function updateOffersList(offers) {
    if (window.displayOffers) {
      window.displayOffers(offers);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFilters);
  } else {
    initFilters();
  }
})();
