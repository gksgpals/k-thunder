import "dotenv/config";

const LAMBDA_URL = process.env.LAMBDA_URL || "https://7jxg5qrv5q2y6jd6wtaswameue0wiauf.lambda-url.us-east-1.on.aws/";

export async function invokeAggregate(meetingId) {
  // 비동기 — fire and forget
  fetch(LAMBDA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ meetingId }),
  }).catch((err) => console.error("Lambda URL 호출 실패:", err));
}
