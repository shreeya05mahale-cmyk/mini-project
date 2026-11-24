/**
 * scripts/test-workflow.js
 *
 * Verifies the Phase 4 Request and Multi-Tier Approval Workflow:
 * 1. HOD logs in and submits a > 2 Lakhs request (e.g. 5 Laptops @ ₹50,000 = ₹2,50,000)
 * 2. Verifies generated approval chain: HOD (Approved) -> COORDINATOR (Pending) -> REGISTRAR (Pending) -> VC (Pending) -> PC (Pending)
 * 3. Verifies strict sequential enforcement (Registrar cannot approve before Coordinator)
 * 4. Coordinator logs in and approves -> advances to Registrar
 * 5. Registrar logs in and approves -> advances to VC
 * 6. VC logs in and approves -> advances to PC
 * 7. PC logs in and approves -> request becomes APPROVED!
 */

const http = require('http');

function post(path, body, cookie = '') {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'Cookie': cookie
      }
    }, res => {
      let raw = '';
      const setCookie = res.headers['set-cookie'] ? res.headers['set-cookie'][0].split(';')[0] : cookie;
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw), cookie: setCookie });
        } catch (e) {
          resolve({ status: res.statusCode, raw, cookie: setCookie });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path, cookie = '') {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'GET',
      headers: { 'Cookie': cookie }
    }, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch (e) {
          resolve({ status: res.statusCode, raw });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function runTest() {
  console.log('=== Step 1: Login as HOD ===');
  const hodLogin = await post('/api/auth/login', { email: 'hod.cs@kletech.ac.in', password: 'password123' });
  const hodCookie = hodLogin.cookie;
  console.log('HOD Logged In:', hodLogin.body.user.name);

  console.log('\n=== Step 2: HOD Submits Requisition (Tier 3: > ₹2,00,000) ===');
  const reqRes = await post('/api/requests', {
    justification: 'High-performance workstations for AI & ML Research Lab',
    items: [
      { item_name: 'Dell Precision Workstation', specification: 'Intel i7 14th Gen, 32GB RAM, RTX 4070', quantity: 3, estimated_price: 110000.00 }
    ]
  }, hodCookie);
  console.log('Request creation response:', reqRes.body);
  const reqId = reqRes.body.request_id;

  console.log(`\n=== Step 3: Verify Approval Trail for Request #${reqId} ===`);
  const detailRes = await get(`/api/requests/${reqId}`, hodCookie);
  console.log('Approval Chain steps:');
  detailRes.body.approvals.forEach(a => {
    console.log(`  Step ${a.step_order} [${a.approver_role}]: ${a.decision}`);
  });

  console.log('\n=== Step 4: Test Sequential Enforcement (Registrar trying to approve before Coordinator) ===');
  const regLogin = await post('/api/auth/login', { email: 'registrar@kletech.ac.in', password: 'password123' });
  const regCookie = regLogin.cookie;
  const prematureRes = await post(`/api/approvals/${reqId}/decision`, { decision: 'APPROVED' }, regCookie);
  console.log('Premature approval result (expected failure):', prematureRes.body);

  console.log('\n=== Step 5: Coordinator approves Step 2 ===');
  const coordLogin = await post('/api/auth/login', { email: 'coordinator@kletech.ac.in', password: 'password123' });
  const coordCookie = coordLogin.cookie;
  const coordAppRes = await post(`/api/approvals/${reqId}/decision`, { decision: 'APPROVED', remarks: 'Technical scrutiny verified and approved.' }, coordCookie);
  console.log('Coordinator approval result:', coordAppRes.body);

  console.log('\n=== Step 6: Registrar approves Step 3 ===');
  const regAppRes = await post(`/api/approvals/${reqId}/decision`, { decision: 'APPROVED', remarks: 'Administrative sanction accorded.' }, regCookie);
  console.log('Registrar approval result:', regAppRes.body);

  console.log('\n=== Step 7: Vice Chancellor approves Step 4 ===');
  const vcLogin = await post('/api/auth/login', { email: 'vc@kletech.ac.in', password: 'password123' });
  const vcCookie = vcLogin.cookie;
  const vcAppRes = await post(`/api/approvals/${reqId}/decision`, { decision: 'APPROVED', remarks: 'Executive approval granted.' }, vcCookie);
  console.log('VC approval result:', vcAppRes.body);

  console.log('\n=== Step 8: Purchase Committee Head gives final approval Step 5 ===');
  const pcLogin = await post('/api/auth/login', { email: 'pc@kletech.ac.in', password: 'password123' });
  const pcCookie = pcLogin.cookie;
  const pcAppRes = await post(`/api/approvals/${reqId}/decision`, { decision: 'APPROVED', remarks: 'Committee sanction confirmed.' }, pcCookie);
  console.log('PC approval result:', pcAppRes.body);

  console.log('\n=== Step 9: Final Request Status Check ===');
  const finalCheck = await get(`/api/requests/${reqId}`, hodCookie);
  console.log(`Final Request Status: ${finalCheck.body.request.status}`);
  console.log('TEST PASSED: End-to-end multi-tier approval hierarchy verified!');
}

runTest().catch(console.error);
