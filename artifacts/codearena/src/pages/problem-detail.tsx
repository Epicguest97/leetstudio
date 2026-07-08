import { useState, useEffect, useRef, useCallback } from "react";
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
import {
  VscLoading,
  VscClose,
  VscChevronDown,
  VscChevronUp,
  VscCode,
  VscBook,
} from "react-icons/vsc";

// ── VS Code colors ──────────────────────────────────────────────────────────
const C = {
  border:    "#404751",
  tabBar:    "#1e2020",
  activeTab: "#121414",
  inactiveTab: "#2d2f2f",
  textDim:   "#c0c7d3",
  text:      "#e3e2e2",
  blue:      "#007acc",
  blueLight: "#9fcaff",
  panelBg:   "#1a1c1c",
  termBg:    "#0d0e0f",
  termGreen: "#4ec994",
  termRed:   "#e06c75",
  termYellow:"#e5c07b",
  termCyan:  "#56b6c2",
  termDim:   "#6e7681",
};

// ── Language definitions ────────────────────────────────────────────────────
type LangKey = "cpp" | "python" | "java";

const LANG_META: Record<LangKey, {
  label: string;
  icon: React.ReactNode;
  ext: string;
  filenameFn: (slug: string) => string;
  runCommand: (filename: string) => string;
  monacoId: string;
}> = {
  cpp: {
    label: "C++",
    ext: "cpp",
    monacoId: "cpp",
    filenameFn: (s) => s.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("_") + ".cpp",
    runCommand: (f) => `g++ ${f} -o solution && ./solution`,
    icon: <VscCode size={13} style={{ color: "#56d8f5" }} />,
  },
  python: {
    label: "Python",
    ext: "py",
    monacoId: "python",
    filenameFn: (s) => s + ".py",
    runCommand: (f) => `python3 ${f}`,
    icon: <VscCode size={13} style={{ color: "#3572A5" }} />,
  },
  java: {
    label: "Java",
    ext: "java",
    monacoId: "java",
    filenameFn: (s) => s.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("") + ".java",
    runCommand: (f) => `javac ${f} && java ${f.replace(".java", "")}`,
    icon: <VscCode size={13} style={{ color: "#b07219" }} />,
  },
};

// ── Starter templates ───────────────────────────────────────────────────────
const STARTER: Record<LangKey, string> = {
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

function DiffBadge({ d }: { d: string }) {
  const color = d === "easy" ? "#4ec994" : d === "medium" ? "#e5c07b" : "#e06c75";
  const bg    = d === "easy" ? "#4ec99420" : d === "medium" ? "#e5c07b20" : "#e06c7520";
  const label = d === "easy" ? "Easy" : d === "medium" ? "Medium" : "Hard";
  return <span style={{ color, background: bg, fontSize: 11, fontFamily: "JetBrains Mono", padding: "2px 7px", borderRadius: 2 }}>{label}</span>;
}

// ── Terminal line types ─────────────────────────────────────────────────────
type TermLine =
  | { type: "command"; text: string }
  | { type: "output"; text: string; color?: string }
  | { type: "blank" };

function formatTestResults(results: SubmissionTestResult[], score: number, maxScore: number): TermLine[] {
  const lines: TermLine[] = [];
  const passed = results.filter((r) => r.status === "accepted").length;
  lines.push({ type: "output", text: "" });
  lines.push({ type: "output", text: `Running ${results.length} test case${results.length !== 1 ? "s" : ""}...` });
  lines.push({ type: "output", text: "" });

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const ok   = r.status === "accepted";
    const icon = ok ? "✓" : "✗";
    const label = ok ? "Accepted" : r.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const timing = r.timeMs != null ? ` [${r.timeMs}ms]` : "";
    const pts    = `  ${r.earnedPoints}/${r.points} pts`;
    const sampleTag = r.isSample ? " (sample)" : " (hidden)";
    lines.push({
      type: "output",
      text: `  ${icon}  Test ${i + 1}${sampleTag}  ${label}${timing}${pts}`,
      color: ok ? C.termGreen : C.termRed,
    });
    if (r.isSample && r.stdout) {
      lines.push({ type: "output", text: `     stdout: ${r.stdout.trim()}`, color: C.termDim });
    }
    if (r.isSample && r.stderr) {
      lines.push({ type: "output", text: `     stderr: ${r.stderr.trim()}`, color: C.termRed });
    }
    if (r.compileOutput) {
      lines.push({ type: "output", text: `     compile: ${r.compileOutput.trim()}`, color: C.termYellow });
    }
  }

  lines.push({ type: "output", text: "" });
  const scoreColor = passed === results.length ? C.termGreen : passed > 0 ? C.termYellow : C.termRed;
  lines.push({ type: "output", text: `  Score: ${passed}/${results.length} tests passed  |  ${score}/${maxScore} pts`, color: scoreColor });
  lines.push({ type: "output", text: "" });
  return lines;
}

