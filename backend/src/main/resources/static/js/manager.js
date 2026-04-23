(function () {
  'use strict';

  const API = '/api';

  function get(url) {
    return fetch(API + url, { credentials: 'include' });
  }

  function post(url, body) {
    return fetch(API + url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  }

  function put(url, body) {
    return fetch(API + url, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  }

  function del(url) {
    return fetch(API + url, { method: 'DELETE', credentials: 'include' });
  }

  function show(el) {
    if (el) el.classList.remove('hidden');
  }

  function hide(el) {
    if (el) el.classList.add('hidden');
  }

  function escapeHtml(s) {
    if (s == null) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function formatPrice(n) {
    if (n == null) return '—';
    return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
  }

  function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString();
  }

  let currentUser = null;

  function hasManagerAccess() {
    if (!currentUser || !currentUser.roles) return false;
    return currentUser.roles.indexOf('MANAGER') >= 0 || currentUser.roles.indexOf('ADMIN') >= 0;
  }

  async function checkAccess() {
    var res = await get('/auth/current');
    var data = await res.json();
    currentUser = data && data.username ? data : null;

    var denied = document.getElementById('access-denied');
    var content = document.getElementById('manager-content');
    var userDisplay = document.getElementById('user-display');

    if (userDisplay) userDisplay.textContent = currentUser ? currentUser.username : '';

    if (!currentUser || !hasManagerAccess()) {
      show(denied);
      hide(content);
      return false;
    }
    hide(denied);
    show(content);
    return true;
  }

  document.getElementById('btn-logout').addEventListener('click', function () {
    fetch(API + '/auth/logout', { method: 'POST', credentials: 'include' }).then(function () {
      window.location.href = '/';
    });
  });

  // Tabs
  document.getElementById('tab-offers').addEventListener('click', function (e) {
    e.preventDefault();
    document.querySelectorAll('.tabs a').forEach(function (a) { a.classList.remove('active'); });
    this.classList.add('active');
    show(document.getElementById('section-offers'));
    hide(document.getElementById('section-subscriptions'));
    hide(document.getElementById("section-labels"));  });
  document.getElementById('tab-subscriptions').addEventListener('click', function (e) {
  hide(document.getElementById("section-labels"));    e.preventDefault();
    document.querySelectorAll('.tabs a').forEach(function (a) { a.classList.remove('active'); });
    this.classList.add('active');
    hide(document.getElementById('section-offers'));
    show(document.getElementById('section-subscriptions'));
    loadSubscriptions();
  });

  function loadOffers() {
    var loading = document.getElementById('offers-loading');
    var wrap = document.getElementById('offers-table-wrap');
    var empty = document.getElementById('offers-empty');
    var tbody = document.getElementById('offers-tbody');
    show(loading);
    hide(wrap);
    hide(empty);

    get('/offers?all=true&size=100').then(function (res) {
      return res.json();
    }).then(function (data) {
      hide(loading);
      var offers = data.content || [];
      if (offers.length === 0) {
        show(empty);
        return;
      }
      tbody.innerHTML = offers.map(function (o) {
        var editBtn = '<button type="button" class="btn btn-sm btn-cta edit-offer" data-id="' + o.id + '">Edit</button>';
        var categoryText = o.category ? '<br><small style="color:#666;">Category: ' + escapeHtml(o.category) + '</small>' : '';
        var labelsText = '';
        if (o.labels && o.labels.length > 0) {
          labelsText = '<br><small style="color:#666;">Labels: ' + o.labels.map(function(l) { return escapeHtml(l.name); }).join(', ') + '</small>';
        }
        return '<tr><td>' + escapeHtml(o.title) + categoryText + labelsText + '</td><td>' + escapeHtml(o.location || '—') + '</td><td>' + formatPrice(o.price) + '</td><td>' + (o.active ? 'Yes' : 'No') + '</td><td>' + editBtn + '</td></tr>';
      }).join('');
      wrap.classList.remove('hidden');
      show(wrap);
      document.querySelectorAll('.edit-offer').forEach(function (btn) {
        btn.addEventListener('click', function () { openOfferModal(btn.getAttribute('data-id')); });
      });
    }).catch(function () {
      hide(loading);
      show(empty);
    });
  }

  function loadSubscriptions() {
    var loading = document.getElementById('subs-loading');
    var wrap = document.getElementById('subs-table-wrap');
    var empty = document.getElementById('subs-empty');
    var tbody = document.getElementById('subs-tbody');
    show(loading);
    hide(wrap);
    hide(empty);

    get('/subscriptions').then(function (res) {
      return res.json();
    }).then(function (list) {
      hide(loading);
      if (!list || list.length === 0) {
        show(empty);
        return;
      }
      tbody.innerHTML = list.map(function (s) {
        return '<tr><td>' + escapeHtml(s.username) + '</td><td>' + escapeHtml(s.offerTitle) + ' (#' + s.offerId + ')</td><td>' + formatDate(s.subscribedAt) + '</td></tr>';
      }).join('');
      wrap.classList.remove('hidden');
      show(wrap);
    }).catch(function () {
      hide(loading);
      show(empty);
    });
  }

  var modal = document.getElementById('modal-offer');
  var form = document.getElementById('form-offer');
  var modalTitle = document.getElementById('modal-offer-title');
  var offerIdInput = document.getElementById('offer-id');

  function openOfferModal(id) {
    offerIdInput.value = id || '';
    modalTitle.textContent = id ? 'Edit offer' : 'Add offer';
    document.getElementById('row-active').style.display = id ? 'block' : 'none';

    // Load available labels first
    populateOfferLabels().then(function() {
      if (id) {
        get('/offers/' + id).then(function (r) { return r.json(); }).then(function (o) {
          form.title.value = o.title || '';
          form.description.value = o.description || '';
          form.price.value = o.price != null ? o.price : '';
          form.location.value = o.location || '';
          form.imageUrl.value = o.imageUrl || '';
          form.category.value = o.category || '';
          form.active.checked = o.active !== false;

          // Check the labels that are assigned to this offer
          if (o.labels && o.labels.length > 0) {
            o.labels.forEach(function(label) {
              var checkbox = form.querySelector('input[name="label-' + label.id + '"]');
              if (checkbox) checkbox.checked = true;
            });
          }
        });
      } else {
        form.reset();
        form.active.checked = true;
      }
    });

    document.getElementById('offer-form-error').classList.add('hidden');
    show(modal);
  }

  function closeOfferModal() {
    hide(modal);
  }

  document.getElementById('btn-add-offer').addEventListener('click', function () {
    openOfferModal(null);
  });
  document.getElementById('offer-cancel').addEventListener('click', closeOfferModal);
  modal.querySelector('.modal-backdrop').addEventListener('click', closeOfferModal);
  modal.querySelector('.modal-close').addEventListener('click', closeOfferModal);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var errEl = document.getElementById('offer-form-error');
    errEl.classList.add('hidden');
    var id = offerIdInput.value;

    var payload = {
      title: form.title.value.trim(),
      description: form.description.value.trim(),
      price: parseFloat(form.price.value) || 0,
      location: form.location.value.trim() || null,
      imageUrl: form.imageUrl.value.trim() || null,
      category: form.category.value.trim() || null,
      active: form.active.checked
    };

    var req = id ? put('/offers/' + id, payload) : post('/offers', payload);
    req.then(function (res) {
      if (!res.ok) return res.json().then(function (d) { throw new Error(d.error || 'Failed'); });
      return res.json();
    }).then(function(savedOffer) {
      // Now handle label assignments
      var selectedLabels = [];
      form.querySelectorAll('input[name^="label-"]:checked').forEach(function(checkbox) {
        selectedLabels.push(parseInt(checkbox.value));
      });

      // If offer was just created, we need its ID
      var offerId = id || savedOffer.id;

      // Get current labels if editing
      return Promise.all(selectedLabels.map(function(labelId) {
        return post('/manager/offers/' + offerId + '/labels/' + labelId, null).catch(function() {
          // Label might already be assigned, that's ok
        });
      })).then(function() {
        closeOfferModal();
        loadOffers();
      });
    }).catch(function (err) {
      errEl.textContent = err.message || 'Save failed';
      errEl.classList.remove('hidden');
    });
  });


  // Tab for labels section
  document.getElementById("tab-labels").addEventListener("click", function (e) {
    e.preventDefault();
    document.querySelectorAll(".tabs a").forEach(function (a) { a.classList.remove("active"); });
    this.classList.add("active");
    hide(document.getElementById("section-offers"));
    hide(document.getElementById("section-subscriptions"));
    show(document.getElementById("section-labels"));
    loadLabels();
  });
  checkAccess().then(function (ok) {
    if (ok) {
      loadOffers();
    } else {
      window.location.href = '/?login=1';
    }
  });

  // Add labels tab
  document.getElementById('tab-labels').addEventListener('click', function (e) {
    e.preventDefault();
    document.querySelectorAll('.tabs a').forEach(function (a) { a.classList.remove('active'); });
    this.classList.add('active');
    hide(document.getElementById('section-offers'));
    hide(document.getElementById('section-subscriptions'));
    show(document.getElementById('section-labels'));
    loadLabels();
  });

  // ——— Labels ———
  let allLabels = [];

  function loadLabels() {
    var loading = document.getElementById('labels-loading');
    var wrap = document.getElementById('labels-table-wrap');
    var tbody = document.getElementById('labels-tbody');
    show(loading);
    hide(wrap);

    get('/manager/labels').then(function (res) {
      return res.json();
    }).then(function (data) {
      hide(loading);
      allLabels = data || [];
      tbody.innerHTML = '';
      if (data && data.length > 0) {
        data.forEach(function (label) {
          var tr = document.createElement('tr');
          var colorBox = label.color ? 
            '<div style="width:20px;height:20px;background:' + escapeHtml(label.color) + ';border:1px solid #ccc;border-radius:3px;display:inline-block;"></div>' : '—';
          
          tr.innerHTML = 
            '<td>' + label.id + '</td>' +
            '<td>' + escapeHtml(label.name) + '</td>' +
            '<td>' + escapeHtml(label.description || '') + '</td>' +
            '<td>' + colorBox + '</td>' +
            '<td>' +
              '<button class="btn-link" onclick="editLabel(' + label.id + ')">Edit</button> ' +
              '<button class="btn-link" onclick="deleteLabel(' + label.id + ', \'' + escapeHtml(label.name).replace(/'/g, "\\'") + '\')">Delete</button>' +
            '</td>';
          tbody.appendChild(tr);
        });
        show(wrap);
      }
    }).catch(function (err) {
      console.error('Error loading labels:', err);
      hide(loading);
    });
  }

  window.editLabel = function (id) {
    var label = allLabels.find(function(l) { return l.id === id; });
    if (!label) return;

    document.getElementById('label-id').value = label.id;
    document.getElementById('modal-label-title').textContent = 'Edit Label';
    var form = document.getElementById('form-label');
    form.name.value = label.name || '';
    form.description.value = label.description || '';
    form.color.value = label.color || '';
    show(document.getElementById('modal-label'));
  };

  window.deleteLabel = function (id, name) {
    if (!confirm('Delete label "' + name + '"?')) return;
    del('/manager/labels/' + id).then(function () {
      loadLabels();
    });
  };

  document.getElementById('btn-add-label').addEventListener('click', function () {
    document.getElementById('label-id').value = '';
    document.getElementById('modal-label-title').textContent = 'Create Label';
    document.getElementById('form-label').reset();
    show(document.getElementById('modal-label'));
  });

  document.getElementById('form-label').addEventListener('submit', function (e) {
    e.preventDefault();
    var form = this;
    var labelId = document.getElementById('label-id').value;
    var errorEl = document.getElementById('label-form-error');
    errorEl.classList.add('hidden');

    var payload = {
      name: form.name.value,
      description: form.description.value,
      color: form.color.value || null
    };

    var promise = labelId ? put('/manager/labels/' + labelId, payload) : post('/manager/labels', payload);

    promise.then(function (res) {
      if (res.ok) {
        hide(document.getElementById('modal-label'));
        loadLabels();
      } else {
        return res.json().then(function (data) {
          errorEl.textContent = data.error || 'Error saving label';
          errorEl.classList.remove('hidden');
        });
      }
    });
  });

  document.getElementById('label-cancel').addEventListener('click', function () {
    hide(document.getElementById('modal-label'));
  });

  var labelModal = document.getElementById('modal-label');
  if (labelModal) {
    labelModal.querySelector('.modal-backdrop').addEventListener('click', function () { hide(labelModal); });
    labelModal.querySelector('.modal-close').addEventListener('click', function () { hide(labelModal); });
  }

  // Update offer form to show labels
  function populateOfferLabels() {
    var container = document.getElementById('offer-labels-list');
    if (!container) return Promise.resolve();

    return get('/manager/labels').then(function(res) {
      return res.json();
    }).then(function(labels) {
      if (!labels || labels.length === 0) {
        container.innerHTML = '<p style="color:#666;font-size:0.9rem;">No labels available. Create labels in the Labels tab first.</p>';
        return;
      }

      container.innerHTML = labels.map(function(label) {
        var colorDot = label.color ?
          '<span style="display:inline-block;width:12px;height:12px;background:' + label.color + ';border-radius:50%;margin-right:0.5rem;"></span>' : '';
        return '<label style="display:block;padding:0.5rem;"><input type="checkbox" name="label-' + label.id + '" value="' + label.id + '"> ' +
          colorDot + escapeHtml(label.name) + '</label>';
      }).join('');
    }).catch(function() {
      container.innerHTML = '<p style="color:#999;font-size:0.9rem;">Could not load labels.</p>';
    });
  }

})();
