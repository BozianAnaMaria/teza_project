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

  function rolesToString(roles) {
    if (!roles || !roles.length) return '—';
    return Array.isArray(roles) ? roles.join(', ') : String(roles);
  }

  let currentUser = null;

  function isAdmin() {
    if (!currentUser || !currentUser.roles) return false;
    return currentUser.roles.indexOf('ADMIN') >= 0;
  }

  async function checkAccess() {
    var res = await get('/auth/current');
    var data = await res.json();
    currentUser = data && data.username ? data : null;

    var denied = document.getElementById('access-denied');
    var content = document.getElementById('admin-content');
    var userDisplay = document.getElementById('user-display');

    if (userDisplay) userDisplay.textContent = currentUser ? currentUser.username : '';

    if (!currentUser || !isAdmin()) {
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
  var sections = {
    users: document.getElementById('section-users'),
    offers: document.getElementById('section-offers'),
    subscriptions: document.getElementById('section-subscriptions'),
    audit: document.getElementById('section-audit')
  };
  var tabs = ['tab-users', 'tab-offers', 'tab-subscriptions', 'tab-audit'];
  tabs.forEach(function (tabId, i) {
    document.getElementById(tabId).addEventListener('click', function (e) {
      e.preventDefault();
      document.querySelectorAll('.tabs a').forEach(function (a) { a.classList.remove('active'); });
      this.classList.add('active');
      Object.keys(sections).forEach(function (k) { hide(sections[k]); });
      show(sections[Object.keys(sections)[i]]);
      if (tabId === 'tab-offers') loadAdminOffers();
      if (tabId === 'tab-subscriptions') loadAdminSubscriptions();
      if (tabId === 'tab-audit') loadAudit(0);
    });
  });

  // ——— Users ———
  function loadUsers() {
    var loading = document.getElementById('users-loading');
    var wrap = document.getElementById('users-table-wrap');
    var tbody = document.getElementById('users-tbody');
    show(loading);
    hide(wrap);

    get('/admin/users').then(function (res) { return res.json(); }).then(function (list) {
      hide(loading);
      if (!list || list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">No users.</td></tr>';
      } else {
        tbody.innerHTML = list.map(function (u) {
          var roles = rolesToString(u.roles);
          var editBtn = '<button type="button" class="btn btn-sm btn-cta edit-user" data-id="' + u.id + '">Edit</button>';
          var delBtn = '<button type="button" class="btn btn-sm btn-danger delete-user" data-id="' + u.id + '" data-username="' + escapeHtml(u.username) + '">Delete</button>';
          return '<tr><td>' + u.id + '</td><td>' + escapeHtml(u.username) + '</td><td>' + escapeHtml(u.email || '—') + '</td><td>' + escapeHtml(roles) + '</td><td>' + formatDate(u.lastLoginAt) + '</td><td>' + editBtn + ' ' + delBtn + '</td></tr>';
        }).join('');
        wrap.classList.remove('hidden');
        show(wrap);
        document.querySelectorAll('.edit-user').forEach(function (btn) {
          btn.addEventListener('click', function () { openUserModal(btn.getAttribute('data-id')); });
        });
        document.querySelectorAll('.delete-user').forEach(function (btn) {
          btn.addEventListener('click', function () {
            if (confirm('Delete user "' + btn.getAttribute('data-username') + '"?')) {
              del('/admin/users/' + btn.getAttribute('data-id')).then(function (r) {
                if (r.ok) loadUsers();
              });
            }
          });
        });
      }
    }).catch(function () {
      hide(loading);
      tbody.innerHTML = '<tr><td colspan="6">Error loading users.</td></tr>';
      show(wrap);
    });
  }

  var userModal = document.getElementById('modal-user');
  var userForm = document.getElementById('form-user');
  var userIdInput = document.getElementById('user-id');

  function openUserModal(id) {
    userIdInput.value = id || '';
    document.getElementById('modal-user-title').textContent = id ? 'Edit user' : 'Add user';
    document.getElementById('row-password').style.display = id ? 'block' : 'block';
    if (id) {
      get('/admin/users').then(function (r) { return r.json(); }).then(function (list) {
        var u = list.find(function (x) { return x.id === parseInt(id, 10); });
        if (u) {
          userForm.username.value = u.username || '';
          userForm.email.value = u.email || '';
          userForm.roles.value = rolesToString(u.roles);
          userForm.password.value = '';
        }
      });
    } else {
      userForm.reset();
      userForm.roles.value = 'USER';
    }
    document.getElementById('user-form-error').classList.add('hidden');
    show(userModal);
  }

  userForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var errEl = document.getElementById('user-form-error');
    errEl.classList.add('hidden');
    var id = userIdInput.value;
    var rolesStr = (userForm.roles.value || 'USER').trim();
    var roles = rolesStr ? rolesStr.split(/\s*,\s*/).map(function (r) { return r.trim().toUpperCase(); }) : ['USER'];
    if (id) {
      var payload = {
        username: userForm.username.value.trim(),
        email: userForm.email.value.trim() || null,
        roles: roles,
        newPassword: userForm.password.value || null
      };
      put('/admin/users/' + id, payload).then(function (res) {
        if (!res.ok) return res.json().then(function (d) { throw new Error(d.error || 'Failed'); });
        hide(userModal);
        loadUsers();
      }).catch(function (err) {
        errEl.textContent = err.message || 'Update failed';
        errEl.classList.remove('hidden');
      });
    } else {
      if (!userForm.password.value) {
        errEl.textContent = 'Password is required for new user';
        errEl.classList.remove('hidden');
        return;
      }
      var payload = { username: userForm.username.value.trim(), password: userForm.password.value, email: userForm.email.value.trim() || null, roles: roles };
      post('/admin/users', payload).then(function (res) {
        if (!res.ok) return res.json().then(function (d) { throw new Error(d.error || 'Failed'); });
        hide(userModal);
        loadUsers();
      }).catch(function (err) {
        errEl.textContent = err.message || 'Create failed';
        errEl.classList.remove('hidden');
      });
    }
  });

  document.getElementById('btn-add-user').addEventListener('click', function () { openUserModal(null); });
  document.getElementById('user-cancel').addEventListener('click', function () { hide(userModal); });
  userModal.querySelector('.modal-backdrop').addEventListener('click', function () { hide(userModal); });
  userModal.querySelector('.modal-close').addEventListener('click', function () { hide(userModal); });

  // ——— Offers (admin: edit + delete) ———
  function loadSampleOffers() {
    var wrap = document.getElementById('sample-offers-list');
    if (!wrap) return;
    get('/admin/sample-offers').then(function (res) { return res.json(); }).then(function (list) {
      if (!list || list.length === 0) { wrap.innerHTML = ''; return; }
      var table = '<table class="data-table"><thead><tr><th>Title</th><th>Location</th><th>Price</th><th></th></tr></thead><tbody>';
      list.forEach(function (o, i) {
        table += '<tr><td>' + escapeHtml(o.title) + '</td><td>' + escapeHtml(o.location || '') + '</td><td>' + formatPrice(o.price) + '</td><td><button type="button" class="btn btn-sm btn-cta add-sample" data-idx="' + i + '">Add</button></td></tr>';
      });
      table += '</tbody></table>';
      wrap.innerHTML = table;
      var samples = list;
      wrap.querySelectorAll('.add-sample').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var idx = parseInt(btn.getAttribute('data-idx'), 10);
          var o = samples[idx];
          post('/offers', { title: o.title, description: o.description || '', price: o.price, location: o.location || '', imageUrl: o.imageUrl || '', active: true }).then(function (r) {
            if (r.ok) loadAdminOffers();
          });
        });
      });
    }).catch(function () { wrap.innerHTML = ''; });
  }

  function loadAdminOffers() {
    loadSampleOffers();
    var loading = document.getElementById('admin-offers-loading');
    var wrap = document.getElementById('admin-offers-table-wrap');
    var tbody = document.getElementById('admin-offers-tbody');
    show(loading);
    hide(wrap);

    get('/offers?all=true&size=200').then(function (res) { return res.json(); }).then(function (data) {
      hide(loading);
      var offers = data.content || [];
      if (offers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">No offers.</td></tr>';
      } else {
        tbody.innerHTML = offers.map(function (o) {
          var editBtn = '<button type="button" class="btn btn-sm btn-cta edit-offer" data-id="' + o.id + '">Edit</button>';
          var delBtn = '<button type="button" class="btn btn-sm btn-danger delete-offer" data-id="' + o.id + '" data-title="' + escapeHtml(o.title) + '">Delete</button>';
          return '<tr><td>' + o.id + '</td><td>' + escapeHtml(o.title) + '</td><td>' + escapeHtml(o.location || '—') + '</td><td>' + formatPrice(o.price) + '</td><td>' + (o.active ? 'Yes' : 'No') + '</td><td>' + editBtn + ' ' + delBtn + '</td></tr>';
        }).join('');
        wrap.classList.remove('hidden');
        show(wrap);
        document.querySelectorAll('.edit-offer').forEach(function (btn) {
          btn.addEventListener('click', function () { openOfferModal(btn.getAttribute('data-id')); });
        });
        document.querySelectorAll('.delete-offer').forEach(function (btn) {
          btn.addEventListener('click', function () {
            if (confirm('Delete offer "' + btn.getAttribute('data-title') + '"?')) {
              del('/offers/' + btn.getAttribute('data-id')).then(function (r) {
                if (r.ok) loadAdminOffers();
              });
            }
          });
        });
      }
    }).catch(function () {
      hide(loading);
      tbody.innerHTML = '<tr><td colspan="6">Error.</td></tr>';
      show(wrap);
    });
  }

  var offerModal = document.getElementById('modal-offer');
  var offerForm = document.getElementById('form-offer');
  var offerIdInput = document.getElementById('offer-id');

  function openOfferModal(id) {
    offerIdInput.value = id;
    get('/offers/' + id).then(function (r) { return r.json(); }).then(function (o) {
      offerForm.title.value = o.title || '';
      offerForm.description.value = o.description || '';
      offerForm.price.value = o.price != null ? o.price : '';
      offerForm.location.value = o.location || '';
      offerForm.imageUrl.value = o.imageUrl || '';
      offerForm.active.checked = o.active !== false;
    });
    document.getElementById('offer-form-error').classList.add('hidden');
    show(offerModal);
  }

  offerForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var errEl = document.getElementById('offer-form-error');
    errEl.classList.add('hidden');
    var id = offerIdInput.value;
    var payload = {
      title: offerForm.title.value.trim(),
      description: offerForm.description.value.trim(),
      price: parseFloat(offerForm.price.value) || 0,
      location: offerForm.location.value.trim() || null,
      imageUrl: offerForm.imageUrl.value.trim() || null,
      active: offerForm.active.checked
    };
    put('/offers/' + id, payload).then(function (res) {
      if (!res.ok) return res.json().then(function (d) { throw new Error(d.error || 'Failed'); });
      hide(offerModal);
      loadAdminOffers();
    }).catch(function (err) {
      errEl.textContent = err.message || 'Save failed';
      errEl.classList.remove('hidden');
    });
  });

  document.getElementById('offer-cancel').addEventListener('click', function () { hide(offerModal); });
  offerModal.querySelector('.modal-backdrop').addEventListener('click', function () { hide(offerModal); });
  offerModal.querySelector('.modal-close').addEventListener('click', function () { hide(offerModal); });

  // ——— Subscriptions ———
  function loadAdminSubscriptions() {
    var loading = document.getElementById('admin-subs-loading');
    var wrap = document.getElementById('admin-subs-table-wrap');
    var empty = document.getElementById('admin-subs-empty');
    var tbody = document.getElementById('admin-subs-tbody');
    show(loading);
    hide(wrap);
    hide(empty);

    get('/subscriptions').then(function (res) { return res.json(); }).then(function (list) {
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

  // ——— Audit ———
  var auditPage = 0;
  var auditTotalPages = 0;

  function loadAudit(page) {
    auditPage = page;
    var loading = document.getElementById('audit-loading');
    var wrap = document.getElementById('audit-table-wrap');
    var tbody = document.getElementById('audit-tbody');
    var pagination = document.getElementById('audit-pagination');
    show(loading);
    hide(wrap);

    var username = document.getElementById('audit-username').value.trim();
    var action = document.getElementById('audit-action').value.trim();
    var url = '/admin/audit?page=' + page + '&size=20';
    if (username) url += '&username=' + encodeURIComponent(username);
    if (action) url += '&action=' + encodeURIComponent(action);

    get(url).then(function (res) { return res.json(); }).then(function (data) {
      hide(loading);
      var content = data.content || [];
      auditTotalPages = data.totalPages != null ? data.totalPages : 0;
      if (content.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">No log entries.</td></tr>';
      } else {
        tbody.innerHTML = content.map(function (log) {
          return '<tr><td>' + formatDate(log.timestamp) + '</td><td>' + escapeHtml(log.username || '—') + '</td><td>' + escapeHtml(log.action || '—') + '</td><td>' + escapeHtml(log.resource || '—') + '</td><td>' + escapeHtml((log.details || '').substring(0, 80)) + '</td><td>' + escapeHtml(log.ipAddress || '—') + '</td></tr>';
        }).join('');
      }
      wrap.classList.remove('hidden');
      show(wrap);

      pagination.innerHTML = '';
      if (auditTotalPages > 1) {
        var prev = document.createElement('button');
        prev.textContent = 'Previous';
        prev.disabled = auditPage <= 0;
        prev.addEventListener('click', function () { loadAudit(auditPage - 1); });
        pagination.appendChild(prev);
        var span = document.createElement('span');
        span.textContent = ' Page ' + (auditPage + 1) + ' of ' + auditTotalPages + ' ';
        pagination.appendChild(span);
        var next = document.createElement('button');
        next.textContent = 'Next';
        next.disabled = auditPage >= auditTotalPages - 1;
        next.addEventListener('click', function () { loadAudit(auditPage + 1); });
        pagination.appendChild(next);
      }
    }).catch(function () {
      hide(loading);
      tbody.innerHTML = '<tr><td colspan="6">Error loading logs.</td></tr>';
      show(wrap);
    });
  }

  document.getElementById('audit-apply').addEventListener('click', function () { loadAudit(0); });

  checkAccess().then(function (ok) {
    if (ok) {
      loadUsers();
    } else {
      window.location.href = '/?login=1';
    }
  });
})();
