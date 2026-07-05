import { useAuth } from "@workspace/replit-auth-web";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, login } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse flex flex-col items-center gap-4 text-muted-foreground">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="font-mono text-sm uppercase tracking-widest">Initializing...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-lg p-8 text-center space-y-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50"></div>
          
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-10 h-10 text-muted-foreground" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Access Restricted</h2>
            <p className="text-muted-foreground">
              You need to be signed in to access this area. Sign in to submit code, join contests, and climb the leaderboard.
            </p>
          </div>
          
          <Button onClick={login} size="lg" className="w-full font-bold">
            Sign In to Continue
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
