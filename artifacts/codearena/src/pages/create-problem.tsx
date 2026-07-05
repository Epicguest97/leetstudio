import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  useCreateProblem,
  useListProblemTestCases,
  getListProblemTestCasesQueryKey,
  useCreateTestCase,
  useDeleteTestCase,
} from "@workspace/api-client-react";
import { RequireAuth } from "@/components/require-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, CheckCircle2, Loader2 } from "lucide-react";
import type { ProblemDifficulty } from "@workspace/api-client-react";

export default function CreateProblem() {
  return (
    <RequireAuth>
      <CreateProblemContent />
    </RequireAuth>
  );
}

function CreateProblemContent() {
  const [, navigate] = useLocation();
  const [createdProblemId, setCreatedProblemId] = useState<number | undefined>(undefined);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState<ProblemDifficulty>("easy");
  const [points, setPoints] = useState(100);
  const [tags, setTags] = useState("");
  const [cpuTimeLimitSeconds, setCpuTimeLimitSeconds] = useState(1);
  const [memoryLimitKb, setMemoryLimitKb] = useState(65536);

  const createProblem = useCreateProblem();

  const handleCreateProblem = () => {
    if (!title.trim() || !description.trim()) return;
    createProblem.mutate(
      {
        data: {
          title,
          description,
          difficulty,
          points,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          cpuTimeLimitSeconds,
          memoryLimitKb,
        },
      },
      {
        onSuccess: (data) => setCreatedProblemId(data.id),
      },
    );
  };

  if (createdProblemId) {
    return <AddTestCases problemId={createdProblemId} onDone={() => navigate(`/problems/${createdProblemId}`)} />;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold tracking-tight mb-1">Create Problem</h1>
      <p className="text-muted-foreground mb-8">Define the challenge for other competitors to solve.</p>

      <Card>
        <CardContent className="p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Two Sum" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain the problem, input/output format, and constraints..."
              rows={8}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={(v) => setDifficulty(v as ProblemDifficulty)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="points">Points</Label>
              <Input
                id="points"
                type="number"
                min={0}
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="arrays, hash-map"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cpu">CPU Time Limit (s)</Label>
              <Input
                id="cpu"
                type="number"
                min={0.1}
                step={0.1}
                value={cpuTimeLimitSeconds}
                onChange={(e) => setCpuTimeLimitSeconds(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mem">Memory Limit (KB)</Label>
              <Input
                id="mem"
                type="number"
                min={1024}
                value={memoryLimitKb}
                onChange={(e) => setMemoryLimitKb(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Link href="/">
              <Button variant="ghost">Cancel</Button>
            </Link>
            <Button
              onClick={handleCreateProblem}
              disabled={createProblem.isPending || !title.trim() || !description.trim()}
              className="font-bold"
            >
              {createProblem.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Continue to Test Cases
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AddTestCases({ problemId, onDone }: { problemId: number; onDone: () => void }) {
  const { data: testCases } = useListProblemTestCases(problemId, {
    query: { queryKey: getListProblemTestCasesQueryKey(problemId) },
  });
  const createTestCase = useCreateTestCase();
  const deleteTestCase = useDeleteTestCase();

  const [stdin, setStdin] = useState("");
  const [expectedOutput, setExpectedOutput] = useState("");
  const [isSample, setIsSample] = useState(true);
  const [tcPoints, setTcPoints] = useState(10);

  const handleAdd = () => {
    if (!expectedOutput.trim()) return;
    createTestCase.mutate(
      { id: problemId, data: { stdin, expectedOutput, isSample, points: tcPoints } },
      {
        onSuccess: () => {
          setStdin("");
          setExpectedOutput("");
        },
      },
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-center gap-2 text-green-500 mb-1">
        <CheckCircle2 className="w-5 h-5" />
        <span className="font-medium">Problem created</span>
      </div>
      <h1 className="text-3xl font-bold tracking-tight mb-1">Add Test Cases</h1>
      <p className="text-muted-foreground mb-8">
        Mark a few as "sample" so competitors can see the input/output. Keep the rest hidden to grade fairly.
      </p>

      <Card className="mb-6">
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Input (stdin)</Label>
              <Textarea value={stdin} onChange={(e) => setStdin(e.target.value)} rows={4} />
            </div>
            <div className="space-y-2">
              <Label>Expected Output</Label>
              <Textarea value={expectedOutput} onChange={(e) => setExpectedOutput(e.target.value)} rows={4} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox id="sample" checked={isSample} onCheckedChange={(v) => setIsSample(Boolean(v))} />
                <Label htmlFor="sample" className="cursor-pointer">Visible sample</Label>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="tcPoints">Points</Label>
                <Input
                  id="tcPoints"
                  type="number"
                  min={0}
                  className="w-20"
                  value={tcPoints}
                  onChange={(e) => setTcPoints(Number(e.target.value))}
                />
              </div>
            </div>
            <Button onClick={handleAdd} disabled={createTestCase.isPending || !expectedOutput.trim()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Test Case
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2 mb-8">
        {testCases?.map((tc, i) => (
          <div key={tc.id} className="flex items-center justify-between p-3 bg-card border border-border rounded-md">
            <div className="text-sm font-mono truncate pr-4">
              #{i + 1} — {tc.isSample ? "sample" : "hidden"} — {tc.points} pts
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteTestCase.mutate({ id: tc.id })}
              className="text-muted-foreground hover:text-destructive shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
        {(!testCases || testCases.length === 0) && (
          <p className="text-sm text-muted-foreground text-center py-4">No test cases added yet.</p>
        )}
      </div>

      <div className="flex justify-end">
        <Button onClick={onDone} disabled={!testCases || testCases.length === 0} className="font-bold">
          Finish & View Problem
        </Button>
      </div>
    </div>
  );
}
