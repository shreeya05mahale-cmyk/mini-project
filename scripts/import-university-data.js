/**
 * scripts/import-university-data.js
 *
 * Populates all 286 computers directly with:
 * - specifications (Processor, RAM, HDD, Monitor, OS, License, Antivirus)
 * - register_sl_no (e.g. 728, 419, 296, 279)
 * - vendor_name (e.g. 'Pursuit IT Solutions', 'Pursuit Technologies Pvt Ltd', 'RT Computers')
 * - bill_no (e.g. 'PITS/2627/0201', 'HBLINV262/30521', 'HBLINV266/21-22', 'RTC20003940')
 * - bill_date (e.g. '2026-06-10', '2022-10-12', '2021-08-25', '2021-03-31')
 * - unit_cost (e.g. 74400.00, 39099.00, 31828.82, 17898.31)
 */

require('dotenv').config();
const path = require('path');
const XLSX = require('xlsx');
const { withTransaction } = require('../server/db');

const REGISTER_ENTRIES = {
  REG_296: {
    sl_no: 296,
    date: '2021-09-16',
    model_desc: 'HP Prodesk 400 G7 Microtower Desktop',
    vendor_name: 'Pursuit Technologies Pvt Ltd',
    vendor_address: 'Pandhari Building, 2nd Cross, Vidyanagar, Hubballi',
    bill_no: 'HBLINV266/21-22',
    bill_date: '2021-08-25',
    unit_cost: 31828.82,
    target_labs: 'Lab 1'
  },
  REG_728: {
    sl_no: 728,
    date: '2026-06-18',
    model_desc: 'HP ProDesk 2 G1a Tower Desktop AI PC',
    vendor_name: 'Pursuit IT Solutions',
    vendor_address: 'Harlapur Building, Laxmi Temple Road, Vidyanagar, Hubballi',
    bill_no: 'PITS/2627/0201',
    bill_date: '2026-06-10',
    unit_cost: 74400.00,
    target_labs: 'Lab 2, Lab 3, Lab 7'
  },
  REG_419: {
    sl_no: 419,
    date: '2022-10-18',
    model_desc: 'HP 280 G9 Desktop MT',
    vendor_name: 'Pursuit Technologies Pvt Ltd',
    vendor_address: 'Pandhari Building, 2nd Cross, Vidyanagar, Hubballi',
    bill_no: 'HBLINV262/30521',
    bill_date: '2022-10-12',
    unit_cost: 39099.00,
    target_labs: 'Lab 4'
  },
  REG_279: {
    sl_no: 279,
    date: '2021-04-06',
    model_desc: 'Lenovo IdeaCentre 3 (90NB0020IN)',
    vendor_name: 'RT Computers',
    vendor_address: 'A Block, IT Park, PB Road, Hubballi',
    bill_no: 'RTC20003940',
    bill_date: '2021-03-31',
    unit_cost: 17898.31,
    target_labs: 'Lab 5'
  }
};

function determineCondition(remarks) {
  const r = String(remarks || '').trim().toLowerCase();
  if (r.includes('not working') || r.includes('not-working')) return 'DAMAGED';
  return 'GOOD';
}

function matchRegisterEntry(lab, make, model, proc) {
  const m = String(model || '').toLowerCase();
  const ma = String(make || '').toLowerCase();

  // Lab 2, 3, 7 AI PCs -> #728
  if (m.includes('prodesk 2') || m.includes('g1a') || proc.toLowerCase().includes('8700g')) {
    return REGISTER_ENTRIES.REG_728;
  }
  // Lab 4 HP 280 G9 -> #419
  if (lab === 'Lab 4' && (m.includes('280 g9') || m.includes('g9'))) {
    return REGISTER_ENTRIES.REG_419;
  }
  // Lab 1 Prodesk 400 G7 -> #296
  if (lab === 'Lab 1' && (m.includes('400 g7') || (ma.includes('hp') && m.includes('prodesk')))) {
    return REGISTER_ENTRIES.REG_296;
  }
  // Lab 5 Lenovo 90NB0020IN -> #279
  if (lab === 'Lab 5' && (m.includes('90nb') || ma.includes('lenovo'))) {
    return REGISTER_ENTRIES.REG_279;
  }
  return null;
}

