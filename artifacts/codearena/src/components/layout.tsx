import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useListProblems } from "@workspace/api-client-react";
import {
  VscMenu,
  VscCode,
  VscFiles,
  VscHistory,
  VscMilestone,
  VscAccount,
  VscSettingsGear,
  VscChevronDown,
  VscChevronRight,
  VscFolder,
  VscFolderOpened,
  VscFileCode,
  VscGitBranch,
} from "react-icons/vsc";

// ── VS Code color palette ───────────────────────────────────────────────────
const C = {
  titleBar:   "#292a2a",
  activityBg: "#0d0e0f",
  sidebarBg:  "#1e2020",
  border:     "#404751",
  activeRow:  "#37393a",
  hoverRow:   "#2a2c2c",
  text:       "#e3e2e2",
  textDim:    "#c0c7d3",
  blue:       "#007acc",
  blueLight:  "#9fcaff",
  statusBar:  "#007acc", // Will use inline style for VS Code dark theme
};

function DiffLabel({ d }: { d: string }) {
  const color = d === "easy" ? "#4ec994" : d === "medium" ? "#e5c07b" : "#e06c75";
  return (
    <span style={{ color, fontSize: 11, fontFamily: "JetBrains Mono", letterSpacing: "0.04em", flexShrink: 0 }}>
      {d === "easy" ? "easy" : d === "medium" ? "med" : "hard"}
    </span>
  );
}

