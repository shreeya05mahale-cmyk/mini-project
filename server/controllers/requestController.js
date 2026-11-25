/**
 * Purchase Request Controller (Engine 1)
 *
 * Implements:
 * - HOD request submission with dynamic items
 * - Server-side total calculation
 * - Multi-stage sequential approval chain generation
 * - List and detail viewing of purchase requests
 */

const { query, withTransaction } = require('../db');
const { getApprovalChain } = require('../config/approvalRules');

/**
 * POST /api/requests
 * Initiated by HOD only.
 * Body: { justification: string, items: Array<{ item_name, specification, quantity, estimated_price }> }
 */
async function createRequest(req, res, next) {
  try {
    const user = req.session.user;

    // Rule 1: Only HOD can submit a requisition
    if (user.role !== 'HOD') {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Only Department HODs can initiate purchase requisitions.'
      });
    }

    const { justification, items, subject, budget_details } = req.body;

    if (!justification || !justification.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Justification is required for submitting a purchase request.'
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one request item is required.'
      });
    }

    // Validate each item (pure 7-column academic equipment requisition)
    let totalAmount = 0;
    const validatedItems = [];

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const itemName = String(it.item_name || '').trim();
      const spec = String(it.specification || '').trim();
      const qty = parseInt(it.quantity, 10);
      const estPrice = parseFloat(it.estimated_price) || 0;

      if (!itemName) {
        return res.status(400).json({ success: false, message: `Item #${i + 1} is missing a valid equipment name.` });
      }
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({ success: false, message: `Item "${itemName}" must have a quantity greater than 0.` });
      }

      const lineTotal = qty * estPrice;
      totalAmount += lineTotal;

      const loc = String(it.location || '').trim();
      const purp = String(it.purpose || '').trim();
      const isr = String(it.isr_no_and_date || '').trim();

      validatedItems.push({
        item_id: i + 1,
        item_name: itemName,
        specification: spec,
        quantity: qty,
        estimated_price: estPrice,
        location: loc,
        purpose: purp,
        isr_no_and_date: isr
      });
    }

    // Initial approval chain: HOD initiates, and forwards to InfoCell Coordinator for scrutiny
    const initialApprovalRoles = ['HOD', 'COORDINATOR'];

    let createdRequestId;

    await withTransaction(async (client) => {
      // 1. Insert purchase request
      const reqSubject = (subject && subject.trim()) || 'Approval Request for Departmental Equipment';
      const budgetJson = budget_details ? JSON.stringify(budget_details) : null;

      const prRes = await client.query(
        `INSERT INTO purchase_requests (dept_id, requested_by, subject, justification, budget_details, total_amount, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'UNDER_APPROVAL')
         RETURNING request_id;`,
        [user.dept_id, user.user_id, reqSubject, justification.trim(), budgetJson, totalAmount]
      );
      createdRequestId = prRes.rows[0].request_id;

      // 2. Insert line items
      for (const it of validatedItems) {
        await client.query(
          `INSERT INTO request_items (request_id, item_id, item_name, specification, quantity, estimated_price, location, purpose, isr_no_and_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`,
          [createdRequestId, it.item_id, it.item_name, it.specification, it.quantity, it.estimated_price, it.location, it.purpose, it.isr_no_and_date]
        );
      }

      // 3. Generate initial approval steps (HOD auto-signs, Coordinator queued for scrutiny)
      for (let step = 0; step < initialApprovalRoles.length; step++) {
        const role = initialApprovalRoles[step];
        const stepOrder = step + 1;

        if (role === 'HOD') {
          await client.query(
            `INSERT INTO approvals (request_id, approval_id, approver_id, approver_role, step_order, decision, remarks, decided_at)
             VALUES ($1, $2, $3, $4, $5, 'APPROVED', 'Request initiated and endorsed by HOD', NOW());`,
            [createdRequestId, stepOrder, user.user_id, 'HOD', stepOrder]
          );
        } else {
          await client.query(
            `INSERT INTO approvals (request_id, approval_id, approver_role, step_order, decision)
             VALUES ($1, $2, $3, $4, 'PENDING');`,
            [createdRequestId, stepOrder, role, stepOrder]
          );
        }
      }
    });

    res.status(201).json({
      success: true,
      message: `Purchase Requisition #REQ-${String(createdRequestId).padStart(3, '0')} submitted successfully and forwarded to InfoCell Coordinator.`,
      request_id: createdRequestId,
      total_amount: totalAmount
    });

  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/requests
 * Returns list of requests. HOD sees their department's; Coordinator/Registrar/VC/Admin see all.
 */
