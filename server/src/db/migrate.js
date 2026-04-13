import pool from "./pool.js";

const UP = `
CREATE TABLE IF NOT EXISTS meetings (
  id          VARCHAR(12) PRIMARY KEY,
  creator     VARCHAR(50)  NOT NULL,
  location    VARCHAR(200) DEFAULT '',
  dates       JSON         NOT NULL,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS participants (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  meeting_id      VARCHAR(12)  NOT NULL,
  name            VARCHAR(50)  NOT NULL,
  selections      JSON         NOT NULL,
  preferred_place VARCHAR(200) DEFAULT '',
  created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ai_results (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  meeting_id  VARCHAR(12)  NOT NULL UNIQUE,
  slot_counts JSON         NOT NULL,
  best_slots  JSON         NOT NULL,
  ai_summary  TEXT         NOT NULL,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
);
`;

async function migrate() {
  const statements = UP.split(";").map((s) => s.trim()).filter(Boolean);
  for (const sql of statements) {
    await pool.execute(sql);
    console.log("✓", sql.slice(0, 60) + "...");
  }
  console.log("\n마이그레이션 완료!");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("마이그레이션 실패:", err);
  process.exit(1);
});
