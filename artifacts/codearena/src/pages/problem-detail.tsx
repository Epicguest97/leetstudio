import { useMemo, useState, useEffect, useRef } from "react";
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
  Play,
  Loader2,
  AlertTriangle,
  ChevronLeft,
} from "lucide-react";

// ── helpers ────────────────────────────────────────────────────────────────

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const map: Record<string, string> = {
    easy: "bg-green-500/15 text-green-400",
    medium: "bg-yellow-500/15 text-yellow-400",
    hard: "bg-red-500/15 text-red-400",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${map[difficulty] ?? "bg-muted text-muted-foreground"}`}>
      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
    </span>
  );
}

/** Minimal markdown → JSX: handles **bold**, `code`, and blank-line paragraphs */
function Markdown({ text }: { text: string }) {
  const paragraphs = text.split(/\n{2,}/);
  return (
    <div className="space-y-3 text-sm leading-relaxed text-foreground/90">
      {paragraphs.map((para, pi) => {
        const lines = para.split("\n");
        return (
          <p key={pi}>
            {lines.map((line, li) => (
              <span key={li}>
                {renderInline(line)}
                {li < lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function renderInline(line: string) {
  // Split on **bold** and `code`
  const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`"))
      return <code key={i} className="bg-muted px-1 py-0.5 rounded text-xs font-mono text-primary">{part.slice(1, -1)}</code>;
    return <span key={i}>{part}</span>;
  });
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

function StatusBadge({ status }: { status: string }) {
  const pending = status === "queued" || status === "judging" || status === "processing";
  const good = status === "accepted";
  const partial = status === "partial";
  const cls = pending
    ? "bg-blue-500/10 text-blue-400"
    : good
      ? "bg-green-500/10 text-green-400"
      : partial
        ? "bg-yellow-500/10 text-yellow-400"
        : "bg-red-500/10 text-red-400";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold ${cls}`}>
      {pending ? <Loader2 className="w-3 h-3 animate-spin" /> :
       good    ? <CheckCircle2 className="w-3 h-3" /> :
       partial ? <AlertTriangle className="w-3 h-3" /> :
                 <XCircle className="w-3 h-3" />}
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function TestRow({ result, index }: { result: SubmissionTestResult; index: number }) {
  const passed = result.status === "accepted";
  const pending = result.status === "queued" || result.status === "processing";
  return (
    <div className="border border-border rounded overflow-hidden text-xs">
      <div className="flex items-center justify-between px-3 py-2 bg-muted/40">
        <div className="flex items-center gap-2">
          {passed  ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> :
           pending ? <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" /> :
                     <XCircle className="w-3.5 h-3.5 text-red-400" />}
          <span className="font-medium">Test {index + 1}</span>
          {result.isSample && <span className="text-muted-foreground">(sample)</span>}
        </div>
        <div className="flex items-center gap-3 text-muted-foreground font-mono">
          {result.timeMs != null && (
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{result.timeMs}ms</span>
          )}
          <span className={passed ? "text-green-400" : ""}>
            {result.earnedPoints}/{result.points} pts
          </span>
        </div>
      </div>
      {result.isSample && (result.stdout || result.stderr || result.compileOutput) && (
        <div className="px-3 py-2 space-y-1.5 font-mono bg-background/60">
          {result.compileOutput && (
            <div><span className="text-muted-foreground">compile: </span><span className="text-red-400">{result.compileOutput}</span></div>
          )}
          {result.stdout && (
            <div><span className="text-muted-foreground">stdout: </span><span>{result.stdout}</span></div>
          )}
          {result.stderr && (
            <div><span className="text-muted-foreground">stderr: </span><span className="text-red-400">{result.stderr}</span></div>
          )}
        </div>
      )}
      {!result.isSample && result.compileOutput && (
        <div className="px-3 py-2 font-mono bg-background/60">
          <span className="text-muted-foreground">compile: </span>
          <span className="text-red-400">{result.compileOutput}</span>
        </div>
      )}
    </div>
  );
}

// ── starter templates ───────────────────────────────────────────────────────

const STARTER: Record<string, string> = {
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    // write your solution here

    return 0;
}`,
  python: `import sys
input = sys.stdin.readline

def solve():
    # write your solution here
    pass

solve()`,
  java: `import java.util.*;
import java.io.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));

        // write your solution here

    }
}`,
};

const getStarter = (monacoId: string) => STARTER[monacoId] ?? "// write your solution here\n";

// ── main component ──────────────────────────────────────────────────────────

