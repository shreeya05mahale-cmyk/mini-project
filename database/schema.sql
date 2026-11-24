-- ============================================================================
-- KLE Tech - University IT Asset Inventory & Procurement Management System
-- Database Schema (Normalized to 3NF from Chen ER Diagram)
-- ============================================================================

-- Drop existing tables in reverse dependency order for clean re-creation
DROP TABLE IF EXISTS stock_transactions CASCADE;
DROP TABLE IF EXISTS assets CASCADE;
DROP TABLE IF EXISTS goods_receipts CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS quotations CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS approvals CASCADE;
DROP TABLE IF EXISTS request_items CASCADE;
DROP TABLE IF EXISTS purchase_requests CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS "session" CASCADE;

-- ----------------------------------------------------------------------------
-- 1. DEPARTMENTS
-- Academic and administrative departments within the university.
-- ----------------------------------------------------------------------------
CREATE TABLE departments (
    dept_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

-- ----------------------------------------------------------------------------
-- 2. USERS
-- System users with specific institutional roles.
-- Partial participation with departments: Executive roles (VC, Registrar, PC, Admin)
-- do not belong to an academic department (dept_id is NULL).
-- ----------------------------------------------------------------------------
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('ADMIN', 'HOD', 'COORDINATOR', 'REGISTRAR', 'VC', 'PC', 'STORE')),
    dept_id INT REFERENCES departments(dept_id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------------------
-- 3. PURCHASE_REQUESTS
-- Initiated by an HOD on behalf of their department.
-- total_amount is a DERIVED attribute calculated as SUM(quantity * estimated_price)
-- from request_items. Always calculated server-side, never trusted from client.
-- ----------------------------------------------------------------------------
CREATE TABLE purchase_requests (
    request_id SERIAL PRIMARY KEY,
    dept_id INT NOT NULL REFERENCES departments(dept_id) ON DELETE RESTRICT,
    requested_by INT NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    subject VARCHAR(255),
    justification TEXT NOT NULL,
    budget_details JSONB,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    status VARCHAR(30) NOT NULL DEFAULT 'UNDER_APPROVAL' 
        CHECK (status IN ('UNDER_APPROVAL', 'APPROVED', 'REJECTED', 'ORDERED', 'PARTIALLY_RECEIVED', 'COMPLETED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 4. REQUEST_ITEMS (Weak Entity, Owner: purchase_requests)
-- Identified by composite primary key (request_id, item_id).
-- Cascades on delete with owner request.
-- ----------------------------------------------------------------------------
CREATE TABLE request_items (
    request_id INT NOT NULL REFERENCES purchase_requests(request_id) ON DELETE CASCADE,
    item_id INT NOT NULL,
    item_name VARCHAR(150) NOT NULL,
    specification TEXT,
    quantity INT NOT NULL CHECK (quantity > 0),
    estimated_price NUMERIC(12, 2) NOT NULL CHECK (estimated_price >= 0),
    PRIMARY KEY (request_id, item_id)
);

-- ----------------------------------------------------------------------------
-- 5. APPROVALS (Weak Entity, Owner: purchase_requests)
-- Sequential approval steps generated based on the request's total_amount.
-- Identified by composite primary key (request_id, approval_id).
-- When decision != 'PENDING', both approver_id and decided_at must be NOT NULL.
-- ----------------------------------------------------------------------------
CREATE TABLE approvals (
    request_id INT NOT NULL REFERENCES purchase_requests(request_id) ON DELETE CASCADE,
    approval_id INT NOT NULL,
    approver_id INT REFERENCES users(user_id) ON DELETE RESTRICT,
    approver_role VARCHAR(30) NOT NULL,
    step_order INT NOT NULL,
    decision VARCHAR(20) NOT NULL DEFAULT 'PENDING' 
        CHECK (decision IN ('PENDING', 'APPROVED', 'REJECTED')),
    remarks TEXT,
    decided_at TIMESTAMPTZ,
    PRIMARY KEY (request_id, approval_id),
    UNIQUE (request_id, step_order),
    CONSTRAINT chk_decision_consistency CHECK (
        (decision = 'PENDING') OR 
        (decision IN ('APPROVED', 'REJECTED') AND approver_id IS NOT NULL AND decided_at IS NOT NULL)
    )
);

-- ----------------------------------------------------------------------------
-- 6. SUPPLIERS
-- Registered vendors who can provide quotations and fulfill purchase orders.
-- ----------------------------------------------------------------------------
CREATE TABLE suppliers (
    supplier_id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    contact VARCHAR(100),
    address TEXT
);

-- ----------------------------------------------------------------------------
-- 7. QUOTATIONS
-- Bids submitted by suppliers against approved purchase requests.
-- A supplier may submit at most one quotation per request.
-- ----------------------------------------------------------------------------
CREATE TABLE quotations (
    quotation_id SERIAL PRIMARY KEY,
    request_id INT NOT NULL REFERENCES purchase_requests(request_id) ON DELETE CASCADE,
    supplier_id INT NOT NULL REFERENCES suppliers(supplier_id) ON DELETE RESTRICT,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    is_selected BOOLEAN NOT NULL DEFAULT false,
    quoted_on DATE NOT NULL,
    UNIQUE (request_id, supplier_id)
);

-- ----------------------------------------------------------------------------
-- 8. PURCHASE_ORDERS
-- Official orders prepared by InfoCell Coordinator following supplier selection.
-- po_number format: PO-YYYY-0001
-- ----------------------------------------------------------------------------
CREATE TABLE purchase_orders (
    po_id SERIAL PRIMARY KEY,
    request_id INT NOT NULL REFERENCES purchase_requests(request_id) ON DELETE RESTRICT,
    supplier_id INT NOT NULL REFERENCES suppliers(supplier_id) ON DELETE RESTRICT,
    po_number VARCHAR(50) NOT NULL UNIQUE,
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
    status VARCHAR(30) NOT NULL DEFAULT 'ISSUED'
        CHECK (status IN ('ISSUED', 'PARTIALLY_RECEIVED', 'COMPLETED', 'CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 9. GOODS_RECEIPTS
-- Deliveries recorded by the Store department against a purchase order.
-- Composite foreign key (request_id, item_id) references request_items to 
-- ensure delivery connects to the exact line item without storing free text.
-- ----------------------------------------------------------------------------
CREATE TABLE goods_receipts (
    receipt_id SERIAL PRIMARY KEY,
    po_id INT NOT NULL REFERENCES purchase_orders(po_id) ON DELETE RESTRICT,
    received_by INT NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    request_id INT NOT NULL,
    item_id INT NOT NULL,
    quantity_received INT NOT NULL CHECK (quantity_received > 0),
    received_on DATE NOT NULL,
    FOREIGN KEY (request_id, item_id) REFERENCES request_items(request_id, item_id) ON DELETE RESTRICT
);

-- ----------------------------------------------------------------------------
-- 10. ASSETS
-- Durable items: one row per physical unit with unique asset_code (KLE-<DEPT>-<YYYY>-0001) and quantity = 1.
-- Consumables: one row per item per department with quantity = stock count.
-- receipt_id is nullable (assets entered prior to system adoption have no receipt).
-- ----------------------------------------------------------------------------
CREATE TABLE assets (
    asset_id SERIAL PRIMARY KEY,
    asset_code VARCHAR(60) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('DURABLE', 'CONSUMABLE')),
    dept_id INT NOT NULL REFERENCES departments(dept_id) ON DELETE RESTRICT,
    receipt_id INT REFERENCES goods_receipts(receipt_id) ON DELETE SET NULL,
    location VARCHAR(100),
    condition VARCHAR(20) NOT NULL DEFAULT 'NEW'
        CHECK (condition IN ('NEW', 'GOOD', 'FAIR', 'DAMAGED', 'DISPOSED')),
    quantity INT NOT NULL CHECK (quantity >= 0),
    specifications JSONB
);

-- ----------------------------------------------------------------------------
-- 11. STOCK_TRANSACTIONS
-- Immutable audit ledger recording all physical stock additions, issues,
-- returns, transfers, adjustments, and disposals. Never modified or deleted.
-- ----------------------------------------------------------------------------
CREATE TABLE stock_transactions (
    txn_id SERIAL PRIMARY KEY,
    asset_id INT NOT NULL REFERENCES assets(asset_id) ON DELETE RESTRICT,
    done_by INT NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    txn_type VARCHAR(20) NOT NULL 
        CHECK (txn_type IN ('ADDITION', 'ISSUE', 'RETURN', 'TRANSFER', 'ADJUSTMENT', 'DISPOSAL')),
    quantity INT NOT NULL CHECK (quantity <> 0),
    from_dept_id INT REFERENCES departments(dept_id) ON DELETE SET NULL,
    to_dept_id INT REFERENCES departments(dept_id) ON DELETE SET NULL,
    txn_date TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 12. SESSIONS (express-session with connect-pg-simple)
-- Stores user session cookies in PostgreSQL for persistent login state.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "session" (
    "sid" varchar NOT NULL COLLATE "default",
    "sess" json NOT NULL,
    "expire" timestamp(6) NOT NULL,
    CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);

-- ----------------------------------------------------------------------------
-- INDEXES FOR FOREIGN KEYS & QUERY PERFORMANCE
-- ----------------------------------------------------------------------------
CREATE INDEX idx_users_dept ON users(dept_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_pr_dept ON purchase_requests(dept_id);
CREATE INDEX idx_pr_status ON purchase_requests(status);
CREATE INDEX idx_approvals_step ON approvals(request_id, step_order);
CREATE INDEX idx_quotations_req ON quotations(request_id);
CREATE INDEX idx_po_req ON purchase_orders(request_id);
CREATE INDEX idx_gr_po ON goods_receipts(po_id);
CREATE INDEX idx_assets_dept ON assets(dept_id);
CREATE INDEX idx_assets_type ON assets(type);
CREATE INDEX idx_stock_txn_asset ON stock_transactions(asset_id);
CREATE INDEX idx_stock_txn_date ON stock_transactions(txn_date);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
