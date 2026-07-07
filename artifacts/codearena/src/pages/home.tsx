import { useState } from "react";
import { Link } from "wouter";
import { useListProblems } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { ProblemDifficulty } from "@workspace/api-client-react";

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  if (difficulty === "easy")
    return <Badge variant="secondary" className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Easy</Badge>;
  if (difficulty === "medium")
    return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20">Medium</Badge>;
  if (difficulty === "hard")
    return <Badge variant="secondary" className="bg-red-500/10 text-red-500 hover:bg-red-500/20">Hard</Badge>;
  return <Badge variant="outline">{difficulty}</Badge>;
}

export default function Home() {
  const [filter, setFilter] = useState<ProblemDifficulty | "all">("all");
  const { data: problems, isLoading } = useListProblems(
    filter === "all" ? undefined : { difficulty: filter }
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Problems</h1>
        <div className="flex p-1 bg-muted rounded-md">
          {(["all", "easy", "medium", "hard"] as const).map((level) => (
            <button
              key={level}
              onClick={() => setFilter(level)}
              className={`px-3 py-1.5 text-sm font-medium rounded-sm capitalize transition-all ${
                filter === level
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {level === "all" ? "All" : level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : !problems?.length ? (
        <p className="text-center text-muted-foreground py-16">No problems found.</p>
      ) : (
        <div className="space-y-2">
          {problems.map((problem) => (
            <Link key={problem.id} href={`/problems/${problem.id}`}>
              <div className="group flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:border-primary transition-colors cursor-pointer">
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-3 mb-0.5">
                    <span className="font-medium group-hover:text-primary transition-colors truncate">
                      {problem.id}. {problem.title}
                    </span>
                    <DifficultyBadge difficulty={problem.difficulty} />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {problem.solvedCount} solved
                    </span>
                    <span>{problem.points} pts</span>
                    {problem.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="px-1.5 py-0.5 bg-accent text-accent-foreground rounded-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
