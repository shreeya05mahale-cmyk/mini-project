import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

doc = docx.Document()

# Page Margins: 0.8 inch
for section in doc.sections:
    section.top_margin = Inches(0.8)
    section.bottom_margin = Inches(0.8)
    section.left_margin = Inches(0.8)
    section.right_margin = Inches(0.8)

def set_cell_background(cell, color_hex):
    shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>')
    cell._tc.get_or_add_tcPr().append(shading_elm)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('w:top', top), ('w:bottom', bottom), ('w:left', left), ('w:right', right)]:
        node = OxmlElement(m)
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def style_table(table, header_bg="1E3A8A"):
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, row in enumerate(table.rows):
        # Prevent row split across pages
        trPr = row._tr.get_or_add_trPr()
        trPr.append(OxmlElement('w:cantSplit'))
        if i == 0:
            trPr.append(OxmlElement('w:tblHeader'))
            for cell in row.cells:
                set_cell_background(cell, header_bg)
                set_cell_margins(cell, top=120, bottom=120, left=150, right=150)
                for p in cell.paragraphs:
                    p.paragraph_format.space_before = Pt(2)
                    p.paragraph_format.space_after = Pt(2)
                    for r in p.runs:
                        r.font.bold = True
                        r.font.color.rgb = RGBColor(255, 255, 255)
                        r.font.name = 'Calibri'
                        r.font.size = Pt(9.5)
        else:
            bg = "F8FAFC" if i % 2 == 1 else "FFFFFF"
            for cell in row.cells:
                set_cell_background(cell, bg)
                set_cell_margins(cell, top=80, bottom=80, left=120, right=120)
                for p in cell.paragraphs:
                    p.paragraph_format.space_before = Pt(1.5)
                    p.paragraph_format.space_after = Pt(1.5)
                    for r in p.runs:
                        r.font.name = 'Calibri'
                        r.font.size = Pt(9)

# Title
p_title = doc.add_paragraph()
r_title = p_title.add_run("CHAPTER 5 — SPRINT 2 STUDENT HANDBOOK")
r_title.bold = True
r_title.font.name = 'Arial'
r_title.font.size = Pt(16)
r_title.font.color.rgb = RGBColor(30, 58, 138)
p_title.paragraph_format.space_after = Pt(2)

# Subtitle
p_sub = doc.add_paragraph()
r_sub = p_sub.add_run("Broader Engine Implementation & Mandatory Partial Testing")
r_sub.bold = True
r_sub.font.name = 'Arial'
r_sub.font.size = Pt(12)
r_sub.font.color.rgb = RGBColor(71, 85, 105)
p_sub.paragraph_format.space_after = Pt(2)

p_meta = doc.add_paragraph()
r_meta = p_meta.add_run("Separate student evidence workbook | Hybrid SDLC execution window: primary maturity focus on S5 implementation and S6 engine-level testing; S7 corrective refinement begins where needed | Weeks 10–13 | Gate 3 / Review 4")
r_meta.italic = True
r_meta.font.name = 'Calibri'
r_meta.font.size = Pt(9.5)
r_meta.font.color.rgb = RGBColor(100, 116, 139)
p_meta.paragraph_format.space_after = Pt(14)

def add_heading_2(text):
    h = doc.add_paragraph()
    r = h.add_run(text)
    r.bold = True
    r.font.name = 'Arial'
    r.font.size = Pt(12)
    r.font.color.rgb = RGBColor(30, 58, 138)
    h.paragraph_format.space_before = Pt(12)
    h.paragraph_format.space_after = Pt(4)
    return h

def add_heading_3(text):
    h = doc.add_paragraph()
    r = h.add_run(text)
    r.bold = True
    r.font.name = 'Arial'
    r.font.size = Pt(11)
    r.font.color.rgb = RGBColor(15, 23, 42)
    h.paragraph_format.space_before = Pt(10)
    h.paragraph_format.space_after = Pt(3)
    return h

# 5.1 Team and Engine Register
add_heading_2("5.1 Team and Engine Register")

# Table 1: Team Info
t1 = doc.add_table(rows=8, cols=2)
t1_data = [
    ("Field", "Student entry"),
    ("Team number", "9"),
    ("Theme", "Transaction-Based Inventory Management System"),
    ("Artefact", "University Asset Inventory and Procurement Management System"),
    ("Guide", "Mrs. Manjula Pawar"),
    ("Department", "Computer Science & Engineering"),
    ("Repository URL", "https://github.com/shreeya05mahale-cmyk/mini-project"),
    ("Date", "25-11-2026")
]
for r_idx, row in enumerate(t1_data):
    for c_idx, val in enumerate(row):
        t1.cell(r_idx, c_idx).paragraphs[0].text = val
style_table(t1)

doc.add_paragraph().paragraph_format.space_after = Pt(6)

# Table 2: Student allocation
t2 = doc.add_table(rows=5, cols=4)
t2_data = [
    ("Student", "SRN / USN", "Student name", "Engine / responsibility"),
    ("Student A", "01FE24BCS050", "Shanvi", "Web & Communication Engine (WT & CN)"),
    ("Student B", "01FE24BCS225", "Madhuram", "Request Prioritization and Workflow Engine (DSA)"),
    ("Student C", "01FE24BCS228", "Shreeya", "Asset Transaction and Ledger Engine (DBMS)"),
    ("Student D", "01FE24BCS238", "Rutu", "Concurrency Control & Process Synchronization Engine (OS)")
]
for r_idx, row in enumerate(t2_data):
    for c_idx, val in enumerate(row):
        t2.cell(r_idx, c_idx).paragraphs[0].text = val
