import { useState, useEffect } from "react";
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
  VscArrowLeft,
  VscArrowRight,
  VscLayoutSidebarLeft,
  VscLayoutPanel,
  VscLayoutSidebarRight,
  VscSplitHorizontal,
  VscNewFile,
  VscNewFolder,
  VscCollapseAll,
} from "react-icons/vsc";

// ── VS Code color palette ───────────────────────────────────────────────────
const C = {
  titleBar:   "#181818",
  activityBg: "#121212",
  sidebarBg:  "#151515",
  border:     "#2b2b2b",
  activeRow:  "#2a2d2e",
  hoverRow:   "#2a2d2e",
  text:       "#cccccc",
  textDim:    "#858585",
  blue:       "#007acc",
  blueLight:  "#9fcaff",
  statusBar:  "#121212",
};

function DiffLabel({ d }: { d: string }) {
  const color = d === "easy" ? "#4ec994" : d === "medium" ? "#e5c07b" : "#e06c75";
  return (
    <span style={{ color, fontSize: 11, fontFamily: "JetBrains Mono", letterSpacing: "0.04em", flexShrink: 0 }}>
      {d === "easy" ? "easy" : d === "medium" ? "med" : "hard"}
    </span>
  );
}

const GitIcon = () => (
  <VscGitBranch size={13} style={{ color: "#f05032", marginRight: 2, flexShrink: 0 }} />
);

const JsonIcon = () => (
  <div style={{
    color: "#cbcb41",
    fontWeight: "bold",
    fontSize: 11,
    marginRight: 4,
    fontFamily: "monospace",
    flexShrink: 0,
    width: 13,
    textAlign: "center"
  }}>
    {"{}"}
  </div>
);