// ── Tab bar for languages ───────────────────────────────────────────────────
function LangTab({
  langKey, filename, active, modified, onClick
}: {
  langKey: LangKey; filename: string; active: boolean; modified: boolean; onClick: () => void;
}) {
  const meta = LANG_META[langKey];
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        padding: "0 14px",
        height: "100%",
        background: active ? C.activeTab : C.inactiveTab,
        borderTop: active ? `1px solid ${C.blue}` : "1px solid transparent",
        borderRight: `1px solid ${C.border}`,
        fontSize: 12,
        color: active ? C.text : C.textDim,
        cursor: "pointer",
        whiteSpace: "nowrap",
        userSelect: "none",
        flexShrink: 0,
        transition: "background 0.1s, color 0.1s",
        position: "relative",
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "#252727"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = C.inactiveTab; }}
    >
      <span style={{ display: "flex", alignItems: "center", width: 14, justifyContent: "center" }}>
        {meta.icon}
      </span>
      <span>{filename}</span>
      {modified && active && (
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.text, display: "inline-block", marginLeft: 2, flexShrink: 0 }} />
      )}
    </div>
  );
}

// ── Terminal ────────────────────────────────────────────────────────────────
function Terminal({
  lines,
  prompt,
  input,
  onInput,
  onEnter,
  loading,
  terminalOpen,
  onToggle,
  height,
}: {
  lines: TermLine[];
  prompt: string;
  input: string;
  onInput: (v: string) => void;
  onEnter: () => void;
  loading: boolean;
  terminalOpen: boolean;
  onToggle: () => void;
  height: number;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  return (
    <div
      style={{
        background: C.panelBg,
        borderTop: `1px solid ${C.border}`,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      {/* Terminal tab bar */}
      <div
        style={{
          height: 30,
          display: "flex",
          alignItems: "center",
          borderBottom: terminalOpen ? `1px solid ${C.border}` : "none",
          userSelect: "none",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "0 12px",
            height: "100%",
            borderRight: `1px solid ${C.border}`,
            borderBottom: `1px solid ${C.blue}`,
            fontSize: 11,
            fontFamily: "JetBrains Mono",
            color: C.text,
            cursor: "pointer",
            letterSpacing: "0.04em",
          }}
        >
          TERMINAL
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={onToggle}
          style={{ background: "transparent", border: "none", cursor: "pointer", color: C.textDim, padding: "4px 10px", display: "flex", alignItems: "center" }}
        >
          {terminalOpen ? <VscChevronDown size={13} /> : <VscChevronUp size={13} />}
        </button>
        {terminalOpen && (
          <button
            onClick={() => onInput("") }
            style={{ background: "transparent", border: "none", cursor: "pointer", color: C.textDim, padding: "4px 10px", display: "flex", alignItems: "center" }}
            title="Clear terminal"
          >
            <VscClose size={13} />
          </button>
        )}
      </div>

      {terminalOpen && (
        <div
          style={{ height, background: C.termBg, overflow: "hidden", display: "flex", flexDirection: "column", cursor: "text" }}
          onClick={() => inputRef.current?.focus()}
        >
          {/* Output area */}
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px 4px", fontFamily: "JetBrains Mono", fontSize: 12, lineHeight: "18px" }}>
            {lines.map((line, i) => {
              if (line.type === "blank") return <div key={i} style={{ height: 6 }} />;
              if (line.type === "command") return (
                <div key={i} style={{ color: C.termGreen }}>
                  <span style={{ color: C.termCyan }}>{prompt}</span>
                  <span>{line.text}</span>
                </div>
              );
              return (
                <div key={i} style={{ color: line.color ?? C.text, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                  {line.text}
                </div>
              );
            })}
            {loading && (
              <div style={{ color: C.termCyan, display: "flex", alignItems: "center", gap: 6 }}>
                <VscLoading size={11} style={{ animation: "spin 1s linear infinite" }} />
                Waiting for judge...
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input line */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "4px 12px 8px",
              gap: 0,
              fontFamily: "JetBrains Mono",
              fontSize: 12,
              flexShrink: 0,
            }}
          >
            <span style={{ color: C.termCyan, userSelect: "none", marginRight: 4 }}>{prompt}</span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => onInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onEnter();
              }}
              disabled={loading}
              spellCheck={false}
              autoComplete="off"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: C.text,
                fontFamily: "JetBrains Mono",
                fontSize: 12,
                caretColor: C.text,
                opacity: loading ? 0.5 : 1,
              }}
              placeholder={loading ? "" : "type a command..."}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function ProblemDetail() {
  const { id } = useParams<{ id: string }>();
  const problemId = Number(id);

  const { data: problem, isLoading } = useGetProblem(problemId, {
    query: { enabled: !!problemId, queryKey: getGetProblemQueryKey(problemId) },
  });
  const { data: languages } = useListLanguages();

  // ── Language tabs state ──────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<LangKey>("cpp");
  const [codes, setCodes] = useState<Record<LangKey, string>>({
    cpp:    STARTER.cpp,
    python: STARTER.python,
    java:   STARTER.java,
  });
  const [modified, setModified] = useState<Record<LangKey, boolean>>({
    cpp: false, python: false, java: false,
  });

  const handleCodeChange = useCallback((v: string | undefined) => {
    setCodes((prev) => ({ ...prev, [activeTab]: v ?? "" }));
    setModified((prev) => ({ ...prev, [activeTab]: true }));
  }, [activeTab]);

  // ── Terminal state ───────────────────────────────────────────────────────
  const [termLines, setTermLines] = useState<TermLine[]>([
    { type: "output", text: "Welcome to CodeArena terminal.", color: C.termDim },
    { type: "output", text: 'Type the run command to submit your solution.', color: C.termDim },
    { type: "output", text: "" },
  ]);
  const [termInput, setTermInput] = useState("");
  const [termOpen, setTermOpen]   = useState(true);

  // ── Submission state ─────────────────────────────────────────────────────
  const [submissionId, setSubmissionId] = useState<number | undefined>(undefined);
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

  // When submission finishes, print results to terminal
  const lastPrintedRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!submission) return;
    const done = submission.status !== "queued" && submission.status !== "judging";
    if (done && lastPrintedRef.current !== submission.id) {
      lastPrintedRef.current = submission.id;
      const resultLines = formatTestResults(submission.testResults, submission.score, submission.maxScore);
      setTermLines((prev) => [...prev, ...resultLines]);
    }
  }, [submission]);

  // Terminal prompt
  const problemSlug = problem ? problem.title.toLowerCase().replace(/\s+/g, "-") : "problem";
  const prompt = `~/leetstudio/${problemSlug}$ `;

  // Update hint in terminal when tab or problem changes
  useEffect(() => {
    if (!problem) return;
    const meta = LANG_META[activeTab];
    const filename = meta.filenameFn(problemSlug);
    const cmd = meta.runCommand(filename);
    setTermLines([
      { type: "output", text: "Welcome to LeetStudio terminal.", color: C.termDim },
      { type: "output", text: `Run command: ${cmd}`, color: C.termDim },
      { type: "output", text: "" },
    ]);
    setTermInput("");
    setSubmissionId(undefined);
    lastPrintedRef.current = undefined;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemId, activeTab]);

  const handleTermEnter = useCallback(() => {
    const cmd = termInput.trim();
    if (!cmd) return;

    setTermLines((prev) => [...prev, { type: "command", text: cmd }]);
    setTermInput("");

    // Clear command
    if (cmd === "clear") {
      setTermLines([]);
      return;
    }

    // Help
    if (cmd === "help") {
      const meta = LANG_META[activeTab];
      const filename = meta.filenameFn(problemSlug);
      setTermLines((prev) => [
        ...prev,
        { type: "output", text: `Available commands:`, color: C.termCyan },
        { type: "output", text: `  ${meta.runCommand(filename)}`, color: C.text },
        { type: "output", text: "  clear    — clear the terminal" },
        { type: "output", text: "" },
      ]);
      return;
    }

    // Determine which language the command targets
    let targetLang: LangKey | null = null;
    if (cmd.includes(".cpp") || cmd.includes("g++") || cmd.includes("gcc")) targetLang = "cpp";
    else if (cmd.includes(".py") || cmd.includes("python")) targetLang = "python";
    else if (cmd.includes(".java") || cmd.includes("javac") || cmd.includes("java ")) targetLang = "java";

    if (!targetLang) {
      setTermLines((prev) => [
        ...prev,
        { type: "output", text: `bash: ${cmd.split(" ")[0]}: command not found`, color: C.termRed },
        { type: "output", text: "Try 'help' to see available commands.", color: C.termDim },
        { type: "output", text: "" },
      ]);
      return;
    }

    // Find the language ID
    const monacoId = LANG_META[targetLang].monacoId;
    const lang = languages?.find((l) => l.monacoId === monacoId);
    if (!lang) {
      setTermLines((prev) => [
        ...prev,
        { type: "output", text: `Language ${targetLang} is not available.`, color: C.termRed },
        { type: "output", text: "" },
      ]);
      return;
    }

    const src = codes[targetLang];
    if (!src.trim()) {
      setTermLines((prev) => [
        ...prev,
        { type: "output", text: "Error: empty source file.", color: C.termRed },
        { type: "output", text: "" },
      ]);
      return;
    }

    setTermLines((prev) => [
      ...prev,
      { type: "output", text: "" },
    ]);

    createSubmission.mutate(
      { data: { problemId, contestId: null, languageId: lang.id, sourceCode: src } },
      {
        onSuccess: (d) => setSubmissionId(d.id),
        onError:   () => {
          setTermLines((prev) => [
            ...prev,
            { type: "output", text: "Error: could not reach the judge. Try again.", color: C.termRed },
            { type: "output", text: "" },
          ]);
        },
      },
    );
  }, [termInput, activeTab, codes, languages, problemId, problemSlug, createSubmission]);

  // ── Filenames ────────────────────────────────────────────────────────────
  const filenames = (["cpp", "python", "java"] as LangKey[]).reduce(
    (acc, k) => ({ ...acc, [k]: LANG_META[k].filenameFn(problem ? problemSlug : "solution") }),
    {} as Record<LangKey, string>,
  );

  // ── Loading / not-found ──────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: C.textDim, gap: 8, fontFamily: "JetBrains Mono", fontSize: 13 }}>
        <VscLoading size={16} style={{ animation: "spin 1s linear infinite" }} /> Loading...
      </div>
    );
  }
  if (!problem) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: C.textDim, fontSize: 13 }}>
        Problem not found.
      </div>
    );
  }

  const isJudging = submissionId != null && (submission?.status === "queued" || submission?.status === "judging" || !submission);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ── Tab bar (shared) ──────────────────────────────────────────────── */}
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
        {/* Description tab (pinned left) */}
        <div
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "0 14px", height: "100%",
            background: "transparent", borderTop: "1px solid transparent", borderRight: `1px solid ${C.border}`,
            fontSize: 12, color: C.textDim, userSelect: "none", flexShrink: 0,
          }}
        >
          <VscBook size={13} style={{ marginRight: 2 }} />
          Problem Description
        </div>

        {/* Language tabs */}
        {(["cpp", "python", "java"] as LangKey[]).map((k) => (
          <LangTab
            key={k}
            langKey={k}
            filename={filenames[k]}
            active={activeTab === k}
            modified={modified[k]}
            onClick={() => setActiveTab(k)}
          />
        ))}
      </div>

      {/* ── Split pane ───────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

        {/* LEFT: description (40%) */}
        <div
          style={{
            width: "40%", borderRight: `1px solid ${C.border}`,
            display: "flex", flexDirection: "column", overflow: "hidden",
          }}
        >
          {/* Header */}
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

            {problem.sampleTestCases.length > 0 && (
              <div style={{ marginTop: 20 }}>
                {problem.sampleTestCases.map((tc, i) => (
                  <div key={tc.id} style={{ marginBottom: 16 }}>
                    <p style={{ margin: "0 0 6px", fontWeight: 600, color: C.text }}>Example {i + 1}:</p>
                    <div style={{ background: "#1e2020", border: `1px solid ${C.border}`, borderRadius: 3, padding: "10px 12px", fontFamily: "JetBrains Mono", fontSize: 12 }}>
                      <div style={{ marginBottom: tc.expectedOutput ? 6 : 0 }}>
                        <span style={{ color: C.textDim }}>Input: </span><span>{tc.stdin || "(empty)"}</span>
                      </div>
                      {tc.expectedOutput && (
                        <div><span style={{ color: C.textDim }}>Output: </span><span>{tc.expectedOutput}</span></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {problem.tags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
                {problem.tags.map((t) => (
                  <span key={t} style={{ fontSize: 11, fontFamily: "JetBrains Mono", background: "#292a2a", color: C.textDim, padding: "2px 7px", borderRadius: 2 }}>{t}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: editor + terminal */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

          {/* Monaco editor */}
          <div style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
            <Editor
              key={activeTab}
              height="100%"
              theme="vs-dark"
              language={LANG_META[activeTab].monacoId}
              value={codes[activeTab]}
              onChange={handleCodeChange}
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

          {/* Terminal */}
          <Terminal
            lines={termLines}
            prompt={prompt}
            input={termInput}
            onInput={setTermInput}
            onEnter={handleTermEnter}
            loading={createSubmission.isPending || isJudging}
            terminalOpen={termOpen}
            onToggle={() => setTermOpen((v) => !v)}
            height={termOpen ? 200 : 0}
          />
        </div>
      </div>
    </div>
  );
}
