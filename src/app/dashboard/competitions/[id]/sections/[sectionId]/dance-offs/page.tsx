"use client";

import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Swords, CheckCircle2, Plus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { danceOffsApi } from "@/lib/api/dance-offs";
import { toast } from "@/hooks/use-toast";

export default function DanceOffsPage({
  params,
}: {
  params: Promise<{ id: string; sectionId: string }>;
}) {
  const { id: competitionId, sectionId } = use(params);
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [position, setPosition] = useState("1");

  const { data: danceOffs } = useQuery({
    queryKey: ["dance-offs", sectionId],
    queryFn: () => danceOffsApi.list(sectionId),
  });

  const create = useMutation({
    mutationFn: () => danceOffsApi.create(sectionId, parseInt(position) || 1),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dance-offs", sectionId] });
      setCreateOpen(false);
      toast({ title: "Dance-off created", variant: "success" } as Parameters<typeof toast>[0]);
    },
  });

  const resolve = useMutation({
    mutationFn: (danceOffId: string) => danceOffsApi.resolve(danceOffId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dance-offs", sectionId] });
      toast({ title: "Dance-off resolved", variant: "success" } as Parameters<typeof toast>[0]);
    },
  });

  return (
    <AppShell
      headerActions={
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create dance-off
        </Button>
      }
    >
      <PageHeader
        title="Dance-offs"
        description="Resolve tied placements using a dance-off round"
      />

      {!danceOffs?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <Swords className="h-12 w-12 text-[var(--text-tertiary)]" />
            <div>
              <p className="font-medium text-[var(--text-primary)]">No dance-offs yet</p>
              <p className="text-sm text-[var(--text-secondary)]">
                Create a dance-off to resolve a tied placement.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {danceOffs.map((danceOff) => (
            <Card key={danceOff.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Swords className="h-4 w-4 text-[var(--accent)]" />
                    Position {danceOff.positionContested} dance-off
                  </CardTitle>
                  <Badge
                    variant={
                      danceOff.status === "COMPLETED"
                        ? "success"
                        : danceOff.status === "ACTIVE"
                        ? "warning"
                        : "secondary"
                    }
                  >
                    {danceOff.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {danceOff.scores.length > 0 ? (
                  <div className="mb-3">
                    <p className="mb-2 text-xs font-semibold text-[var(--text-tertiary)]">
                      JUDGE SCORES
                    </p>
                    <div className="flex flex-col gap-1">
                      {danceOff.scores.map((score) => (
                        <div
                          key={`${score.judgeTokenId}-${score.pairId}`}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-[var(--text-secondary)]">
                            Judge {score.judgeNumber} → Pair {score.pairId.slice(0, 6)}…
                          </span>
                          <span className="font-semibold">Place {score.placement}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="mb-3 text-sm text-[var(--text-secondary)]">
                    Waiting for judge scores...
                  </p>
                )}

                {danceOff.status === "ACTIVE" && danceOff.scores.length > 0 && (
                  <Button
                    size="sm"
                    onClick={() => resolve.mutate(danceOff.id)}
                    loading={resolve.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Resolve dance-off
                  </Button>
                )}

                {danceOff.status === "COMPLETED" && danceOff.resultPairId && (
                  <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--success)]/10 px-3 py-2">
                    <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
                    <p className="text-sm font-medium text-[var(--success)]">
                      Winner: Pair {danceOff.resultPairId.slice(0, 8)}…
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create dance-off</DialogTitle>
          </DialogHeader>
          <Input
            label="Position contested"
            type="number"
            min={1}
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            hint="Which placement is being contested? (e.g. 3 = tied for 3rd place)"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => create.mutate()} loading={create.isPending}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