function FileIcon({ active }: { active: boolean }) {
  return (
    <VscFileCode
      size={14}
      style={{
        color: active ? C.blueLight : "#519aba",
        flexShrink: 0,
      }}
    />
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [allExpanded, setAllExpanded] = useState(true);
  const [blind75Expanded, setBlind75Expanded] = useState(true);
  const { data: problems } = useListProblems();
  const [location] = useLocation();

  const match = location.match(/^\/problems\/(\d+)/);
  const activeProblemId = match ? Number(match[1]) : null;

  const activeProblem = problems?.find((p) => p.id === activeProblemId);

  const blind75Titles = [
    "Two Sum",
    "Best Time to Buy and Sell Stock",
    "Contains Duplicate",
    "Product of Array Except Self",
    "Maximum Subarray",
    "Maximum Product Subarray",
    "Find Minimum in Rotated Sorted Array",
    "Search in Rotated Sorted Array",
    "3Sum",
    "Container With Most Water",
    "Valid Parentheses",
    "Min Stack",
    "Evaluate Reverse Polish Notation",
    "Generate Parentheses",
    "Daily Temperatures",
    "Palindrome Check",
    "Valid Anagram",
    "Longest Repeating Character Replacement",
    "Minimum Window Substring",
    "Group Anagrams",
    "Valid Sudoku",
    "Longest Consecutive Sequence",
    "Binary Search",
    "Search a 2D Matrix",
    "Combination Sum",
    "Word Search",
    "Palindrome Partitioning",
    "Coin Change",
    "Subsets",
    "Word Break",
    "House Robber",
    "House Robber II",
    "Decode Ways",
    "Unique Paths",
    "Climbing Stairs",
    "Maximum Depth of Binary Tree",
    "Invert Binary Tree",
    "Same Tree",
    "Symmetric Tree",
    "Binary Tree Level Order Traversal",
    "Number of Islands",
    "Longest Common Subsequence",
  ];

  const blind75Problems = problems?.filter(p => blind75Titles.includes(p.title)) || [];
  const allProblems = problems || [];

  return (
    <div
      className="dark"
      style={{
        height: "100dvh",
        width: "100vw",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: "#121414",
        color: C.text,
        fontFamily: "'Hanken Grotesk', sans-serif",
      }}
    >
      {/* ── Title bar ────────────────────────────────────────────────────── */}
      <div
        style={{
          height: 32,
          background: C.titleBar,
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 8px",
          flexShrink: 0,
          userSelect: "none",
        }}
      >
        {/* Left: hamburger + file icon */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <VscMenu
            size={16}
            style={{ color: C.textDim, cursor: "pointer" }}
            onClick={() => setSidebarOpen(v => !v)}
          />
          <VscCode size={16} style={{ color: C.blueLight }} />
          <span style={{ fontWeight: 600, fontSize: 13, color: C.text }}>LeetStudio</span>
        </div>

        {/* Right: status indicators */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 11, fontFamily: "JetBrains Mono", color: C.textDim }}>
          <span>Ln 1, Col 1</span>
          <span>Spaces: 2</span>
          <span>UTF-8</span>
          <span>LF</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <VscCode size={12} style={{ color: C.textDim }} />
            TypeScript
          </span>
        </div>
      </div>

      {/* ── IDE body ─────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Activity bar */}
        <div
          style={{
            width: 48,
            background: C.activityBg,
            borderRight: `1px solid ${C.border}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: 4,
            flexShrink: 0,
          }}
        >
          {/* Explorer */}
          <ActivityBtn
            active={sidebarOpen && (location === "/" || location.startsWith("/problems"))}
            onClick={() => setSidebarOpen((v) => !v)}
            title="Explorer"
          >
            <VscFiles size={22} />
          </ActivityBtn>

          <div style={{ flex: 1 }} />

          {/* Dashboard */}
          <Link href="/dashboard">
            <ActivityBtn active={location.startsWith("/dashboard")} title="Dashboard" style={{ marginBottom: 4 }}>
              <VscAccount size={22} />
            </ActivityBtn>
          </Link>

          {/* Settings */}
          <ActivityBtn active={false} title="Settings" style={{ marginBottom: 4 }}>
            <VscSettingsGear size={22} />
          </ActivityBtn>
        </div>

        {/* Sidebar */}
        {sidebarOpen && (
          <div
            style={{
              width: 260,
              background: C.sidebarBg,
              borderRight: `1px solid ${C.border}`,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              flexShrink: 0,
              userSelect: "none",
            }}
          >
            {/* EXPLORER header */}
            <div
              style={{
                padding: "6px 12px",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.08em",
                color: C.textDim,
                fontFamily: "JetBrains Mono",
                borderBottom: `1px solid ${C.border}`,
                flexShrink: 0,
              }}
            >
              EXPLORER
            </div>

            {/* Problem list */}
            <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
              {/* All folder */}
              <Folder
                name="all"
                expanded={allExpanded}
                onToggle={() => setAllExpanded(v => !v)}
                problems={allProblems}
                activeProblemId={activeProblemId}
              />

              {/* Blind 75 folder */}
              <Folder
                name="blind75"
                expanded={blind75Expanded}
                onToggle={() => setBlind75Expanded(v => !v)}
                problems={blind75Problems}
                activeProblemId={activeProblemId}
              />
            </div>
          </div>
        )}

        {/* Main content */}
        <main style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", background: "#121414" }}>
          {children}
        </main>
      </div>

      {/* ── Status bar ───────────────────────────────────────────────────── */}
      <div
        style={{
          height: 22,
          background: "#007acc",
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          gap: 16,
          fontSize: 11,
          fontFamily: "JetBrains Mono",
          color: "#fff",
          flexShrink: 0,
          userSelect: "none",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <VscGitBranch size={12} style={{ color: "#fff" }} />
          main
        </span>
        {activeProblem && (
          <span style={{ opacity: 0.85 }}>
            {activeProblem.id}. {activeProblem.title}
          </span>
        )}
        <span style={{ marginLeft: "auto", opacity: 0.85 }}>
          Ln 1, Col 1
        </span>
        <span style={{ opacity: 0.85 }}>Spaces: 2</span>
        <span style={{ opacity: 0.85 }}>UTF-8</span>
        <span style={{ opacity: 0.85 }}>LF</span>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Folder({
  name,
  expanded,
  onToggle,
  problems,
  activeProblemId,
}: {
  name: string;
  expanded: boolean;
  onToggle: () => void;
  problems: any[];
  activeProblemId: number | null;
}) {
  return (
    <div>
      <div
        onClick={onToggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "4px 8px",
          fontSize: 11,
          fontWeight: 600,
          color: C.text,
          fontFamily: "JetBrains Mono",
          cursor: "pointer",
          userSelect: "none",
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = C.hoverRow}
        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
      >
        {expanded ? (
          <VscChevronDown size={11} style={{ color: C.textDim }} />
        ) : (
          <VscChevronRight size={11} style={{ color: C.textDim }} />
        )}
        {expanded ? (
          <VscFolderOpened size={13} style={{ color: "#dcb265" }} />
        ) : (
          <VscFolder size={13} style={{ color: "#dcb265" }} />
        )}
        {name}
      </div>
      {expanded && problems.map((p) => {
        const isActive = p.id === activeProblemId;
        const slug = `${p.id}. ${p.title.toLowerCase().replace(/\s+/g, "-")}.py`;
        return (
          <Link key={p.id} href={`/problems/${p.id}`}>
            <SidebarRow active={isActive} slug={slug} difficulty={p.difficulty} />
          </Link>
        );
      })}
    </div>
  );
}

function ActivityBtn({
  children,
  active,
  onClick,
  title,
  style: extraStyle,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick?: () => void;
  title?: string;
  style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "10px 0",
        background: active ? "#1a1c1c" : "transparent",
        border: "none",
        borderLeft: active ? `2px solid ${C.blue}` : "2px solid transparent",
        color: active ? C.text : C.textDim,
        cursor: "pointer",
        transition: "background 0.1s, color 0.1s",
        ...extraStyle,
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = "rgba(255,255,255,0.06)";
          e.currentTarget.style.color = C.text;
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = C.textDim;
        }
      }}
    >
      {children}
    </button>
  );
}

function SidebarRow({ active, slug, difficulty }: { active: boolean; slug: string; difficulty: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 8px 3px 20px",
        background: active ? C.activeRow : "transparent",
        color: active ? C.text : C.textDim,
        fontSize: 12,
        fontFamily: "JetBrains Mono",
        cursor: "pointer",
        transition: "background 0.1s",
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = C.hoverRow; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      <FileIcon active={active} />
      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {slug}
      </span>
      <DiffLabel d={difficulty} />
    </div>
  );
}
