import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import "dotenv/config";

const lambda = new LambdaClient({ region: process.env.AWS_REGION || "ap-northeast-2" });

export async function invokeAggregate(meetingId) {
  const command = new InvokeCommand({
    FunctionName: process.env.LAMBDA_FUNCTION_NAME || "bunggae-aggregate",
    InvocationType: "Event", // 비동기
    Payload: JSON.stringify({ meetingId }),
  });

  return lambda.send(command);
}
