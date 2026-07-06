// ============================================================
// Gopher Slayer - Frontend Battle State Machine
// ============================================================
// HP state is managed client-side during battle.
// The server only calculates damage values.
// ============================================================

const API = '/api';

// ---- Global State ----
let hero = null;          // fetched from server
let currentStage = null;  // currently selected stage
let enemies = [];         // enemies for current stage
let enemyIndex = 0;       // which enemy we are fighting
let heroHP = 0;           // current hero HP (client-side, battle only)
let enemyHP = 0;          // current enemy HP (client-side, battle only)
let isBusy = false;       // prevent double-clicks during animation

// ---- Enemy image map (stage_id → image path) ----
const ENEMY_IMAGES = {
  1: '/images/gopher-enemies/gopher-psycho.png',
  2: '/images/gopher-enemies/gopher-zombie.png',
  3: '/images/gopher-enemies/gopher-ghost.png',
  4: '/images/gopher-enemies/gopher-demon.png',
  5: '/images/gopher-enemies/gopher-magma.png',
};

function enemyImage(stageId) {
  return ENEMY_IMAGES[stageId] || '/images/gopher-enemies/gopher-psycho.png';
}

// ---- Stage icons (stage order_num → icon path) ----
const STAGE_ICONS = {
  1: '/images/icons/stage-alert.png',
  2: '/images/icons/stage-xp.png',
  3: '/images/icons/stage-heart.png',
  4: '/images/icons/stage-clock.png',
  5: '/images/icons/stage-alert.png',
};

// ---- Help hints per stage ----
const STAGE_HINTS = {
  1: {
    lv: 'Lv1',
    title: 'FIX ATTACK FUNCTION',
    hint: 'internal/service/battle_service.go の calculateDamage() を修正してください。\n現在 return 0 になっており、攻撃ダメージが常に0です。',
  },
  2: {
    lv: 'Lv2',
    title: 'UPDATE PLAYER EXP',
    hint: 'internal/service/stage_service.go の ClearStage() を修正してください。\n経験値を計算していますが、heroRepo.UpdateExperience() を呼んでいないためDBに保存されません。',
  },
  3: {
    lv: 'Lv3',
    title: 'UPDATE PLAYER HP',
    hint: 'main.go にルート登録が必要です。\napi.PUT("/hero/hp", heroHandler.UpdateHP) を追加すると\nHP編集ボタンが使えるようになります。',
  },
  4: {
    lv: 'Lv4',
    title: 'DEBUG CLOCK BUG',
    hint: 'internal/service/battle_service.go の EnemyAttack() に怪しいコードがあります。\ntime.Sleep や ダメージの符号を確認してください。',
  },
  5: {
    lv: 'Lv5',
    title: 'UPDATE ENEMY STATS',
    hint: 'PUT /api/enemies/:id エンドポイントを自分で作成してください。\nrepository → service → handler → routing の順に実装します。',
  },
};

// ============================================================
// SERVER LOG
// ============================================================

// addServerLog writes to all visible server log panels.
function addServerLog(method, path, responseData) {
  const panels = ['server-log-content', 'server-log-battle', 'server-log-result'];
  const resText = JSON.stringify(responseData);

  panels.forEach(id => {
    const container = document.getElementById(id);
    if (!container) return;

    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML =
      `<span class="log-method">${method}</span> ` +
      `<span class="log-path">${path}</span>` +
      `<span class="log-res">&gt;&gt;&gt; ${resText}</span>`;
    container.prepend(entry);
  });
}

// ============================================================
// API Helpers
// ============================================================

async function apiFetch(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 404) {
    addServerLog(method, path, { error: '404 Not Found' });
    throw new Error('404');
  }
  const data = await res.json();
  if (!res.ok) {
    addServerLog(method, path, { error: data.error || `HTTP ${res.status}` });
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  addServerLog(method, path, data);
  return data;
}

// ============================================================
// Hero Status (Character Card)
// ============================================================

