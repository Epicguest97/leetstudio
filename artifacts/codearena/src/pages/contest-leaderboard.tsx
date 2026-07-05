import { useParams, Link } from "wouter";
import { useGetContestLeaderboard, useGetContest } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, ChevronLeft, Medal } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

export default function ContestLeaderboard() {
  const { id } = useParams<{ id: string }>();
  const contestId = Number(id);

  const { data: contest } = useGetContest(contestId, {
    query: { enabled: !!contestId, queryKey: ['contest', contestId] }
  });

  const { data: leaderboard, isLoading } = useGetContestLeaderboard(contestId, {
    query: { 
      enabled: !!contestId, 
      queryKey: ['leaderboard', contestId],
      refetchInterval: 5000 // Poll every 5s for live feel
    }
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href={`/contests/${contestId}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to Contest
        </Link>
        <div className="flex items-center gap-3">
          <Trophy className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">
            Live Standings {contest && <span className="text-muted-foreground font-normal ml-2">/ {contest.title}</span>}
          </h1>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-lg shadow-black/20">
        {isLoading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded"></div>)}
          </div>
        ) : !leaderboard || leaderboard.length === 0 ? (
          <div className="p-16 text-center text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-lg">No submissions yet.</p>
            <p className="text-sm">Be the first to claim a spot on the leaderboard!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-accent/50">
                <TableRow>
                  <TableHead className="w-20 text-center font-mono text-xs">Rank</TableHead>
                  <TableHead>Competitor</TableHead>
                  <TableHead className="text-right w-32 font-mono text-xs">Total Score</TableHead>
                  <TableHead className="text-right w-32 font-mono text-xs">Solved</TableHead>
                  <TableHead className="text-right w-32 font-mono text-xs">Penalty</TableHead>
                  <TableHead className="text-right w-48 font-mono text-xs">Last Accepted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.map((entry, idx) => (
                  <TableRow key={entry.userId} className={`transition-colors ${idx < 3 ? 'bg-primary/5' : ''}`}>
                    <TableCell className="text-center font-mono font-bold text-lg">
                      {entry.rank === 1 ? <Medal className="w-6 h-6 text-yellow-500 mx-auto" /> : 
                       entry.rank === 2 ? <Medal className="w-6 h-6 text-gray-400 mx-auto" /> :
                       entry.rank === 3 ? <Medal className="w-6 h-6 text-amber-700 mx-auto" /> :
                       entry.rank}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8 border border-border">
                          <AvatarImage src={entry.profileImageUrl || undefined} />
                          <AvatarFallback className="bg-accent text-accent-foreground font-mono text-xs">
                            {entry.username.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className={`font-bold ${idx === 0 ? 'text-primary' : ''}`}>
                          {entry.username}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-primary">
                      {entry.totalScore}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {entry.solvedCount}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {entry.penaltyMinutes}m
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {entry.lastAcceptedAt ? formatDistanceToNow(new Date(entry.lastAcceptedAt), { addSuffix: true }) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
