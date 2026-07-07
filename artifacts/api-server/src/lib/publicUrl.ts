import type { Request } from "express";

/**
 * Resolves a publicly-reachable base URL for this server so a self-hosted
 * Judge0 instance can call back into `/api/judge0/callback/:testResultId`.
 * Prefers an explicit override, then falls back to whatever host/protocol the
 * current request came in on.
 */
export function getPublicBaseUrl(req: Request): string {
  if (process.env.PUBLIC_BASE_URL) {
    return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  }

  const protocol = req.protocol;
  const host = req.get("host");
  return `${protocol}://${host}`;
}
