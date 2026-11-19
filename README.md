# KLE Tech - University IT Asset Inventory & Procurement Management System

A full-stack, enterprise-grade university procurement and asset management web application built for the **InfoCell Department, KLE Technological University**.

The platform digitalizes the complete paper-based institutional lifecycle: department purchase requisition, multi-tier hierarchical approvals, quotation comparison, purchase order generation, goods receiving, durable asset tracking (ISR tags), and consumable inventory audits.

---

## 🏛️ System Architecture

* **Backend:** Node.js & Express REST API (`server/`)
* **Database:** PostgreSQL 18 (`database/schema.sql` normalized to 3NF)
* **Session Management:** `connect-pg-simple` with PostgreSQL persistent storage (HTTP-only secure cookies)
* **Interactive API Documentation:** Swagger UI (OpenAPI 3.0) at `/api-docs`
* **Frontend:** Responsive vanilla JavaScript, CSS variables design system (`public/`)

---

## 🚀 Live Demo & Endpoints

| Resource | URL | Description |
|---|---|---|
| **Web Portal** | `http://localhost:3000/` | Main web interface & dashboards |
| **Asset Registry** | `http://localhost:3000/inventory.html` | Real-time searchable & filterable lab asset registry |
| **Swagger UI Docs** | `http://localhost:3000/api-docs` | Interactive OpenAPI playground to test all endpoints |
| **System Health** | `http://localhost:3000/api/health` | Live server & PostgreSQL connectivity status |

---

## 👥 Role-Based Access Control (RBAC) & Accounts

All accounts use the standard test password: **`password123`** *(hashed using `bcrypt` in PostgreSQL)*.

| Role | User Name | Email | Primary Responsibilities |
|---|---|---|---|
| **HOD (CSE)** | Dr. CS HOD | `hod.cs@kletech.ac.in` | Submits purchase requests, monitors CSE lab inventory |
| **COORDINATOR** | Prof. InfoCell Coordinator | `coordinator@kletech.ac.in` | Technical review, quotation comparison, vendor management, PO issuance |
| **REGISTRAR** | University Registrar | `registrar@kletech.ac.in` | Financial approval for requests > ₹50,000 |
| **VC** | Vice Chancellor | `vc@kletech.ac.in` | Executive sanction approval for requests > ₹2,00,000 |
| **PC** | Purchase Committee Head | `pc@kletech.ac.in` | Joint committee sanction approval for requests > ₹2,00,000 |
| **STORE** | Chief Storekeeper | `store@kletech.ac.in` | Physical receiving inspection, delivery slips, stock transactions |
| **ADMIN** | System Administrator | `admin@kletech.ac.in` | System configuration, user management, global audit reports |

---

## 💻 University Inventory Ingestion (286 Desktops)

The database contains **286 physical desktop computers** mapped directly from university lab registers and historical Inward Stock Registers:

* **Lab 1 (43 PCs):** HP Prodesk 400 G7 *(Pursuit Technologies, Bill `HBLINV266/21-22`, Reg #296)* + HP 3330 MT
* **Lab 2 (62 PCs):** HP Prodesk 2 AI Towers *(Pursuit IT Solutions, Bill `PITS/2627/0201`, Reg #728)* + Fingers H110 (`CSE-LAB2-62`)
* **Lab 3 (45 PCs):** HP Prodesk 2 AI Towers *(Pursuit IT Solutions, Bill `PITS/2627/0201`, Reg #728)* + HP 280 G1/G3
* **Lab 4 (43 PCs):** HP 280 G9 *(Pursuit Technologies, Bill `HBLINV262/30521`, Reg #419)* + HP 280 G1
* **Lab 5 (43 PCs):** Lenovo IdeaCentre 3 90NB0020IN *(RT Computers, Bill `RTC20003940`, Reg #279)* + HP 280 G3 + HP 400 G2 Server
* **Lab 7 (46 PCs):** HP Prodesk 2 AI Towers *(Pursuit IT Solutions, Bill `PITS/2627/0201`, Reg #728)* + HP 280 G3 (`CSE-LAB7-43`) + Lenovo ThinkCentre
* **C-Lab 1 (1 PC):** Computing Lab 1 machine (`Computing-Lab1`)
* **C-Lab 2 (3 PCs):** Projector PC (`CSE-LCD`), Lab machine (`CSE-Lab2`), Faculty PC (`CS-SMB`)

Every asset record stores complete hardware attributes in a PostgreSQL **`specifications JSONB`** column (Processor, RAM, HDD/SSD, Monitor size, OS, Licensing, Antivirus check).

---

## 🛠️ Local Development & Setup

### 1. Prerequisites
* Node.js (v18+)
* PostgreSQL (v14+) running locally on port `5432` with database `kle_asset_db`

### 2. Environment Configuration (`.env`)
```ini
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=kle_asset_db
DB_USER=postgres
DB_PASSWORD=postgres
SESSION_SECRET=kle_infocell_secret_dev_2026
```

### 3. Setup Commands
```powershell
# Install dependencies
npm install

# Initialize database schema
npm run db:init

# Seed initial users & departments
npm run seed

# Import university lab assets & register mapping
node scripts/import-university-data.js

# Start server
npm start
```

---

## 📌 Implementation Tracking
For a detailed task-by-task status breakdown across all four engines, see [PROGRESS.md](file:///d:/college/5/mini-project/mini-project/PROGRESS.md).