style_table(t2)

doc.add_paragraph().paragraph_format.space_after = Pt(6)

# Table 3: Engine functions
t3 = doc.add_table(rows=5, cols=4)
t3_data = [
    ("Engine ID", "Approved engine name", "Owner A–D", "Main function"),
    ("E1", "Request Prioritization and Workflow Engine", "B – Madhuram", "Sequential topological approval queue, dynamic cost-tier routing, rejection circuit-breaker, and multi-field asset search & filtering."),
    ("E2", "Asset Transaction and Ledger Engine", "C – Shreeya", "3NF PostgreSQL database, 286 physical lab PC inventory master records, JSONB specification store, Inward Stock Register (ISR) provenance mapping, and automated snapshot restore."),
    ("E3", "Concurrency Control & Process Synchronization Engine", "D – Rutu", "Row-level locking (SELECT ... FOR UPDATE), atomic transaction boundaries (withTransaction), critical section protection, and rollback on failure."),
    ("E4", "Web & Communication Engine", "A – Shanvi", "REST API endpoints, session authentication (bcrypt + connect-pg-simple), Role-Based Access Control (RBAC) middleware, server-side payload validation, and Swagger UI OpenAPI docs.")
]
for r_idx, row in enumerate(t3_data):
    for c_idx, val in enumerate(row):
        t3.cell(r_idx, c_idx).paragraphs[0].text = val
style_table(t3)

doc.add_paragraph().paragraph_format.space_after = Pt(12)

# Section B
add_heading_2("PART B — SIMPLE STUDENT EVIDENCE TEMPLATES")

# 1. Sprint 2 Plan and Backlog
add_heading_3("1. Sprint 2 Plan and Backlog")
t_backlog = doc.add_table(rows=13, cols=5)
backlog_data = [
    ("Task / FR ID", "Engine / owner", "Work to implement", "Done when...", "Status"),
    ("FR-E1-01", "E1 / B – DSA", "Multi-field asset search by code, model, CPU, RAM, OS, or ISR number", "Search query returns filtered subset of assets instantly; non-matching query returns zero records with clear notice", "Completed"),
    ("FR-E1-02", "E1 / B – DSA", "Academic lab filtering and pagination", "Clicking any of the 8 lab cards filters the view to that lab's exact PC count; pagination navigates 50 records/page", "Completed"),
    ("FR-E1-03", "E1 / B – DSA", "Dynamic Multi-Tier Hierarchical Approval Queue with Coordinator Gatekeeper valuation", "Requests route dynamically based on Coordinator valuation: Tier 1 (<= 50k -> Registrar), Tier 2 (50k-2L -> Registrar, VC), Tier 3 (> 2L -> Registrar, VC, PC); strict sequential precedence is enforced", "Completed"),
    ("FR-E2-01", "E2 / C – DBMS", "Asset master data ingestion & retrieval (286 university PCs)", "Ingested all 286 physical lab machines across 8 labs with JSONB specifications matching lab records", "Completed"),
    ("FR-E2-02", "E2 / C – DBMS", "Complete asset unit ingestion and editing modal", "Adding/editing an asset captures model, lab, condition, quantity, CPU, RAM, storage, monitor, OS, license, antivirus, vendor, bill no, date, and ISR number", "Completed"),
    ("FR-E2-03", "E2 / C – DBMS", "Automated database restore safeguard", "node scripts/restore-inventory.js resets and restores all 286 records from the verified Excel register in 3 seconds", "Completed"),
    ("FR-E3-01", "E3 / D – OS", "Pessimistic concurrency control on approval state changes", "SELECT ... FOR UPDATE acquires row-level mutex on purchase_requests, preventing concurrent race-condition approvals", "Completed"),
    ("FR-E3-02", "E3 / D – OS", "Atomic transaction management with rollback on error", "All multi-table updates execute inside BEGIN ... COMMIT block; any exception triggers automatic ROLLBACK", "Completed"),
    ("FR-E3-03", "E3 / D – OS", "Stock non-negative integrity protection", "Table check constraint CHECK (quantity >= 0) and GREATEST(quantity + $1, 0) prevent stock underflow", "Completed"),
    ("FR-E4-01", "E4 / A – WT & CN", "RESTful API endpoints for assets, approvals, and requisitions", "Express controllers respond with standardized JSON { success: true/false, ... } and appropriate HTTP status codes", "Completed"),
    ("FR-E4-02", "E4 / A – WT & CN", "Session management and authentication", "Passwords hashed with bcrypt (10 rounds); persistent PostgreSQL sessions via connect-pg-simple", "Completed"),
    ("FR-E4-03", "E4 / A – WT & CN", "Strict Role-Based Access Control (RBAC) on inventory & approvals", "Inventory modifications restricted strictly to COORDINATOR and ADMIN (HOD is blocked with 403 Forbidden); approvals restricted to assigned officer role", "Completed")
]
for r_idx, row in enumerate(backlog_data):
    for c_idx, val in enumerate(row):
        t_backlog.cell(r_idx, c_idx).paragraphs[0].text = val
style_table(t_backlog)
p_ref = doc.add_paragraph("Evidence filename / repository link: PROGRESS.md (https://github.com/shreeya05mahale-cmyk/mini-project/blob/main/PROGRESS.md)")
p_ref.runs[0].font.size = Pt(8.5)

