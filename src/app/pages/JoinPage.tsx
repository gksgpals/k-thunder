import { useState, useCallback, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { MapPin, Zap, Sparkles, Clock, AlertCircle, Loader2, Users, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getMeeting, joinMeeting } from "../api";
import type { Meeting } from "../api";

const TIMES = [
  "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30",
  "19:00", "19:30", "20:00", "20:30", "21:00", "21:30"
];

const formatTime = (t: string) => {
  const [hStr, mStr] = t.split(":");
  const h = parseInt(hStr);
  const m = mStr === "00" ? "" : " 30분";
  if (hStr === "12") return `낮 12시${m}`;
  if (h < 12) return `오전 ${h}시${m}`;
  return `오후 ${h - 12}시${m}`;
};

const THEMES = [
  "bg-[#FF90E8]",
  "bg-[#FFD800]",
  "bg-[#00E59B]",
  "bg-[#90D0FF]",
  "bg-[#FF9C2A]",
];

export default function JoinPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Meeting data loading state
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Participant input state
  const [name, setName] = useState("");
  const [preferredPlace, setPreferredPlace] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Drag selection state
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<"add" | "remove">("add");
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const gridRef = useRef<HTMLDivElement>(null);

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [showUnavailable, setShowUnavailable] = useState(false);

  // Load meeting data on mount
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    getMeeting(id)
      .then((data) => setMeeting(data))
      .catch(() => setError("모임을 찾을 수 없습니다"))
      .finally(() => setLoading(false));
  }, [id]);

  const cellKey = (date: string, time: string) => `${date}|${time}`;

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("pointermove", handleMove);
    return () => window.removeEventListener("pointermove", handleMove);
  }, []);

  const handlePointerDown = useCallback((date: string, time: string) => {
    const key = cellKey(date, time);
    const isSelected = selected.has(key);
    setDragMode(isSelected ? "remove" : "add");
    setIsDragging(true);
    setSelected((prev) => {
      const next = new Set(prev);
      isSelected ? next.delete(key) : next.add(key);
      return next;
    });
    if (navigator.vibrate) navigator.vibrate(20);
  }, [selected]);

  const handlePointerEnter = useCallback((date: string, time: string) => {
    if (!isDragging) return;
    const key = cellKey(date, time);
    setSelected((prev) => {
      const next = new Set(prev);
      dragMode === "add" ? next.add(key) : next.delete(key);
      return next;
    });
    if (navigator.vibrate) navigator.vibrate(10);
  }, [isDragging, dragMode]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleSubmit = async () => {
    if (!id || !meeting) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await joinMeeting(id, {
        name,
        selections: Array.from(selected),
        preferredPlace: preferredPlace || undefined,
        comment: feedbackComment || undefined,
      });
      navigate(`/m/${id}/result`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "참여에 실패했어요. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnavailable = async () => {
    if (!id || !meeting || !name.trim()) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await joinMeeting(id, {
        name,
        selections: [],
        preferredPlace: preferredPlace || undefined,
        comment: feedbackComment || "이 날짜 다 안 돼요 😢",
      });
      navigate(`/m/${id}/result`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "제출에 실패했어요. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCount = selected.size;
  const canSubmit = name.trim().length > 0 && selectedCount > 0 && !isSubmitting;

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          >
            <Loader2 className="w-12 h-12 text-black" />
          </motion.div>
          <p className="font-black text-xl">모임 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !meeting) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center font-sans">
        <div className="bg-white border-4 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-[#FF3366] mx-auto mb-4" strokeWidth={3} />
          <h2 className="text-2xl font-black mb-2">{error || "모임을 찾을 수 없습니다"}</h2>
          <p className="text-black/60 font-bold mb-6">링크가 올바른지 확인해주세요.</p>
          <a
            href="/"
            className="inline-block bg-[#FFD800] border-4 border-black font-black px-6 py-3 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
          >
            홈으로 돌아가기
          </a>
        </div>
      </div>
    );
  }

  const dates = meeting.dates;

  return (
    <div
      className="min-h-screen bg-[#FDFBF7] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] overflow-auto select-none font-sans text-black pb-40"
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      style={{ cursor: isDragging ? 'grabbing' : 'auto' }}
    >
      {/* Floating Marker during drag */}
      <AnimatePresence>
        {isDragging && dragMode === "add" && (
          <motion.div
            className="fixed pointer-events-none z-50"
            initial={{ opacity: 0, scale: 0, rotate: -45 }}
            animate={{
              opacity: 1,
              scale: 1,
              x: mousePos.x,
              y: mousePos.y - 40,
              rotate: 0
            }}
            exit={{ opacity: 0, scale: 0, rotate: 45 }}
            transition={{ type: "spring", stiffness: 800, damping: 30 }}
          >
            <div className="relative">
              <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-yellow-400 rounded-full animate-ping opacity-70" />
              <div className="bg-black text-white px-4 py-2 rounded-2xl rounded-bl-none font-bold text-sm border-4 border-black shadow-[4px_4px_0px_0px_rgba(255,216,0,1)] flex items-center gap-2">
                <span className="w-3 h-3 bg-yellow-400 rounded-full inline-block animate-pulse" />
                마킹 중!
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-10 relative flex flex-col items-center">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", bounce: 0.6 }}
            className="relative inline-block mb-6"
          >
            <h1 className="relative text-5xl sm:text-6xl font-black text-black tracking-tighter flex items-center justify-center gap-2 z-20">
              <motion.div
                animate={{ rotate: [-5, 5, -5] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <Zap className="w-12 h-12 sm:w-16 sm:h-16 text-[#FFD800] drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]" fill="currentColor" />
              </motion.div>
              <div className="relative inline-block">
                <div className="relative text-white z-20 text-5xl sm:text-6xl font-black drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]" style={{ WebkitTextStroke: "4px black" }}>참여하기</div>
              </div>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 text-[#FF9C2A] drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]" fill="currentColor" />
              </motion.div>
            </h1>
          </motion.div>

          <div className="relative group cursor-pointer z-30">
            <div className="absolute inset-0 bg-black rounded-full translate-x-1 translate-y-1 sm:translate-x-2 sm:translate-y-2 transition-transform group-hover:translate-x-1.5 group-hover:translate-y-1.5" />
            <div className="relative bg-[#90D0FF] border-4 border-black px-6 py-2 sm:py-3 rounded-full flex items-center gap-2 -rotate-2 group-hover:rotate-0 transition-transform duration-300">
              <p className="font-black text-black text-lg sm:text-xl tracking-tight">
                가능한 시간을 쫙 그어줘! 🖍️
              </p>
            </div>
          </div>
        </div>

        {/* Meeting Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="bg-white border-4 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
            <div className="bg-black text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold">
                <Zap className="w-5 h-5 text-[#FFD800]" fill="currentColor" />
                모임 정보
              </div>
              <div className="bg-[#00E59B] text-black px-3 py-1 rounded-full text-sm font-black flex items-center gap-1">
                <Users className="w-4 h-4" />
                {meeting.participants.length}명 참여 중
              </div>
            </div>
            <div className="p-4 sm:p-6 flex flex-wrap gap-3">
              <div className="flex-1 min-w-[120px] bg-[#FFD800] border-3 border-black rounded-2xl p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                <div className="text-xs font-black text-black/60 mb-1">⚡️ 생성자</div>
                <div className="font-black text-lg truncate">{meeting.creator}</div>
              </div>
              <div className="flex-1 min-w-[120px] bg-[#90D0FF] border-3 border-black rounded-2xl p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                <div className="text-xs font-black text-black/60 mb-1">📍 장소</div>
                <div className="font-black text-lg truncate">{meeting.location || "미정"}</div>
              </div>
              <div className="w-full bg-[#FF90E8] border-3 border-black rounded-2xl p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                <div className="text-xs font-black text-black/60 mb-1">📅 후보 날짜</div>
                <div className="flex flex-wrap gap-2 mt-1">
                  {dates.map((date) => (
                    <span key={date} className="bg-white border-2 border-black rounded-xl px-3 py-1 font-black text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      {date}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Submit Error Banner */}
        <AnimatePresence>
          {submitError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6"
            >
              <div className="bg-[#FF3366] border-4 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-white flex-shrink-0" strokeWidth={3} />
                <p className="text-white font-bold flex-1">{submitError}</p>
                <button
                  onClick={() => setSubmitError(null)}
                  className="bg-white text-black font-black px-4 py-1 rounded-xl border-2 border-black hover:bg-[#FFD800] transition-colors text-sm"
                >
                  닫기
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 sm:gap-6 mb-16">
          {/* Name Input */}
          <div className="relative group flex flex-col items-start ml-2 sm:ml-0">
            <div className="relative z-20 bg-black text-white text-sm font-black px-5 py-2 rounded-t-2xl border-4 border-black border-b-0 -mb-1 ml-4 sm:ml-6">
              1. 이름이 뭐야?
            </div>
            <div className="relative w-full z-10">
              <div className="absolute inset-0 bg-black rounded-3xl translate-x-1.5 translate-y-1.5" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="홍길동"
                className="relative w-full text-xl px-6 py-5 rounded-3xl border-4 border-black bg-white focus:outline-none focus:bg-[#FFD800] transition-colors font-black placeholder:text-black/20"
              />
            </div>
          </div>

          {/* Preferred Place Input */}
          <div className="relative group flex flex-col items-start ml-2 sm:ml-0">
            <div className="relative z-20 bg-black text-[#00E59B] text-sm font-black px-5 py-2 rounded-t-2xl border-4 border-black border-b-0 -mb-1 ml-4 sm:ml-6">
              2. 선호 장소 (선택)
            </div>
            <div className="relative w-full z-10">
              <div className="absolute inset-0 bg-black rounded-3xl translate-x-1.5 translate-y-1.5" />
              <input
                type="text"
                value={preferredPlace}
                onChange={(e) => setPreferredPlace(e.target.value)}
                placeholder="강남역, 홍대입구 등"
                className="relative w-full text-xl px-6 py-5 pr-14 rounded-3xl border-4 border-black bg-white focus:outline-none focus:bg-[#00E59B] transition-colors font-black placeholder:text-black/20"
              />
              <MapPin className="absolute right-5 top-1/2 -translate-y-1/2 text-black/30 group-focus-within:text-black transition-colors w-6 h-6 z-20" strokeWidth={3} />
            </div>
          </div>
        </div>

        {/* Time Selection Grid */}
        <div className="mb-4 bg-white border-4 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-visible">
          <div className="bg-black text-white px-4 py-3 border-b-4 border-black flex items-center justify-between rounded-t-2xl">
            <div className="flex items-center gap-2 font-bold">
              <Clock className="w-5 h-5 text-[#FFD800]" />
              가능한 시간 드래그하기
            </div>
            <div className="bg-white text-black px-3 py-1 rounded-full text-sm font-black flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {selectedCount}칸 선택됨
            </div>
          </div>

          <div
            ref={gridRef}
            className="overflow-x-auto p-4 sm:p-6 custom-scrollbar bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]"
            style={{ touchAction: "none" }}
          >
            <table className="w-full border-collapse select-none" style={{ minWidth: dates.length * 80 + 80 }}>
              <thead>
                <tr>
                  <th className="w-16 p-2"></th>
                  {dates.map((date) => (
                    <th key={date} className="p-2 text-center pb-4 relative min-w-[80px]">
                      <div className="bg-white border-2 border-black rounded-xl p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rotate-[-1deg] hover:rotate-1 transition-transform cursor-default relative z-10">
                        <div className="text-[#FF90E8] text-xs font-black uppercase tracking-widest mb-1">
                          {date.split(" ")[1]}요일
                        </div>
                        <div className="text-xl sm:text-2xl font-black">
                          {date.split(" ")[0]}
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIMES.map((time, timeIdx) => (
                  <tr key={time} className="group/row">
                    <td className="pr-4 py-1 text-right text-sm font-bold align-top pt-2 whitespace-nowrap opacity-50 group-hover/row:opacity-100 transition-opacity">
                      <div className={`bg-black/5 rounded px-2 py-1 inline-block border border-black/10 ${time.endsWith("30") ? "invisible group-hover/row:visible text-xs" : ""}`}>
                        {formatTime(time)}
                      </div>
                    </td>
                    {dates.map((date, di) => {
                      const key = cellKey(date, time);
                      const isSel = selected.has(key);
                      const colorClass = THEMES[di % THEMES.length];

                      return (
                        <td key={key} className="p-0.5">
                          <motion.div
                            onPointerDown={(e) => {
                              e.preventDefault();
                              handlePointerDown(date, time);
                            }}
                            onPointerEnter={() => handlePointerEnter(date, time)}
                            initial={false}
                            animate={
                              isSel
                                ? { scale: 1.05, rotate: di % 2 === 0 ? 1 : -1 }
                                : { scale: 1, rotate: 0 }
                            }
                            className={`h-10 sm:h-12 w-full cursor-crosshair rounded-xl transition-all duration-75 flex items-center justify-center relative overflow-hidden ${
                              isSel
                                ? `${colorClass} border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] z-10`
                                : `bg-white border-2 ${timeIdx % 2 !== 0 ? 'border-dashed' : 'border-solid'} border-black/20 hover:border-black/50 hover:bg-black/5`
                            }`}
                          >
                            {isSel && (
                              <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,#000_2px,#000_4px)] pointer-events-none" />
                            )}
                            {!isSel && (
                              <Zap className="w-4 h-4 text-black/10 opacity-0 hover:opacity-100 transition-opacity" />
                            )}
                            {isSel && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-4 h-4 bg-white border-2 border-black rounded-full z-10"
                              />
                            )}
                          </motion.div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Clear Button */}
        <div className="flex justify-end mb-12 px-2 h-14">
          <AnimatePresence>
            {selectedCount > 0 && (
              <motion.button
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onClick={() => setSelected(new Set())}
                className="bg-[#FF3366] text-white font-black text-lg border-4 border-black px-6 py-2 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-2 active:shadow-none transition-all flex items-center gap-2"
              >
                초기화 💣
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* 다 안 돼요 피드백 */}
        <div className="mb-8">
          {!showUnavailable ? (
            <button
              onClick={() => setShowUnavailable(true)}
              className="w-full py-3 rounded-2xl border-3 border-dashed border-black/30 font-bold text-black/50 hover:border-black hover:text-black hover:bg-black/5 transition-all text-center"
            >
              이 날짜 다 안 돼요... 😢
            </button>
          ) : (
            <div className="bg-white border-4 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="font-black text-lg">📝 생성자에게 한마디</span>
              </div>
              <textarea
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                placeholder="다른 날짜가 좋겠어요! 예: 다음 주 토요일은 어때?"
                className="w-full px-4 py-3 rounded-xl border-2 border-black bg-white focus:outline-none focus:bg-[#FFD800]/20 transition-colors font-bold placeholder:text-black/20 resize-none"
                rows={2}
              />
              <div className="flex gap-3 mt-3">
                <button
                  onClick={() => { setShowUnavailable(false); setFeedbackComment(""); }}
                  className="px-4 py-2 rounded-xl border-2 border-black font-bold hover:bg-black/5 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleUnavailable}
                  disabled={!name.trim() || isSubmitting}
                  className={`flex-1 py-2 rounded-xl border-3 border-black font-black transition-all ${
                    name.trim() && !isSubmitting
                      ? "bg-[#FF90E8] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5"
                      : "bg-black/10 text-black/30 cursor-not-allowed"
                  }`}
                >
                  {!name.trim() ? "위에 이름 먼저 입력해줘!" : "다 안 돼요 제출하기"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Bottom Bar */}
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-0 left-0 right-0 p-4 sm:p-6 bg-[#FF9C2A] border-t-8 border-black z-40 drop-shadow-[0_-10px_0px_rgba(0,0,0,0.1)]"
      >
        <div className="absolute top-0 left-0 right-0 h-2 bg-[repeating-linear-gradient(45deg,#000,#000_10px,transparent_10px,transparent_20px)] opacity-20 -translate-y-8" />

        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex-1 w-full sm:w-auto text-black font-black text-xl sm:text-2xl lg:text-3xl whitespace-nowrap text-center sm:text-left drop-shadow-[2px_2px_0px_rgba(255,255,255,1)]">
            {selectedCount > 0 ? "준비 완료! 참여할까? 🚀" : "먼저 위에서 시간을 골라줘! 👆"}
          </div>

          <div className="flex w-full sm:w-auto gap-4">
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`flex-[2] sm:flex-none py-4 px-8 rounded-2xl border-4 border-black font-black text-xl flex items-center justify-center gap-3 transition-all ${
                canSubmit
                  ? "bg-[#00E59B] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  : "bg-black/20 text-black/40 border-black/30 cursor-not-allowed"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  제출 중...
                </>
              ) : (
                <>
                  <ArrowRight className={`w-6 h-6 ${canSubmit ? "animate-bounce" : ""}`} />
                  참여하기!
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Custom Scrollbar & Selection Color */}
      <style>{`
        ::selection {
          background: #FF90E8;
          color: black;
        }
        .custom-scrollbar::-webkit-scrollbar {
          height: 14px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #fff;
          border-top: 4px solid black;
          border-bottom: 4px solid black;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #000;
          border-radius: 0px;
        }
      `}</style>
    </div>
  );
}
