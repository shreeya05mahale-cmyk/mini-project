# Implementation Progress & Roadmap Tracker

KLE Tech University IT Asset Inventory & Procurement Management System

---

## 📊 Overall Progress Summary

| Engine / Module | Scope | Status | Completion % |
|---|---|---|---|
| **Engine 4** | Foundation, Auth, Sessions & Dashboard | ✅ Completed | 100% |
| **Database & Schema** | 3NF Normalization, Indexes, JSONB Specs | ✅ Completed | 100% |
| **API Documentation** | OpenAPI 3.0 & Swagger UI at `/api-docs` | ✅ Completed | 100% |
| **Real Asset Ingestion** | Lab 1-7 Desktops & Register Provenance (286 PCs) | ✅ Completed | 100% |
| **Engine 2** | Asset Registry & Inventory Web UI (`/inventory.html`) | ✅ Completed | 100% |
| **Engine 1** | Institutional Letter Requisitions & Multi-Tier Approvals | ✅ Completed | 100% |
| **Engine 1 (Procurement)** | Quotations & Purchase Order Generation | ⏳ Next Up (Phase 5) | 0% |
| **Engine 2 (Store)** | Goods Receipts & Delivery Reconciliation | ⏳ Pending (Phase 6) | 0% |
| **Engine 2 & 3** | Internal Stock Transfers & Audit Reports | ⏳ Pending (Phase 7) | 0% |

---

## 🔍 Detailed Component Status

### 1. Database & Foundation (Engine 4)
- [x] Full 3NF Normalized schema with 12 tables (`database/schema.sql`).
- [x] Foreign keys with appropriate delete actions (`CASCADE`, `RESTRICT`, `SET NULL`).
- [x] Performance indexes on foreign keys & filtering columns.
- [x] User authentication with `bcrypt` (10 rounds) and PostgreSQL-backed sessions (`connect-pg-simple`).
- [x] Role-Based Access Control middleware (`requireLogin`, `requireRole`).
- [x] Scoped single HOD for CSE Department (`Dr. CS HOD`).
- [x] Seeded 65 official registered university vendors from `documents/vendor list.docx`.
- [x] Cleaned operational tables to start fresh for viva demonstrations.

