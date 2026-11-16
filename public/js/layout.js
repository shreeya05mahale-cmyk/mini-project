/**
 * Shared Layout Manager (Engine 4)
 * 
 * Dynamically builds the institutional topbar and role-based sidebar
 * so page templates don't duplicate navigation markup.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // If the page contains #app-container, initialize the layout
  const container = document.getElementById('app-container');
  if (!container) return;

  try {
    // 1. Fetch current user from session
    const authData = await API.getCurrentUser();
    const user = authData.user;

    // 2. Fetch pending notifications for badge counts
    let notifications = { pendingApprovals: 0, pendingDeliveries: 0 };
    try {
      const notifData = await API.get('/api/dashboard/notifications');
      notifications = notifData.notifications || notifications;
    } catch (e) {
      // Non-critical, fall back to 0
    }

    // 3. Render Header
    renderHeader(user);

    // 4. Render Sidebar
    renderSidebar(user, notifications);

  } catch (err) {
    console.error('[Layout Error]', err.message);
    // API.request handles 401 redirect automatically
  }
});

/**
 * Builds the top navigation bar with user profile and sign out
 */
function renderHeader(user) {
  const header = document.createElement('header');
  header.className = 'app-header';

  const deptDisplay = user.dept_name ? ` &bull; ${user.dept_name}` : '';

  header.innerHTML = `
    <div class="header-brand">
      <div class="brand-badge">K</div>
      <div>
        <div class="brand-title">KLE TECH INFOCELL</div>
        <div style="font-size: 11px; color: var(--text-subtle); letter-spacing: 0.5px;">IT Asset & Procurement System</div>
      </div>
    </div>

    <div class="header-user">
      <div class="user-info">
        <div class="user-name">${escapeHtml(user.name)}</div>
        <div class="user-role-dept">
          <span class="role-pill" style="padding: 2px 8px; font-size: 11px;">${escapeHtml(user.role)}</span>
          ${deptDisplay}
        </div>
      </div>
      <button id="signout-btn" class="btn btn-secondary btn-sm" title="Sign out of system">
        Sign Out
      </button>
    </div>
  `;

  document.body.prepend(header);

  // Sign out click handler
  document.getElementById('signout-btn').addEventListener('click', async () => {
    await API.logout();
  });
}

/**
 * Builds the sidebar navigation tailored to the user's role
 */
function renderSidebar(user, notifs) {
  const sidebar = document.createElement('aside');
  sidebar.className = 'app-sidebar';

  const currentPath = window.location.pathname;

  // Master definition of navigation items with role permissions
  const navItems = [
    {
      title: 'Dashboard',
      url: '/index.html',
      roles: ['ADMIN', 'HOD', 'COORDINATOR', 'REGISTRAR', 'VC', 'PC', 'STORE']
    },
    {
      title: 'Purchase Requests',
      url: '/requests.html',
      roles: ['ADMIN', 'HOD', 'COORDINATOR', 'REGISTRAR', 'VC', 'PC']
    },
    {
      title: 'Approvals Inbox',
      url: '/approvals.html',
      roles: ['ADMIN', 'HOD', 'COORDINATOR', 'REGISTRAR', 'VC', 'PC'],
      badge: notifs.pendingApprovals > 0 ? notifs.pendingApprovals : null,
      badgeClass: 'nav-badge-pending'
    },
    {
      title: 'Suppliers',
      url: '/suppliers.html',
      roles: ['ADMIN', 'COORDINATOR']
    },
    {
      title: 'Quotations',
      url: '/quotations.html',
      roles: ['ADMIN', 'COORDINATOR']
    },
    {
      title: 'Purchase Orders',
      url: '/purchase-orders.html',
      roles: ['ADMIN', 'COORDINATOR', 'STORE', 'REGISTRAR', 'VC', 'PC'],
      badge: (user.role === 'STORE' && notifs.pendingDeliveries > 0) ? notifs.pendingDeliveries : null
    },
    {
      title: 'Goods Receipts',
      url: '/goods-receipts.html',
      roles: ['ADMIN', 'STORE']
    },
    {
      title: 'Inventory & Ledger',
      url: '/inventory.html',
      roles: ['ADMIN', 'STORE', 'HOD', 'COORDINATOR']
    },
    {
      title: 'Stock Movements',
      url: '/stock-movements.html',
      roles: ['ADMIN', 'STORE']
    },
    {
      title: 'Reports & Audits',
      url: '/reports.html',
      roles: ['ADMIN', 'REGISTRAR', 'VC', 'PC', 'COORDINATOR', 'STORE', 'HOD']
    },
    {
      title: 'User Management',
      url: '/users.html',
      roles: ['ADMIN']
    }
  ];

  // Filter items matching the current user's role
  const allowedItems = navItems.filter(item => item.roles.includes(user.role));

  let menuHtml = '<div class="nav-section-title">Navigation</div><ul class="nav-menu">';
  allowedItems.forEach(item => {
    const isActive = currentPath === item.url || (item.url === '/index.html' && (currentPath === '/' || currentPath === ''));
    const badgeHtml = item.badge ? `<span class="nav-badge ${item.badgeClass || ''}">${item.badge}</span>` : '';

    menuHtml += `
      <li class="nav-item ${isActive ? 'active' : ''}">
        <a href="${item.url}">
          <span>${escapeHtml(item.title)}</span>
          ${badgeHtml}
        </a>
      </li>
    `;
  });
  menuHtml += '</ul>';

  sidebar.innerHTML = menuHtml;

  // Insert sidebar right after the header
  const header = document.querySelector('.app-header');
  if (header) {
    header.after(sidebar);
  } else {
    document.body.prepend(sidebar);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
