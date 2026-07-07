import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useListProblems } from "@workspace/api-client-react";
import { Settings, FolderOpen, Trophy, Search } from "lucide-react";

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
  statusBar:  "#007acc",
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
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={active ? C.blueLight : C.textDim} strokeWidth="1.3" style={{ flexShrink: 0 }}>
      <path d="M9.5 1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5z" />
      <polyline points="9.5 1 9.5 4.5 13 4.5" />
    </svg>
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
        {/* Left: logo + menus */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.blueLight} strokeWidth="2">
              <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
            </svg>
            <span style={{ fontWeight: 600, fontSize: 13, color: C.text }}>LeetStudio</span>
          </div>
          <Link href="/">
            <button
              style={{ fontSize: 12, color: location === "/" ? C.blueLight : C.textDim, padding: "1px 6px", borderRadius: 3, background: "transparent", border: "none", cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              Problems
            </button>
          </Link>
          <Link href="/submissions">
            <button
              style={{ fontSize: 12, color: location.startsWith("/submissions") ? C.blueLight : C.textDim, padding: "1px 6px", borderRadius: 3, background: "transparent", border: "none", cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              Submissions
            </button>
          </Link>
        </div>

        {/* Center: search */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: C.activeRow, border: `1px solid ${C.border}`, borderRadius: 4, padding: "0 8px", height: 22, minWidth: 200, cursor: "text" }}>
          <Search size={11} color={C.textDim} />
          <span style={{ fontSize: 12, color: C.textDim }}>Search problems...</span>
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
            active={sidebarOpen}
            onClick={() => setSidebarOpen((v) => !v)}
            title="Explorer"
          >
            <FolderOpen size={22} />
          </ActivityBtn>

          {/* Submissions */}
          <Link href="/submissions">
            <ActivityBtn active={location.startsWith("/submissions")} title="Submissions">
              <Trophy size={20} />
            </ActivityBtn>
          </Link>

          <div style={{ flex: 1 }} />

          {/* Settings */}
          <ActivityBtn active={false} title="Settings" style={{ marginBottom: 4 }}>
            <Settings size={20} />
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
          background: C.statusBar,
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
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
          </svg>
          LeetStudio
        </span>
        {activeProblem && (
          <span style={{ opacity: 0.85 }}>
            {activeProblem.id}. {activeProblem.title}
          </span>
        )}
        <span style={{ marginLeft: "auto", opacity: 0.85 }}>
          Local user
        </span>
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
        <svg width="11" height="11" viewBox="0 0 16 16" fill={C.textDim} style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.1s" }}>
          <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z" />
        </svg>
        <svg width="11" height="11" viewBox="0 0 16 16" fill={C.textDim}>
          <path d="M9.5 1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5z" />
          <polyline points="9.5 1 9.5 4.5 13 4.5" />
        </svg>
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
