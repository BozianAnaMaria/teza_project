(function () {
  'use strict';

  const API = '/api';

  let currentUser = null;

  function get(url, options) {
    return fetch(API + url, { credentials: 'include', ...options });
  }

  function post(url, body, options) {
    return fetch(API + url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(options && options.headers) },
      body: body ? JSON.stringify(body) : undefined,
      ...options
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

  function showError(id, msg) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = msg || '';
      el.classList.toggle('hidden', !msg);
    }
  }

  async function loadCurrentUser() {
    const res = await get('/auth/current');
    const data = await res.json();
    currentUser = data && data.username ? data : null;
    updateHeader();
    return currentUser;
  }

  function updateHeader() {
    const btnLogin = document.getElementById('btn-login');
    const btnSignup = document.getElementById('btn-signup');
    const btnLogout = document.getElementById('btn-logout');
    const userDisplay = document.getElementById('user-display');
    const navManager = document.getElementById('nav-manager');
    const navAdmin = document.getElementById('nav-admin');

    if (currentUser) {
      hide(btnLogin);
      hide(btnSignup);
      show(btnLogout);
      if (userDisplay) {
        userDisplay.textContent = currentUser.username;
        show(userDisplay);
      }
      if (navManager && currentUser.roles && (currentUser.roles.indexOf('MANAGER') >= 0 || currentUser.roles.indexOf('ADMIN') >= 0)) {
        show(navManager);
      } else if (navManager) { hide(navManager); }
      if (navAdmin && currentUser.roles && currentUser.roles.indexOf('ADMIN') >= 0) {
        show(navAdmin);
      } else if (navAdmin) { hide(navAdmin); }
    } else {
      show(btnLogin);
      show(btnSignup);
      hide(btnLogout);
      hide(userDisplay);
      if (navManager) hide(navManager);
      if (navAdmin) hide(navAdmin);
    }
  }

  function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.remove('hidden');
      showError(id === 'modal-login' ? 'login-error' : 'signup-error', '');
    }
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('hidden');
  }

  document.getElementById('btn-login').addEventListener('click', function () {
    openModal('modal-login');
  });

  document.getElementById('btn-signup').addEventListener('click', function () {
    openModal('modal-signup');
  });

  document.getElementById('btn-logout').addEventListener('click', async function () {
    await fetch(API + '/auth/logout', { method: 'POST', credentials: 'include' });
    currentUser = null;
    updateHeader();
    renderOffers();
  });

  document.querySelectorAll('.modal-close, .modal-backdrop').forEach(function (node) {
    node.addEventListener('click', function () {
      const modal = node.closest('.modal');
      if (modal) closeModal(modal.id);
    });
  });

  document.getElementById('form-login').addEventListener('submit', async function (e) {
    e.preventDefault();
    const form = e.target;
    const username = form.username.value.trim();
    const password = form.password.value;
    showError('login-error', '');
    const res = await post('/auth/login', { username, password });
    if (!res.ok) {
      const data = await res.json().catch(function () { return {}; });
      showError('login-error', data.error || 'Login failed.');
      return;
    }
    const user = await res.json();
    currentUser = user;
    closeModal('modal-login');
    updateHeader();
    renderOffers();
  });

  function validatePassword(pwd) {
    if (!pwd || pwd.length < 6) return 'Password must be at least 6 characters.';
    if (!/[A-Z]/.test(pwd)) return 'Password needs at least one uppercase letter.';
    if (!/[a-z]/.test(pwd)) return 'Password needs at least one lowercase letter.';
    if (!/[0-9]/.test(pwd)) return 'Password needs at least one number.';
    if (!/[!#$%&*()\-_=+[\]{}|;:,.?/~]/.test(pwd)) return 'Password needs at least one symbol (!#$%&*()-_=+[]{}|;:,.?/~).';
    if (/['"\\`<>]/.test(pwd)) return 'Password must not contain quotes, backslash, or angle brackets.';
    return '';
  }

  document.getElementById('form-signup').addEventListener('submit', async function (e) {
    e.preventDefault();
    const form = e.target;
    const username = form.username.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;
    showError('signup-error', '');
    const pwdErr = validatePassword(password);
    if (pwdErr) {
      showError('signup-error', pwdErr);
      return;
    }
    const res = await post('/auth/register', { username, email: email || undefined, password });
    if (!res.ok) {
      const data = await res.json().catch(function () { return {}; });
      showError('signup-error', data.error || 'Registration failed.');
      return;
    }
    currentUser = await res.json();
    closeModal('modal-signup');
    updateHeader();
    renderOffers();
  });

  async function renderOffers() {
    const list = document.getElementById('offers-list');
    const loading = document.getElementById('offers-loading');
    const empty = document.getElementById('offers-empty');
    list.innerHTML = '';
    show(loading);
    hide(empty);

    const res = await get('/offers?size=24');
    const data = await res.json();
    hide(loading);

    const offers = data.content || [];
    if (offers.length === 0) {
      show(empty);
      document.getElementById('stat-offers').textContent = '0';
      return;
    }

    document.getElementById('stat-offers').textContent = offers.length;

    offers.forEach(function (offer) {
      const card = document.createElement('div');
      card.className = 'offer-card';
      const imgUrl = offer.imageUrl || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400';
      card.innerHTML =
        '<div class="offer-card-image" style="background-image:url(\'' + imgUrl + '\')"></div>' +
        '<div class="offer-card-body">' +
          '<h3 class="offer-card-title">' + escapeHtml(offer.title) + '</h3>' +
          (offer.location ? '<p class="offer-card-location">' + escapeHtml(offer.location) + '</p>' : '') +
          '<p class="offer-card-price">' + formatPrice(offer.price) + '</p>' +
          '<button type="button" class="btn-notify ' + (offer.subscribed ? 'subscribed' : '') + '" data-id="' + offer.id + '" data-subscribed="' + !!offer.subscribed + '">' +
            (offer.subscribed ? 'Notifying' : 'Get notified') +
          '</button>' +
        '</div>';
      list.appendChild(card);
    });

    list.querySelectorAll('.btn-notify').forEach(function (btn) {
      btn.addEventListener('click', function () {
        handleNotify(btn);
      });
    });
  }

  function escapeHtml(s) {
    if (!s) return '';
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function formatPrice(n) {
    if (n == null) return '—';
    return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
  }

  async function handleNotify(btn) {
    const id = btn.getAttribute('data-id');
    const subscribed = btn.getAttribute('data-subscribed') === 'true';

    if (!currentUser) {
      alert('Please log in or sign up to get notified about this property.');
      return;
    }

    const res = subscribed
      ? await del('/offers/' + id + '/subscribe')
      : await post('/offers/' + id + '/subscribe');

    if (!res.ok) {
      const data = await res.json().catch(function () { return {}; });
      alert(data.error || 'Action failed.');
      return;
    }

    btn.setAttribute('data-subscribed', subscribed ? 'false' : 'true');
    btn.textContent = subscribed ? 'Get notified' : 'Notifying';
    btn.classList.toggle('subscribed', !subscribed);
  }

  loadCurrentUser().then(function () {
    renderOffers();
    var params = new URLSearchParams(window.location.search);
    if (params.get('login') === '1') {
      openModal('modal-login');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  });
})();
