/**
 * Dashboard Logic (Engine 4)
 * 
 * Loads real-time metrics and recent purchase request activity.
 */

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 1. Load user profile
    const authData = await API.getCurrentUser();
    const user = authData.user;

    // Header greeting with official role title
    const roleTitleMap = {
      'HOD': 'HOD',
      'COORDINATOR': 'Coordinator',
      'REGISTRAR': 'Registrar',
      'VC': 'Vice Chancellor',
      'PC': 'Pro Chancellor',
      'ADMIN': 'Administrator'
    };
    const displayRole = roleTitleMap[user.role] || user.role;
    document.getElementById('welcome-heading').textContent = `Welcome back, ${displayRole}`;

    // For HOD: HOD only originates requests, so hide pending approvals and show department card
    if (user.role === 'HOD') {
      const pendingCard = document.getElementById('stat-card-pending');
      if (pendingCard) pendingCard.style.display = 'none';
      const deptCard = document.getElementById('stat-card-dept');
      if (deptCard) deptCard.style.display = 'block';
    }

    // 2. Load Live Dashboard Stats & Recent Activity
    await loadStats();

  } catch (err) {
    console.error('[Dashboard Error]', err);
  }
});

/**
 * Loads operational stats and recent requests
 */
async function loadStats() {
  try {
    const data = await API.get('/api/dashboard/stats');
    const stats = data.stats;

    // Set stat cards
    document.getElementById('stat-my-approvals').textContent = stats.myPendingApprovals || 0;
    document.getElementById('stat-total-requests').textContent = stats.totalRequests || 0;
    if (document.getElementById('stat-total-assets')) {
      document.getElementById('stat-total-assets').textContent = stats.totalAssets || 286;
    }
    if (document.getElementById('stat-assets-desc')) {
      document.getElementById('stat-assets-desc').textContent = `${stats.totalUnits || 286} physical units in CSE labs`;
    }

    // Render Recent Activity Table
    const tbody = document.getElementById('recent-requests-tbody');
    if (!data.recentRequests || data.recentRequests.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: var(--text-subtle); padding: 32px;">
            No purchase requests initiated yet.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = data.recentRequests.map(r => {
      const statusBadge = getStatusBadge(r.status);
      const amountVal = parseFloat(r.total_amount);
      const formattedAmount = (isNaN(amountVal) || amountVal <= 0)
        ? `<span style="color: var(--text-subtle); font-style: italic; font-size: 12px;">Pending Scrutiny</span>`
        : `₹${amountVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

      return `
        <tr>
          <td><strong style="color: var(--brand-primary); font-family: monospace;">#REQ-${String(r.request_id).padStart(3, '0')}</strong></td>
          <td>${escapeHtml(r.dept_name)}</td>
          <td>${escapeHtml(r.requested_by_name)}</td>
          <td>${formattedAmount}</td>
          <td style="color: var(--text-subtle); font-size: 12px;">${escapeHtml(r.formatted_date)}</td>
          <td>${statusBadge}</td>
          <td style="text-align: right;">
            <a href="/request-detail.html?id=${r.request_id}" class="btn btn-secondary btn-sm" style="padding: 4px 10px; font-size: 11px;">
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

function getStatusBadge(status) {
  switch (status) {
    case 'UNDER_APPROVAL':
      return `<span class="badge badge-pending">Under Approval</span>`;
    case 'APPROVED':
      return `<span class="badge badge-approved">Approved</span>`;
    case 'ORDERED':
      return `<span class="badge badge-ordered">Approved</span>`;
    case 'COMPLETED':
      return `<span class="badge badge-completed">Approved</span>`;
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
