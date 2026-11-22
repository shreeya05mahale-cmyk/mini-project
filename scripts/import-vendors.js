/**
 * scripts/import-vendors.js
 *
 * Extracts the 68 official registered vendors from:
 * documents/docx_extracted/word/document.xml
 * and populates the 'suppliers' table in PostgreSQL.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool, withTransaction } = require('../server/db');

async function importVendors() {
  const xmlPath = path.join(__dirname, '..', 'documents', 'docx_extracted', 'word', 'document.xml');
  console.log(`Reading vendors from: ${xmlPath}`);
  const rawXml = fs.readFileSync(xmlPath, 'utf8');

  // Regex to extract all table rows <w:tr>...</w:tr>
  const trRegex = /<w:tr\b[^>]*>([\s\S]*?)<\/w:tr>/gi;
  const tcRegex = /<w:tc\b[^>]*>([\s\S]*?)<\/w:tc>/gi;
  const tagRegex = /<[^>]+>/g;

  const vendors = [];
  let trMatch;

  while ((trMatch = trRegex.exec(rawXml)) !== null) {
    const rowXml = trMatch[1];
    const cells = [];
    let tcMatch;

    while ((tcMatch = tcRegex.exec(rowXml)) !== null) {
      let cellText = tcMatch[1].replace(tagRegex, ' ').trim();
      cellText = cellText.replace(/\s+/g, ' ');
      // decode basic html entities
      cellText = cellText.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      cells.push(cellText);
    }

    // A valid vendor row has 4 columns: [Sl. No, Vendors name, Contact Person, Contact Numbers]
    if (cells.length >= 4 && /^\d+$/.test(cells[0].trim())) {
      const slNo = parseInt(cells[0].trim(), 10);
      let vendorNameRaw = cells[1].trim();
      const contactPerson = cells[2].trim();
      const contactNumbers = cells[3].trim();

      // Separate location from name if comma present (e.g. "Arpita Office Automation, Hubli")
      let name = vendorNameRaw;
      let address = 'Hubballi / Karnataka';

      const parts = vendorNameRaw.split(',');
      if (parts.length > 1) {
        name = parts[0].trim();
        address = parts.slice(1).join(',').trim();
      }

      const contact = [contactPerson, contactNumbers].filter(Boolean).join(' | ');

      vendors.push({
        slNo,
        name: vendorNameRaw, // keep clean full name
        contact: contact || 'Contact: InfoCell Vendor Register',
        address: address || 'Hubballi'
      });
    }
  }

  console.log(`Parsed ${vendors.length} vendors from Word document.`);

  // Also include the 3 suppliers from earlier registers if not already present
  const registerSuppliers = [
    {
      name: 'Pursuit Technologies Pvt Ltd',
      contact: 'Mr. Nitin Nayak | 98451 06609',
      address: 'No 21, Ground Floor, Pandhari Building, 2nd Cross, Vidyanagar, Hubballi - 580021'
    },
    {
      name: 'Pursuit IT Solutions',
      contact: 'Mr. Ravi | 98801 94266',
      address: 'CTS NO: 20972/15/22/A, Harlapur Building, Laxmi Temple Road, Vidyanagar, Hubballi'
    },
    {
      name: 'RT Computers',
      contact: 'IT Park PB Road | 0836-4252539',
      address: '#106, 107 & 108, A Block, IT Park, PB Road, Hubballi - 580029'
    }
  ];

  await withTransaction(async (client) => {
    // Clean reload suppliers
    await client.query('TRUNCATE TABLE suppliers RESTART IDENTITY CASCADE;');

    // 1. Insert register historical suppliers first
    for (const s of registerSuppliers) {
      await client.query(
        `INSERT INTO suppliers (name, contact, address) VALUES ($1, $2, $3);`,
        [s.name, s.contact, s.address]
      );
    }

    // 2. Insert the 68 official vendors from the document
    let inserted = 0;
    for (const v of vendors) {
      // Check if vendor already inserted
      const exists = await client.query('SELECT supplier_id FROM suppliers WHERE name ILIKE $1;', [v.name]);
      if (exists.rows.length === 0) {
        await client.query(
          `INSERT INTO suppliers (name, contact, address) VALUES ($1, $2, $3);`,
          [v.name, v.contact, v.address]
        );
        inserted++;
      }
    }

    const totalCount = await client.query('SELECT COUNT(*) FROM suppliers;');
    console.log(`Successfully populated suppliers table! Total active vendors: ${totalCount.rows[0].count}`);
  });
}

importVendors()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Vendor import failed:', err);
    process.exit(1);
  });
