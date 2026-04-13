import { Router } from "express";
import { nanoid } from "nanoid";
import pool from "../db/pool.js";
import { invokeAggregate } from "../lambda/invoke.js";

const router = Router();

// 번개 모임 생성
router.post("/", async (req, res) => {
  try {
    const { creator, location, dates } = req.body;

    if (!creator || !dates?.length) {
      return res.status(400).json({ error: "creator와 dates는 필수입니다." });
    }

    const id = nanoid(10);
    await pool.execute(
      "INSERT INTO meetings (id, creator, location, dates) VALUES (?, ?, ?, ?)",
      [id, creator, location || "", JSON.stringify(dates)]
    );

    res.status(201).json({ id });
  } catch (err) {
    console.error("모임 생성 실패:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

// 모임 정보 + 참여자 조회
router.get("/:id", async (req, res) => {
  try {
    const [meetings] = await pool.execute(
      "SELECT * FROM meetings WHERE id = ?",
      [req.params.id]
    );

    if (!meetings.length) {
      return res.status(404).json({ error: "모임을 찾을 수 없습니다." });
    }

    const meeting = meetings[0];
    const [participants] = await pool.execute(
      "SELECT id, name, selections, created_at FROM participants WHERE meeting_id = ? ORDER BY created_at",
      [req.params.id]
    );

    res.json({
      ...meeting,
      dates: typeof meeting.dates === "string" ? JSON.parse(meeting.dates) : meeting.dates,
      participants: participants.map((p) => ({
        ...p,
        selections: typeof p.selections === "string" ? JSON.parse(p.selections) : p.selections,
      })),
    });
  } catch (err) {
    console.error("모임 조회 실패:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

// 참여자 응답 제출
router.post("/:id/join", async (req, res) => {
  try {
    const { name, selections, preferredPlace } = req.body;

    if (!name || !selections?.length) {
      return res.status(400).json({ error: "name과 selections는 필수입니다." });
    }

    const [meetings] = await pool.execute(
      "SELECT id FROM meetings WHERE id = ?",
      [req.params.id]
    );
    if (!meetings.length) {
      return res.status(404).json({ error: "모임을 찾을 수 없습니다." });
    }

    await pool.execute(
      "INSERT INTO participants (meeting_id, name, selections, preferred_place) VALUES (?, ?, ?, ?)",
      [req.params.id, name, JSON.stringify(selections), preferredPlace || ""]
    );

    // Lambda 비동기 호출 (AI 집계)
    invokeAggregate(req.params.id).catch((err) =>
      console.error("Lambda 호출 실패:", err)
    );

    res.status(201).json({ success: true });
  } catch (err) {
    console.error("참여 실패:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

// AI 분석 결과 조회
router.get("/:id/result", async (req, res) => {
  try {
    const [results] = await pool.execute(
      "SELECT * FROM ai_results WHERE meeting_id = ?",
      [req.params.id]
    );

    if (!results.length) {
      return res.status(404).json({ error: "아직 분석 결과가 없습니다." });
    }

    const r = results[0];
    res.json({
      meetingId: r.meeting_id,
      slotCounts: typeof r.slot_counts === "string" ? JSON.parse(r.slot_counts) : r.slot_counts,
      bestSlots: typeof r.best_slots === "string" ? JSON.parse(r.best_slots) : r.best_slots,
      ai: typeof r.ai_summary === "string" ? JSON.parse(r.ai_summary) : r.ai_summary,
      updatedAt: r.created_at,
    });
  } catch (err) {
    console.error("결과 조회 실패:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

export default router;
