import { useState } from "react";
import { Link } from "wouter";
import { useListProblems } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckCircle2, ChevronRight, Activity } from "lucide-react";
import { ProblemDifficulty } from "@workspace/api-client-react";

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  if (difficulty === "easy") return <Badge variant="secondary" className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Easy</Badge>;
  if (difficulty === "medium") return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20">Medium</Badge>;
  if (difficulty === "hard") return <Badge variant="secondary" className="bg-red-500/10 text-red-500 hover:bg-red-500/20">Hard</Badge>;
  return <Badge variant="outline">{difficulty}</Badge>;
}

export default function Home() {
  const [filter, setFilter] = useState<ProblemDifficulty | "all">("all");
  const { data: problems, isLoading } = useListProblems(
    filter === "all" ? undefined : { difficulty: filter }
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Problem Arena</h1>
          <p className="text-muted-foreground mt-1">Select a problem and start coding.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex p-1 bg-muted rounded-md">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 text-sm font-medium rounded-sm transition-all ${filter === "all" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("easy")}
              className={`px-3 py-1.5 text-sm font-medium rounded-sm transition-all ${filter === "easy" ? "bg-background text-green-500 shadow-sm" : "text-muted-foreground hover:text-green-500"}`}
            >
              Easy
            </button>
            <button
              onClick={() => setFilter("medium")}
              className={`px-3 py-1.5 text-sm font-medium rounded-sm transition-all ${filter === "medium" ? "bg-background text-yellow-500 shadow-sm" : "text-muted-foreground hover:text-yellow-500"}`}
            >
              Medium
            </button>
            <button
              onClick={() => setFilter("hard")}
              className={`px-3 py-1.5 text-sm font-medium rounded-sm transition-all ${filter === "hard" ? "bg-background text-red-500 shadow-sm" : "text-muted-foreground hover:text-red-500"}`}
            >
              Hard
            </button>
          </div>
          <Link href="/problems/new" className="hidden sm:inline-flex">
            <Button variant="default" className="font-bold">
              <Plus className="w-4 h-4 mr-2" />
              Create Problem
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg border border-border"></div>
          ))}
        </div>
      ) : problems?.length === 0 ? (
        <Card className="text-center py-16 border-dashed">
          <CardContent>
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Activity className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2">No problems found</h3>
            <p className="text-muted-foreground mb-6">There are no problems matching your criteria.</p>
            <Link href="/problems/new">
              <Button>Create the first problem</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {problems?.map(problem => (
            <Link key={problem.id} href={`/problems/${problem.id}`}>
              <div className="group flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:border-primary transition-colors cursor-pointer relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary transform -translate-x-full group-hover:translate-x-0 transition-transform"></div>
                
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                      {problem.id}. {problem.title}
                    </h3>
                    <DifficultyBadge difficulty={problem.difficulty} />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {problem.solvedCount} solved
                    </span>
                    <span>{problem.points} points</span>
                    {problem.tags && problem.tags.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        {problem.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="px-1.5 py-0.5 bg-accent text-accent-foreground text-xs rounded-sm">
                            {tag}
                          </span>
                        ))}
                        {problem.tags.length > 3 && (
                          <span className="text-xs">+{problem.tags.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-accent group-hover:bg-primary/20 text-muted-foreground group-hover:text-primary transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
