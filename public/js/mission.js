// Cyberflex Security Missions Lab — Dedicated Mission Workspace Client Script

let currentMission = null;

async function initMissionWorkspace() {
  const params = new URLSearchParams(window.location.search);
  const missionId = params.get('id') || '01';
  await fetchMissionDetails(missionId);
}

async function fetchMissionDetails(id) {
  try {
    const res = await fetch(`/api/lab/missions/${id}`);
    const data = await res.json();
    if (!data.success) {
      document.getElementById('workspace-container').innerHTML = `
        <div class="alert alert-danger">Error: ${data.error || 'Mission not found'}</div>
      `;
      return;
    }

    currentMission = data.mission;
    renderMissionUI(currentMission);
  } catch (err) {
    console.error('Failed to load mission details:', err);
  }
}

function renderMissionUI(m) {
  document.getElementById('mission-code-display').textContent = m.code;
  document.getElementById('mission-title-display').textContent = m.title;
  document.getElementById('mission-level-display').textContent = `Level ${m.level}`;
  document.getElementById('mission-diff-display').textContent = m.difficulty;
  document.getElementById('mission-time-display').textContent = m.estimated_time;
  document.getElementById('mission-points-display').textContent = `${m.points} Points`;
  document.getElementById('mission-topic-display').textContent = m.topic;

  document.getElementById('scenario-text').textContent = m.scenario;
  document.getElementById('target-endpoint-link').textContent = m.target_endpoint;
  document.getElementById('target-endpoint-link').href = m.target_endpoint;
  document.getElementById('scope-text').textContent = m.scope;
  document.getElementById('rules-text').textContent = m.rules;

  // Status badge
  const statusElem = document.getElementById('mission-status-pill');
  if (m.status === 'completed') {
    statusElem.className = 'badge badge-success';
    statusElem.textContent = '✓ COMPLETED';
    document.getElementById('completion-banner').style.display = 'block';
    document.getElementById('awarded-points-val').textContent = m.points_awarded || m.points;
  } else {
    statusElem.className = 'badge badge-primary';
    statusElem.textContent = 'ACTIVE IN SCOPE';
    document.getElementById('completion-banner').style.display = 'none';
  }

  // Render Objectives
  const objContainer = document.getElementById('objectives-list');
  objContainer.innerHTML = (m.objectives || []).map((obj, i) => `
    <li class="objective-item">
      <input type="checkbox" id="obj-${i}" class="obj-checkbox">
      <label for="obj-${i}">${escapeHtml(obj)}</label>
    </li>
  `).join('');

  // Render Hints
  renderHints(m);
}

function renderHints(m) {
  const container = document.getElementById('hints-container');
  const unlocked = m.unlocked_hints || [];
  const hintsUsed = m.hints_used || 0;

  const hintMetadata = [
    { level: 1, cost: 10, title: 'Hint 1 — Analytical Direction' },
    { level: 2, cost: 15, title: 'Hint 2 — Technical Observation' },
    { level: 3, cost: 25, title: 'Hint 3 — Vulnerability Specifics' }
  ];

  container.innerHTML = hintMetadata.map(h => {
    const isUnlocked = hintsUsed >= h.level;
    const unlockedObj = unlocked.find(u => u.level === h.level);

    if (isUnlocked) {
      return `
        <div class="hint-item">
          <div class="hint-header" style="background-color: var(--success-light); color: #065f46;">
            <span>💡 ${h.title} (Unlocked)</span>
            <span class="badge badge-success">Active</span>
          </div>
          <div class="hint-content">
            ${escapeHtml(unlockedObj ? unlockedObj.text : 'Hint content unlocked.')}
          </div>
        </div>
      `;
    } else {
      const isNextToUnlock = (hintsUsed + 1 === h.level);
      return `
        <div class="hint-item">
          <div class="hint-header">
            <span>🔒 ${h.title}</span>
            ${isNextToUnlock
              ? `<button onclick="unlockNextHint('${m.id}', ${h.cost})" class="btn btn-outline-primary btn-sm">Unlock (-${h.cost} pts)</button>`
              : `<span class="badge badge-neutral">Locked</span>`}
          </div>
        </div>
      `;
    }
  }).join('');
}

async function unlockNextHint(missionId, cost) {
  if (!confirm(`Unlocking this hint will deduct ${cost} points from your score. Do you want to proceed?`)) {
    return;
  }

  try {
    const res = await fetch(`/api/lab/missions/${missionId}/hint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (data.success) {
      await fetchMissionDetails(missionId);
    } else {
      alert(data.error || 'Failed to unlock hint');
    }
  } catch (err) {
    console.error('Error unlocking hint:', err);
  }
}

async function handleFlagSubmit(e) {
  if (e) e.preventDefault();
  const input = document.getElementById('flag-input');
  const flag = input.value.trim();
  const feedbackBox = document.getElementById('flag-feedback');

  if (!flag) {
    feedbackBox.className = 'alert alert-warning';
    feedbackBox.textContent = 'Please enter a flag before submitting.';
    feedbackBox.style.display = 'block';
    return;
  }

  feedbackBox.className = 'alert alert-info';
  feedbackBox.textContent = 'Validating flag...';
  feedbackBox.style.display = 'block';

  try {
    const res = await fetch(`/api/lab/missions/${currentMission.id}/flag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flag })
    });

    const data = await res.json();

    if (data.isCorrect) {
      feedbackBox.className = 'alert alert-success';
      feedbackBox.innerHTML = `
        <strong>MISSION COMPLETE!</strong> Flag accepted.
        Awarded <strong>${data.pointsAwarded} points</strong>!
      `;
      await fetchMissionDetails(currentMission.id);
    } else {
      feedbackBox.className = 'alert alert-danger';
      feedbackBox.textContent = data.error || 'Incorrect flag. Inspect the application and try again.';
    }
  } catch (err) {
    feedbackBox.className = 'alert alert-danger';
    feedbackBox.textContent = 'Network or server error submitting flag.';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

document.addEventListener('DOMContentLoaded', initMissionWorkspace);
