import { Link } from "wouter";
import { useListContests } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Calendar, Clock, ChevronRight, Plus } from "lucide-react";
import { format, isPast, isFuture } from "date-fns";

export default function Contests() {
  const { data: contests, isLoading } = useListContests();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contests</h1>
          <p className="text-muted-foreground mt-1">Compete against others in timed algorithmic challenges.</p>
        </div>
        <Link href="/contests/new">
          <Button className="font-bold">
            <Plus className="w-4 h-4 mr-2" />
            Create Contest
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg border border-border"></div>
          ))}
        </div>
      ) : contests?.length === 0 ? (
        <Card className="text-center py-16 border-dashed">
          <CardContent>
            <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">No active contests</h3>
            <p className="text-muted-foreground mb-6">There are no contests running right now.</p>
            <Link href="/contests/new">
              <Button>Host a Contest</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {contests?.map(contest => {
            const start = new Date(contest.startTime);
            const end = new Date(contest.endTime);
            const active = isPast(start) && isFuture(end);
            const upcoming = isFuture(start);
            const past = isPast(end);

            return (
              <Link key={contest.id} href={`/contests/${contest.id}`}>
                <Card className={`group cursor-pointer transition-all hover:border-primary relative overflow-hidden ${active ? 'border-primary/50' : ''}`}>
                  {active && (
                    <div className="absolute top-0 right-0 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-bl-lg z-10">
                      LIVE NOW
                    </div>
                  )}
                  {upcoming && (
                    <div className="absolute top-0 right-0 px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-bl-lg z-10">
                      UPCOMING
                    </div>
                  )}
                  {past && (
                    <div className="absolute top-0 right-0 px-3 py-1 bg-muted text-muted-foreground text-xs font-bold rounded-bl-lg z-10">
                      ENDED
                    </div>
                  )}

                  <CardContent className="p-6 flex items-center justify-between">
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-xl font-bold group-hover:text-primary transition-colors">
                          {contest.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2 max-w-2xl">
                          {contest.description}
                        </p>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground font-mono">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-primary" />
                          {format(start, "MMM d, yyyy HH:mm")}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-primary" />
                          {Math.round((end.getTime() - start.getTime()) / 60000)} mins
                        </div>
                        <div className="flex items-center gap-1.5 bg-accent/50 px-2 py-0.5 rounded text-foreground">
                          {contest.problemCount} Problems
                        </div>
                      </div>
                    </div>

                    <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center group-hover:bg-primary/20 group-hover:text-primary transition-colors shrink-0">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
