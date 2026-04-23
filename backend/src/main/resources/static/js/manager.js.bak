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
  });
  document.getElementById('tab-subscriptions').addEventListener('click', function (e) {
    e.preventDefault();
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
        return '<tr><td>' + escapeHtml(o.title) + '</td><td>' + escapeHtml(o.location || '—') + '</td><td>' + formatPrice(o.price) + '</td><td>' + (o.active ? 'Yes' : 'No') + '</td><td>' + editBtn + '</td></tr>';
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
    if (id) {
      get('/offers/' + id).then(function (r) { return r.json(); }).then(function (o) {
        form.title.value = o.title || '';
        form.description.value = o.description || '';
        form.price.value = o.price != null ? o.price : '';
        form.location.value = o.location || '';
        form.imageUrl.value = o.imageUrl || '';
        form.active.checked = o.active !== false;
      });
    } else {
      form.reset();
      form.active.checked = true;
    }
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
      active: form.active.checked
    };
    var req = id ? put('/offers/' + id, payload) : post('/offers', payload);
    req.then(function (res) {
      if (!res.ok) return res.json().then(function (d) { throw new Error(d.error || 'Failed'); });
      closeOfferModal();
      loadOffers();
    }).catch(function (err) {
      errEl.textContent = err.message || 'Save failed';
      errEl.classList.remove('hidden');
    });
  });

  checkAccess().then(function (ok) {
    if (ok) {
      loadOffers();
    } else {
      window.location.href = '/?login=1';
    }
  });
})();
