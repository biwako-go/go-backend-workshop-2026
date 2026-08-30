#!/bin/bash
# =============================================================
# Gopher Slayer 配布状態チェック（make dev-test）
#
# 全Lv（1〜28）のバグが「想定通りの壊れ方」をしているかを検証する。
# 講師がワークショップ配布前に実行する想定。
#   ✅ = バグが想定通りに再現している（配布OK）
#   ❌ = 想定と違う（修正済みのコードが残っている等）
#
# 注意:
# - テスト用サーバーを別ポート（デフォルト8098）で起動するので、
#   make start で起動中のサーバーとは共存できる
# - 事前に make up でDBを起動しておくこと
# - Lv25の検証でテスト用サーバーは意図的にクラッシュする（最後に実行）
# =============================================================
set -u
cd "$(dirname "$0")/.."

PORT="${DEV_TEST_PORT:-8098}"
API="http://localhost:$PORT/api"
CT='Content-Type: application/json'

pass=0
fail=0
results=""
ok() { results+="✅ $1"$'\n'; pass=$((pass + 1)); }
ng() { results+="❌ $1"$'\n'; fail=$((fail + 1)); }
jget() { python3 -c "import sys,json; print(json.load(sys.stdin)$1)" 2>/dev/null; }

echo "=== Gopher Slayer 配布状態チェック：全Lvのバグが想定通りか ==="

# --- テスト用サーバーを起動 ---
BUILD_DIR=$(mktemp -d)
SRV_PID=""
cleanup() {
  [ -n "$SRV_PID" ] && kill "$SRV_PID" 2>/dev/null
  rm -rf "$BUILD_DIR"
}
trap cleanup EXIT

echo "テスト用サーバーをビルド・起動中... (port $PORT)"
go build -o "$BUILD_DIR/server" ./cmd || { echo "ビルド失敗"; exit 1; }
PORT=$PORT "$BUILD_DIR/server" > "$BUILD_DIR/server.log" 2>&1 &
SRV_PID=$!
for i in $(seq 1 20); do
  curl -s -o /dev/null "$API/hero" && break
  sleep 1
done
if ! curl -s -o /dev/null "$API/hero"; then
  echo "サーバーが起動しません。make up でDBを起動していますか？"
  tail -5 "$BUILD_DIR/server.log"
  exit 1
fi
echo "起動OK。チェック開始（50秒ほどかかります）"
echo

# --- Lv1: 攻撃ダメージが0 ---
d=$(curl -s -X POST "$API/battle/attack" -H "$CT" -d '{"hero_attack":15,"enemy_name":"ゴブリン"}' | jget "['damage']")
[ "$d" = "0" ] && ok "Lv1  攻撃ダメージが0になる" || ng "Lv1  ダメージが $d 出ている（修正済み？）"

# --- Lv2: クリアしてもEXPがDBに保存されない ---
exp_before=$(curl -s "$API/hero" | jget "['experience']")
curl -s -o /dev/null -X POST "$API/stages/1/clear"
exp_after=$(curl -s "$API/hero" | jget "['experience']")
[ "$exp_before" = "$exp_after" ] && ok "Lv2  クリアしてもEXPがDBに保存されない" || ng "Lv2  EXPが保存されている（$exp_before → $exp_after）"

# --- Lv3: PUT /hero/hp が未登録（404/405）---
code=$(curl -s -o /dev/null -w '%{http_code}' -X PUT "$API/hero/hp" -H "$CT" -d '{"hp":100}')
{ [ "$code" = "404" ] || [ "$code" = "405" ]; } && ok "Lv3  PUT /hero/hp が未登録（HTTP ${code}）" || ng "Lv3  HTTP ${code} が返る（ルート追加済み？）"

# --- Lv4: デーモンへの攻撃が吸収される ---
msg=$(curl -s -X POST "$API/battle/attack" -H "$CT" -d '{"hero_attack":15,"enemy_name":"デーモン"}' | jget "['message']")
echo "$msg" | grep -q "攻撃が吸収された" && ok "Lv4  デーモンへの攻撃が反転する" || ng "Lv4  反転していない（修正済み？）"

