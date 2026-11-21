// ============================================================
// Gopher Slayer - Frontend Battle State Machine
// ============================================================
// HP state is managed client-side during battle.
// The server only calculates damage values.
// ============================================================

const API = '/api';

// ---- Global State ----
let hero = null;          // fetched from server
let sessionExp = 0;       // このセッション中に稼いだEXP（リロードで消える＝Lv2の症状）
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
    hint: '症状: 不死のゾンビにとどめを刺してもHPが1残って立ち上がってくる。\npkg/server/service/undead.go の FinishingBlow にバグがある。\nおすすめ: undead_test.go にテストケースを追加して見つけよう。\n\nコマンド:\ngo test ./pkg/server/service/ -run TestFinishingBlow -v',
    action: 'finish',
    condition: 'とどめの一撃で残りHPが <strong>0</strong> になること（1残ると復活してしまう）',
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
    condition: '宝物庫を8回覗いても扉（DB接続）が <strong>閉まっている</strong> こと',
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
    go: '1.22', // このレベルで学ぶ新機能が入ったGoのバージョン（キャッチアップモードの対象判定にも使う）
    title: '予言者に打ち勝て',
    hint: '症状: 予言者に会心の一撃の行方をすべて予知されてしまう（乱数が予測可能＝チート可能）。\npkg/server/service/battle.go の RollCritical が古い math/rand を固定シードで使っている。\nGo 1.22 の math/rand/v2 に移行しよう（criticalRNG 変数を消して rand.IntN(4) == 0 と書くだけ）。',
    action: 'prophecy',
    condition: '予言者に会心の行方を <strong>読まれない</strong> こと（12回の会心予知と勝負）',
    img: '/images/gopher-enemies/gopher-ice.png',
  },
  // ---- Lv29〜Lv33: 最新のGo（Go 1.23〜1.27 の新機能を1バージョン1レベルで）----
  {
    lv: 'Lv29',
    go: '1.23',
    title: '骸骨兵の行進を止めろ',
    hint: '症状: 骸骨王を倒して break したのに行進が止まらず、サーバーで panic が起きる。\npkg/server/service/march.go の SkeletonMarch（Go 1.23 の range-over-func イテレータ）が yield の戻り値を無視している。\nyield が false を返す＝呼び出し側が break した合図。if !yield(s) { return } で行進を止めよう。',
    action: 'march',
    condition: '骸骨王を倒したら行進が <strong>ぴたりと止まる</strong> こと（panicしない）',
    img: '/images/gopher-enemies/gopher-zombie.png',
  },
  {
    lv: 'Lv30',
    go: '1.24',
    title: '禁書庫を守り抜け',
    hint: '症状: 禁書泥棒のGopherに「../forbidden/禁呪の書.txt」や書庫内の「抜け道」経由で禁書を持ち出される（パストラバーサル）。\npkg/server/service/library.go の LendScroll が、利用者の指定した名前をそのまま filepath.Join して読んでいる。\nGo 1.24 の os.OpenRoot で書庫を開き、root.ReadFile（Go 1.25〜）で読もう。名前の文字列チェックだけでは「抜け道」（シンボリックリンク）は防げない。',
    action: 'library',
    condition: '書庫の巻物は貸し出し、<strong>禁書は1冊も持ち出させない</strong> こと',
    img: '/images/gopher-enemies/gopher-ghost.png',
  },
  {
    lv: 'Lv31',
    go: '1.25',
    title: '援軍を揃えて出陣せよ',
    hint: '症状: 援軍10部隊の到着を待ってから出陣するはずが、ほとんどの出陣で援軍を置き去りにしている（たまに揃う回があるのが厄介）。\npkg/server/service/reinforce.go — wg.Add(1) を goroutine の中で呼んでいるため、wg.Wait() が先に終わってしまう。\nまず go vet ./... で指摘を確認し、Go 1.25 の wg.Go(func() { ... }) で書き直そう。',
    action: 'reinforce',
    condition: '10回の出陣すべてで <strong>援軍10部隊の到着を待つ</strong> こと',
    img: '/images/gopher-enemies/gopher-demon.png',
  },
  {
    lv: 'Lv32',
    go: '1.26',
    title: '結界の弱点を見抜け',
    hint: '症状: 結界に弾かれたエラーに弱点が書いてあるのに読み取れず、3層とも破れない。\npkg/server/service/barrier.go の BreakBarriers — err.(*BarrierError) の型アサーションは、fmt.Errorf の %w で包まれたエラーには効かない。\nGo 1.26 の errors.AsType[*BarrierError](err) で、包みの中から取り出そう。',
    action: 'barrier',
    condition: '3層の結界すべての <strong>弱点を見抜いて</strong> 破ること',
    img: '/images/gopher-enemies/gopher-ice.png',
  },
  {
    lv: 'Lv33',
    go: '1.27',
    title: '偽造された請求書を見破れ',
    hint: '症状: 報酬100Gの依頼なのに、偽造師Gopherの請求書を読むと 99999G 支払ってしまう。\npkg/server/service/forgery.go の ReadRewardClaim — encoding/json（v1）はキーの大文字・小文字を区別せず（"REWARD" も reward として読む）、重複したキーは後勝ちで上書きする。\nGo 1.27 で正式に入った encoding/json/v2 に import を変えよう（json.Unmarshal の呼び方はそのまま）。',
    action: 'forgery',
    condition: '正規の請求書には100Gを支払い、<strong>偽造された請求書には騙されない</strong> こと',
    img: '/images/gopher-enemies/gopher-psycho.png',
  },
  // ---- Lv34〜Lv36: 最新のGo 2周目（Go 1.26〜1.27）----
  {
    lv: 'Lv34',
    go: '1.26',
    title: 'ものまねミミックの鑑定書を正せ',
    hint: '症状: 鑑定書のボーナスが、どの宝も「賢者の石」と同じ100になっている（ものまねミミックの仕業）。\npkg/server/service/appraise.go の AppraiseTreasures — ループの外で1つだけ宣言した変数 bonus のアドレス（&bonus）を全部の宝に渡しているので、どの宝も同じ変数を指している。\nGo 1.26 から new に式を渡せる。Bonus: new(t.value * 2) で、宝ごとに別の変数を作ろう。',
    action: 'appraise',
    condition: '宝ごとのボーナスが <strong>基本価値の2倍</strong> になっていること（呪いの指輪はボーナスなし）',
    img: '/images/gopher-enemies/gopher-magma.png',
  },
  {
    lv: 'Lv35',
    go: '1.27',
    title: 'なりすましGopherを締め出せ',
    hint: '症状: 冒険者100人を続けて登録すると登録番号がほとんど重複していて、なりすましGopherに他人の番号を名乗られる。\npkg/server/service/roster.go の IssueAdventurerID が、登録した時刻（ミリ秒）をそのまま番号にしている。\nGo 1.27 で標準ライブラリに入った uuid パッケージの uuid.NewV7() を使おう（v7 は発行順に並ぶ。uuid.New() の v4 は順番がバラバラ）。',
    action: 'roster',
    condition: '100人の登録番号が <strong>重複せず、登録順に並ぶ</strong> こと',
    img: '/images/gopher-enemies/gopher-demon.png',
  },
  {
    lv: 'Lv36',
    go: '1.27',
    title: '置き去りの伝書鳩を救え',
    hint: '症状: 伝書鳩を飛ばすたびに、間に合わなかった鳩が誰もいない野営地で永遠に待ちぼうけになる（goroutineリーク）。\nGo 1.27 で標準になった goroutineleak プロファイルで、止まっている場所を確かめよう:\ncurl http://localhost:8080/api/debug/goroutineleak\npkg/server/service/pigeon.go の SendPigeons — 返事を受け取る channel にバッファがないので、受け取り手がいないと送信で止まる。',
    action: 'pigeon',
    condition: '100msで出発しても、<strong>待ちぼうけの鳩（goroutineリーク）を残さない</strong> こと',
    img: '/images/gopher-enemies/gopher-ghost.png',
  },
  // ---- Lv37〜Lv42: 最新のGo 3周目（Go 1.25〜1.27 を2レベルずつ）----
  {
    lv: 'Lv37',
    go: '1.25',
    title: '地図喰いGopherの罠を見抜け',
    hint: '症状: 地図喰いGopherに食べられて存在しない地図を開こうとすると、サーバーで panic が起きる（nil pointer dereference）。\npkg/server/service/oldmap.go の ReadTreasureMap — os.Open の err を確かめる前に、ファイル f を使っている（f.Name()）。\nGo 1.24 までは、たまたま動いているように見えることがあったが、Go 1.25 でコンパイラのバグが直り、正しく panic するようになった。err を先に確かめよう。',
    action: 'oldmap',
    condition: '存在しない地図を開いても <strong>panic せずにエラーで知らせる</strong> こと',
    img: '/images/gopher-enemies/gopher-zombie.png',
  },
  {
    lv: 'Lv38',
    go: '1.25',
    title: '偽りの使者の送金を止めろ',
    hint: '症状: 偽りの使者のサイトに仕込まれたフォームから、ギルドの金庫の送金が実行されてしまう（CSRF）。\npkg/server/service/treasury.go の NewTreasuryHandler — どこのサイトから来たリクエストでも送金している。\nGo 1.25 の http.NewCrossOriginProtection() でハンドラーを包むと、別サイトからの POST を 403 で拒否できる（ブラウザ以外からのリクエストは通る）。',
    action: 'treasury',
    condition: '<strong>別サイトからの送金だけを拒否</strong> し、正しい送金は通すこと',
    img: '/images/gopher-enemies/gopher-psycho.png',
  },
  {
    lv: 'Lv39',
    go: '1.26',
    title: '天空の砦へ伝令を届けろ',
    hint: '症状: IPv6 アドレスの「天空の砦」宛ての URL だけが壊れていて、伝令が出発できない（Go 1.26 に上げたら動かなくなった）。\npkg/server/service/fortress.go の FortressStatusURL — ホストとポートを ":" でつないでいるので、IPv6 だと "http://2001:db8::10:8443/status" になる。\nGo 1.26 から net/url は角かっこなしのコロン入りホストをエラーにする。net.JoinHostPort で "[2001:db8::10]:8443" の形にしよう。',
    action: 'fortress',
    condition: '3つの砦すべてに <strong>正しく読める URL</strong> で伝令を送ること',
    img: '/images/gopher-enemies/gopher-ice.png',
  },
  {
    lv: 'Lv40',
    go: '1.26',
    title: '監査官の言いがかりを封じろ',
    hint: '症状: ギルドの監査記録に「討伐」の記録が1件もなく、言いがかりの監査官に「討伐していない」と言われてしまう。\npkg/server/service/chronicle.go の RecordBattle — 掲示板用と監査用の logger に毎回両方書いているが、討伐だけ監査用に書き忘れている。\nGo 1.26 の slog.NewMultiHandler で、1つの logger から両方のハンドラーへ同時に書き出そう。',
    action: 'chronicle',
    condition: '掲示板と監査記録の <strong>両方に討伐の記録が3件ずつ</strong> 残ること',
    img: '/images/gopher-enemies/gopher-demon.png',
  },
  {
    lv: 'Lv41',
    go: '1.27',
    title: '本物の勅書を見抜け',
    hint: '症状: 本文に「--」を含む王の勅書が、署名を読み違えて偽物と判定されてしまう（偽りの大臣の思うつぼ）。\npkg/server/service/decree.go の ReadDecree — strings.Cut は「最初の」区切りで切る。署名は最後の「--」の後ろにある。\nGo 1.27 で追加された strings.CutLast を使おう。',
    action: 'decree',
    condition: '本物の勅書は <strong>本文と署名を正しく読み取り</strong>、偽物は退けること',
    img: '/images/gopher-enemies/gopher-ghost.png',
  },
  {
    lv: 'Lv42',
    go: '1.27',
    title: '道具袋の爆弾を見分けろ',
    hint: '症状: 道具袋から回復薬を飲もうとすると、袋に紛れた爆弾を回復薬と決め打ちして panic する（interface conversion）。\npkg/server/service/satchel.go — Take が any を返すので、使う側が .(Potion) と型アサーションしている。\nGo 1.27 からメソッドにも型パラメータを付けられる。Take を func (s *Satchel) Take[T any](name string) (T, bool) にして、s.Take[Potion](name) で取り出そう。',
    action: 'satchel',
    condition: '回復薬だけを飲んで <strong>合計180回復</strong> し、爆弾は飲まないこと',
    img: '/images/gopher-enemies/gopher-magma.png',
  },
];

