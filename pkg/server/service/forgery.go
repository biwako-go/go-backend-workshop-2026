package service

import "encoding/json"

// RewardClaim は冒険者がギルドに提出する報酬請求書。
type RewardClaim struct {
	Quest  string `json:"quest"`
	Reward int    `json:"reward"`
}

// ReadRewardClaim は提出された報酬請求書（JSON）を読み取る。
//
// [Lv33 バグ仕込み箇所]
// encoding/json（v1）には、互換性のために残っている「ゆるい」仕様がある。
//   - キー名の大文字・小文字を区別しない（"REWARD" も "Reward" も reward として読む）
//   - 同じキーが2回出てきてもエラーにせず、後から来た方で上書きする
//
// 偽造師Gopherはこれを悪用し、正規の "reward":100 の後ろに "REWARD":99999 を忍ばせてくる。
// Go 1.27 で正式に入った encoding/json/v2 は、大文字・小文字を区別し、重複したキーをエラーにする。
func ReadRewardClaim(data []byte) (RewardClaim, error) {
	var claim RewardClaim
	if err := json.Unmarshal(data, &claim); err != nil {
		return RewardClaim{}, err
	}
	return claim, nil
}
