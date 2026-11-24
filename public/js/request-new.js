/**
 * public/js/request-new.js
 *
 * Client script for HOD Purchase Requisition Letter Template.
 */

let itemRowCount = 0;
let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const auth = await API.getCurrentUser();
    currentUser = auth.user;

    if (currentUser.role !== 'HOD') {
      alert('Institutional Policy: Only Department HODs can initiate purchase requisitions.');
      window.location.href = '/requests.html';
      return;
    }

    // Populate user and departmental labels
    document.getElementById('hod-name-display').textContent = currentUser.name;
    document.getElementById('sign-hod-name').textContent = currentUser.name;
    if (currentUser.dept_name) {
      document.getElementById('dept-name-display').textContent = `Department of ${currentUser.dept_name}`;
    }

    // Populate today's date
    const today = new Date();
    const dateFormatted = today.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    document.getElementById('current-date-display').textContent = dateFormatted;

    // Add initial item rows
    addItemRow({ name: 'Commercial Desktop Workstation', spec: 'Intel Core i7-13700, 16GB DDR5 RAM, 512GB NVMe SSD, 24" FHD IPS Monitor', qty: 5, price: 65000 });

    setupListeners();
    recalculateBudget();
  } catch (err) {
    console.error(err);
  }
});

function setupListeners() {
  document.getElementById('add-item-btn').addEventListener('click', () => addItemRow());

  // Budget calculations
  ['budget-sanctioned', 'budget-spent', 'budget-committed'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', recalculateBudget);
  });

  document.getElementById('request-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await submitRequest();
  });
}

function addItemRow(initial = {}) {
  itemRowCount++;
  const tbody = document.getElementById('items-tbody');

  const tr = document.createElement('tr');
  tr.id = `item-row-${itemRowCount}`;
  tr.innerHTML = `
    <td style="text-align: center; font-weight: 700; color: #64748b;" class="row-index-cell">${itemRowCount}</td>
    <td>
      <input type="text" class="letter-input input-name" placeholder="e.g. Dell OptiPlex 7010" required value="${escapeHtml(initial.name || '')}">
    </td>
    <td>
      <input type="text" class="letter-input input-spec" placeholder="Processor, RAM, Storage, Display" value="${escapeHtml(initial.spec || '')}">
    </td>
    <td style="text-align: center;">
      <input type="number" class="letter-input input-qty" min="1" value="${initial.qty || 1}" required style="text-align: center;">
    </td>
    <td>
      <input type="number" class="letter-input input-price" min="0" step="0.01" placeholder="0.00" value="${initial.price !== undefined ? initial.price : ''}" required style="text-align: right;">
    </td>
    <td style="text-align: right; font-weight: 700; font-family: monospace;" class="line-total-cell">
      ₹0.00
    </td>
    <td style="text-align: center;">
      <button type="button" class="btn-remove-row" title="Remove Item" onclick="removeItemRow(${itemRowCount})">&times;</button>
    </td>
  `;

  tbody.appendChild(tr);

  // Hook input events for dynamic line total recalculation
  const qtyInput = tr.querySelector('.input-qty');
  const priceInput = tr.querySelector('.input-price');

  qtyInput.addEventListener('input', () => recalculateTotals());
  priceInput.addEventListener('input', () => recalculateTotals());

  recalculateTotals();
  renumberRows();
}

window.removeItemRow = function(id) {
  const tbody = document.getElementById('items-tbody');
  if (tbody.children.length <= 1) {
    alert('At least one line item is required in an official requisition.');
    return;
  }
  const row = document.getElementById(`item-row-${id}`);
  if (row) row.remove();
  recalculateTotals();
  renumberRows();
};

function renumberRows() {
  const rows = document.querySelectorAll('#items-tbody tr');
  rows.forEach((r, idx) => {
    const idxCell = r.querySelector('.row-index-cell');
    if (idxCell) idxCell.textContent = idx + 1;
  });
}