// ---- 最新Goキャッチアップ（Go 1.25〜1.27 の新機能のレベルだけを選んで挑戦するモード）----
// 本編のEXPに関係なく挑戦でき、クリアしてもEXPは増えない（本編の進行を壊さないため）。
// クリア状況はブラウザ（localStorage）に記録する。対象は ADVANCED_CHALLENGES の go で決まる。
const CATCHUP_VERSIONS = ['1.25', '1.26', '1.27'];
const MODE_STORAGE_KEY = 'gopher-slayer:mode';
const CATCHUP_CLEARS_STORAGE_KEY = 'gopher-slayer:catchup-clears';
let catchupMode = false; // true: キャッチアップモード / false: 本編
let catchupClears = [];  // キャッチアップでクリアしたLv（例: 'Lv31'）

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
    hint: 'ダークナイト（攻撃120）は素のHP100では一撃でGAME OVER。\nHP編集で盛ってから挑もう（700以上推奨）。\n\npkg/server/handler/setting.go にルート登録が必要です。\napi.PUT("/hero/hp", hero.UpdateHP) を追加すると\nHP編集ボタンが使えるようになります。',
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

  // Lv2: DBに保存されていないセッション中のEXPがあれば警告バッジを出す
  const unsaved = sessionExp - h.experience;
  const badge = document.getElementById('cc-exp-unsaved');
  if (badge) badge.textContent = unsaved > 0 ? ` +${unsaved} 未保存🐛` : '';

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
    // DBに保存されているEXPが正。セッションEXPはリロードでここまで戻る
    sessionExp = Math.max(sessionExp, hero.experience);

    await loadChallengeEnemies();
    const stages = await apiFetch('/stages');
    lastStages = stages;
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
  updateModeButtons();
  if (catchupMode) {
    renderCatchupList();
    return;
  }
  const container = document.getElementById('stage-list');
  container.innerHTML = '';

  // ---- ステージ section ----
  container.appendChild(makeSectionHeader('ステージ', 'stage-section-header'));

  // セッションEXPで解放できるのは「DB基準で最初に🔒になるステージ」1つだけ。
  // 前のステージをクリアした直後に次へは進めるが、EXPがDBに保存されない限り
  // （= Lv2を直さない限り）その先のステージは開かない。リロードでもDB基準に戻る。
  const firstLocked = stages.find(st => !st.is_unlocked);

  stages.forEach(stage => {
    const sessionUnlocked = firstLocked && stage.id === firstLocked.id
      && sessionExp >= stage.required_experience;
    const unlocked = stage.is_unlocked || sessionUnlocked;
    const card = document.createElement('div');
    card.className = 'stage-card' + (unlocked ? '' : ' locked');

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
      <div class="stage-arrow">${unlocked ? '▶' : '🔒'}</div>
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

    if (unlocked) {
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
    container.appendChild(makeChallengeCard(item, unlocked, beaten, `必要EXP: ${item.db.unlock_exp}`));
  });
}