const TsIcon = () => (
  <div style={{
    width: 13,
    height: 13,
    background: "#3178c6",
    color: "#ffffff",
    fontSize: 8,
    fontWeight: "bold",
    borderRadius: 2,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
    marginRight: 4,
    flexShrink: 0,
  }}>
    TS
  </div>
);

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
  const [treeItems, setTreeItems] = useState<any[]>([]);
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const { data: problems } = useListProblems();
  const [location, setLocation] = useLocation();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [paletteSearch, setPaletteSearch] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (problems && treeItems.length === 0) {
      setTreeItems([
        {
          id: "problems",
          name: "problems",
          type: "folder",
          children: problems.map((p) => ({
            id: `problem-${p.id}`,
            name: `${p.id}. ${p.title.toLowerCase().replace(/\s+/g, "-")}.py`,
            type: "file",
            problemId: p.id,
            difficulty: p.difficulty,
          })),
        }
      ]);
      setExpandedFolders({ problems: true });
    }
  }, [problems, treeItems.length]);

  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderTreeItem = (item: any, depth = 0): React.ReactNode => {
    if (item.type === "file") {
      const isActive = item.problemId
        ? activeProblemId === item.problemId
        : activeFileId === item.id;

      return (
        <div
          key={item.id}
          onClick={() => {
            if (item.problemId) {
              setLocation(`/problems/${item.problemId}`);
              setActiveFileId(null);
            } else {
              setActiveFileId(item.id);
            }
          }}
          style={{
            paddingLeft: depth * 12,
          }}
        >
          <SidebarRow active={isActive} slug={item.name} difficulty={item.difficulty || ""} />
        </div>
      );
    } else {
      const expanded = !!expandedFolders[item.id];
      return (
        <div key={item.id}>
          <div
            onClick={() => toggleFolder(item.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: `4px 8px 4px ${depth * 12}px`,
              fontSize: 12,
              color: C.textDim,
              cursor: "pointer",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = C.hoverRow}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
          >
            {expanded ? (
              <VscChevronDown size={12} style={{ color: C.textDim }} />
            ) : (
              <VscChevronRight size={12} style={{ color: C.textDim }} />
            )}
            <span>{item.name}</span>
          </div>
          {expanded && item.children && (
            <div>
              {item.children.map((child: any) => renderTreeItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }
  };

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

  const filteredPaletteProblems = (problems || []).filter(p =>
    p.title.toLowerCase().includes(paletteSearch.toLowerCase()) ||
    p.id.toString().includes(paletteSearch)
  );

  return (
    <div
      className="dark"
      style={{
        height: "100dvh",
        width: "100vw",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: "#1f1f1f",
        color: C.text,
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        position: "relative",
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
        {/* Left: empty spacer */}
        <div style={{ display: "flex", alignItems: "center", width: 80 }} />

        {/* Center: Search / Go to File bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, justifyContent: "center", maxWidth: 600, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.textDim }}>
            <VscArrowLeft size={16} style={{ cursor: "pointer", opacity: 0.6 }} />
            <VscArrowRight size={16} style={{ cursor: "pointer", opacity: 0.6 }} />
          </div>
          <div
            onClick={() => setCommandPaletteOpen(true)}
            style={{
              flex: 1,
              height: 24,
              background: "#2c2c2c",
              border: `1px solid ${C.border}`,
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              color: C.textDim,
              cursor: "pointer",
              padding: "0 8px",
              userSelect: "none",
            }}
          >
            <span>Workspace</span>
          </div>
        </div>

        {/* Right: Layout control buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: C.textDim, marginRight: 4 }}>
          <VscLayoutSidebarLeft
            size={16}
            style={{ cursor: "pointer" }}
            title="Toggle Primary Side Bar"
            onClick={() => setSidebarOpen(v => !v)}
          />
          <VscLayoutPanel size={16} style={{ cursor: "pointer", opacity: 0.6 }} title="Toggle Panel" />
          <VscLayoutSidebarRight size={16} style={{ cursor: "pointer", opacity: 0.6 }} title="Toggle Secondary Side Bar" />
          <VscSplitHorizontal size={16} style={{ cursor: "pointer", opacity: 0.6 }} title="Split Editor" />
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
          {/* Menu icon at the top (smaller, non-functional) */}
          <div
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "12px 0 8px",
              color: C.textDim,
              userSelect: "none",
            }}
          >
            <VscMenu size={16} />
          </div>

          {/* Explorer */}
          <ActivityBtn
            active={sidebarOpen && (location === "/" || location.startsWith("/problems"))}
            onClick={() => setSidebarOpen((v) => !v)}
            title="Explorer"
          >
            <VscFiles size={22} />
          </ActivityBtn>

          <div style={{ flex: 1 }} />

          {/* Profile button (non-functional) */}
          <div
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "10px 0",
              color: C.textDim,
              cursor: "default",
              userSelect: "none",
            }}
          >
            <VscAccount size={22} />
          </div>

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
                borderBottom: "none",
                flexShrink: 0,
              }}
            >
              EXPLORER
            </div>

            {/* Sidebar content */}
            <div style={{ flex: 1, overflowY: "auto", padding: "6px 0" }}>
              {/* Workspace header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "2px 8px 6px 12px",
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.textDim,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                <VscChevronDown size={14} style={{ marginRight: 4 }} />
                <span>Workspace</span>
                
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, color: C.textDim }}>
                  <VscNewFile
                    size={14}
                    style={{ cursor: "pointer" }}
                    title="New File..."
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCreatingFile(true);
                      setIsCreatingFolder(false);
                    }}
                  />
                  <VscNewFolder
                    size={14}
                    style={{ cursor: "pointer" }}
                    title="New Folder..."
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCreatingFolder(true);
                      setIsCreatingFile(false);
                    }}
                  />
                  <VscCollapseAll
                    size={14}
                    style={{ cursor: "pointer" }}
                    title="Collapse All Folders"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedFolders({});
                    }}
                  />
                </div>
              </div>

              {/* Inline input for New File creation */}
              {isCreatingFile && (
                <div style={{ display: "flex", alignItems: "center", padding: "4px 8px 4px 16px", gap: 6 }}>
                  <VscFileCode size={13} style={{ color: "#519aba" }} />
                  <input
                    autoFocus
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const name = newItemName.trim();
                        if (name) {
                          setTreeItems(prev => [
                            { id: `user-file-${Date.now()}`, name, type: "file" },
                            ...prev
                          ]);
                        }
                        setIsCreatingFile(false);
                        setNewItemName("");
                      } else if (e.key === "Escape") {
                        setIsCreatingFile(false);
                        setNewItemName("");
                      }
                    }}
                    style={{
                      background: "#1e1e1e",
                      border: `1px solid ${C.border}`,
                      color: C.text,
                      fontSize: 12,
                      outline: "none",
                      width: "100%",
                      height: 18,
                      padding: "0 4px",
                    }}
                    placeholder="file name..."
                  />
                </div>
              )}

              {/* Inline input for New Folder creation */}
              {isCreatingFolder && (
                <div style={{ display: "flex", alignItems: "center", padding: "4px 8px 4px 16px", gap: 6 }}>
                  <VscChevronRight size={12} style={{ color: C.textDim }} />
                  <input
                    autoFocus
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const name = newItemName.trim();
                        if (name) {
                          setTreeItems(prev => [
                            { id: `user-folder-${Date.now()}`, name, type: "folder", children: [] },
                            ...prev
                          ]);
                        }
                        setIsCreatingFolder(false);
                        setNewItemName("");
                      } else if (e.key === "Escape") {
                        setIsCreatingFolder(false);
                        setNewItemName("");
                      }
                    }}
                    style={{
                      background: "#1e1e1e",
                      border: `1px solid ${C.border}`,
                      color: C.text,
                      fontSize: 12,
                      outline: "none",
                      width: "100%",
                      height: 18,
                      padding: "0 4px",
                    }}
                    placeholder="folder name..."
                  />
                </div>
              )}

              {/* Tree list rendering */}
              <div style={{ paddingLeft: 12 }}>
                {treeItems.map((item) => renderTreeItem(item))}
              </div>
            </div>
          </div>
        )}

        {/* Main content */}
        <main style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", background: "#1f1f1f" }}>
          {children}
        </main>
      </div>

      {/* ── Status bar ───────────────────────────────────────────────────── */}
      <div
        style={{
          height: 22,
          background: C.statusBar,
          borderTop: `1px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          gap: 16,
          fontSize: 11,
          fontFamily: "JetBrains Mono",
          color: C.textDim,
          flexShrink: 0,
          userSelect: "none",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <VscGitBranch size={12} style={{ color: C.textDim }} />
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

      {commandPaletteOpen && (
        <>
          {/* Overlay to close palette */}
          <div
            onClick={() => {
              setCommandPaletteOpen(false);
              setPaletteSearch("");
            }}
            style={{
              position: "fixed",
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 999,
              background: "transparent",
            }}
          />
          {/* Palette body */}
          <div
            style={{
              position: "absolute",
              top: 36,
              left: "50%",
              transform: "translateX(-50%)",
              width: 500,
              background: "#1c1c1c",
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
              zIndex: 1000,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "8px 12px", borderBottom: `1px solid ${C.border}`, background: "#181818" }}>
              <input
                autoFocus
                placeholder="Search problems by title..."
                value={paletteSearch}
                onChange={(e) => setPaletteSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setCommandPaletteOpen(false);
                    setPaletteSearch("");
                  }
                }}
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: C.text,
                  fontSize: 12,
                }}
              />
            </div>
            <div style={{ maxHeight: 250, overflowY: "auto", background: "#1c1c1c" }}>
              {filteredPaletteProblems.length > 0 ? (
                filteredPaletteProblems.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setLocation(`/problems/${p.id}`);
                      setPaletteSearch("");
                      setCommandPaletteOpen(false);
                    }}
                    style={{
                      padding: "8px 16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      fontSize: 12,
                      color: C.textDim,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = C.hoverRow;
                      e.currentTarget.style.color = C.text;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = C.textDim;
                    }}
                  >
                    <span>{p.id}. {p.title}</span>
                    <span style={{ fontSize: 10, opacity: 0.8 }}>{p.difficulty}</span>
                  </div>
                ))
              ) : (
                <div style={{ padding: "12px 16px", fontSize: 12, color: C.textDim, textAlign: "center" }}>
                  No problems found
                </div>
              )}
            </div>
          </div>
        </>
      )}
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
        background: active ? C.sidebarBg : "transparent",
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
        padding: "3px 8px",
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
