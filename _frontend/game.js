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

// ---- Go 経験者向けチャレンジ（ステージ5クリア後に表示）----
// type: 'stage' → ステージセクションに表示、'task' → タスクセクションに表示
const ADVANCED_CHALLENGES = [
  {
    lv: 'Lv6',
    title: '封印を並列に解いてボスと戦う',
    hint: '症状: このカードをクリックすると封印解除を試みます。\n5秒後に失敗したら、pkg/server/service/seal.go の BreakAllSeals を goroutine + sync.WaitGroup で並列化しよう。',
    action: 'challenge',
    type: 'stage',
  },
  {
    lv: 'Lv8',
    title: 'ゴブリンの群れを一掃せよ',
    hint: '症状: 100体の群れを同時討伐すると、討伐数の記録がズレる。\npkg/server/service/horde.go の SlayHorde にデータ競合（Race Condition）がある。\ngo test -race ./... で検出し、sync.Mutex でカウンタを守ろう。',
    action: 'horde',
    type: 'stage',
  },
  {
    lv: 'Lv9',
    title: '倒した敵の怨念を祓え',
    hint: '症状: 戦うほどサーバーのメモリが増え続け、怨念が祓えない。\npkg/server/service/battle.go でグローバル変数に参照が残り、GCがメモリを回収できない（メモリリーク）。\nGET /api/debug/memory や GODEBUG=gctrace=1 で観測して直そう。',
    action: 'grudge',
    type: 'stage',
  },
  {
    lv: 'Lv10',
    title: '幻のステージの番人',
    hint: '症状: 存在しないステージに挑むとサーバーで panic が起きる。\npkg/server/repository/stage.go の GetByID がエラーを握りつぶして nil を返している。\nエラーを正しく返して nil ポインタ参照を防ごう。',
    action: 'phantom',
    type: 'stage',
  },
  {
    lv: 'Lv11',
    title: 'ボスの詠唱を中断せよ',
    hint: '症状: 詠唱中断を試みると10秒間固まって間に合わない。\npkg/server/service/spell.go の InterruptCast が詠唱channelをただ待っている。\nselect + time.After で2秒タイムアウトさせよう。',
    action: 'interrupt',
    type: 'stage',
  },
  {
    lv: 'Lv16',
    title: 'ギルドの依頼を同時にこなせ',
    hint: '症状: 3つの依頼調査が1件ずつ直列に走り、ギルドの受付時間（2秒）に間に合わない。\npkg/server/service/quest.go の GatherQuestReports を golang.org/x/sync/errgroup で並列化しよう。\n\n事前に: go get golang.org/x/sync/errgroup',
    action: 'quest',
    type: 'stage',
  },
  {
    lv: 'Lv17',
    title: '悪霊の門を閉じろ',
    hint: '症状: 敵の攻撃のたびに悪霊（goroutine）が増え続ける。\npkg/server/service/battle.go の summonSpirit が閉じない channel を永遠に待つ goroutine を起動している（goroutineリーク）。\nGET /api/debug/memory の num_goroutine で観測して直そう。',
    action: 'spirit',
    type: 'stage',
  },
  {
    lv: 'Lv18',
    title: '呪いの爆弾を解除せよ',
    hint: '症状: 解除を試みると1秒後にサーバーごと落ちる。\ngoroutine の中の panic は Echo の Recover では拾えない。\npkg/server/service/curse.go の goroutine の先頭に defer + recover() を仕込もう。',
    action: 'curse',
    type: 'stage',
  },
  {
    lv: 'Lv7',
    title: 'テストを書いてバグを見つける',
    hint: '症状: ボスドラゴンの攻撃を受けてもHPが1残って死なない。\n\npkg/server/service/battle_test.go にテストケースを追加して ApplyDamage のバグを発見しよう。\n\nコマンド:\ngo test ./pkg/server/service/ -run TestApplyDamage -v',
    action: null,
    type: 'task',
  },
  {
    lv: 'Lv12',
    title: '戦場からの安全な撤退',
    hint: '症状: Ctrl+C でサーバーを止めると、処理中のリクエストが強制切断され冒険者が戦場に取り残される。\n\ncmd/main.go に signal.Notify と e.Shutdown(ctx) を実装して Graceful Shutdown（安全な撤退）を実現しよう。\n\n確認: 時間のかかるAPIを処理中に Ctrl+C しても、レスポンスが返ってから終了すればOK。',
    action: null,
    type: 'task',
  },
  {
    lv: 'Lv13',
    title: '戦闘レポートを高速化せよ',
    hint: '症状: 戦闘レポートの生成が遅い。\n\npkg/server/service/battle.go の BuildBattleReport が文字列の += 連結を使っている。\nまずベンチマークで現状を計測し、strings.Builder に書き換えて B/op を減らそう。\n\nコマンド:\ngo test ./pkg/server/service/ -bench BuildBattleReport -benchmem',
    action: null,
    type: 'task',
  },
  {
    lv: 'Lv14',
    title: '冒険の記録を整えよ',
    hint: '症状: サーバーログが log.Printf のテキスト形式で、集計・検索ができない。\n\ncmd/main.go と pkg/db/conn.go の log.Printf / log.Println / log.Fatal を、Go 1.21 標準の log/slog による構造化ログに置き換えよう。',
    action: null,
    type: 'task',
  },
  {
    lv: 'Lv15',
    title: '時空の歪みを断ち切れ',
    hint: '症状: プレイヤーが画面を閉じても、サーバーはDBクエリを実行し続けている。\n\nhandler → service → repository の全層に context.Context を第1引数で伝播させ、QueryRow を QueryRowContext に、Exec を ExecContext に置き換えよう（最難関）。\n\nhandler では c.Request().Context() から ctx を取り出せる。',
    action: null,
    type: 'task',
  },
  {
    lv: 'Lv19',
    title: '古文書の解読は一度だけ',
    hint: '症状: ステージ選択画面を開くたびに「言い伝え」の表示が遅い（毎回800ms）。\n\npkg/server/service/ancient.go の DecodeAncientText が呼ばれるたびに解読し直している。\nsync.Once で最初の1回だけ解読するようにしよう。\n\n確認: time curl http://localhost:8080/api/legend を2回叩き、2回目が一瞬で返ればOK。',
    action: null,
    type: 'task',
  },
  {
    lv: 'Lv20',
    title: 'クリティカルの乱数を現代化せよ',
    hint: '症状: サーバーを再起動するたび、クリティカル（会心の一撃）が全く同じ順番で出る（予測可能＝チート可能）。\n\npkg/server/service/battle.go の RollCritical が古い math/rand を固定シードで使っている。\nGo 1.22 の math/rand/v2 に移行しよう（自動シードなので Seed 不要、rand.IntN(4) == 0 と書ける）。',
    action: null,
    type: 'task',
  },
  {
    lv: 'Lv21',
    title: '二つの関数を一つに束ねよ',
    hint: '症状: pkg/server/service/mathutil.go に、型が違うだけのほぼ同じ関数（MaxInt / MaxFloat64）が2つある。\n\nジェネリクス（型パラメータ）と cmp.Ordered で Max[T cmp.Ordered](a, b T) T の1つにまとめ、mathutil_test.go も書き換えよう。\n\nコマンド:\ngo test ./pkg/server/service/ -run TestMax -v',
    action: null,
    type: 'task',
  },
  {
    lv: 'Lv22',
    title: '手書きループを標準の剣で斬れ',
    hint: '症状: pkg/server/service/ranking.go に手書きのバブルソートと検索ループがある。\n\nGo 1.21 標準の slices.SortFunc（+ cmp.Compare）と slices.ContainsFunc に置き換えよう。\n既存のテストがそのまま通れば成功。\n\nコマンド:\ngo test ./pkg/server/service/ -run "TestSortEnemiesByAttack|TestHasBoss" -v',
    action: null,
    type: 'task',
  },
  {
    lv: 'Lv23',
    title: '時間停止の魔法でテストせよ',
    hint: '症状: 詠唱中断（Lv11）のテストは実時間で2〜10秒かかる。\n\nGo 1.25 の testing/synctest を使うと仮想時間で一瞬で終わる。\npkg/server/service/spell_test.go の Skip を外して実行すると deadlock になり、synctest が「詠唱goroutineのリーク」を暴いてくれる。castSpell の channel をバッファ付きにして直そう。\n\n※ Lv11 を先に修正しておくこと。',
    action: null,
    type: 'task',
  },
  {
    lv: 'Lv24',
    title: '酒場の席数を最適化せよ',
    hint: '症状: DBコネクションプールが未設定（接続数無制限）で、負荷をかけると接続が増え放題になる。\n\npkg/db/conn.go に SetMaxOpenConns / SetMaxIdleConns / SetConnMaxLifetime を設定しよう。\n\n観測: GET /api/debug/db で open_connections や wait_count の変化を見る。',
    action: null,
    type: 'task',
  },
  {
    lv: 'Lv25',
    title: '伝説の単一バイナリ',
    hint: '症状: go build したバイナリを別の場所で実行すると、ゲーム画面が表示されない（_frontend をディスクから読んでいるため）。\n\ngo:embed で _frontend をバイナリに埋め込もう。\n1. リポジトリ直下に frontend_embed.go を作り //go:embed all:_frontend で埋め込む\n2. pkg/server/server.go の e.Static を e.StaticFS + echo.MustSubFS に置き換える\n\n確認: go build -o /tmp/server ./cmd して別ディレクトリから起動してもゲームが遊べればOK。',
    action: null,
    type: 'task',
  },
];

