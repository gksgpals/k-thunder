import express from "express";
import cors from "cors";
import "dotenv/config";
import meetingsRouter from "./routes/meetings.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

app.use("/api/meetings", meetingsRouter);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`⚡ 번개 서버 실행 중: http://localhost:${PORT}`);
});