async function getRequests(req, res, next) {
  try {
    const user = req.session.user;
    let sql;
    let params = [];

    if (user.role === 'HOD') {
      sql = `
        SELECT 
          pr.request_id,
          d.name AS dept_name,
          u.name AS requested_by_name,
          pr.subject,
          pr.justification,
          pr.total_amount,
          pr.status,
          TO_CHAR(pr.created_at, 'DD Mon YYYY, HH12:MI AM') AS formatted_date
        FROM purchase_requests pr
        JOIN departments d ON pr.dept_id = d.dept_id
        JOIN users u ON pr.requested_by = u.user_id
        WHERE pr.dept_id = $1
        ORDER BY pr.request_id DESC;
      `;
      params.push(user.dept_id);
    } else {
      sql = `
        SELECT 
          pr.request_id,
          d.name AS dept_name,
          u.name AS requested_by_name,
          pr.subject,
          pr.justification,
          pr.total_amount,
          pr.status,
          TO_CHAR(pr.created_at, 'DD Mon YYYY, HH12:MI AM') AS formatted_date
        FROM purchase_requests pr
        JOIN departments d ON pr.dept_id = d.dept_id
        JOIN users u ON pr.requested_by = u.user_id
        ORDER BY pr.request_id DESC;
      `;
    }

    const result = await query(sql, params);

    res.json({
      success: true,
      requests: result.rows
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/requests/:id
 * Returns request header, line items, and approval progress trail.
 */
async function getRequestDetail(req, res, next) {
  try {
    const { id } = req.params;
    const user = req.session.user;

    const prRes = await query(
      `SELECT 
        pr.*,
        d.name AS dept_name,
        u.name AS requested_by_name,
        u.email AS requested_by_email,
        TO_CHAR(pr.created_at, 'DD Mon YYYY, HH12:MI AM') AS formatted_date
       FROM purchase_requests pr
       JOIN departments d ON pr.dept_id = d.dept_id
       JOIN users u ON pr.requested_by = u.user_id
       WHERE pr.request_id = $1;`,
      [id]
    );

    if (prRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Purchase request not found' });
    }

    const request = prRes.rows[0];

    // Access check: HOD can only view their own department's request
    if (user.role === 'HOD' && request.dept_id !== user.dept_id) {
      return res.status(403).json({ success: false, message: 'Access denied to other department requests' });
    }

    // Fetch line items
    const itemsRes = await query(
      `SELECT * FROM request_items WHERE request_id = $1 ORDER BY item_id ASC;`,
      [id]
    );

    // Fetch approval steps trail
    const appRes = await query(
      `SELECT 
        a.approval_id,
        a.step_order,
        a.approver_role,
        a.decision,
        a.remarks,
        u.name AS approver_name,
        TO_CHAR(a.decided_at, 'DD Mon YYYY, HH12:MI AM') AS formatted_decided_at
       FROM approvals a
       LEFT JOIN users u ON a.approver_id = u.user_id
       WHERE a.request_id = $1
       ORDER BY a.step_order ASC;`,
      [id]
    );

    res.json({
      success: true,
      request,
      items: itemsRes.rows,
      approvals: appRes.rows
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/requests/next-ref
 * Returns the upcoming dynamic reference number (e.g. KLE-TECH/INFOCELL/REQ/2026/001)
 */
async function getNextRef(req, res, next) {
  try {
    const result = await query("SELECT COALESCE(MAX(request_id), 0) + 1 AS next_id FROM purchase_requests;");
    const nextId = parseInt(result.rows[0].next_id, 10);
    const refNo = `KLE-TECH/INFOCELL/REQ/2026/${String(nextId).padStart(3, '0')}`;
    res.json({ success: true, next_id: nextId, ref_no: refNo });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createRequest,
  getRequests,
  getRequestDetail,
  getNextRef
};