// ---- Help hints per stage ----
const STAGE_HINTS = {
  1: {
    lv: 'Lv1',
    title: 'ダメージ計算を修正しよう',
    hint: 'pkg/server/service/battle.go の CalculateDamage() を修正してください。\n現在 return 0 になっており、攻撃ダメージが常に0です。',
  },
  2: {
    lv: 'Lv2',
    title: '経験値をDBに保存しよう',
    hint: 'pkg/server/handler/stage.go の ClearStage() を修正してください。\n経験値を計算していますが、h.heroRepo.UpdateExperience() を呼んでいないためDBに保存されません。',
  },
  3: {
    lv: 'Lv3',
    title: 'HP更新のルートを追加しよう',
    hint: 'pkg/server/handler/setting.go にルート登録が必要です。\napi.PUT("/hero/hp", hero.UpdateHP) を追加すると\nHP編集ボタンが使えるようになります。',
  },
  4: {
    lv: 'Lv4',
    title: '攻撃が反転するバグを修正しよう',
    hint: 'pkg/server/handler/battle.go の Attack() に怪しいコードがあります。\n特定の敵に対してダメージが反転しています。',
  },
  5: {
    lv: 'Lv5',
    title: 'ボスの攻撃が遅い原因を探ろう',
    hint: 'ボスドラゴンの攻撃だけなぜか遅いのはなぜ？\npkg/server/service/battle.go と handler/battle.go の両方を確認してください。',
  },
};