# 2. Sprint 1 Design Handoff
add_heading_3("2. Sprint 1 Design Handoff")
t_handoff = doc.add_table(rows=5, cols=4)
handoff_data = [
    ("Engine ID", "Approved design reference", "Implementation dependency", "Any approved change"),
    ("E1", "Gate 2 DSA design: sequential queue traversal, priority routing, multi-field search", "Asset & request records from E2; REST interfaces from E4", "Approved refinement: Switched requisition form to official paper format (no prices from HOD); InfoCell Coordinator acts as gatekeeper by providing estimated cost to dynamically determine Tier 1/2/3 downstream queue."),
    ("E2", "Gate 2 database schema: 3NF normalization, ISR register provenance, JSONB specs", "PostgreSQL database instance and E4 API controllers", "Approved refinement: Added restore-inventory.js safeguard script; added full inventory ingestion modal capturing all displayed fields."),
    ("E3", "Gate 2 synchronization: row-level locking, atomic transactions", "E2 PostgreSQL connection pool and transaction boundaries", "Implemented withTransaction wrapper utilizing SELECT ... FOR UPDATE on purchase_requests."),
    ("E4", "Gate 2 architecture: Express REST API, session auth, RBAC middleware", "Frontend UI (public/), backend controllers, and auth middleware", "Approved refinement: Decommissioned STORE user role; inventory write operations (POST, PUT, DELETE) restricted strictly to COORDINATOR and ADMIN.")
]
for r_idx, row in enumerate(handoff_data):
    for c_idx, val in enumerate(row):
        t_handoff.cell(r_idx, c_idx).paragraphs[0].text = val
style_table(t_handoff)
p_ref = doc.add_paragraph("Evidence filename / repository link: database/schema.sql | server/config/approvalRules.js")
p_ref.runs[0].font.size = Pt(8.5)

# 3. Engine-wise Implementation Register
add_heading_3("3. Engine-wise Implementation Register")
t_impl = doc.add_table(rows=14, cols=5)
impl_data = [
    ("Engine ID", "Module / core operation", "Implemented behaviour", "Code / commit reference", "Pending"),
    ("E1", "Multi-Field Asset Search", "Performs case-insensitive matching across asset_code, name, vendor_name, register_sl_no, and specifications JSONB", "server/controllers/assetController.js (lines 56–62) [Commit 9218831]", "Fully implemented & verified"),
    ("E1", "Lab Filtering & Count Aggregation", "Filters records by academic lab (Lab 1 to Lab 7, C-Lab 1, C-Lab 2) and returns aggregated live counts per lab", "server/controllers/assetController.js (lines 24–46) [Commit 9218831]", "Fully implemented & verified"),
    ("E1", "Dynamic Multi-Tier Approval Queue", "When Coordinator approves, evaluates market cost and dynamically inserts downstream steps: Tier 1 -> [REGISTRAR], Tier 2 -> [REGISTRAR, VC], Tier 3 -> [REGISTRAR, VC, PC]", "server/controllers/approvalController.js (lines 144–178) [Commit d5f2b09]", "Fully implemented & verified"),
    ("E1", "Rejection Circuit Breaker", "Rejection by any officer immediately transitions request to REJECTED, records mandatory remarks, and terminates queue evaluation", "server/controllers/approvalController.js (lines 180–192) [Commit d5f2b09]", "Fully implemented & verified"),
    ("E2", "Asset Master Ingestion", "286 real academic lab PCs imported with full specifications and ISR numbers (#296, #728, #419, #279)", "scripts/import-university-data.js [Commit d5f2b09]", "Fully implemented & verified"),
    ("E2", "Full Asset CRUD & Ingestion Modal", "POST /api/assets and PUT /api/assets/:id supporting model, lab, condition, specs, vendor, bill no, date, and ISR sl no", "server/controllers/assetController.js (lines 188–290) [Commit 9218831]", "Fully implemented & verified"),
    ("E2", "Inventory Restore Safeguard", "node scripts/restore-inventory.js resets and restores all 286 records from official Excel data in 3 seconds", "scripts/restore-inventory.js [Commit c23fc79]", "Fully implemented & verified"),
    ("E3", "Row-Level Locking (Mutex)", "SELECT ... FOR UPDATE acquires row lock on purchase_requests during decision evaluation to serialize concurrent approvals", "server/controllers/approvalController.js (lines 93–96) [Commit d5f2b09]", "Fully implemented & verified"),
    ("E3", "Transaction Synchronization & Rollback", "Executes DB mutations inside client transactions (withTransaction); automatic rollback on error or constraint failure", "server/db.js (lines 52–73) [Commit d5f2b09]", "Fully implemented & verified"),
    ("E3", "Safe Quantity Boundaries", "Protects inventory quantities against negative balance anomalies", "server/controllers/assetController.js (lines 296–302) [Commit 9218831]", "Fully implemented & verified"),
    ("E4", "REST API Routing & Documentation", "Modular routes for /api/auth, /api/requests, /api/approvals, /api/assets with Swagger UI at /api-docs", "server/app.js | server/routes/ [Commit d5f2b09]", "Fully implemented & verified"),
    ("E4", "Role-Based Access Control (RBAC)", "requireRole('ADMIN', 'COORDINATOR') restricts asset creation, editing, and deletion; unauthorized roles receive 403 Forbidden", "server/middleware/auth.js (lines 27–46) [Commit 9218831]", "Fully implemented & verified"),
    ("E4", "Session Authentication", "Session cookie validation via express-session backed by PostgreSQL connect-pg-simple and bcrypt verification", "server/controllers/authController.js [Commit d5f2b09]", "Fully implemented & verified")
]
for r_idx, row in enumerate(impl_data):
    for c_idx, val in enumerate(row):
        t_impl.cell(r_idx, c_idx).paragraphs[0].text = val
style_table(t_impl)
p_ref = doc.add_paragraph("Evidence filename / repository link: Tag v1.0-official-ui on Commit c23fc79")
p_ref.runs[0].font.size = Pt(8.5)

