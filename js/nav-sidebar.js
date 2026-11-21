// ==========================================
// TMS Sidebar Navigation
// Loads partials/nav-sidebar.html into #tms-nav-root, then wires up all behaviour.
// NOTE: fetch() does not work on file:// URLs. Serve the project via a local
// dev server (e.g. VS Code Live Server or `npx serve`).
// ==========================================
(function () {
  'use strict';

  // ---------- Configuration (easy to change later) ----------
  const CONFIG = {
    loginUrl: '/admin-login.html',               // logout redirect target
    authStorageKeys: ['tms_token', 'tms_user'], // frontend auth state cleared on logout
    collapsedStorageKey: 'tms_sidebar_collapsed',
    mobileBreakpoint: 768,                      // px: below this the sidebar is a drawer
    defaultPage: 'dashboard.html',              // fallback when a page has no mapping
    endMarker: '<!-- TMS-NAV-END -->',          // everything after this in the partial is discarded
  };

  // Page file -> navbar title
  const PAGE_TITLES = {
    'dashboard.html': 'Dashboard',
    'trips.html': 'Trip Management',
    'vehicles.html': 'Vehicle Management',
    'drivers.html': 'Driver Management',
    'customers.html': 'Customer Management',
    'invoices.html': 'Invoice Management',
    'payroll.html': 'Payroll Management',
    'reports.html': 'Reports',
    'setting.html': 'Settings',
  };

  // The template page and site root are treated as the Dashboard
  const PAGE_ALIASES = { 'admin-template.html': 'dashboard.html', 'index.html': 'dashboard.html', '': 'dashboard.html' };

  // Elements that must exist after the partial is injected
  const REQUIRED_IDS = [
    'tms-sidebar', 'tms-sidebar-close', 'tms-backdrop', 'tms-navbar', 'tms-sidebar-toggle',
    'tms-page-title', 'tms-profile', 'tms-profile-btn', 'tms-profile-menu', 'tms-my-profile',
    'tms-logout-btn', 'tms-logout-modal', 'tms-logout-cancel', 'tms-logout-confirm',
  ];

  const body = document.body;
  const $ = (id) => document.getElementById(id);
  const isMobile = () => window.innerWidth < CONFIG.mobileBreakpoint;
  const isTablet = () => window.innerWidth >= CONFIG.mobileBreakpoint && window.innerWidth < 1024;

  // ==========================================
  // Load Common Navigation
  // 1. fetch the partial  2. strip anything a dev server appended
  // 3. inject into the mount point  4. verify  5. initialise
  // ==========================================
  async function loadNavigation() {
    const root = $('tms-nav-root');
    if (!root) {
      console.error('[TMS] Navigation mount point #tms-nav-root was not found in this page.');
      return;
    }

    const url = root.dataset.partial || 'partials/nav-sidebar.html';
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + res.statusText);
      let html = await res.text();

      // Dev servers (e.g. Live Server) inject a reload <script> into HTML files.
      // Cut the partial at our end marker so injected code never reaches the DOM.
      const end = html.indexOf(CONFIG.endMarker);
      if (end !== -1) html = html.slice(0, end);
      else console.warn('[TMS] End marker not found in ' + url + '. The partial may be incomplete.');

      root.innerHTML = html;
    } catch (err) {
      console.error(
        '[TMS] The common navigation component could not be loaded from "' + url + '". ' +
        'Check the path and serve the project over http:// (not file://).', err
      );
      return;
    }

    // Verify the markup is complete before wiring anything up
    const missing = REQUIRED_IDS.filter((id) => !$(id));
    if (missing.length) {
      console.error('[TMS] Navigation markup is incomplete. Missing elements: #' + missing.join(', #'));
      return;
    }

    initNavigation();
  }

  // ==========================================
  // Navigation Initialization
  // Each step runs on its own so one failure cannot stop the others.
  // ==========================================
 function initNavigation() {
  [
    initSidebar,
    initMobileSidebar,
    setActiveModule,
    setNavbarTitle,
    initProfileDropdown,
    initNotifications, // NEW: Notification functionality
    initLogoutModal,
    initGlobalKeys
  ].forEach((step) => {
    try {
      step();
    } catch (err) {
      console.error('[TMS] ' + step.name + ' failed:', err);
    }
  });

  document.dispatchEvent(new CustomEvent('tms:nav-ready'));
}

  // ==========================================
  // Sidebar Initialization (expand / collapse)
  // ==========================================
  function initSidebar() {
    // Restore saved preference; tablets default to collapsed
    let saved = null;
    try { saved = localStorage.getItem(CONFIG.collapsedStorageKey); } catch (e) { /* storage unavailable */ }
    body.classList.toggle('tms-collapsed', saved === null ? isTablet() : saved === 'true');

    // ==========================================
    // Sidebar Toggle
    // One button, two behaviours depending on viewport
    // ==========================================
    $('tms-sidebar-toggle').addEventListener('click', () => {
      if (isMobile()) toggleMobileSidebar();
      else toggleCollapsed();
    });

    // 17/11 START: Added event listener for the new desktop toggle arrow in the sidebar header
    const desktopToggle = $('tms-sidebar-toggle-desktop');
    if (desktopToggle) {
      desktopToggle.addEventListener('click', () => toggleCollapsed());
    }
    // 17/11 END

    syncToggleState();
    window.addEventListener('resize', onResize);
  }

  function toggleCollapsed(force) {
    const next = typeof force === 'boolean' ? force : !body.classList.contains('tms-collapsed');
    body.classList.toggle('tms-collapsed', next);
    try { localStorage.setItem(CONFIG.collapsedStorageKey, String(next)); } catch (e) { /* ignore */ }
    syncToggleState();
  }

  function syncToggleState() {
    const toggle = $('tms-sidebar-toggle');
    if (!toggle) return;
    const expanded = isMobile()
      ? body.classList.contains('tms-mobile-open')
      : !body.classList.contains('tms-collapsed');
    toggle.setAttribute('aria-expanded', String(expanded));
  }

  function onResize() {
    // Leaving the mobile layout: reset the drawer state
    if (!isMobile()) closeMobileSidebar();
    syncToggleState();
  }

  // ==========================================
  // Mobile Sidebar Behaviour
  // ==========================================
  function initMobileSidebar() {
    $('tms-backdrop').addEventListener('click', closeMobileSidebar);
    $('tms-sidebar-close').addEventListener('click', closeMobileSidebar);

    // Close the drawer after choosing a module
    document.querySelectorAll('#tms-sidebar .tms-link').forEach((link) => {
      link.addEventListener('click', () => { if (isMobile()) closeMobileSidebar(); });
    });
  }

  function openMobileSidebar() {
    body.classList.add('tms-mobile-open');
    syncToggleState();
    $('tms-sidebar-close').focus();
  }

  function closeMobileSidebar() {
    if (!body.classList.contains('tms-mobile-open')) return;
    body.classList.remove('tms-mobile-open');
    syncToggleState();
  }

  function toggleMobileSidebar() {
    if (body.classList.contains('tms-mobile-open')) closeMobileSidebar();
    else openMobileSidebar();
  }

  // ==========================================
  // Active Module Detection
  // ==========================================
  function getCurrentPage() {
    const file = (location.pathname.split('/').pop() || '').toLowerCase();
    return PAGE_ALIASES[file] || file;
  }

  function setActiveModule() {
    const current = getCurrentPage();
    document.querySelectorAll('#tms-sidebar .tms-link').forEach((link) => {
      const active = link.dataset.page === current;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  // ==========================================
  // Navbar Initialization (dynamic title)
  // ==========================================
  function setNavbarTitle() {
    const title = PAGE_TITLES[getCurrentPage()] || PAGE_TITLES[CONFIG.defaultPage];
    $('tms-page-title').textContent = title;
  }

  // ==========================================
  // Admin Profile Dropdown
  // ==========================================
  function initProfileDropdown() {
    $('tms-profile-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      if (isProfileOpen()) closeProfileDropdown();
      else openProfileDropdown();
    });

    // My Profile is a placeholder for now (no page yet)
    $('tms-my-profile').addEventListener('click', closeProfileDropdown);

    // Logout closes the dropdown, then asks for confirmation
    $('tms-logout-btn').addEventListener('click', () => {
      closeProfileDropdown();
      openLogoutModal();
    });

    // Outside click closes the dropdown
    document.addEventListener('click', (e) => {
      if (isProfileOpen() && !$('tms-profile').contains(e.target)) closeProfileDropdown();
    });
  }

  const isProfileOpen = () => !$('tms-profile-menu').hidden;

  function openProfileDropdown() {
    $('tms-profile-menu').hidden = false;
    $('tms-profile-btn').setAttribute('aria-expanded', 'true');
  }

  function closeProfileDropdown() {
    $('tms-profile-menu').hidden = true;
    $('tms-profile-btn').setAttribute('aria-expanded', 'false');
  }



// ==========================================
// Notification Dropdown - Click Only
// ==========================================
function initNotifications() {
  const wrapper = $('tms-notifications');
  const button = $('tms-notification-btn');
  const panel = $('tms-notification-panel');
  const count = $('tms-notification-count');
  const subtitle = $('tms-notification-subtitle');
  const markAllRead = $('tms-mark-all-read');

  if (!wrapper || !button || !panel || !count) return;

  const getNotifications = () =>
    Array.from(panel.querySelectorAll('[data-notification]'));

  function updateCount() {
    const unread = getNotifications().filter(item =>
      item.classList.contains('is-unread')
    ).length;

    count.textContent = unread;
    count.hidden = unread === 0;
    count.setAttribute('aria-label', `${unread} unread notifications`);

    if (subtitle) {
      subtitle.textContent = unread
        ? `You have ${unread} unread notifications`
        : "You're all caught up!";
    }
  }

  function openPanel() {
    if (!panel.hidden) return;

    panel.hidden = false;
    button.setAttribute('aria-expanded', 'true');

    // Allow the browser to apply the initial animation state
    requestAnimationFrame(() => {
      panel.classList.add('is-visible');
    });
  }

  function closePanel() {
    if (panel.hidden) return;

    panel.classList.remove('is-visible');
    button.setAttribute('aria-expanded', 'false');

    // Wait for closing transition before hiding
    const finishClose = () => {
      panel.hidden = true;
      panel.removeEventListener('transitionend', finishClose);
    };

    panel.addEventListener('transitionend', finishClose);

    // Fallback in case transitionend does not fire
    setTimeout(() => {
      if (!panel.classList.contains('is-visible')) {
        panel.hidden = true;
      }
      panel.removeEventListener('transitionend', finishClose);
    }, 220);
  }

  // Toggle only on click
  button.addEventListener('click', (e) => {
    e.stopPropagation();

    if (panel.hidden) {
      openPanel();
    } else {
      closePanel();
    }
  });

  // Mark all notifications as read
  if (markAllRead) {
    markAllRead.addEventListener('click', () => {
      getNotifications().forEach(item =>
        item.classList.remove('is-unread')
      );
      updateCount();
    });
  }

  // Mark individual notifications as read
  getNotifications().forEach(item => {
    item.setAttribute('tabindex', '0');
    item.setAttribute('role', 'button');

    function markRead() {
      item.classList.remove('is-unread');
      updateCount();
    }

    item.addEventListener('click', markRead);

    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        markRead();
      }
    });
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) {
      closePanel();
    }
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) {
      closePanel();
      button.focus();
    }
  });

  updateCount();
}

  
  // ==========================================
  // Logout Confirmation
  // ==========================================
  let lastFocused = null;

  function initLogoutModal() {
    $('tms-logout-cancel').addEventListener('click', closeLogoutModal);
    $('tms-logout-confirm').addEventListener('click', confirmLogout);
    document.querySelectorAll('[data-close-modal]').forEach((el) => el.addEventListener('click', closeLogoutModal));

    // Keep Tab focus inside the modal while it is open
    $('tms-logout-modal').addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const focusables = $('tms-logout-modal').querySelectorAll('button');
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  const isLogoutModalOpen = () => !$('tms-logout-modal').hidden;

  function openLogoutModal() {
    lastFocused = document.activeElement;
    $('tms-logout-modal').hidden = false;
    $('tms-logout-cancel').focus();
  }

  function closeLogoutModal() {
    $('tms-logout-modal').hidden = true;
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  function confirmLogout() {
    // Frontend-only: clear any stored auth/session state
    CONFIG.authStorageKeys.forEach((key) => {
      try { localStorage.removeItem(key); sessionStorage.removeItem(key); } catch (e) { /* ignore */ }
    });
    redirectToLogin();
  }

  // ==========================================
  // Redirect to Admin Login
  // ==========================================
  function redirectToLogin() {
    window.location.href = CONFIG.loginUrl;
  }

  // ==========================================
  // Global Keyboard Handling (Escape)
  // Closes the top-most layer first: modal > dropdown > mobile drawer
  // ==========================================
  function initGlobalKeys() {
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (isLogoutModalOpen()) closeLogoutModal();
      else if (isProfileOpen()) { closeProfileDropdown(); $('tms-profile-btn').focus(); }
      else closeMobileSidebar();
    });
  }

  // ==========================================
  // Bootstrap
  // ==========================================
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadNavigation);
  else loadNavigation();
})();