const fs = require('fs');
const path = require('path');
const db = require('../server/database/db');

function seedDatabase() {
  console.log('--- Initializing Cyberflex Database ---');

  // 1. Run schema.sql
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);
  console.log('✓ Database tables created successfully.');

  // 2. Clear existing records for clean state
  db.exec(`
    DELETE FROM submissions;
    DELETE FROM activity_logs;
    DELETE FROM student_missions;
    DELETE FROM students;
    DELETE FROM missions;
    DELETE FROM comments;
    DELETE FROM orders;
    DELETE FROM support_tickets;
    DELETE FROM products;
    DELETE FROM users;
    DELETE FROM system_config;
    DELETE FROM secret_vault;
    DELETE FROM defensive_patches;
  `);

  // 3. Seed student account
  db.run(`
    INSERT INTO students (id, username, display_name, role, points, rank)
    VALUES (1, 'student', 'Student Analyst', 'student', 0, 'Security Apprentice');
  `);
  console.log('✓ Default student account initialized.');

  // 4. Seed Missions
  const missionsDataPath = path.resolve(__dirname, '../missions/missions.json');
  const missions = JSON.parse(fs.readFileSync(missionsDataPath, 'utf8'));

  for (const m of missions) {
    db.run(`
      INSERT INTO missions (id, code, title, level, difficulty, topic, estimated_time, scenario, target_endpoint, scope, objectives, rules, points, hint1, hint2, hint3, flag)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `, [
      m.id, m.code, m.title, m.level, m.difficulty, m.topic, m.estimated_time,
      m.scenario, m.target_endpoint, m.scope, JSON.stringify(m.objectives), m.rules,
      m.points, m.hint1, m.hint2, m.hint3, m.flag
    ]);

    // Student progress: Level 1 missions unlocked, Level 2 and above unlocked or unlockable
    const initialStatus = m.level === 1 ? 'unlocked' : (m.level === 2 ? 'unlocked' : 'unlocked');
    db.run(`
      INSERT INTO student_missions (student_id, mission_id, status, hints_used, attempts, points_awarded)
      VALUES (1, ?, ?, 0, 0, 0);
    `, [m.id, initialStatus]);
  }
  console.log(`✓ Seeded ${missions.length} security missions.`);

  // 5. Seed Corporate Users
  db.run(`
    INSERT INTO users (id, username, password, full_name, email, role, balance, bio, is_verified)
    VALUES
      (1, 'admin', 'admin', 'Administrator (CISO)', 'admin@cyberflex.local', 'admin', 50000.00, 'Chief Information Security Officer. Internal Recovery PIN: 849201', 1),
      (2, 'john.doe', 'password123', 'John Doe', 'john.doe@example.com', 'customer', 1500.00, 'Senior Logistics Coordinator at Cyberflex Partner Logistics', 1),
      (3, 'sarah.connor', 'skynet2026', 'Sarah Connor', 'sarah.c@techcorp.io', 'customer', 8450.00, 'Strategic Defense Systems Analyst', 1),
      (4, 'guest', 'guest', 'Guest User', 'guest@cyberflex.local', 'customer', 100.00, 'Standard demo customer access account', 0);
  `);
  console.log('✓ Seeded corporate users.');

  // 6. Seed Corporate Products
  db.run(`
    INSERT INTO products (id, name, category, price, description, stock, is_confidential)
    VALUES
      (1, 'Cyberflex Sentry Endpoint Defense', 'Software', 299.00, 'Enterprise host-based telemetry sensor providing real-time anomaly detection.', 150, 0),
      (2, 'Cyberflex Quantum Gateway v3', 'Hardware', 850.00, 'High-throughput hardware edge appliance with automated packet filtering.', 45, 0),
      (3, 'Cyberflex Cloud Fortress License', 'Cloud', 1200.00, 'Zero-trust microsegmentation and identity verification engine for hybrid cloud.', 500, 0),
      (4, 'Cyberflex Hardware Security Module (HSM-9000)', 'Hardware', 5000.00, 'FIPS 140-3 Level 4 tamper-resistant cryptographic accelerator and key store.', 12, 0),
      (5, 'Cyberflex Network Tap Sensor', 'Hardware', 450.00, 'Passive optical network monitoring tap for IDS/IPS traffic mirrored inspection.', 80, 0),
      (6, 'CONFIDENTIAL: Project Chimera Protocol', 'Classified', 99999.00, 'Restricted military-grade autonomous threat hunting mesh blueprint.', 1, 1);
  `);
  console.log('✓ Seeded products catalog.');

  // 7. Seed Orders (with IDOR vulnerability target)
  db.run(`
    INSERT INTO orders (id, user_id, product_id, quantity, total_price, status, invoice_notes)
    VALUES
      (1, 2, 1, 2, 598.00, 'Delivered', 'Standard logistics procurement allocation. Shipped to Regional Warehouse B.'),
      (2, 2, 5, 1, 450.00, 'Shipped', 'Express dispatch. Tracking Number: CFX-TRK-8812903.'),
      (3, 3, 6, 1, 99999.00, 'Confidential Clearance', 'RESTRICTED ENTERPRISE CONTRACT. Clearance Verification Flag: CFX{1d0r_d1r3ct_0bj3ct_3xp0s3d}'),
      (4, 1, 4, 5, 25000.00, 'Vault Storage', 'Internal IT Infrastructure procurement. Root keys deployed.');
  `);
  console.log('✓ Seeded corporate orders.');

  // 8. Seed Customer Comments (with XSS vulnerability target)
  db.run(`
    INSERT INTO comments (id, product_id, author, content, rating, is_approved)
    VALUES
      (1, 1, 'SecOps_Director', 'Sentry v4.2 deployment went smoothly across our 500 workstation fleet. Highly recommended.', 5, 1),
      (2, 2, 'NetworkLead', 'The Quantum Gateway handled peak 10Gbps line-rate throughput without breaking a sweat.', 5, 1),
      (3, 3, 'DevTeam_Audit', 'Note to team: ensure customer comments and feedback threads are reviewed regularly by moderators.', 4, 1);
  `);
  console.log('✓ Seeded customer comments.');

  // 9. Seed Support Tickets
  db.run(`
    INSERT INTO support_tickets (id, user_id, subject, message, status, response)
    VALUES
      (1, 2, 'VPN Gateway Certificate Renewal', 'Our office TLS certificate is expiring this Friday. Could you issue the renewed bundle?', 'Resolved', 'Renewed bundle deployed to cluster.'),
      (99, 1, 'EXECUTIVE BRIEFING: Confidential Security Audit', 'Restricted security review attached. Attached finding key: CFX{full_sc0p3_p3nt3st_v3r1f13d}. Do not distribute outside board.', 'Restricted', 'Archived in CISO vault.');
  `);
  console.log('✓ Seeded support tickets.');

  // 10. Seed Secret Vault (for SQLi)
  db.run(`
    INSERT INTO secret_vault (secret_name, secret_value, classification)
    VALUES
      ('FLAG_VAULT_KEY', 'CFX{un10n_s3l3ct_m4st3r_sq11}', 'TOP_SECRET'),
      ('BACKUP_ENCRYPTION_KEY', 'Cyberflex_Sup3r_S3cr3t_K3y_2026!', 'CONFIDENTIAL'),
      ('ADMIN_RESET_PIN', '849201', 'RESTRICTED'),
      ('DISASTER_RECOVERY_TOKEN', 'DR_TOKEN_CFX_ALPHA_9918', 'INTERNAL');
  `);
  console.log('✓ Seeded secret vault.');

  // 11. Seed System Configuration
  db.run(`
    INSERT INTO system_config (config_key, config_value, is_sensitive)
    VALUES
      ('MAINTENANCE_FLAG', 'CFX{bfl4_4dm1n_funct10n_3xp0s3d}', 1),
      ('APP_ENV', 'production-internal', 0),
      ('BACKUP_PATH', '/var/backups/cyberflex', 1),
      ('RECOVERY_HEADER', 'X-Cyberflex-Internal', 1);
  `);

  // 12. Seed Defensive Patches
  db.run(`
    INSERT INTO defensive_patches (mission_id, is_patched, description)
    VALUES
      ('03', 0, 'SQL Injection Parameterized Queries Patch'),
      ('10', 0, 'Path Traversal Canonical Path Validation Patch');
  `);

  // 13. Log Setup Event
  db.run(`
    INSERT INTO activity_logs (student_id, event_type, details)
    VALUES (1, 'LAB_INITIALIZED', 'Cyberflex Security Missions Lab successfully seeded and ready.');
  `);

  console.log('=============================================');
  console.log('CYBERFLEX SECURITY LAB INITIALIZED SUCCESSFULLY');
  console.log('=============================================');
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