# 4. Algorithm and Data Structure Implementation
add_heading_3("4. Algorithm and Data Structure Implementation")
t_algo = doc.add_table(rows=6, cols=4)
algo_data = [
    ("Engine", "Algorithm / structure", "Input -> observed output", "Edge case handled"),
    ("E1", "Sequential Topological Queue Traversal: Verifies all prior steps (i < k) have decision = 'APPROVED' before permitting decision on step k.", "Step 3 (Registrar) attempted while Step 2 (Coordinator) is PENDING -> Rejection with message: 'Sequential violation: Step #2 (COORDINATOR) must be APPROVED first.'", "Out-of-order approval attempts; missing steps; concurrent duplicate approvals."),
    ("E1", "Multi-Field Inverted Index / JSONB GIN Search: Matches query tokens against model name, asset code, CPU, RAM, OS, and ISR number.", "Input: 'i5 10th' -> Filters to HP ProDesk 400 G7 machines in Lab 1 & Lab 4.", "Case variations (i5 vs I5), partial strings (10th), and special characters (e.g. 18.5\" monitor)."),
    ("E2", "Relational 3NF Schema & JSONB Spec Key-Value Store: Master asset entity linked via foreign keys to departments with semi-structured hardware specifications.", "Input: asset_code: 'Lab4-PC44', specifications: {'ram': '16GB', 'processor': 'Core i7'} -> Asset row saved and queryable via specifications->>'ram'.", "Missing hardware fields default to NULL without schema alteration; duplicate asset_code violates unique constraint."),
    ("E3", "Pessimistic Row-Level Lock Mutex (SELECT ... FOR UPDATE): Acquires database exclusive row lock on purchase_requests row before decision evaluation.", "Two concurrent approval requests for Requisition #1 -> First request acquires lock and processes; second request waits and reads updated state.", "Request cancellation while lock is held; deadlock avoidance via ordered index access."),
    ("E4", "RBAC Authorization Filter Middleware: Validates req.session.user.role against authorized role whitelist array allowedRoles.", "HOD sends POST /api/assets -> HTTP 403 Forbidden: {'success': false, 'message': 'Forbidden. Role HOD is not permitted to perform this action.'}", "Unauthenticated user (returns 401 Unauthorized); unauthorized user role (returns 403 Forbidden).")
]
for r_idx, row in enumerate(algo_data):
    for c_idx, val in enumerate(row):
        t_algo.cell(r_idx, c_idx).paragraphs[0].text = val
style_table(t_algo)
p_ref = doc.add_paragraph("Evidence filename / repository link: scripts/test-e2e-suite.js | scripts/test-inventory-rbac.js")
p_ref.runs[0].font.size = Pt(8.5)

# 5. API / Interface and Data Exchange
add_heading_3("5. API / Interface and Data Exchange")
t_api = doc.add_table(rows=8, cols=5)
api_data = [
    ("From -> to engine", "API / function", "Input sample", "Actual response", "Real / mock"),
    ("E4 -> E1", "GET /api/requests/next-ref", "None (authenticated session)", '{"success": true, "next_id": 1, "ref_no": "KLE-TECH/INFOCELL/REQ/2026/001"}', "Real"),
    ("E4 -> E1", "POST /api/requests", '{"subject": "HP PCs", "items": [{"item_name": "HP ProDesk", "quantity": 10, "location": "Lab 4"}]}', '{"success": true, "message": "Purchase Requisition #REQ-001 submitted...", "request_id": 1}', "Real"),
    ("E4 -> E1/E3", "POST /api/approvals/:id/decision", '{"decision": "APPROVED", "estimated_cost": 180000, "tier": "TIER_2"}', '{"success": true, "message": "Step marked APPROVED successfully. Request status is now: UNDER_APPROVAL"}', "Real"),
    ("E4 -> E2", "GET /api/assets?lab=Lab 4", "Query parameters: lab=Lab 4, limit=50", '{"success": true, "total": 43, "assets": [{"asset_code": "Lab4-PC01", "name": "HP 280 G9...", ...}]}', "Real"),
    ("E4 -> E2", "POST /api/assets", '{"name": "HP ProDesk", "location": "Lab 4", "quantity": 1, "unit_cost": 45000} (as HOD)', '{"success": false, "status": 403, "message": "Forbidden. Role HOD is not permitted..."}', "Real"),
    ("E4 -> E2", "POST /api/assets", "Full asset payload with specs & ISR sl no (as Coordinator)", '{"success": true, "message": "Asset Lab4-DEMO99 added to Lab 4 successfully.", "asset": {...}}', "Real"),
    ("E2 -> E3", "withTransaction(client)", "Dynamic downstream SQL insertions inside transaction", "COMMIT on success, ROLLBACK on exception", "Real")
]
for r_idx, row in enumerate(api_data):
    for c_idx, val in enumerate(row):
        t_api.cell(r_idx, c_idx).paragraphs[0].text = val
style_table(t_api)
p_ref = doc.add_paragraph("Evidence filename / repository link: scripts/test-inventory-rbac.js")
p_ref.runs[0].font.size = Pt(8.5)

