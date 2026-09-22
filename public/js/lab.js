// Cyberflex Security Missions Lab — Hub Client Script

let allMissions = [];
let currentFilter = 'all';

async function loadLabData() {
  await Promise.all([loadStudentProfile(), loadMissions()]);
}

async function loadStudentProfile() {
  try {
    const res = await fetch('/api/lab/profile');
    const data = await res.json();
    if (!data.success) return;

    const s = data.student;
    document.getElementById('student-name').textContent = s.display_name || s.username;
    document.getElementById('student-rank').textContent = s.rank;
    document.getElementById('stat-points').textContent = s.points;
    document.getElementById('stat-flags').textContent = s.flagsCount;
    document.getElementById('stat-progress').textContent = `${s.completedMissions} / ${s.totalMissions}`;
    document.getElementById('progress-bar').style.width = `${s.progressPercent}%`;
    document.getElementById('progress-pct-label').textContent = `${s.progressPercent}% Complete`;

    // Render activity logs
    renderActivityLogs(data.activityLogs || []);
  } catch (err) {
    console.error('Failed to load student profile:', err);
  }
}

async function loadMissions() {
  try {
    const res = await fetch('/api/lab/missions');
    const data = await res.json();
    if (!data.success) return;

    allMissions = data.missions;
    renderMissionGrid();
  } catch (err) {
    console.error('Failed to load missions:', err);
  }
}

function setFilter(level, btn) {
  currentFilter = level;
  document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderMissionGrid();
}

function renderMissionGrid() {
  const container = document.getElementById('mission-grid');
  if (!container) return;

  const filtered = allMissions.filter(m => {
    if (currentFilter === 'all') return true;
    if (currentFilter === 'defensive') return m.level === 4;
    return m.level === parseInt(currentFilter, 10);
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div class="alert alert-info" style="grid-column: 1/-1;">No missions found for this level.</div>`;
    return;
  }

  container.innerHTML = filtered.map(m => {
    const isCompleted = m.status === 'completed';
    const isLocked = m.status === 'locked';

    let diffBadgeClass = 'badge-primary';
    if (m.difficulty === 'Beginner') diffBadgeClass = 'badge-success';
    else if (m.difficulty === 'Intermediate') diffBadgeClass = 'badge-warning';
    else if (m.difficulty === 'Advanced') diffBadgeClass = 'badge-danger';

    let statusBadge = isCompleted
      ? `<span class="badge badge-success">✓ Completed (+${m.points_awarded || m.points} pts)</span>`
      : (isLocked ? `<span class="badge badge-neutral">🔒 Locked</span>` : `<span class="badge badge-primary">Active</span>`);

    return `
      <div class="mission-card ${isCompleted ? 'completed' : ''} ${isLocked ? 'locked' : ''}">
        <div class="mission-top">
          <span class="mission-code">${m.code}</span>
          <span class="badge ${diffBadgeClass}">${m.difficulty}</span>
        </div>
        <h3 class="mission-title">${escapeHtml(m.title)}</h3>
        <span class="mission-topic">${escapeHtml(m.topic)}</span>
        <p class="mission-desc">Estimated: ${escapeHtml(m.estimated_time)} • Points: ${m.points}</p>
        <div class="mission-footer">
          ${statusBadge}
          <a href="/mission.html?id=${m.id}" class="btn ${isCompleted ? 'btn-secondary' : 'btn-primary'} btn-sm">
            ${isCompleted ? 'Review Mission' : 'Open Mission'} →
          </a>
        </div>
      </div>
    `;
  }).join('');
}

function renderActivityLogs(logs) {
  const logBox = document.getElementById('activity-log-box');
  if (!logBox) return;

  if (logs.length === 0) {
    logBox.innerHTML = '<div class="log-entry"><span class="log-msg">No activity recorded yet. Start testing missions!</span></div>';
    return;
  }

  logBox.innerHTML = logs.map(l => {
    const time = l.timestamp ? new Date(l.timestamp).toLocaleTimeString() : '';
    return `
      <div class="log-entry">
        <span class="log-time">[${time}]</span>
        <span class="log-type">${escapeHtml(l.event_type)}</span>
        <span class="log-msg">${escapeHtml(l.details)}</span>
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

document.addEventListener('DOMContentLoaded', loadLabData);