function updateCharCard(h) {
  document.getElementById('cc-name').textContent = h.name;
  document.getElementById('cc-lv').textContent = h.level;
  document.getElementById('cc-hp').textContent = h.hp;
  document.getElementById('cc-maxhp').textContent = h.max_hp;
  document.getElementById('cc-exp').textContent = h.experience;
  document.getElementById('cc-atk').textContent = h.attack;

  // Next stage threshold (rough estimate based on current EXP)
  const nextExp = getNextExpThreshold(h.experience);
  document.getElementById('cc-nextexp').textContent = nextExp;

  const pct = Math.max(0, (h.hp / h.max_hp) * 100);
  const fill = document.getElementById('cc-hp-fill');
  fill.style.width = pct + '%';
  fill.classList.toggle('low', pct < 30);
}

function getNextExpThreshold(exp) {
  const thresholds = [40, 100, 180, 300, 999];
  return thresholds.find(t => t > exp) || 999;
}

function updateHeroBattleHP() {
  const pct = Math.max(0, (heroHP / hero.max_hp) * 100);
  document.getElementById('hero-chp').textContent = `${heroHP}/${hero.max_hp}`;
  const fill = document.getElementById('hero-hp-fill');
  fill.style.width = pct + '%';
  fill.classList.toggle('low', pct < 30);
}

function updateEnemyHP() {
  const enemy = enemies[enemyIndex];
  const pct = Math.max(0, (enemyHP / enemy.max_hp) * 100);
  document.getElementById('enemy-chp').textContent = `${enemyHP}/${enemy.max_hp}`;
  const fill = document.getElementById('enemy-hp-fill');
  fill.style.width = pct + '%';
  fill.classList.toggle('low', pct < 30);
}

// ============================================================
// Screen Management
// ============================================================

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ============================================================
// Stage Select Screen
// ============================================================

async function goToStageSelect() {
  showScreen('stage-screen');
  await loadHeroAndStages();
}

async function loadHeroAndStages() {
  try {
    hero = await apiFetch('/hero');
    updateCharCard(hero);
    heroHP = hero.hp;

    const stages = await apiFetch('/stages');
    renderStageList(stages);
  } catch (e) {
    console.error('[loadHeroAndStages]', e);
    document.getElementById('stage-list').innerHTML =
      `<p style="color:#c03030;font-size:12px">Error: ${e.message}<br>サーバーが起動しているか確認してください。</p>`;
  }
}

function renderStageList(stages) {
  const container = document.getElementById('stage-list');
  container.innerHTML = '';

  stages.forEach(stage => {
    const card = document.createElement('div');
    card.className = 'stage-card' + (stage.is_unlocked ? '' : ' locked');

    const iconSrc = STAGE_ICONS[stage.order_num] || STAGE_ICONS[1];
    const hint = STAGE_HINTS[stage.order_num];
    const lvLabel = hint ? hint.lv : `Lv${stage.order_num}`;
    const taskTitle = hint ? hint.title : stage.name;

    card.innerHTML = `
      <img class="stage-icon" src="${iconSrc}" alt="" />
      <div class="stage-info">
        <div class="stage-lv">${lvLabel}</div>
        <div class="stage-name">${taskTitle}</div>
        <div class="stage-req">必要EXP: ${stage.required_experience}</div>
      </div>
      <div class="stage-arrow">${stage.is_unlocked ? '▶' : '🔒'}</div>
    `;

    if (stage.is_unlocked) {
      card.onclick = () => startBattle(stage);
    }
    container.appendChild(card);
  });
}

// ============================================================
// Battle Screen
// ============================================================

async function startBattle(stage) {
  currentStage = stage;
  enemies = await apiFetch(`/stages/${stage.id}/enemies`);
  enemyIndex = 0;
  heroHP = hero.hp;

  showScreen('battle-screen');
  loadCurrentEnemy();
  setDialog(`${enemies[0].name} が あらわれた！`);
}

