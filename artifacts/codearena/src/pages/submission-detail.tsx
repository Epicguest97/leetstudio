import { useParams, Link } from "wouter";
import { useGetSubmission, getGetSubmissionQueryKey } from "@workspace/api-client-react";
import { RequireAuth } from "@/components/require-auth";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  Clock,
  MemoryStick,
  Loader2,
  AlertTriangle,
  ChevronLeft,
} from "lucide-react";
import type { SubmissionTestResult } from "@workspace/api-client-react";

const STATUS_LABEL: Record<string, string> = {
  queued: "Queued",
  judging: "Judging",
  processing: "Judging",
  accepted: "Accepted",
  partial: "Partial",
  wrong_answer: "Wrong Answer",
  time_limit_exceeded: "Time Limit Exceeded",
  memory_limit_exceeded: "Memory Limit Exceeded",
  runtime_error: "Runtime Error",
  compilation_error: "Compilation Error",
  internal_error: "Internal Error",
};

function StatusPill({ status }: { status: string }) {
  const isPending = status === "queued" || status === "judging" || status === "processing";
  const isGood = status === "accepted";
  const isPartial = status === "partial";
  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold font-mono ${
        isPending
          ? "bg-blue-500/10 text-blue-400"
          : isGood
            ? "bg-green-500/10 text-green-500"
            : isPartial
              ? "bg-yellow-500/10 text-yellow-500"
              : "bg-red-500/10 text-red-500"
      }`}
    >
      {isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isGood ? (
        <CheckCircle2 className="w-4 h-4" />
      ) : isPartial ? (
        <AlertTriangle className="w-4 h-4" />
      ) : (
        <XCircle className="w-4 h-4" />
      )}
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function TestResultRow({ result, index }: { result: SubmissionTestResult; index: number }) {
  const passed = result.status === "accepted";
  const pending = result.status === "queued" || result.status === "processing";
  return (
    <div className="border border-border rounded-md overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-accent/30">
        <div className="flex items-center gap-2 text-sm font-medium">
          {passed ? (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          ) : pending ? (
            <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
          ) : (
            <XCircle className="w-4 h-4 text-red-500" />
          )}
          Test {index + 1}
          {result.isSample && (
            <Badge variant="outline" className="text-[10px] font-normal">
              sample
            </Badge>
          )}
          {!result.isSample && (
            <Badge variant="outline" className="text-[10px] font-normal">
              hidden
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
          {result.timeMs != null && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> {result.timeMs}ms
            </span>
          )}
          {result.memoryKb != null && (
            <span className="flex items-center gap-1">
              <MemoryStick className="w-3 h-3" /> {Math.round(result.memoryKb / 1024)}MB
            </span>
          )}
          <span className={passed ? "text-green-500" : "text-muted-foreground"}>
            {result.earnedPoints}/{result.points} pts
          </span>
        </div>
      </div>
      {result.isSample && (result.stdout || result.stderr || result.compileOutput) && (
        <div className="p-3 space-y-2 text-xs font-mono bg-background/50">
          {result.compileOutput && (
            <div>
              <div className="text-muted-foreground mb-1">Compile output</div>
              <pre className="whitespace-pre-wrap text-red-400">{result.compileOutput}</pre>
            </div>
          )}
          {result.stdout && (
            <div>
              <div className="text-muted-foreground mb-1">stdout</div>
              <pre className="whitespace-pre-wrap">{result.stdout}</pre>
            </div>
          )}
          {result.stderr && (
            <div>
              <div className="text-muted-foreground mb-1">stderr</div>
              <pre className="whitespace-pre-wrap text-red-400">{result.stderr}</pre>
            </div>
          )}
        </div>
      )}
      {!result.isSample && result.compileOutput && (
        <div className="p-3 text-xs font-mono bg-background/50">
          <div className="text-muted-foreground mb-1">Compile output</div>
          <pre className="whitespace-pre-wrap text-red-400">{result.compileOutput}</pre>
        </div>
      )}
    </div>
  );
}

export default function SubmissionDetail() {
  return (
    <RequireAuth>
      <SubmissionDetailContent />
    </RequireAuth>
  );
}

function SubmissionDetailContent() {
  const { id } = useParams<{ id: string }>();
  const submissionId = Number(id);

  const { data: submission, isLoading } = useGetSubmission(submissionId, {
    query: {
      enabled: !!submissionId,
      queryKey: getGetSubmissionQueryKey(submissionId),
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        return status === "queued" || status === "judging" ? 1200 : false;
      },
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-4">
        <div className="h-8 w-64 bg-muted animate-pulse rounded"></div>
        <div className="h-48 bg-muted animate-pulse rounded-lg"></div>
      </div>
    );
  }

  if (!submission) {
    return <div className="container mx-auto px-4 py-16 text-center">Submission not found</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Link
        href="/submissions"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ChevronLeft className="w-4 h-4 mr-1" /> Back to submissions
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <Link href={`/problems/${submission.problemId}`} className="hover:text-primary transition-colors">
              {submission.problemTitle}
            </Link>
          </h1>
          <div className="text-sm text-muted-foreground font-mono mt-1">
            {submission.languageName} • {new Date(submission.submittedAt).toLocaleString()}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusPill status={submission.status} />
          <span className="font-mono font-bold text-lg">
            {submission.score}/{submission.maxScore}
          </span>
        </div>
      </div>

      <div className="space-y-2 mb-6">
        <h2 className="font-bold text-lg">Test Results</h2>
        {submission.testResults.map((result, i) => (
          <TestResultRow key={result.id} result={result} index={i} />
        ))}
      </div>

      <div>
        <h2 className="font-bold text-lg mb-2">Source Code</h2>
        <pre className="bg-muted rounded-lg p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap">
          {submission.sourceCode}
        </pre>
      </div>
    </div>
  );
}
