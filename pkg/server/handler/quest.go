package handler

import (
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/maropook/gopher-slayer/pkg/server/service"
)

type QuestHandler struct{}

func NewQuestHandler() *QuestHandler {
	return &QuestHandler{}
}

// Gather はギルドの依頼調査をまとめて行う。
// 2秒以内に全報告書が揃わないと受付が閉まってしまう。
// POST /api/quests/gather
func (h *QuestHandler) Gather(c echo.Context) error {
	start := time.Now()
	reports, err := service.GatherQuestReports()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}
	if time.Since(start) > 2*time.Second {
		return c.JSON(http.StatusRequestTimeout, map[string]string{
			"error": "調査が遅すぎてギルドの受付が閉まってしまった！2秒以内に全報告書を揃えよう",
		})
	}
	return c.JSON(http.StatusOK, map[string]interface{}{
		"message": "全報告書が揃った！ギルドの信頼を得た！",
		"reports": reports,
	})
}