function loadCurrentEnemy() {
  const enemy = enemies[enemyIndex];
  enemyHP = enemy.max_hp;

  document.getElementById('hero-cname').textContent = hero.name;
  document.getElementById('battle-lv').textContent = hero.level;
  updateHeroBattleHP();

  document.getElementById('enemy-sprite').src = enemyImage(currentStage.id);
  document.getElementById('enemy-cname').textContent = enemy.name;
  updateEnemyHP();

  setActionsEnabled(true);
}

// ---- Hero attacks ----
async function heroAttack() {
  if (isBusy) return;
  isBusy = true;
  setActionsEnabled(false);

  try {
    const result = await apiFetch('/battle/attack', {
      method: 'POST',
      body: JSON.stringify({ hero_attack: hero.attack }),
    });

    enemyHP = Math.max(0, enemyHP - result.damage);
    updateEnemyHP();
    setDialog(result.message);

    if (enemyHP <= 0) {
      await handleEnemyDefeated();
    } else {
      await sleep(700);
      await enemyAttack();
    }
  } catch (e) {
    setDialog(`エラー: ${e.message}`);
    setActionsEnabled(true);
  } finally {
    isBusy = false;
  }
}

// ---- Enemy attacks ----
async function enemyAttack() {
  const enemy = enemies[enemyIndex];
  try {
    const result = await apiFetch('/battle/enemy-attack', {
      method: 'POST',
      body: JSON.stringify({
        enemy_attack: enemy.attack,
        enemy_name: enemy.name,
      }),
    });

    heroHP = Math.max(0, heroHP - result.damage);
    updateHeroBattleHP();
    setDialog(result.message);

    if (heroHP <= 0) {
      await handleHeroDied();
    } else {
      setActionsEnabled(true);
    }
  } catch (e) {
    setDialog(`エラー: ${e.message}`);
    setActionsEnabled(true);
  }
}

// ---- Enemy defeated ----
async function handleEnemyDefeated() {
  const enemy = enemies[enemyIndex];
  setDialog(`${enemy.name} を たおした！`);
  await sleep(600);

  enemyIndex++;
  if (enemyIndex < enemies.length) {
    const next = enemies[enemyIndex];
    setDialog(`${next.name} が あらわれた！`);
    loadCurrentEnemy();
    isBusy = false;
    setActionsEnabled(true);
  } else {
    await clearStage();
  }
}

// ---- Clear stage ----
async function clearStage() {
  try {
    const result = await apiFetch(`/stages/${currentStage.id}/clear`, {
      method: 'POST',
    });

    setDialog(`${result.message} EXP +${result.experience_gained}`);
    await sleep(1500);

    hero = await apiFetch('/hero');
    showResultScreen(true, result);
  } catch (e) {
    setDialog(`エラー: ${e.message}`);
    setActionsEnabled(true);
  }
}

// ---- Hero died ----
async function handleHeroDied() {
  setDialog('やられてしまった…');
  setActionsEnabled(false);
  await sleep(1500);
  showResultScreen(false, null);
}

// ============================================================
// Result Screen
// ============================================================

function showResultScreen(isWin, clearResult) {
  showScreen('result-screen');
  const icon = document.getElementById('result-icon');
  const title = document.getElementById('result-title');
  const detail = document.getElementById('result-detail');

  if (isWin) {
    icon.textContent = '🏆';
    title.textContent = 'Victory!';
    title.className = 'result-title win';
    detail.innerHTML = `
      Stage: <strong>${currentStage.name}</strong><br>
      EXP獲得: <strong>+${clearResult.experience_gained}</strong><br>
      合計EXP: <strong>${clearResult.new_experience}</strong>
    `;
  } else {
    icon.textContent = '💀';
    title.textContent = 'Defeated...';
    title.className = 'result-title lose';
    detail.innerHTML = `
      <strong>${currentStage.name}</strong> でやられてしまった。<br>
      HPを回復してから再挑戦しよう！
    `;
  }
}

