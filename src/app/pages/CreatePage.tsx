import { useState, useCallback, useRef, useEffect } from "react";
import { Link } from "react-router";
import { Copy, Check, MapPin, Zap, Sparkles, Clock, Plus, X, Calendar as CalendarIcon, ChevronLeft, ChevronRight, ArrowRight, Share2, PartyPopper, AlertCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import { createMeeting, joinMeeting } from "../api";

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

// Fun, vibrant neo-brutalist colors for the highlighter effect
const THEMES = [
  "bg-[#FF90E8]", // Pink
  "bg-[#FFD800]", // Yellow
  "bg-[#00E59B]", // Mint
  "bg-[#90D0FF]", // Blue
  "bg-[#FF9C2A]", // Orange
];

export default function CreatePage() {
  const [step, setStep] = useState<"date-selection" | "time-selection" | "share">("date-selection");
  const [dates, setDates] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [copied, setCopied] = useState(false);
  const [location, setLocation] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<"add" | "remove">("add");
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const gridRef = useRef<HTMLDivElement>(null);

  // API states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdMeetingId, setCreatedMeetingId] = useState<string | null>(null);

  const dateInputRef = useRef<HTMLInputElement>(null);

  // Calendar State — 현재 월 기준
  const [calendarDate, setCalendarDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const calYear = calendarDate.getFullYear();
  const calMonth = calendarDate.getMonth();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(calYear, calMonth, 1).getDay();

  const handleCalendarToggle = (day: number) => {
    const dObj = new Date(calYear, calMonth, day);
    const daysArr = ["일", "월", "화", "수", "목", "금", "토"];
    const formattedDate = `${calMonth + 1}/${day} ${daysArr[dObj.getDay()]}`;
    
    setDates(prev => {
      if (prev.includes(formattedDate)) {
        return prev.filter(d => d !== formattedDate);
      } else {
        return [...prev, formattedDate].sort((a, b) => {
          const [monthA, dayA] = a.split(" ")[0].split("/").map(Number);
          const [monthB, dayB] = b.split(" ")[0].split("/").map(Number);
          if (monthA !== monthB) return monthA - monthB;
          return dayA - dayB;
        });
      }
    });
  };

  const handleNextMonth = () => setCalendarDate(new Date(calYear, calMonth + 1, 1));
  const handlePrevMonth = () => setCalendarDate(new Date(calYear, calMonth - 1, 1));

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

  const handleAddDate = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    const d = new Date(e.target.value);
    if (isNaN(d.getTime())) return;
    
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    const formattedDate = `${d.getMonth() + 1}/${d.getDate()} ${days[d.getDay()]}`;
    
    if (!dates.includes(formattedDate)) {
      setDates(prev => [...prev, formattedDate].sort((a, b) => {
        const [monthA, dayA] = a.split(" ")[0].split("/").map(Number);
        const [monthB, dayB] = b.split(" ")[0].split("/").map(Number);
        if (monthA !== monthB) return monthA - monthB;
        return dayA - dayB;
      }));
    }
  };

  const removeDate = (dateToRemove: string) => {
    setDates(prev => prev.filter(d => d !== dateToRemove));
    setSelected(prev => {
      const next = new Set(prev);
      [...next].forEach(key => {
        if (key.startsWith(dateToRemove + "|")) next.delete(key);
      });
      return next;
    });
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await createMeeting({ creator: name, location, dates });
      // 생성자를 자동으로 첫 번째 참여자로 등록
      await joinMeeting(result.id, {
        name,
        selections: Array.from(selected),
        preferredPlace: location || undefined,
      });
      setCreatedMeetingId(result.id);
      setStep("share");
      try {
        confetti({
          particleCount: 200,
          spread: 100,
          origin: { y: 0.5 },
          colors: ['#FF90E8', '#FFD800', '#00E59B', '#90D0FF', '#FF9C2A', '#000000'],
          disableForReducedMotion: true,
          zIndex: 1000,
          shapes: ['square', 'circle'],
        });
      } catch {}
    } catch (err) {
      setError(err instanceof Error ? err.message : "모임 생성에 실패했어요. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const shareLink = createdMeetingId ? `${window.location.origin}/m/${createdMeetingId}` : "";

  const handleCopyShareLink = async () => {
    const textToCopy = `⚡️ ${name || "익명"}님이 번개를 쳤어요!\n📍 장소: ${location || "미정"}\n👇 가능한 시간을 골라주세요!\n${shareLink}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = textToCopy;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectedCount = selected.size;

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
        {/* Playful Header with 3D retro text */}
        <div className="text-center mb-14 relative flex flex-col items-center">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", bounce: 0.6 }}
            className="relative inline-block mb-6"
          >
            <h1 className="relative text-7xl sm:text-8xl font-black text-black tracking-tighter flex items-center justify-center gap-2 z-20">
              <motion.div
                animate={{ rotate: [-5, 5, -5] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <Zap className="w-16 h-16 sm:w-20 sm:h-20 text-[#FFD800] drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]" fill="currentColor" />
              </motion.div>
              
              <div className="relative inline-block">
                <div className="relative text-white z-20 text-7xl sm:text-8xl font-black drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]" style={{ WebkitTextStroke: "4px black" }}>번개</div>
              </div>

              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <Sparkles className="w-12 h-12 sm:w-16 sm:h-16 text-[#FF9C2A] drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]" fill="currentColor" />
              </motion.div>
            </h1>
          </motion.div>
          
          {/* Subtitle Banner */}
          <div className="relative group cursor-pointer z-30">
            <div className="absolute inset-0 bg-black rounded-full translate-x-1 translate-y-1 sm:translate-x-2 sm:translate-y-2 transition-transform group-hover:translate-x-1.5 group-hover:translate-y-1.5" />
            <div className="relative bg-[#90D0FF] border-4 border-black px-6 py-2 sm:py-3 rounded-full flex items-center gap-2 -rotate-2 group-hover:rotate-0 transition-transform duration-300">
              <p className="font-black text-black text-lg sm:text-xl tracking-tight">
                <span>{step === "date-selection" ? "무슨 날짜에 만날까? 📅" : step === "time-selection" ? "캘린더 켜지마! 여기서 쫙 그어 🖍️" : "번개 생성 완료! 🎉"}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Error Banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6"
            >
              <div className="bg-[#FF3366] border-4 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-white flex-shrink-0" strokeWidth={3} />
                <p className="text-white font-bold flex-1">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="bg-white text-black font-black px-4 py-1 rounded-xl border-2 border-black hover:bg-[#FFD800] transition-colors text-sm"
                >
                  닫기
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Inputs as Sticker Labels */}
        <AnimatePresence mode="wait">
        {step === "date-selection" && (
          <motion.div 
            key="date-step"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center"
          >
            <div className="w-full max-w-md bg-white border-4 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
              <div className="bg-black text-white px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold">
                  <CalendarIcon className="w-5 h-5 text-[#FF90E8]" />
                  후보 날짜들을 선택해줘
                </div>
                <div className="bg-[#FF90E8] text-black px-3 py-1 rounded-full text-sm font-black flex items-center gap-1">
                  <span>{dates.length}</span><span>일 선택됨</span>
                </div>
              </div>
              
              <div className="p-4 sm:p-6 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
                <div className="flex items-center justify-between mb-4">
                  <button onClick={handlePrevMonth} className="p-2 border-2 border-black rounded-full bg-white hover:bg-[#FFD800] active:scale-95 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h2 className="text-xl font-black bg-white px-4 py-1 border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    {calYear}년 {calMonth + 1}월
                  </h2>
                  <button onClick={handleNextMonth} className="p-2 border-2 border-black rounded-full bg-white hover:bg-[#FFD800] active:scale-95 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-2 mb-4">
                  {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => (
                    <div key={d} className={`text-center font-black text-sm ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-black'}`}>
                      {d}
                    </div>
                  ))}
                  
                  {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-10 sm:h-12" />
                  ))}
                  
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dObj = new Date(calYear, calMonth, day);
                    const daysArr = ["일", "월", "화", "수", "목", "금", "토"];
                    const formattedDate = `${calMonth + 1}/${day} ${daysArr[dObj.getDay()]}`;
                    const isSelected = dates.includes(formattedDate);
                    
                    return (
                      <button
                        key={day}
                        onClick={() => handleCalendarToggle(day)}
                        className={`h-10 sm:h-12 border-2 border-black rounded-xl font-black text-lg transition-all flex items-center justify-center relative overflow-hidden
                          ${isSelected 
                            ? 'bg-[#00E59B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] scale-105 z-10' 
                            : 'bg-white hover:bg-black/5 hover:scale-105 active:scale-95'}
                        `}
                      >
                        {isSelected && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-white border-2 border-black rounded-full" />
                        )}
                        {day}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setStep("time-selection")}
                  disabled={dates.length === 0}
                  className={`w-full py-4 rounded-2xl border-4 border-black font-black text-xl flex items-center justify-center gap-3 transition-all mt-6 ${
                    dates.length > 0
                      ? "bg-[#FFD800] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                      : "bg-black/10 text-black/30 border-black/20 cursor-not-allowed"
                  }`}
                >
                  시간 고르러 가기 <ArrowRight className={`w-6 h-6 ${dates.length > 0 ? 'animate-bounce' : ''}`} />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {step === "time-selection" && (
          <motion.div
            key="time-step"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full"
          >
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

              {/* Location Input */}
              <div className="relative group flex flex-col items-start ml-2 sm:ml-0">
                <div className="relative z-20 bg-black text-[#00E59B] text-sm font-black px-5 py-2 rounded-t-2xl border-4 border-black border-b-0 -mb-1 ml-4 sm:ml-6">
                  2. 어디서 봐? (선택)
                </div>
                <div className="relative w-full z-10">
                  <div className="absolute inset-0 bg-black rounded-3xl translate-x-1.5 translate-y-1.5" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="강남역 11번 출구"
                    className="relative w-full text-xl px-6 py-5 pr-14 rounded-3xl border-4 border-black bg-white focus:outline-none focus:bg-[#00E59B] transition-colors font-black placeholder:text-black/20"
                  />
                  <MapPin className="absolute right-5 top-1/2 -translate-y-1/2 text-black/30 group-focus-within:text-black transition-colors w-6 h-6 z-20" strokeWidth={3} />
                </div>
              </div>
            </div>

            {/* Fun Sketchbook Grid */}
            <div className="mb-4 bg-white border-4 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-visible">
              
              <div className="bg-black text-white px-4 py-3 border-b-4 border-black flex items-center justify-between rounded-t-2xl">
                <div className="flex items-center gap-2 font-bold">
                  <Clock className="w-5 h-5 text-[#FFD800]" />
                  가능한 시간 드래그하기
                </div>
                <div className="bg-white text-black px-3 py-1 rounded-full text-sm font-black flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span>{selectedCount}</span><span>칸 선택됨</span>
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
                        <th key={date} className="p-2 text-center pb-4 relative group/th min-w-[80px]">
                          <button
                            onClick={() => removeDate(date)}
                            className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/th:opacity-100 transition-opacity z-20 border-2 border-black hover:scale-110 active:scale-90"
                            title="날짜 삭제"
                          >
                            <X className="w-4 h-4" />
                          </button>
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
                      
                      <th className="p-2 text-center pb-4 relative min-w-[80px]">
                        <input
                          ref={dateInputRef}
                          type="date"
                          onChange={handleAddDate}
                          className="sr-only"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const input = dateInputRef.current;
                            if (input) {
                              input.value = "";
                              input.showPicker?.();
                              if (!input.showPicker) input.click();
                            }
                          }}
                          className="w-full"
                        >
                          <div className="bg-[#E5E7EB] border-2 border-dashed border-black/40 rounded-xl p-2 h-full flex flex-col items-center justify-center min-h-[70px] hover:border-black hover:bg-[#FFD800] transition-colors">
                            <Plus className="w-6 h-6 text-black/40" />
                            <span className="text-[10px] font-bold text-black/40 mt-1">날짜 추가</span>
                          </div>
                        </button>
                      </th>
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
                                  <div className="w-4 h-4 bg-white border-2 border-black rounded-full z-10" />
                                )}
                              </motion.div>
                            </td>
                          );
                        })}
                        <td className="p-0.5 min-w-[80px]"></td>
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
          </motion.div>
        )}

        {step === "share" && createdMeetingId && (
          <motion.div
            key="share-step"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", bounce: 0.4 }}
            className="flex flex-col items-center"
          >
            <div className="w-full max-w-md">
              {/* Celebration Card */}
              <div className="bg-white border-4 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                {/* Header */}
                <div className="bg-[#00E59B] border-b-4 border-black px-6 py-5 text-center">
                  <motion.div
                    animate={{ rotate: [-5, 5, -5] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="inline-block mb-2"
                  >
                    <PartyPopper className="w-12 h-12 text-black drop-shadow-[2px_2px_0px_rgba(0,0,0,0.3)]" />
                  </motion.div>
                  <h2 className="text-3xl font-black text-black">번개 생성 완료!</h2>
                  <p className="text-black/70 font-bold mt-1">친구들에게 링크를 공유해봐!</p>
                </div>

                <div className="p-6 space-y-5">
                  {/* Creator & Location Info */}
                  <div className="flex gap-3">
                    <div className="flex-1 bg-[#FFD800] border-3 border-black rounded-2xl p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                      <div className="text-xs font-black text-black/60 mb-1">⚡️ 생성자</div>
                      <div className="font-black text-lg truncate">{name || "익명"}</div>
                    </div>
                    <div className="flex-1 bg-[#90D0FF] border-3 border-black rounded-2xl p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                      <div className="text-xs font-black text-black/60 mb-1">📍 장소</div>
                      <div className="font-black text-lg truncate">{location || "미정"}</div>
                    </div>
                  </div>

                  {/* Share Link */}
                  <div>
                    <div className="text-sm font-black text-black/60 mb-2 flex items-center gap-1">
                      <Share2 className="w-4 h-4" /> 공유 링크
                    </div>
                    <div className="bg-black/5 border-3 border-black rounded-2xl p-4 flex items-center gap-3">
                      <code className="flex-1 text-sm font-bold break-all text-black/80">{shareLink}</code>
                    </div>
                  </div>

                  {/* Copy Button */}
                  <button
                    onClick={handleCopyShareLink}
                    className="w-full py-4 rounded-2xl border-4 border-black font-black text-xl flex items-center justify-center gap-3 transition-all bg-[#FF90E8] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  >
                    {copied ? (
                      <>
                        <Check className="w-6 h-6" strokeWidth={4} />
                        복사 완료!
                      </>
                    ) : (
                      <>
                        <Copy className="w-6 h-6" strokeWidth={3} />
                        링크 복사하기
                      </>
                    )}
                  </button>

                  {/* Join My Meeting Link */}
                  <Link
                    to={`/m/${createdMeetingId}`}
                    className="block w-full py-4 rounded-2xl border-4 border-black font-black text-xl text-center transition-all bg-[#FFD800] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  >
                    내 모임 참여하기 ⚡️
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </div>

      {/* Massive Sticky Bottom Bar - Console Style */}
      {step === "time-selection" && (
        <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-6 bg-[#FF9C2A] border-t-8 border-black z-40 drop-shadow-[0_-10px_0px_rgba(0,0,0,0.1)]">
          <div className="absolute top-0 left-0 right-0 h-2 bg-[repeating-linear-gradient(45deg,#000,#000_10px,transparent_10px,transparent_20px)] opacity-20 -translate-y-8" />
          
          <div className="max-w-3xl mx-auto flex flex-col sm:flex-row gap-4 items-center">
            
            <div className="flex-1 w-full sm:w-auto text-black font-black text-xl sm:text-2xl lg:text-3xl whitespace-nowrap text-center sm:text-left drop-shadow-[2px_2px_0px_rgba(255,255,255,1)]">
              {selectedCount > 0 ? "준비 완료! 번개를 쳐볼까? 🚀" : "먼저 위에서 시간을 골라줘! 👆"}
            </div>

            <div className="flex w-full sm:w-auto gap-4">
              <button
                onClick={handleSave}
                disabled={!name || selectedCount === 0 || isSubmitting}
                className={`flex-[2] sm:flex-none py-4 px-8 rounded-2xl border-4 border-black font-black text-xl flex items-center justify-center gap-3 transition-all ${
                  name && selectedCount > 0 && !isSubmitting
                    ? "bg-[#00E59B] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    : "bg-black/20 text-black/40 border-black/30 cursor-not-allowed"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  <>
                    <Zap className={`w-6 h-6 ${name && selectedCount > 0 ? "animate-bounce" : ""}`} fill="currentColor" />
                    번개 치기!
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Custom Bold Scrollbar & Selection Color */}
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
