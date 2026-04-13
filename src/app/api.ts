const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const USE_MOCK = !import.meta.env.VITE_API_URL && typeof window !== "undefined";

export interface Meeting {
  id: string;
  creator: string;
  location: string;
  dates: string[];
  created_at: string;
  participants: Participant[];
}

export interface Participant {
  id: number;
  name: string;
  selections: string[];
  preferred_place?: string;
  comment?: string;
  created_at: string;
}

export interface AiRecommendation {
  recommendedTimes: string[];
  recommendedPlace: string;
  oneLiner: string;
  comment: string;
  nearMissSuggestions?: NearMissSuggestion[];
}

export interface NearMissSuggestion {
  slot: string;
  availableCount: number;
  totalCount: number;
  missingPeople: string[];
  adjustmentHint: string;
}

export interface MeetingResult {
  meetingId: string;
  slotCounts: Record<string, number>;
  bestSlots: string[];
  ai: AiRecommendation;
  updatedAt: string;
}

// --- Mock Storage (localStorage 기반) ---
const MOCK_KEY = "bunggae_meetings";

function getMockStore(): Record<string, Meeting> {
  try {
    return JSON.parse(localStorage.getItem(MOCK_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveMockStore(store: Record<string, Meeting>) {
  localStorage.setItem(MOCK_KEY, JSON.stringify(store));
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 12);
}

// --- API Functions ---

export async function createMeeting(data: {
  creator: string;
  location: string;
  dates: string[];
}): Promise<{ id: string }> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 500));
    const id = generateId();
    const store = getMockStore();
    store[id] = {
      id,
      creator: data.creator,
      location: data.location,
      dates: data.dates,
      created_at: new Date().toISOString(),
      participants: [],
    };
    saveMockStore(store);
    return { id };
  }

  const res = await fetch(`${API_BASE}/meetings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("모임 생성 실패");
  return res.json();
}

export async function getMeeting(id: string): Promise<Meeting> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300));
    const store = getMockStore();
    const meeting = store[id];
    if (!meeting) throw new Error("모임을 찾을 수 없습니다");
    return meeting;
  }

  const res = await fetch(`${API_BASE}/meetings/${id}`);
  if (!res.ok) throw new Error("모임 조회 실패");
  return res.json();
}

export async function joinMeeting(
  id: string,
  data: { name: string; selections: string[]; preferredPlace?: string; comment?: string }
): Promise<void> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 500));
    const store = getMockStore();
    const meeting = store[id];
    if (!meeting) throw new Error("모임을 찾을 수 없습니다");
    meeting.participants.push({
      id: Date.now(),
      name: data.name,
      selections: data.selections,
      preferred_place: data.preferredPlace || "",
      comment: data.comment || "",
      created_at: new Date().toISOString(),
    });
    saveMockStore(store);
    return;
  }

  const res = await fetch(`${API_BASE}/meetings/${id}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("참여 실패");
}

export async function getMeetingResult(id: string): Promise<MeetingResult> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400));
    const store = getMockStore();
    const meeting = store[id];
    if (!meeting) throw new Error("모임을 찾을 수 없습니다");

    // 로컬 집계
    const slotCounts: Record<string, number> = {};
    for (const p of meeting.participants) {
      for (const slot of p.selections) {
        slotCounts[slot] = (slotCounts[slot] || 0) + 1;
      }
    }
    const maxCount = Math.max(0, ...Object.values(slotCounts));
    const bestSlots = Object.entries(slotCounts)
      .filter(([, c]) => c === maxCount)
      .map(([s]) => s);

    // Near-miss 분석: 최대 겹침보다 1명 적은 시간대 찾기
    const nearMissSuggestions: import("./api").NearMissSuggestion[] = [];
    const total = meeting.participants.length;
    if (total >= 2) {
      const nearMissSlots = Object.entries(slotCounts)
        .filter(([, c]) => c === maxCount - 1 && c > 0)
        .slice(0, 3);

      for (const [slot, count] of nearMissSlots) {
        const available = meeting.participants
          .filter((p) => p.selections.includes(slot))
          .map((p) => p.name);
        const missing = meeting.participants
          .filter((p) => !p.selections.includes(slot))
          .map((p) => p.name);

        // 빠진 사람의 가장 가까운 가능 시간 찾기
        const [slotDate, slotTime] = slot.split("|");
        const slotHour = parseInt(slotTime.split(":")[0]);
        let hint = "";
        for (const missingName of missing) {
          const person = meeting.participants.find((p) => p.name === missingName);
          if (!person) continue;
          const sameDaySlots = person.selections
            .filter((s) => s.startsWith(slotDate + "|"))
            .map((s) => s.split("|")[1]);
          if (sameDaySlots.length > 0) {
            const closest = sameDaySlots.reduce((prev, curr) => {
              const prevDiff = Math.abs(parseInt(prev.split(":")[0]) - slotHour);
              const currDiff = Math.abs(parseInt(curr.split(":")[0]) - slotHour);
              return currDiff < prevDiff ? curr : prev;
            });
            const diffMin = Math.abs(parseInt(closest.split(":")[0]) * 60 + parseInt(closest.split(":")[1]) - slotHour * 60 - parseInt(slotTime.split(":")[1]));
            hint = `${missingName}님이 ${diffMin}분만 조정하면 (${closest} 가능) 전원 참석!`;
          } else {
            hint = `${missingName}님은 ${slotDate}에 가능한 시간이 없어요`;
          }
        }

        nearMissSuggestions.push({
          slot,
          availableCount: count,
          totalCount: total,
          missingPeople: missing,
          adjustmentHint: hint,
        });
      }
    }

    return {
      meetingId: id,
      slotCounts,
      bestSlots,
      ai: {
        recommendedTimes: bestSlots.length > 0 ? bestSlots.slice(0, 3) : ["아직 데이터 부족"],
        recommendedPlace: meeting.location || "미정",
        oneLiner: bestSlots.length > 0
          ? `${bestSlots[0].split("|")[0]} ${bestSlots[0].split("|")[1]}, ${meeting.location || "장소 미정"}에서 만나요! ⚡`
          : "아직 참여자가 더 필요해요! 🙏",
        comment: `${meeting.participants.length}명이 응답했어요. (로컬 mock 모드)`,
        nearMissSuggestions: nearMissSuggestions.length > 0 ? nearMissSuggestions : undefined,
      },
      updatedAt: new Date().toISOString(),
    };
  }

  const res = await fetch(`${API_BASE}/meetings/${id}/result`);
  if (!res.ok) throw new Error("결과 조회 실패");
  return res.json();
}
