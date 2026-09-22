const fs = require('fs');
const path = require('path');
const db = require('../server/database/db');
const seedDatabase = require('../database/seed');

console.log('>>> Resetting Cyberflex Security Missions Lab to Initial State...');

// 1. Close DB connection if open
db.close();

// 2. Remove SQLite database files
const dbPath = path.resolve(__dirname, '../database/cyberflex.db');
if (fs.existsSync(dbPath)) {
  try {
    fs.unlinkSync(dbPath);
    console.log('✓ Cleared database file.');
  } catch (err) {
    console.log('Note: could not unlink active db file directly, will reseed tables.');
  }
}

// 3. Clear uploads directory except default avatar
const uploadDir = path.resolve(__dirname, '../uploads');
if (fs.existsSync(uploadDir)) {
  const files = fs.readdirSync(uploadDir);
  for (const file of files) {
    if (file !== 'default-avatar.png') {
      try {
        fs.unlinkSync(path.join(uploadDir, file));
      } catch (e) {}
    }
  }
  console.log('✓ Cleaned uploaded temporary files.');
} else {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 4. Ensure default avatar and secret key exist
const configDir = path.resolve(__dirname, '../server/config');
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}
const secretKeyPath = path.join(configDir, 'secret.key');
fs.writeFileSync(secretKeyPath, `# CYBERFLEX INTERNAL MASTER CONFIGURATION
# DO NOT EXPOSE TO PUBLIC NETWORK
MASTER_KEY_ID=CFX-CORE-9982-ALPHA
ENCRYPTION_SECRET=CFX{d0t_d0t_sl4sh_tr4v3rs4l}
ENVIRONMENT=PRODUCTION
MAINTENANCE_ALLOWED_IP=127.0.0.1
`, 'utf8');

// 5. Re-run seeding
seedDatabase();

console.log('>>> Cyberflex Lab Reset Complete! Clean state restored.');
