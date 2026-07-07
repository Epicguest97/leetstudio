import { Link } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { Terminal, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, login, logout, isLoading } = useAuth();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background dark">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-primary font-bold text-lg">
            <Terminal className="w-5 h-5" />
            <span>CodeArena</span>
          </Link>

          <div className="flex items-center gap-3">
            {!isLoading && (
              <>
                {isAuthenticated ? (
                  <>
                    <span className="text-sm text-muted-foreground hidden sm:block">
                      {user?.firstName || user?.email}
                    </span>
                    <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground hover:text-destructive">
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </Button>
                  </>
                ) : (
                  <Button onClick={login} size="sm" className="font-bold">
                    Sign In
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
