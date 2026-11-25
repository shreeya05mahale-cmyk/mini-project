/**
 * public/js/inventory.js
 *
 * Client-side script for the Inventory & Asset Registry page.
 * Supports lab filtering, full-text specs search, hardware modal,
 * comprehensive unit ingestion, editing, and deletion for Coordinator & Admin.
 */

let currentPage = 1;
const pageSize = 50;
let totalPagesCount = 1;
let selectedLabGroup = ''; // canonical lab_group name from API or '' for all
let currentAssets = [];    // in-memory store for currently rendered page assets
let currentUser = null;
let canEditInventory = false;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const auth = await API.getCurrentUser();
    currentUser = auth.user;
    canEditInventory = ['COORDINATOR', 'ADMIN'].includes(currentUser.role);
    
    const addBtn = document.getElementById('btn-open-add-asset');
    if (addBtn) {
      addBtn.style.display = canEditInventory ? 'inline-block' : 'none';
    }
  } catch (err) {
    console.error('Failed to get user session:', err);
  }

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

  // Details Modal close handlers
  document.getElementById('modal-close-btn').addEventListener('click', closeModal);
  document.getElementById('asset-modal').addEventListener('click', (e) => {
    if (e.target.id === 'asset-modal') closeModal();
  });

  // Add / Edit Asset Modal Handlers
  const addModal = document.getElementById('add-asset-modal');
  const addBtn = document.getElementById('btn-open-add-asset');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      openCreateAssetModal();
    });
  }

  document.getElementById('add-modal-close-btn').addEventListener('click', () => {
    addModal.style.display = 'none';
  });
  document.getElementById('btn-cancel-add-asset').addEventListener('click', () => {
    addModal.style.display = 'none';
  });
  addModal.addEventListener('click', (e) => {
    if (e.target.id === 'add-asset-modal') addModal.style.display = 'none';
  });

  document.getElementById('add-asset-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleSaveAsset();
  });

  // Lab cards container event delegation
  const pillsContainer = document.getElementById('lab-pills-container');
  if (pillsContainer) {
    pillsContainer.addEventListener('click', (e) => {
      const card = e.target.closest('.lab-card-pill');
      if (!card) return;
      const lab = card.getAttribute('data-lab') || '';
      selectedLabGroup = lab;
      const labSelect = document.getElementById('lab-select');
      if (labSelect) labSelect.value = lab;
      updateLabPillUI();
      currentPage = 1;
      loadAssets();
    });
  }

  // Row click event delegation
  const tbody = document.getElementById('assets-tbody');
  if (tbody) {
    tbody.addEventListener('click', (e) => {
      if (e.target.closest('button')) {
        return;
      }
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

  let html = `
    <div class="lab-card-pill ${selectedLabGroup === '' ? 'active' : ''}" data-lab="">
      <div class="lab-pill-name">All Labs</div>
      <div class="lab-pill-count">${totalAll} PCs</div>
    </div>
  `;

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
      <td colspan="9" style="text-align: center; padding: 24px; color: var(--text-subtle);">
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
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 20px;">No assets found.</td></tr>`;
      return;
    }

    currentAssets = res.assets;
    totalPagesCount = res.totalPages || 1;

    document.getElementById('results-count').textContent =
      `Showing ${res.assets.length} of ${res.total} records`;
    updatePagination(res.page, res.totalPages);

    if (res.assets.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 28px; color: var(--text-subtle);">No matching computers found for the selected filters.</td></tr>`;
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

      const qty = parseInt(a.quantity, 10) || 1;

      let actionsHtml = `<button class="btn btn-secondary btn-sm" onclick="openAssetModalByIndex(${idx})" style="padding: 4px 8px; font-size: 11px;">Details</button>`;
      if (canEditInventory) {
        actionsHtml += `
          <button class="btn btn-secondary btn-sm" title="Edit Asset" onclick="openEditAssetModalByIndex(${idx})" style="padding: 4px 8px; font-size: 11px; margin-left: 4px; color: var(--brand-primary); font-weight: 600;">Edit</button>
          <button class="btn btn-secondary btn-sm btn-delete-asset" title="Remove Asset" onclick="deleteAssetUnit(${a.asset_id}, '${escapeHtml(a.asset_code)}')" style="padding: 4px 6px; font-size: 11px; color: #ef4444; margin-left: 4px;">&times;</button>
        `;
      }

      return `
        <tr class="clickable-row" data-index="${idx}">
          <td style="font-weight: 600; font-family: monospace; color: var(--brand-primary);">${escapeHtml(a.asset_code)}</td>
          <td>${escapeHtml(a.name)}</td>
          <td><span class="role-pill" style="font-size: 11px;">${escapeHtml(a.location)}</span></td>
          <td style="font-size: 12px; font-weight: 500;">${escapeHtml(a.vendor_name || 'KLE Tech Store')}</td>
          <td>${regTag}</td>
          <td style="font-size: 12px; font-weight: 600;">${costDisplay}</td>
          <td>${conditionBadge}</td>
          <td style="text-align: center; font-weight: 700; font-family: monospace; font-size: 13px;">${qty}</td>
          <td style="text-align: right;" onclick="event.stopPropagation();">${actionsHtml}</td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    console.error('Error fetching assets:', err);
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 20px; color: #b91c1c;">Failed to load assets: ${escapeHtml(err.message)}</td></tr>`;
  }
}

function openCreateAssetModal() {
  document.getElementById('add-asset-form').reset();
  document.getElementById('edit-asset-id').value = '';
  document.getElementById('add-modal-title').textContent = '+ Add New Asset Unit to Registry';
  document.getElementById('btn-submit-add-asset').textContent = '+ Save Asset to Registry';
  document.getElementById('add-asset-modal').style.display = 'flex';
}

window.openEditAssetModalByIndex = function(idx) {
  const asset = currentAssets[idx];
  if (!asset) return;

  const spec = asset.specifications || {};

  document.getElementById('edit-asset-id').value = asset.asset_id;
  document.getElementById('add-modal-title').textContent = `Edit Asset Details — ${asset.asset_code}`;
  document.getElementById('btn-submit-add-asset').textContent = 'Update Asset Details';

  document.getElementById('add-name').value = asset.name || '';
  document.getElementById('add-location').value = asset.location || 'Lab 4';
  document.getElementById('add-code').value = asset.asset_code || '';
  document.getElementById('add-qty').value = asset.quantity || 1;
  document.getElementById('add-condition').value = asset.condition || 'GOOD';

  // Specs
  document.getElementById('add-processor').value = spec.processor || '';
  document.getElementById('add-gen').value = spec.generation || '';
  document.getElementById('add-ram').value = spec.ram || '';
  document.getElementById('add-hdd').value = spec.hdd || '';
  document.getElementById('add-monitor').value = spec.monitor || '';
  document.getElementById('add-os').value = spec.os || '';
  document.getElementById('add-licensed').value = (spec.licensed !== false) ? 'true' : 'false';
  document.getElementById('add-antivirus').value = (spec.antivirus !== false) ? 'true' : 'false';

  // Provenance
  document.getElementById('add-vendor').value = asset.vendor_name || '';
  document.getElementById('add-regno').value = asset.register_sl_no || '';
  document.getElementById('add-billno').value = asset.bill_no || '';
  document.getElementById('add-billdate').value = asset.bill_date ? asset.bill_date.split('T')[0] : '';
  document.getElementById('add-cost').value = asset.unit_cost || '';
  document.getElementById('add-remarks').value = spec.remarks || '';

  document.getElementById('add-asset-modal').style.display = 'flex';
};

async function handleSaveAsset() {
  const editId = document.getElementById('edit-asset-id').value;

  const name = document.getElementById('add-name').value.trim();
  const location = document.getElementById('add-location').value;
  const asset_code = document.getElementById('add-code').value.trim();
  const quantity = parseInt(document.getElementById('add-qty').value, 10) || 1;
  const condition = document.getElementById('add-condition').value;
  const unit_cost = parseFloat(document.getElementById('add-cost').value) || 0;
  const vendor_name = document.getElementById('add-vendor').value.trim() || 'KLE Tech University Store';
  const register_sl_no = parseInt(document.getElementById('add-regno').value, 10) || null;
  const bill_no = document.getElementById('add-billno').value.trim() || null;
  const bill_date = document.getElementById('add-billdate').value || null;

  const specifications = {
    processor: document.getElementById('add-processor').value.trim(),
    generation: document.getElementById('add-gen').value.trim(),
    ram: document.getElementById('add-ram').value.trim(),
    hdd: document.getElementById('add-hdd').value.trim(),
    monitor: document.getElementById('add-monitor').value.trim(),
    os: document.getElementById('add-os').value.trim(),
    licensed: document.getElementById('add-licensed').value === 'true',
    antivirus: document.getElementById('add-antivirus').value === 'true',
    remarks: document.getElementById('add-remarks').value.trim()
  };

  const payload = {
    name,
    location,
    asset_code: asset_code || undefined,
    quantity,
    condition,
    unit_cost,
    vendor_name,
    register_sl_no,
    bill_no,
    bill_date,
    specifications
  };

  try {
    let res;
    if (editId) {
      res = await API.put(`/api/assets/${editId}`, payload);
    } else {
      res = await API.post('/api/assets', payload);
    }

    if (res.success) {
      alert(res.message || (editId ? 'Asset updated successfully!' : 'Asset added successfully!'));
      document.getElementById('add-asset-modal').style.display = 'none';
      document.getElementById('add-asset-form').reset();
      await loadAssets();
      await loadSummary();
    } else {
      alert(res.message || 'Failed to save asset.');
    }
  } catch (err) {
    console.error(err);
    alert('Server communication error while saving asset.');
  }
}

window.deleteAssetUnit = async function(assetId, assetCode) {
  if (!confirm(`Are you sure you want to remove ${assetCode} from the registry?`)) {
    return;
  }
  try {
    const res = await API.delete(`/api/assets/${assetId}`);
    if (res.success) {
      await loadAssets();
      await loadSummary();
    } else {
      alert(res.message || 'Failed to delete asset.');
    }
  } catch (err) {
    console.error(err);
    alert('Error deleting asset.');
  }
};

window.openAssetModalByIndex = function(idx) {
  if (currentAssets[idx]) {
    openAssetModal(currentAssets[idx]);
  }
};

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

function closeModal() {
  document.getElementById('asset-modal').style.display = 'none';
}

function debounce(fn, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
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
