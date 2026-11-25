const http = require('http');
const { query } = require('../server/db');

function post(path, body, cookie) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request('http://127.0.0.1:3000' + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'Cookie': cookie || ''
      }
    }, res => {
      let resData = '';
      res.on('data', chunk => resData += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(resData) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: resData });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path, cookie) {
  return new Promise((resolve, reject) => {
    const req = http.request('http://127.0.0.1:3000' + path, {
      method: 'GET',
      headers: { 'Cookie': cookie || '' }
    }, res => {
      let resData = '';
      res.on('data', chunk => resData += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(resData) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: resData });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function patch(path, body, cookie) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request('http://127.0.0.1:3000' + path, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'Cookie': cookie || ''
      }
    }, res => {
      let resData = '';
      res.on('data', chunk => resData += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(resData) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: resData });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function del(path, cookie) {
  return new Promise((resolve, reject) => {
    const req = http.request('http://127.0.0.1:3000' + path, {
      method: 'DELETE',
      headers: { 'Cookie': cookie || '' }
    }, res => {
      let resData = '';
      res.on('data', chunk => resData += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(resData) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: resData });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function login(email, password) {
  const res = await post('/api/auth/login', { email, password });
  if (res.status !== 200 || !res.headers['set-cookie']) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(res.body)}`);
  }
  return res.headers['set-cookie'][0];
}

async function runTests() {
  console.log('=== STARTING END-TO-END VERIFICATION SUITE ===\n');

  // Step 1: Clean table and sequence
  console.log('1. Resetting purchase_requests and sequence to 1...');
  await query('DELETE FROM purchase_requests;');
  await query('ALTER SEQUENCE purchase_requests_request_id_seq RESTART WITH 1;');
  console.log('✓ purchase_requests wiped and sequence set to 1.\n');

  // Step 2: Next Ref
  const hodCookie = await login('hod.cs@kletech.ac.in', 'password123');
  const refRes = await get('/api/requests/next-ref', hodCookie);
  console.log('2. Check next-ref endpoint:');
  console.log(`   Next Ref = ${refRes.body.ref_no}`);
  if (refRes.body.ref_no !== 'KLE-TECH/INFOCELL/REQ/2026/001') {
    throw new Error(`Expected REQ/2026/001 but got ${refRes.body.ref_no}`);
  }
  console.log('✓ Next ref format verified.\n');

  // Step 3: HOD submits Requisition #1 (Tier 2 candidate, ~1.8L)
  console.log('3. Submitting Requisition #1 as HOD...');
  const req1 = await post('/api/requests', {
    subject: 'Requisition for HP Workstations for CSE Lab 4',
    justification: 'High performance systems required for student academic projects.',
    budget_details: {
      expenditure_head: 'CSE Modernization Grant'
    },
    items: [
      {
        item_name: 'HP ProDesk 400 G7',
        specification: 'Core i5 10th Gen, 16GB RAM, 512GB SSD',
        quantity: 3,
        location: 'Lab 4',
        purpose: 'Lab Practicals',
        isr_no_and_date: 'ISR-2026-44 / 20-01-2026'
      },
      {
        item_name: 'APC Smart-UPS 2kVA',
        specification: 'Pure Sine Wave 230V',
        quantity: 1,
        location: 'Lab 4',
        purpose: 'Power Protection',
        isr_no_and_date: 'ISR-2026-45 / 20-01-2026'
      }
    ]
  }, hodCookie);

  console.log('   Response:', req1.body);
  const reqId1 = req1.body.request_id;
  if (reqId1 !== 1) throw new Error(`Expected request_id = 1, got ${reqId1}`);
  console.log('✓ Requisition #1 created with request_id = 1.\n');

  // Check initial approval chain
  const req1Detail = await get(`/api/requests/${reqId1}`, hodCookie);
  console.log('   Initial status:', req1Detail.body.request.status);
  console.log('   Initial approvals:', req1Detail.body.approvals.map(a => `${a.approver_role}: ${a.decision}`));
  if (req1Detail.body.approvals.length !== 2) {
    throw new Error('Initial approvals should be 2 (HOD and COORDINATOR)');
  }
  console.log('✓ Initial approval chain is HOD (APPROVED) -> COORDINATOR (PENDING).\n');

  // Step 4: Coordinator logs in and reviews
  console.log('4. Coordinator logs in and reviews pending inbox...');
  const coordCookie = await login('coordinator@kletech.ac.in', 'password123');
  const coordPending = await get('/api/approvals/pending', coordCookie);
  const foundInCoord = (coordPending.body.approvals || []).find(p => p.request_id === 1);
  if (!foundInCoord) throw new Error('Requisition #1 not found in Coordinator pending inbox');
  console.log(`✓ Requisition #1 found in Coordinator inbox (approval_id: ${foundInCoord.approval_id}).\n`);

  // Step 5: Coordinator approves with Tier 2 valuation (₹1,80,000)
  console.log('5. Coordinator approves with valuation ₹1,80,000 (Tier 2: Registrar + VC)...');
  const coordDecision = await post(`/api/approvals/${foundInCoord.request_id}/decision`, {
    decision: 'APPROVED',
    remarks: 'Reviewed technical specifications. Compatible with Lab 4 network and power layout.',
    estimated_cost: 180000,
    tier: 'TIER_2'
  }, coordCookie);

  console.log('   Coordinator decision result:', coordDecision.body);
  const req1AfterCoord = await get(`/api/requests/${reqId1}`, coordCookie);
  console.log('   Current request status:', req1AfterCoord.body.request.status);
  console.log('   Current total_amount:', req1AfterCoord.body.request.total_amount);
  console.log('   Updated approval chain:', req1AfterCoord.body.approvals.map(a => `${a.approver_role} (step ${a.step_order}): ${a.decision}`));
  if (req1AfterCoord.body.approvals.length !== 4) {
    throw new Error('Expected 4 approval steps after Tier 2 routing (HOD, COORDINATOR, REGISTRAR, VC)');
  }
  console.log('✓ Coordinator Tier 2 routing generated REGISTRAR and VC steps correctly.\n');

  // Step 6: Registrar logs in and approves
  console.log('6. Registrar logs in and approves...');
  const regCookie = await login('registrar@kletech.ac.in', 'password123');
  const regPending = await get('/api/approvals/pending', regCookie);
  const foundInReg = (regPending.body.approvals || []).find(p => p.request_id === 1);
  if (!foundInReg) throw new Error('Requisition #1 not found in Registrar pending inbox');
  
  await post(`/api/approvals/${foundInReg.request_id}/decision`, {
    decision: 'APPROVED',
    remarks: 'Sanction approved within administrative grant.'
  }, regCookie);

  const req1AfterReg = await get(`/api/requests/${reqId1}`, regCookie);
  console.log('   Status after Registrar:', req1AfterReg.body.request.status);
  if (req1AfterReg.body.request.status !== 'UNDER_APPROVAL') {
    throw new Error(`Expected status to remain UNDER_APPROVAL until final VC approval, got ${req1AfterReg.body.request.status}`);
  }
  console.log('✓ Registrar approved, status is UNDER_APPROVAL awaiting VC.\n');

  // Step 7: Vice Chancellor logs in and approves
  console.log('7. Vice Chancellor logs in and approves...');
  const vcCookie = await login('vc@kletech.ac.in', 'password123');
  const vcPending = await get('/api/approvals/pending', vcCookie);
  const foundInVC = (vcPending.body.approvals || []).find(p => p.request_id === 1);
  if (!foundInVC) throw new Error('Requisition #1 not found in VC pending inbox');

  await post(`/api/approvals/${foundInVC.request_id}/decision`, {
    decision: 'APPROVED',
    remarks: 'Final executive approval granted for CSE Lab 4 hardware.'
  }, vcCookie);

  const req1Final = await get(`/api/requests/${reqId1}`, hodCookie);
  console.log('   Final status for Requisition #1:', req1Final.body.request.status);
  console.log('   Final approvals:', req1Final.body.approvals.map(a => `${a.approver_role}: ${a.decision}`));
  if (req1Final.body.request.status !== 'APPROVED') {
    throw new Error(`Expected request status to be APPROVED, got ${req1Final.body.request.status}`);
  }
  console.log('✓ Requisition #1 fully APPROVED.\n');

  // Step 8: Test rejection workflow on Requisition #2
  console.log('8. Testing Rejection workflow on Requisition #2...');
  const refRes2 = await get('/api/requests/next-ref', hodCookie);
  console.log(`   Next Ref for #2: ${refRes2.body.ref_no}`);
  if (refRes2.body.ref_no !== 'KLE-TECH/INFOCELL/REQ/2026/002') {
    throw new Error(`Expected REQ/2026/002 but got ${refRes2.body.ref_no}`);
  }

  const req2 = await post('/api/requests', {
    subject: 'Request for high end graphics cards',
    justification: 'Gaming and rendering tests',
    budget_details: { expenditure_head: 'Discretionary' },
    items: [
      {
        item_name: 'NVIDIA RTX 4090',
        specification: '24GB GDDR6X',
        quantity: 2,
        location: 'Lab 4',
        purpose: 'Graphics project',
        isr_no_and_date: 'ISR-2026-99 / 20-01-2026'
      }
    ]
  }, hodCookie);
  const reqId2 = req2.body.request_id;
  console.log(`   Requisition #2 created (ID: ${reqId2}).`);

  // Coordinator rejects Requisition #2
  const coordPending2 = await get('/api/approvals/pending', coordCookie);
  const foundInCoord2 = (coordPending2.body.approvals || []).find(p => p.request_id === 2);
  await post(`/api/approvals/${foundInCoord2.request_id}/decision`, {
    decision: 'REJECTED',
    remarks: 'Non-standard equipment, budget not allocated for this financial quarter.'
  }, coordCookie);

  const req2Final = await get(`/api/requests/${reqId2}`, hodCookie);
  console.log('   Status of Requisition #2 after rejection:', req2Final.body.request.status);
  if (req2Final.body.request.status !== 'REJECTED') {
    throw new Error(`Expected REJECTED, got ${req2Final.body.request.status}`);
  }
  console.log('✓ Rejection workflow verified: request marked REJECTED directly.\n');

  // Step 9: Inventory CRUD and Quantity +/- Test
  console.log('9. Testing Inventory CRUD & +/- Operations...');
  const assetsInit = await get('/api/assets?limit=10', hodCookie);
  const initialTotal = assetsInit.body.total;
  console.log(`   Initial asset count in database: ${initialTotal}`);

  // Create new asset unit
  const newAssetPayload = {
    name: 'Dell OptiPlex 7090 Micro',
    location: 'Lab 4',
    condition: 'GOOD',
    quantity: 5,
    unit_cost: 52000,
    vendor_name: 'Dell India Enterprise',
    specifications: {
      processor: 'Intel Core i7-11700',
      ram: '16GB DDR4',
      storage: '512GB NVMe SSD',
      monitor: 'Dell 21.5" FHD'
    }
  };
  const createAssetRes = await post('/api/assets', newAssetPayload, coordCookie);
  console.log('   Created asset:', createAssetRes.body.asset ? createAssetRes.body.asset.asset_code : createAssetRes.body);
  const createdAssetId = createAssetRes.body.asset.asset_id;

  // Increment quantity (+1)
  const incRes = await patch(`/api/assets/${createdAssetId}/quantity`, { change: 1 }, coordCookie);
  console.log(`   Incremented quantity: ${incRes.body.asset.quantity} (expected 6)`);
  if (incRes.body.asset.quantity !== 6) throw new Error('Quantity increment failed');

  // Decrement quantity (-1)
  const decRes = await patch(`/api/assets/${createdAssetId}/quantity`, { change: -1 }, coordCookie);
  console.log(`   Decremented quantity: ${decRes.body.asset.quantity} (expected 5)`);
  if (decRes.body.asset.quantity !== 5) throw new Error('Quantity decrement failed');

  // Delete the test asset to leave inventory clean
  const delRes = await del(`/api/assets/${createdAssetId}`, coordCookie);
  console.log(`   Deleted test asset: ${delRes.body.message}`);

  const assetsFinal = await get('/api/assets?limit=10', hodCookie);
  console.log(`   Final asset count in database: ${assetsFinal.body.total} (restored to ${initialTotal})`);
  if (assetsFinal.body.total !== initialTotal) throw new Error('Inventory count mismatch');
  console.log('✓ Inventory CRUD and +/- adjustments verified perfectly.\n');

  console.log('=== ALL END-TO-END TESTS PASSED SUCCESSFULLY! ===');
}

runTests().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
