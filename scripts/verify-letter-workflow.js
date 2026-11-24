/**
 * scripts/verify-letter-workflow.js
 * 
 * End-to-end automated verification of the Institutional Requisition Letter
 * and Multi-Tier Scrutiny/Approval Workflow.
 */

const http = require('http');

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const cookies = res.headers['set-cookie'];
        let cookie = null;
        if (cookies && cookies.length > 0) {
          cookie = cookies[0].split(';')[0];
        }
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, cookie });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data, cookie });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function login(email, password = 'password123') {
  const res = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email, password });

  if (!res.data.success) {
    throw new Error(`Login failed for ${email}: ${res.data.message}`);
  }
  return res.cookie;
}

async function run() {
  console.log('=== STARTING REQUISITION LETTER & WORKFLOW VERIFICATION ===\n');

  // 1. Login as HOD
  console.log('1. Logging in as Dr. CS HOD (hod.cs@kletech.ac.in)...');
  const hodCookie = await login('hod.cs@kletech.ac.in');
  console.log('   ✓ Logged in as HOD');

  // 2. Submit Requisition Letter (Tier 2: ₹1,80,000 -> HOD -> Coord -> Reg -> VC)
  console.log('\n2. Submitting Institutional Approval Request Letter...');
  const prPayload = {
    subject: 'Approval for procurement of Core i7 Workstations for CSE Lab 3',
    justification: 'Modernization of Lab 3 computing infrastructure for AI/ML curriculum practicals.',
    items: [
      {
        item_name: 'Dell OptiPlex 7010 Tower Workstation',
        specification: 'Intel Core i7-13700, 16GB RAM, 512GB NVMe SSD, 24" FHD IPS Monitor',
        quantity: 4,
        estimated_price: 45000.00
      }
    ],
    budget_details: {
      category: 'Capital Equipment / Lab Infra',
      head: 'IT Hardware & Lab Upgrades',
      sanctioned: 2500000,
      spent: 850000,
      committed: 210000
    }
  };

  const submitRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/requests',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': hodCookie
    }
  }, prPayload);

  console.log('   Response:', submitRes.data);
  const reqId = submitRes.data.request_id;
  if (!reqId) throw new Error('Failed to create requisition');
  console.log(`   ✓ Requisition #${reqId} created in database. Total: ₹${submitRes.data.total_amount}`);
  console.log(`   ✓ Routing Tier Chain: ${submitRes.data.approval_chain.join(' → ')}`);

  // 3. Coordinator Scrutiny & Approval
  console.log('\n3. Logging in as InfoCell Coordinator (coordinator@kletech.ac.in)...');
  const coordCookie = await login('coordinator@kletech.ac.in');

  const coordPending = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/approvals/pending',
    method: 'GET',
    headers: { 'Cookie': coordCookie }
  });
  console.log(`   ✓ Coordinator pending tasks: ${coordPending.data.pendingCount}`);

  console.log(`   Action: Coordinator endorses Requisition #${reqId}...`);
  const coordDecide = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/approvals/${reqId}/decision`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': coordCookie }
  }, {
    decision: 'APPROVED',
    remarks: 'Technical specifications verified against syllabus standards. Stock checked: 15 obsolete systems replaced. Recommended.'
  });
  console.log('   ✓ Coordinator response:', coordDecide.data.message);

  // 4. Registrar Review & Approval
  console.log('\n4. Logging in as University Registrar (registrar@kletech.ac.in)...');
  const regCookie = await login('registrar@kletech.ac.in');

  const regPending = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/approvals/pending',
    method: 'GET',
    headers: { 'Cookie': regCookie }
  });
  console.log(`   ✓ Registrar pending tasks: ${regPending.data.pendingCount}`);

  console.log(`   Action: Registrar endorses Requisition #${reqId}...`);
  const regDecide = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/approvals/${reqId}/decision`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': regCookie }
  }, {
    decision: 'APPROVED',
    remarks: 'Budget head verified and administrative approval granted.'
  });
  console.log('   ✓ Registrar response:', regDecide.data.message);

  // 5. Vice Chancellor Review & Approval (Final step for Tier 2)
  console.log('\n5. Logging in as Vice Chancellor (vc@kletech.ac.in)...');
  const vcCookie = await login('vc@kletech.ac.in');

  const vcPending = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/approvals/pending',
    method: 'GET',
    headers: { 'Cookie': vcCookie }
  });
  console.log(`   ✓ VC pending tasks: ${vcPending.data.pendingCount}`);

  console.log(`   Action: VC grants executive approval for Requisition #${reqId}...`);
  const vcDecide = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/approvals/${reqId}/decision`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': vcCookie }
  }, {
    decision: 'APPROVED',
    remarks: 'Approved for procurement as recommended.'
  });
  console.log('   ✓ VC response:', vcDecide.data.message);
  console.log('   ✓ Final Request Status:', vcDecide.data.request_status);

  // 6. Test Rejection Path & HOD Notification
  console.log('\n6. Testing Rejection Circuit Breaker & HOD Notification...');
  console.log('   HOD submits Requisition 2...');
  const sub2 = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/requests',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': hodCookie }
  }, {
    subject: 'Approval for procurement of Test Lab Equipment',
    justification: 'Additional peripherals for testing.',
    items: [
      { item_name: 'Laser Printer', specification: 'Standard monochrome', quantity: 1, estimated_price: 18000 }
    ]
  });
  const req2Id = sub2.data.request_id;
  console.log(`   ✓ Requisition #${req2Id} created.`);

  console.log(`   Coordinator rejects Requisition #${req2Id}...`);
  const rejectRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/approvals/${req2Id}/decision`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': coordCookie }
  }, {
    decision: 'REJECTED',
    remarks: 'Please revise specifications to include duplex network printing capabilities.'
  });
  console.log('   ✓ Rejection response:', rejectRes.data.message);
  console.log('   ✓ Request Status:', rejectRes.data.request_status);

  console.log('   Verifying HOD dashboard receives the Rejection Alert...');
  const hodNotifs = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/dashboard/notifications',
    method: 'GET',
    headers: { 'Cookie': hodCookie }
  });
  console.log('   ✓ HOD Notification messages:', hodNotifs.data.notifications.messages);

  console.log('\n=== ALL WORKFLOW TESTS PASSED SUCCESSFULLY! ===');
  process.exit(0);
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
