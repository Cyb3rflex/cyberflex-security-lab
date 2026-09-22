const fs = require('fs');
const path = require('path');
const seedDatabase = require('../database/seed');

console.log('>>> Running Cyberflex Setup Script...');

// 1. Ensure directories exist
const uploadDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const configDir = path.resolve(__dirname, '../server/config');
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

// 2. Write internal secret key file for Path Traversal mission (Mission 10)
const secretKeyPath = path.join(configDir, 'secret.key');
fs.writeFileSync(secretKeyPath, `# CYBERFLEX INTERNAL MASTER CONFIGURATION
# DO NOT EXPOSE TO PUBLIC NETWORK
MASTER_KEY_ID=CFX-CORE-9982-ALPHA
ENCRYPTION_SECRET=CFX{d0t_d0t_sl4sh_tr4v3rs4l}
ENVIRONMENT=PRODUCTION
MAINTENANCE_ALLOWED_IP=127.0.0.1
`, 'utf8');

// 3. Write default avatar
const defaultAvatarPath = path.join(uploadDir, 'default-avatar.png');
if (!fs.existsSync(defaultAvatarPath)) {
  fs.writeFileSync(defaultAvatarPath, 'Cyberflex Default Avatar Binary Simulator');
}

// 4. Initialize and seed SQLite database
seedDatabase();

console.log('>>> Setup Completed successfully!');
console.log('>>> To start the server, run: npm start');
