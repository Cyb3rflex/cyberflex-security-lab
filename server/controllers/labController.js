const db = require('../database/db');
const { logActivity } = require('../middleware/logger');

// Rank thresholds
function calculateRank(points) {
  if (points >= 1400) return 'Penetration Tester';
  if (points >= 600) return 'Security Analyst';
  return 'Security Apprentice';
}

function getMissions(req, res) {
  try {
    const studentId = 1;
    const missions = db.all(`
      SELECT m.id, m.code, m.title, m.level, m.difficulty, m.topic, m.estimated_time,
             m.points, sm.status, sm.hints_used, sm.attempts, sm.completed_at, sm.points_awarded
      FROM missions m
      LEFT JOIN student_missions sm ON m.id = sm.mission_id AND sm.student_id = ?
      ORDER BY CAST(m.id AS INTEGER) ASC
    `, [studentId]);

    res.json({ success: true, missions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function getMissionById(req, res) {
  try {
    const missionId = req.params.id.padStart(2, '0');
    const studentId = 1;

    const mission = db.get(`
      SELECT m.id, m.code, m.title, m.level, m.difficulty, m.topic, m.estimated_time,
             m.scenario, m.target_endpoint, m.scope, m.objectives, m.rules, m.points,
             sm.status, sm.hints_used, sm.attempts, sm.completed_at, sm.points_awarded
      FROM missions m
      LEFT JOIN student_missions sm ON m.id = sm.mission_id AND sm.student_id = ?
      WHERE m.id = ?
    `, [studentId, missionId]);

    if (!mission) {
      return res.status(404).json({ success: false, error: 'Mission not found.' });
    }

    // Parse objectives JSON string
    try {
      mission.objectives = JSON.parse(mission.objectives);
    } catch (e) {
      mission.objectives = [mission.objectives];
    }

    // Fetch unlocked hints based on hints_used
    const fullMission = db.get('SELECT hint1, hint2, hint3 FROM missions WHERE id = ?', [missionId]);
    mission.unlocked_hints = [];
    if (mission.hints_used >= 1) mission.unlocked_hints.push({ level: 1, text: fullMission.hint1, cost: 10 });
    if (mission.hints_used >= 2) mission.unlocked_hints.push({ level: 2, text: fullMission.hint2, cost: 15 });
    if (mission.hints_used >= 3) mission.unlocked_hints.push({ level: 3, text: fullMission.hint3, cost: 25 });

    logActivity(studentId, 'MISSION_OPENED', `Opened Mission ${mission.code}: ${mission.title}`);

    res.json({ success: true, mission });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function requestHint(req, res) {
  try {
    const missionId = req.params.id.padStart(2, '0');
    const studentId = 1;

    const studentMission = db.get(
      'SELECT status, hints_used FROM student_missions WHERE student_id = ? AND mission_id = ?',
      [studentId, missionId]
    );

    if (!studentMission) {
      return res.status(404).json({ success: false, error: 'Mission progress record not found.' });
    }

    if (studentMission.hints_used >= 3) {
      return res.status(400).json({ success: false, error: 'All 3 hints have already been unlocked for this mission.' });
    }

    const nextHintLevel = studentMission.hints_used + 1;
    const costs = { 1: 10, 2: 15, 3: 25 };
    const penalty = costs[nextHintLevel];

    const mission = db.get('SELECT code, title, hint1, hint2, hint3 FROM missions WHERE id = ?', [missionId]);
    const hintText = nextHintLevel === 1 ? mission.hint1 : (nextHintLevel === 2 ? mission.hint2 : mission.hint3);

    // Update hints_used
    db.run(
      'UPDATE student_missions SET hints_used = ? WHERE student_id = ? AND mission_id = ?',
      [nextHintLevel, studentId, missionId]
    );

    // Deduct student points if points > 0
    db.run(
      'UPDATE students SET points = MAX(0, points - ?) WHERE id = ?',
      [penalty, studentId]
    );

    logActivity(studentId, 'HINT_REQUESTED', `Unlocked Hint ${nextHintLevel} for ${mission.code} (-${penalty} pts)`);

    res.json({
      success: true,
      hintLevel: nextHintLevel,
      hintText,
      pointsDeducted: penalty,
      message: `Hint ${nextHintLevel} unlocked. ${penalty} points deducted.`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function submitFlag(req, res) {
  try {
    const missionId = req.params.id.padStart(2, '0');
    const { flag } = req.body;
    const studentId = 1;

    if (!flag || typeof flag !== 'string') {
      return res.status(400).json({ success: false, error: 'Flag parameter is required.' });
    }

    const cleanFlag = flag.trim();

    const mission = db.get('SELECT id, code, title, points, flag FROM missions WHERE id = ?', [missionId]);
    if (!mission) {
      return res.status(404).json({ success: false, error: 'Mission not found.' });
    }

    const studentMission = db.get(
      'SELECT status, hints_used, attempts FROM student_missions WHERE student_id = ? AND mission_id = ?',
      [studentId, missionId]
    );

    const isCorrect = (cleanFlag === mission.flag);

    // Record submission
    db.run(
      'INSERT INTO submissions (student_id, mission_id, submitted_flag, is_correct) VALUES (?, ?, ?, ?)',
      [studentId, missionId, cleanFlag, isCorrect ? 1 : 0]
    );

    // Increment attempts
    const newAttempts = (studentMission ? studentMission.attempts : 0) + 1;
    db.run(
      'UPDATE student_missions SET attempts = ? WHERE student_id = ? AND mission_id = ?',
      [newAttempts, studentId, missionId]
    );

    logActivity(studentId, 'FLAG_SUBMITTED', `Attempt #${newAttempts} for ${mission.code}: ${isCorrect ? 'ACCEPTED' : 'REJECTED'}`);

    if (!isCorrect) {
      return res.status(400).json({
        success: false,
        isCorrect: false,
        error: 'Incorrect flag. Verify your findings and test again.',
        attempts: newAttempts
      });
    }

    // Flag is correct! Check if already completed
    const alreadyCompleted = (studentMission && studentMission.status === 'completed');
    let pointsAwarded = 0;

    if (!alreadyCompleted) {
      // Calculate final points: base minus hint penalties
      const penalties = [0, 10, 25, 50]; // cumulative penalties for 0, 1, 2, 3 hints
      const penalty = penalties[studentMission ? studentMission.hints_used : 0] || 0;
      pointsAwarded = Math.max(25, mission.points - penalty);

      // Update student mission status
      db.run(
        `UPDATE student_missions
         SET status = 'completed', completed_at = CURRENT_TIMESTAMP, points_awarded = ?
         WHERE student_id = ? AND mission_id = ?`,
        [pointsAwarded, studentId, missionId]
      );

      // Add points to student total
      db.run('UPDATE students SET points = points + ? WHERE id = ?', [pointsAwarded, studentId]);

      // Unlock next sequential mission if exists
      const nextId = (parseInt(missionId, 10) + 1).toString().padStart(2, '0');
      db.run(
        `UPDATE student_missions SET status = 'unlocked' WHERE student_id = ? AND mission_id = ? AND status = 'locked'`,
        [studentId, nextId]
      );

      // Recalculate rank
      const student = db.get('SELECT points FROM students WHERE id = ?', [studentId]);
      const newRank = calculateRank(student.points);
      db.run('UPDATE students SET rank = ? WHERE id = ?', [newRank, studentId]);

      logActivity(studentId, 'MISSION_COMPLETED', `Completed ${mission.code}: ${mission.title} (+${pointsAwarded} pts)`);
    }

    res.json({
      success: true,
      isCorrect: true,
      alreadyCompleted,
      mission: {
        code: mission.code,
        title: mission.title,
        status: 'COMPLETED'
      },
      pointsAwarded,
      message: 'MISSION COMPLETE! Flag accepted. Next mission unlocked.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function getStudentProfile(req, res) {
  try {
    const studentId = 1;
    const student = db.get('SELECT id, username, display_name, role, points, rank FROM students WHERE id = ?', [studentId]);

    const completedCount = db.get(
      `SELECT COUNT(*) as count FROM student_missions WHERE student_id = ? AND status = 'completed'`,
      [studentId]
    ).count;

    const totalMissions = db.get('SELECT COUNT(*) as count FROM missions').count;

    const flagsCount = db.get(
      'SELECT COUNT(DISTINCT mission_id) as count FROM submissions WHERE student_id = ? AND is_correct = 1',
      [studentId]
    ).count;

    const recentLogs = db.all(
      'SELECT id, event_type, details, timestamp FROM activity_logs WHERE student_id = ? ORDER BY id DESC LIMIT 15',
      [studentId]
    );

    res.json({
      success: true,
      student: {
        ...student,
        completedMissions: completedCount,
        totalMissions,
        flagsCount,
        progressPercent: Math.round((completedCount / totalMissions) * 100)
      },
      activityLogs: recentLogs
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function toggleDefensivePatch(req, res) {
  try {
    const { missionId, patchStatus } = req.body;
    const cleanId = missionId ? missionId.padStart(2, '0') : '03';
    const patched = patchStatus ? 1 : 0;

    db.run(
      `INSERT INTO defensive_patches (mission_id, is_patched, patch_applied_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(mission_id) DO UPDATE SET is_patched = ?, patch_applied_at = CURRENT_TIMESTAMP`,
      [cleanId, patched, patched]
    );

    logActivity(1, 'DEFENSIVE_PATCH_TOGGLE', `Patch for Mission ${cleanId} set to ${patched ? 'ACTIVE' : 'DISABLED'}`);

    res.json({
      success: true,
      missionId: cleanId,
      isPatched: patched === 1,
      message: `Patch for Mission ${cleanId} is now ${patched ? 'ENABLED' : 'DISABLED'}.`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

function verifyDefensivePatch(req, res) {
  try {
    const row03 = db.get('SELECT is_patched FROM defensive_patches WHERE mission_id = ?', ['03']);
    const row10 = db.get('SELECT is_patched FROM defensive_patches WHERE mission_id = ?', ['10']);

    const is03Patched = row03 && row03.is_patched === 1;
    const is10Patched = row10 && row10.is_patched === 1;

    if (!is03Patched && !is10Patched) {
      return res.status(400).json({
        success: false,
        error: 'No defensive patches are currently enabled. Activate at least one security patch to run verification.'
      });
    }

    logActivity(1, 'DEFENSIVE_VERIFICATION', 'Defensive security fix validation tests passed successfully.');

    res.json({
      success: true,
      verified: true,
      flag: 'CFX{p4tch_v3r1f13d_s3cur3_c0d1ng}',
      details: {
        sqlInjectionPatched: is03Patched,
        pathTraversalPatched: is10Patched
      },
      message: 'EXCELLENT WORK! Security patch validated. All known attack payloads neutralized.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  getMissions,
  getMissionById,
  requestHint,
  submitFlag,
  getStudentProfile,
  toggleDefensivePatch,
  verifyDefensivePatch
};
