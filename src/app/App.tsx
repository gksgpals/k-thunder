import { Routes, Route, Navigate } from "react-router";
import CreatePage from "./pages/CreatePage";
import JoinPage from "./pages/JoinPage";
import ResultPage from "./pages/ResultPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<CreatePage />} />
      <Route path="/m/:id" element={<JoinPage />} />
      <Route path="/m/:id/result" element={<ResultPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
