import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useCreateContest, useListProblems } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Loader2 } from "lucide-react";

interface ProblemRow {
  problemId: number | undefined;
  points: number;
  label: string;
}

export default function CreateContest() {
  return <CreateContestContent />;
}

function CreateContestContent() {
  const [, navigate] = useLocation();
  const { data: problems } = useListProblems();
  const createContest = useCreateContest();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [rows, setRows] = useState<ProblemRow[]>([{ problemId: undefined, points: 100, label: "A" }]);

  const addRow = () => {
    const nextLabel = String.fromCharCode(65 + rows.length);
    setRows([...rows, { problemId: undefined, points: 100, label: nextLabel }]);
  };

  const removeRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, patch: Partial<ProblemRow>) => {
    setRows(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const validRows = rows.filter((r) => r.problemId != null);
  const canSubmit =
    title.trim() && startTime && endTime && validRows.length > 0 && !createContest.isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    createContest.mutate(
      {
        data: {
          title,
          description,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          problems: validRows.map((r) => ({
            problemId: r.problemId as number,
            points: r.points,
            label: r.label,
          })),
        },
      },
      {
        onSuccess: (data) => navigate(`/contests/${data.id}`),
      },
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold tracking-tight mb-1">Create Contest</h1>
      <p className="text-muted-foreground mb-8">Assemble a problem set and set the clock running.</p>

      <Card className="mb-6">
        <CardContent className="p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="c-title">Title</Label>
            <Input id="c-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Weekly Contest 1" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="c-desc">Description</Label>
            <Textarea
              id="c-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start">Start Time</Label>
              <Input
                id="start"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">End Time</Label>
              <Input id="end" type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Problems</h2>
            <Button variant="outline" size="sm" onClick={addRow}>
              <Plus className="w-4 h-4 mr-2" />
              Add Problem
            </Button>
          </div>

          {rows.map((row, i) => (
            <div key={i} className="flex items-center gap-3">
              <Input
                className="w-16 text-center font-mono"
                value={row.label}
                onChange={(e) => updateRow(i, { label: e.target.value })}
              />
              <Select
                value={row.problemId != null ? String(row.problemId) : undefined}
                onValueChange={(v) => updateRow(i, { problemId: Number(v) })}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a problem" />
                </SelectTrigger>
                <SelectContent>
                  {problems?.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={0}
                className="w-24"
                value={row.points}
                onChange={(e) => updateRow(i, { points: Number(e.target.value) })}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeRow(i)}
                disabled={rows.length === 1}
                className="text-muted-foreground hover:text-destructive shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}

          {(!problems || problems.length === 0) && (
            <p className="text-sm text-muted-foreground">
              No problems exist yet.{" "}
              <Link href="/problems/new" className="text-primary hover:underline">
                Create one first
              </Link>
              .
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Link href="/contests">
          <Button variant="ghost">Cancel</Button>
        </Link>
        <Button onClick={handleSubmit} disabled={!canSubmit} className="font-bold">
          {createContest.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Create Contest
        </Button>
      </div>
    </div>
  );
}
