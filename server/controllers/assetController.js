/**
 * Asset & Inventory Controller (Engine 2)
 *
 * Provides endpoints for browsing, filtering, and retrieving detailed asset records.
 */

const { query } = require('../db');

/**
 * GET /api/assets
 * Retrieve list of assets with optional filters for location/lab, condition, search query.
 */
async function getAssets(req, res, next) {
  try {
    const { lab, condition, search, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    // Filter by lab / location
    // Lab keys sent by frontend: 'Lab 1', 'Lab 2', 'Lab 3', 'Lab 4', 'Lab 5', 'Lab 7', 'C-Lab 1', 'C-Lab 2'
    if (lab) {
      if (lab === 'Lab 1') {
        conditions.push(`a.location ILIKE '%Lab 1%'`);
      } else if (lab === 'Lab 2') {
        conditions.push(`(a.location ILIKE '%Lab-2%' OR a.location ILIKE '%CLH%')`);
      } else if (lab === 'Lab 3') {
        conditions.push(`a.location ILIKE '%Lab-3%'`);
      } else if (lab === 'Lab 4') {
        conditions.push(`(a.location ILIKE '%LAB 4%' OR a.location ILIKE '%LAB4%')`);
      } else if (lab === 'Lab 5') {
        conditions.push(`(a.location ILIKE '%Lab5%')`);
      } else if (lab === 'Lab 7') {
        conditions.push(`(a.location ILIKE '%Lab-7%' OR a.location IN ('Mr. Ashok Chikaraddi', 'Mr. Pradeep Shet', 'Ms. Neha Panchal', 'Ms. Shrusti Gunjal'))`);
      } else if (lab === 'C-Lab 1') {
        conditions.push(`a.location ILIKE '%Computing%'`);
      } else if (lab === 'C-Lab 2') {
        conditions.push(`(a.location ILIKE '%C-Lab2%' OR a.location = 'Ms. Salma M B')`);
      } else {
        conditions.push(`a.location ILIKE $${paramIndex}`);
        params.push(`%${lab}%`);
        paramIndex++;
      }
    }

    // Filter by condition (GOOD, DAMAGED, etc.)
    if (condition) {
      conditions.push(`a.condition = $${paramIndex}`);
      params.push(condition);
      paramIndex++;
    }

    // Search by computer name, model, vendor, inward register serial number, or technical specifications
    if (search) {
      conditions.push(`(a.asset_code ILIKE $${paramIndex} OR a.name ILIKE $${paramIndex} OR a.vendor_name ILIKE $${paramIndex} OR a.register_sl_no::text ILIKE $${paramIndex} OR a.specifications::text ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total count for pagination
    const countSql = `SELECT COUNT(*) AS total FROM assets a ${whereClause};`;
    const countRes = await query(countSql, params);
    const total = parseInt(countRes.rows[0].total, 10);

    // Fetch assets
    const sql = `
      SELECT 
        a.asset_id,
        a.asset_code,
        a.name,
        a.type,
        a.location,
        a.condition,
        a.quantity,
        a.vendor_name,
        a.bill_no,
        TO_CHAR(a.bill_date, 'DD Mon YYYY') AS formatted_bill_date,
        a.unit_cost,
        a.register_sl_no,
        a.specifications,
        d.name AS dept_name
      FROM assets a
      JOIN departments d ON a.dept_id = d.dept_id
      ${whereClause}
      ORDER BY a.asset_id ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
    `;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const result = await query(sql, params);

    res.json({
      success: true,
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
      assets: result.rows
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/assets/summary
 * Aggregate statistics for the inventory page (total, by lab group, by condition).
 */
async function getInventorySummary(req, res, next) {
  try {
    const totalRes = await query(`
      SELECT 
        COUNT(*) AS total_pcs,
        COUNT(*) FILTER (WHERE condition = 'GOOD') AS working_pcs,
        COUNT(*) FILTER (WHERE condition = 'DAMAGED') AS not_working_pcs
      FROM assets;
    `);

    // Group assets cleanly into their primary academic lab categories
    const labsRes = await query(`
      SELECT 
        CASE 
          WHEN location ILIKE '%Lab 1%' THEN 'Lab 1'
          WHEN location ILIKE '%Lab-2%' OR location ILIKE '%CLH%' THEN 'Lab 2'
          WHEN location ILIKE '%Lab-3%' THEN 'Lab 3'
          WHEN location ILIKE '%LAB 4%' OR location ILIKE '%LAB4%' THEN 'Lab 4'
          WHEN location ILIKE '%Lab5%' THEN 'Lab 5'
          WHEN location ILIKE '%Lab-7%' OR location IN ('Mr. Ashok Chikaraddi', 'Mr. Pradeep Shet', 'Ms. Neha Panchal', 'Ms. Shrusti Gunjal') THEN 'Lab 7'
          WHEN location ILIKE '%Computing%' THEN 'C-Lab 1'
          WHEN location ILIKE '%C-Lab2%' OR location = 'Ms. Salma M B' THEN 'C-Lab 2'
          ELSE 'Other'
        END AS lab_group,
        COUNT(*) AS count
      FROM assets
      GROUP BY 1
      HAVING COUNT(*) > 0
      ORDER BY 1;
    `);

    res.json({
      success: true,
      summary: totalRes.rows[0],
      byLab: labsRes.rows
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/assets/:id
 * Retrieve a single asset by id or asset_code with full specifications.
 */
async function getAssetById(req, res, next) {
  try {
    const { id } = req.params;
    const sql = `
      SELECT 
        a.*,
        d.name AS dept_name
      FROM assets a
      JOIN departments d ON a.dept_id = d.dept_id
      WHERE a.asset_id::text = $1 OR a.asset_code = $1;
    `;
    const result = await query(sql, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    res.json({
      success: true,
      asset: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/assets
 * Add a new asset / computer unit to a lab.
 */
async function createAsset(req, res, next) {
  try {
    const {
      asset_code,
      name,
      location = 'Lab 1',
      condition = 'GOOD',
      quantity = 1,
      unit_cost = 0,
      vendor_name = 'KLE Tech University Store',
      specifications = {}
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Asset make / model name is required.' });
    }

    // Auto-generate asset code if not supplied (e.g. Lab1-PC44)
    let finalCode = asset_code ? asset_code.trim() : null;
    if (!finalCode) {
      const cleanLab = location.replace(/[^a-zA-Z0-9]/g, '');
      const countRes = await query("SELECT COUNT(*) AS c FROM assets WHERE location ILIKE $1;", [`%${location}%`]);
      const nextNum = parseInt(countRes.rows[0].c, 10) + 1;
      finalCode = `${cleanLab}-PC${nextNum}`;
    }

    const insertSql = `
      INSERT INTO assets (asset_code, name, type, location, condition, quantity, unit_cost, vendor_name, specifications, dept_id)
      VALUES ($1, $2, 'DURABLE', $3, $4, $5, $6, $7, $8, 1)
      RETURNING *;
    `;

    const result = await query(insertSql, [
      finalCode,
      name.trim(),
      location.trim(),
      condition,
      parseInt(quantity, 10) || 1,
      parseFloat(unit_cost) || 0,
      vendor_name.trim(),
      JSON.stringify(specifications)
    ]);

    res.status(201).json({
      success: true,
      message: `Asset ${finalCode} added to ${location} successfully.`,
      asset: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/assets/:id/quantity
 * Increment (+1) or decrement (-1) quantity.
 */
async function adjustQuantity(req, res, next) {
  try {
    const { id } = req.params;
    const { change } = req.body; // +1 or -1

    const numChange = parseInt(change, 10);
    if (isNaN(numChange)) {
      return res.status(400).json({ success: false, message: 'Invalid change value.' });
    }

    const updateSql = `
      UPDATE assets 
      SET quantity = GREATEST(quantity + $1, 0)
      WHERE asset_id::text = $2 OR asset_code = $2
      RETURNING *;
    `;
    const result = await query(updateSql, [numChange, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Asset not found.' });
    }

    res.json({
      success: true,
      message: `Quantity adjusted for ${result.rows[0].asset_code}. New Quantity: ${result.rows[0].quantity}`,
      asset: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/assets/:id
 * Remove / retire an asset from the inventory.
 */
async function deleteAsset(req, res, next) {
  try {
    const { id } = req.params;
    const result = await query(
      `DELETE FROM assets WHERE asset_id::text = $1 OR asset_code = $1 RETURNING *;`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Asset not found.' });
    }

    res.json({
      success: true,
      message: `Asset ${result.rows[0].asset_code} removed from registry successfully.`
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAssets,
  getInventorySummary,
  getAssetById,
  createAsset,
  adjustQuantity,
  deleteAsset
};
