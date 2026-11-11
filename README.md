# KLE Tech - University Asset Inventory & Procurement Management System

A centralized web-based management system designed for the **InfoCell department at KLE Tech**. It streamlines the complete IT asset procurement lifecycle: from department purchase requests, multi-level sequential approvals, supplier quotation comparisons, and purchase orders to goods receipts, durable asset tagging, consumable inventory tracking, and complete audit trail ledgers.

---

## Architecture: The Four Engines

The system is structured around four distinct functional engines:

- **E1 – Request Prioritization & Workflow Engine** (`server/services/workflow/`):
  Manages purchase requests, dynamic sequential approval chains, quotation comparisons, supplier selection, and purchase order lifecycles.
- **E2 – Asset Transaction & Ledger Engine** (`server/services/ledger/`):
  Records goods receipts, generates individual asset codes (`KLE-<DEPT>-<YYYY>-0001`), manages consumable stock, and maintains an immutable audit ledger (`stock_transactions`).
- **E3 – Concurrency Control & Process Synchronisation Engine** (`server/services/concurrency/`):
  Protects data integrity using row-level locking (`SELECT ... FOR UPDATE`), prevents over-delivery and double-allocation, and prevents duplicate submissions.
- **E4 – Web & Communication Engine** (`server/middleware/`, `server/controllers/`, `public/`):
  Handles session authentication, role-based access control, input validation, dynamic notification calculations, and the responsive vanilla frontend.

---

## Technology Stack

- **Frontend:** Plain HTML5, CSS3 (custom properties, PennyLane-inspired warm palette), Vanilla JavaScript (ES6+ `fetch`). No heavy frameworks or external CSS libraries.
- **Backend:** Node.js with Express.js (REST API returning JSON).
- **Database:** PostgreSQL (accessed via `pg` with plain parameterized SQL queries `$1, $2`).
- **Authentication:** `express-session` with `connect-pg-simple` (sessions stored in PostgreSQL) and `bcrypt` for password hashing.
- **Configuration:** `dotenv` with environment variables.

---

## Setup & Running the Application

### 1. Prerequisites
- **Node.js** (v18 or higher) and **npm**
- **PostgreSQL** (v14 or higher) running on `localhost:5432`

### 2. Environment Configuration
Copy the sample environment file to create your local `.env`:
```bash
cp .env.example .env
```
Ensure your `.env` contains the correct database credentials:
```env
PORT=3000
SESSION_SECRET=kle_infocell_secure_session_secret_2026_dev
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=postgres
PGDATABASE=kle_asset_db
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Start the Application
```bash
npm start
```
The server will start at: `http://localhost:3000`

### 5. Health Check
Open your browser or test via curl:
```bash
curl http://localhost:3000/api/health
```
You should receive a JSON response confirming that the server is operational and connected to `kle_asset_db`.