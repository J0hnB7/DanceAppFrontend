"use client";

import { use, useState, useEffect, useRef } from "react";
import { Copy, Plus, Trash2, Download, Printer, QrCode, X, ClipboardList, Eye, EyeOff } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { judgeTokensApi, type JudgeTokenDto } from "@/lib/api/judge-tokens";
import { toast } from "@/hooks/use-toast";
import { useLocale } from "@/contexts/locale-context";
import QRCode from "qrcode";
import { formatTime } from "@/lib/utils";

// ── QR canvas component ──────────────────────────────────────────────────────
function QRCanvas({ url, size = 140 }: { url: string | null; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !url) return;
    QRCode.toCanvas(canvasRef.current, url, {
      width: size,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
    });
  }, [url, size]);

  if (!url) {
    return (
      <div style={{ width: size, height: size }} className="rounded flex items-center justify-center bg-[var(--surface-secondary)] text-xs text-[var(--text-tertiary)] text-center p-2">
        Token není dostupný — znovu vytvořte
      </div>
    );
  }

  return <canvas ref={canvasRef} width={size} height={size} className="rounded" />;
}

// ── Single judge QR card (for print view) ───────────────────────────────────
function JudgeQRCard({ token, judgeUrl, rawToken }: { token: JudgeTokenDto; judgeUrl: string; rawToken?: string }) {
  const { t } = useLocale();
  const url = rawToken ? `${judgeUrl}/${rawToken}` : null;
  const pin = token.rawPin ?? token.pin;
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center print:break-inside-avoid">
      <p className="text-lg font-bold text-[var(--text-primary)]">{t("judges.judgeNumber", { number: token.judgeNumber ?? 0 })}</p>
      {token.name && <p className="text-sm text-[var(--text-secondary)]">{token.name}</p>}
      <QRCanvas url={url} size={160} />
      {pin && (
        <div className="w-full rounded-lg bg-[var(--surface-secondary)] px-3 py-2">
          <p className="text-xs text-[var(--text-tertiary)]">PIN</p>
          <code className="text-sm font-bold tracking-widest">{pin}</code>
        </div>
      )}
      <div className="w-full rounded-lg bg-[var(--surface-secondary)] px-3 py-2">
        <p className="text-xs text-[var(--text-tertiary)]">Token</p>
        <code className="text-xs font-bold">{rawToken ? rawToken.slice(0, 16) + "…" : "—"}</code>
      </div>
      {url && <p className="text-xs text-[var(--text-tertiary)] break-all">{url}</p>}
    </div>
  );
}