export default function ProblemDetail() {
  const { id } = useParams<{ id: string }>();
  const problemId = Number(id);
  const contestId = useMemo(() => {
    const v = new URLSearchParams(
      typeof window !== "undefined" ? window.location.search : ""
    ).get("contestId");
    return v ? Number(v) : undefined;
  }, []);

  const { isAuthenticated, login } = useAuth();

  const { data: problem, isLoading } = useGetProblem(problemId, {
    query: { enabled: !!problemId, queryKey: getGetProblemQueryKey(problemId) },
  });
  const { data: languages } = useListLanguages();

  const [languageId, setLanguageId] = useState<number | undefined>(undefined);
  const [sourceCode, setSourceCode] = useState("");
  const [submissionId, setSubmissionId] = useState<number | undefined>(undefined);

  const activeLanguage = languages?.find((l) => l.id === languageId) ?? languages?.[0];
  const lastStarterRef = useRef("");

  useEffect(() => {
    if (!activeLanguage) return;
    if (sourceCode === "" || sourceCode === lastStarterRef.current) {
      const s = getStarter(activeLanguage.monacoId);
      lastStarterRef.current = s;
      setSourceCode(s);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLanguage?.monacoId]);

  const createSubmission = useCreateSubmission();

  const { data: submission } = useGetSubmission(submissionId as number, {
    query: {
      enabled: !!submissionId,
      queryKey: getGetSubmissionQueryKey(submissionId as number),
      refetchInterval: (q) => {
        const s = q.state.data?.status;
        return s === "queued" || s === "judging" ? 1200 : false;
      },
    },
  });

  const handleSubmit = () => {
    const lid = languageId ?? languages?.[0]?.id;
    if (!lid || !sourceCode.trim()) return;
    createSubmission.mutate(
      { data: { problemId, contestId: contestId ?? null, languageId: lid, sourceCode } },
      { onSuccess: (d) => setSubmissionId(d.id) },
    );
  };

  // ── loading / error states ────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-muted-foreground">Problem not found.</p>
        <Link href="/" className="text-primary text-sm hover:underline">← Back to problems</Link>
      </div>
    );
  }

  // ── layout ────────────────────────────────────────────────────────────────
  // Full-height split: left = problem description, right = editor

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 56px)" }}>

      {/* ── top bar ── */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-border bg-card shrink-0">
        <Link
          href={contestId ? `/contests/${contestId}` : "/"}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </Link>
        <div className="flex items-center gap-2">
          <span className="font-semibold">{problem.title}</span>
          <DifficultyBadge difficulty={problem.difficulty} />
        </div>
        <div className="ml-auto flex items-center gap-4 text-xs text-muted-foreground font-mono">
          <span>{problem.points} pts</span>
          <span>{problem.cpuTimeLimitSeconds}s</span>
          <span>{Math.round(problem.memoryLimitKb / 1024)} MB</span>
        </div>
      </div>

      {/* ── split pane ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT: description ── */}
        <div className="w-[45%] border-r border-border overflow-y-auto p-5 space-y-5">

          {/* description */}
          <Markdown text={problem.description} />

          {/* sample test cases */}
          {problem.sampleTestCases.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Examples</p>
              {problem.sampleTestCases.map((tc, i) => (
                <div key={tc.id} className="space-y-1">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Input {i + 1}</p>
                      <pre className="bg-muted rounded p-2.5 text-xs font-mono whitespace-pre-wrap leading-relaxed">
                        {tc.stdin || "(empty)"}
                      </pre>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Output {i + 1}</p>
                      <pre className="bg-muted rounded p-2.5 text-xs font-mono whitespace-pre-wrap leading-relaxed">
                        {tc.expectedOutput || "(empty)"}
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* tags */}
          {problem.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border">
              {problem.tags.map((t) => (
                <Badge key={t} variant="secondary" className="text-xs font-normal">{t}</Badge>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT: editor + results ── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* editor toolbar */}
          <div className="flex items-center gap-3 px-3 py-2 border-b border-border bg-card shrink-0">
            <Select
              value={activeLanguage ? String(activeLanguage.id) : ""}
              onValueChange={(v) => setLanguageId(Number(v))}
            >
              <SelectTrigger className="w-44 h-8 text-sm font-mono">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                {languages?.map((lang) => (
                  <SelectItem key={lang.id} value={String(lang.id)} className="font-mono text-sm">
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="ml-auto">
              {!isAuthenticated ? (
                <Button size="sm" onClick={login} className="font-semibold">
                  Sign in to submit
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={createSubmission.isPending || !sourceCode.trim()}
                  className="font-semibold"
                >
                  {createSubmission.isPending
                    ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Submitting…</>
                    : <><Play className="w-3.5 h-3.5 mr-1.5" />Submit</>}
                </Button>
              )}
            </div>
          </div>

          {/* Monaco editor */}
          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              theme="vs-dark"
              language={activeLanguage?.monacoId ?? "plaintext"}
              value={sourceCode}
              onChange={(v: string | undefined) => setSourceCode(v ?? "")}
              options={{
                fontSize: 13,
                lineHeight: 20,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                padding: { top: 12, bottom: 12 },
                fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, monospace",
                renderLineHighlight: "line",
              }}
            />
          </div>

          {/* results panel */}
          {submission && (
            <div className="border-t border-border bg-card shrink-0 max-h-56 overflow-y-auto p-3 space-y-2">
              <div className="flex items-center justify-between">
                <StatusBadge status={submission.status} />
                <span className="text-xs font-mono text-muted-foreground">
                  {submission.score} / {submission.maxScore} pts
                </span>
              </div>
              <div className="space-y-1.5">
                {submission.testResults.map((r, i) => (
                  <TestRow key={r.id} result={r} index={i} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
