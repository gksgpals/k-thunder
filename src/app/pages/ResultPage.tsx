import { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import { Loader2, AlertCircle, Zap, Sparkles, ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import { getMeeting } from "../api";
import type { Meeting } from "../api";
import MeetingResult from "../components/MeetingResult";

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    getMeeting(id)
      .then((data) => setMeeting(data))
      .catch(() => setError("모임 정보를 불러올 수 없습니다"))
      .finally(() => setLoading(false));
  }, [id]);

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
          <p className="font-black text-xl">AI 결과를 불러오는 중...</p>
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

  // Success state
  return (
    <div className="min-h-screen bg-[#FDFBF7] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] overflow-auto font-sans text-black pb-12">
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
                <div className="relative text-white z-20 text-5xl sm:text-6xl font-black drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]" style={{ WebkitTextStroke: "4px black" }}>AI 결과</div>
              </div>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 text-[#FF9C2A] drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]" fill="currentColor" />
              </motion.div>
            </h1>
          </motion.div>
        </div>

        {/* MeetingResult Component */}
        <MeetingResult meetingId={id!} meeting={meeting} />

        {/* Back to JoinPage Link */}
        <div className="flex justify-center mt-10">
          <Link
            to={`/m/${id}`}
            className="flex items-center gap-2 bg-[#90D0FF] border-4 border-black font-black px-6 py-3 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all text-lg"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={3} />
            참여 페이지로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
