/**
 * Dashboard & Notifications Controller (Engine 4)
 * 
 * Computes live operational metrics and notifications on the fly
 * without maintaining a separate notifications table.
 */

const { query } = require('../db');

/**
 * Get dynamic notifications for the currently logged-in user.
 * 
 * Rules:
 * - Approvers: Count steps where approver_role matches user.role, decision is PENDING,
 *   and all previous steps (step_order < current) are APPROVED.
 * - Storekeeper: Count purchase orders with status ISSUED or PARTIALLY_RECEIVED awaiting delivery.
 * - HOD: Count requests submitted by this HOD updated or approved within the last 7 days.
 */
async function getNotifications(req, res, next) {
  try {
    const user = req.session.user;
    let pendingApprovals = 0;
    let pendingDeliveries = 0;
    const notificationMessages = [];

    // 1. Pending Approvals check (Actionable steps for this user's role)
    const approvalsSql = `
      SELECT COUNT(*) AS count
      FROM approvals a
      JOIN purchase_requests pr ON a.request_id = pr.request_id
      WHERE a.approver_role = $1
        AND a.decision = 'PENDING'
        AND pr.status = 'UNDER_APPROVAL'
        AND NOT EXISTS (
          SELECT 1 
          FROM approvals prev 
          WHERE prev.request_id = a.request_id 
            AND prev.step_order < a.step_order 
            AND prev.decision <> 'APPROVED'
        );
    `;
    const appResult = await query(approvalsSql, [user.role]);
    pendingApprovals = parseInt(appResult.rows[0].count, 10);

    if (pendingApprovals > 0) {
      notificationMessages.push({
        type: 'APPROVAL_WAITING',
        text: `You have ${pendingApprovals} purchase request approval${pendingApprovals > 1 ? 's' : ''} waiting for your decision.`
      });
    }

    // 2. Pending Deliveries check for Store / Coordinator
    if (['STORE', 'COORDINATOR', 'ADMIN'].includes(user.role)) {
      const poSql = `
        SELECT COUNT(*) AS count 
        FROM purchase_orders 
        WHERE status IN ('ISSUED', 'PARTIALLY_RECEIVED');
      `;
      const poResult = await query(poSql);
      pendingDeliveries = parseInt(poResult.rows[0].count, 10);

      if (pendingDeliveries > 0 && user.role === 'STORE') {
        notificationMessages.push({
          type: 'DELIVERY_WAITING',
          text: `${pendingDeliveries} Purchase Order${pendingDeliveries > 1 ? 's' : ''} awaiting goods delivery at the Central Store.`
        });
      }
    }

    // 3. Status updates for HOD's own requests (including REJECTIONS with remarks)
    if (user.role === 'HOD') {
      // Check for rejected requests
      const rejectedSql = `
        SELECT 
          pr.request_id, 
          pr.subject,
          pr.total_amount,
          a.approver_role,
          a.remarks AS rejection_remarks,
          u.name AS rejected_by_name
        FROM purchase_requests pr
        JOIN approvals a ON pr.request_id = a.request_id AND a.decision = 'REJECTED'
        LEFT JOIN users u ON a.approver_id = u.user_id
        WHERE pr.requested_by = $1 AND pr.status = 'REJECTED'
        ORDER BY a.decided_at DESC
        LIMIT 3;
      `;
      const rejResult = await query(rejectedSql, [user.user_id]);
      rejResult.rows.forEach(r => {
        const roleLabel = r.approver_role === 'COORDINATOR' ? 'InfoCell Coordinator' : r.approver_role;
        notificationMessages.push({
          type: 'REQUEST_REJECTED',
          requestId: r.request_id,
          text: `⚠️ Notice: Requisition #REQ-${String(r.request_id).padStart(3, '0')} was REJECTED by ${roleLabel}. Reason: "${r.rejection_remarks || 'Requirements not aligned with standards'}"`
        });
      });

      // Also approved/ordered updates
      const hodUpdatesSql = `
        SELECT request_id, status, total_amount
        FROM purchase_requests
        WHERE requested_by = $1 AND status IN ('APPROVED', 'ORDERED', 'COMPLETED')
        ORDER BY created_at DESC
        LIMIT 3;
      `;
      const hodResult = await query(hodUpdatesSql, [user.user_id]);
      hodResult.rows.forEach(r => {
        notificationMessages.push({
          type: 'REQUEST_UPDATE',
          requestId: r.request_id,
          text: `Your requisition #REQ-${String(r.request_id).padStart(3, '0')} for ₹${Number(r.total_amount).toLocaleString('en-IN')} is now ${r.status}.`
        });
      });
    }

    res.json({
      success: true,
      notifications: {
        pendingApprovals,
        pendingDeliveries,
        messages: notificationMessages
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get aggregate dashboard statistics tailored to user role.
 */
async function getStats(req, res, next) {
  try {
    const user = req.session.user;

    // Requests count
    const reqCountRes = await query('SELECT COUNT(*) AS total FROM purchase_requests;');
    const totalRequests = parseInt(reqCountRes.rows[0].total, 10);

    // Active POs
    const poCountRes = await query(`
      SELECT COUNT(*) AS total 
      FROM purchase_orders 
      WHERE status IN ('ISSUED', 'PARTIALLY_RECEIVED');
    `);
    const activePOs = parseInt(poCountRes.rows[0].total, 10);

    // Assets count and total valuation
    const assetRes = await query(`
      SELECT 
        COUNT(*) AS total_assets,
        COALESCE(SUM(quantity), 0) AS total_units
      FROM assets;
    `);

    // Pending approvals waiting for current user
    const approvalsSql = `
      SELECT COUNT(*) AS count
      FROM approvals a
      JOIN purchase_requests pr ON a.request_id = pr.request_id
      WHERE a.approver_role = $1
        AND a.decision = 'PENDING'
        AND pr.status = 'UNDER_APPROVAL'
        AND NOT EXISTS (
          SELECT 1 
          FROM approvals prev 
          WHERE prev.request_id = a.request_id 
            AND prev.step_order < a.step_order 
            AND prev.decision <> 'APPROVED'
        );
    `;
    const appResult = await query(approvalsSql, [user.role]);
    const myPendingApprovals = parseInt(appResult.rows[0].count, 10);

    // Recent 5 purchase requests with department name and submitter
    const recentSql = `
      SELECT 
        pr.request_id,
        d.name AS dept_name,
        u.name AS requested_by_name,
        pr.total_amount,
        pr.status,
        TO_CHAR(pr.created_at, 'DD Mon YYYY') AS formatted_date
      FROM purchase_requests pr
      JOIN departments d ON pr.dept_id = d.dept_id
      JOIN users u ON pr.requested_by = u.user_id
      ORDER BY pr.created_at DESC
      LIMIT 6;
    `;
    const recentRes = await query(recentSql);

    res.json({
      success: true,
      stats: {
        totalRequests,
        activePOs,
        totalAssets: parseInt(assetRes.rows[0].total_assets, 10),
        totalUnits: parseInt(assetRes.rows[0].total_units, 10),
        myPendingApprovals
      },
      recentRequests: recentRes.rows
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getNotifications,
  getStats
};
