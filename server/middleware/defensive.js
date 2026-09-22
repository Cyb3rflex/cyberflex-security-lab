const db = require('../database/db');

function isMissionPatched(missionId) {
  try {
    const row = db.get('SELECT is_patched FROM defensive_patches WHERE mission_id = ?', [missionId]);
    return row && row.is_patched === 1;
  } catch (err) {
    return false;
  }
}

module.exports = {
  isMissionPatched
};
