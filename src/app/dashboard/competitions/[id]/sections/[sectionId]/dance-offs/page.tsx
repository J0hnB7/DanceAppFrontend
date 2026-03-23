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
import { useLocale } from "@/contexts/locale-context";
import { getErrorMessage } from "@/lib/utils";

export default function DanceOffsPage({
  params,
}: {
  params: Promise<{ id: string; sectionId: string }>;
}) {
  const { id: competitionId, sectionId } = use(params);
  const qc = useQueryClient();
  const { t } = useLocale();
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
      toast({ title: t("danceOffs.created"), variant: "success" });
    },
    onError: (err: unknown) => {
      toast({ title: getErrorMessage(err, t("common.error")), variant: "destructive" });
    },
  });

  const resolve = useMutation({
    mutationFn: (danceOffId: string) => danceOffsApi.resolve(danceOffId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dance-offs", sectionId] });
      toast({ title: t("danceOffs.resolved"), variant: "success" });
    },
    onError: (err: unknown) => {
      toast({ title: getErrorMessage(err, t("common.error")), variant: "destructive" });
    },
  });

  return (
    <AppShell
      headerActions={
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          {t("danceOffs.createButton")}
        </Button>
      }
    >
      <PageHeader
        title={t("danceOffs.title")}
        description={t("danceOffs.description")}
        backHref={`/dashboard/competitions/${competitionId}/sections/${sectionId}`}
      />

      {!danceOffs?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <Swords className="h-12 w-12 text-[var(--text-tertiary)]" />
            <div>
              <p className="font-medium text-[var(--text-primary)]">{t("danceOffs.noTitle")}</p>
              <p className="text-sm text-[var(--text-secondary)]">
                {t("danceOffs.noDesc")}
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
                    {t("danceOffs.positionTitle", { position: danceOff.positionContested })}
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
                      {t("danceOffs.judgeScores")}
                    </p>
                    <div className="flex flex-col gap-1">
                      {danceOff.scores.map((score) => (
                        <div
                          key={`${score.judgeTokenId}-${score.pairId}`}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-[var(--text-secondary)]">
                            {t("danceOffs.judgeScore", { judge: score.judgeNumber, pair: score.pairId.slice(0, 6) })}…
                          </span>
                          <span className="font-semibold">{t("danceOffs.place", { place: score.placement })}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="mb-3 text-sm text-[var(--text-secondary)]">
                    {t("danceOffs.waitingScores")}
                  </p>
                )}

                {danceOff.status === "ACTIVE" && danceOff.scores.length > 0 && (
                  <Button
                    size="sm"
                    onClick={() => resolve.mutate(danceOff.id)}
                    loading={resolve.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {t("danceOffs.resolveButton")}
                  </Button>
                )}

                {danceOff.status === "COMPLETED" && danceOff.resultPairId && (
                  <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--success)]/10 px-3 py-2">
                    <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
                    <p className="text-sm font-medium text-[var(--success)]">
                      {t("danceOffs.winner", { pair: danceOff.resultPairId.slice(0, 8) })}…
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
            <DialogTitle>{t("danceOffs.createTitle")}</DialogTitle>
          </DialogHeader>
          <Input
            label={t("danceOffs.positionLabel")}
            type="number"
            min={1}
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            hint={t("danceOffs.positionHint")}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={() => create.mutate()} loading={create.isPending}>
              {t("danceOffs.createConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