# --- Lv5: ボスドラゴンの攻撃が遅い（4秒でタイムアウトさせて確認） ---
curl -s -o /dev/null --max-time 4 -X POST "$API/battle/enemy-attack" -H "$CT" -d '{"enemy_attack":50,"enemy_name":"ボスドラゴン","hero_hp":100}'
[ $? -eq 28 ] && ok "Lv5  ボスドラゴンの攻撃が4秒以上かかる" || ng "Lv5  すぐ返ってくる（修正済み？）"

# --- Lv6: 偵察結果が空っぽ（非公開フィールド） ---
body=$(curl -s -X POST "$API/battle/scout")
echo "$body" | grep -q '"name"' && ng "Lv6  偵察結果に名前が出ている（公開済み？）" || ok "Lv6  偵察結果が空っぽ（フィールド非公開）"

# --- Lv7: 鏡の鎧のHPが減らない（値レシーバ） ---
after=$(curl -s -X POST "$API/battle/mirror" | jget "['after']")
[ "$after" = "90" ] && ok "Lv7  攻撃してもHPが90のまま" || ng "Lv7  HPが $after になる（修正済み？）"

# --- Lv8: nil map への書き込みで panic ---
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/battle/loot")
[ "$code" = "500" ] && ok "Lv8  戦利品の回収で panic（500）" || ng "Lv8  HTTP $code が返る（make済み？）"

# --- Lv9: int8 オーバーフローで合計ダメージがおかしい ---
okv=$(curl -s -X POST "$API/battle/titan" | jget "['ok']")
[ "$okv" = "False" ] && ok "Lv9  合計ダメージがオーバーフローする" || ng "Lv9  合計が正しい（int化済み？）"

# --- Lv10: とどめを刺してもゾンビのHPが1残る ---
after=$(curl -s -X POST "$API/battle/finish" | jget "['after']")
[ "$after" = "1" ] && ok "Lv10 とどめを刺してもHPが1残る（不死身）" || ng "Lv10 残りHPが ${after} になる（修正済み？）"

# --- Lv11: 碑文が文字化け（バイト切断） ---
okv=$(curl -s -X POST "$API/battle/engrave" | jget "['ok']")
[ "$okv" = "False" ] && ok "Lv11 碑文が文字化けする（バイト切断）" || ng "Lv11 碑文が正常（rune化済み？）"

# --- Lv12: スライス共有で本体まで弱体化 ---
okv=$(curl -s -X POST "$API/battle/mirage" | jget "['ok']")
[ "$okv" = "False" ] && ok "Lv12 分身の弱体化が本体に伝染する" || ng "Lv12 本体が無傷（Clone済み？）"

# --- Lv13: mapの順序で隊列が毎回変わる ---
okv=$(curl -s -X POST "$API/battle/formation" | jget "['stable']")
[ "$okv" = "False" ] && ok "Lv13 隊列が毎回バラバラになる" || ng "Lv13 隊列が安定している（Sort済み？）"

# --- Lv14: 存在しないステージで panic ---
body=$(curl -s -X POST "$API/stages/999/clear")
echo "$body" | grep -q "Internal Server Error" && ok "Lv14 存在しないステージで panic（500）" || ng "Lv14 panic しない: $body"

# --- Lv15: rows.Close 忘れでDB接続がリーク ---
okv=$(curl -s -X POST "$API/battle/vault" | jget "['ok']")
[ "$okv" = "False" ] && ok "Lv15 宝物庫の扉（DB接続）が開きっぱなし" || ng "Lv15 接続がリークしない（Close済み？）"

# --- Lv16: 封印解除が5秒かかって408 ---
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/stages/5/challenge")
[ "$code" = "408" ] && ok "Lv16 封印解除がタイムアウト（408）" || ng "Lv16 HTTP $code が返る（並列化済み？）"

# --- Lv17: 群れ討伐の数がズレる ---
slain=$(curl -s -X POST "$API/battle/horde" | jget "['slain']")
[ "$slain" != "100" ] && ok "Lv17 討伐数がズレる（$slain/100）" || ng "Lv17 討伐数が100/100（Mutex追加済み？）"

# --- Lv18: 詠唱中断が固まる（3秒でタイムアウトさせて確認） ---
curl -s -o /dev/null --max-time 3 -X POST "$API/battle/interrupt"
[ $? -eq 28 ] && ok "Lv18 詠唱中断が3秒以上固まる" || ng "Lv18 すぐ返ってくる（select追加済み？）"

