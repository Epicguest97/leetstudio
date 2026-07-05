import { Link, useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { Terminal, LogOut, Code2, Trophy, List, Plus, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, login, logout, isLoading } = useAuth();
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Problems", icon: Code2 },
    { href: "/contests", label: "Contests", icon: Trophy },
    { href: "/submissions", label: "Submissions", icon: List },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background dark">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 text-primary font-bold text-lg">
              <Terminal className="w-5 h-5" />
              <span>CodeArena</span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      isActive 
                        ? "bg-primary/10 text-primary" 
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {!isLoading && (
              <>
                {isAuthenticated ? (
                  <div className="flex items-center gap-3">
                    <Link href="/dashboard" className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      {user?.firstName || user?.email || "Dashboard"}
                    </Link>
                    <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground hover:text-destructive">
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </Button>
                  </div>
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