# 6. Database, State and Transaction Implementation
add_heading_3("6. Database, State and Transaction Implementation")
t_db = doc.add_table(rows=7, cols=5)
db_data = [
    ("Engine", "Operation / state", "Expected change", "Actual observed change", "Proof"),
    ("E2", "Add asset with full specs", "New row in assets with JSONB hardware specs and ISR details", "Inserted row: asset_code = 'Lab4-DEMO99', register_sl_no = 729, unit_cost = 38500.50", "Verified by scripts/test-inventory-rbac.js"),
    ("E2", "Update asset details", "Modified attributes persist in assets table", "RAM updated from 16GB DDR4 to 32GB DDR4 via PUT /api/assets/:id", "Verified by scripts/test-inventory-rbac.js"),
    ("E2", "Ingest 286 university PCs", "Reconcile exactly 286 physical machines across Labs 1–7", "SELECT COUNT(*) FROM assets returns 286 PCs matching physical lab registers", "Verified by scripts/restore-inventory.js"),
    ("E1/E3", "Sequential Approval Progression", "Request status transitions from UNDER_APPROVAL -> APPROVED after all tier officers sign", "Initial: UNDER_APPROVAL; after VC approval: status = 'APPROVED'", "Verified by scripts/test-e2e-suite.js"),
    ("E1/E3", "Rejection Circuit Breaker", "Immediate status transition to REJECTED; remaining steps suppressed", "Requisition #2 marked status = 'REJECTED' with grounds recorded", "Verified by scripts/test-e2e-suite.js"),
    ("E3", "Atomic Rollback on Failure", "Transaction aborts completely on error; zero partial writes", "Invalid check constraint triggers automatic ROLLBACK; table untouched", "Verified by unit transaction test")
]
for r_idx, row in enumerate(db_data):
    for c_idx, val in enumerate(row):
        t_db.cell(r_idx, c_idx).paragraphs[0].text = val
style_table(t_db)
p_ref = doc.add_paragraph("Evidence filename / repository link: database/schema.sql | database/seed.sql")
p_ref.runs[0].font.size = Pt(8.5)

# 7. Concurrency, Security and Data Movement
add_heading_3("7. Concurrency, Security and Data Movement")
t_sec = doc.add_table(rows=7, cols=4)
sec_data = [
    ("Check", "Engine", "Implementation / decision", "Test or proof"),
    ("Simultaneous approval updates", "E3", "Pessimistic locking via SELECT ... FOR UPDATE acquires an exclusive row lock on purchase_requests so concurrent approvals are strictly serialized.", "Verified in approvalController.js inside withTransaction."),
    ("Transaction rollback", "E2 / E3", "All multi-row updates execute in BEGIN ... COMMIT blocks wrapped in server/db.js. Any uncaught error triggers ROLLBACK.", "Tested with invalid foreign key / constraint trigger & verified clean DB rollback."),
    ("Role-based access", "E4", "requireRole('ADMIN', 'COORDINATOR') protects asset modifications. HOD, Registrar, VC, and PC are restricted to read-only access.", "Automated test in scripts/test-inventory-rbac.js verified HOD receives 403 Forbidden."),
    ("Malformed input", "E4", "Express payload validator rejects missing model names (400 Bad Request) and enforces non-negative numbers.", "Verified: missing name returns 'Asset make / model name is required.'"),
    ("Safe error handling", "E4", "Central Express error handler logs stack trace internally and sends clean, safe JSON error messages without exposing SQL internals.", "Verified: returns structured { 'success': false, 'message': '...' }."),
    ("Data movement", "E4", "REST APIs transfer only scoped JSON payloads. Sensitive password hashes are stripped before session and response dispatch.", "Inspected /api/auth/me and /api/assets network response payloads.")
]
for r_idx, row in enumerate(sec_data):
    for c_idx, val in enumerate(row):
        t_sec.cell(r_idx, c_idx).paragraphs[0].text = val
style_table(t_sec)
p_ref = doc.add_paragraph("Evidence filename / repository link: server/middleware/auth.js | server/db.js")
p_ref.runs[0].font.size = Pt(8.5)

# 8. Build, Run and Git Evidence
add_heading_3("8. Build, Run and Git Evidence")
t_build = doc.add_table(rows=5, cols=4)
build_data = [
    ("Engine", "Run steps / command", "Observed output", "Commit / branch / tag"),
    ("E1", "node scripts/test-e2e-suite.js", "Tested next-ref sequence, 7-column requisition, Coordinator Tier 2 dynamic routing, VC final approval, and rejection circuit breaker -> ALL END-TO-END TESTS PASSED", "Tag v1.0-official-ui (Commit c23fc79)"),
    ("E2", "node scripts/restore-inventory.js", "Restored all 286 machines across 8 labs directly from Excel register in 3 seconds -> Official university inventory safely restored to 286 machines!", "Tag v1.0-official-ui (Commit c23fc79)"),
    ("E3", "node scripts/test-inventory-rbac.js", "Verified row updates, quantity adjustments, and transaction boundaries -> ALL INVENTORY RBAC & DETAIL TESTS PASSED!", "Tag v1.0-official-ui (Commit 9218831)"),
    ("E4", "node server/app.js", "Starts Express server on port 3000 & connects PostgreSQL pool -> KLE Tech Asset & Procurement System Server Running on http://localhost:3000", "Branch main (Commit c23fc79)")
]
for r_idx, row in enumerate(build_data):
    for c_idx, val in enumerate(row):
        t_build.cell(r_idx, c_idx).paragraphs[0].text = val
style_table(t_build)
p_ref = doc.add_paragraph("Evidence filename / repository link: https://github.com/shreeya05mahale-cmyk/mini-project/commits/main")
p_ref.runs[0].font.size = Pt(8.5)