function recalculateTotals() {
  const rows = document.querySelectorAll('#items-tbody tr');
  let grandTotal = 0;

  rows.forEach(r => {
    const qty = parseInt(r.querySelector('.input-qty').value, 10) || 0;
    const price = parseFloat(r.querySelector('.input-price').value) || 0;
    const lineTotal = qty * price;
    grandTotal += lineTotal;

    r.querySelector('.line-total-cell').textContent = `₹${lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  });

  document.getElementById('grand-total-display').textContent = `₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  // Update Governing Hierarchy Tier
  const chainEl = document.getElementById('tier-chain-display');
  const badgeEl = document.getElementById('tier-badge-display');

  if (grandTotal <= 50000) {
    chainEl.innerHTML = 'HOD &rarr; <strong>InfoCell Coordinator</strong> &rarr; <strong>Registrar</strong>';
    badgeEl.textContent = 'Tier 1 (≤ ₹50,000)';
    badgeEl.className = 'stamp-badge approved';
  } else if (grandTotal <= 200000) {
    chainEl.innerHTML = 'HOD &rarr; <strong>InfoCell Coordinator</strong> &rarr; <strong>Registrar</strong> &rarr; <strong>Vice Chancellor</strong>';
    badgeEl.textContent = 'Tier 2 (₹50,001 to ₹2,00,000)';
    badgeEl.className = 'stamp-badge pending';
  } else {
    chainEl.innerHTML = 'HOD &rarr; <strong>InfoCell Coordinator</strong> &rarr; <strong>Registrar</strong> &rarr; <strong>Vice Chancellor</strong> &rarr; <strong>Pro Chancellor</strong>';
    badgeEl.textContent = 'Tier 3 (Above ₹2,00,000)';
    badgeEl.className = 'stamp-badge rejected';
  }
}

function recalculateBudget() {
  const sanctioned = parseFloat(document.getElementById('budget-sanctioned').value) || 0;
  const spent = parseFloat(document.getElementById('budget-spent').value) || 0;
  const committed = parseFloat(document.getElementById('budget-committed').value) || 0;

  const available = sanctioned - spent - committed;
  const disp = document.getElementById('budget-available-display');
  disp.textContent = `₹${available.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  if (available < 0) {
    disp.style.color = '#ef4444';
  } else {
    disp.style.color = '#0f172a';
  }
}

async function submitRequest() {
  const submitBtn = document.getElementById('submit-btn');
  const subject = document.getElementById('request-subject').value.trim();
  const justification = document.getElementById('justification').value.trim();

  if (!subject) {
    alert('Please enter a Subject line for the official letter.');
    return;
  }

  const rows = document.querySelectorAll('#items-tbody tr');
  const items = [];

  rows.forEach(r => {
    const name = r.querySelector('.input-name').value.trim();
    const spec = r.querySelector('.input-spec').value.trim();
    const qty = parseInt(r.querySelector('.input-qty').value, 10);
    const price = parseFloat(r.querySelector('.input-price').value);

    if (name && qty > 0) {
      items.push({
        item_name: name,
        specification: spec,
        quantity: qty,
        estimated_price: price
      });
    }
  });

  if (items.length === 0) {
    alert('Please include at least one valid line item with name and quantity.');
    return;
  }

  const budget_details = {
    category: document.getElementById('budget-category').value.trim(),
    head: document.getElementById('budget-head').value.trim(),
    sanctioned: parseFloat(document.getElementById('budget-sanctioned').value) || 0,
    spent: parseFloat(document.getElementById('budget-spent').value) || 0,
    committed: parseFloat(document.getElementById('budget-committed').value) || 0
  };

  submitBtn.disabled = true;
  submitBtn.textContent = 'Endorsing & Submitting...';

  try {
    const res = await API.post('/api/requests', {
      subject,
      justification,
      items,
      budget_details
    });

    if (res.success) {
      alert(`Requisition Submitted Successfully!\n\nReference: KLE-TECH/INFOCELL/REQ/2026/${res.request_id}\nTotal Outlay: ₹${res.total_amount.toLocaleString('en-IN')}\n\nRouted to: InfoCell Coordinator for Technical Scrutiny`);
      window.location.href = `/request-detail.html?id=${res.request_id}`;
    } else {
      alert(`Error: ${res.message}`);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Endorse & Submit Requisition →';
    }
  } catch (err) {
    alert(`Submission error: ${err.message}`);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Endorse & Submit Requisition →';
  }
}
