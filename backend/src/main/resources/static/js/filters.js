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

    // Apply filters button - applies ALL selected filters together
    const applyBtn = document.getElementById('filter-apply');
    if (applyBtn) {
      applyBtn.addEventListener('click', applyAllFilters);
    }

    // Clear filters button
    const clearBtn = document.getElementById('filter-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', clearAllFilters);
    }

    // Save search button
    const saveBtn = document.getElementById('filter-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', saveCurrentSearch);
    }
  }

  // Apply ALL selected filters together (Zillow-style)
  async function applyAllFilters() {
    // Collect ALL filter values from the form
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

    // Update current filters state with ALL criteria
    currentFilters = criteria;

    // Apply all filters together to get results matching ALL criteria
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
        toggleSaveSearchButton();
      }
    } catch (error) {
      console.error('Error applying filters:', error);
    }
  }

  // Show/hide Save Search button based on whether filters are active
  function toggleSaveSearchButton() {
    const saveBtn = document.getElementById('filter-save');
    if (!saveBtn) return;

    const hasActiveFilters = Object.keys(currentFilters).length > 0;
    saveBtn.style.display = hasActiveFilters ? 'inline-block' : 'none';
  }

  // Save current search (placeholder for now)
  async function saveCurrentSearch() {
    if (Object.keys(currentFilters).length === 0) {
      alert('Please apply some filters before saving a search.');
      return;
    }

    const name = prompt('Enter a name for this saved search:');
    if (!name) return;

    try {
      const res = await fetch(API + '/filters', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name,
          criteria: currentFilters,
          description: generateFilterDescription(currentFilters)
        })
      });

      if (res.ok) {
        alert('Search saved successfully!');
        await loadSavedFilters();
      } else if (res.status === 401) {
        alert('Please log in to save searches.');
      } else {
        alert('Failed to save search. Please try again.');
      }
    } catch (error) {
      console.error('Error saving search:', error);
      alert('Failed to save search. Please try again.');
    }
  }

  // Generate a description for the filter
  function generateFilterDescription(criteria) {
    const parts = [];
    if (criteria.categories) parts.push('Category: ' + criteria.categories.join(', '));
    if (criteria.minPrice || criteria.maxPrice) {
      const price = criteria.minPrice && criteria.maxPrice
        ? `€${criteria.minPrice} - €${criteria.maxPrice}`
        : criteria.minPrice ? `From €${criteria.minPrice}`
        : `Up to €${criteria.maxPrice}`;
      parts.push('Price: ' + price);
    }
    if (criteria.location) parts.push('Location: ' + criteria.location);
    if (criteria.labelIds) parts.push('Labels: ' + criteria.labelIds.length + ' selected');
    return parts.join(' | ');
  }

  // Apply a saved filter by ID (loads all criteria and applies them together)
  window.applyFilterById = async function(filterId) {
    const filter = savedFilters.find(f => f.id === filterId);
    if (!filter) return;

    const criteria = filter.criteria;

    // Clear form first
    document.getElementById('filter-category').value = '';
    document.getElementById('filter-min-price').value = '';
    document.getElementById('filter-max-price').value = '';
    document.getElementById('filter-location').value = '';
    document.querySelectorAll('input[name="label"]').forEach(cb => cb.checked = false);

    // Populate form with saved filter criteria
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

    // Update currentFilters with the saved criteria
    currentFilters = { ...criteria };

    // Apply all criteria together
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
        toggleSaveSearchButton();
      }
    } catch (error) {
      console.error('Error applying saved filter:', error);
    }
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

  // Clear all filters and reload all offers
  async function clearAllFilters() {
    // Clear form inputs
    document.getElementById('filter-category').value = '';
    document.getElementById('filter-min-price').value = '';
    document.getElementById('filter-max-price').value = '';
    document.getElementById('filter-location').value = '';
    document.querySelectorAll('input[name="label"]:checked').forEach(cb => cb.checked = false);

    // Clear active filters state
    currentFilters = {};
    updateActiveFiltersDisplay();
    updateFilterCount();
    toggleSaveSearchButton();

    // Reload all offers without any filters
    try {
      const res = await fetch(API + '/offers?size=24', { credentials: 'include' });
      const data = await res.json();
      updateOffersList(data.content || []);
    } catch (err) {
      console.error('Error loading offers:', err);
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

  // Remove individual filter tag and reapply remaining filters
  window.removeFilterTag = async function(key) {
    // Remove the specific filter from currentFilters and form
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

    // Update display
    updateActiveFiltersDisplay();
    updateFilterCount();
    toggleSaveSearchButton();

    // If no filters remain, reload all offers
    if (Object.keys(currentFilters).length === 0) {
      await clearAllFilters();
    } else {
      // Reapply remaining filters (send ALL remaining filters to backend)
      try {
        const res = await fetch(API + '/filters/apply', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(currentFilters)
        });

        if (res.ok) {
          const data = await res.json();
          updateOffersList(data.content);
        }
      } catch (error) {
        console.error('Error applying filters:', error);
      }
    }
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

  // Update results count display
  function updateResultsCount(count) {
    const resultsCount = document.getElementById('filter-results-count');
    if (!resultsCount) return;

    const hasActiveFilters = Object.keys(currentFilters).length > 0;

    if (hasActiveFilters) {
      resultsCount.textContent = count === 1 ? '1 result' : `${count} results`;
      resultsCount.classList.remove('hidden');
    } else {
      resultsCount.classList.add('hidden');
    }
  }

  // HTML escape helper
  function escapeHtml(s) {
    if (!s) return '';
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  // Update offers list
  function updateOffersList(offers) {
    const list = document.getElementById('offers-list');
    const loading = document.getElementById('offers-loading');
    const empty = document.getElementById('offers-empty');

    if (!list) return;

    list.innerHTML = '';

    // Update results count
    updateResultsCount(offers.length);

    if (offers.length === 0) {
      if (loading) loading.classList.add('hidden');
      if (empty) empty.classList.remove('hidden');
      return;
    }

    if (empty) empty.classList.add('hidden');
    if (loading) loading.classList.add('hidden');

    const isOffersPage = document.body && document.body.getAttribute('data-page') === 'offers';

    offers.forEach(function(offer) {
      var card = document.createElement('div');
      card.className = 'offer-card';
      var imgUrl = offer.imageUrl || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400';

      // Build category badge
      var categoryBadge = '';
      if (offer.category) {
        categoryBadge = '<span class="offer-category">' + escapeHtml(offer.category) + '</span>';
      }

      // Build labels
      var labelsHtml = '';
      if (offer.labels && offer.labels.length > 0) {
        labelsHtml = '<div class="offer-labels">';
        offer.labels.forEach(function(label) {
          var style = label.color ? ' style="background-color:' + escapeHtml(label.color) + ';color:white;"' : '';
          labelsHtml += '<span class="offer-label"' + style + '>' + escapeHtml(label.name) + '</span>';
        });
        labelsHtml += '</div>';
      }

      card.innerHTML =
        '<div class="offer-card-image" style="background-image:url(\'' + imgUrl + '\')"></div>' +
        '<div class="offer-card-body">' +
          '<h3 class="offer-card-title">' + escapeHtml(offer.title) + '</h3>' +
          categoryBadge +
          labelsHtml +
          (offer.location ? '<p class="offer-card-location">' + escapeHtml(offer.location) + '</p>' : '') +
          '<p class="offer-card-price">' + formatPrice(offer.price) + '</p>' +
          '<div class="offer-card-actions">' +
            '<button type="button" class="btn-offer btn-offer-primary btn-view-more" data-id="' + offer.id + '" data-offer=\'' + JSON.stringify(offer).replace(/'/g, '&#39;') + '\'>View</button>' +
            '<button type="button" class="btn-offer btn-notify ' + (offer.subscribed ? 'subscribed' : '') + '" data-id="' + offer.id + '" data-subscribed="' + !!offer.subscribed + '">' +
              (offer.subscribed ? 'Notifying' : 'Get notified') +
            '</button>' +
          '</div>' +
        '</div>';

      list.appendChild(card);
    });

    // Reattach subscribe button event listeners
    attachSubscribeHandlers();
    attachViewMoreHandlers();
  }

  function formatPrice(price) {
    return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(price);
  }

  function attachSubscribeHandlers() {
    document.querySelectorAll('.btn-notify').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var offerId = this.getAttribute('data-id');
        var isSubscribed = this.getAttribute('data-subscribed') === 'true';
        toggleOfferSubscription(offerId, isSubscribed, this);
      });
    });
  }

  function attachViewMoreHandlers() {
    document.querySelectorAll('.btn-view-more').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var offerData = JSON.parse(btn.getAttribute('data-offer'));
        // Call the openOfferModal function from app.js
        if (window.openOfferModal) {
          window.openOfferModal(offerData);
        }
      });
    });
  }

  function toggleOfferSubscription(offerId, isSubscribed, button) {
    var method = isSubscribed ? 'DELETE' : 'POST';

    fetch(API + '/offers/' + offerId + '/subscribe', {
      method: method,
      credentials: 'include'
    }).then(function(res) {
      if (res.ok || res.status === 204) {
        button.setAttribute('data-subscribed', isSubscribed ? 'false' : 'true');
        button.textContent = isSubscribed ? 'Get notified' : 'Notifying';
        button.classList.toggle('subscribed', !isSubscribed);
      } else if (res.status === 401) {
        alert('Please log in to subscribe to offers');
      }
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFilters);
  } else {
    initFilters();
  }
})();
