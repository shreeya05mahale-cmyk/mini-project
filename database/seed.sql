-- ============================================================================
-- KLE Tech - IT Asset Inventory & Procurement Management System
-- Seed Data SQL Script
-- 
-- Run this via:
--   npm run seed (preferred, dynamically hashes 'password123' via bcrypt)
--   or directly via psql with this file.
-- ============================================================================

-- Clean existing data
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

-- 1. Departments
INSERT INTO departments (dept_id, name) VALUES
  (1, 'Computer Science & Engineering'),
  (2, 'Electronics & Communication'),
  (3, 'Mechanical Engineering'),
  (4, 'Civil Engineering'),
  (5, 'InfoCell IT Department');

-- 2. Users (Password is 'password123' hashed with bcrypt)
-- $2b$10$wN/sZqN99u6D.FwGhy37teqj3kX65pZtzJmHlS1tG4V8jQ60e0d5a
INSERT INTO users (user_id, name, email, password_hash, role, dept_id) VALUES
  (1, 'System Administrator', 'admin@kletech.ac.in', '$2b$10$wN/sZqN99u6D.FwGhy37teqj3kX65pZtzJmHlS1tG4V8jQ60e0d5a', 'ADMIN', NULL),
  (2, 'Dr. CS HOD', 'hod.cs@kletech.ac.in', '$2b$10$wN/sZqN99u6D.FwGhy37teqj3kX65pZtzJmHlS1tG4V8jQ60e0d5a', 'HOD', 1),
  (3, 'Dr. EC HOD', 'hod.ec@kletech.ac.in', '$2b$10$wN/sZqN99u6D.FwGhy37teqj3kX65pZtzJmHlS1tG4V8jQ60e0d5a', 'HOD', 2),
  (4, 'Prof. InfoCell Coordinator', 'coordinator@kletech.ac.in', '$2b$10$wN/sZqN99u6D.FwGhy37teqj3kX65pZtzJmHlS1tG4V8jQ60e0d5a', 'COORDINATOR', 5),
  (5, 'University Registrar', 'registrar@kletech.ac.in', '$2b$10$wN/sZqN99u6D.FwGhy37teqj3kX65pZtzJmHlS1tG4V8jQ60e0d5a', 'REGISTRAR', NULL),
  (6, 'Vice Chancellor', 'vc@kletech.ac.in', '$2b$10$wN/sZqN99u6D.FwGhy37teqj3kX65pZtzJmHlS1tG4V8jQ60e0d5a', 'VC', NULL),
  (7, 'Pro Chancellor', 'pc@kletech.ac.in', '$2b$10$wN/sZqN99u6D.FwGhy37teqj3kX65pZtzJmHlS1tG4V8jQ60e0d5a', 'PC', NULL),
  (8, 'Chief Storekeeper', 'store@kletech.ac.in', '$2b$10$wN/sZqN99u6D.FwGhy37teqj3kX65pZtzJmHlS1tG4V8jQ60e0d5a', 'STORE', 5);

-- 3. Suppliers
INSERT INTO suppliers (supplier_id, name, contact, address) VALUES
  (1, 'Dell India Enterprise', 'sales@dell-enterprise.in | +91 80 2234 5678', 'Plot 42, Inner Ring Road, Domlur, Bangalore - 560071'),
  (2, 'HP Education Solutions', 'edu.bids@hp.com | +91 80 4987 1122', 'HP Avenue, Whitefield Cyber City, Bangalore - 560066'),
  (3, 'Lenovo Commercial India', 'enterprise@lenovo.in | +91 80 6677 8899', 'Tech Park South, Outer Ring Road, Bangalore - 560103'),
  (4, 'TechSource Hub Supplies', 'support@techsourcehub.com | +91 836 237 4455', 'Station Road, Hubballi - 580020');

-- 4. Sample Request 1: UNDER_APPROVAL (Pending Coordinator)
INSERT INTO purchase_requests (request_id, dept_id, requested_by, justification, total_amount, status, created_at)
VALUES (1, 1, 2, 'High-performance laptops for AI & Machine Learning student laboratory.', 375000.00, 'UNDER_APPROVAL', NOW() - INTERVAL '3 days');

INSERT INTO request_items (request_id, item_id, item_name, specification, quantity, estimated_price)
VALUES (1, 1, 'Dell Precision 3581 Mobile Workstation', 'Intel Core i7-13800H, 32GB DDR5, 1TB NVMe SSD, RTX A1000 6GB', 5, 75000.00);

