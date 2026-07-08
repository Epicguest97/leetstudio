import { logger } from "./logger.js";

export interface Judge0SubmissionRequest {
  sourceCode: string;
  languageId: number;
  stdin: string;
  expectedOutput: string;
  cpuTimeLimitSeconds: number;
  memoryLimitKb: number;
  callbackUrl: string;
}

export interface Judge0SubmissionCreated {
  token: string;
}

function getJudge0BaseUrl(): string {
  const url = process.env.JUDGE0_API_URL;
  if (!url) {
    throw new Error(
      "JUDGE0_API_URL environment variable is required. Point it at your self-hosted Judge0 instance (e.g. https://judge0.your-domain.com).",
    );
  }
  return url.replace(/\/$/, "");
}

function getJudge0Headers(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const authToken = process.env.JUDGE0_AUTH_TOKEN;
  if (authToken) {
    headers["X-Auth-Token"] = authToken;
  }
  return headers;
}

/**
 * Submits a single test case run to Judge0 asynchronously (wait=false).
 * Judge0 will POST the result to `callbackUrl` once judging finishes.
 * We pass `expected_output` so Judge0 itself determines Accepted vs Wrong Answer.
 */
export async function submitToJudge0(
  request: Judge0SubmissionRequest,
): Promise<Judge0SubmissionCreated> {
  const baseUrl = getJudge0BaseUrl();

  const body = {
    source_code: Buffer.from(request.sourceCode).toString("base64"),
    language_id: request.languageId,
    stdin: Buffer.from(request.stdin).toString("base64"),
    expected_output: Buffer.from(request.expectedOutput).toString("base64"),
    cpu_time_limit: request.cpuTimeLimitSeconds,
    memory_limit: request.memoryLimitKb,
    callback_url: request.callbackUrl,
  };

  const res = await fetch(`${baseUrl}/submissions?base64_encoded=true&wait=false`, {
    method: "POST",
    headers: getJudge0Headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    logger.error({ status: res.status, text }, "Judge0 submission request failed");
    throw new Error(`Judge0 submission failed with status ${res.status}`);
  }

  const data = (await res.json()) as Judge0SubmissionCreated;
  return data;
}

/**
 * Judge0 status IDs: https://github.com/judge0/judge0/blob/master/docs/api/README.md
 * 1 = In Queue, 2 = Processing, 3 = Accepted, 4 = Wrong Answer, 5 = TLE,
 * 6 = Compilation Error, 7-12 = various Runtime Errors, 13 = Internal Error, 14 = Exec Format Error
 */
export function mapJudge0StatusToTestResultStatus(
  statusId: number,
):
  | "queued"
  | "processing"
  | "accepted"
  | "wrong_answer"
  | "time_limit_exceeded"
  | "memory_limit_exceeded"
  | "runtime_error"
  | "compilation_error"
  | "internal_error" {
  switch (statusId) {
    case 1:
      return "queued";
    case 2:
      return "processing";
    case 3:
      return "accepted";
    case 4:
      return "wrong_answer";
    case 5:
      return "time_limit_exceeded";
    case 6:
      return "compilation_error";
    case 13:
    case 14:
      return "internal_error";
    default:
      // 7-12: SIGSEGV, SIGXFSZ, SIGFPE, SIGABRT, NZEC, and other runtime errors.
      // Judge0 doesn't emit a distinct MLE status id, our worker infers MLE
      // from memory usage vs. the requested limit before falling back here.
      return "runtime_error";
  }
}