// チャレンジのカードを作る（本編・キャッチアップ共通）
function makeChallengeCard(item, unlocked, beaten, reqText) {
  const card = document.createElement('div');
  card.className = 'stage-card' + (unlocked ? '' : ' locked');
  const goBadge = item.go ? `<span class="go-badge">Go ${item.go}</span>` : '';
  card.innerHTML = `
    <img class="stage-icon" src="${item.img}" alt="" />
    <div class="stage-info">
      <div class="stage-lv">${item.lv}${goBadge}</div>
      <div class="stage-name">${item.title}</div>
      <div class="stage-req">${item.db.name}（HP ${item.db.max_hp}）${reqText ? '／' + reqText : ''}</div>
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
  return card;
}

// ============================================================
// 最新Goキャッチアップ（Go 1.25〜1.27 のレベルだけを選んで挑戦するモード）
// ============================================================

// URLパラメータ（?mode=catchup / ?mode=story）と localStorage から、モードとクリア状況を読み込む
function loadCatchupState() {
  const requested = new URLSearchParams(location.search).get('mode');
  try {
    if (requested === 'catchup' || requested === 'story') {
      localStorage.setItem(MODE_STORAGE_KEY, requested);
      history.replaceState(null, '', location.pathname); // 以降はボタンでの切り替えを優先する
    }
    catchupMode = localStorage.getItem(MODE_STORAGE_KEY) === 'catchup';
    const saved = JSON.parse(localStorage.getItem(CATCHUP_CLEARS_STORAGE_KEY) || '[]');
    catchupClears = Array.isArray(saved) ? saved : [];
  } catch (e) {
    // localStorage が使えない環境では URL パラメータだけで決め、クリア状況はこのタブの間だけ持つ
    catchupMode = requested === 'catchup';
  }
}

function saveCatchupState() {
  try {
    localStorage.setItem(MODE_STORAGE_KEY, catchupMode ? 'catchup' : 'story');
    localStorage.setItem(CATCHUP_CLEARS_STORAGE_KEY, JSON.stringify(catchupClears));
  } catch (e) {
    // 保存できなくてもゲームは続けられる
  }
}

// モード切り替えボタン: on=true でキャッチアップ、false で本編
function setCatchupMode(on) {
  if (catchupMode === on) return;
  catchupMode = on;
  saveCatchupState();
  goToStageSelect();
}

function updateModeButtons() {
  const storyBtn = document.getElementById('mode-story-btn');
  const catchupBtn = document.getElementById('mode-catchup-btn');
  if (storyBtn) storyBtn.classList.toggle('active', !catchupMode);
  if (catchupBtn) catchupBtn.classList.toggle('active', catchupMode);
}

// キャッチアップの対象レベル（Go 1.25〜1.27 の新機能）を、バージョン順・Lv順に返す
function catchupItems() {
  const lvNum = item => parseInt(item.lv.slice(2), 10);
  return ADVANCED_CHALLENGES
    .filter(item => CATCHUP_VERSIONS.includes(item.go))
    .sort((a, b) => CATCHUP_VERSIONS.indexOf(a.go) - CATCHUP_VERSIONS.indexOf(b.go) || lvNum(a) - lvNum(b));
}

// キャッチアップでクリア済みか（本編で撃破済みのレベルもクリア扱い）
function isCatchupCleared(item) {
  if (catchupClears.includes(item.lv)) return true;
  return !!(hero && item.db && hero.experience >= item.db.unlock_exp + 100);
}

function renderCatchupList() {
  const container = document.getElementById('stage-list');
  container.innerHTML = '';
  container.appendChild(makeSectionHeader('最新Goキャッチアップ（Go 1.25〜1.27）', 'catchup-section-header'));

  const items = catchupItems();
  const available = items.filter(item => item.db); // DBに敵がいるレベルだけ挑戦できる
  const cleared = available.filter(isCatchupCleared).length;
  const note = document.createElement('div');
  note.className = 'catchup-note';
  note.innerHTML =
    'Go 1.25〜1.27 の新機能を学べるレベルだけを、EXPに関係なく好きな順に挑戦できる。' +
    'クリアしてもEXPは増えない（本編の進行には影響しない）。' +
    `<strong>クリア ${cleared}/${available.length}</strong>`;
  container.appendChild(note);
  if (available.length < items.length) {
    const warn = document.createElement('div');
    warn.className = 'catchup-note catchup-warn';
    warn.textContent = '一部のレベルの敵がDBにありません。make reset-db でDBを作り直してください（ゲームの進捗はリセットされます）。';
    container.appendChild(warn);
  }

  CATCHUP_VERSIONS.forEach(ver => {
    const group = available.filter(item => item.go === ver);
    if (group.length === 0) return;
    container.appendChild(makeSectionHeader(`Go ${ver}`, 'catchup-version-header'));
    group.forEach(item => container.appendChild(makeChallengeCard(item, true, isCatchupCleared(item), '')));
  });
}

// ============================================================
// 開発者向けデバッグモード（/?debug のときだけパネルを表示する）
// ============================================================
// 指定したLvまで「クリアしたことにする」ための動作確認用。参加者向けの機能ではない。
// パスフレーズは平文で置かず、PBKDF2(SHA-256) で導いた鍵の AES-GCM 暗号文だけを
// debug-secret.json に持つ（make debug の cmd/debug も同じファイルを読む）。
// 復号できた = パスフレーズが正しい。パスフレーズは講師・開発者に確認すること。
const DEBUG_UNLOCK_KEY = 'gopher-slayer:debug-config'; // 解錠済みの設定（このタブの間だけ保持）
let debugConfig = null; // 復号した設定。null = 未解錠
let lastStages = [];    // 最後に取得したステージ一覧（Lv1〜5 の必要EXPを引くため）

function b64ToBytes(s) {
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

// パスフレーズで debug-secret.json の暗号文を復号する。間違っていれば null
async function decryptDebugSecret(pass) {
  try {
    const secret = await (await fetch('/debug-secret.json')).json();
    const subtle = crypto.subtle;
    const base = await subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
    const key = await subtle.deriveKey(
      { name: 'PBKDF2', salt: b64ToBytes(secret.salt), iterations: secret.iterations, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const plain = await subtle.decrypt(
      { name: 'AES-GCM', iv: b64ToBytes(secret.iv) }, key, b64ToBytes(secret.data));
    const config = JSON.parse(new TextDecoder().decode(plain));
    return config.magic === 'gopher-slayer-debug' ? config : null;
  } catch (e) {
    return null; // 鍵が違うと AES-GCM の認証で失敗する
  }
}

// ?debug が付いていればパネルを出す。このタブで解錠済みなら操作部分も出す
function initDebugMode() {
  const panel = document.getElementById('debug-panel');
  if (!panel) return;
  let saved = null;
  try {
    saved = JSON.parse(sessionStorage.getItem(DEBUG_UNLOCK_KEY) || 'null');
  } catch (e) {
    // sessionStorage が使えなければ毎回解錠する
  }
  if (!new URLSearchParams(location.search).has('debug') && !saved) return;
  panel.hidden = false;
  if (saved) {
    debugConfig = saved;
    showDebugControls();
  }
}

async function unlockDebugMode(event) {
  event.preventDefault();
  const input = document.getElementById('debug-pass');
  setDebugMsg('解錠中……');
  const config = await decryptDebugSecret(input.value);
  input.value = '';
  if (!config) {
    setDebugMsg('パスフレーズが違います');
    return;
  }
  debugConfig = config;
  try {
    sessionStorage.setItem(DEBUG_UNLOCK_KEY, JSON.stringify(config));
  } catch (e) {
    // 保存できなくてもこのページの間は使える
  }
  showDebugControls();
  setDebugMsg('解錠しました');
}

function lockDebugMode() {
  debugConfig = null;
  try {
    sessionStorage.removeItem(DEBUG_UNLOCK_KEY);
  } catch (e) {
    // 何もしない
  }
  document.getElementById('debug-panel').hidden = true;
  history.replaceState(null, '', location.pathname);
}

function showDebugControls() {
  document.getElementById('debug-lock').hidden = true;
  document.getElementById('debug-controls').hidden = false;
  const select = document.getElementById('debug-level');
  if (select.options.length === 0) {
    select.add(new Option('Lv0（未クリアに戻す）', '0'));
    for (let n = 1; n <= 42; n++) select.add(new Option(`Lv${n}`, String(n)));
    select.value = '42';
  }
}

function setDebugMsg(text) {
  document.getElementById('debug-msg').textContent = text;
}

// 「LvN までクリア済み」に必要なEXP（= LvN+1 の解放EXP。Lv42 は撃破後のEXP）
function debugExpForClearedThrough(n) {
  if (n <= 0) return 0;
  const challenge = lv => ADVANCED_CHALLENGES.find(item => item.lv === `Lv${lv}`);
  if (n <= 4) {
    const next = lastStages.find(st => st.order_num === n + 1);
    if (!next) throw new Error(`Lv${n + 1} のステージがDBにありません`);
    return next.required_experience;
  }
  if (n === 5) {
    const lv6 = challenge(6);
    if (!lv6 || !lv6.db) throw new Error('Lv6 の敵がDBにありません');
    return lv6.db.unlock_exp;
  }
  const item = challenge(n);
  if (!item || !item.db) throw new Error(`Lv${n} の敵がDBにありません`);
  return item.db.unlock_exp + 100;
}

// 選んだLvまでクリアしたことにする（EXPをDBに保存する。PUT /api/hero/experience）
async function debugClearThrough() {
  if (!debugConfig) return;
  const n = parseInt(document.getElementById('debug-level').value, 10);
  try {
    const target = debugExpForClearedThrough(n);
    await apiFetch('/hero/experience', {
      method: 'PUT',
      body: JSON.stringify({ experience: target }),
    });
    sessionExp = target; // 戻す場合もあるので max ではなく上書きする
    await goToStageSelect();
    setDebugMsg(n === 0 ? 'EXPを0に戻しました' : `Lv${n} までクリア済みにしました（EXP ${target}）`);
  } catch (e) {
    setDebugMsg('失敗しました: ' + e.message);
  }
}

// キャッチアップの全レベルをクリア済みにする / クリア記録を消す（localStorage）
function debugSetCatchupClears(clearAll) {
  if (!debugConfig) return;
  catchupClears = clearAll ? catchupItems().map(item => item.lv) : [];
  saveCatchupState();
  goToStageSelect();
  setDebugMsg(clearAll ? 'キャッチアップを全クリア済みにしました' : 'キャッチアップのクリア記録を消しました');
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

    // セッション内EXPを加算（Lv2未修正でもこのセッション中は次のステージへ進める）
    sessionExp += result.experience_gained;

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

  // HPを最大値まで全回復させる（専用の蘇生API。Lv3の修正状況に関係なく動く）
  try {
    await apiFetch('/hero/revive', { method: 'POST' });
    hero = await apiFetch('/hero');
    updateCharCard(hero);
    heroHP = hero.hp;
  } catch (e) {
    // 回復に失敗しても進行は続行する
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
    // Lv2: EXPがDBに保存されていない場合は、見出しごと「バグ発見」の演出にする
    // （hero はクリア直後に GET /api/hero で取り直したDB上の値）
    const unsaved = hero && clearResult && hero.experience < clearResult.new_experience;
    if (unsaved) {
      icon.textContent = '🐛';
      title.textContent = 'クリア…できたはず？';
      title.className = 'result-title lose';
    } else {
      icon.textContent = '🏆';
      title.textContent = 'クリア！';
      title.className = 'result-title win';
    }
    detail.innerHTML = `
      Stage: <strong>${currentStage.name}</strong><br>
      EXP獲得: <strong>+${clearResult.experience_gained}</strong><br>
      合計EXP: <strong>${clearResult.new_experience}</strong>
    `;
    if (unsaved) {
      detail.innerHTML += `
        <div class="exp-warning">
          🐛 <strong>バグ発見！</strong> 敵は倒したのに、EXPがサーバー（DB）に保存されていない＝<strong>システム上はクリアになっていない</strong>。<br>
          このまま先へ進めるが、<strong>リロードすると進捗がすべて消えてしまう</strong>。<br>
          → これが <strong>Lv2</strong> の課題。pkg/server/handler/stage.go の ClearStage を修正しよう
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
    march: tryMarchChallenge,
    library: tryLibraryChallenge,
    reinforce: tryReinforceChallenge,
    barrier: tryBarrierChallenge,
    forgery: tryForgeryChallenge,
    appraise: tryAppraiseChallenge,
    roster: tryRosterChallenge,
    pigeon: tryPigeonChallenge,
    oldmap: tryOldMapChallenge,
    treasury: tryTreasuryChallenge,
    fortress: tryFortressChallenge,
    chronicle: tryChronicleChallenge,
    decree: tryDecreeChallenge,
    satchel: trySatchelChallenge,
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
  document.getElementById('challenge-condition').innerHTML =
    `<strong>${item.lv} ${item.title}</strong>` + '<br>' + item.condition;
  document.getElementById('challenge-dialog').textContent = `${item.db.name} が あらわれた！`;
  document.getElementById('challenge-back-btn').disabled = false;
  document.getElementById('challenge-attack-btn').disabled = false;

  // 敵（奥）: DBの challenge_enemies の情報を表示する
  const sprite = document.getElementById('challenge-enemy-sprite');
  const nameEl = document.getElementById('challenge-enemy-name');
  sprite.classList.remove('defeated', 'rage');
  sprite.src = item.img;
  nameEl.textContent = item.db.name;
  updateChallengeHP(item.db.max_hp, item.db.max_hp);

  // 味方（手前）: ヒーローのステータスを表示する
  if (hero) {
    document.getElementById('challenge-hero-name').textContent = hero.name;
    document.getElementById('challenge-hero-lv').textContent = hero.level;
    const pct = Math.max(0, Math.min(100, (hero.hp / hero.max_hp) * 100));
    document.getElementById('challenge-hero-hp').textContent = `${hero.hp}/${hero.max_hp}`;
    document.getElementById('challenge-hero-hp-fill').style.width = pct + '%';
  }

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
async function finishChallenge(message) {
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
    }
    setTimeout(() => sprite.classList.add('defeated'), 500); // HPが削れてから倒れる
    if (catchupMode) {
      // キャッチアップモード: EXPは増やさず、クリアだけを記録する（本編の進行を壊さないため）
      if (currentChallengeItem && !catchupClears.includes(currentChallengeItem.lv)) {
        catchupClears.push(currentChallengeItem.lv);
        saveCatchupState();
      }
      prefix += 'クリアを記録した！ ';
    } else if (db && hero && hero.experience < db.unlock_exp + 100) {
      // 初回撃破ならEXP+100（次のチャレンジが解放される）。
      // 付与がDBに保存されたのを確認してから表示する（Lv2と同じ「表示と保存のズレ」を作らないため）
      const awarded = await awardChallengeExp(currentChallengeItem);
      prefix += awarded ? 'EXP +100！ ' : '⚠️ EXPの付与に失敗（もう一度たたかうと再付与される） ';
    }
  }
  document.getElementById('challenge-dialog').textContent = prefix + message;

  // 勝利したら、撃破演出を見せてからリザルト画面へ（ステージクリアと同じ流れ）
  if (hasDone && !hasFailed && db) {
    setTimeout(() => showChallengeResult(db), 1800);
  }
}

