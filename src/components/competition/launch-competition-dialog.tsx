"use client";

import { Rocket, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SimpleDialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { competitionsApi } from "@/lib/api/competitions";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";

interface Props {
  competitionId: string;
  open: boolean;
  onClose: () => void;
}

export function LaunchCompetitionDialog({ competitionId, open, onClose }: Props) {
  const router = useRouter();
  const qc = useQueryClient();

  const startMutation = useMutation({
    mutationFn: () => competitionsApi.start(competitionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["competition", competitionId] });
      onClose();
      toast({ title: "Soutěž spuštěna", variant: "success" });
      router.push(`/dashboard/competitions/${competitionId}/schedule`);
    },
    onError: (err) => {
      const message = isAxiosError(err)
        ? err.response?.data?.message ?? "Nelze spustit soutěž"
        : "Nelze spustit soutěž";
      toast({
        title: "Nelze spustit soutěž",
        description: message,
        variant: "destructive",
      });
    },
  });

  return (
    <SimpleDialog open={open} onClose={onClose} title="Spustit soutěž">
      <div className="space-y-4">
        <p className="text-sm text-[var(--text-secondary)]">
          Po spuštění přejde soutěž do stavu <strong>IN_PROGRESS</strong>. Harmonogram musí
          být publikovaný, všechna kola musí mít přiřazené páry a sekce musí mít nastaveného
          alespoň jednoho rozhodčího.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={startMutation.isPending}>
            <X className="h-4 w-4" /> Zrušit
          </Button>
          <Button
            onClick={() => startMutation.mutate()}
            loading={startMutation.isPending}
            disabled={startMutation.isPending}
          >
            <Rocket className="h-4 w-4" /> Spustit soutěž
          </Button>
        </div>
      </div>
    </SimpleDialog>
  );
}
