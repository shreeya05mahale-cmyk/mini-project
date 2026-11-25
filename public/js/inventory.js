/**
 * public/js/inventory.js
 *
 * Client-side script for the Inventory & Asset Registry page.
 * Lab filtering uses the canonical lab_group names from the API
 * ('Lab 1', 'Lab 2', ... 'C-Lab 1', 'C-Lab 2') which map to
 * backend SQL CASE expressions in assetController.js.
 */

let currentPage = 1;
const pageSize = 50;
let totalPagesCount = 1;
let selectedLabGroup = ''; // canonical lab_group name from API or '' for all
let currentAssets = [];    // in-memory store for currently rendered page assets

document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await loadSummary();
  await loadAssets();
});

function setupEventListeners() {
  // Search with debounce
  document.getElementById('search-input').addEventListener('input', debounce(() => {
    currentPage = 1;
    loadAssets();
  }, 300));

  // Dropdown lab selector
  document.getElementById('lab-select').addEventListener('change', (e) => {
    selectedLabGroup = e.target.value;
    updateLabPillUI();
    currentPage = 1;
    loadAssets();
  });

  // Condition filter
  document.getElementById('condition-select').addEventListener('change', () => {
    currentPage = 1;
    loadAssets();
  });

  // Reset button
  document.getElementById('reset-btn').addEventListener('click', () => {
    document.getElementById('search-input').value = '';
    document.getElementById('lab-select').value = '';
    document.getElementById('condition-select').value = '';
    selectedLabGroup = '';
    updateLabPillUI();
    currentPage = 1;
    loadAssets();
  });

  // Pagination buttons
  document.getElementById('prev-btn').addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      loadAssets();
    }
  });

  document.getElementById('next-btn').addEventListener('click', () => {
    if (currentPage < totalPagesCount) {
      currentPage++;
      loadAssets();
    }
  });

  // Modal close handlers
  document.getElementById('modal-close-btn').addEventListener('click', closeModal);
  document.getElementById('asset-modal').addEventListener('click', (e) => {
    if (e.target.id === 'asset-modal') closeModal();
  });

  // Lab cards container event delegation
  const pillsContainer = document.getElementById('lab-pills-container');
  if (pillsContainer) {
    pillsContainer.addEventListener('click', (e) => {
      const card = e.target.closest('.lab-card-pill');
      if (!card) return;
      const lab = card.getAttribute('data-lab') || '';
      selectLabPill(lab);
    });
  }

  // Assets table body event delegation (avoids brittle JSON in inline HTML attributes)
  const tbody = document.getElementById('assets-tbody');
  if (tbody) {
    tbody.addEventListener('click', (e) => {
      const row = e.target.closest('.clickable-row');
      if (!row) return;
      const idx = parseInt(row.getAttribute('data-index'), 10);
      if (!isNaN(idx) && currentAssets[idx]) {
        openAssetModal(currentAssets[idx]);
      }
    });
  }
}

async function loadSummary() {
  try {
    const res = await API.get('/api/assets/summary');
    if (res.success && res.summary) {
      document.getElementById('summary-total').textContent = res.summary.total_pcs || 286;
      document.getElementById('summary-working').textContent = res.summary.working_pcs || 286;

      // Render clickable Lab Overview cards using canonical lab_group names
      const labs = (res.byLab || []).filter(l => l.lab_group !== 'Other');
      renderLabPills(labs, res.summary.total_pcs || 286);
    }
  } catch (err) {
    console.error('Failed to load inventory summary:', err);
  }
}

