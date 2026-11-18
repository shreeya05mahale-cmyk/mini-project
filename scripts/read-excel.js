const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'CSE Desktop Data 24-09-2026.xlsx');
const wb = XLSX.readFile(filePath);

// Only Lab 1 to Lab 4
const targetSheets = ['Lab 1', 'Lab 2', 'Lab 3', 'Lab 4'];

targetSheets.forEach(name => {
  const ws = wb.Sheets[name];
  if (!ws) { console.log(`Sheet "${name}" not found`); return; }

  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  console.log(`\n========== Sheet: ${name} ==========`);
  data.forEach((row, i) => {
    if (row.some(cell => cell !== '')) {
      console.log(`Row ${i}: ${JSON.stringify(row)}`);
    }
  });
});
