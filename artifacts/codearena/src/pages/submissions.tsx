import { Link } from "wouter";
import { useListSubmissions } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle, Clock, Activity, AlertCircle, ListChecks } from "lucide-react";
import type { SubmissionStatus } from "@workspace/api-client-react";

function StatusIcon({ status }: { status: SubmissionStatus }) {
  switch (status) {
    case "accepted":
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case "partial":
      return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    case "wrong_answer":
      return <XCircle className="w-4 h-4 text-red-500" />;
    case "time_limit_exceeded":
    case "memory_limit_exceeded":
      return <Clock className="w-4 h-4 text-yellow-500" />;
    case "queued":
    case "judging":
      return <Activity className="w-4 h-4 text-blue-500 animate-pulse" />;
    default:
      return <AlertCircle className="w-4 h-4 text-orange-500" />;
  }
}

export default function Submissions() {
  return <SubmissionsContent />;
}

function SubmissionsContent() {
  const { data: submissions, isLoading } = useListSubmissions();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold tracking-tight mb-1">Your Submissions</h1>
      <p className="text-muted-foreground mb-8">Every attempt you've made across all problems.</p>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-lg"></div>
          ))}
        </div>
      ) : !submissions || submissions.length === 0 ? (
        <Card className="text-center py-16 border-dashed">
          <CardContent>
            <ListChecks className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">No submissions yet</h3>
            <p className="text-muted-foreground mb-6">Solve a problem to see your history here.</p>
            <Link href="/" className="text-primary hover:underline font-medium">
              Browse problems
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden divide-y divide-border">
          {submissions.map((sub) => (
            <Link key={sub.id} href={`/submissions/${sub.id}`}>
              <div className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors cursor-pointer group">
                <div className="flex items-center gap-4 min-w-0">
                  <StatusIcon status={sub.status} />
                  <div className="min-w-0">
                    <div className="font-medium group-hover:text-primary transition-colors truncate">
                      {sub.problemTitle}
                    </div>
                    <div className="text-xs text-muted-foreground flex gap-2 mt-1">
                      <span>{sub.languageName}</span>
                      <span>•</span>
                      <span>{new Date(sub.submittedAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right font-mono font-medium shrink-0 ml-4">
                  {sub.score} / {sub.maxScore}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