// ── QR detail modal ──────────────────────────────────────────────────────────
function QRModal({
  token,
  judgeUrl,
  rawToken,
  onClose,
}: {
  token: JudgeTokenDto;
  judgeUrl: string;
  rawToken?: string;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const url = rawToken ? `${judgeUrl}/${rawToken}` : null;
  const pin = token.rawPin ?? token.pin;

  const handleDownload = () => {
    if (!url) return;
    const canvas = document.createElement("canvas");
    QRCode.toCanvas(canvas, url, { width: 512, margin: 2 }, () => {
      const link = document.createElement("a");
      link.download = `judge-${token.judgeNumber}-qr.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    });
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("judges.qrTitle", { number: token.judgeNumber ?? 0 })}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          <QRCanvas url={url} size={220} />
          {url ? (
            <>
              {pin && (
                <div className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)] px-4 py-3 text-center">
                  <p className="mb-1 text-xs text-[var(--text-tertiary)]">PIN</p>
                  <code className="text-2xl font-bold tracking-widest">{pin}</code>
                </div>
              )}
              <div className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)] px-4 py-3 text-center">
                <p className="mb-1 text-xs text-[var(--text-tertiary)]">{t("judges.judgeLink")}</p>
                <code className="break-all text-xs">{url}</code>
              </div>
              <div className="flex w-full gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    navigator.clipboard.writeText(url);
                    toast({ title: t("judges.linkCopied") } as Parameters<typeof toast>[0]);
                  }}
                >
                  <Copy className="h-4 w-4" /> {t("judges.copyLink")}
                </Button>
                <Button className="flex-1" onClick={handleDownload}>
                  <Download className="h-4 w-4" /> {t("judges.downloadPng")}
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-[var(--text-secondary)] text-center">
              Token není uložen — zrušte token a vytvořte nový.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── FallbackScoringForm ───────────────────────────────────────────────────────
function FallbackScoringModal({
  tokens,
  onClose,
}: {
  tokens: JudgeTokenDto[];
  onClose: () => void;
}) {
  const { t } = useLocale();
  const [selectedJudge, setSelectedJudge] = useState("");
  const [note, setNote] = useState("");
  const activeTokens = tokens.filter((tk) => tk.active);

  const handleSubmit = () => {
    if (!selectedJudge) return;
    const token = activeTokens.find((tk) => tk.id === selectedJudge);
    if (!token) return;
    const rawToken = token.rawToken ?? token.token;
    if (rawToken) {
      window.open(`/judge/${rawToken}`, "_blank");
    }
    onClose();
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            {t("judges.fallbackDialog.title")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
              {t("judges.fallbackDialog.selectJudgeLabel")}
            </label>
            <Select value={selectedJudge} onValueChange={setSelectedJudge}>
              <SelectTrigger>
                <SelectValue placeholder={t("judges.fallbackDialog.selectJudge")} />
              </SelectTrigger>
              <SelectContent>
                {activeTokens.map((tk) => (
                  <SelectItem key={tk.id} value={tk.id}>
                    {t("judges.judgeNumber", { number: tk.judgeNumber ?? 0 })}{tk.name ? ` — ${tk.name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            {t("judges.fallbackDialog.auditNote")}
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)] p-4 space-y-3">
            <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">
              {t("judges.fallbackDialog.callbackSection")}
            </p>
            <p className="text-sm text-[var(--text-secondary)]">
              {t("judges.fallbackDialog.callbackDesc")}
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">
              {t("judges.fallbackDialog.finalRoundDesc")}
            </p>
          </div>

          <Input
            label={t("judges.fallbackDialog.reasonLabel")}
            placeholder={t("judges.fallbackDialog.reasonPlaceholder")}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
          <Button disabled={!selectedJudge} onClick={handleSubmit}>
            {t("judges.fallbackDialog.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── PinCell — show/hide PIN ───────────────────────────────────────────────────
function PinCell({ pin }: { pin?: string }) {
  const { t } = useLocale();
  const [visible, setVisible] = useState(true);
  if (!pin) return <span className="text-[var(--text-tertiary)]">—</span>;
  return (
    <div className="flex items-center gap-1">
      <code className="rounded bg-[var(--surface-secondary)] px-2 py-0.5 text-xs">
        {visible ? pin : "••••"}
      </code>
      <button
        onClick={() => setVisible((v) => !v)}
        className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
        title={visible ? t("judges.pinHide") : t("judges.pinShow")}
      >
        {visible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
      </button>
    </div>
  );
}

// ── Derive activity entries from token data ───────────────────────────────────
function deriveActivityLog(tokens: JudgeTokenDto[]) {
  const entries: { judgeNumber: number; event: string; at: string; note: string }[] = [];
  for (const tk of tokens) {
    if (!tk.judgeNumber) continue;
    if (tk.connectedAt) {
      entries.push({ judgeNumber: tk.judgeNumber, event: "Connected", at: tk.connectedAt, note: "" });
    }
    if (tk.usedAt) {
      entries.push({ judgeNumber: tk.judgeNumber, event: "Scores submitted", at: tk.usedAt, note: "" });
    }
  }
  return entries.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function JudgesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useLocale();
  const [createOpen, setCreateOpen] = useState(false);
  const [count, setCount] = useState("5");
  const [qrToken, setQrToken] = useState<JudgeTokenDto | null>(null);
  const [printMode, setPrintMode] = useState(false);
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const qc = useQueryClient();

  const judgeBaseUrl =
    typeof window !== "undefined" ? `${window.location.origin}/judge` : "/judge";

  const { data: tokens, isLoading } = useQuery({
    queryKey: ["judge-tokens", id],
    queryFn: () => judgeTokensApi.list(id),
  });

  const createTokens = useMutation({
    mutationFn: async () => {
      const n = parseInt(count) || 1;
      const existingNumbers = new Set((tokens ?? []).map((tk) => tk.judgeNumber));
      let judgeNum = 1;
      let created = 0;
      while (created < n) {
        if (!existingNumbers.has(judgeNum)) {
          await judgeTokensApi.create(id, { judgeNumber: judgeNum, role: "JUDGE" });
          created++;
        }
        judgeNum++;
        if (judgeNum > 100) break; // safety
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["judge-tokens", id] });
      setCreateOpen(false);
      toast({ title: t("judges.createDialog.tokensCreated", { count }), variant: "success" } as Parameters<typeof toast>[0]);
    },
  });

  const revokeToken = useMutation({
    mutationFn: (tokenId: string) => judgeTokensApi.revoke(id, tokenId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["judge-tokens", id] });
    },
  });

  const handlePrintAll = () => {
    setPrintMode(true);
    setTimeout(() => window.print(), 300);
    const afterPrint = () => {
      setPrintMode(false);
      window.removeEventListener("afterprint", afterPrint);
    };
    window.addEventListener("afterprint", afterPrint);
  };

  const activeTokens = tokens?.filter((t) => t.active) ?? [];
  const getTokenRaw = (tk: JudgeTokenDto) => tk.rawToken ?? tk.token;

  // Print view
  if (printMode) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">{t("judges.qrCodes")}</h1>
          <p className="text-sm text-gray-500">{id}</p>
        </div>
        <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
          {activeTokens.map((tk) => (
            <JudgeQRCard key={tk.id} token={tk} judgeUrl={judgeBaseUrl} rawToken={getTokenRaw(tk)} />
          ))}
        </div>
        <div className="mt-6 flex justify-center print:hidden">
          <Button variant="outline" onClick={() => setPrintMode(false)}>
            <X className="h-4 w-4" /> {t("judges.back")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AppShell
      headerActions={
        <div className="flex items-center gap-2">
          {activeTokens.length > 0 && (
            <>
              <Button size="sm" variant="outline" onClick={() => setFallbackOpen(true)}>
                <ClipboardList className="h-4 w-4" />
                {t("judges.fallbackScoring")}
              </Button>
              <Button size="sm" variant="outline" onClick={handlePrintAll}>
                <Printer className="h-4 w-4" />
                {t("judges.printQr")}
              </Button>
            </>
          )}
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            {t("judges.createTokens")}
          </Button>
        </div>
      }
    >
      <PageHeader
        title={t("judges.title")}
        description={t("judges.description")}
        backHref={`/dashboard/competitions/${id}`}
      />

      {/* Tokens table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">{t("judges.table.judge")}</TableHead>
              <TableHead>{t("judges.table.token")}</TableHead>
              <TableHead>{t("judges.table.pin")}</TableHead>
              <TableHead>{t("judges.table.status")}</TableHead>
              <TableHead className="w-36">{t("judges.table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {tokens?.map((tk) => (
              <TableRow key={tk.id}>
                <TableCell className="font-bold">#{tk.judgeNumber}</TableCell>
                <TableCell>
                  <code className="rounded bg-[var(--surface-secondary)] px-2 py-0.5 text-xs">
                    {getTokenRaw(tk)?.slice(0, 16) ?? "—"}…
                  </code>
                </TableCell>
                <TableCell>
                  <PinCell pin={tk.rawPin ?? tk.pin} />
                </TableCell>
                <TableCell>
                  <Badge variant={tk.active ? "success" : "secondary"}>
                    {tk.active ? t("judges.active") : t("judges.revoked")}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title={t("judges.showQr")}
                      onClick={() => setQrToken(tk)}
                    >
                      <QrCode className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title={t("judges.copyLinkTitle")}
                      disabled={!getTokenRaw(tk)}
                      onClick={() => {
                        const raw = getTokenRaw(tk);
                        if (!raw) return;
                        navigator.clipboard.writeText(`${judgeBaseUrl}/${raw}`);
                        toast({ title: t("judges.linkCopied") } as Parameters<typeof toast>[0]);
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title={t("judges.revokeToken")}
                      className="text-[var(--text-tertiary)] hover:text-[var(--destructive)]"
                      onClick={() => revokeToken.mutate(tk.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && !tokens?.length && (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-[var(--text-secondary)]">
                  {t("judges.noTokens")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* QR preview cards */}
      {activeTokens.length > 0 && (
        <div className="mt-6">
          <p className="mb-3 text-sm font-medium text-[var(--text-secondary)]">
            {t("judges.qrPreview", { count: activeTokens.length })}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {activeTokens.map((tk) => (
              <button
                key={tk.id}
                onClick={() => setQrToken(tk)}
                className="flex flex-col items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-center transition-all hover:border-[var(--accent)]/40 hover:shadow-md"
              >
                <p className="text-xs font-semibold text-[var(--text-secondary)]">
                  {t("judges.judgeNumber", { number: tk.judgeNumber ?? 0 })}
                </p>
                <QRCanvas url={getTokenRaw(tk) ? `${judgeBaseUrl}/${getTokenRaw(tk)}` : null} size={100} />
                <p className="text-xs text-[var(--text-tertiary)]">{t("judges.clickToEnlarge")}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Judge activity log */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("judges.activityLog")}</CardTitle>
          </CardHeader>
          {(() => {
            const activity = deriveActivityLog(tokens ?? []);
            if (!activity.length) {
              return (
                <div className="py-10 text-center text-sm text-[var(--text-secondary)]">
                  {t("judges.noActivity")}
                </div>
              );
            }
            return (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("judges.judge")}</TableHead>
                    <TableHead>{t("judges.event")}</TableHead>
                    <TableHead>{t("judges.time")}</TableHead>
                    <TableHead>{t("common.note")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activity.map((entry, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{t("judges.judgeNumber", { number: entry.judgeNumber })}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            entry.event === "Scores submitted"
                              ? "success"
                              : entry.event === "Connected"
                              ? "default"
                              : "warning"
                          }
                        >
                          {entry.event}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-[var(--text-secondary)]">
                        {formatTime(entry.at)}
                      </TableCell>
                      <TableCell className="text-xs text-[var(--text-tertiary)]">
                        {entry.note || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            );
          })()}
        </Card>
      </div>

      {/* QR detail modal */}
      {qrToken && (
        <QRModal token={qrToken} judgeUrl={judgeBaseUrl} rawToken={getTokenRaw(qrToken)} onClose={() => setQrToken(null)} />
      )}

      {/* Fallback scoring modal */}
      {fallbackOpen && (
        <FallbackScoringModal
          tokens={tokens ?? []}
          onClose={() => setFallbackOpen(false)}
        />
      )}

      {/* Create tokens dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("judges.createDialog.title")}</DialogTitle>
          </DialogHeader>
          <Input
            label={t("judges.createDialog.countLabel")}
            type="number"
            min={1}
            max={20}
            value={count}
            onChange={(e) => setCount(e.target.value)}
          />
          <p className="text-xs text-[var(--text-secondary)]">
            {t("judges.createDialog.description")}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={() => createTokens.mutate()} loading={createTokens.isPending}>
              {t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
