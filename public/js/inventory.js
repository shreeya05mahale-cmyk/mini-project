/**
 * public/js/inventory.js
 *
 * Client-side script for the Inventory & Asset Registry page.
 */

let currentPage = 1;
const pageSize = 50;
let selectedLabGroup = '';

document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await loadSummary();
  await loadAssets();
});

function setupEventListeners() {
  document.getElementById('search-input').addEventListener('input', debounce(() => {
    currentPage = 1;
    loadAssets();
  }, 350));

  document.getElementById('lab-select').addEventListener('change', (e) => {
    selectedLabGroup = e.target.value;
    updateLabPillUI();
    currentPage = 1;
    loadAssets();
  });

  document.getElementById('condition-select').addEventListener('change', () => {
    currentPage = 1;
    loadAssets();
  });

  document.getElementById('reset-btn').addEventListener('click', () => {
    document.getElementById('search-input').value = '';
    document.getElementById('lab-select').value = '';
    document.getElementById('condition-select').value = '';
    selectedLabGroup = '';
    updateLabPillUI();
    currentPage = 1;
    loadAssets();
  });

  document.getElementById('prev-btn').addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      loadAssets();
    }
  });

  document.getElementById('next-btn').addEventListener('click', () => {
    currentPage++;
    loadAssets();
  });

  document.getElementById('modal-close-btn').addEventListener('click', closeModal);
  document.getElementById('asset-modal').addEventListener('click', (e) => {
    if (e.target.id === 'asset-modal') closeModal();
  });
}

async function loadSummary() {
  try {
    const res = await API.get('/api/assets/summary');
    if (res.success && res.summary) {
      document.getElementById('summary-total').textContent = res.summary.total_pcs || 286;
      document.getElementById('summary-working').textContent = res.summary.working_pcs || 286;
      
      // Render the clickable Lab Overview cards with individual counts
      renderLabPills(res.byLab || [], res.summary.total_pcs || 286);
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
    <div class="lab-card-pill ${selectedLabGroup === '' ? 'active' : ''}" data-lab="" onclick="selectLabPill('')">
      <div class="lab-pill-name">All Labs</div>
      <div class="lab-pill-count">${totalAll} PCs</div>
    </div>
  `;

  // Individual lab cards
  labs.forEach(l => {
    const isAct = selectedLabGroup === l.lab_group;
    html += `
      <div class="lab-card-pill ${isAct ? 'active' : ''}" data-lab="${escapeHtml(l.lab_group)}" onclick="selectLabPill('${escapeHtml(l.lab_group)}')">
        <div class="lab-pill-name">${escapeHtml(l.lab_group)}</div>
        <div class="lab-pill-count">${l.count} PCs</div>
      </div>
    `;
  });

  container.innerHTML = html;
}

window.selectLabPill = function(labGroup) {
  selectedLabGroup = labGroup;
  
  // Sync dropdown
  const labSelect = document.getElementById('lab-select');
  if (labSelect) {
    if (!labGroup) {
      labSelect.value = '';
    } else {
      // Find matching option
      for (let opt of labSelect.options) {
        if (opt.value && opt.value.toLowerCase().includes(labGroup.toLowerCase().replace('-', ''))) {
          labSelect.value = opt.value;
          break;
        }
      }
    }
  }

  updateLabPillUI();
  currentPage = 1;
  loadAssets();
};

function updateLabPillUI() {
  const pills = document.querySelectorAll('.lab-card-pill');
  pills.forEach(p => {
    const pLab = p.getAttribute('data-lab');
    if (pLab === selectedLabGroup) {
      p.classList.add('active');
    } else {
      p.classList.remove('active');
    }
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
      <td colspan="7" style="text-align: center; padding: 24px; color: var(--text-subtle);">
        Loading records...
      </td>
    </tr>
  `;

  const lab = selectedLabGroup || document.getElementById('lab-select').value;
  const condition = document.getElementById('condition-select').value;
  const search = document.getElementById('search-input').value.trim();

  const queryParams = new URLSearchParams({
    page: currentPage,
    limit: pageSize
  });
  if (lab) queryParams.set('lab', lab);
  if (condition) queryParams.set('condition', condition);
  if (search) queryParams.set('search', search);

  try {
    const res = await API.get(`/api/assets?${queryParams.toString()}`);
    if (!res.success || !res.assets) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px;">No assets found.</td></tr>`;
      return;
    }

    document.getElementById('results-count').textContent = `Showing ${res.assets.length} of ${res.total} records`;
    updatePagination(res.page, res.totalPages);

    if (res.assets.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 28px; color: var(--text-subtle);">No matching computers found for the selected filters.</td></tr>`;
      return;
    }

    tbody.innerHTML = res.assets.map(a => {
      const spec = a.specifications || {};
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
        <tr class="clickable-row" onclick="openAssetModal(${escapeJsonAttr(a)})">
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
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #b91c1c;">Failed to load assets: ${escapeHtml(err.message)}</td></tr>`;
  }
}

function updatePagination(page, totalPages) {
  document.getElementById('page-indicator').textContent = `Page ${page} of ${Math.max(totalPages, 1)}`;
  document.getElementById('prev-btn').disabled = (page <= 1);
  document.getElementById('next-btn').disabled = (page >= totalPages);
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
  document.getElementById('m-regno').textContent = asset.register_sl_no ? `Entry #${asset.register_sl_no} (Inward Stock Register)` : 'Pre-system Legacy Record';
  document.getElementById('m-billno').textContent = asset.bill_no || '-';
  const costPart = asset.unit_cost ? `₹${Number(asset.unit_cost).toLocaleString('en-IN')}` : 'N/A';
  const datePart = asset.formatted_bill_date || 'Historical';
  document.getElementById('m-cost').textContent = `${costPart} (${datePart})`;

  document.getElementById('m-remarks').textContent = spec.remarks || asset.condition;

  document.getElementById('asset-modal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('asset-modal').style.display = 'none';
}

function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

function escapeJsonAttr(obj) {
  return JSON.stringify(obj).replace(/"/g, '&quot;');
}