// ============================================================
// Help Modal
// ============================================================

function showHelp() {
  if (!currentStage) return;
  const hint = STAGE_HINTS[currentStage.order_num] || STAGE_HINTS[1];
  document.getElementById('modal-lv').textContent = hint.lv;
  document.getElementById('modal-title').textContent = hint.title;
  document.getElementById('modal-hint').textContent = hint.hint;
  document.getElementById('help-modal').style.display = 'flex';
}

function closeHelp(event) {
  if (event.target === document.getElementById('help-modal')) {
    document.getElementById('help-modal').style.display = 'none';
  }
}

function closeHelpBtn() {
  document.getElementById('help-modal').style.display = 'none';
}

// ============================================================
// HP Editor (Lv3 task: PUT /api/hero/hp must be implemented)
// ============================================================

function toggleHPEditor() {
  const editor = document.getElementById('hp-editor');
  const isVisible = editor.style.display !== 'none';
  editor.style.display = isVisible ? 'none' : 'flex';
  document.getElementById('hp-editor-msg').textContent = '';
  if (!isVisible && hero) {
    document.getElementById('hp-input').value = hero.max_hp;
  }
}

async function submitEditHP() {
  const hp = parseInt(document.getElementById('hp-input').value, 10);
  const msg = document.getElementById('hp-editor-msg');
  msg.className = 'hp-editor-msg';
  msg.textContent = '';

  if (!hp || hp <= 0) {
    msg.className = 'hp-editor-msg err';
    msg.textContent = 'HPは1以上の数値を入力してください';
    return;
  }

  try {
    await apiFetch('/hero/hp', {
      method: 'PUT',
      body: JSON.stringify({ hp }),
    });
    hero = await apiFetch('/hero');
    heroHP = hero.hp;
    updateCharCard(hero);
    msg.className = 'hp-editor-msg ok';
    msg.textContent = `HPを ${hp} に設定しました！`;
  } catch (e) {
    msg.className = 'hp-editor-msg err';
    if (e.message.includes('404') || e.message.includes('Not Found')) {
      msg.textContent = 'APIが見つかりません (404) — main.go にルートを追加してください！';
    } else {
      msg.textContent = `Error: ${e.message}`;
    }
  }
}

// ============================================================
// Utilities
// ============================================================

function setDialog(text) {
  document.getElementById('dialog-text').textContent = text;
}

function setActionsEnabled(enabled) {
  const btn = document.getElementById('btn-attack');
  if (btn) btn.disabled = !enabled;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// Server Log Panel Resize
// ============================================================

let _logFontSize = 10; // px

function changeLogFontSize(delta) {
  _logFontSize = Math.min(18, Math.max(8, _logFontSize + delta));
  document.querySelectorAll('.log-entry').forEach(el => {
    el.style.fontSize = _logFontSize + 'px';
  });
  // 新規エントリにも適用されるようCSS変数を更新
  document.documentElement.style.setProperty('--log-font-size', _logFontSize + 'px');
}

let _resizing = false;
let _resizeHandle = null;

function startLogResize(e) {
  _resizing = true;
  _resizeHandle = e.currentTarget;
  _resizeHandle.classList.add('dragging');
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
  e.preventDefault();
}

document.addEventListener('mousemove', e => {
  if (!_resizing || !_resizeHandle) return;
  const panel = _resizeHandle.closest('.server-log-panel');
  const newWidth = panel.getBoundingClientRect().right - e.clientX;
  const clamped = Math.min(480, Math.max(120, newWidth));
  // Apply to all server-log-panels simultaneously
  document.querySelectorAll('.server-log-panel').forEach(p => {
    p.style.width = clamped + 'px';
  });
});

document.addEventListener('mouseup', () => {
  if (!_resizing) return;
  _resizing = false;
  if (_resizeHandle) _resizeHandle.classList.remove('dragging');
  _resizeHandle = null;
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
});

// ============================================================
// Init
// ============================================================
window.onload = () => goToStageSelect();