### 2. University Asset Ingestion (286 PCs)
- [x] Ingested all physical lab machines from `CSE Desktop Data 24-09-2026.xlsx`.
- [x] Reconciled count to exact written totals across all labs (Lab 1: 43, Lab 2: 62, Lab 3: 45, Lab 4: 43, Lab 5: 43, Lab 7: 46, C-Lab 1: 1, C-Lab 2: 3 = **286 PCs**).
- [x] Reconciled and linked physical Inward Stock Register records (#296, #728, #419, #279) with vendors, bill numbers, dates, and unit prices.
- [x] Appended `Register_Mapping` sheet inside the Excel workbook.
- [x] Added `specifications JSONB` to store CPU, RAM, storage, monitor, OS, antivirus, and licensing.

### 3. Front-End Web Application & Design System
- [x] Professional Academic Tech design system (`public/css/style.css`).
- [x] Shared layout manager (`public/js/layout.js`) with dynamic role-based sidebar and topbar. Formatted role titles (Vice Chancellor, Pro Chancellor).
- [x] Removed "K" brand badge from all headers per university UI styling.
- [x] Login page (`public/login.html`) with role buttons that autofill email only, explicitly labeled with full titles "Vice Chancellor" and "Pro Chancellor".
- [x] Dashboard page (`public/index.html`) with dynamic metrics, on-the-fly notifications, and role quick actions with full official titles.
- [x] Inventory & Asset Registry page (`public/inventory.html` + `inventory.js`):
  - Fixed lab filter matching for all academic labs (Lab 1: 43, Lab 2: 62, Lab 3: 45, Lab 4: 43, Lab 5: 43, Lab 7: 46, C-Lab 1: 1, C-Lab 2: 3 = 286 PCs total).
  - Fixed specification modal click breaking on double-quote characters in monitor dimensions (e.g. `18.5"`) by implementing safe in-memory index event delegation.
  - Added full-text specification search across CPU models, generations (e.g. "10th", "i5"), OS, vendor, and register numbers.
  - Fixed undefined CSS variables (`--border-color`, `--radius-sm/md`) to restore styling across inputs, modals, and pagination controls.

### 4. Institutional Requisition Letter & Multi-Tier Approvals (Engine 1)
- [x] **Official InfoCell Form Template (`/request-new.html`)**:
  - Exact match of the university's official **"PROCUREMENT REQUISITION FORM"** (`https://tinyurl.com/Procurement-Form2026`).
  - Top header: KLE Technological University (left) & bold **INFOCELL** heading (right).
  - Centered underlined title: **PROCUREMENT REQUISITION FORM**.
  - Dynamic Reference ID (`KLE-TECH/INFOCELL/REQ/2026/001`) fetching next sequence number in real time.
  - Real-time date display (`new Date()`).
  - From: Head of the Department (CSE) | To: The Coordinator, Information Services Cell, Hubballi.
  - Pure 7-column academic requirement table: Sl. No., Details of material/equipment, Specification, Qty, Location, Purpose, ISR No. & Date of Purchase.
  - Placeholders used across all inputs instead of pre-filled static text.
  - Mandatory footnote: *Note: ISR number and Date of Purchase details field is mandatory for repair/ replacement of consumables/equipments.*
- [x] **Gatekeeper Technical Scrutiny & Dynamic Tier Routing**:
  - HOD submits equipment needs without vendor price valuations.
  - Request routes directly to InfoCell Coordinator (`COORDINATOR`).
  - In `/approvals.html`, the Coordinator inspects the technical requirements, inputs the estimated market cost (₹), and selects the approval tier:
    - **Tier 1** ($\le$ ₹50,000): Dynamically routes to Registrar.
    - **Tier 2** (₹50,000 to ₹2,00,000): Dynamically routes to Registrar $\rightarrow$ Vice Chancellor.
    - **Tier 3** (> ₹2,00,000): Dynamically routes to Registrar $\rightarrow$ Vice Chancellor $\rightarrow$ Pro Chancellor.
  - Total request amount updated upon Coordinator valuation.
- [x] **Official Document View & Sequential Approval Trail (`/request-detail.html`)**:
  - Authentic 7-column university format with institutional stamp cards.
  - Displays "Awaiting InfoCell Coordinator Market Valuation" until coordinator scrutiny is complete.
  - Sequential enforcement: no downstream authority can act until prior officer approves.
- [x] **Rejection Circuit Breaker**:
  - Rejection immediately halts workflow and marks status as `REJECTED`.
  - Rejection grounds returned to HOD dashboard and requisition detail view.

### 5. Inventory Registry & Quantity Controls (`/inventory.html`)
- [x] **Inline Quantity Adjustments**:
  - Added `[-]` and `[+]` quick quantity controls for each asset row with immediate server persistence (`PATCH /api/assets/:id/quantity`).
- [x] **New Asset Ingestion Modal (`+ Add Asset Unit`)**:
  - Modal with location dropdown, make/model, condition, unit cost, vendor, and technical specifications (processor, RAM, storage, monitor, OS).
  - Auto-generates standard institutional asset codes (e.g., `Lab4-PC44`).
- [x] **Asset Removal & Decommissioning**:
  - Delete action button (`✕`) for removing decommissioned or redundant units.

### 6. Clean Navigation & Dashboard Streamlining
- [x] Hidden future lifecycle modules (Quotations, Purchase Orders, Vendors, Goods Receipts, Stock Movements) from sidebar navigation; database tables preserved intact.
- [x] Streamlined Dashboard (`/index.html`):
  - Removed "Logged in as HOD..." subtitle; displays clean "Welcome back, [First Name]".
  - Removed duplicate quick action card.
  - Prominently placed "Recent Purchase Requests" table at the top directly beneath core metrics.
  - Kept "+ New Purchase Request" button strictly inside the Purchase Requests tab (`/requests.html`).
- [x] Reset request sequence to clean ID sequence starting from **#1**.

### 7. Automated End-to-End Test Suite (`scripts/test-e2e-suite.js`)
- [x] Automated script testing:
  - Sequence starting at #1 (`KLE-TECH/INFOCELL/REQ/2026/001`).
  - HOD submission with 0 default price.
  - Coordinator valuation (₹1,80,000) and dynamic Tier 2 routing.
  - Registrar endorsement and Vice Chancellor final `APPROVED` status.
  - Immediate circuit breaking on Rejection (Request #2).
  - Inventory unit creation, quantity increment (`+1`), decrement (`-1`), and deletion.

---

## 🎯 Next Steps & Milestones

1. **Phase 5: Quotations & Purchase Order Generation (Engine 1 - Procurement)**
   - Quotation entry and comparative statement matrix.
   - Designated supplier assignment from registered vendors.
   - Official Purchase Order generation matching university physical purchase order copies.