function renderLabPills(labs, totalAll) {
  const container = document.getElementById('lab-pills-container');
  if (!container) return;

  // "All Labs" card
  let html = `
    <div class="lab-card-pill ${selectedLabGroup === '' ? 'active' : ''}" data-lab="">
      <div class="lab-pill-name">All Labs</div>
      <div class="lab-pill-count">${totalAll} PCs</div>
    </div>
  `;

  // Individual lab cards — data-lab stores canonical lab_group name
  labs.forEach(l => {
    const isAct = selectedLabGroup === l.lab_group;
    html += `
      <div class="lab-card-pill ${isAct ? 'active' : ''}" data-lab="${escapeHtml(l.lab_group)}">
        <div class="lab-pill-name">${escapeHtml(l.lab_group)}</div>
        <div class="lab-pill-count">${l.count} PCs</div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function selectLabPill(labGroup) {
  selectedLabGroup = labGroup;

  // Sync dropdown: set to the matching option value or empty
  const labSelect = document.getElementById('lab-select');
  if (labSelect) {
    labSelect.value = labGroup;
  }

  updateLabPillUI();
  currentPage = 1;
  loadAssets();
}
window.selectLabPill = selectLabPill;

function updateLabPillUI() {
  const pills = document.querySelectorAll('.lab-card-pill');
  pills.forEach(p => {
    const pLab = p.getAttribute('data-lab');
    p.classList.toggle('active', pLab === selectedLabGroup);
  });

  const indicator = document.getElementById('active-lab-indicator');
  if (indicator) {
    indicator.textContent = selectedLabGroup ? `Filtered by: ${selectedLabGroup}` : 'Showing: All Labs';
  }
}

async function loadAssets() {
  const tbody = document.getElementById('assets-tbody');
  tbody.innerHTML = `
    <tr>
      <td colspan="8" style="text-align: center; padding: 24px; color: var(--text-subtle);">
        Loading records...
      </td>
    </tr>
  `;

  const lab = selectedLabGroup || document.getElementById('lab-select').value;
  const condition = document.getElementById('condition-select').value;
  const search = document.getElementById('search-input').value.trim();

  const queryParams = new URLSearchParams({ page: currentPage, limit: pageSize });
  if (lab) queryParams.set('lab', lab);
  if (condition) queryParams.set('condition', condition);
  if (search) queryParams.set('search', search);

  try {
    const res = await API.get(`/api/assets?${queryParams.toString()}`);
    if (!res.success || !res.assets) {
      currentAssets = [];
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px;">No assets found.</td></tr>`;
      return;
    }

    currentAssets = res.assets;
    totalPagesCount = res.totalPages || 1;

    document.getElementById('results-count').textContent =
      `Showing ${res.assets.length} of ${res.total} records`;
    updatePagination(res.page, res.totalPages);

    if (res.assets.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 28px; color: var(--text-subtle);">No matching computers found for the selected filters.</td></tr>`;
      return;
    }

    tbody.innerHTML = res.assets.map((a, idx) => {
      const conditionBadge = a.condition === 'GOOD'
        ? `<span class="badge-good">Working</span>`
        : `<span class="badge-damaged">Not Working</span>`;

      const regTag = a.register_sl_no
        ? `<span class="role-pill" style="font-size: 11px; background: #e0e7ff; color: #3730a3; font-weight: 600;">Reg #${a.register_sl_no}</span>`
        : `<span style="color: var(--text-subtle); font-size: 11px;">Legacy</span>`;

      const costDisplay = a.unit_cost
        ? `₹${Number(a.unit_cost).toLocaleString('en-IN')}`
        : '-';

      return `
        <tr class="clickable-row" data-index="${idx}">
          <td style="font-weight: 600; font-family: monospace; color: var(--brand-primary);">${escapeHtml(a.asset_code)}</td>
          <td>${escapeHtml(a.name)}</td>
          <td><span class="role-pill" style="font-size: 11px;">${escapeHtml(a.location)}</span></td>
          <td style="font-size: 12px; font-weight: 500;">${escapeHtml(a.vendor_name || 'KLE Tech Store')}</td>
          <td>${regTag}</td>
          <td style="font-size: 12px; font-weight: 600;">${costDisplay}</td>
          <td>${conditionBadge}</td>
          <td style="text-align: right;">
            <button class="btn btn-secondary btn-sm" style="padding: 4px 10px; font-size: 11px;">Details</button>
          </td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    console.error('Error fetching assets:', err);
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px; color: #b91c1c;">Failed to load assets: ${escapeHtml(err.message)}</td></tr>`;
  }
}

function updatePagination(page, totalPages) {
  totalPagesCount = Math.max(totalPages || 1, 1);
  document.getElementById('page-indicator').textContent = `Page ${page} of ${totalPagesCount}`;
  document.getElementById('prev-btn').disabled = (page <= 1);
  document.getElementById('next-btn').disabled = (page >= totalPagesCount);
}

function openAssetModal(asset) {
  const spec = asset.specifications || {};
  document.getElementById('modal-asset-code').textContent = `${asset.asset_code} — Specifications`;
  document.getElementById('m-name').textContent = asset.name || '-';
  document.getElementById('m-location').textContent = asset.location || '-';
  document.getElementById('m-processor').textContent = spec.processor || '-';
  document.getElementById('m-gen').textContent = spec.generation || '-';
  document.getElementById('m-ram').textContent = [spec.ram, spec.ddr].filter(Boolean).join(' ') || '-';
  document.getElementById('m-hdd').textContent = spec.hdd || '-';
  document.getElementById('m-monitor').textContent = spec.monitor || '-';
  document.getElementById('m-os').textContent = [spec.os, spec.bit].filter(Boolean).join(' ') || '-';
  document.getElementById('m-licensed').textContent = spec.licensed ? '✔ Yes (Licensed)' : '✖ Unlicensed / Freeware';
  document.getElementById('m-antivirus').textContent = spec.antivirus ? '✔ Active Antivirus' : '✖ Not Installed';

  // Register provenance
  document.getElementById('m-vendor').textContent = asset.vendor_name || 'KLE Tech University Store (Legacy)';
  document.getElementById('m-regno').textContent = asset.register_sl_no
    ? `Entry #${asset.register_sl_no} (Inward Stock Register)`
    : 'Pre-system Legacy Record';
  document.getElementById('m-billno').textContent = asset.bill_no || '-';
  const costPart = asset.unit_cost ? `₹${Number(asset.unit_cost).toLocaleString('en-IN')}` : 'N/A';
  const datePart = asset.formatted_bill_date || 'Historical';
  document.getElementById('m-cost').textContent = `${costPart} (${datePart})`;
  document.getElementById('m-remarks').textContent = spec.remarks || asset.condition || '-';

  document.getElementById('asset-modal').style.display = 'flex';
}
window.openAssetModal = openAssetModal;

function closeModal() {
  document.getElementById('asset-modal').style.display = 'none';
}
window.closeModal = closeModal;

function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}
