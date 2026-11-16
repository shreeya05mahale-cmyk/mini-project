/**
 * Database Seed Script
 * 
 * Populates kle_asset_db with realistic test data across all lifecycle states:
 * - Departments (CS, EC, Mech, Civil, InfoCell)
 * - Users for all roles (HOD, Coordinator, Registrar, VC, PC, Store, Admin) with bcrypt hashed password
 * - Suppliers (Dell, HP, Lenovo, TechSource)
 * - Requests in UNDER_APPROVAL, APPROVED, ORDERED, and COMPLETED states
 * - Purchase orders, goods receipts, durable tagged assets, and stock ledger entries
 */

const bcrypt = require('bcrypt');
const { pool, withTransaction } = require('../server/db');

async function seed() {
  console.log('[Seed] Starting database seeding...');

  // Common password for all demo accounts: 'password123'
  const passwordHash = await bcrypt.hash('password123', 10);

  await withTransaction(async (client) => {
    // Clean all existing data in reverse foreign key order
    console.log('[Seed] Cleaning existing data...');
    await client.query(`
      TRUNCATE TABLE 
        stock_transactions,
        assets,
        goods_receipts,
        purchase_orders,
        quotations,
        suppliers,
        approvals,
        request_items,
        purchase_requests,
        users,
        departments,
        "session"
      RESTART IDENTITY CASCADE;
    `);

    // 1. Insert Departments
    console.log('[Seed] Inserting departments...');
    const deptsResult = await client.query(`
      INSERT INTO departments (name) VALUES
        ('Computer Science & Engineering'),
        ('Electronics & Communication'),
        ('Mechanical Engineering'),
        ('Civil Engineering'),
        ('InfoCell IT Department')
      RETURNING dept_id, name;
    `);
    const depts = {};
    deptsResult.rows.forEach(d => { depts[d.name] = d.dept_id; });

    // 2. Insert Users
    console.log('[Seed] Inserting users with bcrypt hashed passwords...');
    const usersResult = await client.query(`
      INSERT INTO users (name, email, password_hash, role, dept_id) VALUES
        ('System Administrator', 'admin@kletech.ac.in', $1, 'ADMIN', NULL),
        ('Dr. CS HOD', 'hod.cs@kletech.ac.in', $1, 'HOD', $2),
        ('Dr. EC HOD', 'hod.ec@kletech.ac.in', $1, 'HOD', $3),
        ('Prof. InfoCell Coordinator', 'coordinator@kletech.ac.in', $1, 'COORDINATOR', $4),
        ('University Registrar', 'registrar@kletech.ac.in', $1, 'REGISTRAR', NULL),
        ('Vice Chancellor', 'vc@kletech.ac.in', $1, 'VC', NULL),
        ('Purchase Committee Head', 'pc@kletech.ac.in', $1, 'PC', NULL),
        ('Chief Storekeeper', 'store@kletech.ac.in', $1, 'STORE', $4)
      RETURNING user_id, email, role;
    `, [
      passwordHash,
      depts['Computer Science & Engineering'],
      depts['Electronics & Communication'],
      depts['InfoCell IT Department']
    ]);
    const users = {};
    usersResult.rows.forEach(u => { users[u.email] = u.user_id; });

    // 3. Insert Suppliers
    console.log('[Seed] Inserting suppliers...');
    const suppliersResult = await client.query(`
      INSERT INTO suppliers (name, contact, address) VALUES
        ('Dell India Enterprise', 'sales@dell-enterprise.in | +91 80 2234 5678', 'Plot 42, Inner Ring Road, Domlur, Bangalore - 560071'),
        ('HP Education Solutions', 'edu.bids@hp.com | +91 80 4987 1122', 'HP Avenue, Whitefield Cyber City, Bangalore - 560066'),
        ('Lenovo Commercial India', 'enterprise@lenovo.in | +91 80 6677 8899', 'Tech Park South, Outer Ring Road, Bangalore - 560103'),
        ('TechSource Hub Supplies', 'support@techsourcehub.com | +91 836 237 4455', 'Station Road, Hubballi - 580020')
      RETURNING supplier_id, name;
    `);
    const suppliers = suppliersResult.rows;

    // 4. Sample Request 1: UNDER_APPROVAL (Tier 4: >= 2,00,000)
    // CS HOD submitted 5 high-end laptops (₹3,75,000). HOD is auto-approved, Coordinator is next.
    console.log('[Seed] Inserting Request 1 (UNDER_APPROVAL)...');
    const req1 = (await client.query(`
      INSERT INTO purchase_requests (dept_id, requested_by, justification, total_amount, status, created_at)
      VALUES ($1, $2, 'High-performance laptops for AI & Machine Learning student laboratory.', 375000.00, 'UNDER_APPROVAL', NOW() - INTERVAL '3 days')
      RETURNING request_id;
    `, [depts['Computer Science & Engineering'], users['hod.cs@kletech.ac.in']])).rows[0];

    await client.query(`
      INSERT INTO request_items (request_id, item_id, item_name, specification, quantity, estimated_price)
      VALUES ($1, 1, 'Dell Precision 3581 Mobile Workstation', 'Intel Core i7-13800H, 32GB DDR5, 1TB NVMe SSD, RTX A1000 6GB', 5, 75000.00);
    `, [req1.request_id]);

    await client.query(`
      INSERT INTO approvals (request_id, approval_id, approver_id, approver_role, step_order, decision, remarks, decided_at) VALUES
        ($1, 1, $2, 'HOD', 1, 'APPROVED', 'Request verified and approved for AI lab modernization.', NOW() - INTERVAL '3 days'),
        ($1, 2, NULL, 'COORDINATOR', 2, 'PENDING', NULL, NULL),
        ($1, 3, NULL, 'REGISTRAR', 3, 'PENDING', NULL, NULL),
        ($1, 4, NULL, 'VC', 4, 'PENDING', NULL, NULL),
        ($1, 5, NULL, 'PC', 5, 'PENDING', NULL, NULL);
    `, [req1.request_id, users['hod.cs@kletech.ac.in']]);

    // 5. Sample Request 2: APPROVED (Tier 3: 50k to 200k)
    // EC HOD submitted smart laser projectors (₹90,000). Fully approved, ready for quotations.
    console.log('[Seed] Inserting Request 2 (APPROVED)...');
    const req2 = (await client.query(`
      INSERT INTO purchase_requests (dept_id, requested_by, justification, total_amount, status, created_at)
      VALUES ($1, $2, 'Interactive digital smart projectors for seminar halls.', 90000.00, 'APPROVED', NOW() - INTERVAL '7 days')
      RETURNING request_id;
    `, [depts['Electronics & Communication'], users['hod.ec@kletech.ac.in']])).rows[0];

    await client.query(`
      INSERT INTO request_items (request_id, item_id, item_name, specification, quantity, estimated_price)
      VALUES ($1, 1, 'Epson EB-735F Ultra Short Throw Projector', 'Full HD 1080p, 3600 Lumens Laser Display, Wireless Miracast', 2, 45000.00);
    `, [req2.request_id]);

    await client.query(`
      INSERT INTO approvals (request_id, approval_id, approver_id, approver_role, step_order, decision, remarks, decided_at) VALUES
        ($1, 1, $2, 'HOD', 1, 'APPROVED', 'Approved for EC smart seminar halls.', NOW() - INTERVAL '7 days'),
        ($1, 2, $3, 'COORDINATOR', 2, 'APPROVED', 'Technical specifications verified.', NOW() - INTERVAL '6 days'),
        ($1, 3, $4, 'REGISTRAR', 3, 'APPROVED', 'Administrative clearance granted.', NOW() - INTERVAL '5 days'),
        ($1, 4, $5, 'VC', 4, 'APPROVED', 'Approved as per annual academic budget.', NOW() - INTERVAL '4 days');
    `, [
      req2.request_id,
      users['hod.ec@kletech.ac.in'],
      users['coordinator@kletech.ac.in'],
      users['registrar@kletech.ac.in'],
      users['vc@kletech.ac.in']
    ]);

    // 6. Sample Request 3: ORDERED (Quotations received, supplier selected, PO issued)
    console.log('[Seed] Inserting Request 3 (ORDERED with PO)...');
    const req3 = (await client.query(`
      INSERT INTO purchase_requests (dept_id, requested_by, justification, total_amount, status, created_at)
      VALUES ($1, $2, 'Enterprise rack server for university learning management system.', 240000.00, 'ORDERED', NOW() - INTERVAL '14 days')
      RETURNING request_id;
    `, [depts['InfoCell IT Department'], users['coordinator@kletech.ac.in']])).rows[0];

    await client.query(`
      INSERT INTO request_items (request_id, item_id, item_name, specification, quantity, estimated_price)
      VALUES ($1, 1, 'Dell PowerEdge R750xs Rack Server', 'Dual Intel Xeon Silver 4314, 64GB ECC RAM, 2x 960GB SAS SSD RAID-1', 1, 240000.00);
    `, [req3.request_id]);

    await client.query(`
      INSERT INTO approvals (request_id, approval_id, approver_id, approver_role, step_order, decision, remarks, decided_at) VALUES
        ($1, 1, $2, 'HOD', 1, 'APPROVED', 'InfoCell infrastructure upgrade.', NOW() - INTERVAL '14 days'),
        ($1, 2, $2, 'COORDINATOR', 2, 'APPROVED', 'Specs verified.', NOW() - INTERVAL '13 days'),
        ($1, 3, $3, 'REGISTRAR', 3, 'APPROVED', 'Approved.', NOW() - INTERVAL '12 days'),
        ($1, 4, $4, 'VC', 4, 'APPROVED', 'Approved.', NOW() - INTERVAL '11 days'),
        ($1, 5, $5, 'PC', 5, 'APPROVED', 'Commercial terms cleared.', NOW() - INTERVAL '10 days');
    `, [
      req3.request_id,
      users['coordinator@kletech.ac.in'],
      users['registrar@kletech.ac.in'],
      users['vc@kletech.ac.in'],
      users['pc@kletech.ac.in']
    ]);

    // Quotations for Request 3
    await client.query(`
      INSERT INTO quotations (request_id, supplier_id, amount, is_selected, quoted_on) VALUES
        ($1, $2, 235000.00, true, CURRENT_DATE - INTERVAL '9 days'),
        ($1, $3, 248000.00, false, CURRENT_DATE - INTERVAL '9 days');
    `, [req3.request_id, suppliers[0].supplier_id, suppliers[1].supplier_id]);

    // Purchase Order for Request 3
    await client.query(`
      INSERT INTO purchase_orders (request_id, supplier_id, po_number, total_amount, status, created_at)
      VALUES ($1, $2, 'PO-2026-0001', 235000.00, 'ISSUED', NOW() - INTERVAL '8 days');
    `, [req3.request_id, suppliers[0].supplier_id]);

    // 7. Sample Request 4: COMPLETED (Fully delivered, durable asset codes created, stock ledger entries logged)
    console.log('[Seed] Inserting Request 4 (COMPLETED with goods receipt, assets, and ledger)...');
    const req4 = (await client.query(`
      INSERT INTO purchase_requests (dept_id, requested_by, justification, total_amount, status, created_at)
      VALUES ($1, $2, 'Workstation desktop computers for Systems Programming Laboratory.', 240000.00, 'COMPLETED', NOW() - INTERVAL '30 days')
      RETURNING request_id;
    `, [depts['Computer Science & Engineering'], users['hod.cs@kletech.ac.in']])).rows[0];

    await client.query(`
      INSERT INTO request_items (request_id, item_id, item_name, specification, quantity, estimated_price)
      VALUES ($1, 1, 'HP ProDesk 600 G6 Desktop Workstation', 'Intel Core i7-10700, 16GB DDR4, 512GB SSD, 24-inch IPS Monitor', 4, 60000.00);
    `, [req4.request_id]);

    await client.query(`
      INSERT INTO approvals (request_id, approval_id, approver_id, approver_role, step_order, decision, remarks, decided_at) VALUES
        ($1, 1, $2, 'HOD', 1, 'APPROVED', 'Approved for CS Systems Lab.', NOW() - INTERVAL '30 days'),
        ($1, 2, $3, 'COORDINATOR', 2, 'APPROVED', 'Technical specs cleared.', NOW() - INTERVAL '29 days'),
        ($1, 3, $4, 'REGISTRAR', 3, 'APPROVED', 'Approved.', NOW() - INTERVAL '28 days'),
        ($1, 4, $5, 'VC', 4, 'APPROVED', 'Approved.', NOW() - INTERVAL '27 days'),
        ($1, 5, $6, 'PC', 5, 'APPROVED', 'Commercial terms cleared.', NOW() - INTERVAL '26 days');
    `, [
      req4.request_id,
      users['hod.cs@kletech.ac.in'],
      users['coordinator@kletech.ac.in'],
      users['registrar@kletech.ac.in'],
      users['vc@kletech.ac.in'],
      users['pc@kletech.ac.in']
    ]);

    await client.query(`
      INSERT INTO quotations (request_id, supplier_id, amount, is_selected, quoted_on) VALUES
        ($1, $2, 230000.00, true, CURRENT_DATE - INTERVAL '25 days');
    `, [req4.request_id, suppliers[1].supplier_id]);

    const po4 = (await client.query(`
      INSERT INTO purchase_orders (request_id, supplier_id, po_number, total_amount, status, created_at)
      VALUES ($1, $2, 'PO-2026-0002', 230000.00, 'COMPLETED', NOW() - INTERVAL '24 days')
      RETURNING po_id;
    `, [req4.request_id, suppliers[1].supplier_id])).rows[0];

    // Goods Receipt: All 4 units delivered and verified
    const gr4 = (await client.query(`
      INSERT INTO goods_receipts (po_id, received_by, request_id, item_id, quantity_received, received_on)
      VALUES ($1, $2, $3, 1, 4, CURRENT_DATE - INTERVAL '20 days')
      RETURNING receipt_id;
    `, [po4.po_id, users['store@kletech.ac.in'], req4.request_id])).rows[0];

    // Create 4 individual durable assets with ISR codes: KLE-CS-2026-0001 to 0004
    for (let i = 1; i <= 4; i++) {
      const code = `KLE-CS-2026-000${i}`;
      const assetRes = await client.query(`
        INSERT INTO assets (asset_code, name, type, dept_id, receipt_id, location, condition, quantity)
        VALUES ($1, 'HP ProDesk 600 G6 Desktop Workstation', 'DURABLE', $2, $3, 'CS Systems Lab Room 204', 'NEW', 1)
        RETURNING asset_id;
      `, [code, depts['Computer Science & Engineering'], gr4.receipt_id]);

      // Record immutable ledger entry for each physical asset added
      await client.query(`
        INSERT INTO stock_transactions (asset_id, done_by, txn_type, quantity, from_dept_id, to_dept_id, txn_date)
        VALUES ($1, $2, 'ADDITION', 1, NULL, $3, NOW() - INTERVAL '20 days');
      `, [assetRes.rows[0].asset_id, users['store@kletech.ac.in'], depts['Computer Science & Engineering']]);
    }

    // 8. Sample Consumable Assets (Consumables have 1 row per item per department, with quantity = stock count)
    console.log('[Seed] Inserting consumable inventory and movement transactions...');
    const consumable1 = (await client.query(`
      INSERT INTO assets (asset_code, name, type, dept_id, receipt_id, location, condition, quantity)
      VALUES ('KLE-CS-2026-C001', 'High-Speed Gold Plated HDMI Cables (3m)', 'CONSUMABLE', $1, NULL, 'CS Hardware Store', 'NEW', 45)
      RETURNING asset_id;
    `, [depts['Computer Science & Engineering']])).rows[0];

    await client.query(`
      INSERT INTO stock_transactions (asset_id, done_by, txn_type, quantity, from_dept_id, to_dept_id, txn_date)
      VALUES 
        ($1, $2, 'ADDITION', 50, NULL, $3, NOW() - INTERVAL '15 days'),
        ($1, $2, 'ISSUE', -5, $3, NULL, NOW() - INTERVAL '10 days');
    `, [consumable1.asset_id, users['store@kletech.ac.in'], depts['Computer Science & Engineering']]);

    const consumable2 = (await client.query(`
      INSERT INTO assets (asset_code, name, type, dept_id, receipt_id, location, condition, quantity)
      VALUES ('KLE-CS-2026-C002', 'Surge Protected Power Extension Strips (6-Port)', 'CONSUMABLE', $1, NULL, 'CS Hardware Store', 'NEW', 18)
      RETURNING asset_id;
    `, [depts['Computer Science & Engineering']])).rows[0];

    await client.query(`
      INSERT INTO stock_transactions (asset_id, done_by, txn_type, quantity, from_dept_id, to_dept_id, txn_date)
      VALUES ($1, $2, 'ADDITION', 18, NULL, $3, NOW() - INTERVAL '12 days');
    `, [consumable2.asset_id, users['store@kletech.ac.in'], depts['Computer Science & Engineering']]);

    console.log('[Seed] Database seeding completed successfully!');
  });

  await pool.end();
}

seed().catch(err => {
  console.error('[Seed Error] Failed to seed database:', err);
  process.exit(1);
});
