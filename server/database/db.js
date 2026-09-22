const path = require('path');
const fs = require('fs');

const DB_PATH = path.resolve(__dirname, '../../database/cyberflex.db');

// Ensure database directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let dbInstance = null;

function getDatabase() {
  if (!dbInstance) {
    const { DatabaseSync } = require('node:sqlite');
    dbInstance = new DatabaseSync(DB_PATH);
    // Enable foreign keys
    dbInstance.exec('PRAGMA foreign_keys = ON;');
  }
  return dbInstance;
}

const db = {
  getRawDb: () => getDatabase(),

  exec: (sql) => {
    return getDatabase().exec(sql);
  },

  all: (sql, params = []) => {
    const stmt = getDatabase().prepare(sql);
    return stmt.all(...params);
  },

  get: (sql, params = []) => {
    const stmt = getDatabase().prepare(sql);
    return stmt.get(...params) || null;
  },

  run: (sql, params = []) => {
    const stmt = getDatabase().prepare(sql);
    return stmt.run(...params);
  },

  // Direct raw query execution (used specifically for intentional SQL Injection lab demonstration)
  rawQuery: (sql) => {
    return getDatabase().prepare(sql).all();
  },

  close: () => {
    if (dbInstance) {
      dbInstance.close();
      dbInstance = null;
    }
  }
};

module.exports = db;
