import { Link } from "wouter";
import { useListProblems } from "@workspace/api-client-react";

const C = {
  border:   "#404751",
  textDim:  "#c0c7d3",
  blue:     "#007acc",
  blueLight:"#9fcaff",
  text:     "#e3e2e2",
  rowHover: "#1e2020",
};

function DiffPill({ d }: { d: string }) {
  const color = d === "easy" ? "#4ec994" : d === "medium" ? "#e5c07b" : "#e06c75";
  const bg    = d === "easy" ? "#4ec99420" : d === "medium" ? "#e5c07b20" : "#e06c7520";
  const label = d === "easy" ? "Easy" : d === "medium" ? "Medium" : "Hard";
  return (
    <span style={{ color, background: bg, fontSize: 11, fontFamily: "JetBrains Mono", padding: "1px 6px", borderRadius: 2 }}>
      {label}
    </span>
  );
}

export default function Home() {
  const { data: problems, isLoading } = useListProblems();

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Breadcrumb / tab bar */}
      <div
        style={{
          height: 35,
          background: "#1e2020",
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          flexShrink: 0,
          fontSize: 12,
          color: C.textDim,
          fontFamily: "JetBrains Mono",
          gap: 6,
          userSelect: "none",
        }}
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={C.blueLight} strokeWidth="1.3">
          <path d="M9.5 1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5z" />
          <polyline points="9.5 1 9.5 4.5 13 4.5" />
        </svg>
        <span>Welcome</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>

        {/* Hero */}
        <div
          style={{
            padding: "40px 48px 24px",
            borderBottom: `1px solid ${C.border}`,
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.blueLight} strokeWidth="1.5">
              <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
            </svg>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: C.text, margin: 0 }}>CodeArena</h1>
          </div>
          <p style={{ fontSize: 13, color: C.textDim, margin: 0, maxWidth: 480 }}>
            Pick a problem from the Explorer on the left, write your solution in the editor, and submit.
          </p>
        </div>

        {/* Problem table */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 0 24px" }}>

          {/* Table header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "48px 1fr 90px 70px 70px",
              padding: "6px 48px",
              fontSize: 11,
              fontFamily: "JetBrains Mono",
              color: C.textDim,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              borderBottom: `1px solid ${C.border}`,
              position: "sticky",
              top: 0,
              background: "#121414",
            }}
          >
            <span>#</span>
            <span>Title</span>
            <span>Difficulty</span>
            <span style={{ textAlign: "right" }}>Points</span>
            <span style={{ textAlign: "right" }}>Solved</span>
          </div>

          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ height: 40, margin: "2px 48px", background: "#1e2020", borderRadius: 2, animation: "pulse 1.5s ease-in-out infinite" }} />
              ))
            : problems?.map((p) => (
                <Link key={p.id} href={`/problems/${p.id}`}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "48px 1fr 90px 70px 70px",
                      padding: "8px 48px",
                      cursor: "pointer",
                      borderBottom: `1px solid #1e2020`,
                      transition: "background 0.1s",
                      fontSize: 13,
                      color: C.text,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = C.rowHover)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span style={{ color: C.textDim, fontFamily: "JetBrains Mono", fontSize: 12 }}>{p.id}</span>
                    <span style={{ fontWeight: 500 }}>{p.title}</span>
                    <span><DiffPill d={p.difficulty} /></span>
                    <span style={{ textAlign: "right", color: C.textDim, fontFamily: "JetBrains Mono", fontSize: 12 }}>{p.points}</span>
                    <span style={{ textAlign: "right", color: C.textDim, fontFamily: "JetBrains Mono", fontSize: 12 }}>{p.solvedCount}</span>
                  </div>
                </Link>
              ))}
        </div>
      </div>
    </div>
  );
}
