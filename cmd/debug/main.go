// 開発者向けデバッグコマンド: 指定したLvまで「クリアしたことにする」（参加者は使わない）。
//
//	make debug         # Lv42 まで（全クリア）
//	make debug LV=20   # Lv20 までクリア済み
//	make debug LV=0    # 未クリア（EXP 0）に戻す
//
// ヒーローのEXPを直接DBに書き込むので、サーバー（make start）は起動していなくてよい（DBは必要）。
// パスフレーズは平文で置かず、_frontend/debug-secret.json の暗号文
// （PBKDF2-SHA256 で導いた鍵の AES-GCM）を復号できるかで確かめる。画面の /?debug と同じファイル。
// パスフレーズは入力するか、環境変数 DEBUG_PASS で渡す。
package main

import (
	"bufio"
	"crypto/aes"
	"crypto/cipher"
	"crypto/pbkdf2"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"os"
	"os/exec"
	"strings"

	_ "github.com/go-sql-driver/mysql"
	"github.com/maropook/gopher-slayer/pkg/constant"
)

const secretPath = "_frontend/debug-secret.json"

// debugSecret は debug-secret.json の中身（暗号文と鍵導出のパラメータ）
type debugSecret struct {
	Iterations int    `json:"iterations"`
	Salt       string `json:"salt"`
	IV         string `json:"iv"`
	Data       string `json:"data"`
}

// debugConfig は復号した中身
type debugConfig struct {
	Magic string `json:"magic"`
}

func main() {
	lv := flag.Int("lv", 42, "このLvまでクリア済みにする（0 で未クリアに戻す）")
	flag.Parse()

	if err := run(*lv); err != nil {
		fmt.Fprintln(os.Stderr, "❌", err)
		os.Exit(1)
	}
}

func run(lv int) error {
	pass := os.Getenv("DEBUG_PASS")
	if pass == "" {
		var err error
		if pass, err = readPassphrase(); err != nil {
			return err
		}
	}
	if err := checkPassphrase(pass); err != nil {
		return err
	}

	cfg := constant.Load()
	db, err := sql.Open("mysql", cfg.DSN())
	if err != nil {
		return err
	}
	defer db.Close()
	if err := db.Ping(); err != nil {
		return fmt.Errorf("DBに接続できません（make up で起動してください）: %w", err)
	}

	exp, err := expForClearedThrough(db, lv)
	if err != nil {
		return err
	}
	if _, err := db.Exec(`UPDATE heroes SET experience = ? WHERE id = 1`, exp); err != nil {
		return err
	}
	if lv == 0 {
		fmt.Println("✅ EXPを0に戻しました。ブラウザをリロードしてください。")
	} else {
		fmt.Printf("✅ Lv%d までクリア済みにしました（EXP %d）。ブラウザをリロードしてください。\n", lv, exp)
	}
	return nil
}

// readPassphrase はパスフレーズを入力してもらう（画面には表示しない）
func readPassphrase() (string, error) {
	fmt.Print("パスフレーズ: ")
	// 入力を画面に出さない。stty が使えない環境ではそのまま表示される
	if setEcho(false) == nil {
		defer func() {
			setEcho(true)
			fmt.Println()
		}()
	}
	line, err := bufio.NewReader(os.Stdin).ReadString('\n')
	if err != nil && line == "" {
		return "", fmt.Errorf("パスフレーズを読み取れません: %w", err)
	}
	return strings.TrimRight(line, "\r\n"), nil
}

func setEcho(on bool) error {
	arg := "-echo"
	if on {
		arg = "echo"
	}
	cmd := exec.Command("stty", arg)
	cmd.Stdin = os.Stdin
	return cmd.Run()
}

// checkPassphrase は debug-secret.json の暗号文を復号できるかでパスフレーズを確かめる
func checkPassphrase(pass string) error {
	raw, err := os.ReadFile(secretPath)
	if err != nil {
		return fmt.Errorf("%s を読めません（リポジトリのルートで実行してください）: %w", secretPath, err)
	}
	var s debugSecret
	if err := json.Unmarshal(raw, &s); err != nil {
		return err
	}
	salt, err1 := base64.StdEncoding.DecodeString(s.Salt)
	iv, err2 := base64.StdEncoding.DecodeString(s.IV)
	data, err3 := base64.StdEncoding.DecodeString(s.Data)
	if err := errors.Join(err1, err2, err3); err != nil {
		return err
	}

	key, err := pbkdf2.Key(sha256.New, pass, salt, s.Iterations, 32)
	if err != nil {
		return err
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return err
	}
	plain, err := gcm.Open(nil, iv, data, nil)
	if err != nil {
		return errors.New("パスフレーズが違います") // 鍵が違うと AES-GCM の認証で失敗する
	}
	var c debugConfig
	if err := json.Unmarshal(plain, &c); err != nil || c.Magic != "gopher-slayer-debug" {
		return errors.New("パスフレーズが違います")
	}
	return nil
}

// expForClearedThrough は「LvN までクリア済み」に必要なEXPを返す（画面のデバッグパネルと同じ基準）。
// Lv1〜4 は次のステージの必要EXP、Lv5 は Lv6 の解放EXP、Lv6 以降は撃破後のEXP（解放EXP + 100）。
func expForClearedThrough(db *sql.DB, lv int) (int, error) {
	if lv <= 0 {
		return 0, nil
	}
	if lv <= 4 {
		var exp int
		err := db.QueryRow(`SELECT required_experience FROM stages WHERE order_num = ?`, lv+1).Scan(&exp)
		if err != nil {
			return 0, fmt.Errorf("Lv%d のステージがDBにありません: %w", lv+1, err)
		}
		return exp, nil
	}

	// チャレンジの敵は解放EXPの順に Lv6, Lv7, ... と並ぶ
	rows, err := db.Query(`SELECT unlock_exp FROM challenge_enemies ORDER BY unlock_exp`)
	if err != nil {
		return 0, err
	}
	defer rows.Close()
	var unlocks []int
	for rows.Next() {
		var u int
		if err := rows.Scan(&u); err != nil {
			return 0, err
		}
		unlocks = append(unlocks, u)
	}
	if err := rows.Err(); err != nil {
		return 0, err
	}

	maxLv := 5 + len(unlocks)
	if len(unlocks) == 0 || lv > maxLv {
		return 0, fmt.Errorf("Lv%d の敵がDBにありません（指定できるのは Lv0〜Lv%d。make reset-db で作り直せます）", lv, maxLv)
	}
	if lv == 5 {
		return unlocks[0], nil
	}
	return unlocks[lv-6] + 100, nil
}