INSERT INTO approvals (request_id, approval_id, approver_id, approver_role, step_order, decision, remarks, decided_at) VALUES
  (1, 1, 2, 'HOD', 1, 'APPROVED', 'Request verified and approved for AI lab modernization.', NOW() - INTERVAL '3 days'),
  (1, 2, NULL, 'COORDINATOR', 2, 'PENDING', NULL, NULL),
  (1, 3, NULL, 'REGISTRAR', 3, 'PENDING', NULL, NULL),
  (1, 4, NULL, 'VC', 4, 'PENDING', NULL, NULL),
  (1, 5, NULL, 'PC', 5, 'PENDING', NULL, NULL);

-- 5. Sample Request 2: APPROVED (Ready for Quotations)
INSERT INTO purchase_requests (request_id, dept_id, requested_by, justification, total_amount, status, created_at)
VALUES (2, 2, 3, 'Interactive digital smart projectors for seminar halls.', 90000.00, 'APPROVED', NOW() - INTERVAL '7 days');

INSERT INTO request_items (request_id, item_id, item_name, specification, quantity, estimated_price)
VALUES (2, 1, 'Epson EB-735F Ultra Short Throw Projector', 'Full HD 1080p, 3600 Lumens Laser Display, Wireless Miracast', 2, 45000.00);

INSERT INTO approvals (request_id, approval_id, approver_id, approver_role, step_order, decision, remarks, decided_at) VALUES
  (2, 1, 3, 'HOD', 1, 'APPROVED', 'Approved for EC smart seminar halls.', NOW() - INTERVAL '7 days'),
  (2, 2, 4, 'COORDINATOR', 2, 'APPROVED', 'Technical specifications verified.', NOW() - INTERVAL '6 days'),
  (2, 3, 5, 'REGISTRAR', 3, 'APPROVED', 'Administrative clearance granted.', NOW() - INTERVAL '5 days'),
  (2, 4, 6, 'VC', 4, 'APPROVED', 'Approved as per annual academic budget.', NOW() - INTERVAL '4 days');

-- 6. Sample Request 3: ORDERED (PO Issued)
INSERT INTO purchase_requests (request_id, dept_id, requested_by, justification, total_amount, status, created_at)
VALUES (3, 5, 4, 'Enterprise rack server for university learning management system.', 240000.00, 'ORDERED', NOW() - INTERVAL '14 days');

INSERT INTO request_items (request_id, item_id, item_name, specification, quantity, estimated_price)
VALUES (3, 1, 'Dell PowerEdge R750xs Rack Server', 'Dual Intel Xeon Silver 4314, 64GB ECC RAM, 2x 960GB SAS SSD RAID-1', 1, 240000.00);

INSERT INTO approvals (request_id, approval_id, approver_id, approver_role, step_order, decision, remarks, decided_at) VALUES
  (3, 1, 4, 'HOD', 1, 'APPROVED', 'InfoCell infrastructure upgrade.', NOW() - INTERVAL '14 days'),
  (3, 2, 4, 'COORDINATOR', 2, 'APPROVED', 'Specs verified.', NOW() - INTERVAL '13 days'),
  (3, 3, 5, 'REGISTRAR', 3, 'APPROVED', 'Approved.', NOW() - INTERVAL '12 days'),
  (3, 4, 6, 'VC', 4, 'APPROVED', 'Approved.', NOW() - INTERVAL '11 days'),
  (3, 5, 7, 'PC', 5, 'APPROVED', 'Commercial terms cleared.', NOW() - INTERVAL '10 days');

INSERT INTO quotations (quotation_id, request_id, supplier_id, amount, is_selected, quoted_on) VALUES
  (1, 3, 1, 235000.00, true, CURRENT_DATE - INTERVAL '9 days'),
  (2, 3, 2, 248000.00, false, CURRENT_DATE - INTERVAL '9 days');

INSERT INTO purchase_orders (po_id, request_id, supplier_id, po_number, total_amount, status, created_at)
VALUES (1, 3, 1, 'PO-2026-0001', 235000.00, 'ISSUED', NOW() - INTERVAL '8 days');

-- 7. Sample Request 4: COMPLETED (Goods Receipts, Durable Asset Tags, and Stock Ledger)
INSERT INTO purchase_requests (request_id, dept_id, requested_by, justification, total_amount, status, created_at)
VALUES (4, 1, 2, 'Workstation desktop computers for Systems Programming Laboratory.', 240000.00, 'COMPLETED', NOW() - INTERVAL '30 days');

