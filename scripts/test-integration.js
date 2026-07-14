/**
 * Integration smoke test — validates project structure and module loading.
 * Run: node scripts/test-integration.js
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ ${message}`);
  }
}

console.log('\nAlivestage Integration Smoke Test\n');

const requiredFiles = [
  'package.json',
  'src/styles/global.css',
  'src/app/layout.js',
  'src/app/page.js',
  'src/app/auth/page.js',
  'src/app/onboarding/page.js',
  'src/app/onboarding/role/page.js',
  'src/app/dashboard/page.js',
  'src/app/artist/[id]/page.js',
  'src/app/admin/layout.js',
  'src/app/admin/page.js',
  'src/app/admin/settings/page.js',
  'src/components/Navbar/Navbar.js',
  'src/components/ArtistCard/ArtistCard.js',
  'src/components/CitySelect/CitySelect.js',
  'src/components/CitiesProvider/CitiesProvider.js',
  'src/components/ConfirmationModal/ConfirmationModal.js',
  'src/lib/cities.js',
  'server/server.js',
  'server/routes/bookings.js',
  'server/routes/admin.js',
  'server/routes/artists.js',
  'server/routes/cities.js',
  'server/routes/auth.js',
  'supabase/migrations/005_cities.sql',
  'server/services/payment.js',
  'server/services/email.js',
  'server/services/cron.js',
  'server/services/otp.js',
  'server/services/jwt.js',
  'server/middleware/auth.js',
  'server/config/supabase.js',
  'supabase/migrations/001_initial_schema.sql',
  'supabase/migrations/002_remove_supabase_auth.sql',
  '.env.example',
];

console.log('File structure:');
for (const file of requiredFiles) {
  assert(fs.existsSync(path.join(root, file)), file);
}

console.log('\nServer modules:');
try {
  const { splitAmount, amountToPaise, verifyPaymentSignature } = require('../server/services/payment');
  const split = splitAmount(1000, 10);
  assert(split.platformCommission === 100, 'splitAmount calculates 10% commission');
  assert(amountToPaise(99.5) === 9950, 'amountToPaise converts correctly');
  assert(verifyPaymentSignature('o', 'p', 'mock') === true, 'verifyPaymentSignature mock mode');
} catch (err) {
  failed++;
  console.error(`  ✗ payment service: ${err.message}`);
}

console.log('\nRBAC middleware:');
try {
  const { requireRole, requireSuperadmin } = require('../server/middleware/auth');
  assert(typeof requireRole === 'function', 'requireRole exported');
  assert(typeof requireSuperadmin === 'function', 'requireSuperadmin exported');
} catch (err) {
  failed++;
  console.error(`  ✗ auth middleware: ${err.message}`);
}

console.log('\nCron service:');
try {
  const { registerCronJobs, processExpiredPendingBookings } = require('../server/services/cron');
  assert(typeof registerCronJobs === 'function', 'registerCronJobs exported');
  assert(typeof processExpiredPendingBookings === 'function', 'processExpiredPendingBookings exported');
} catch (err) {
  failed++;
  console.error(`  ✗ cron service: ${err.message}`);
}

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
