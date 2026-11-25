/**
 * public/js/request-new.js
 *
 * Client script for InfoCell Procurement Requisition Form.
 * Matches the official university format at https://tinyurl.com/Procurement-Form2026.
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

    // Add initial item row with realistic university computer specs
    addItemRow({
      name: 'HP ProDesk 400 G7 Microtower PC',
      spec: 'Intel Core i5 10th Gen, 8GB DDR4, 1TB HDD, 18.5" Monitor, Win 11 Pro',
      qty: 4,
      price: 45000,
      location: 'Lab 4',
      purpose: 'Lab Upgrades / Practical Exams',
      isr: 'ISR #296 / 15-08-2021'
    });

    setupListeners();
  } catch (err) {
    console.error('Failed to initialize requisition form:', err);
  }
});

function setupListeners() {
  document.getElementById('add-item-btn').addEventListener('click', () => addItemRow());

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
  tr.style.borderBottom = '1px solid #cbd5e1';

  tr.innerHTML = `
    <td style="text-align: center; font-weight: 700; color: #475569; border: 1px solid #cbd5e1; padding: 6px 4px;" class="row-index-cell">
      ${itemRowCount}
    </td>
    <td style="border: 1px solid #cbd5e1; padding: 4px;">
      <input type="text" class="letter-input input-name" placeholder="Material / Equipment name" required value="${escapeHtml(initial.name || '')}">
    </td>
    <td style="border: 1px solid #cbd5e1; padding: 4px;">
      <input type="text" class="letter-input input-spec" placeholder="Processor, RAM, Storage, OS, Monitor" value="${escapeHtml(initial.spec || '')}">
    </td>
    <td style="text-align: center; border: 1px solid #cbd5e1; padding: 4px;">
      <input type="number" class="letter-input input-qty" min="1" value="${initial.qty || 1}" required style="text-align: center;">
    </td>
    <td style="border: 1px solid #cbd5e1; padding: 4px;">
      <input type="number" class="letter-input input-price" min="0" step="0.01" placeholder="0.00" value="${initial.price !== undefined ? initial.price : ''}" required style="text-align: right;">
    </td>
    <td style="text-align: right; font-weight: 700; font-family: monospace; border: 1px solid #cbd5e1; padding: 6px;" class="line-total-cell">
      ₹0.00
    </td>
    <td style="border: 1px solid #cbd5e1; padding: 4px;">
      <input type="text" class="letter-input input-location" placeholder="e.g. Lab 4" value="${escapeHtml(initial.location || '')}">
    </td>
    <td style="border: 1px solid #cbd5e1; padding: 4px;">
      <input type="text" class="letter-input input-purpose" placeholder="e.g. Lab Practicals" value="${escapeHtml(initial.purpose || '')}">
    </td>
    <td style="border: 1px solid #cbd5e1; padding: 4px;">
      <input type="text" class="letter-input input-isr" placeholder="ISR # / Date" value="${escapeHtml(initial.isr || '')}">
    </td>
    <td style="text-align: center; border: 1px solid #cbd5e1; padding: 2px;">
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

window.removeItemRow = function(rowId) {
  const row = document.getElementById(`item-row-${rowId}`);
  if (row) {
    const allRows = document.querySelectorAll('#items-tbody tr');
    if (allRows.length <= 1) {
      alert('Official Policy: Requisition requires at least one equipment item.');
      return;
    }
    row.remove();
    renumberRows();
    recalculateTotals();
  }
};

function renumberRows() {
  const rows = document.querySelectorAll('#items-tbody tr');
  rows.forEach((r, idx) => {
    const cell = r.querySelector('.row-index-cell');
    if (cell) cell.textContent = idx + 1;
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

    const cell = r.querySelector('.line-total-cell');
    if (cell) {
      cell.textContent = `₹${lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  });

  document.getElementById('grand-total-display').textContent = `₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Update Governing Hierarchy Tier preview based on financial thresholds
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

async function submitRequest() {
  const expenditureHead = document.getElementById('expenditure-head').value.trim();
  const justification = document.getElementById('justification').value.trim();

  if (!expenditureHead) {
    alert('Please specify the approximate budget & expenditure head.');
    document.getElementById('expenditure-head').focus();
    return;
  }

  if (!justification) {
    alert('Please enter remarks / justification for the requisition.');
    document.getElementById('justification').focus();
    return;
  }

  const rows = document.querySelectorAll('#items-tbody tr');
  if (rows.length === 0) {
    alert('Please add at least one material/equipment item.');
    return;
  }

  const items = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const name = r.querySelector('.input-name').value.trim();
    const spec = r.querySelector('.input-spec').value.trim();
    const qty = parseInt(r.querySelector('.input-qty').value, 10);
    const price = parseFloat(r.querySelector('.input-price').value);
    const location = r.querySelector('.input-location').value.trim();
    const purpose = r.querySelector('.input-purpose').value.trim();
    const isr = r.querySelector('.input-isr').value.trim();

    if (!name) {
      alert(`Item #${i + 1} requires a valid material / equipment name.`);
      r.querySelector('.input-name').focus();
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      alert(`Item #${i + 1} must have a valid quantity (> 0).`);
      r.querySelector('.input-qty').focus();
      return;
    }
    if (isNaN(price) || price < 0) {
      alert(`Item #${i + 1} requires a non-negative approximate price.`);
      r.querySelector('.input-price').focus();
      return;
    }

    items.push({
      item_name: name,
      specification: spec,
      quantity: qty,
      estimated_price: price,
      location: location,
      purpose: purpose,
      isr_no_and_date: isr
    });
  }

  const subject = `Requisition for ${items[0].item_name}${items.length > 1 ? ` (+${items.length - 1} more items)` : ''} for ${items[0].location || 'CSE Dept'}`;

  const payload = {
    subject: subject,
    justification: justification,
    budget_details: {
      expenditure_head: expenditureHead
    },
    items: items
  };

  const submitBtn = document.getElementById('submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting Requisition...';

  try {
    const res = await API.post('/api/requests', payload);
    if (res.success) {
      alert(`Requisition #${res.request_id} submitted successfully and forwarded to InfoCell Coordinator.`);
      window.location.href = `/request-detail.html?id=${res.request_id}`;
    } else {
      alert(res.message || 'Failed to submit requisition.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Endorse & Submit Requisition →';
    }
  } catch (err) {
    console.error(err);
    alert('Server communication error while submitting requisition.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Endorse & Submit Requisition →';
  }
}