INSERT INTO request_items (request_id, item_id, item_name, specification, quantity, estimated_price)
VALUES (4, 1, 'HP ProDesk 600 G6 Desktop Workstation', 'Intel Core i7-10700, 16GB DDR4, 512GB SSD, 24-inch IPS Monitor', 4, 60000.00);

INSERT INTO approvals (request_id, approval_id, approver_id, approver_role, step_order, decision, remarks, decided_at) VALUES
  (4, 1, 2, 'HOD', 1, 'APPROVED', 'Approved for CS Systems Lab.', NOW() - INTERVAL '30 days'),
  (4, 2, 4, 'COORDINATOR', 2, 'APPROVED', 'Technical specs cleared.', NOW() - INTERVAL '29 days'),
  (4, 3, 5, 'REGISTRAR', 3, 'APPROVED', 'Approved.', NOW() - INTERVAL '28 days'),
  (4, 4, 6, 'VC', 4, 'APPROVED', 'Approved.', NOW() - INTERVAL '27 days'),
  (4, 5, 7, 'PC', 5, 'APPROVED', 'Commercial terms cleared.', NOW() - INTERVAL '26 days');

INSERT INTO quotations (quotation_id, request_id, supplier_id, amount, is_selected, quoted_on) VALUES
  (3, 4, 2, 230000.00, true, CURRENT_DATE - INTERVAL '25 days');

INSERT INTO purchase_orders (po_id, request_id, supplier_id, po_number, total_amount, status, created_at)
VALUES (2, 4, 2, 'PO-2026-0002', 230000.00, 'COMPLETED', NOW() - INTERVAL '24 days');

INSERT INTO goods_receipts (receipt_id, po_id, received_by, request_id, item_id, quantity_received, received_on)
VALUES (1, 2, 8, 4, 1, 4, CURRENT_DATE - INTERVAL '20 days');

INSERT INTO assets (asset_id, asset_code, name, type, dept_id, receipt_id, location, condition, quantity) VALUES
  (1, 'KLE-CS-2026-0001', 'HP ProDesk 600 G6 Desktop Workstation', 'DURABLE', 1, 1, 'CS Systems Lab Room 204', 'NEW', 1),
  (2, 'KLE-CS-2026-0002', 'HP ProDesk 600 G6 Desktop Workstation', 'DURABLE', 1, 1, 'CS Systems Lab Room 204', 'NEW', 1),
  (3, 'KLE-CS-2026-0003', 'HP ProDesk 600 G6 Desktop Workstation', 'DURABLE', 1, 1, 'CS Systems Lab Room 204', 'NEW', 1),
  (4, 'KLE-CS-2026-0004', 'HP ProDesk 600 G6 Desktop Workstation', 'DURABLE', 1, 1, 'CS Systems Lab Room 204', 'NEW', 1);

INSERT INTO stock_transactions (txn_id, asset_id, done_by, txn_type, quantity, from_dept_id, to_dept_id, txn_date) VALUES
  (1, 1, 8, 'ADDITION', 1, NULL, 1, NOW() - INTERVAL '20 days'),
  (2, 2, 8, 'ADDITION', 1, NULL, 1, NOW() - INTERVAL '20 days'),
  (3, 3, 8, 'ADDITION', 1, NULL, 1, NOW() - INTERVAL '20 days'),
  (4, 4, 8, 'ADDITION', 1, NULL, 1, NOW() - INTERVAL '20 days');

-- 8. Consumables
INSERT INTO assets (asset_id, asset_code, name, type, dept_id, receipt_id, location, condition, quantity) VALUES
  (5, 'KLE-CS-2026-C001', 'High-Speed Gold Plated HDMI Cables (3m)', 'CONSUMABLE', 1, NULL, 'CS Hardware Store', 'NEW', 45),
  (6, 'KLE-CS-2026-C002', 'Surge Protected Power Extension Strips (6-Port)', 'CONSUMABLE', 1, NULL, 'CS Hardware Store', 'NEW', 18);

INSERT INTO stock_transactions (txn_id, asset_id, done_by, txn_type, quantity, from_dept_id, to_dept_id, txn_date) VALUES
  (5, 5, 8, 'ADDITION', 50, NULL, 1, NOW() - INTERVAL '15 days'),
  (6, 5, 8, 'ISSUE', -5, 1, NULL, NOW() - INTERVAL '10 days'),
  (7, 6, 8, 'ADDITION', 18, NULL, 1, NOW() - INTERVAL '12 days');
