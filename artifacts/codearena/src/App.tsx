import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";

import Home from "@/pages/home";
import ProblemDetail from "@/pages/problem-detail";
import CreateProblem from "@/pages/create-problem";
import Submissions from "@/pages/submissions";
import SubmissionDetail from "@/pages/submission-detail";
import Contests from "@/pages/contests";
import CreateContest from "@/pages/create-contest";
import ContestDetail from "@/pages/contest-detail";
import ContestLeaderboard from "@/pages/contest-leaderboard";
import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/problems/new" component={CreateProblem} />
      <Route path="/problems/:id" component={ProblemDetail} />
      <Route path="/submissions" component={Submissions} />
      <Route path="/submissions/:id" component={SubmissionDetail} />
      <Route path="/contests" component={Contests} />
      <Route path="/contests/new" component={CreateContest} />
      <Route path="/contests/:id" component={ContestDetail} />
      <Route path="/contests/:id/leaderboard" component={ContestLeaderboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Layout>
            <Router />
          </Layout>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
