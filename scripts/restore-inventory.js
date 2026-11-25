/**
 * scripts/restore-inventory.js
 * 
 * Safeguard script to restore all 286 official university lab assets
 * directly to their exact pristine state from CSE Desktop Data 24-09-2026.xlsx.
 * 
 * Run with: node scripts/restore-inventory.js
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('Restoring official university inventory records...');

try {
  execSync('node scripts/import-university-data.js', {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit'
  });
  console.log('\n✓ Official university inventory safely restored to 286 machines!');
} catch (err) {
  console.error('Failed to restore:', err.message);
  process.exit(1);
}
