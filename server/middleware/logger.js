const db = require('../database/db');

function logActivity(studentId, eventType, details) {
  try {
    db.run(
      'INSERT INTO activity_logs (student_id, event_type, details) VALUES (?, ?, ?)',
      [studentId || 1, eventType, details || '']
    );
  } catch (err) {
    console.error('Failed to write activity log:', err.message);
  }
}

module.exports = {
  logActivity
};
