/**
 * Approval Controller (Engine 1)
 *
 * Implements:
 * - Fetching actionable pending approvals for the logged-in role
 * - Enforcing strict sequential hierarchy (no out-of-order approval)
 * - Handling APPROVE and REJECT decisions with circuit-breaking
 */

const { query, withTransaction } = require('../db');

/**
 * GET /api/approvals/pending
 * Returns pending approval items that are currently actionable for the logged-in user.
 * A step is actionable ONLY IF:
 * 1. a.approver_role matches user.role
 * 2. a.decision = 'PENDING'
 * 3. pr.status = 'UNDER_APPROVAL'
 * 4. All previous steps (step_order < current) are already APPROVED.
 */
async function getPendingApprovals(req, res, next) {
  try {
    const user = req.session.user;

    const sql = `
      SELECT 
        a.request_id,
        a.approval_id,
        a.step_order,
        a.approver_role,
        pr.justification,
        pr.total_amount,
        d.name AS dept_name,
        u.name AS requested_by_name,
        TO_CHAR(pr.created_at, 'DD Mon YYYY, HH12:MI AM') AS formatted_date
      FROM approvals a
      JOIN purchase_requests pr ON a.request_id = pr.request_id
      JOIN departments d ON pr.dept_id = d.dept_id
      JOIN users u ON pr.requested_by = u.user_id
      WHERE a.approver_role = $1
        AND a.decision = 'PENDING'
        AND pr.status = 'UNDER_APPROVAL'
        AND NOT EXISTS (
          SELECT 1 
          FROM approvals prev 
          WHERE prev.request_id = a.request_id 
            AND prev.step_order < a.step_order 
            AND prev.decision <> 'APPROVED'
        )
      ORDER BY a.request_id ASC;
    `;

    const result = await query(sql, [user.role]);

    res.json({
      success: true,
      pendingCount: result.rows.length,
      approvals: result.rows
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/approvals/:requestId/decision
 * Body: { decision: 'APPROVED' | 'REJECTED', remarks: string }
 */
async function recordDecision(req, res, next) {
  try {
    const { requestId } = req.params;
    const { decision, remarks, estimated_cost, tier } = req.body;
    const user = req.session.user;

    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid decision: must be either APPROVED or REJECTED.'
      });
    }

    if (decision === 'REJECTED' && (!remarks || !remarks.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Remarks are mandatory when rejecting a purchase request.'
      });
    }

    let finalStatus;

    await withTransaction(async (client) => {
      // 1. Fetch current request
      const prRes = await client.query(
        `SELECT request_id, status FROM purchase_requests WHERE request_id = $1 FOR UPDATE;`,
        [requestId]
      );

      if (prRes.rows.length === 0) {
        throw { status: 404, message: 'Purchase request not found.' };
      }

      if (prRes.rows[0].status !== 'UNDER_APPROVAL') {
        throw { status: 400, message: `Cannot decide on request: current status is ${prRes.rows[0].status}.` };
      }

      // 2. Find the pending step for this user's role
      const stepRes = await client.query(
        `SELECT approval_id, step_order, approver_role, decision
         FROM approvals 
         WHERE request_id = $1 AND approver_role = $2 AND decision = 'PENDING'
         ORDER BY step_order ASC LIMIT 1;`,
        [requestId, user.role]
      );

      if (stepRes.rows.length === 0) {
        throw { status: 403, message: `No pending approval step for role ${user.role} on request #${requestId}.` };
      }

      const currentStep = stepRes.rows[0];

      // 3. Strict Sequential Check: verify all prior steps are APPROVED
      const priorRes = await client.query(
        `SELECT step_order, approver_role, decision 
         FROM approvals 
         WHERE request_id = $1 AND step_order < $2 AND decision <> 'APPROVED';`,
        [requestId, currentStep.step_order]
      );

      if (priorRes.rows.length > 0) {
        throw {
          status: 400,
          message: `Sequential violation: Step #${priorRes.rows[0].step_order} (${priorRes.rows[0].approver_role}) must be APPROVED first.`
        };
      }

      // 4. Record decision on this step
      await client.query(
        `UPDATE approvals 
         SET decision = $1, approver_id = $2, remarks = $3, decided_at = NOW()
         WHERE request_id = $4 AND approval_id = $5;`,
        [decision, user.user_id, remarks ? remarks.trim() : null, requestId, currentStep.approval_id]
      );

      // 5. If InfoCell Coordinator is approving, establish the cost valuation & dynamic downstream hierarchy
      if (user.role === 'COORDINATOR' && decision === 'APPROVED') {
        const cost = parseFloat(estimated_cost) || 0;
        let selectedTier = tier;
        if (!selectedTier) {
          if (cost <= 50000) selectedTier = 'TIER_1';
          else if (cost <= 200000) selectedTier = 'TIER_2';
          else selectedTier = 'TIER_3';
        }

        let downstreamRoles = [];
        if (selectedTier === 'TIER_1') {
          downstreamRoles = ['REGISTRAR'];
        } else if (selectedTier === 'TIER_2') {
          downstreamRoles = ['REGISTRAR', 'VC'];
        } else {
          downstreamRoles = ['REGISTRAR', 'VC', 'PC'];
        }

        // Save estimated valuation on purchase_requests
        await client.query(
          `UPDATE purchase_requests SET total_amount = $1 WHERE request_id = $2;`,
          [cost, requestId]
        );

        // Delete any pre-existing downstream steps and insert the new dynamic path
        await client.query(
          `DELETE FROM approvals WHERE request_id = $1 AND step_order > $2;`,
          [requestId, currentStep.step_order]
        );

        for (let i = 0; i < downstreamRoles.length; i++) {
          const role = downstreamRoles[i];
          const stepOrder = currentStep.step_order + 1 + i;
          await client.query(
            `INSERT INTO approvals (request_id, approval_id, approver_role, step_order, decision)
             VALUES ($1, $2, $3, $4, 'PENDING');`,
            [requestId, stepOrder, role, stepOrder]
          );
        }
      }

      // 6. Update overall request status
      if (decision === 'REJECTED') {
        // Circuit breaker: immediately reject the request
        await client.query(
          `UPDATE purchase_requests SET status = 'REJECTED' WHERE request_id = $1;`,
          [requestId]
        );
        finalStatus = 'REJECTED';
      } else {
        // Check if there are any remaining PENDING steps in the chain
        const remainingRes = await client.query(
          `SELECT COUNT(*) AS count FROM approvals WHERE request_id = $1 AND decision = 'PENDING';`,
          [requestId]
        );
        const remainingCount = parseInt(remainingRes.rows[0].count, 10);

        if (remainingCount === 0) {
          // All authorities in the chain have approved!
          await client.query(
            `UPDATE purchase_requests SET status = 'APPROVED' WHERE request_id = $1;`,
            [requestId]
          );
          finalStatus = 'APPROVED';
        } else {
          finalStatus = 'UNDER_APPROVAL';
        }
      }
    });

    res.json({
      success: true,
      message: `Step marked ${decision} successfully. Request status is now: ${finalStatus}`,
      request_status: finalStatus
    });

  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPendingApprovals,
  recordDecision
};
