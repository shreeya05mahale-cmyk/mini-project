/**
 * Reset Operational Data Script
 * 
 * Clears all transaction data (assets, requests, approvals, quotations,
 * purchase orders, goods receipts, stock ledger) while preserving
 * users and departments.
 */

const { withTransaction, pool } = require('../server/db');

async function clearData() {
  console.log('[Clean] Clearing operational data...');

  await withTransaction(async (client) => {
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
        purchase_requests
      RESTART IDENTITY CASCADE;
    `);
  });

  console.log('[Clean] All operational tables cleared! Users and departments preserved.');
  await pool.end();
}

clearData().catch(err => {
  console.error('[Clean Error]', err);
  process.exit(1);
});
