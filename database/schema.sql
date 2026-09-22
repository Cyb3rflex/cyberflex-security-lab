-- Cyberflex Security Missions Lab Database Schema

-- 1. Student & Lab Progression Tables
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT DEFAULT 'student',
  points INTEGER DEFAULT 0,
  rank TEXT DEFAULT 'Security Apprentice',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS missions (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  level INTEGER NOT NULL,
  difficulty TEXT NOT NULL,
  topic TEXT NOT NULL,
  estimated_time TEXT NOT NULL,
  scenario TEXT NOT NULL,
  target_endpoint TEXT NOT NULL,
  scope TEXT NOT NULL,
  objectives TEXT NOT NULL,
  rules TEXT NOT NULL,
  points INTEGER DEFAULT 100,
  hint1 TEXT NOT NULL,
  hint2 TEXT NOT NULL,
  hint3 TEXT NOT NULL,
  flag TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS student_missions (
  student_id INTEGER NOT NULL,
  mission_id TEXT NOT NULL,
  status TEXT DEFAULT 'unlocked',
  hints_used INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  completed_at DATETIME,
  points_awarded INTEGER DEFAULT 0,
  PRIMARY KEY (student_id, mission_id),
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (mission_id) REFERENCES missions(id)
);

CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  mission_id TEXT NOT NULL,
  submitted_flag TEXT NOT NULL,
  is_correct INTEGER NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (mission_id) REFERENCES missions(id)
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  details TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id)
);

-- 2. Cyberflex Industries Corporate Tables
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'customer',
  balance REAL DEFAULT 1500.00,
  api_key TEXT,
  bio TEXT,
  avatar_url TEXT DEFAULT '/uploads/default-avatar.png',
  is_verified INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price REAL NOT NULL,
  description TEXT NOT NULL,
  stock INTEGER DEFAULT 100,
  is_confidential INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_price REAL NOT NULL,
  status TEXT DEFAULT 'Processing',
  invoice_notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER DEFAULT 1,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  rating INTEGER DEFAULT 5,
  is_approved INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'Open',
  response TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS system_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  config_key TEXT UNIQUE NOT NULL,
  config_value TEXT NOT NULL,
  is_sensitive INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS secret_vault (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  secret_name TEXT NOT NULL,
  secret_value TEXT NOT NULL,
  classification TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS defensive_patches (
  mission_id TEXT PRIMARY KEY,
  is_patched INTEGER DEFAULT 0,
  description TEXT,
  patch_applied_at DATETIME
);
