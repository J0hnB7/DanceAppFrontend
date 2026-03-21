"use client";

import { useState } from "react";
import { FlaskConical, Trash2, Play, Copy, Check, AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { seedApi, type SeedResult } from "@/lib/api/seed";
import { useLocale } from "@/contexts/locale-context";

const isTestMode = process.env.NEXT_PUBLIC_TEST_MODE === "true";

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} className="ml-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

export default function SeedPage() {
  const { toast } = useToast();
  const { t } = useLocale();
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [result, setResult] = useState<SeedResult | null>(null);

  const [competitionName, setCompetitionName] = useState("Test Competition");
  const [judgeCount, setJudgeCount] = useState(5);
  const [pairCount, setPairCount] = useState(12);
  const [sectionCount, setSectionCount] = useState(3);
  const [withResults, setWithResults] = useState(true);

  const handleSeed = async () => {
    setLoading(true);
    try {
      const data = await seedApi.seed({
        competitionName,
        judgeCount,
        pairCount,
        sectionCount,
        withResults,
      });
      setResult(data);
      toast({ title: t("seed.seeded"), description: data.message, variant: "success" });
    } catch {
      toast({ title: t("seed.seedFailed"), description: t("seed.seedFailedDesc"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResetAll = async () => {
    if (!confirm(t("seed.wipeConfirm"))) return;
    setResetting(true);
    try {
      await seedApi.resetAll();
      setResult(null);
      toast({ title: t("seed.wiped"), description: t("seed.wipedDesc"), variant: "success" });
    } catch {
      toast({ title: t("seed.resetFailed"), variant: "destructive" });
    } finally {
      setResetting(false);
    }
  };

  if (!isTestMode) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500" />
          <h2 className="text-xl font-semibold">{t("seed.notAvailable")}</h2>
          <p className="text-[var(--text-secondary)] max-w-sm">
            {t("seed.notAvailableDesc")} <code className="rounded bg-[var(--surface-raised)] px-1 text-xs">NEXT_PUBLIC_TEST_MODE=true</code> {t("seed.testModeRequired")}
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Warning */}
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
          <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{t("seed.warning")}</span>
        </div>

        {/* Options */}
        <Card className="p-6 space-y-5">
          <h2 className="font-semibold text-[var(--text-primary)]">{t("seed.optionsTitle")}</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">{t("seed.competitionNameLabel")}</label>
              <Input
                value={competitionName}
                onChange={(e) => setCompetitionName(e.target.value)}
                placeholder="Test Competition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">{t("seed.judgesLabel")}</label>
              <Input
                type="number"
                min={1}
                max={15}
                value={judgeCount}
                onChange={(e) => setJudgeCount(Number(e.target.value))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">{t("seed.pairsLabel")}</label>
              <Input
                type="number"
                min={2}
                max={50}
                value={pairCount}
                onChange={(e) => setPairCount(Number(e.target.value))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">{t("seed.sectionsLabel")}</label>
              <Input
                type="number"
                min={1}
                max={10}
                value={sectionCount}
                onChange={(e) => setSectionCount(Number(e.target.value))}
              />
            </div>

            <div className="flex items-center gap-2 pt-5">
              <input
                id="withResults"
                type="checkbox"
                checked={withResults}
                onChange={(e) => setWithResults(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--border)] accent-[var(--accent)]"
              />
              <label htmlFor="withResults" className="text-sm text-[var(--text-secondary)]">
                {t("seed.includeResults")}
              </label>
            </div>
          </div>

          <Separator />

          <div className="flex items-center gap-3">
            <Button onClick={handleSeed} loading={loading} className="gap-2">
              <Play className="h-4 w-4" />
              {t("seed.runSeeder")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleResetAll}
              loading={resetting}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {t("seed.wipeAll")}
            </Button>
          </div>
        </Card>

        {/* Result */}
        {result && (
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-[var(--text-primary)]">{t("seed.resultTitle")}</h2>
              <Badge variant="success">{t("seed.created")}</Badge>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between rounded-lg bg-[var(--surface-raised)] px-3 py-2">
                <span className="text-[var(--text-secondary)]">{t("seed.competition")}</span>
                <span className="font-medium flex items-center gap-1">
                  {result.competitionName}
                  <CopyButton value={result.competitionId} />
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-[var(--surface-raised)] px-3 py-2">
                <span className="text-[var(--text-secondary)]">{t("seed.competitionId")}</span>
                <code className="text-xs font-mono flex items-center gap-1">
                  {result.competitionId}
                  <CopyButton value={result.competitionId} />
                </code>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-[var(--surface-raised)] px-3 py-2">
                <span className="text-[var(--text-secondary)]">{t("seed.pairsSeeded")}</span>
                <span className="font-medium">{result.pairCount}</span>
              </div>
            </div>

            {result.judgeTokens.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-[var(--text-secondary)]">{t("seed.judgeTokens")}</p>
                <div className="space-y-1">
                  {result.judgeTokens.map((token, i) => (
                    <div
                      key={token}
                      className="flex items-center justify-between rounded-lg bg-[var(--surface-raised)] px-3 py-1.5 text-xs"
                    >
                      <span className="text-[var(--text-secondary)]">{t("seed.judgeLabel", { n: i + 1 })}</span>
                      <code className="font-mono flex items-center gap-1">
                        {token}
                        <CopyButton value={token} />
                      </code>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  window.open(`/dashboard/competitions/${result.competitionId}`, "_blank");
                }}
              >
                {t("seed.openCompetition")}
              </Button>
              {result.judgeTokens[0] && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    window.open(`/judge/${result.judgeTokens[0]}`, "_blank");
                  }}
                >
                  {t("seed.openAsJudge")}
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