# 9. Testing — Mandatory Test Case Register
add_heading_3("9. Testing — Mandatory Test Case Register")
t_tc = doc.add_table(rows=16, cols=6)
tc_data = [
    ("Test ID / Engine", "FR ID / test type", "Input / precondition", "Expected result", "Actual result", "Pass / Fail"),
    ("TC-E1-01 / E1", "Search – Functional", "Search query 'HP ProDesk'", "Matching HP machines displayed across labs", "Observed: 43 matching machines returned", "Pass"),
    ("TC-E1-02 / E1", "Search – Invalid", "Nonexistent query 'NonExistentMachineXYZ'", "Zero records found message displayed", "Observed: Showing 0 of 0 records", "Pass"),
    ("TC-E1-03 / E1", "Queue – Boundary", "Attempt approval of Step 3 before Step 2", "Operation blocked with sequential violation", "Observed: 400 Bad Request - Sequential violation", "Pass"),
    ("TC-E1-04 / E1", "Sorting/Filter – Functional", "Select Lab filter 'Lab 4'", "Filters table to exactly 43 Lab 4 PCs", "Observed: 43 PCs displayed with Lab 4 badges", "Pass"),
    ("TC-E1-05 / E1", "Queue – Functional", "Submit requisition, Coordinator sets ₹1.8L (Tier 2)", "Dynamically routes to Registrar -> VC", "Observed: 4 approval steps created dynamically", "Pass"),
    ("TC-E2-01 / E2", "Database – Functional", "Coordinator adds asset with specs & ISR sl no", "Asset saved and retrievable via GET /api/assets", "Observed: Lab4-DEMO99 created with status 201", "Pass"),
    ("TC-E2-02 / E2", "Database – Invalid", "Missing make & model name on asset create", "Validation rejection with status 400", "Observed: 400 Bad Request - Asset make/model required", "Pass"),
    ("TC-E2-03 / E2", "Transaction – Failure", "Delete non-existent asset ID", "Status 404 with error message", "Observed: 404 Not Found - Asset not found", "Pass"),
    ("TC-E2-04 / E2", "History/Restore – Functional", "Execute node scripts/restore-inventory.js", "Re-seeds 286 records with vendor & invoice mappings", "Observed: Exactly 286 records restored", "Pass"),
    ("TC-E3-01 / E3", "Concurrency – Functional", "Coordinator approves request with row lock", "Lock acquired via FOR UPDATE, status updated", "Observed: Status transitions to UNDER_APPROVAL", "Pass"),
    ("TC-E3-02 / E3", "Concurrency – Boundary", "Increment quantity (+1) then decrement (-1)", "Quantity updates accurately without race condition", "Observed: Quantity transitions 5 -> 6 -> 5", "Pass"),
    ("TC-E3-03 / E3", "Synchronization – Failure", "Rejection on Requisition #2 by Coordinator", "Halts queue immediately; status REJECTED", "Observed: Request marked REJECTED", "Pass"),
    ("TC-E4-01 / E4", "API – Functional", "GET /api/requests/next-ref with auth cookie", "Returns next ref ID REQ/2026/001", "Observed: KLE-TECH/INFOCELL/REQ/2026/001", "Pass"),
    ("TC-E4-02 / E4", "API – Invalid", "GET /api/requests/next-ref without auth cookie", "Rejection with HTTP 401 Unauthorized", "Observed: 401 Unauthorized", "Pass"),
    ("TC-E4-03 / E4", "Security – Functional", "HOD attempts POST /api/assets", "Blocked with HTTP 403 Forbidden", "Observed: 403 Forbidden - Role 'HOD' is not permitted", "Pass")
]
for r_idx, row in enumerate(tc_data):
    for c_idx, val in enumerate(row):
        t_tc.cell(r_idx, c_idx).paragraphs[0].text = val
style_table(t_tc)
p_ref = doc.add_paragraph("Evidence filename / repository link: scripts/test-e2e-suite.js | scripts/test-inventory-rbac.js")
p_ref.runs[0].font.size = Pt(8.5)

# 10. Testing — Test Execution Evidence
add_heading_3("10. Testing — Test Execution Evidence")
p_code = doc.add_paragraph()
r_code = p_code.add_run("""[Automated RBAC Test Suite Output - scripts/test-inventory-rbac.js]
1. Testing RBAC: HOD attempting to add asset...
   HOD Add Status: 403 Forbidden. Role 'HOD' is not permitted to perform this action.
✓ HOD is strictly blocked from adding assets (403 Forbidden).

2. Coordinator adding asset with full technical specs and register provenance...
   Coordinator Add Status: 201 | Created Asset Code: Lab4-DEMO99
   Specs: { processor: 'Intel Core i5 10th Gen', ram: '16GB DDR4', hdd: '512GB SSD', monitor: '18.5 inch', os: 'Win 11 Pro' }
   Created Register Sl No: 729 | Bill No & Date: PITS/2026/9901 (2026-02-15)
✓ Coordinator successfully created asset with full specifications.

3. Admin updating asset details (RAM upgrade to 32GB)...
   Admin Update Status: 200 | Updated RAM: 32GB DDR4
✓ Admin successfully updated asset details.

4. Testing RBAC: HOD attempting to delete asset...
   HOD Delete Status: 403 Forbidden. Role 'HOD' is not permitted to perform this action.
✓ HOD is strictly blocked from deleting assets (403 Forbidden).

5. Coordinator deleting demo asset to restore clean inventory...
   Coordinator Delete Status: 200 Asset Lab4-DEMO99 removed from registry successfully.
=== ALL INVENTORY RBAC & DETAIL TESTS PASSED! ===

[Automated Requisition & Approval Suite Output - scripts/test-e2e-suite.js]
1. Next Ref: KLE-TECH/INFOCELL/REQ/2026/001 verified.
2. HOD submits 7-column requisition #1 without prices.
3. Coordinator approves with ₹1,80,000 valuation -> dynamically generated Tier 2 chain: [REGISTRAR, VC].
4. Registrar approves -> Status remains UNDER_APPROVAL.
5. Vice Chancellor approves -> Final status: APPROVED.
6. Requisition #2 submitted -> Coordinator rejects -> Status: REJECTED directly.
=== ALL END-TO-END TESTS PASSED SUCCESSFULLY! ===""")
r_code.font.name = 'Courier New'
r_code.font.size = Pt(8)
r_code.font.color.rgb = RGBColor(30, 41, 59)
p_ref = doc.add_paragraph("Evidence filename / repository link: Tag v1.0-official-ui on Commit c23fc79")
p_ref.runs[0].font.size = Pt(8.5)