async function run() {
  const excelPath = path.join(__dirname, '..', 'CSE Desktop Data 24-09-2026.xlsx');
  const wb = XLSX.readFile(excelPath);

  const targetSheets = ['Lab 1', 'Lab 2', 'Lab 3', 'Lab 4', 'Lab 5', 'Lab7', 'C-Lab 1', 'C-Lab 2'];
  const parsedAssets = [];
  const codeTracker = new Map();

  for (const sheetName of targetSheets) {
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    let headerIdx = -1;
    for (let i = 0; i < Math.min(10, rows.length); i++) {
      if (rows[i].some(c => typeof c === 'string' && /computer\s*name/i.test(c))) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx === -1) continue;

    const header = rows[headerIdx].map(c => String(c).trim().toLowerCase());
    const makeIdx = header.findIndex(h => h.includes('make'));
    const modelIdx = header.findIndex(h => h.includes('model'));
    const procIdx = header.findIndex(h => h.includes('processor'));
    const genIdx = header.findIndex(h => h.includes('gen'));
    const ramIdx = header.findIndex(h => h.includes('ram'));
    const ddrIdx = header.findIndex(h => h.includes('ddr'));
    const hddIdx = header.findIndex(h => h.includes('hdd'));
    const monIdx = header.findIndex(h => h.includes('monitor'));
    const winIdx = header.findIndex(h => h.includes('windows'));
    const bitIdx = header.findIndex(h => h.includes('bit'));
    const licIdx = header.findIndex(h => h.includes('licensed'));
    const avIdx = header.findIndex(h => h.includes('antivirus'));
    const allotIdx = header.findIndex(h => h.includes('alloted'));
    const nameIdx = header.findIndex(h => h.includes('computer name'));
    const remIdx = header.findIndex(h => h.includes('remarks'));

    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (typeof row[0] !== 'number') continue;

      const sl = row[0];
      let rawName = String(row[nameIdx] || '').trim();

      if (!rawName) {
        if (sheetName === 'Lab 2' && sl === 62) rawName = 'CSE-LAB2-62';
        else if (sheetName === 'Lab7' && sl === 43) rawName = 'CSE-LAB7-43';
        else rawName = `CSE-${sheetName.replace(/\s+/g, '').toUpperCase()}-${sl}`;
      }

      rawName = rawName.replace(/,+$/, '').trim();

      let finalCode = rawName;
      if (codeTracker.has(finalCode)) {
        const count = codeTracker.get(finalCode) + 1;
        codeTracker.set(finalCode, count);
        finalCode = `${rawName}-v${count}`;
      } else {
        codeTracker.set(finalCode, 1);
      }

      const make = String(row[makeIdx] || 'HP').trim();
      const model = String(row[modelIdx] || '').trim();
      const proc = String(row[procIdx] || '').trim();
      const gen = String(row[genIdx] || '').trim();
      const ram = String(row[ramIdx] || '').trim();
      const ddr = String(row[ddrIdx] || '').trim();
      const hdd = String(row[hddIdx] || '').trim();
      const monitor = String(row[monIdx] || '').trim();
      const os = String(row[winIdx] || '').trim();
      const bit = String(row[bitIdx] || '').trim();
      const licensed = String(row[licIdx] || '').trim();
      const antivirus = String(row[avIdx] || '').trim();
      const allotted = String(row[allotIdx] || sheetName).trim();
      const remarks = String(row[remIdx] || 'Working').trim();

      const reg = matchRegisterEntry(sheetName, make, model, proc);

      parsedAssets.push({
        asset_code: finalCode,
        name: `${make} ${model}`.trim() || 'Desktop Computer',
        type: 'DURABLE',
        location: allotted || sheetName,
        lab: sheetName,
        condition: determineCondition(remarks),
        quantity: 1,
        vendor_name: reg ? reg.vendor_name : 'KLE Tech University Store (Legacy)',
        bill_no: reg ? reg.bill_no : 'Legacy Stock Entry',
        bill_date: reg ? reg.bill_date : null,
        unit_cost: reg ? reg.unit_cost : null,
        register_sl_no: reg ? reg.sl_no : null,
        specifications: {
          make,
          model,
          processor: proc,
          generation: gen,
          ram,
          ddr,
          hdd,
          monitor,
          os,
          bit,
          licensed: licensed.includes('✔') || licensed.includes('ü') || licensed.includes('√'),
          antivirus: antivirus.includes('✔') || antivirus.includes('ü') || antivirus.includes('√'),
          remarks
        }
      });
    }
  }

  console.log(`Parsed ${parsedAssets.length} assets with vendor mapping.`);

  // Sync to PostgreSQL
  await withTransaction(async (client) => {
    await client.query('TRUNCATE TABLE assets RESTART IDENTITY CASCADE;');

    for (const a of parsedAssets) {
      await client.query(
        `INSERT INTO assets (
          asset_code, name, type, dept_id, location, condition, quantity,
          vendor_name, bill_no, bill_date, unit_cost, register_sl_no, specifications
        ) VALUES ($1, $2, $3, 1, $4, $5, $6, $7, $8, $9, $10, $11, $12);`,
        [
          a.asset_code,
          a.name,
          a.type,
          a.location,
          a.condition,
          a.quantity,
          a.vendor_name,
          a.bill_no,
          a.bill_date,
          a.unit_cost,
          a.register_sl_no,
          JSON.stringify(a.specifications)
        ]
      );
    }
    console.log(`PostgreSQL updated: 286 assets mapped with register vendor & invoice fields!`);
  });
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
