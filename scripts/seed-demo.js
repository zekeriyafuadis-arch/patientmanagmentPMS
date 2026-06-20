require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { initDatabase, closeDatabase } = require('../backend/src/config/database');
const { seedDemoData } = require('../backend/src/config/demoData');

async function main() {
  await initDatabase();
  const result = await seedDemoData();
  if (result.seeded) {
    console.log('Demo data loaded successfully:');
    console.log(`  Patients:     ${result.patients}`);
    console.log(`  Appointments: ${result.appointments}`);
    console.log(`  Invoices:     ${result.invoices}`);
    console.log(`  Staff:        dentist + receptionist (see .env for passwords)`);
  } else {
    console.error('Demo seed failed:', result.message || result.reason);
    process.exitCode = 1;
  }
  await closeDatabase();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