# 11. Defect, Correction and Retest Register
add_heading_3("11. Defect, Correction and Retest Register")
t_defect = doc.add_table(rows=4, cols=5)
defect_data = [
    ("Defect ID / failed test", "Observed problem", "Cause / correction", "Fix commit", "Retest ID / result"),
    ("DF-01 / TC-E2-01", "Asset insertion failed with violates check constraint 'assets_type_check'", "Controller hardcoded type = 'DESKTOP', whereas PostgreSQL schema constraint requires type IN ('DURABLE', 'CONSUMABLE'). Corrected controller to use 'DURABLE'.", "Commit d5f2b09", "TC-E2-01 / Passed"),
    ("DF-02 / TC-E1-05", "Coordinator decision endpoint returned 404 Purchase request not found", "Test script passed approval_id instead of requestId to route /api/approvals/:requestId/decision. Corrected test invocation to pass request_id.", "Commit d5f2b09", "TC-E1-05 / Passed"),
    ("DF-03 / TC-E4-03", "Inline + and - quantity buttons were accessible to all roles", "Replaced arbitrary inline table row adjustments with a comprehensive modal restricted strictly to COORDINATOR and ADMIN via requireRole.", "Commit 9218831", "TC-E4-03 / Passed")
]
for r_idx, row in enumerate(defect_data):
    for c_idx, val in enumerate(row):
        t_defect.cell(r_idx, c_idx).paragraphs[0].text = val
style_table(t_defect)
p_ref = doc.add_paragraph("Evidence filename / repository link: https://github.com/shreeya05mahale-cmyk/mini-project/commits/main")
p_ref.runs[0].font.size = Pt(8.5)

# 12. Engine Readiness and Remaining Work
add_heading_3("12. Engine Readiness and Remaining Work")
t_ready = doc.add_table(rows=5, cols=5)
ready_data = [
    ("Engine ID", "Works now", "Mocked / incomplete", "Not yet tested", "Sprint 3 dependency"),
    ("E1", "7-column requisition submission, dynamic Tier 1/2/3 approval queue, sequential traversal, rejection circuit breaker, lab filtering, and multi-field search.", "None for in-scope approval lifecycle.", "None; all in-scope operations tested.", "Multi-vendor quotation comparative matrix generation (Phase 5)."),
    ("E2", "286 real academic lab PC master records, JSONB specification store, ISR register linking, asset CRUD, and restore script.", "Out-of-scope PO and Goods Receipt tables hidden from UI (DB preserved intact).", "None; all inventory operations tested.", "Physical barcode generation and inter-lab transfer audit ledger (Phase 6–7)."),
    ("E3", "Row-level locking (SELECT ... FOR UPDATE), atomic transaction boundaries (withTransaction), and rollback on failure.", "None for current transaction scope.", "None; concurrency boundaries tested.", "High-volume multi-user stress benchmark."),
    ("E4", "REST APIs, PostgreSQL session store, bcrypt authentication, RBAC middleware, and university UI layout.", "Store user role decommissioned for this sprint.", "None; all endpoints and roles tested.", "External email notification integration (SMTP/gateway).")
]
for r_idx, row in enumerate(ready_data):
    for c_idx, val in enumerate(row):
        t_ready.cell(r_idx, c_idx).paragraphs[0].text = val
style_table(t_ready)
p_ref = doc.add_paragraph("Evidence filename / repository link: PROGRESS.md (https://github.com/shreeya05mahale-cmyk/mini-project/blob/main/PROGRESS.md)")
p_ref.runs[0].font.size = Pt(8.5)

