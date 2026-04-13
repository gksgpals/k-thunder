import mysql from "mysql2/promise";
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 3,
  timezone: "+09:00",
});

const bedrock = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "ap-northeast-2",
});

async function askAI(prompt) {
  const command = new InvokeModelCommand({
    modelId: "amazon.nova-lite-v1:0",
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({
      messages: [{ role: "user", content: [{ text: prompt }] }],
      inferenceConfig: { maxTokens: 1024 },
    }),
  });

  const response = await bedrock.send(command);
  const result = JSON.parse(new TextDecoder().decode(response.body));
  return result.output.message.content[0].text;
}

function aggregateSlots(participants) {
  const slotCounts = {};
  for (const p of participants) {
    const sels =
      typeof p.selections === "string"
        ? JSON.parse(p.selections)
        : p.selections;
    for (const slot of sels) {
      slotCounts[slot] = (slotCounts[slot] || 0) + 1;
    }
  }
  const maxCount = Math.max(0, ...Object.values(slotCounts));
  const bestSlots = Object.entries(slotCounts)
    .filter(([, count]) => count === maxCount)
    .map(([slot]) => slot);

  return { slotCounts, bestSlots, maxCount };
}

function buildPrompt(meeting, participants, slotCounts, bestSlots, maxCount) {
  const participantLines = participants.map((p) => {
    const sels =
      typeof p.selections === "string"
        ? JSON.parse(p.selections)
        : p.selections;
    const place = p.preferred_place || "없음";
    return `- ${p.name}: 가능 시간 ${sels.length}개, 선호 장소: ${place}`;
  });

  const topSlots = Object.entries(slotCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([slot, count]) => `  ${slot}: ${count}/${participants.length}명`)
    .join("\n");

  const places = participants
    .map((p) => p.preferred_place)
    .filter(Boolean);

  return `너는 번개 모임 일정 조율 AI 비서야. 참여자들의 가능 시간과 선호 장소를 분석해서 최적의 만남 시간과 장소를 추천해줘.

## 모임 정보
- 모임 생성자: ${meeting.creator}
- 생성자가 제안한 장소: ${meeting.location || "미정"}
- 후보 날짜: ${(typeof meeting.dates === "string" ? JSON.parse(meeting.dates) : meeting.dates).join(", ")}
- 총 참여자: ${participants.length}명

## 참여자별 정보
${participantLines.join("\n")}

## 시간대별 겹침 (상위)
${topSlots}

## 최다 겹침
- ${maxCount}명이 겹치는 시간: ${bestSlots.join(", ")}

## 선호 장소 목록
${places.length > 0 ? places.join(", ") : "제출된 선호 장소 없음"}

---

다음 형식으로 한국어 답변해줘:

1. **추천 시간**: 가장 많은 사람이 모일 수 있는 시간대 1~3개를 추천하고, 연속된 시간이면 묶어서 "14:00~15:30" 형태로 표현해줘.
2. **추천 장소**: 선호 장소들을 종합해서 최적 장소를 추천해줘. 겹치는 장소가 있으면 우선, 없으면 중간 지점이나 접근성 좋은 곳을 제안해.
3. **한줄 요약**: 친근하고 재밌는 톤으로 "4/15 화 오후 2시, 강남역에서 만나요! 🔥" 같은 한줄 요약.
4. **참여 현황 코멘트**: 전체 참여율이나 특이사항을 짧게 코멘트.
5. **조정 제안 (nearMissSuggestions)**: 전원이 겹치는 시간이 없을 때, "1~2명만 30분~1시간 조정하면 전원 참석 가능한 시간대"를 최대 3개 찾아줘. 각 제안에 대해:
   - slot: 해당 시간대 (예: "4/15 화|14:00")
   - availableCount: 해당 시간에 가능한 인원 수
   - totalCount: 전체 참여자 수
   - missingPeople: 해당 시간에 불가능한 사람 이름 배열
   - adjustmentHint: "홍길동님이 30분만 조정하면 (14:30 가능) 전원 참석!" 같은 구체적 조정 안내

JSON으로 응답해줘:
{
  "recommendedTimes": ["추천 시간 문자열"],
  "recommendedPlace": "추천 장소",
  "oneLiner": "한줄 요약",
  "comment": "참여 현황 코멘트",
  "nearMissSuggestions": [
    {
      "slot": "날짜|시간",
      "availableCount": 2,
      "totalCount": 3,
      "missingPeople": ["이름"],
      "adjustmentHint": "조정 안내 문자열"
    }
  ]
}`;
}

export const handler = async (event) => {
  // Function URL은 body에 JSON 문자열로 전달
  const parsed = event.body ? JSON.parse(event.body) : event;
  const { meetingId } = parsed;

  if (!meetingId) {
    return { statusCode: 400, body: "meetingId is required" };
  }

  try {
    const [meetings] = await pool.execute(
      "SELECT * FROM meetings WHERE id = ?",
      [meetingId]
    );
    if (!meetings.length) {
      return { statusCode: 404, body: "Meeting not found" };
    }
    const meeting = meetings[0];

    const [participants] = await pool.execute(
      "SELECT name, selections, preferred_place FROM participants WHERE meeting_id = ?",
      [meetingId]
    );

    if (!participants.length) {
      return { statusCode: 200, body: JSON.stringify({ message: "참여자 없음" }) };
    }

    // 집계
    const { slotCounts, bestSlots, maxCount } = aggregateSlots(participants);

    // AI 분석
    const prompt = buildPrompt(meeting, participants, slotCounts, bestSlots, maxCount);
    let aiSummary;
    try {
      const aiResponse = await askAI(prompt);
      console.log("AI raw response:", aiResponse);
      // Claude/Nova 응답에서 JSON 추출
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        aiSummary = {
          recommendedTimes: parsed.recommendedTimes || bestSlots,
          recommendedPlace: parsed.recommendedPlace || meeting.location || "미정",
          oneLiner: parsed.oneLiner || `${bestSlots[0]}에 만나요!`,
          comment: parsed.comment || `${participants.length}명 참여`,
          nearMissSuggestions: parsed.nearMissSuggestions || [],
        };
      } else {
        throw new Error("JSON 파싱 실패");
      }
    } catch (aiErr) {
      console.warn("AI 분석 폴백:", aiErr.message);
      aiSummary = {
        recommendedTimes: bestSlots,
        recommendedPlace: meeting.location || "미정",
        oneLiner: `${bestSlots[0] || "시간 미정"}에 만나요! ⚡`,
        comment: `${participants.length}명이 응답했어요.`,
        _debug_error: aiErr.message + " | " + (aiErr.stack || "").slice(0, 200),
      };
    }

    // DB에 결과 저장 (UPSERT)
    await pool.execute(
      `INSERT INTO ai_results (meeting_id, slot_counts, best_slots, ai_summary)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         slot_counts = VALUES(slot_counts),
         best_slots  = VALUES(best_slots),
         ai_summary  = VALUES(ai_summary),
         created_at  = CURRENT_TIMESTAMP`,
      [
        meetingId,
        JSON.stringify(slotCounts),
        JSON.stringify(bestSlots),
        JSON.stringify(aiSummary),
      ]
    );

    const result = {
      meetingId,
      totalParticipants: participants.length,
      slotCounts,
      bestSlots,
      maxOverlap: maxCount,
      ai: aiSummary,
    };

    console.log("AI 집계 결과:", JSON.stringify(result));
    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (err) {
    console.error("집계 실패:", err);
    return { statusCode: 500, body: err.message };
  }
};
