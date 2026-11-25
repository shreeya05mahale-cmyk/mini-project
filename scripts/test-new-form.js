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
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(resData) }));
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
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(resData) }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  // 1. Login as HOD
  const loginRes = await post('/api/auth/login', { email: 'hod.cs@kletech.ac.in', password: 'password123' });
  const hodCookie = loginRes.headers['set-cookie'][0];

  // 2. Submit new Procurement Requisition Form matching Google Doc
  const reqPayload = {
    subject: 'Requisition for HP Desktop PCs for CSE Lab 4',
    justification: 'Replacement of obsolete systems to support AI/ML coursework and practical exams.',
    budget_details: {
      expenditure_head: 'CSE Dept Computing Infrastructure & Lab Modernization Fund'
    },
    items: [
      {
        item_name: 'HP ProDesk 400 G7 Microtower PC',
        specification: 'Intel Core i5 10th Gen, 8GB DDR4, 1TB HDD, 18.5 inch Monitor',
        quantity: 4,
        estimated_price: 45000,
        location: 'Lab 4',
        purpose: 'Lab Practicals',
        isr_no_and_date: 'ISR #296 / 15-08-2021'
      }
    ]
  };

  const createRes = await post('/api/requests', reqPayload, hodCookie);
  console.log('Create result:', createRes.body);

  const reqId = createRes.body.request_id;
  const detailRes = await get('/api/requests/' + reqId, hodCookie);
  console.log('Detail result:', {
    request_id: detailRes.body.request.request_id,
    expenditure_head: detailRes.body.request.budget_details,
    items: detailRes.body.items,
    approvals_count: detailRes.body.approvals.length
  });
}

run().catch(console.error);