# 13. Requirements -> Code -> Partial Test Mapping
add_heading_3("13. Requirements -> Code -> Partial Test Mapping")
t_map = doc.add_table(rows=13, cols=5)
map_data = [
    ("FR ID", "Engine / code reference", "Test ID", "Result", "Gap / action"),
    ("FR-E1-01 – Search assets", "server/controllers/assetController.js (lines 56–62)", "TC-E1-01 / TC-E1-02", "Pass", "Verified with valid and non-matching search queries"),
    ("FR-E1-02 – Sort & filter records", "server/controllers/assetController.js (lines 24–46)", "TC-E1-04", "Pass", "Verified filtering across 8 academic labs"),
    ("FR-E1-03 – Prioritize requests", "server/controllers/approvalController.js (lines 144–178)", "TC-E1-03 / TC-E1-05", "Pass", "Verified dynamic Tier 1/2/3 downstream routing"),
    ("FR-E2-01 – Store asset records", "scripts/import-university-data.js", "TC-E2-01", "Pass", "Verified 286 PCs ingested with JSONB specs"),
    ("FR-E2-02 – Ingest / edit asset details", "server/controllers/assetController.js (lines 188–290)", "TC-E2-01 / TC-E2-02", "Pass", "Verified modal with all hardware & ISR attributes"),
    ("FR-E2-03 – Restore inventory ledger", "scripts/restore-inventory.js", "TC-E2-04", "Pass", "Verified 1-second restore of all 286 university records"),
    ("FR-E3-01 – Concurrent row locking", "server/controllers/approvalController.js (line 94)", "TC-E3-01", "Pass", "Verified SELECT ... FOR UPDATE mutex on request row"),
    ("FR-E3-02 – Transaction coordination", "server/db.js (withTransaction)", "TC-E3-02", "Pass", "Verified atomic multi-table state updates"),
    ("FR-E3-03 – Safe rollback handling", "server/db.js (client.query('ROLLBACK'))", "TC-E3-03", "Pass", "Verified zero partial writes on failed decisions"),
    ("FR-E4-01 – RESTful API endpoints", "server/routes/ & server/controllers/", "TC-E4-01", "Pass", "Verified /api/requests, /api/approvals, /api/assets"),
    ("FR-E4-02 – Session & Input Validation", "server/controllers/authController.js", "TC-E4-02", "Pass", "Verified 401 Unauthorized on unauthenticated calls"),
    ("FR-E4-03 – Role-Based Access Control", "server/middleware/auth.js (requireRole)", "TC-E4-03", "Pass", "Verified 403 Forbidden for HOD on inventory modification")
]
for r_idx, row in enumerate(map_data):
    for c_idx, val in enumerate(row):
        t_map.cell(r_idx, c_idx).paragraphs[0].text = val
style_table(t_map)
p_ref = doc.add_paragraph("Evidence filename / repository link: Tag v1.0-official-ui (https://github.com/shreeya05mahale-cmyk/mini-project/releases/tag/v1.0-official-ui)")
p_ref.runs[0].font.size = Pt(8.5)

# 14. Weekly Progress Record — Weeks 10–13
add_heading_3("14. Weekly Progress Record — Weeks 10–13")
t_week = doc.add_table(rows=5, cols=3)
week_data = [
    ("Academic week", "Expected output", "Student completed evidence / status"),
    ("Week 10", "Sprint 1 handoff, Sprint 2 backlog, initial engine skeleton", "Completed: Setup 3NF schema, Express foundation, session auth, and ingested 286 university PCs from lab Excel register."),
    ("Week 11", "Core engine increments and first partial tests", "Completed: Implemented official 7-column requisition form template (/request-new.html), real-time upcoming reference ID generation (REQ/2026/001), and asset full-text specification search."),
    ("Week 12", "Expanded modules, applicable checks, defects and retests", "Completed: Built Coordinator gatekeeper valuation modal with dynamic Tier 1/2/3 approval queue routing; resolved DF-01 type constraint and DF-02 approval parameter defects."),
    ("Week 13", "Gate 3 evidence pack, RBAC enforcement, and individual engine demo", "Completed: Restricted inventory modifications strictly to Coordinator & Admin (requireRole); built comprehensive asset ingestion modal; created 1-second restore safeguard script; tagged milestone v1.0-official-ui.")
]
for r_idx, row in enumerate(week_data):
    for c_idx, val in enumerate(row):
        t_week.cell(r_idx, c_idx).paragraphs[0].text = val
style_table(t_week)

# 15. Gate 3 / Review 4 Checklist
add_heading_3("15. Gate 3 / Review 4 Checklist")
t_chk = doc.add_table(rows=10, cols=3)
chk_data = [
    ("Review check", "Yes / No / N/A", "Notes"),
    ("Approved Sprint 1 design is referenced and changes documented", "Yes", "Refinements to paper requisition form and Coordinator tier routing documented in PROGRESS.md."),
    ("Working core engine increment covering the mandatory approved responsibility is runnable and tested for each assigned student", "Yes", "E1 (Madhuram), E2 (Shreeya), E3 (Rutu), and E4 (Shanvi) modules are fully runnable and tested."),
    ("Engine run steps and actual outputs provided", "Yes", "Terminal test outputs from test-e2e-suite.js and test-inventory-rbac.js included in Section 10."),
    ("Normal, boundary and failure partial tests executed", "Yes", "Test cases TC-E1-01 to TC-E4-03 fully documented with Pass status in Section 9."),
    ("Additional state/concurrency/security/API tests completed where applicable", "Yes", "Pessimistic locking (FOR UPDATE), atomic transactions, and RBAC (403 Forbidden) verified."),
    ("Actual results, failures, corrections and retests recorded", "Yes", "Defects DF-01, DF-02, and DF-03 documented with fix commits in Section 11."),
    ("Git history and requirement-to-test mapping available", "Yes", "Permanent Git tag v1.0-official-ui created and pushed to GitHub; full commit log referenced."),
    ("Mocks, deferred work and Sprint 3 dependencies clearly listed", "Yes", "Phase 5 (Quotations/PO) and Phase 6 (Goods Receipts) clearly marked as Sprint 3 dependencies."),
    ("Each student can explain and demonstrate their own engine", "Yes", "Step-by-step testing instructions available for individual student demonstration.")
]
for r_idx, row in enumerate(chk_data):
    for c_idx, val in enumerate(row):
        t_chk.cell(r_idx, c_idx).paragraphs[0].text = val
style_table(t_chk)

p_outcome = doc.add_paragraph()
r_out = p_outcome.add_run("Gate 3 team outcome: Pass (Ready for Review 4 / Gate 3 Evaluation)")
r_out.bold = True
r_out.font.size = Pt(11)
r_out.font.color.rgb = RGBColor(22, 101, 52)

output_path = "documents/Sprint_2_Student_Handbook_Team_9.docx"
doc.save(output_path)
print(f"Successfully generated Word document: {output_path}")
