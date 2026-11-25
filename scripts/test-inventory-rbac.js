const http = require('http');

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
          resolve({ status: res.statusCode, body: JSON.parse(resData) });
        } catch (e) {
          resolve({ status: res.statusCode, body: resData });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function put(path, body, cookie) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request('http://127.0.0.1:3000' + path, {
      method: 'PUT',
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
          resolve({ status: res.statusCode, body: JSON.parse(resData) });
        } catch (e) {
          resolve({ status: res.statusCode, body: resData });
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
          resolve({ status: res.statusCode, body: JSON.parse(resData) });
        } catch (e) {
          resolve({ status: res.statusCode, body: resData });
        }
      });
    });
    req.on('error', reject);
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
          resolve({ status: res.statusCode, body: JSON.parse(resData) });
        } catch (e) {
          resolve({ status: res.statusCode, body: resData });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function login(email, password) {
  const data = JSON.stringify({ email, password });
  return new Promise((resolve, reject) => {
    const req = http.request('http://127.0.0.1:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, res => {
      let resData = '';
      res.on('data', chunk => resData += chunk);
      res.on('end', () => {
        resolve(res.headers['set-cookie'] ? res.headers['set-cookie'][0] : null);
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  console.log('=== VERIFYING INVENTORY PERMISSIONS & PROPER ASSET DETAILS ===\n');

  const hodCookie = await login('hod.cs@kletech.ac.in', 'password123');
  const coordCookie = await login('coordinator@kletech.ac.in', 'password123');
  const adminCookie = await login('admin@kletech.ac.in', 'password123');

  // Test 1: HOD attempts to add an asset -> Should fail 403 Forbidden
  console.log('1. Testing RBAC: HOD attempting to add asset...');
  const hodAddRes = await post('/api/assets', { name: 'Unauthorized PC', location: 'Lab 1' }, hodCookie);
  console.log('   HOD Add Status:', hodAddRes.status, hodAddRes.body.message);
  if (hodAddRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden for HOD, got ${hodAddRes.status}`);
  }
  console.log('✓ HOD is strictly blocked from adding assets (403 Forbidden).\n');

  // Test 2: Coordinator adds asset with full inventory details
  console.log('2. Coordinator adding asset with full technical specs and register provenance...');
  const assetPayload = {
    name: 'HP ProDesk 400 G7 Microtower Desktop',
    location: 'Lab 4',
    asset_code: 'Lab4-DEMO99',
    quantity: 5,
    condition: 'GOOD',
    unit_cost: 38500.50,
    vendor_name: 'Pursuit Technologies Pvt Ltd',
    register_sl_no: 729,
    bill_no: 'PITS/2026/9901',
    bill_date: '2026-02-15',
    specifications: {
      processor: 'Intel Core i5 10th Gen 3.10GHz',
      generation: '10th Gen',
      ram: '16GB DDR4',
      hdd: '512GB NVMe M.2 SSD',
      monitor: '18.5 inch HP LED Monitor',
      os: 'Windows 11 Pro 64-bit',
      licensed: true,
      antivirus: true,
      remarks: 'Lab 4 Artificial Intelligence practical deployment.'
    }
  };

  const coordAddRes = await post('/api/assets', assetPayload, coordCookie);
  console.log('   Coordinator Add Status:', coordAddRes.status);
  console.log('   Created Asset Code:', coordAddRes.body.asset.asset_code);
  console.log('   Created Asset Specs:', coordAddRes.body.asset.specifications);
  console.log('   Created Register Sl No:', coordAddRes.body.asset.register_sl_no);
  console.log('   Created Bill No & Date:', coordAddRes.body.asset.bill_no, coordAddRes.body.asset.bill_date);
  if (coordAddRes.status !== 201) {
    throw new Error(`Expected 201 Created for Coordinator, got ${coordAddRes.status}`);
  }
  const createdId = coordAddRes.body.asset.asset_id;
  console.log('✓ Coordinator successfully created asset with full specifications.\n');

  // Test 3: Admin updates asset with PUT
  console.log('3. Admin updating asset details (RAM upgrade to 32GB)...');
  const updatedPayload = {
    ...assetPayload,
    specifications: {
      ...assetPayload.specifications,
      ram: '32GB DDR4'
    }
  };
  const adminPutRes = await put(`/api/assets/${createdId}`, updatedPayload, adminCookie);
  console.log('   Admin Update Status:', adminPutRes.status);
  console.log('   Updated RAM:', adminPutRes.body.asset.specifications.ram);
  if (adminPutRes.body.asset.specifications.ram !== '32GB DDR4') {
    throw new Error('RAM update did not persist');
  }
  console.log('✓ Admin successfully updated asset details.\n');

  // Test 4: HOD tries to delete asset -> Should fail 403 Forbidden
  console.log('4. Testing RBAC: HOD attempting to delete asset...');
  const hodDelRes = await del(`/api/assets/${createdId}`, hodCookie);
  console.log('   HOD Delete Status:', hodDelRes.status, hodDelRes.body.message);
  if (hodDelRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden for HOD delete, got ${hodDelRes.status}`);
  }
  console.log('✓ HOD is strictly blocked from deleting assets (403 Forbidden).\n');

  // Test 5: Coordinator deletes the demo asset -> Should succeed 200 OK
  console.log('5. Coordinator deleting demo asset to restore clean inventory...');
  const coordDelRes = await del(`/api/assets/${createdId}`, coordCookie);
  console.log('   Coordinator Delete Status:', coordDelRes.status, coordDelRes.body.message);
  if (coordDelRes.status !== 200) {
    throw new Error(`Expected 200 OK for Coordinator delete, got ${coordDelRes.status}`);
  }
  console.log('✓ Coordinator successfully deleted demo asset.\n');

  console.log('=== ALL INVENTORY RBAC & DETAIL TESTS PASSED! ===');
}

run().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
