import { useMemo, useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, XCircle, Clock, Play, Loader2, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";

// ── VS Code colors ──────────────────────────────────────────────────────────
const C = {
  border:    "#404751",
  tabBar:    "#1e2020",
  activeTab: "#121414",
  textDim:   "#c0c7d3",
  text:      "#e3e2e2",
  blue:      "#007acc",
  blueLight: "#9fcaff",
  descBg:    "#121414",
  panelBg:   "#1a1c1c",
};

// ── Starter templates ───────────────────────────────────────────────────────
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

const getStarter = (id: string) => STARTER[id] ?? "// write your solution here\n";

// ── Minimal markdown renderer ───────────────────────────────────────────────
function Markdown({ text }: { text: string }) {
  const paragraphs = text.split(/\n{2,}/);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {paragraphs.map((para, pi) => (
        <p key={pi} style={{ margin: 0, lineHeight: 1.65 }}>
          {para.split("\n").map((line, li, arr) => (
            <span key={li}>
              {renderInline(line)}
              {li < arr.length - 1 && <br />}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}

function renderInline(line: string): React.ReactNode[] {
  return line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i} style={{ fontWeight: 600, color: C.text }}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`"))
      return <code key={i} style={{ background: "#2a2d2e", color: C.blueLight, padding: "1px 5px", borderRadius: 3, fontFamily: "JetBrains Mono", fontSize: "0.88em" }}>{part.slice(1, -1)}</code>;
    return <span key={i}>{part}</span>;
  });
}

// ── Difficulty badge ────────────────────────────────────────────────────────
function DiffBadge({ d }: { d: string }) {
  const color = d === "easy" ? "#4ec994" : d === "medium" ? "#e5c07b" : "#e06c75";
  const bg    = d === "easy" ? "#4ec99420" : d === "medium" ? "#e5c07b20" : "#e06c7520";
  const label = d === "easy" ? "Easy" : d === "medium" ? "Medium" : "Hard";
  return <span style={{ color, background: bg, fontSize: 11, fontFamily: "JetBrains Mono", padding: "2px 7px", borderRadius: 2 }}>{label}</span>;
}

// ── Status badge ────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  queued: "Queued", judging: "Judging", processing: "Judging",
  accepted: "Accepted", partial: "Partial",
  wrong_answer: "Wrong Answer", time_limit_exceeded: "Time Limit",
  memory_limit_exceeded: "Memory Limit", runtime_error: "Runtime Error",
  compilation_error: "Compile Error", internal_error: "Internal Error",
};

function StatusBadge({ status }: { status: string }) {
  const pending = status === "queued" || status === "judging" || status === "processing";
  const good    = status === "accepted";
  const partial = status === "partial";
  const color   = pending ? "#9fcaff" : good ? "#4ec994" : partial ? "#e5c07b" : "#e06c75";
  const bg      = pending ? "#9fcaff20" : good ? "#4ec99420" : partial ? "#e5c07b20" : "#e06c7520";
  return (
    <span style={{ color, background: bg, display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 8px", borderRadius: 2, fontSize: 12, fontFamily: "JetBrains Mono" }}>
      {pending ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> :
       good    ? <CheckCircle2 size={12} /> :
       partial ? <AlertTriangle size={12} /> :
                 <XCircle size={12} />}
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

// ── Test result row ─────────────────────────────────────────────────────────
function TestRow({ result, index }: { result: SubmissionTestResult; index: number }) {
  const passed  = result.status === "accepted";
  const pending = result.status === "queued" || result.status === "processing";
  const color   = passed ? "#4ec994" : pending ? "#9fcaff" : "#e06c75";
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 2, overflow: "hidden", fontSize: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 10px", background: "#222424" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, color }}>
          {passed  ? <CheckCircle2 size={12} /> :
           pending ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> :
                     <XCircle size={12} />}
          <span style={{ color: C.text }}>Test {index + 1}</span>
          {result.isSample && <span style={{ color: C.textDim, fontSize: 11 }}>(sample)</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: C.textDim, fontFamily: "JetBrains Mono", fontSize: 11 }}>
          {result.timeMs != null && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Clock size={10} />{result.timeMs}ms</span>}
          <span style={{ color: passed ? "#4ec994" : C.textDim }}>{result.earnedPoints}/{result.points} pts</span>
        </div>
      </div>
      {result.isSample && (result.stdout || result.stderr || result.compileOutput) && (
        <div style={{ padding: "6px 10px", fontFamily: "JetBrains Mono", fontSize: 11, background: "#1a1c1c", display: "flex", flexDirection: "column", gap: 3 }}>
          {result.compileOutput && <div><span style={{ color: C.textDim }}>compile: </span><span style={{ color: "#e06c75" }}>{result.compileOutput}</span></div>}
          {result.stdout && <div><span style={{ color: C.textDim }}>stdout: </span><span>{result.stdout}</span></div>}
          {result.stderr && <div><span style={{ color: C.textDim }}>stderr: </span><span style={{ color: "#e06c75" }}>{result.stderr}</span></div>}
        </div>
      )}
      {!result.isSample && result.compileOutput && (
        <div style={{ padding: "6px 10px", fontFamily: "JetBrains Mono", fontSize: 11, background: "#1a1c1c" }}>
          <span style={{ color: C.textDim }}>compile: </span><span style={{ color: "#e06c75" }}>{result.compileOutput}</span>
        </div>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function ProblemDetail() {
  const { id } = useParams<{ id: string }>();
  const problemId = Number(id);
  const contestId = useMemo(() => {
    const v = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").get("contestId");
    return v ? Number(v) : undefined;
  }, []);

  const { isAuthenticated, login } = useAuth();

  const { data: problem, isLoading } = useGetProblem(problemId, {
    query: { enabled: !!problemId, queryKey: getGetProblemQueryKey(problemId) },
  });
  const { data: languages } = useListLanguages();

  const [languageId, setLanguageId]   = useState<number | undefined>(undefined);
  const [sourceCode, setSourceCode]   = useState("");
  const [submissionId, setSubmissionId] = useState<number | undefined>(undefined);
  const [panelOpen, setPanelOpen]     = useState(false);

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

  // Auto-open results panel on first submission
  useEffect(() => {
    if (submissionId) setPanelOpen(true);
  }, [submissionId]);

  const handleSubmit = () => {
    const lid = languageId ?? languages?.[0]?.id;
    if (!lid || !sourceCode.trim()) return;
    createSubmission.mutate(
      { data: { problemId, contestId: contestId ?? null, languageId: lid, sourceCode } },
      { onSuccess: (d) => setSubmissionId(d.id) },
    );
  };

  // File extension for tab label
  const extMap: Record<string, string> = { cpp: "cpp", python: "py", java: "java" };
  const ext = extMap[activeLanguage?.monacoId ?? ""] ?? "txt";
  const solutionFilename = problem
    ? `${problem.title.toLowerCase().replace(/\s+/g, "-")}.${ext}`
    : `solution.${ext}`;

  // ── Loading ────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: C.textDim, gap: 8, fontFamily: "JetBrains Mono", fontSize: 13 }}>
        <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Loading problem...
      </div>
    );
  }

  if (!problem) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, color: C.textDim }}>
        <span>Problem not found.</span>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ── Tab bar ────────────────────────────────────────────────────── */}
      <div
        style={{
          height: 35,
          background: C.tabBar,
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          alignItems: "stretch",
          flexShrink: 0,
          userSelect: "none",
        }}
      >
        {/* Description tab */}
        <Tab label="Problem Description" icon="doc" active={false} />
        {/* Solution tab */}
        <Tab label={solutionFilename} icon="code" active={true} />
      </div>

      {/* ── Breadcrumb ──────────────────────────────────────────────────── */}
      <div
        style={{
          height: 22,
          background: "#1a1c1c",
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          gap: 4,
          fontSize: 11,
          fontFamily: "JetBrains Mono",
          color: C.textDim,
          flexShrink: 0,
          userSelect: "none",
        }}
      >
        <span>CodeArena</span>
        <span style={{ opacity: 0.5 }}>›</span>
        <span>Problems</span>
        <span style={{ opacity: 0.5 }}>›</span>
        <span style={{ color: C.text }}>{problem.id}. {problem.title}</span>
      </div>

      {/* ── Split pane ──────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* LEFT: description (40%) */}
        <div
          style={{
            width: "40%",
            borderRight: `1px solid ${C.border}`,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            background: C.descBg,
          }}
        >
          {/* Problem header */}
          <div style={{ padding: "16px 20px 12px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: C.text }}>{problem.id}. {problem.title}</span>
              <DiffBadge d={problem.difficulty} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 11, fontFamily: "JetBrains Mono", color: C.textDim }}>
              <span>{problem.points} pts</span>
              <span>{problem.cpuTimeLimitSeconds}s</span>
              <span>{Math.round(problem.memoryLimitKb / 1024)} MB</span>
              <span>{problem.solvedCount} solved</span>
            </div>
          </div>

          {/* Scrollable description */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", fontSize: 13, color: C.text, lineHeight: 1.65 }}>

            <Markdown text={problem.description} />

            {/* Sample test cases */}
            {problem.sampleTestCases.length > 0 && (
              <div style={{ marginTop: 20 }}>
                {problem.sampleTestCases.map((tc, i) => (
                  <div key={tc.id} style={{ marginBottom: 16 }}>
                    <p style={{ margin: "0 0 6px", fontWeight: 600, color: C.text }}>Example {i + 1}:</p>
                    <div style={{ background: "#1e2020", border: `1px solid ${C.border}`, borderRadius: 3, padding: "10px 12px", fontFamily: "JetBrains Mono", fontSize: 12 }}>
                      <div style={{ marginBottom: tc.expectedOutput ? 6 : 0 }}>
                        <span style={{ color: C.textDim }}>Input: </span>
                        <span>{tc.stdin || "(empty)"}</span>
                      </div>
                      {tc.expectedOutput && (
                        <div>
                          <span style={{ color: C.textDim }}>Output: </span>
                          <span>{tc.expectedOutput}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tags */}
            {problem.tags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
                {problem.tags.map((t) => (
                  <span key={t} style={{ fontSize: 11, fontFamily: "JetBrains Mono", background: "#292a2a", color: C.textDim, padding: "2px 7px", borderRadius: 2 }}>{t}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: editor (60%) */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Editor toolbar */}
          <div
            style={{
              height: 36,
              background: "#1a1c1c",
              borderBottom: `1px solid ${C.border}`,
              display: "flex",
              alignItems: "center",
              padding: "0 10px",
              gap: 8,
              flexShrink: 0,
            }}
          >
            <Select
              value={activeLanguage ? String(activeLanguage.id) : ""}
              onValueChange={(v) => setLanguageId(Number(v))}
            >
              <SelectTrigger
                style={{
                  width: 160,
                  height: 26,
                  fontSize: 12,
                  fontFamily: "JetBrains Mono",
                  background: "#292a2a",
                  border: `1px solid ${C.border}`,
                  borderRadius: 2,
                  color: C.text,
                }}
              >
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                {languages?.map((lang) => (
                  <SelectItem key={lang.id} value={String(lang.id)} style={{ fontFamily: "JetBrains Mono", fontSize: 12 }}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div style={{ flex: 1 }} />

            {/* Submit / Sign in */}
            {!isAuthenticated ? (
              <button
                onClick={login}
                style={{
                  background: C.blue, color: "#fff", border: "none", cursor: "pointer",
                  padding: "4px 14px", borderRadius: 2, fontSize: 12, fontWeight: 600,
                  fontFamily: "'Hanken Grotesk', sans-serif",
                }}
              >
                Sign in to submit
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={createSubmission.isPending || !sourceCode.trim()}
                style={{
                  background: createSubmission.isPending ? "#005a9e" : C.blue,
                  color: "#fff", border: "none", cursor: createSubmission.isPending ? "not-allowed" : "pointer",
                  padding: "4px 14px", borderRadius: 2, fontSize: 12, fontWeight: 600,
                  display: "flex", alignItems: "center", gap: 5,
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  opacity: (!sourceCode.trim()) ? 0.5 : 1,
                }}
              >
                {createSubmission.isPending
                  ? <><Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> Submitting…</>
                  : <><Play size={12} /> Submit</>}
              </button>
            )}
          </div>

          {/* Monaco editor */}
          <div style={{ flex: 1, overflow: "hidden" }}>
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
                fontFamily: "'JetBrains Mono', monospace",
                fontLigatures: true,
                renderLineHighlight: "line",
                cursorBlinking: "smooth",
                smoothScrolling: true,
              }}
            />
          </div>

          {/* Bottom results panel */}
          {submission && (
            <div
              style={{
                background: C.panelBg,
                borderTop: `1px solid ${C.border}`,
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Panel tab bar */}
              <div
                style={{
                  height: 30,
                  display: "flex",
                  alignItems: "center",
                  padding: "0 12px",
                  borderBottom: `1px solid ${C.border}`,
                  userSelect: "none",
                }}
              >
                <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: C.textDim, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Test Results
                </span>
                <div style={{ flex: 1 }} />
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 8 }}>
                  <StatusBadge status={submission.status} />
                  <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: C.textDim }}>
                    {submission.score} / {submission.maxScore} pts
                  </span>
                </div>
                <button
                  onClick={() => setPanelOpen((v) => !v)}
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: C.textDim, display: "flex", padding: 2 }}
                >
                  {panelOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </button>
              </div>

              {panelOpen && (
                <div style={{ maxHeight: 220, overflowY: "auto", padding: "8px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
                  {submission.testResults.map((r, i) => (
                    <TestRow key={r.id} result={r} index={i} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tab component ───────────────────────────────────────────────────────────
function Tab({ label, icon, active }: { label: string; icon: "doc" | "code"; active: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "0 14px",
        height: "100%",
        background: active ? C.activeTab : "transparent",
        borderTop: active ? `1px solid ${C.blue}` : "1px solid transparent",
        borderRight: `1px solid ${C.border}`,
        fontSize: 12,
        color: active ? C.text : C.textDim,
        cursor: "pointer",
        whiteSpace: "nowrap",
        userSelect: "none",
        flexShrink: 0,
      }}
    >
      {icon === "doc"
        ? <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M9.5 1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5z"/><polyline points="9.5 1 9.5 4.5 13 4.5"/></svg>
        : <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={active ? C.blueLight : C.textDim} strokeWidth="1.3"><path d="M9.5 1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5z"/><polyline points="9.5 1 9.5 4.5 13 4.5"/></svg>}
      <span>{label}</span>
    </div>
  );
}
