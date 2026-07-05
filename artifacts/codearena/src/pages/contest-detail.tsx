import { Link, useParams } from "wouter";
import { useGetContest } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, Trophy, Code2, Clock } from "lucide-react";
import { format, isPast, isFuture } from "date-fns";

export default function ContestDetail() {
  const { id } = useParams<{ id: string }>();
  const contestId = Number(id);
  
  const { data: contest, isLoading } = useGetContest(contestId, {
    query: { enabled: !!contestId, queryKey: ['contest', contestId] }
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="h-32 bg-muted animate-pulse rounded-lg"></div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg"></div>)}
        </div>
      </div>
    );
  }

  if (!contest) return <div className="p-8 text-center">Contest not found</div>;

  const start = new Date(contest.startTime);
  const end = new Date(contest.endTime);
  const active = isPast(start) && isFuture(end);
  const past = isPast(end);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{contest.title}</h1>
            <div className="flex items-center gap-4 mt-2 text-muted-foreground font-mono text-sm">
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {format(start, "PP p")}</span>
              <span>—</span>
              <span>{format(end, "p")}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Link href={`/contests/${contest.id}/leaderboard`}>
              <Button variant="outline" className="font-bold border-primary text-primary hover:bg-primary/10">
                <Trophy className="w-4 h-4 mr-2" />
                Live Standings
              </Button>
            </Link>
          </div>
        </div>
        
        <p className="text-lg text-muted-foreground">
          {contest.description}
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Code2 className="w-5 h-5 text-primary" />
          Problems
        </h2>
        
        {!active && !past ? (
          <Card className="border-dashed bg-accent/20">
            <CardContent className="p-8 text-center">
              <Clock className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Contest hasn't started yet</h3>
              <p className="text-muted-foreground">Problems will be revealed when the contest begins.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {contest.problems.map((problem) => (
              <Link key={problem.problemId} href={`/problems/${problem.problemId}?contestId=${contest.id}`}>
                <div className="group flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:border-primary transition-colors cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded bg-primary/10 text-primary flex items-center justify-center font-bold text-lg font-mono">
                      {problem.label}
                    </div>
                    <div>
                      <div className="font-bold text-lg group-hover:text-primary transition-colors">
                        {problem.title}
                      </div>
                      <div className="text-sm text-muted-foreground font-mono flex items-center gap-3">
                        <span className="text-primary">{problem.points} points</span>
                        <span className="capitalize">{problem.difficulty}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
