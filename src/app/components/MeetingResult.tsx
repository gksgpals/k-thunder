import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Sparkles, Clock, MapPin, Users, RefreshCw, Zap, AlertTriangle } from "lucide-react";
import type { MeetingResult as MeetingResultType, Meeting } from "../api";
import { getMeetingResult, getMeeting } from "../api";

interface Props {
  meetingId: string;
  meeting: Meeting;
}

export default function MeetingResult({ meetingId, meeting: initialMeeting }: Props) {
  const [result, setResult] = useState<MeetingResultType | null>(null);
  const [meeting, setMeeting] = useState<Meeting>(initialMeeting);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchResult = async () => {
    setLoading(true);
    setError("");
    try {
      // 최신 meeting 데이터와 결과를 동시에 가져옴
      const [meetingData, resultData] = await Promise.all([
        getMeeting(meetingId),
        getMeetingResult(meetingId),
      ]);
      setMeeting(meetingData);
      setResult(resultData);
    } catch {
      setError("아직 AI 분석이 진행 중이에요. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResult();
  }, [meetingId]);

  // 히트맵 색상 계산
  const getHeatColor = (count: number, max: number) => {
    if (max === 0) return "bg-white";
    const ratio = count / max;
    if (ratio >= 1) return "bg-[#00E59B] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]";
    if (ratio >= 0.7) return "bg-[#90D0FF]";
    if (ratio >= 0.4) return "bg-[#FFD800]";
    if (ratio > 0) return "bg-[#FF90E8]/40";
    return "bg-white";
  };

  const TIMES = [
    "10:00","10:30","11:00","11:30","12:00","12:30",
    "13:00","13:30","14:00","14:30","15:00","15:30",
    "16:00","16:30","17:00","17:30","18:00","18:30",
    "19:00","19:30","20:00","20:30","21:00","21:30",
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        >
          <Sparkles className="w-12 h-12 text-[#FFD800]" />
        </motion.div>
        <p className="font-black text-xl">AI가 분석 중...</p>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="font-bold text-lg text-black/60">{error || "결과를 불러올 수 없어요."}</p>
        <button
          onClick={fetchResult}
          className="flex items-center gap-2 bg-black text-white font-black px-6 py-3 rounded-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(255,216,0,1)] hover:-translate-y-1 transition-all"
        >
          <RefreshCw className="w-5 h-5" /> 다시 시도
        </button>
      </div>
    );
  }

  const { ai, slotCounts, bestSlots } = result;
  const maxCount = Math.max(0, ...Object.values(slotCounts));
  const dates = meeting.dates;

  // 슬롯별 참여자 이름 매핑
  const slotNames: Record<string, string[]> = {};
  for (const p of meeting.participants) {
    for (const slot of p.selections) {
      if (!slotNames[slot]) slotNames[slot] = [];
      slotNames[slot].push(p.name);
    }
  }

  return (
    <div className="space-y-8">
      {/* AI 한줄 요약 배너 */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative"
      >
        <div className="absolute inset-0 bg-black rounded-3xl translate-x-2 translate-y-2" />
        <div className="relative bg-[#FFD800] border-4 border-black rounded-3xl p-6 sm:p-8">
          <div className="flex items-start gap-3 mb-4">
            <Zap className="w-8 h-8 text-black flex-shrink-0 mt-1" fill="currentColor" />
            <p className="text-2xl sm:text-3xl font-black leading-tight">{ai.oneLiner}</p>
          </div>
          <p className="text-black/70 font-bold text-lg">{ai.comment}</p>
        </div>
      </motion.div>

      {/* 추천 카드들 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 추천 시간 */}
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="absolute inset-0 bg-black rounded-2xl translate-x-1.5 translate-y-1.5" style={{ position: "relative" }}>
            <div className="bg-[#90D0FF] border-4 border-black rounded-2xl p-5 -translate-x-1.5 -translate-y-1.5">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-6 h-6" strokeWidth={3} />
                <span className="font-black text-lg">추천 시간</span>
              </div>
              <div className="space-y-2">
                {ai.recommendedTimes.map((t, i) => (
                  <div
                    key={i}
                    className="bg-white border-2 border-black rounded-xl px-4 py-2 font-bold text-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  >
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* 추천 장소 */}
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="absolute inset-0 bg-black rounded-2xl translate-x-1.5 translate-y-1.5" style={{ position: "relative" }}>
            <div className="bg-[#FF90E8] border-4 border-black rounded-2xl p-5 -translate-x-1.5 -translate-y-1.5">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-6 h-6" strokeWidth={3} />
                <span className="font-black text-lg">추천 장소</span>
              </div>
              <div className="bg-white border-2 border-black rounded-xl px-4 py-3 font-bold text-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                {ai.recommendedPlace}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* 참여 현황 */}
      <div className="flex items-center gap-2 bg-black text-white px-4 py-3 rounded-2xl font-bold">
        <Users className="w-5 h-5 text-[#00E59B]" />
        {meeting.participants.length}명 참여 완료
        <span className="ml-auto text-white/60 text-sm">
          {bestSlots.length > 0 && `최대 ${maxCount}명 겹침`}
        </span>
      </div>

      {/* 히트맵 */}
      <div className="bg-white border-4 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        <div className="bg-black text-white px-4 py-3 flex items-center gap-2 font-bold">
          <Sparkles className="w-5 h-5 text-[#FFD800]" />
          시간대별 히트맵
        </div>
        <div className="overflow-x-auto p-4">
          <table className="w-full border-collapse" style={{ minWidth: dates.length * 80 + 80 }}>
            <thead>
              <tr>
                <th className="w-16 p-1" />
                {dates.map((date) => (
                  <th key={date} className="p-1 text-center">
                    <div className="bg-white border-2 border-black rounded-lg p-1.5 text-sm font-black">
                      {date}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIMES.map((time) => (
                <tr key={time}>
                  <td className="pr-2 py-0.5 text-right text-xs font-bold whitespace-nowrap opacity-60">
                    {time}
                  </td>
                  {dates.map((date) => {
                    const key = `${date}|${time}`;
                    const count = slotCounts[key] || 0;
                    const names = slotNames[key] || [];
                    return (
                      <td key={key} className="p-0.5">
                        <div
                          className={`min-h-8 w-full rounded-lg border-2 border-black/20 flex flex-col items-center justify-center px-1 py-0.5 transition-all ${getHeatColor(count, maxCount)}`}
                          title={names.length > 0 ? `${date} ${time}: ${names.join(", ")}` : `${date} ${time}: 0명`}
                        >
                          {names.length > 0 && (
                            <div className="flex flex-wrap gap-0.5 justify-center">
                              {names.map((n) => (
                                <span key={n} className="text-[9px] font-black leading-tight bg-white/60 rounded px-0.5">
                                  {n}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 범례 */}
        <div className="px-4 pb-4 flex items-center gap-3 text-sm font-bold">
          <span className="text-black/50">적음</span>
          <div className="flex gap-1">
            <div className="w-6 h-4 rounded bg-[#FF90E8]/40 border border-black/20" />
            <div className="w-6 h-4 rounded bg-[#FFD800] border border-black/20" />
            <div className="w-6 h-4 rounded bg-[#90D0FF] border border-black/20" />
            <div className="w-6 h-4 rounded bg-[#00E59B] border border-black/20" />
          </div>
          <span className="text-black/50">많음</span>
        </div>
      </div>

      {/* 스마트 조정 제안 */}
      {ai.nearMissSuggestions && ai.nearMissSuggestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="bg-white border-4 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
            <div className="bg-[#FF9C2A] text-black px-4 py-3 flex items-center gap-2 font-bold border-b-4 border-black">
              <AlertTriangle className="w-5 h-5" strokeWidth={3} />
              조금만 조정하면 전원 참석 가능!
            </div>
            <div className="p-4 space-y-3">
              {ai.nearMissSuggestions.map((suggestion, i) => (
                <div
                  key={i}
                  className="bg-[#FFD800]/20 border-3 border-black rounded-2xl p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-lg">
                      {suggestion.slot.replace("|", " ")}
                    </span>
                    <span className="bg-black text-white px-3 py-1 rounded-full text-sm font-black">
                      {suggestion.availableCount}/{suggestion.totalCount}명
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {suggestion.missingPeople.map((name) => (
                      <span
                        key={name}
                        className="bg-[#FF3366] text-white px-2 py-0.5 rounded-lg text-sm font-bold border-2 border-black"
                      >
                        {name} 불참
                      </span>
                    ))}
                  </div>
                  <p className="text-black/80 font-bold text-sm">
                    💡 {suggestion.adjustmentHint}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* 새로고침 */}
      <div className="flex justify-center">
        <button
          onClick={fetchResult}
          className="flex items-center gap-2 bg-white border-4 border-black font-black px-6 py-3 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
        >
          <RefreshCw className="w-5 h-5" /> 결과 새로고침
        </button>
      </div>
    </div>
  );
}
