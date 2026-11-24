/**
 * Dashboard Logic (Engine 4)
 * 
 * Loads real-time metrics, dynamic notification banners,
 * role-specific quick actions, and recent activity.
 */

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 1. Load user profile
    const authData = await API.getCurrentUser();
    const user = authData.user;

    // Personalize header
    document.getElementById('welcome-heading').textContent = `Welcome back, ${user.name.split(' ')[0]}`;
    document.getElementById('welcome-subtext').textContent = 
      `Logged in as ${user.role} ${user.dept_name ? `(${user.dept_name})` : ''} • KLE Tech University`;

    // 2. Setup Role Quick Actions
    setupQuickActions(user);

    // 3. Load Live Dashboard Stats & Recent Activity
    await loadStats();

    // 4. Load Live Notification Banners
    await loadNotifications();

  } catch (err) {
    console.error('[Dashboard Error]', err);
  }
});

/**
 * Injects role-specific shortcut buttons
 */
function setupQuickActions(user) {
  const headerActions = document.getElementById('header-actions');
  const quickActionsBar = document.getElementById('quick-actions-bar');

  const actions = [];

  if (user.role === 'HOD') {
    headerActions.innerHTML = `
      <a href="/request-new.html" class="btn btn-primary">
        + New Purchase Request
      </a>
    `;
    actions.push({ label: '+ New Purchase Request', url: '/request-new.html', primary: true });
    actions.push({ label: 'My Department Requests', url: '/requests.html' });
    actions.push({ label: 'Department Inventory', url: '/inventory.html' });
  } else if (user.role === 'COORDINATOR') {
    actions.push({ label: 'Review Approvals Inbox', url: '/approvals.html', primary: true });
    actions.push({ label: 'Compare Quotations', url: '/quotations.html' });
    actions.push({ label: 'Manage Suppliers', url: '/suppliers.html' });
    actions.push({ label: 'Issue Purchase Order', url: '/purchase-orders.html' });
  } else if (['REGISTRAR', 'VC', 'PC'].includes(user.role)) {
    actions.push({ label: 'Open Approvals Inbox', url: '/approvals.html', primary: true });
    actions.push({ label: 'Procurement Reports', url: '/reports.html' });
    actions.push({ label: 'All Purchase Requests', url: '/requests.html' });
  } else if (user.role === 'STORE') {
    headerActions.innerHTML = `
      <a href="/goods-receipts.html" class="btn btn-primary">
        + Record Goods Delivery
      </a>
    `;
    actions.push({ label: '+ Record Goods Delivery', url: '/goods-receipts.html', primary: true });
    actions.push({ label: 'Issue / Transfer Stock', url: '/stock-movements.html' });
    actions.push({ label: 'Asset Inventory & ISR Tags', url: '/inventory.html' });
  } else if (user.role === 'ADMIN') {
    actions.push({ label: 'User & Role Management', url: '/users.html', primary: true });
    actions.push({ label: 'All Purchase Requests', url: '/requests.html' });
    actions.push({ label: 'Inventory & Stock Ledger', url: '/inventory.html' });
    actions.push({ label: 'Audit Reports', url: '/reports.html' });
  }

  quickActionsBar.innerHTML = actions.map(a => `
    <a href="${a.url}" class="btn ${a.primary ? 'btn-primary' : 'btn-secondary'} btn-sm">
      ${escapeHtml(a.label)}
    </a>
  `).join('');
}

/**
 * Loads operational stats and recent requests
 */
async function loadStats() {
  try {
    const data = await API.get('/api/dashboard/stats');
    const stats = data.stats;

    // Animate / Set stat cards
    document.getElementById('stat-my-approvals').textContent = stats.myPendingApprovals;
    document.getElementById('stat-total-requests').textContent = stats.totalRequests;
    document.getElementById('stat-active-pos').textContent = stats.activePOs;
    document.getElementById('stat-total-assets').textContent = stats.totalAssets;
    document.getElementById('stat-assets-desc').textContent = `${stats.totalUnits} total physical units tracked`;

    // Render Recent Activity Table
    const tbody = document.getElementById('recent-requests-tbody');
    if (!data.recentRequests || data.recentRequests.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: var(--text-subtle); padding: 24px;">
            No purchase requests found.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = data.recentRequests.map(r => {
      const statusBadge = getStatusBadge(r.status);
      const formattedAmount = `₹${Number(r.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

      return `
        <tr>
          <td><strong style="color: var(--brand-primary);">#${r.request_id}</strong></td>
          <td>${escapeHtml(r.dept_name)}</td>
          <td>${escapeHtml(r.requested_by_name)}</td>
          <td><strong>${formattedAmount}</strong></td>
          <td style="color: var(--text-subtle);">${escapeHtml(r.formatted_date)}</td>
          <td>${statusBadge}</td>
          <td>
            <a href="/request-detail.html?id=${r.request_id}" class="link" style="font-size: 13px;">
              View Details &rarr;
            </a>
          </td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

/**
 * Loads live on-the-fly notification alert banners
 */
async function loadNotifications() {
  try {
    const notifData = await API.get('/api/dashboard/notifications');
    const container = document.getElementById('notifications-container');

    if (notifData.notifications && notifData.notifications.messages.length > 0) {
      container.style.display = 'block';
      container.innerHTML = notifData.notifications.messages.map(m => {
        let borderLeft = 'var(--brand-primary)';
        let btnText = 'Review Now';
        let btnUrl = '/approvals.html';
        let btnClass = 'btn-primary';

        if (m.type === 'REQUEST_REJECTED') {
          borderLeft = '#ef4444';
          btnText = 'View Rejection Letter';
          btnUrl = `/request-detail.html?id=${m.requestId}`;
          btnClass = 'btn-secondary';
        } else if (m.type === 'REQUEST_UPDATE') {
          borderLeft = '#10b981';
          btnText = 'View Letter';
          btnUrl = `/request-detail.html?id=${m.requestId}`;
          btnClass = 'btn-secondary';
        }

        return `
          <div style="background: var(--surface); border: 1px solid var(--border); border-left: 4px solid ${borderLeft}; border-radius: 12px; padding: 14px 18px; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
            <div style="font-size: 13.5px; font-weight: 600; color: var(--text-main); max-width: 80%;">
              ${escapeHtml(m.text)}
            </div>
            <a href="${btnUrl}" class="btn ${btnClass} btn-sm" style="height: 30px; font-size: 12px; white-space: nowrap;">
              ${btnText}
            </a>
          </div>
        `;
      }).join('');
    }
  } catch (err) {
    console.error('Failed to load notifications:', err);
  }
}

function getStatusBadge(status) {
  switch (status) {
    case 'UNDER_APPROVAL':
      return `<span class="badge badge-pending">Under Approval</span>`;
    case 'APPROVED':
      return `<span class="badge badge-approved">Approved</span>`;
    case 'ORDERED':
      return `<span class="badge badge-ordered">PO Issued</span>`;
    case 'COMPLETED':
      return `<span class="badge badge-completed">Completed</span>`;
    case 'REJECTED':
      return `<span class="badge badge-rejected">Rejected</span>`;
    default:
      return `<span class="badge">${escapeHtml(status)}</span>`;
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
