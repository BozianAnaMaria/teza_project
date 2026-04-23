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
      var roles = getRoleNames(currentUser.roles);
      if (navManager && (roles.indexOf('MANAGER') >= 0 || roles.indexOf('ADMIN') >= 0)) {
        show(navManager);
      } else if (navManager) { hide(navManager); }
      if (navAdmin && roles.indexOf('ADMIN') >= 0) {
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

  // Contact form modal
  const btnContactForm = document.getElementById('btn-contact-form');
  if (btnContactForm) {
    btnContactForm.addEventListener('click', function () {
      openModal('modal-contact');
    });
  }

  // Modal switching
  document.getElementById('switch-to-signup').addEventListener('click', function (e) {
    e.preventDefault();
    closeModal('modal-login');
    openModal('modal-signup');
  });

  document.getElementById('switch-to-login').addEventListener('click', function (e) {
    e.preventDefault();
    closeModal('modal-signup');
    openModal('modal-login');
  });

  document.querySelectorAll('.modal-close, .modal-backdrop').forEach(function (node) {
    node.addEventListener('click', function () {
      const modal = node.closest('.modal');
      if (modal) closeModal(modal.id);
    });
  });

  function getRoleNames(roles) {
    if (!roles || !Array.isArray(roles)) return [];
    return roles.map(function (r) { return typeof r === 'string' ? r : (r && r.name ? r.name : String(r)); });
  }

  document.getElementById('form-login').addEventListener('submit', async function (e) {
    e.preventDefault();
    const form = e.target;
    const username = form.username.value.trim();
    const password = form.password.value;
    showError('login-error', '');
    let res;
    try {
      res = await post('/auth/login', { username, password });
    } catch (err) {
      showError('login-error', 'Something went wrong. Please try again.');
      return;
    }
    if (!res.ok) {
      const data = await res.json().catch(function () { return {}; });
      showError('login-error', data.error || 'Incorrect username or password. Please try again.');
      return;
    }

    // Login succeeded, load the current user from the session
    const user = await loadCurrentUser().catch(function () { return null; });
    if (!user || !user.username) {
      showError('login-error', 'Something went wrong. Please try again.');
      return;
    }

    closeModal('modal-login');
    // Header already updated by loadCurrentUser
    var params = new URLSearchParams(window.location.search);
    var next = params.get('next');
    var roleNames = getRoleNames(user.roles);
    var isAdmin = roleNames.indexOf('ADMIN') >= 0;
    var isManager = roleNames.indexOf('MANAGER') >= 0;
    // Redirect to requested page if they came from /manager or /admin
    if (next === '/admin' && isAdmin) {
      window.location.href = '/admin';
      return;
    }
    if (next === '/manager' && (isManager || isAdmin)) {
      window.location.href = '/manager';
      return;
    }
    // Otherwise redirect by role: admin -> /admin, manager -> /manager
    if (isAdmin) {
      window.location.href = '/admin';
      return;
    }
    if (isManager) {
      window.location.href = '/manager';
      return;
    }
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
      showError('signup-error', data.error || 'Something went wrong. Please try again.');
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
    const isOffersPage = document.body && document.body.getAttribute('data-page') === 'offers';

    list.innerHTML = '';
    show(loading);
    hide(empty);

    const res = await get('/offers?size=24');
    const data = await res.json();
    hide(loading);

    const offers = data.content || [];
    if (offers.length === 0) {
      show(empty);
      var statEl = document.getElementById('stat-offers');
      if (statEl) statEl.textContent = '0';
      var statAboutEl = document.getElementById('stat-about-offers');
      if (statAboutEl) statAboutEl.textContent = '0';
      return;
    }

    var statEl = document.getElementById('stat-offers');
    if (statEl) {
      statEl.textContent = offers.length;
    }
    var statAboutEl = document.getElementById('stat-about-offers');
    if (statAboutEl) {
      statAboutEl.textContent = offers.length;
    }

    offers.forEach(function (offer) {
      const card = document.createElement('div');
      card.className = 'offer-card';
      const imgUrl = offer.imageUrl || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400';

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
          var style = label.color ? ' style="background-color:' + label.color + ';color:white;"' : '';
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

    // Attach event handlers for View more buttons
    list.querySelectorAll('.btn-view-more').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var offerData = JSON.parse(btn.getAttribute('data-offer'));
        openOfferModal(offerData);
      });
    });

    // Attach event handlers for notify buttons
    list.querySelectorAll('.btn-notify').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!currentUser) {
          openModal('modal-signup');
          return;
        }
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

  // Make this function globally accessible
  window.openOfferModal = function(offer) {
    const modal = document.getElementById('modal-offer-details');
    if (!modal) return;

    // Populate modal content
    document.getElementById('offer-modal-title').textContent = offer.title || '';
    document.getElementById('offer-modal-location').textContent = offer.location || 'N/A';
    document.getElementById('offer-modal-price').textContent = formatPrice(offer.price);
    document.getElementById('offer-modal-category').textContent = offer.category || 'N/A';
    document.getElementById('offer-modal-description').textContent = offer.description || 'No description available.';

    const imgUrl = offer.imageUrl || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800';
    document.getElementById('offer-modal-image').style.backgroundImage = 'url(\'' + imgUrl + '\')';

    // Build labels
    var labelsContainer = document.getElementById('offer-modal-labels');
    if (offer.labels && offer.labels.length > 0) {
      labelsContainer.innerHTML = offer.labels.map(function(label) {
        var style = label.color ? ' style="background-color:' + label.color + ';color:white;"' : '';
        return '<span class="offer-label"' + style + '>' + escapeHtml(label.name) + '</span>';
      }).join('');
      labelsContainer.classList.remove('hidden');
    } else {
      labelsContainer.classList.add('hidden');
    }

    openModal('modal-offer-details');
  };

  async function handleNotify(btn) {
    const id = btn.getAttribute('data-id');
    const subscribed = btn.getAttribute('data-subscribed') === 'true';

    if (!currentUser) {
      openModal('modal-signup');
      return;
    }

    const res = subscribed
      ? await del('/offers/' + id + '/subscribe')
      : await post('/offers/' + id + '/subscribe');

    if (!res.ok) {
      const data = await res.json().catch(function () { return {}; });
      alert(data.error || 'Something went wrong. Please try again.');
      return;
    }

    btn.setAttribute('data-subscribed', subscribed ? 'false' : 'true');
    btn.textContent = subscribed ? 'Get notified' : 'Notifying';
    btn.classList.toggle('subscribed', !subscribed);
  }

  // Contact form handler
  const contactForm = document.getElementById('form-contact');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const form = e.target;
      const name = form.name.value.trim();
      const email = form.email.value.trim();
      const phone = form.phone.value.trim();
      const subject = form.subject.value.trim();
      const message = form.message.value.trim();

      showError('contact-error', '');
      const successEl = document.getElementById('contact-success');
      if (successEl) successEl.classList.add('hidden');

      if (!name || !email || !subject || !message) {
        showError('contact-error', 'Please fill in all required fields.');
        return;
      }

      // Simulate sending message (no backend endpoint yet)
      console.log('Contact form submitted:', { name, email, phone, subject, message });

      // Show success message
      if (successEl) {
        successEl.classList.remove('hidden');
      }

      // Reset form
      form.reset();

      // Close modal and hide success message after 3 seconds
      setTimeout(function () {
        if (successEl) successEl.classList.add('hidden');
        closeModal('modal-contact');
      }, 3000);
    });
  }

  loadCurrentUser().then(function () {
    renderOffers();
    var params = new URLSearchParams(window.location.search);
    if (params.get('login') === '1') {
      openModal('modal-login');
      // Keep ?login=1&next= in URL so we can redirect after login
    }
  });
})();
