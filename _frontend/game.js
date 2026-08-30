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

// ---- Go 経験者向けチャレンジ（ステージ5クリア後に解放、Lv順に表示）----
// action あり → クリックでチャレンジ実行、action なし → クリックでヒント表示
const ADVANCED_CHALLENGES = [
  {
    lv: 'Lv6',
    title: '姿の見えない敵',
    hint: '症状: 偵察してもステルスGopherの名前もHPも見えない（JSONが空っぽ）。\npkg/server/service/stealth.go の ScoutedEnemy のフィールドが小文字＝非公開のため、encoding/json から見えない。\nフィールドを大文字にして jsonタグ（`json:\"name\"` など）を付けよう。',
    action: 'scout',
    condition: '偵察結果に敵の <strong>名前とステータス</strong> が写っていること',
    img: '/images/gopher-enemies/gopher-ghost.png',
  },
  {
    lv: 'Lv7',
    title: '鏡の鎧を打ち破れ',
    hint: '症状: 何度攻撃しても鏡の鎧のGopherのHPが90のまま減らない。\npkg/server/service/mirror.go の TakeDamage が「値レシーバ」なので、コピーのHPを減らしているだけ。\nポインタレシーバ func (k *MirrorKnight) TakeDamage(...) に変えよう。',
    action: 'mirror',
    condition: '3回の攻撃で騎士のHPを <strong>90 → 0</strong> にすること',
    img: '/images/gopher-enemies/gopher-ice.png',
  },
  {
    lv: 'Lv8',
    title: '戦利品を袋に詰めろ',
    hint: '症状: 戦利品を拾おうとするとサーバーがエラーを起こす（panic）。\npkg/server/service/loot.go — var で宣言しただけの map は nil で、書き込むと panic する。\nmake(map[string]int) で袋を用意してから詰めよう。',
    action: 'loot',
    condition: '戦利品を袋に詰めても <strong>panicしない</strong> こと',
    img: '/images/gopher-enemies/gopher-zombie.png',
  },
  {
    lv: 'Lv9',
    title: '巨神Gopherを検分せよ',
    hint: '症状: 25ダメージ×30回のはずが、合計ダメージがマイナスになる。\npkg/server/service/titan.go — 合計を int8（-128〜127）で数えていてオーバーフローしている。\nint に変えよう。Goの整数型には入る値の範囲がある。',
    action: 'overflow',
    condition: '合計ダメージが正しく <strong>750</strong> になること',
    img: '/images/gopher-enemies/gopher-magma.png',
  },
  {
    lv: 'Lv10',
    title: '不死身の呪いを解け',
    hint: '症状: 致死ダメージを受けてもHPが1残って死なない（不死身の呪い）。\npkg/server/service/battle.go の ApplyDamage にバグがある。\nおすすめ: battle_test.go にテストケースを追加して見つけよう。\n\nコマンド:\ngo test ./pkg/server/service/ -run TestApplyDamage -v',
    action: 'finish',
    condition: '致死ダメージを受けたらHPは <strong>0</strong> になること',
    img: '/images/gopher-enemies/gopher-zombie.png',
  },
  {
    lv: 'Lv11',
    title: '討伐碑に名を刻め',
    hint: '症状: 討伐碑に刻んだ敵の名前が文字化けしている。\npkg/server/service/naming.go の EngraveName — len() と s[:5] は「バイト数」で切るため、日本語（1文字3バイト）が途中でちぎれる。\n[]rune に変換して「文字数」で切り詰めよう。',
    action: 'engrave',
    condition: '刻んだ名前が <strong>壊れていない</strong> こと（5文字で切り詰め）',
    img: '/images/gopher-enemies/gopher-psycho.png',
  },
  {
    lv: 'Lv12',
    title: '分身Gopherを見破れ',
    hint: '症状: 分身だけを弱体化したはずが、本体まで一緒に弱くなっている。\npkg/server/service/mirage.go — スライスの代入はコピーではなく「同じ配列を指す窓」。\nslices.Clone（または make + copy）で複製しよう。',
    action: 'mirage',
    condition: '分身を弱体化しても <strong>本体は無傷</strong> であること',
    img: '/images/gopher-enemies/gopher-ice.png',
  },
  {
    lv: 'Lv13',
    title: '討伐隊を整列させろ',
    hint: '症状: 討伐隊の隊列が組むたびにバラバラになる。\npkg/server/service/formation.go — Goの map を range で回す順序は毎回ランダムと決まっている。\n取り出した名前を slices.Sort で並べ替えて隊列を安定させよう。',
    action: 'formation',
    condition: '隊列を5回組んで <strong>毎回同じ順序</strong> になること',
    img: '/images/gopher-enemies/gopher-psycho.png',
  },
  {
    lv: 'Lv14',
    title: '幻の番人',
    hint: '症状: 存在しないステージに挑むとサーバーで panic が起きる。\npkg/server/repository/stage.go の GetByID がエラーを握りつぶして nil を返している。\nエラーを正しく返して nil ポインタ参照を防ごう。',
    action: 'phantom',
    condition: '存在しないステージに挑んでも、サーバーは <strong>正しくエラーを返す</strong> こと',
    img: '/images/gopher-enemies/gopher-ice.png',
  },
  {
    lv: 'Lv15',
    title: '宝物庫の扉を閉めろ',
    hint: '症状: 宝物庫を覗くたびにDB接続が開きっぱなしになり、どんどん溜まっていく。\npkg/server/repository/enemy.go の PeekVault — rows.Close() が抜けている。\nQuery の直後に defer rows.Close() を入れるのが Go の作法。',
    action: 'vault',
    condition: '宝物庫を15回覗いても扉（DB接続）が <strong>閉まっている</strong> こと',
    img: '/images/gopher-enemies/gopher-demon.png',
  },
  {
    lv: 'Lv16',
    title: '封印を並列に解け',
    hint: '症状: 封印解除に5秒かかって失敗する（制限時間3秒）。\npkg/server/service/seal.go の BreakAllSeals が封印を1つずつ順番に解いている。\ngoroutine + sync.WaitGroup で並列化すれば約1秒で終わる。',
    action: 'challenge',
    condition: '5つの封印を <strong>3秒以内</strong> にすべて解け',
    img: '/images/gopher-enemies/gopher-magma.png',
  },
  {
    lv: 'Lv17',
    title: 'ゴブリンの群れを一掃せよ',
    hint: '症状: 100体の群れを同時討伐すると、討伐数の記録がズレる。\npkg/server/service/horde.go の SlayHorde にデータ競合（Race Condition）がある。\ngo test -race ./... で検出し、sync.Mutex でカウンタを守ろう。',
    action: 'horde',
    condition: '100体の群れを同時討伐し、討伐数を <strong>正確に記録</strong> せよ',
    img: '/images/gopher-enemies/gopher-psycho.png',
  },
  {
    lv: 'Lv18',
    title: 'ボスの詠唱を中断せよ',
    hint: '症状: 詠唱中断を試みると10秒間固まって間に合わない。\npkg/server/service/spell.go の InterruptCast が詠唱channelをただ待っている。\nselect + time.After で2秒タイムアウトさせよう。',
    action: 'interrupt',
    condition: 'ボスの詠唱（10秒）が完了する前に <strong>2秒以内</strong> で中断せよ',
    img: '/images/gopher-enemies/gopher-magma.png',
  },
  {
    lv: 'Lv19',
    title: 'ギルドの依頼を同時にこなせ',
    hint: '症状: 3つの依頼調査が1件ずつ直列に走り、ギルドの受付時間（2秒）に間に合わない。\npkg/server/service/quest.go の GatherQuestReports を golang.org/x/sync/errgroup で並列化しよう。\n\n事前に: go get golang.org/x/sync/errgroup',
    action: 'quest',
    condition: '3つの依頼を <strong>2秒以内</strong> にすべて調査せよ',
    img: '/images/gopher-enemies/gopher-zombie.png',
  },
  {
    lv: 'Lv20',
    title: '眠るギルドに見切りをつけろ',
    hint: '症状: 眠っている遠方のギルドへ伝令を送ると、永遠に返事を待ち続けてしまう。\npkg/server/service/courier.go の http.Client に Timeout が設定されていない。\nTimeout: 2 * time.Second を設定して、2秒で諦めて帰らせよう。',
    action: 'courier',
    condition: '眠っている相手に <strong>2秒</strong> で見切りをつけて帰還すること',
    img: '/images/gopher-enemies/gopher-zombie.png',
  },
  {
    lv: 'Lv21',
    title: '城門の大渋滞を制圧せよ',
    hint: '症状: 100人の騎士が一斉に突撃して城門で団子になっている（同時100人）。\npkg/server/service/assault.go — バッファ付き channel（容量5）をセマフォとして使い、\n「入る前に枠を取り、出るときに枠を返す」形で同時実行数を5に制限しよう。',
    action: 'assault',
    condition: '同時に突撃する騎士を <strong>5人以下</strong> に抑えること',
    img: '/images/gopher-enemies/gopher-demon.png',
  },
  {
    lv: 'Lv22',
    title: '悪霊の門を閉じろ',
    hint: '症状: 敵の攻撃のたびに悪霊（goroutine）が増え続ける。\npkg/server/service/battle.go の summonSpirit が閉じない channel を永遠に待つ goroutine を起動している（goroutineリーク）。\nGET /api/debug/memory の num_goroutine で観測して直そう。',
    action: 'spirit',
    condition: '30連戦しても悪霊（goroutine）が <strong>漏れ出さない</strong> こと',
    img: '/images/gopher-enemies/gopher-ghost.png',
  },
  {
    lv: 'Lv23',
    title: '倒した敵の怨念を祓え',
    hint: '症状: 戦うほどサーバーのメモリが増え続け、怨念が祓えない。\npkg/server/service/battle.go でグローバル変数に参照が残り、GCがメモリを回収できない（メモリリーク）。\nGET /api/debug/memory や GODEBUG=gctrace=1 で観測して直そう。',
    action: 'grudge',
    condition: '20連戦のあと、サーバーのメモリが <strong>50MB未満</strong> なら怨念は祓われる',
    img: '/images/gopher-enemies/gopher-ghost.png',
  },
  {
    lv: 'Lv24',
    title: '使い魔を家に帰せ',
    hint: '症状: 使い魔を召喚するたびに、永遠に働き続ける使い魔（goroutine）が増えていく。\npkg/server/service/familiar.go — 使い魔に「帰っていいよ」と伝える手段がない。\ncontext.WithCancel で ctx を渡し、使い魔は select で ctx.Done() を確認して帰れるようにしよう。',
    action: 'familiar',
    condition: '使い魔10体が仕事を終えたら <strong>全員帰宅</strong> すること',
    img: '/images/gopher-enemies/gopher-ghost.png',
  },
  {
    lv: 'Lv25',
    title: '呪いの爆弾を解除せよ',
    hint: '症状: 解除を試みると1秒後にサーバーごと落ちる。\ngoroutine の中の panic は Echo の Recover では拾えない。\npkg/server/service/curse.go の goroutine の先頭に defer + recover() を仕込もう。',
    action: 'curse',
    condition: '爆弾を解除しても、サーバーが <strong>生きている</strong> こと',
    img: '/images/gopher-enemies/gopher-demon.png',
  },
  {
    lv: 'Lv26',
    title: '討伐報告書を高速化せよ',
    hint: '症状: 40000行の討伐報告書の作成が遅すぎて軍記官が音を上げる。\npkg/server/service/battle.go の BuildBattleReport が += の文字列連結を使っている。\nstrings.Builder に書き換えよう。ベンチマークでの計測もおすすめ:\n\ngo test ./pkg/server/service/ -bench BuildBattleReport -benchmem',
    action: 'report',
    condition: '40000行の討伐記録を <strong>1秒以内</strong> に報告書へまとめよ',
    img: '/images/gopher-enemies/gopher-psycho.png',
  },
  {
    lv: 'Lv27',
    title: '古文書を速読せよ',
    hint: '症状: 古文書の解読が毎回800msかかる（ステージ選択画面の「言い伝え」の表示も毎回遅い）。\npkg/server/service/ancient.go の DecodeAncientText が呼ばれるたびに解読し直している。\nsync.Once で「最初の1回だけ」解読するようにしよう。',
    action: 'decode',
    condition: '2回目の解読は <strong>一瞬</strong> で終わること（解読結果は変わらないのだから）',
    img: '/images/gopher-enemies/gopher-ghost.png',
  },
  {
    lv: 'Lv28',
    title: '予言者に打ち勝て',
    hint: '症状: 予言者に会心の一撃の行方をすべて予知されてしまう（乱数が予測可能＝チート可能）。\npkg/server/service/battle.go の RollCritical が古い math/rand を固定シードで使っている。\nGo 1.22 の math/rand/v2 に移行しよう（rand.IntN(4) == 0 と書ける。criticalRolls++ の行は判定用なので残す）。',
    action: 'prophecy',
    condition: '予言者に会心の行方を <strong>読まれない</strong> こと（12回の会心予知と勝負）',
    img: '/images/gopher-enemies/gopher-ice.png',
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
  let res;
  try {
    res = await fetch(API + path, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch (e) {
    // サーバーが落ちている・タイムアウトで中断した等、レスポンス自体がない場合もログに残す
    const reason = e.name === 'AbortError' ? 'タイムアウトで中断' : 'サーバーから応答なし';
    addServerLog(method, path, { error: reason });
    throw e;
  }
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

// DBからチャレンジの敵情報（名前・HP・解放EXP）を取得して各カードに紐付ける
async function loadChallengeEnemies() {
  const list = await apiFetch('/challenges');
  const byAction = {};
  list.forEach(e => { byAction[e.action] = e; });
  ADVANCED_CHALLENGES.forEach(item => { item.db = byAction[item.action]; });
}

async function loadHeroAndStages() {
  loadLegend(); // 古文書の言い伝えを読み込む（Lv27: 毎回800msかかるのが症状）
  try {
    hero = await apiFetch('/hero');
    updateCharCard(hero);
    heroHP = hero.hp;

    await loadChallengeEnemies();
    const stages = await apiFetch('/stages');
    renderStageList(stages);
  } catch (e) {
    console.error('[loadHeroAndStages]', e);
    document.getElementById('stage-list').innerHTML =
      `<p style="color:#c03030;font-size:12px">Error: ${e.message}<br>サーバーが起動しているか確認してください。</p>`;
  }
}

// 古文書の言い伝えを取得して表示する（Lv27用）
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
      <button class="stage-hint-btn" type="button">ヒント</button>
      <div class="stage-arrow">${stage.is_unlocked ? '▶' : '🔒'}</div>
    `;

    // ヒントはロック中でも見られる（Lv2のように「前のステージで直す」課題があるため）
    const hintBtn = card.querySelector('.stage-hint-btn');
    if (hint) {
      hintBtn.onclick = (e) => {
        e.stopPropagation();
        openHintModal(hint.lv, hint.title, hint.hint);
      };
    } else {
      hintBtn.style.display = 'none';
    }

    if (stage.is_unlocked) {
      card.onclick = () => startBattle(stage);
    }
    container.appendChild(card);
  });

  // Go経験者向けチャレンジ。Lv1〜5と同じく、敵を倒す（EXP +100）と次のカードが解放される
  const advanced = [...ADVANCED_CHALLENGES].sort(
    (a, b) => parseInt(a.lv.slice(2), 10) - parseInt(b.lv.slice(2), 10)
  );
  advanced.forEach(item => {
    if (!item.db) return; // DBから敵情報を取得できていない場合は表示しない
    const unlocked = hero && hero.experience >= item.db.unlock_exp;
    const beaten = hero && hero.experience >= item.db.unlock_exp + 100; // 撃破済み
    const card = document.createElement('div');
    card.className = 'stage-card' + (unlocked ? '' : ' locked');
    card.innerHTML = `
      <img class="stage-icon" src="${item.img}" alt="" />
      <div class="stage-info">
        <div class="stage-lv">${item.lv}</div>
        <div class="stage-name">${item.title}</div>
        <div class="stage-req">${item.db.name}（HP ${item.db.max_hp}）／必要EXP: ${item.db.unlock_exp}</div>
      </div>
      <button class="stage-hint-btn" type="button">ヒント</button>
      <div class="stage-arrow">${beaten ? '⭐' : (unlocked ? '▶' : '🔒')}</div>
    `;
    // ヒントはロック中でも見られる
    card.querySelector('.stage-hint-btn').onclick = (e) => {
      e.stopPropagation();
      showAdvancedHint(item);
    };
    if (unlocked) {
      card.onclick = () => runChallenge(item);
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
    updateServerMem(); // Lv23: 戦うたびにサーバーメモリ表示を更新（増え続けたら怪しい）

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

// ---- Hero skill: 渾身の一撃（ダメージ2倍、ただし大技のスキを突かれて反撃も2倍） ----
async function heroSkill() {
  const enemy = enemies[enemyIndex];
  if (isBusy) return;
  isBusy = true;
  setActionsEnabled(false);

  try {
    const result = await apiFetch('/battle/attack', {
      method: 'POST',
      body: JSON.stringify({ hero_attack: hero.attack * 2, enemy_name: enemy.name }),
    });

    enemyHP = Math.max(0, enemyHP - result.damage);
    updateEnemyHP();
    setDialog('渾身の一撃！' + result.message);
    updateServerMem();

    if (enemyHP <= 0) {
      await handleEnemyDefeated();
    } else {
      await sleep(700);
      await enemyAttack(2); // 反撃は2倍
    }
  } catch (e) {
    setDialog(`エラー: ${e.message}`);
    setActionsEnabled(true);
  } finally {
    isBusy = false;
  }
}

// ---- Enemy attacks ----
async function enemyAttack(multiplier = 1) {
  const enemy = enemies[enemyIndex];
  try {
    const result = await apiFetch('/battle/enemy-attack', {
      method: 'POST',
      body: JSON.stringify({
        enemy_attack: enemy.attack * multiplier,
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
// HPが0になったら GAME OVER を表示し、HPを全回復させてステージ選択に自動で戻る
async function handleHeroDied() {
  setDialog('やられてしまった…');
  setActionsEnabled(false);
  await sleep(1500);

  showResultScreen(false, null);

  // DB上のHPが最大値を下回っている場合は全回復させる
  // （Lv3修正前は回復APIが未登録なので、失敗しても気にしない）
  if (hero && hero.hp < hero.max_hp) {
    try {
      await apiFetch('/hero/hp', { method: 'PUT', body: JSON.stringify({ hp: hero.max_hp }) });
    } catch (e) {
      // Lv3未修正の間は回復できないが、バトル開始時にDBのHPから復帰するので問題ない
    }
  }

  // GAME OVER を少し見せてからステージ選択に自動で戻る
  await sleep(2500);
  goToStageSelect();
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
    // Lv2: 画面上はEXPが増えたのにDBに保存されていない場合は「バグ発見」の演出を出す
    // （hero はクリア直後に GET /api/hero で取り直したDB上の値）
    if (hero && hero.experience < clearResult.new_experience) {
      detail.innerHTML += `
        <div class="exp-warning">
          🐛 <strong>バグ発見！</strong> 画面ではEXPが増えたのに、サーバー（DB）には保存されていない。<br>
          リロードするとEXPは元に戻り、次のステージも解放されない。<br>
          → これが <strong>Lv2</strong> の課題。pkg/server/handler/stage.go の ClearStage を修正して、もう一度このステージをクリアしよう
        </div>
      `;
    }
  } else {
    icon.textContent = '💀';
    title.textContent = 'GAME OVER';
    title.className = 'result-title lose';
    detail.innerHTML = `
      <strong>${currentStage.name}</strong> でやられてしまった。<br>
      HPは全回復した。ステージ選択に戻ります…
    `;
  }
}

// ============================================================
// Help Modal
// ============================================================

// ヒントモーダルを開く（全レベル共通）
function openHintModal(lv, title, hintText) {
  document.getElementById('modal-lv').textContent = lv;
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-hint').textContent = hintText;
  document.getElementById('help-modal').style.display = 'flex';
}

function showHelp() {
  if (!currentStage) return;
  const hint = STAGE_HINTS[currentStage.order_num] || STAGE_HINTS[1];
  openHintModal(hint.lv, hint.title, hint.hint);
}

const SEAL_NAMES = ['炎の封印', '水の封印', '風の封印', '大地の封印', '闇の封印'];

// ---- チャレンジ画面の共通ヘルパー ----

// 実行中のチャレンジ（チャレンジ画面のヒントボタンで使う）
let currentChallengeItem = null;

// カードクリック: 敵とのエンカウント開始（判定はまだ行わない）
function runChallenge(item) {
  currentChallengeItem = item;
  openChallengeScreen(item);
}

// 「たたかう」: バグを直せていれば攻撃が通る＝クリア判定
async function challengeAttack() {
  const item = currentChallengeItem;
  if (!item) return;
  const actions = {
    challenge: tryChallenge,
    horde: tryHordeChallenge,
    grudge: tryGrudgeChallenge,
    phantom: tryPhantomChallenge,
    interrupt: tryInterruptChallenge,
    quest: tryQuestChallenge,
    spirit: trySpiritChallenge,
    curse: tryCurseChallenge,
    finish: tryFinishChallenge,
    report: tryReportChallenge,
    decode: tryDecodeChallenge,
    prophecy: tryProphecyChallenge,
    scout: tryScoutChallenge,
    mirror: tryMirrorChallenge,
    loot: tryLootChallenge,
    overflow: tryTitanChallenge,
    engrave: tryEngraveChallenge,
    mirage: tryMirageChallenge,
    formation: tryFormationChallenge,
    vault: tryVaultChallenge,
    courier: tryCourierChallenge,
    assault: tryAssaultChallenge,
    familiar: tryFamiliarsChallenge,
  };
  const fn = actions[item.action];
  if (!fn) return;

  document.getElementById('challenge-attack-btn').disabled = true;
  document.getElementById('challenge-back-btn').disabled = true;
  // 再挑戦に備えて敵の状態をリセット
  const sprite = document.getElementById('challenge-enemy-sprite');
  sprite.classList.remove('defeated', 'rage');
  updateChallengeHP(item.db.max_hp, item.db.max_hp);
  document.getElementById('challenge-dialog').textContent = 'ヒーローのこうげき！';

  await fn(item);
}

// チャレンジ画面を開く: 敵が現れるだけで、判定は「たたかう」を押したときに行う
function openChallengeScreen(item) {
  showScreen('challenge-screen');
  document.getElementById('challenge-header').textContent = item.title;
  document.getElementById('challenge-condition').innerHTML = item.condition;
  document.getElementById('challenge-dialog').textContent = `${item.db.name} が あらわれた！`;
  document.getElementById('challenge-back-btn').disabled = false;
  document.getElementById('challenge-attack-btn').disabled = false;

  // 対決する敵（DBの challenge_enemies から取得済み）を表示する
  const sprite = document.getElementById('challenge-enemy-sprite');
  const nameEl = document.getElementById('challenge-enemy-name');
  sprite.classList.remove('defeated', 'rage');
  sprite.src = item.img;
  nameEl.textContent = item.db.name;
  updateChallengeHP(item.db.max_hp, item.db.max_hp);
  document.getElementById('seal-list').innerHTML = '';
}

// 判定開始時に進捗リストを初期化して返す
function resetChallengeList() {
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

// チャレンジを終了してダイアログを更新する。
// 進捗リストの結果（done/failed）から勝敗を判定し、敵の撃破/激怒演出を出す
function finishChallenge(message) {
  document.getElementById('challenge-back-btn').disabled = false;
  document.getElementById('challenge-attack-btn').disabled = false; // 直したらもう一度たたかえる
  const sprite = document.getElementById('challenge-enemy-sprite');
  const nameEl = document.getElementById('challenge-enemy-name');
  const hasFailed = document.querySelector('#seal-list .seal-item.failed');
  const hasDone = document.querySelector('#seal-list .seal-item.done');
  const db = currentChallengeItem && currentChallengeItem.db;
  let prefix = '';
  if (hasFailed) {
    // 敗北: 攻撃は通らず、敵の反撃を受ける
    sprite.classList.add('rage');
    if (db) {
      nameEl.textContent = db.name;
      prefix = `${db.name} の反撃！こうげきは効いていない…！ `;
    }
  } else if (hasDone) {
    // 勝利: HPを0まで削って撃破
    if (db) {
      updateChallengeHP(0, db.max_hp);
      nameEl.textContent = db.name;
      prefix = `${db.name} をたおした！ `;
      // 初回撃破ならEXP+100（次のチャレンジが解放される）
      if (hero && hero.experience < db.unlock_exp + 100) {
        prefix += 'EXP +100！ ';
        awardChallengeExp(currentChallengeItem);
      }
    }
    setTimeout(() => sprite.classList.add('defeated'), 500); // HPが削れてから倒れる
  }
  document.getElementById('challenge-dialog').textContent = prefix + message;
}

// チャレンジ画面の敵HPバーを更新する
function updateChallengeHP(hp, maxHP) {
  const pct = Math.max(0, (hp / maxHP) * 100);
  document.getElementById('challenge-hp-fill').style.width = pct + '%';
  document.getElementById('challenge-hp-text').textContent = `${hp}/${maxHP}`;
  document.getElementById('challenge-hp-fill').classList.toggle('low', pct < 30);
}

// チャレンジの撃破報酬: EXPを「解放EXP + 100」まで引き上げる（再撃破では増えない）
async function awardChallengeExp(item) {
  const target = item.db.unlock_exp + 100;
  try {
    await apiFetch('/hero/experience', {
      method: 'PUT',
      body: JSON.stringify({ experience: target }),
    });
    hero = await apiFetch('/hero');
    updateCharCard(hero);
  } catch (e) {
    // 付与に失敗しても演出はそのまま続行する
  }
}

async function tryChallenge(item) {
  const sealListEl = resetChallengeList();

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
    finishChallenge(result.message || 'すべての封印を解いた！ボスドラゴンに挑もう！');

  } catch (e) {
    clearTimeout(abort);
    clearInterval(timer);
    // 失敗: アニメーションを止めて全封印を「失敗」に
    sealListEl.querySelectorAll('.seal-item').forEach(el => {
      el.classList.remove('pending');
      el.classList.add('failed');
      el.querySelector('.seal-status').textContent = '失敗';
    });
    finishChallenge('封印解除に失敗！pkg/server/service/seal.go の BreakAllSeals を goroutine + sync.WaitGroup で並列化しよう。');
  }
}

// ---- Lv17: ゴブリンの群れ討伐（Race Condition）----
async function tryHordeChallenge(item) {
  const listEl = resetChallengeList();
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

// ---- Lv23: 怨念祓いの儀式（GC・メモリリーク）----
async function tryGrudgeChallenge(item) {
  const listEl = resetChallengeList();
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

// ---- Lv14: 幻のステージの番人（nil ポインタ panic）----
async function tryPhantomChallenge(item) {
  const listEl = resetChallengeList();
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

// ---- Lv18: 詠唱中断（channel / select）----
async function tryInterruptChallenge(item) {
  const listEl = resetChallengeList();
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

// ---- Lv19: ギルドの依頼調査（errgroup 並列化）----
const QUEST_NAMES = ['魔物の生息調査', '薬草の在庫確認', '地図の作成'];

async function tryQuestChallenge(item) {
  const listEl = resetChallengeList();
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

// ---- Lv22: 悪霊の門（goroutineリーク）----
async function trySpiritChallenge(item) {
  const listEl = resetChallengeList();
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

// ---- Lv25: 呪いの爆弾（goroutine内panic + recover）----
async function tryCurseChallenge(item) {
  const listEl = resetChallengeList();
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
      'サーバーごと爆発した！！（make start の air が自動で再起動してくれる）goroutine の中の panic は Echo の Recover では拾えない。pkg/server/service/curse.go の goroutine の先頭に defer + recover() を仕込もう。'
    );
  }
}

// ---- Lv10: 不死身の呪い（ApplyDamage）----
async function tryFinishChallenge(item) {
  const listEl = resetChallengeList();
  const row = addChallengeRow(listEl, '致死ダメージ後のHP', '判定中...');

  try {
    const result = await apiFetch('/battle/enemy-attack', {
      method: 'POST',
      body: JSON.stringify({ enemy_attack: 9999, enemy_name: 'ゴブリン', hero_hp: 10 }),
    });
    if (result.new_hero_hp === 0) {
      setChallengeRow(row, 'done', 'HP 0');
      finishChallenge('ヒーローは倒れた…とどめが正しく通る！不死身の呪いは解けている！');
    } else {
      setChallengeRow(row, 'failed', `HP ${result.new_hero_hp}`);
      finishChallenge(
        `HPが ${result.new_hero_hp} 残って死なない…不死身の呪いだ！pkg/server/service/battle.go の ApplyDamage を直そう（battle_test.go にテストを書いて見つけるのがおすすめ）。`
      );
    }
  } catch (e) {
    setChallengeRow(row, 'failed', 'エラー');
    finishChallenge(`エラー: ${e.message}`);
  }
}

// ---- Lv26: 討伐報告書（strings.Builder）----
async function tryReportChallenge(item) {
  const listEl = resetChallengeList();
  const row = addChallengeRow(listEl, '報告書の作成', '作成中...');

  const dialogEl = document.getElementById('challenge-dialog');
  let elapsed = 0;
  const timer = setInterval(() => {
    elapsed++;
    dialogEl.textContent = `軍記官が報告書を書いている… ${elapsed}秒`;
  }, 1000);

  try {
    const result = await apiFetch('/battle/report', { method: 'POST' });
    clearInterval(timer);
    setChallengeRow(row, 'done', `${result.elapsed_ms}ms`);
    finishChallenge(result.message);
  } catch (e) {
    clearInterval(timer);
    setChallengeRow(row, 'failed', '遅すぎる');
    finishChallenge(
      `${e.message} pkg/server/service/battle.go の BuildBattleReport を strings.Builder で書き換えよう。`
    );
  }
}

// ---- Lv27: 古文書の速読（sync.Once）----
async function tryDecodeChallenge(item) {
  const listEl = resetChallengeList();
  const row = addChallengeRow(listEl, '2回目の解読', '解読中...');

  try {
    const result = await apiFetch('/legend/speedread', { method: 'POST' });
    setChallengeRow(row, 'done', `${result.second_ms}ms`);
    finishChallenge(result.message);
  } catch (e) {
    setChallengeRow(row, 'failed', '毎回800ms');
    finishChallenge(
      `${e.message} pkg/server/service/ancient.go の DecodeAncientText を sync.Once で「最初の1回だけ」にしよう。`
    );
  }
}

// ---- Lv28: 予言者（math/rand/v2）----
async function tryProphecyChallenge(item) {
  const listEl = resetChallengeList();
  const row = addChallengeRow(listEl, '予言の的中数', '占い中...');

  try {
    const result = await apiFetch('/battle/prophecy', { method: 'POST' });
    const hits = result.predicted.filter((p, i) => p === result.actual[i]).length;
    if (result.all_match) {
      setChallengeRow(row, 'failed', `${hits}/12 的中`);
      finishChallenge(
        `${result.message} pkg/server/service/battle.go の RollCritical を math/rand/v2 に移行しよう。`
      );
    } else {
      setChallengeRow(row, 'done', `${hits}/12 的中`);
      finishChallenge(result.message);
    }
  } catch (e) {
    setChallengeRow(row, 'failed', 'エラー');
    finishChallenge(`エラー: ${e.message}`);
  }
}

// ---- Lv6: 姿の見えない敵（JSONとフィールドの公開）----
async function tryScoutChallenge(item) {
  const listEl = resetChallengeList();
  const rows = {
    name: addChallengeRow(listEl, '名前', '偵察中...'),
    hp: addChallengeRow(listEl, 'HP', '偵察中...'),
    attack: addChallengeRow(listEl, '攻撃力', '偵察中...'),
  };
  try {
    const result = await apiFetch('/battle/scout', { method: 'POST' });
    if (result.name && result.hp && result.attack) {
      setChallengeRow(rows.name, 'done', result.name);
      setChallengeRow(rows.hp, 'done', String(result.hp));
      setChallengeRow(rows.attack, 'done', String(result.attack));
      finishChallenge('敵の正体を見破った！');
    } else {
      Object.values(rows).forEach(r => setChallengeRow(r, 'failed', '？？？'));
      finishChallenge('偵察結果が空っぽだ…。pkg/server/service/stealth.go のフィールドを大文字にして jsonタグを付けよう。');
    }
  } catch (e) {
    Object.values(rows).forEach(r => setChallengeRow(r, 'failed', 'エラー'));
    finishChallenge(`エラー: ${e.message}`);
  }
}

// ---- Lv7: 鏡の鎧（値レシーバ vs ポインタレシーバ）----
async function tryMirrorChallenge(item) {
  const listEl = resetChallengeList();
  const row = addChallengeRow(listEl, '3回攻撃後のHP', '攻撃中...');
  try {
    const result = await apiFetch('/battle/mirror', { method: 'POST' });
    if (result.ok) {
      setChallengeRow(row, 'done', `${result.before} → ${result.after}`);
      finishChallenge('攻撃が本体に届いた！鏡の鎧は砕け散った！');
    } else {
      setChallengeRow(row, 'failed', `${result.before} → ${result.after}`);
      finishChallenge('攻撃がすべて鏡のコピーに吸われている…。pkg/server/service/mirror.go の TakeDamage をポインタレシーバにしよう。');
    }
  } catch (e) {
    setChallengeRow(row, 'failed', 'エラー');
    finishChallenge(`エラー: ${e.message}`);
  }
}

// ---- Lv8: 戦利品の袋（nil map）----
async function tryLootChallenge(item) {
  const listEl = resetChallengeList();
  const row = addChallengeRow(listEl, '戦利品の回収', '回収中...');
  try {
    const result = await apiFetch('/battle/loot', { method: 'POST' });
    const items = Object.entries(result.loot).map(([k, v]) => `${k}×${v}`).join(' ');
    setChallengeRow(row, 'done', items);
    finishChallenge(result.message);
  } catch (e) {
    setChallengeRow(row, 'failed', 'panic!');
    finishChallenge('袋が存在せず戦利品が床にぶちまけられた（panic）！pkg/server/service/loot.go — nil の map には書き込めない。make で袋を用意しよう。');
  }
}

// ---- Lv9: 巨神Gopher（整数オーバーフロー）----
async function tryTitanChallenge(item) {
  const listEl = resetChallengeList();
  const row = addChallengeRow(listEl, '合計ダメージ', '計算中...');
  try {
    const result = await apiFetch('/battle/titan', { method: 'POST' });
    if (result.ok) {
      setChallengeRow(row, 'done', `${result.total} / ${result.expected}`);
      finishChallenge('ダメージが正しく積み上がった！巨神は崩れ落ちた！');
    } else {
      setChallengeRow(row, 'failed', `${result.total} / ${result.expected}`);
      finishChallenge(`合計ダメージが ${result.total} になっている…！pkg/server/service/titan.go — int8 がオーバーフローしている。int に変えよう。`);
    }
  } catch (e) {
    setChallengeRow(row, 'failed', 'エラー');
    finishChallenge(`エラー: ${e.message}`);
  }
}

// ---- Lv11: 討伐碑（string / rune / UTF-8）----
async function tryEngraveChallenge(item) {
  const listEl = resetChallengeList();
  const row = addChallengeRow(listEl, '碑文', '刻んでいる...');
  try {
    const result = await apiFetch('/battle/engrave', { method: 'POST' });
    const engraved = result.names.join(' ／ ');
    if (result.ok) {
      setChallengeRow(row, 'done', engraved);
      finishChallenge('名は正しく刻まれた！');
    } else {
      setChallengeRow(row, 'failed', engraved);
      finishChallenge('碑文が文字化けしている…！pkg/server/service/naming.go の EngraveName — バイトではなく rune（文字）で切り詰めよう。');
    }
  } catch (e) {
    setChallengeRow(row, 'failed', 'エラー');
    finishChallenge(`エラー: ${e.message}`);
  }
}

// ---- Lv12: 分身Gopher（スライスの共有）----
async function tryMirageChallenge(item) {
  const listEl = resetChallengeList();
  const bodyRow = addChallengeRow(listEl, '本体 (HP/攻/防)', '確認中...');
  const mirageRow = addChallengeRow(listEl, '分身 (HP/攻/防)', '確認中...');
  try {
    const result = await apiFetch('/battle/mirage', { method: 'POST' });
    setChallengeRow(mirageRow, 'done', result.mirage.join(' / '));
    if (result.ok) {
      setChallengeRow(bodyRow, 'done', result.body.join(' / '));
      finishChallenge('本体は無傷のまま、分身だけを弱体化できた！本体を見破って撃破！');
    } else {
      setChallengeRow(bodyRow, 'failed', result.body.join(' / '));
      finishChallenge('本体まで一緒に弱くなっている＝同じ配列を共有している証拠…。pkg/server/service/mirage.go で slices.Clone を使って複製しよう。');
    }
  } catch (e) {
    setChallengeRow(bodyRow, 'failed', 'エラー');
    finishChallenge(`エラー: ${e.message}`);
  }
}

// ---- Lv13: 討伐隊の隊列（mapの順序）----
async function tryFormationChallenge(item) {
  const listEl = resetChallengeList();
  const row = addChallengeRow(listEl, '5回の隊列', '整列中...');
  try {
    const result = await apiFetch('/battle/formation', { method: 'POST' });
    if (result.stable) {
      setChallengeRow(row, 'done', '5回とも同じ順序');
      finishChallenge(`隊列は乱れない！（${result.lines[0].join('・')}）`);
    } else {
      setChallengeRow(row, 'failed', '毎回バラバラ');
      finishChallenge(`隊列が組むたびに変わってしまう…（1回目: ${result.lines[0].slice(0, 4).join('・')}… / 2回目: ${result.lines[1].slice(0, 4).join('・')}…）pkg/server/service/formation.go — mapの順序は毎回ランダム。slices.Sort で並べ替えよう。`);
    }
  } catch (e) {
    setChallengeRow(row, 'failed', 'エラー');
    finishChallenge(`エラー: ${e.message}`);
  }
}

// ---- Lv15: 宝物庫の扉（defer / rows.Close）----
async function tryVaultChallenge(item) {
  const listEl = resetChallengeList();
  const row = addChallengeRow(listEl, '開きっぱなしの扉(DB接続)', '確認中...');
  try {
    const result = await apiFetch('/battle/vault', { method: 'POST' });
    if (result.ok) {
      setChallengeRow(row, 'done', `+${result.leaked}`);
      finishChallenge('扉はすべて閉まっている！盗賊の逃げ道を断った！');
    } else {
      setChallengeRow(row, 'failed', `+${result.leaked}`);
      finishChallenge(`15回覗いたら扉が ${result.leaked} 枚も開きっぱなしだ…！pkg/server/repository/enemy.go の PeekVault に defer rows.Close() を入れよう。`);
    }
  } catch (e) {
    setChallengeRow(row, 'failed', 'エラー');
    finishChallenge(`エラー: ${e.message}`);
  }
}

// ---- Lv20: 伝令（http.Client の Timeout）----
async function tryCourierChallenge(item) {
  const listEl = resetChallengeList();
  const row = addChallengeRow(listEl, '伝令の帰還', '返事を待っている...');

  const dialogEl = document.getElementById('challenge-dialog');
  let elapsed = 0;
  const timer = setInterval(() => {
    elapsed++;
    dialogEl.textContent = `伝令が返事を待っている… ${elapsed}秒`;
  }, 1000);

  // フロント側タイムアウト（6秒で中断）
  const controller = new AbortController();
  const abort = setTimeout(() => controller.abort(), 6000);

  try {
    const result = await apiFetch('/battle/courier', { method: 'POST', signal: controller.signal });
    clearTimeout(abort);
    clearInterval(timer);
    if (result.ok) {
      setChallengeRow(row, 'done', `${result.elapsed_ms}ms で帰還`);
      finishChallenge(result.message);
    } else {
      setChallengeRow(row, 'failed', '帰ってこない');
      finishChallenge('伝令が帰ってこない…。pkg/server/service/courier.go の http.Client に Timeout を設定しよう。');
    }
  } catch (e) {
    clearTimeout(abort);
    clearInterval(timer);
    setChallengeRow(row, 'failed', '音信不通');
    finishChallenge('伝令は眠るギルドの前で立ち尽くしている…。pkg/server/service/courier.go の http.Client に Timeout: 2 * time.Second を設定しよう。');
  }
}

// ---- Lv21: 城門への突撃（セマフォによる同時実行数制限）----
async function tryAssaultChallenge(item) {
  const listEl = resetChallengeList();
  const row = addChallengeRow(listEl, '同時突撃数の最大', '突撃中...');
  try {
    const result = await apiFetch('/battle/assault', { method: 'POST' });
    if (result.ok) {
      setChallengeRow(row, 'done', `${result.peak}/${result.limit} 人`);
      finishChallenge('騎士たちは整然と門を抜けた！城門を制圧！');
    } else {
      setChallengeRow(row, 'failed', `${result.peak}/${result.limit} 人`);
      finishChallenge(`${result.peak}人が門に殺到して大渋滞だ…！pkg/server/service/assault.go — バッファ付きchannel（容量5）をセマフォにして同時実行数を制限しよう。`);
    }
  } catch (e) {
    setChallengeRow(row, 'failed', 'エラー');
    finishChallenge(`エラー: ${e.message}`);
  }
}

// ---- Lv24: 使い魔（context.WithCancel）----
async function tryFamiliarsChallenge(item) {
  const listEl = resetChallengeList();
  const row = addChallengeRow(listEl, '帰らない使い魔(goroutine)', '召喚中...');
  try {
    const result = await apiFetch('/battle/familiars', { method: 'POST' });
    if (result.ok) {
      setChallengeRow(row, 'done', `+${result.leaked} 体`);
      finishChallenge('使い魔たちは仕事を終えて全員帰宅した！');
    } else {
      setChallengeRow(row, 'failed', `+${result.leaked} 体`);
      finishChallenge(`${result.leaked} 体の使い魔が帰れずに働き続けている…。pkg/server/service/familiar.go — context.WithCancel で帰宅の合図を送れるようにしよう。`);
    }
  } catch (e) {
    setChallengeRow(row, 'failed', 'エラー');
    finishChallenge(`エラー: ${e.message}`);
  }
}

function showAdvancedHint(item) {
  openHintModal(item.lv, item.title, item.hint);
}

// チャレンジ画面の「ヒント」ボタン用。実行中のチャレンジのヒントを表示する
function showChallengeHint() {
  if (currentChallengeItem) showAdvancedHint(currentChallengeItem);
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
    // ルート未登録の場合、静的配信の GET /* があるため 405 が返る（404 のこともある）
    if (e.message.includes('404') || e.message.includes('405') || e.message.includes('Not Found') || e.message.includes('Method Not Allowed')) {
      msg.textContent = 'APIが見つかりません — pkg/server/handler/setting.go にルートを追加してください！';
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
  ['btn-attack', 'btn-skill'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = !enabled;
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// サーバーメモリ表示（Lv23用）。表示だけなのでサーバーログには残さない。
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
