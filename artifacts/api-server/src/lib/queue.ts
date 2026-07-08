import { logger } from "./logger.js";

/**
 * Lightweight in-process bounded-concurrency task queue.
 *
 * Submissions are persisted to Postgres (status "queued") before they ever touch
 * this queue, so a server restart never drops a submission — it will simply
 * remain "queued" until picked up again (see requeueStuckSubmissions in submissions route).
 * This queue only bounds *concurrent Judge0 dispatch* to avoid hammering the
 * self-hosted Judge0 instance during a surge of submissions.
 */
class TaskQueue {
  private readonly concurrency: number;
  private running = 0;
  private readonly pending: Array<() => void> = [];

  constructor(concurrency: number) {
    this.concurrency = concurrency;
  }

  async run<T>(task: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await task();
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.running < this.concurrency) {
      this.running += 1;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.pending.push(() => {
        this.running += 1;
        resolve();
      });
    });
  }

  private release(): void {
    this.running -= 1;
    const next = this.pending.shift();
    if (next) next();
  }
}

const concurrency = Number(process.env.JUDGE0_DISPATCH_CONCURRENCY ?? "10");

export const judge0DispatchQueue = new TaskQueue(
  Number.isFinite(concurrency) && concurrency > 0 ? concurrency : 10,
);

export function enqueueJudge0Dispatch(task: () => Promise<void>): void {
  judge0DispatchQueue
    .run(task)
    .catch((err) => logger.error({ err }, "Judge0 dispatch task failed"));
}
