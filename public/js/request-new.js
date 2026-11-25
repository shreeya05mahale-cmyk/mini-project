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

    // Populate today's real-time date
    const today = new Date();
    const dateFormatted = today.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    document.getElementById('current-date-display').textContent = dateFormatted;

    // Fetch dynamic upcoming reference number
    await loadNextRef();

    // Start with one clean empty row with placeholders
    addItemRow();

    setupListeners();
  } catch (err) {
    console.error('Failed to initialize requisition form:', err);
  }
});

async function loadNextRef() {
  try {
    const res = await API.get('/api/requests/next-ref');
    if (res.success && res.ref_no) {
      document.getElementById('ref-no-display').textContent = res.ref_no;
    } else {
      document.getElementById('ref-no-display').textContent = 'KLE-TECH/INFOCELL/REQ/2026/001';
    }
  } catch (e) {
    document.getElementById('ref-no-display').textContent = 'KLE-TECH/INFOCELL/REQ/2026/001';
  }
}

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
      <input type="text" class="letter-input input-name" placeholder="e.g. Desktop PC / Network Switch" required value="${escapeHtml(initial.name || '')}">
    </td>
    <td style="border: 1px solid #cbd5e1; padding: 4px;">
      <input type="text" class="letter-input input-spec" placeholder="Processor, RAM, Storage, OS, Display" value="${escapeHtml(initial.spec || '')}">
    </td>
    <td style="text-align: center; border: 1px solid #cbd5e1; padding: 4px;">
      <input type="number" class="letter-input input-qty" min="1" placeholder="Qty" value="${initial.qty || ''}" required style="text-align: center;">
    </td>
    <td style="border: 1px solid #cbd5e1; padding: 4px;">
      <input type="text" class="letter-input input-location" placeholder="e.g. Lab 4" value="${escapeHtml(initial.location || '')}">
    </td>
    <td style="border: 1px solid #cbd5e1; padding: 4px;">
      <input type="text" class="letter-input input-purpose" placeholder="e.g. Lab Practicals" value="${escapeHtml(initial.purpose || '')}">
    </td>
    <td style="border: 1px solid #cbd5e1; padding: 4px;">
      <input type="text" class="letter-input input-isr" placeholder="ISR # / Date (if replacement)" value="${escapeHtml(initial.isr || '')}">
    </td>
    <td style="text-align: center; border: 1px solid #cbd5e1; padding: 2px;">
      <button type="button" class="btn-remove-row" title="Remove Item" onclick="removeItemRow(${itemRowCount})">&times;</button>
    </td>
  `;

  tbody.appendChild(tr);
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
  }
};

function renumberRows() {
  const rows = document.querySelectorAll('#items-tbody tr');
  rows.forEach((r, idx) => {
    const cell = r.querySelector('.row-index-cell');
    if (cell) cell.textContent = idx + 1;
  });
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

    items.push({
      item_name: name,
      specification: spec,
      quantity: qty,
      estimated_price: 0, // Valuation determined by InfoCell Coordinator upon scrutiny
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
      alert(`Requisition submitted successfully and forwarded to InfoCell Coordinator.`);
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
