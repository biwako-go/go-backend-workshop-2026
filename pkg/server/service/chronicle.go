package service

import (
	"bytes"
	"log/slog"
)

// battleEvents は記録する討伐の内容。この変数は変更しなくてよい。
var battleEvents = []struct {
	enemy  string
	damage int
}{
	{"スライム", 12},
	{"ゴブリン", 18},
	{"コウモリ", 7},
}

// RecordBattle は戦闘の記録を、観客向けの掲示板（テキスト形式）とギルドの監査記録（JSON形式）の
// 両方に残し、それぞれの中身を返す。戻り値は（掲示板の中身, 監査記録の中身）。
//
// [Lv40 バグ仕込み箇所]
// 掲示板用と監査用の logger を別々に作り、毎回「両方に書く」やり方をしている。
// ところが「討伐」の記録だけ監査用に書き忘れていて、監査記録から討伐が抜け落ちている
// （2か所に書く運用は、いつか必ず書き忘れる）。
// Go 1.26 で追加された slog.NewMultiHandler を使うと、1つの logger に書くだけで、
// 複数のハンドラー（掲示板と監査記録）へ同時に書き出せる。
func RecordBattle() (board, audit string) {
	var boardBuf, auditBuf bytes.Buffer
	boardLog := slog.New(slog.NewTextHandler(&boardBuf, nil))
	auditLog := slog.New(slog.NewJSONHandler(&auditBuf, nil))

	boardLog.Info("戦闘開始", "stage", "東の洞窟")
	auditLog.Info("戦闘開始", "stage", "東の洞窟")
	for _, e := range battleEvents {
		boardLog.Info("討伐", "enemy", e.enemy, "damage", e.damage)
	}
	boardLog.Info("戦闘終了", "result", "勝利")
	auditLog.Info("戦闘終了", "result", "勝利")
	return boardBuf.String(), auditBuf.String()
}