# --- Lv19: 依頼調査が直列3秒で408 ---
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/quests/gather")
[ "$code" = "408" ] && ok "Lv19 依頼調査がタイムアウト（408）" || ng "Lv19 HTTP $code が返る（errgroup化済み？）"

# --- Lv20: 伝令がタイムアウトせず帰ってこない（4秒で中断して確認） ---
curl -s -o /dev/null --max-time 4 -X POST "$API/battle/courier"
[ $? -eq 28 ] && ok "Lv20 伝令が帰ってこない（Timeout未設定）" || ng "Lv20 すぐ帰ってくる（Timeout設定済み？）"

# --- Lv21: 同時突撃数が制限されていない ---
okv=$(curl -s -X POST "$API/battle/assault" | jget "['ok']")
[ "$okv" = "False" ] && ok "Lv21 100人が城門に殺到する" || ng "Lv21 同時数が制限されている（セマフォ済み？）"

# --- Lv22: 敵の攻撃のたびに goroutine が増える ---
g_before=$(curl -s "$API/debug/memory" | jget "['num_goroutine']")
for i in 1 2 3 4 5; do
  curl -s -o /dev/null -X POST "$API/battle/enemy-attack" -H "$CT" -d '{"enemy_attack":0,"enemy_name":"ゴブリン","hero_hp":100}'
done
g_after=$(curl -s "$API/debug/memory" | jget "['num_goroutine']")
g_delta=$((g_after - g_before))
[ "$g_delta" -ge 5 ] && ok "Lv22 敵攻撃5回で goroutine +${g_delta}" || ng "Lv22 goroutine が増えない（+${g_delta}、リーク削除済み？）"

# --- Lv23: 攻撃のたびにメモリが5MB増える ---
heap_before=$(curl -s "$API/debug/memory" | jget "['heap_alloc_mb']")
for i in 1 2; do
  curl -s -o /dev/null -X POST "$API/battle/attack" -H "$CT" -d '{"hero_attack":15,"enemy_name":"ゴブリン"}'
done
heap_after=$(curl -s "$API/debug/memory" | jget "['heap_alloc_mb']")
delta=$((heap_after - heap_before))
[ "$delta" -ge 8 ] && ok "Lv23 攻撃2回でメモリ +${delta}MB" || ng "Lv23 メモリが増えない（+${delta}MB、リーク削除済み？）"

# --- Lv24: 使い魔が帰らない（context未使用） ---
okv=$(curl -s -X POST "$API/battle/familiars" | jget "['ok']")
[ "$okv" = "False" ] && ok "Lv24 使い魔が帰らず働き続ける" || ng "Lv24 使い魔が帰宅する（ctx済み？）"

# --- Lv26: 討伐報告書の作成が1秒超で408 ---
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/battle/report")
[ "$code" = "408" ] && ok "Lv26 報告書の作成がタイムアウト（408）" || ng "Lv26 HTTP $code が返る（Builder化済み？）"

# --- Lv27: 古文書の速読が2回目も遅くて408 ---
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/legend/speedread")
[ "$code" = "408" ] && ok "Lv27 2回目の解読も800msかかる（408）" || ng "Lv27 HTTP $code が返る（sync.Once済み？）"

# --- Lv28: 予言者に会心を全的中される（固定シード） ---
match=$(curl -s -X POST "$API/battle/prophecy" | jget "['all_match']")
[ "$match" = "True" ] && ok "Lv28 予言者に12回すべて的中される" || ng "Lv28 予言が外れた（all_match=$match、rand/v2化済み？）"

# --- Lv25: goroutine 内 panic でサーバーごと落ちる（最後に実行：テスト用サーバーが死ぬ） ---
curl -s -o /dev/null -X POST "$API/battle/defuse"
sleep 2
if ! curl -s -o /dev/null --max-time 2 "$API/hero"; then
  ok "Lv25 呪いの爆弾でサーバーごと落ちる"
else
  ng "Lv25 サーバーが生きている（recover追加済み？）"
fi
SRV_PID="" # すでに死んでいるので cleanup での kill は不要

# --- 結果 ---
echo "$results"
echo "=================================================="
echo "結果: ✅ $pass / ❌ $fail （全28項目）"
if [ "$fail" -gt 0 ]; then
  echo "❌ の項目は「バグが仕込まれていない（修正済みのコードが残っている）」可能性があります。"
  exit 1
fi
echo "すべてのバグが想定通りに仕込まれています。配布OK！"
