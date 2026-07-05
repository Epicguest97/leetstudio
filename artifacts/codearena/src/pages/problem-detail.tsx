import { useMemo, useState } from "react";
import { useParams, Link } from "wouter";
import Editor from "@monaco-editor/react";
import {
  useGetProblem,
  getGetProblemQueryKey,
  useListLanguages,
  useCreateSubmission,
  useGetSubmission,
  getGetSubmissionQueryKey,
} from "@workspace/api-client-react";
import type { SubmissionTestResult } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  XCircle,
  Clock,
  MemoryStick,
  Play,
  Loader2,
  AlertTriangle,
  ChevronLeft,
} from "lucide-react";

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  if (difficulty === "easy")
    return (
      <Badge variant="secondary" className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
        Easy
      </Badge>
    );
  if (difficulty === "medium")
    return (
      <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20">
        Medium
      </Badge>
    );
  if (difficulty === "hard")
    return (
      <Badge variant="secondary" className="bg-red-500/10 text-red-500 hover:bg-red-500/20">
        Hard
      </Badge>
    );
  return <Badge variant="outline">{difficulty}</Badge>;
}

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
  return (
    <div className="border border-border rounded-md overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-accent/30">
        <div className="flex items-center gap-2 text-sm font-medium">
          {passed ? (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          ) : result.status === "queued" || result.status === "processing" ? (
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

export default function ProblemDetail() {
  const { id } = useParams<{ id: string }>();
  const problemId = Number(id);
  const search = typeof window !== "undefined" ? window.location.search : "";
  const contestId = useMemo(() => {
    const value = new URLSearchParams(search).get("contestId");
    return value ? Number(value) : undefined;
  }, [search]);

  const { isAuthenticated, login } = useAuth();

  const { data: problem, isLoading } = useGetProblem(problemId, {
    query: { enabled: !!problemId, queryKey: getGetProblemQueryKey(problemId) },
  });
  const { data: languages } = useListLanguages();

  const [languageId, setLanguageId] = useState<number | undefined>(undefined);
  const [sourceCode, setSourceCode] = useState("");
  const [submissionId, setSubmissionId] = useState<number | undefined>(undefined);

  const activeLanguage = languages?.find((l) => l.id === languageId) ?? languages?.[0];

  const createSubmission = useCreateSubmission();

  const { data: submission } = useGetSubmission(submissionId as number, {
    query: {
      enabled: !!submissionId,
      queryKey: getGetSubmissionQueryKey(submissionId as number),
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        return status === "queued" || status === "judging" ? 1200 : false;
      },
    },
  });

  const handleSubmit = () => {
    const targetLanguageId = languageId ?? languages?.[0]?.id;
    if (!targetLanguageId || !sourceCode.trim()) return;
    createSubmission.mutate(
      {
        data: {
          problemId,
          contestId: contestId ?? null,
          languageId: targetLanguageId,
          sourceCode,
        },
      },
      {
        onSuccess: (data) => setSubmissionId(data.id),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-4">
        <div className="h-8 w-64 bg-muted animate-pulse rounded"></div>
        <div className="h-64 bg-muted animate-pulse rounded-lg"></div>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold mb-2">Problem not found</h2>
        <Link href="/" className="text-primary hover:underline">
          Back to problems
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <Link
        href={contestId ? `/contests/${contestId}` : "/"}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ChevronLeft className="w-4 h-4 mr-1" /> Back
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold tracking-tight">{problem.title}</h1>
              <DifficultyBadge difficulty={problem.difficulty} />
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground font-mono">
              <span>{problem.points} points</span>
              <span>{problem.solvedCount} solved</span>
              <span>{problem.cpuTimeLimitSeconds}s / {Math.round(problem.memoryLimitKb / 1024)}MB</span>
            </div>
            {problem.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {problem.tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 bg-accent text-accent-foreground text-xs rounded-sm">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <Card>
            <CardContent className="p-5 prose prose-invert max-w-none">
              <p className="whitespace-pre-wrap text-foreground leading-relaxed">{problem.description}</p>
            </CardContent>
          </Card>

          {problem.sampleTestCases.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-bold text-lg">Sample Test Cases</h3>
              {problem.sampleTestCases.map((tc, i) => (
                <div key={tc.id} className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1 font-mono">Input {i + 1}</div>
                    <pre className="bg-muted rounded-md p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                      {tc.stdin || "(empty)"}
                    </pre>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1 font-mono">Expected Output {i + 1}</div>
                    <pre className="bg-muted rounded-md p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                      {tc.expectedOutput || "(empty)"}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {!isAuthenticated ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center space-y-4">
                <p className="text-muted-foreground">Sign in to write and submit code for this problem.</p>
                <Button onClick={login} className="font-bold">
                  Sign In to Solve
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <Select
                  value={activeLanguage ? String(activeLanguage.id) : undefined}
                  onValueChange={(value) => setLanguageId(Number(value))}
                >
                  <SelectTrigger className="w-48 font-mono">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {languages?.map((lang) => (
                      <SelectItem key={lang.id} value={String(lang.id)}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  onClick={handleSubmit}
                  disabled={createSubmission.isPending || !sourceCode.trim()}
                  className="font-bold"
                >
                  {createSubmission.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  Submit
                </Button>
              </div>

              <div className="border border-border rounded-lg overflow-hidden">
                <Editor
                  height="360px"
                  theme="vs-dark"
                  language={activeLanguage?.monacoId ?? "plaintext"}
                  value={sourceCode}
                  onChange={(value: string | undefined) => setSourceCode(value ?? "")}
                  options={{
                    fontSize: 13,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                  }}
                />
              </div>

              {submission && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <StatusPill status={submission.status} />
                    <span className="text-sm font-mono text-muted-foreground">
                      {submission.score} / {submission.maxScore} pts
                    </span>
                  </div>
                  <div className="space-y-2">
                    {submission.testResults.map((result, i) => (
                      <TestResultRow key={result.id} result={result} index={i} />
                    ))}
                  </div>
                  <Link href={`/submissions/${submission.id}`} className="text-sm text-primary hover:underline">
                    View full submission
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