// ============================================================
// SERVER LOG
// ============================================================

// addServerLog writes to all visible server log panels.
function addServerLog(method, path, responseData) {
  const panels = ['server-log-content', 'server-log-battle', 'server-log-result', 'server-log-challenge'];
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
  document.getElementById('cc-exp').textContent = h.experience;
  document.getElementById('cc-atk').textContent = h.attack;

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
  document.getElementById('hero-chp').textContent = heroHP;
  const fill = document.getElementById('hero-hp-fill');
  fill.style.width = pct + '%';
  fill.classList.toggle('low', pct < 30);
}

function updateEnemyHP() {
  const enemy = enemies[enemyIndex];
  const pct = Math.max(0, (enemyHP / enemy.max_hp) * 100);
  document.getElementById('enemy-chp').textContent = enemyHP;
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
  loadLegend(); // 古文書の言い伝えを読み込む（Lv19: 毎回800msかかるのが症状）
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

// 古文書の言い伝えを取得して表示する（Lv19用）
async function loadLegend() {
  const el = document.getElementById('legend-line');
  if (!el) return;
  el.textContent = '古文書を解読中……';
  try {
    const data = await apiFetch('/legend');
    el.textContent = '言い伝え: ' + data.legend;
  } catch (e) {
    el.textContent = '古文書は読めなかった…';
  }
}

function makeSectionHeader(label, cssClass) {
  const el = document.createElement('div');
  el.className = 'section-header ' + cssClass;
  el.textContent = label;
  return el;
}

function renderStageList(stages) {
  const container = document.getElementById('stage-list');
  container.innerHTML = '';

  const cleared = hero && hero.experience >= 500;

  // ---- ステージ section ----
  container.appendChild(makeSectionHeader('ステージ', 'stage-section-header'));

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

  // Lv6 は type:'stage' なのでステージセクションに続けて表示
  ADVANCED_CHALLENGES.filter(c => c.type === 'stage').forEach(item => {
    const card = document.createElement('div');
    card.className = 'stage-card' + (cleared ? '' : ' locked');
    card.innerHTML = `
      <img class="stage-icon" src="/images/icons/stage-alert.png" alt="" />
      <div class="stage-info">
        <div class="stage-lv">${item.lv}</div>
        <div class="stage-name">${item.title}</div>
        <div class="stage-req">必要EXP: 500</div>
      </div>
      <div class="stage-arrow">${cleared ? '▶' : '🔒'}</div>
    `;
    if (cleared) {
      card.onclick = () => runChallenge(item);
    }
    container.appendChild(card);
  });

  // ---- タスク section ----
  container.appendChild(makeSectionHeader('タスク', 'task-section-header'));

  ADVANCED_CHALLENGES.filter(c => c.type === 'task').forEach(item => {
    const card = document.createElement('div');
    card.className = 'task-card' + (cleared ? '' : ' locked');
    card.innerHTML = `
      <img class="stage-icon" src="/images/icons/training-book.png" alt="" />
      <div class="stage-info">
        <div class="stage-lv">${item.lv}</div>
        <div class="stage-name">${item.title}</div>
        <div class="stage-req">必要EXP: 500</div>
      </div>
      <div class="stage-arrow">${cleared ? '？' : '🔒'}</div>
    `;
    if (cleared) {
      card.onclick = () => showAdvancedHint(item);
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
  const enemy = enemies[enemyIndex]
  if (isBusy) return;
  isBusy = true;
  setActionsEnabled(false);

  try {
    const result = await apiFetch('/battle/attack', {
      method: 'POST',
      body: JSON.stringify({ hero_attack: hero.attack, enemy_name: enemy.name }),
    });

    enemyHP = Math.max(0, enemyHP - result.damage);
    updateEnemyHP();
    setDialog(result.message);
    updateServerMem(); // Lv9: 戦うたびにサーバーメモリ表示を更新（増え続けたら怪しい）

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
        hero_hp: heroHP,
      }),
    });

    heroHP = result.new_hero_hp;
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
    title.textContent = 'クリア！';
    title.className = 'result-title win';
    detail.innerHTML = `
      Stage: <strong>${currentStage.name}</strong><br>
      EXP獲得: <strong>+${clearResult.experience_gained}</strong><br>
      合計EXP: <strong>${clearResult.new_experience}</strong>
    `;
  } else {
    icon.textContent = '💀';
    title.textContent = 'やられた...';
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

const SEAL_NAMES = ['炎の封印', '水の封印', '風の封印', '大地の封印', '闇の封印'];

// ---- チャレンジ画面の共通ヘルパー ----

// アクション名 → チャレンジ関数の対応表
function runChallenge(item) {
  const actions = {
    challenge: tryChallenge,
    horde: tryHordeChallenge,
    grudge: tryGrudgeChallenge,
    phantom: tryPhantomChallenge,
    interrupt: tryInterruptChallenge,
    quest: tryQuestChallenge,
    spirit: trySpiritChallenge,
    curse: tryCurseChallenge,
  };
  const fn = actions[item.action];
  if (fn) fn(item);
  else showAdvancedHint(item);
}

// チャレンジ画面を開いて初期化し、進捗リストのコンテナを返す
function openChallengeScreen(header, condition, dialogText) {
  showScreen('challenge-screen');
  document.getElementById('challenge-header').textContent = header;
  document.getElementById('challenge-condition').innerHTML = condition;
  document.getElementById('challenge-dialog').textContent = dialogText;
  document.getElementById('challenge-back-btn').disabled = true;
  const listEl = document.getElementById('seal-list');
  listEl.innerHTML = '';
  return listEl;
}

// 進捗リストに1行追加する
function addChallengeRow(listEl, label, status) {
  const el = document.createElement('div');
  el.className = 'seal-item pending';
  el.innerHTML = `<span>${label}</span><span class="seal-status">${status}</span>`;
  listEl.appendChild(el);
  return el;
}

// 進捗行の状態を更新する（state: 'done' | 'failed' | null）
function setChallengeRow(el, state, statusText) {
  el.classList.remove('pending', 'done', 'failed');
  if (state) el.classList.add(state);
  el.querySelector('.seal-status').textContent = statusText;
}

// チャレンジを終了してダイアログを更新する
function finishChallenge(message) {
  document.getElementById('challenge-dialog').textContent = message;
  document.getElementById('challenge-back-btn').disabled = false;
}

async function tryChallenge(item) {
  // チャレンジ画面に遷移
  const sealListEl = openChallengeScreen(
    '封印解除チャレンジ',
    '5つの封印を <strong>3秒以内</strong> にすべて解け',
    '封印を解いています...'
  );

  // 封印リストを初期化（全て「解除中...」＋点滅アニメーション）
  SEAL_NAMES.forEach(name => addChallengeRow(sealListEl, name, '解除中...'));

  // 経過秒数カウンター
  const dialogEl = document.getElementById('challenge-dialog');
  let elapsed = 0;
  const timer = setInterval(() => {
    elapsed++;
    dialogEl.textContent = `封印を解いています... ${elapsed}秒`;
  }, 1000);

  // フロント側タイムアウト（6秒で中断）
  const controller = new AbortController();
  const abort = setTimeout(() => controller.abort(), 6000);

  try {
    const result = await apiFetch('/stages/5/challenge', { method: 'POST', signal: controller.signal });
    clearTimeout(abort);
    clearInterval(timer);

    // 成功: アニメーションを止めて1つずつ「解いた！」に更新
    const items = sealListEl.querySelectorAll('.seal-item');
    for (let i = 0; i < items.length; i++) {
      await sleep(150);
      items[i].classList.remove('pending');
      items[i].classList.add('done');
      items[i].querySelector('.seal-status').textContent = '解いた！';
    }
    document.getElementById('challenge-dialog').textContent = result.message || 'すべての封印を解いた！ボスドラゴンに挑もう！';

  } catch (e) {
    clearTimeout(abort);
    clearInterval(timer);
    // 失敗: アニメーションを止めて全封印を「失敗」に
    sealListEl.querySelectorAll('.seal-item').forEach(el => {
      el.classList.remove('pending');
      el.classList.add('failed');
      el.querySelector('.seal-status').textContent = '失敗';
    });
    document.getElementById('challenge-dialog').textContent =
      '封印解除に失敗！pkg/server/service/seal.go の BreakAllSeals を goroutine + sync.WaitGroup で並列化しよう。';
  }

  document.getElementById('challenge-back-btn').disabled = false;
}

// ---- Lv8: ゴブリンの群れ討伐（Race Condition）----
async function tryHordeChallenge(item) {
  const listEl = openChallengeScreen(
    'ゴブリンの群れ討伐',
    '100体の群れを同時討伐し、討伐数を <strong>正確に記録</strong> せよ',
    '群れに突撃した…！'
  );
  const row = addChallengeRow(listEl, '討伐数の記録', '討伐中...');

  try {
    const result = await apiFetch('/battle/horde', { method: 'POST' });
    if (result.slain === result.total) {
      setChallengeRow(row, 'done', `${result.slain}/${result.total}`);
      finishChallenge(`${result.message} 記録は完璧だ！`);
    } else {
      setChallengeRow(row, 'failed', `${result.slain}/${result.total}`);
      finishChallenge(
        `${result.message} pkg/server/service/horde.go の SlayHorde にデータ競合がある。go test -race ./... で検出し、sync.Mutex で直そう。`
      );
    }
  } catch (e) {
    setChallengeRow(row, 'failed', 'エラー');
    finishChallenge(`エラー: ${e.message}`);
  }
}

// ---- Lv9: 怨念祓いの儀式（GC・メモリリーク）----
async function tryGrudgeChallenge(item) {
  const listEl = openChallengeScreen(
    '怨念祓いの儀式',
    '20連戦のあと、サーバーのメモリが <strong>50MB未満</strong> なら怨念は祓われる',
    '倒した敵の魂を鎮めている…'
  );
  const battleRow = addChallengeRow(listEl, '20連戦', '0/20');
  const memRow = addChallengeRow(listEl, 'サーバーメモリ', '計測待ち...');

  try {
    // 20連戦して怨念（メモリ）の溜まり方を観測する
    for (let i = 1; i <= 20; i++) {
      await apiFetch('/battle/attack', {
        method: 'POST',
        body: JSON.stringify({ hero_attack: hero ? hero.attack : 15, enemy_name: 'さまよえる魂' }),
      });
      battleRow.querySelector('.seal-status').textContent = `${i}/20`;
    }
    setChallengeRow(battleRow, 'done', '20/20');

    const mem = await apiFetch('/debug/memory');
    if (mem.heap_alloc_mb < 50) {
      setChallengeRow(memRow, 'done', `${mem.heap_alloc_mb} MB`);
      finishChallenge(`怨念は消え去った！（メモリ ${mem.heap_alloc_mb}MB / GC実行 ${mem.num_gc}回）`);
    } else {
      setChallengeRow(memRow, 'failed', `${mem.heap_alloc_mb} MB`);
      finishChallenge(
        `怨念が ${mem.heap_alloc_mb}MB も溜まっている…祓えない！pkg/server/service/battle.go でグローバル変数に参照が残り、GCが回収できない。リークを直してサーバーを再起動しよう。`
      );
    }
  } catch (e) {
    setChallengeRow(memRow, 'failed', 'エラー');
    finishChallenge(`エラー: ${e.message}`);
  }
}

// ---- Lv10: 幻のステージの番人（nil ポインタ panic）----
async function tryPhantomChallenge(item) {
  const listEl = openChallengeScreen(
    '幻のステージ',
    '存在しないステージに挑んでも、サーバーは <strong>正しくエラーを返す</strong> こと',
    '幻のステージの扉を開く…'
  );
  const row = addChallengeRow(listEl, '番人の反応', '確認中...');

  try {
    await apiFetch('/stages/999/clear', { method: 'POST' });
    // 存在しないステージがクリアできてしまうのは想定外
    setChallengeRow(row, 'failed', '異常');
    finishChallenge('存在しないステージがクリアできてしまった…？サーバーの実装を確認しよう。');
  } catch (e) {
    if (e.message.includes('ステージが見つかりません')) {
      setChallengeRow(row, 'done', '正常なエラー');
      finishChallenge('番人は静かに首を振った。「そのステージはまだ存在しない」——サーバーは正しくエラーを返した！');
    } else {
      setChallengeRow(row, 'failed', 'panic!');
      finishChallenge(
        `番人の呪いでサーバーが混乱した！（panic発生: ${e.message}）pkg/server/repository/stage.go の GetByID がエラーを握りつぶして nil を返している。サーバーログのスタックトレースも見てみよう。`
      );
    }
  }
}

// ---- Lv11: 詠唱中断（channel / select）----
async function tryInterruptChallenge(item) {
  const listEl = openChallengeScreen(
    '詠唱中断',
    'ボスの詠唱（10秒）が完了する前に <strong>2秒以内</strong> で中断せよ',
    'ボスが詠唱を始めた…！'
  );
  const row = addChallengeRow(listEl, '詠唱の中断', '試行中...');

  // 経過秒数カウンター
  const dialogEl = document.getElementById('challenge-dialog');
  let elapsed = 0;
  const timer = setInterval(() => {
    elapsed++;
    dialogEl.textContent = `ボスが詠唱を続けている… ${elapsed}秒`;
  }, 1000);

  // フロント側タイムアウト（6秒で中断）
  const controller = new AbortController();
  const abort = setTimeout(() => controller.abort(), 6000);

  try {
    const result = await apiFetch('/battle/interrupt', { method: 'POST', signal: controller.signal });
    clearTimeout(abort);
    clearInterval(timer);
    if (result.interrupted) {
      setChallengeRow(row, 'done', '成功！');
      finishChallenge(result.message);
    } else {
      setChallengeRow(row, 'failed', '失敗');
      finishChallenge(`${result.message} pkg/server/service/spell.go の InterruptCast を select + time.After で直そう。`);
    }
  } catch (e) {
    clearTimeout(abort);
    clearInterval(timer);
    setChallengeRow(row, 'failed', '応答なし');
    finishChallenge(
      '詠唱を止められなかった…（サーバーが固まっている）pkg/server/service/spell.go の InterruptCast が詠唱channelをただ待っている。select + time.After で2秒タイムアウトさせよう。'
    );
  }
}

// ---- Lv16: ギルドの依頼調査（errgroup 並列化）----
const QUEST_NAMES = ['魔物の生息調査', '薬草の在庫確認', '地図の作成'];

async function tryQuestChallenge(item) {
  const listEl = openChallengeScreen(
    'ギルドの依頼調査',
    '3つの依頼を <strong>2秒以内</strong> にすべて調査せよ',
    '調査隊が出発した…'
  );
  const rows = QUEST_NAMES.map(name => addChallengeRow(listEl, name, '調査中...'));

  // フロント側タイムアウト（6秒で中断）
  const controller = new AbortController();
  const abort = setTimeout(() => controller.abort(), 6000);

  try {
    const result = await apiFetch('/quests/gather', { method: 'POST', signal: controller.signal });
    clearTimeout(abort);
    for (let i = 0; i < rows.length; i++) {
      await sleep(150);
      setChallengeRow(rows[i], 'done', '完了！');
    }
    finishChallenge(result.message);
  } catch (e) {
    clearTimeout(abort);
    rows.forEach(r => setChallengeRow(r, 'failed', '間に合わず'));
    finishChallenge(
      '受付が閉まってしまった…！pkg/server/service/quest.go の GatherQuestReports を errgroup で並列化しよう（go get golang.org/x/sync/errgroup）。'
    );
  }
}

// ---- Lv17: 悪霊の門（goroutineリーク）----
async function trySpiritChallenge(item) {
  const listEl = openChallengeScreen(
    '悪霊の門',
    '30連戦しても悪霊（goroutine）が <strong>漏れ出さない</strong> こと',
    '門の様子を観察している…'
  );
  const battleRow = addChallengeRow(listEl, '30連戦', '0/30');
  const spiritRow = addChallengeRow(listEl, '漏れ出した悪霊(goroutine)', '計測待ち...');

  try {
    const before = await apiFetch('/debug/memory');

    for (let i = 1; i <= 30; i++) {
      await apiFetch('/battle/enemy-attack', {
        method: 'POST',
        body: JSON.stringify({ enemy_attack: 0, enemy_name: 'さまよえる悪霊', hero_hp: 100 }),
      });
      battleRow.querySelector('.seal-status').textContent = `${i}/30`;
    }
    setChallengeRow(battleRow, 'done', '30/30');

    const after = await apiFetch('/debug/memory');
    const leaked = after.num_goroutine - before.num_goroutine;
    if (leaked < 10) {
      setChallengeRow(spiritRow, 'done', `+${leaked} 体`);
      finishChallenge(`門は固く閉ざされている！悪霊は漏れていない（goroutine ${after.num_goroutine}体で安定）`);
    } else {
      setChallengeRow(spiritRow, 'failed', `+${leaked} 体`);
      finishChallenge(
        `悪霊が ${leaked}体も漏れ出した！（goroutine数: ${before.num_goroutine} → ${after.num_goroutine}）pkg/server/service/battle.go の summonSpirit が閉じない channel を待つ goroutine を増やし続けている。`
      );
    }
  } catch (e) {
    setChallengeRow(spiritRow, 'failed', 'エラー');
    finishChallenge(`エラー: ${e.message}`);
  }
}

// ---- Lv18: 呪いの爆弾（goroutine内panic + recover）----
async function tryCurseChallenge(item) {
  const listEl = openChallengeScreen(
    '呪いの爆弾',
    '爆弾を解除しても、サーバーが <strong>生きている</strong> こと',
    '爆弾の解除を試みる…'
  );
  const row = addChallengeRow(listEl, 'サーバーの生存確認', '解除中...');

  try {
    await apiFetch('/battle/defuse', { method: 'POST' });
    document.getElementById('challenge-dialog').textContent = '1秒後に何かが起こる……';
    await sleep(2500);

    // サーバーがまだ生きているか確認する
    const res = await fetch(API + '/hero');
    if (res.ok) {
      setChallengeRow(row, 'done', '生存！');
      finishChallenge('爆発を受け止めた！サーバーは無事だ！');
    } else {
      throw new Error('HTTP ' + res.status);
    }
  } catch (e) {
    setChallengeRow(row, 'failed', '死亡…');
    finishChallenge(
      'サーバーごと爆発した！！（make dev の air が自動で再起動してくれる）goroutine の中の panic は Echo の Recover では拾えない。pkg/server/service/curse.go の goroutine の先頭に defer + recover() を仕込もう。'
    );
  }
}

function showAdvancedHint(item) {
  document.getElementById('modal-lv').textContent = item.lv;
  document.getElementById('modal-title').textContent = item.title;
  document.getElementById('modal-hint').textContent = item.hint;
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

// サーバーメモリ表示（Lv9用）。表示だけなのでサーバーログには残さない。
async function updateServerMem() {
  try {
    const res = await fetch(API + '/debug/memory');
    const data = await res.json();
    const el = document.getElementById('server-mem');
    if (el) el.textContent = data.heap_alloc_mb;
  } catch (e) {
    // 表示用なので失敗しても無視する
  }
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