// チャレンジ勝利のリザルト画面（ステージと同じ result-screen を使う）
function showChallengeResult(db) {
  // すでに「にげる」等で画面を離れていたら何もしない
  if (!document.getElementById('challenge-screen').classList.contains('active')) return;
  showScreen('result-screen');
  document.getElementById('result-icon').textContent = '🏆';
  const title = document.getElementById('result-title');
  title.textContent = 'チャレンジクリア！';
  title.className = 'result-title win';
  if (catchupMode) {
    const available = catchupItems().filter(item => item.db);
    const cleared = available.filter(isCatchupCleared).length;
    document.getElementById('result-detail').innerHTML = `
      <strong>${db.name}</strong> を討伐した！<br>
      キャッチアップ: <strong>${cleared}/${available.length}</strong> クリア<br>
      ${cleared >= available.length ? 'Go 1.25〜1.27 キャッチアップ完了！おめでとう！🎉' : '次はどの新機能に挑戦する？'}
    `;
    return;
  }
  const allCleared = hero && hero.experience >= 4200; // Lv42撃破でEXP4200
  document.getElementById('result-detail').innerHTML = `
    <strong>${db.name}</strong> を討伐した！<br>
    合計EXP: <strong>${hero ? hero.experience : '-'}</strong><br>
    ${allCleared ? '全チャレンジ制覇！おめでとう！🎉' : '次のチャレンジが解放された！'}
  `;
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
    return hero.experience >= target; // DBに保存されたことを確認できたら true
  } catch (e) {
    return false;
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
    // panic（500 Internal Server Error）なら失敗。それ以外のエラー応答なら
    // 「正しくエラーを返せている」ので成功（メッセージの文言は問わない）
    const panicked = e.message.includes('Internal Server Error') || e.message.includes('HTTP 5');
    const noResponse = e.message.includes('応答なし') || e.message.includes('タイムアウト');
    if (!panicked && !noResponse) {
      setChallengeRow(row, 'done', '正常なエラー');
      finishChallenge(`番人は静かに首を振った。「そのステージはまだ存在しない」——サーバーは正しくエラーを返した！（${e.message}）`);
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

// ---- Lv10: 不死身の呪い（FinishingBlow）----
async function tryFinishChallenge(item) {
  const listEl = resetChallengeList();
  const row = addChallengeRow(listEl, 'とどめの一撃後のHP', '判定中...');

  try {
    const result = await apiFetch('/battle/finish', { method: 'POST' });
    if (result.ok) {
      setChallengeRow(row, 'done', `${result.before} → 0`);
      finishChallenge('とどめが通った！ゾンビは今度こそ倒れた！不死身の呪いは解けた！');
    } else {
      setChallengeRow(row, 'failed', `${result.before} → ${result.after} で復活`);
      finishChallenge(
        `とどめを刺してもHPが ${result.after} 残って立ち上がってくる…不死身の呪いだ！pkg/server/service/undead.go の FinishingBlow を直そう（undead_test.go にテストを書いて見つけるのがおすすめ）。`
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
      finishChallenge(`8回覗いたら扉が ${result.leaked} 枚も開きっぱなしだ…！pkg/server/repository/enemy.go の PeekVault に defer rows.Close() を入れよう。⚠️ リークした接続は戻らないので、再挑戦しすぎてゲームが不調になったら Ctrl+C → make start で再起動。`);
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

// ---- Lv29: 骸骨兵の行進（range-over-func イテレータ / Go 1.23）----
async function tryMarchChallenge(item) {
  const listEl = resetChallengeList();
  const defeatRow = addChallengeRow(listEl, '骸骨王までの迎撃', '迎撃中...');
  const stopRow = addChallengeRow(listEl, '王を倒したら行進が止まる', '確認中...');
  try {
    const result = await apiFetch('/battle/march', { method: 'POST' });
    if (result.ok) {
      setChallengeRow(defeatRow, 'done', `${result.defeated.length}体 撃破`);
      setChallengeRow(stopRow, 'done', '止まった！');
      finishChallenge(`骸骨王が倒れ、行進はぴたりと止まった！残党は崩れ去った！（${result.defeated.join('→')}）`);
    } else if (result.panic) {
      // break のあとも yield を呼び続けて panic した（判定ハンドラーが panic の中身を返してくれる）
      setChallengeRow(defeatRow, 'done', '骸骨王 撃破');
      setChallengeRow(stopRow, 'failed', 'panic!');
      finishChallenge(
        `骸骨王を倒して break したのに、行進が止まらない！（panic: ${result.panic}）pkg/server/service/march.go の SkeletonMarch — yield が false を返したら return して行進を止めよう。`
      );
    } else {
      const n = (result.defeated || []).length;
      setChallengeRow(defeatRow, 'failed', `${n}体 撃破`);
      setChallengeRow(stopRow, 'failed', '止まらない');
      finishChallenge(
        `骸骨王のところで行進が止まっていない…（${n}体と戦った）。pkg/server/service/march.go の SkeletonMarch を直そう（RepelSkeletonMarch は変更しなくてよい）。`
      );
    }
  } catch (e) {
    setChallengeRow(defeatRow, 'failed', 'エラー');
    setChallengeRow(stopRow, 'failed', 'エラー');
    finishChallenge(`エラー: ${e.message}`);
  }
}

// ---- Lv30: 禁書庫の番（os.Root / Go 1.24）----
const LIBRARY_REQUESTS = ['薬草の図鑑.txt', '../forbidden/禁呪の書.txt', '抜け道/禁呪の書.txt'];

async function tryLibraryChallenge(item) {
  const listEl = resetChallengeList();
  const rows = {};
  LIBRARY_REQUESTS.forEach(name => { rows[name] = addChallengeRow(listEl, name, '審査中...'); });
  try {
    const result = await apiFetch('/battle/library', { method: 'POST' });
    LIBRARY_REQUESTS.forEach(name => {
      const r = result.requests.find(req => req.name === name);
      if (!r) {
        // シンボリックリンクを作れない環境では「抜け道」の検査は省かれる
        setChallengeRow(rows[name], null, '検査省略');
      } else if (r.forbidden) {
        setChallengeRow(rows[name], r.ok ? 'done' : 'failed', r.ok ? '断った' : '盗まれた');
      } else {
        setChallengeRow(rows[name], r.ok ? 'done' : 'failed', r.ok ? '貸した' : '読めない');
      }
    });
    if (result.ok) {
      finishChallenge('禁書泥棒の小細工はすべて見破った！書庫の外へは一歩も出られない！');
    } else if (result.requests.some(r => r.forbidden && !r.ok)) {
      finishChallenge(
        '禁書『禁呪の書』を書庫の外から持ち出された！pkg/server/service/library.go の LendScroll — 名前をそのまま filepath.Join すると「..」や抜け道（シンボリックリンク）で外に出られる。Go 1.24 の os.OpenRoot で書庫の外に出られないようにしよう。'
      );
    } else {
      finishChallenge('禁書は守れたが、書庫の巻物まで貸し出せなくなっている…。「薬草の図鑑.txt」はちゃんと読めるようにしよう。');
    }
  } catch (e) {
    Object.values(rows).forEach(r => setChallengeRow(r, 'failed', 'エラー'));
    finishChallenge(`エラー: ${e.message}`);
  }
}

// ---- Lv31: 援軍の点呼（sync.WaitGroup.Go / Go 1.25）----
async function tryReinforceChallenge(item) {
  const listEl = resetChallengeList();
  const fullRow = addChallengeRow(listEl, '援軍が揃った出陣', '出陣中...');
  const arrivalRow = addChallengeRow(listEl, '各出陣の到着部隊', '点呼中...');
  try {
    const result = await apiFetch('/battle/reinforce', { method: 'POST' });
    const arrivals = result.arrivals.join(' ');
    if (result.ok) {
      setChallengeRow(fullRow, 'done', `${result.full}/${result.sorties}回`);
      setChallengeRow(arrivalRow, 'done', arrivals);
      finishChallenge('援軍10部隊が毎回そろってから出陣！魔王軍の包囲網を打ち破った！');
    } else {
      setChallengeRow(fullRow, 'failed', `${result.full}/${result.sorties}回`);
      setChallengeRow(arrivalRow, 'failed', arrivals);
      finishChallenge(
        `援軍を置き去りにして出陣してしまった！（各出陣の到着部隊: ${arrivals}）たまに揃う回があるのが並行処理のバグの厄介なところ。go vet ./... の指摘を確認し、pkg/server/service/reinforce.go を Go 1.25 の wg.Go で書き直そう。`
      );
    }
  } catch (e) {
    setChallengeRow(fullRow, 'failed', 'エラー');
    setChallengeRow(arrivalRow, 'failed', 'エラー');
    finishChallenge(`エラー: ${e.message}`);
  }
}

// ---- Lv32: 結界の弱点（errors.AsType / Go 1.26）----
const BARRIER_NAMES = ['氷の結界', '炎の結界', '闇の結界'];

async function tryBarrierChallenge(item) {
  const listEl = resetChallengeList();
  const rows = BARRIER_NAMES.map(name => addChallengeRow(listEl, name, '詠唱中...'));
  try {
    const result = await apiFetch('/battle/barrier', { method: 'POST' });
    result.results.forEach((r, i) => {
      if (!rows[i]) return;
      if (r.broken) {
        setChallengeRow(rows[i], 'done', `弱点「${r.weakness}」で粉砕！`);
      } else {
        setChallengeRow(rows[i], 'failed', r.weakness ? `「${r.weakness}」でも弾かれた` : '弱点が読めない');
      }
    });
    if (result.ok) {
      finishChallenge('エラーの包みを開いて弱点を見抜いた！3層の結界をすべて打ち砕いた！');
    } else {
      finishChallenge(
        '弾かれたエラーに弱点が書いてあるのに、読み取れない…！pkg/server/service/barrier.go の BreakBarriers — err.(*BarrierError) は %w で包まれたエラーには効かない。Go 1.26 の errors.AsType で包みの中から取り出そう。'
      );
    }
  } catch (e) {
    rows.forEach(r => setChallengeRow(r, 'failed', 'エラー'));
    finishChallenge(`エラー: ${e.message}`);
  }
}

// ---- Lv33: 偽造された請求書（encoding/json/v2 / Go 1.27）----
const FORGERY_LABELS = ['正規の請求書', '大文字キーの偽造', '重複キーの偽造'];

async function tryForgeryChallenge(item) {
  const listEl = resetChallengeList();
  const rows = FORGERY_LABELS.map(label => addChallengeRow(listEl, label, '審査中...'));
  try {
    const result = await apiFetch('/battle/forgery', { method: 'POST' });
    result.reviews.forEach((r, i) => {
      if (!rows[i]) return;
      setChallengeRow(rows[i], r.ok ? 'done' : 'failed', r.rejected ? '受付拒否' : `${r.paid}G 支払い`);
    });
    const fooled = result.reviews.filter(r => r.forged && !r.ok);
    if (result.ok) {
      finishChallenge('偽造の手口をすべて見破った！支払ったのは正規の報酬100Gだけだ！');
    } else if (fooled.length > 0) {
      const paid = Math.max(...fooled.map(r => r.paid));
      finishChallenge(
        `報酬100Gの依頼なのに ${paid}G も支払ってしまった！encoding/json（v1）はキーの大文字・小文字を区別せず、重複したキーは後勝ちで上書きする。pkg/server/service/forgery.go の import を Go 1.27 の encoding/json/v2 に変えよう。`
      );
    } else {
      finishChallenge('偽造は見破れたが、正規の請求書まで受け付けなくなっている…。正しい請求書には100Gを支払おう。');
    }
  } catch (e) {
    rows.forEach(r => setChallengeRow(r, 'failed', 'エラー'));
    finishChallenge(`エラー: ${e.message}`);
  }
}

// ---- Lv34: ものまねミミックの鑑定書（new(式) / Go 1.26）----
const APPRAISE_TREASURES = ['古びた剣', '呪いの指輪', '竜のうろこ', '賢者の石'];

async function tryAppraiseChallenge(item) {
  const listEl = resetChallengeList();
  const rows = {};
  APPRAISE_TREASURES.forEach(name => { rows[name] = addChallengeRow(listEl, name, '鑑定中...'); });
  try {
    const result = await apiFetch('/battle/appraise', { method: 'POST' });
    const bonusText = b => (b === null || b === undefined) ? 'ボーナスなし' : `ボーナス ${b}`;
    result.treasures.forEach(t => {
      if (rows[t.name]) setChallengeRow(rows[t.name], t.ok ? 'done' : 'failed', bonusText(t.bonus));
    });
    if (result.ok) {
      finishChallenge('宝ごとに正しいボーナスが付いた！ものまねミミックの化けの皮がはがれた！');
    } else {
      finishChallenge(
        'どの宝のボーナスも同じ値をものまねしている…！pkg/server/service/appraise.go の AppraiseTreasures — 全部の宝が同じ変数 bonus を指している。Go 1.26 の new(式) で、宝ごとに別の変数を作ろう。'
      );
    }
  } catch (e) {
    Object.values(rows).forEach(r => setChallengeRow(r, 'failed', 'エラー'));
    finishChallenge(`エラー: ${e.message}`);
  }
}

// ---- Lv35: なりすましGopher（uuid / Go 1.27）----
async function tryRosterChallenge(item) {
  const listEl = resetChallengeList();
  const dupRow = addChallengeRow(listEl, '登録番号の重複', '登録中...');
  const orderRow = addChallengeRow(listEl, '登録順に並ぶ', '確認中...');
  try {
    const result = await apiFetch('/battle/roster', { method: 'POST' });
    setChallengeRow(dupRow, result.duplicates === 0 ? 'done' : 'failed', `${result.duplicates}/${result.total}人`);
    setChallengeRow(orderRow, result.ordered ? 'done' : 'failed', result.ordered ? '並んでいる' : 'バラバラ');
    const sample = (result.samples || []).join(' / ');
    if (result.ok) {
      finishChallenge(`登録番号はすべて別々で、登録順に並んでいる！なりすましGopherは締め出された！（例: ${result.samples[0]}）`);
    } else if (result.duplicates > 0) {
      finishChallenge(
        `100人中 ${result.duplicates}人の登録番号が他の冒険者とかぶっている…（例: ${sample}）pkg/server/service/roster.go — 時刻（ミリ秒）だけの番号は、同じミリ秒の登録で重複する。Go 1.27 の uuid.NewV7() を使おう。`
      );
    } else {
      finishChallenge(
        `重複はなくなったが、登録番号が登録順に並んでいない（例: ${sample}）。uuid.New() の v4 は完全なランダム。先頭に時刻が入る uuid.NewV7() を使おう。`
      );
    }
  } catch (e) {
    setChallengeRow(dupRow, 'failed', 'エラー');
    setChallengeRow(orderRow, 'failed', 'エラー');
    finishChallenge(`エラー: ${e.message}`);
  }
}

// ---- Lv36: 置き去りの伝書鳩（goroutineleak プロファイル / Go 1.27）----
async function tryPigeonChallenge(item) {
  const listEl = resetChallengeList();
  const replyRow = addChallengeRow(listEl, '間に合った返事', '待機中...');
  const departRow = addChallengeRow(listEl, '出発までの時間', '計測中...');
  const leakRow = addChallengeRow(listEl, '待ちぼうけの鳩', '検出中...');
  try {
    const result = await apiFetch('/battle/pigeons', { method: 'POST' });
    const quick = result.elapsed_ms < 200;
    setChallengeRow(replyRow, 'done', `${(result.replies || []).length}/${result.towers}羽`);
    setChallengeRow(departRow, quick ? 'done' : 'failed', `${result.elapsed_ms}ms`);
    setChallengeRow(leakRow, result.leaked === 0 ? 'done' : 'failed', `${result.leaked}羽`);
    if (result.ok) {
      finishChallenge('遅れて戻った鳩も、返事を置いて帰っていった！待ちぼうけの亡霊は消え去った！');
    } else if (!quick) {
      finishChallenge(
        `出発が遅すぎる（${result.elapsed_ms}ms）。全部の鳩を待つのではなく、100msで出発したまま、遅れた鳩が返事を置いて帰れるようにしよう。`
      );
    } else {
      const where = result.where ? `${result.where} で` : '';
      finishChallenge(
        `${result.leaked}羽の鳩が返事を渡せずに永遠に待ちぼうけ…！Go 1.27 の goroutineleak プロファイルが、${where}止まったままの goroutine を見つけた。pkg/server/service/pigeon.go の SendPigeons — 受け取り手がいなくても返事を置いて帰れるようにしよう。`
      );
    }
  } catch (e) {
    [replyRow, departRow, leakRow].forEach(r => setChallengeRow(r, 'failed', 'エラー'));
    finishChallenge(`エラー: ${e.message}`);
  }
}

// ---- Lv37: 地図喰いGopher（err を確かめる前に結果を使う / Go 1.25 の nil チェック修正）----
async function tryOldMapChallenge(item) {
  const listEl = resetChallengeList();
  const caveRow = addChallengeRow(listEl, '東の洞窟の地図', '解読中...');
  const ruinRow = addChallengeRow(listEl, '西の遺跡の地図（消失）', '解読中...');
  try {
    const result = await apiFetch('/battle/oldmap', { method: 'POST' });
    const cave = result.reads.find(r => r.exists);
    const ruin = result.reads.find(r => !r.exists);
    setChallengeRow(caveRow, cave && cave.ok ? 'done' : 'failed', cave && cave.ok ? '読めた' : '読めない');
    const ruinStatus = ruin && ruin.panic ? 'panic!' : (ruin && ruin.ok ? 'エラーで報告' : '異常');
    setChallengeRow(ruinRow, ruin && ruin.ok ? 'done' : 'failed', ruinStatus);
    if (result.ok) {
      finishChallenge('失われた地図は、エラーで正しく知らされた！地図喰いGopherの罠を見抜いた！');
    } else if (ruin && ruin.panic) {
      finishChallenge(
        `存在しない地図を開いたとたんに panic！（${ruin.panic}）pkg/server/service/oldmap.go の ReadTreasureMap — err を確かめる前に f を使っている。Go 1.25 からこの書き方は正しく panic する。os.Open の直後に err を確かめよう。`
      );
    } else {
      finishChallenge('地図の読み取りがおかしい…。存在する地図は読めて、存在しない地図はエラーになるようにしよう。');
    }
  } catch (e) {
    setChallengeRow(caveRow, 'failed', 'エラー');
    setChallengeRow(ruinRow, 'failed', 'エラー');
    finishChallenge(`エラー: ${e.message}`);
  }
}

// ---- Lv38: 偽りの使者（http.CrossOriginProtection / Go 1.25）----
const TREASURY_ATTEMPTS = ['ギルドの窓口から', '偽りの使者のサイトから', 'ブラウザ以外の道具から'];

async function tryTreasuryChallenge(item) {
  const listEl = resetChallengeList();
  const rows = TREASURY_ATTEMPTS.map(label => addChallengeRow(listEl, label, '送金中...'));
  try {
    const result = await apiFetch('/battle/treasury', { method: 'POST' });
    result.attempts.forEach((a, i) => {
      if (!rows[i]) return;
      const status = a.allow ? (a.sent ? '送金した' : '止められた') : (a.sent ? '送金された！' : '拒否した');
      setChallengeRow(rows[i], a.ok ? 'done' : 'failed', status);
    });
    const csrf = result.attempts.find(a => !a.allow);
    if (result.ok) {
      finishChallenge('別サイトからの送金だけを門前払いにした！偽りの使者のたくらみは失敗した！');
    } else if (csrf && csrf.sent) {
      finishChallenge(
        `偽りの使者のサイトから送金されてしまった！（金庫の残高 ${result.gold}G）pkg/server/service/treasury.go の NewTreasuryHandler — Go 1.25 の http.NewCrossOriginProtection() でハンドラーを包もう。`
      );
    } else {
      finishChallenge('偽りの使者は止めたが、正しい送金まで止めてしまっている…。別サイトからの送金だけを拒否しよう。');
    }
  } catch (e) {
    rows.forEach(r => setChallengeRow(r, 'failed', 'エラー'));
    finishChallenge(`エラー: ${e.message}`);
  }
}

// ---- Lv39: 天空の砦（net/url の厳しくなったホスト検査 / Go 1.26）----
const FORTRESS_NAMES = ['王都の砦', '東の砦', '天空の砦（IPv6）'];

async function tryFortressChallenge(item) {
  const listEl = resetChallengeList();
  const rows = FORTRESS_NAMES.map(name => addChallengeRow(listEl, name, '伝令準備中...'));
  try {
    const result = await apiFetch('/battle/fortress', { method: 'POST' });
    result.dispatches.forEach((d, i) => {
      if (!rows[i]) return;
      setChallengeRow(rows[i], d.ok ? 'done' : 'failed', d.ok ? '届いた' : (d.error ? 'URLが壊れている' : '宛先違い'));
    });
    const broken = result.dispatches.find(d => !d.ok);
    if (result.ok) {
      finishChallenge('IPv6 の天空の砦にも伝令が届いた！アドレスは角かっこで正しく囲まれている！');
    } else {
      finishChallenge(
        `${broken.name}への伝令の URL が読めない！（${broken.url}）Go 1.26 から net/url は、角かっこで囲まれていないコロン入りのホストをエラーにする。pkg/server/service/fortress.go の FortressStatusURL で net.JoinHostPort を使おう。`
      );
    }
  } catch (e) {
    rows.forEach(r => setChallengeRow(r, 'failed', 'エラー'));
    finishChallenge(`エラー: ${e.message}`);
  }
}

// ---- Lv40: 監査官の言いがかり（slog.NewMultiHandler / Go 1.26）----
async function tryChronicleChallenge(item) {
  const listEl = resetChallengeList();
  const boardRow = addChallengeRow(listEl, '掲示板（テキスト）', '記録中...');
  const auditRow = addChallengeRow(listEl, '監査記録（JSON）', '記録中...');
  try {
    const result = await apiFetch('/battle/chronicle', { method: 'POST' });
    const boardOK = result.board_kills === result.want;
    const auditOK = result.audit_kills === result.want && result.audit_broken === 0;
    setChallengeRow(boardRow, boardOK ? 'done' : 'failed', `討伐 ${result.board_kills}/${result.want}件`);
    setChallengeRow(auditRow, auditOK ? 'done' : 'failed', `討伐 ${result.audit_kills}/${result.want}件`);
    if (result.ok) {
      finishChallenge('掲示板にも監査記録にも、討伐がもれなく残った！監査官は何も言えずに引き下がった！');
    } else if (!auditOK) {
      finishChallenge(
        `監査記録に討伐の記録が ${result.audit_kills}件しかない！「討伐していないのでは？」と言いがかりをつけられた…。pkg/server/service/chronicle.go の RecordBattle — Go 1.26 の slog.NewMultiHandler で、1つの logger から両方へ書き出そう。`
      );
    } else {
      finishChallenge(`監査記録はそろったが、掲示板の討伐の記録が ${result.board_kills}件しかない。両方に同じ記録を残そう。`);
    }
  } catch (e) {
    setChallengeRow(boardRow, 'failed', 'エラー');
    setChallengeRow(auditRow, 'failed', 'エラー');
    finishChallenge(`エラー: ${e.message}`);
  }
}

// ---- Lv41: 本物の勅書（strings.CutLast / Go 1.27）----
async function tryDecreeChallenge(item) {
  const listEl = resetChallengeList();
  const rows = ['勅書その1', '勅書その2', '勅書その3'].map(label => addChallengeRow(listEl, label, '鑑定中...'));
  try {
    const result = await apiFetch('/battle/decree', { method: 'POST' });
    result.checks.forEach((ch, i) => {
      if (!rows[i]) return;
      const status = ch.genuine ? (ch.ok ? '本物と確認' : '偽物と誤判定') : (ch.ok ? '偽物を退けた' : '偽物を受理！');
      setChallengeRow(rows[i], ch.ok ? 'done' : 'failed', status);
    });
    const wrong = result.checks.find(ch => !ch.ok);
    if (result.ok) {
      finishChallenge('本物の勅書はすべて受け入れ、偽物は見抜いた！偽りの大臣のたくらみは崩れ去った！');
    } else if (wrong.genuine) {
      finishChallenge(
        `本物の王の勅書「${wrong.decree}」の署名を「${wrong.signer}」と読み違えた！pkg/server/service/decree.go の ReadDecree — strings.Cut は最初の「--」で切る。Go 1.27 の strings.CutLast で、最後の「--」で切ろう。`
      );
    } else {
      finishChallenge(`偽物の勅書を受け入れてしまった…（${wrong.decree}）。署名が「ゴーファー王」の勅書だけを受け入れよう。`);
    }
  } catch (e) {
    rows.forEach(r => setChallengeRow(r, 'failed', 'エラー'));
    finishChallenge(`エラー: ${e.message}`);
  }
}

// ---- Lv42: 道具袋の爆弾（ジェネリックメソッド / Go 1.27）----
async function trySatchelChallenge(item) {
  const listEl = resetChallengeList();
  const healRow = addChallengeRow(listEl, '回復薬だけ飲む', '確認中...');
  const bombRow = addChallengeRow(listEl, '爆弾は飲まない', '確認中...');
  try {
    const result = await apiFetch('/battle/satchel', { method: 'POST' });
    if (result.ok) {
      setChallengeRow(healRow, 'done', `${result.healed} 回復`);
      setChallengeRow(bombRow, 'done', 'よけた');
      finishChallenge('回復薬だけを選んで飲み、爆弾には手を出さなかった！爆弾Gopherは不発に終わった！');
    } else if (result.panic) {
      setChallengeRow(healRow, 'failed', '中断');
      setChallengeRow(bombRow, 'failed', '爆発！');
      finishChallenge(
        `袋の中の爆弾を回復薬だと決め打ちして panic！（${result.panic}）pkg/server/service/satchel.go — Go 1.27 のジェネリックメソッドで Take[T any](name string) (T, bool) にして、s.Take[Potion](name) で安全に取り出そう。`
      );
    } else {
      setChallengeRow(healRow, 'failed', `${result.healed} 回復`);
      setChallengeRow(bombRow, 'done', 'よけた');
      finishChallenge(`回復量が ${result.healed} になっている（正しくは ${result.want}）。袋の回復薬はすべて飲もう。`);
    }
  } catch (e) {
    setChallengeRow(healRow, 'failed', 'エラー');
    setChallengeRow(bombRow, 'failed', 'エラー');
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
window.onload = () => {
  initDebugMode();    // /?debug のときだけ開発者向けデバッグパネルを出す
  loadCatchupState(); // 本編 / 最新Goキャッチアップ のどちらで始めるか
  goToStageSelect();
};
