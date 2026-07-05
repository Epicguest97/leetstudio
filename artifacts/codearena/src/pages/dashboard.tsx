import { Link } from "wouter";
import { useGetDashboardSummary } from "@workspace/api-client-react";
import { RequireAuth } from "@/components/require-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Trophy, CheckCircle2, XCircle, Clock, Activity, Code2, AlertCircle } from "lucide-react";
import { SubmissionStatus } from "@workspace/api-client-react";

function StatusIcon({ status }: { status: SubmissionStatus }) {
  switch (status) {
    case "accepted": return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case "wrong_answer": return <XCircle className="w-4 h-4 text-red-500" />;
    case "time_limit_exceeded": return <Clock className="w-4 h-4 text-yellow-500" />;
    case "queued":
    case "judging": return <Activity className="w-4 h-4 text-blue-500 animate-pulse" />;
    default: return <AlertCircle className="w-4 h-4 text-orange-500" />;
  }
}

export default function Dashboard() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}

function DashboardContent() {
  const { data, isLoading } = useGetDashboardSummary();

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-32 bg-muted animate-pulse rounded-lg"></div>)}
        </div>
      </div>
    );
  }

  if (!data) return <div className="container mx-auto px-4 py-8">Failed to load dashboard</div>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Your Arena Stats</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="border-primary/20 bg-card/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Problems Solved</CardTitle>
            <Trophy className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono">{data.solvedCount}</div>
          </CardContent>
        </Card>
        
        <Card className="border-primary/20 bg-card/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Acceptance Rate</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono">
              {data.totalSubmissions > 0 
                ? Math.round(data.acceptanceRate * 100) 
                : 0}%
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-primary/20 bg-card/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Submissions</CardTitle>
            <Code2 className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono">{data.totalSubmissions}</div>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-xl font-bold mb-4">Recent Submissions</h2>
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {data.recentSubmissions.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No submissions yet. Go solve a problem!
          </div>
        ) : (
          <div className="divide-y divide-border">
            {data.recentSubmissions.map((sub) => (
              <Link key={sub.id} href={`/submissions/${sub.id}`}>
                <div className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <StatusIcon status={sub.status} />
                    <div>
                      <div className="font-medium group-hover:text-primary transition-colors">
                        {sub.problemTitle}
                      </div>
                      <div className="text-xs text-muted-foreground flex gap-2 mt-1">
                        <span>{sub.languageName}</span>
                        <span>•</span>
                        <span>{new Date(sub.submittedAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right font-mono font-medium">
                    {sub.score} / {sub.maxScore}
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
