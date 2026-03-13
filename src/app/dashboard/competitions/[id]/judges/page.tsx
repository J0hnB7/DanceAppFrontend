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
import QRCode from "qrcode";
import { formatTime } from "@/lib/utils";

// ── QR canvas component ──────────────────────────────────────────────────────
function QRCanvas({ url, size = 140 }: { url: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, url, {
      width: size,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
    });
  }, [url, size]);

  return <canvas ref={canvasRef} width={size} height={size} className="rounded" />;
}

// ── Single judge QR card (for print view) ───────────────────────────────────
function JudgeQRCard({ token, judgeUrl }: { token: JudgeTokenDto; judgeUrl: string }) {
  const url = `${judgeUrl}/${token.token}`;
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-[var(--border)] bg-white p-6 text-center print:break-inside-avoid">
      <p className="text-lg font-bold text-[var(--text-primary)]">Porotce #{token.judgeNumber}</p>
      {token.name && <p className="text-sm text-[var(--text-secondary)]">{token.name}</p>}
      <QRCanvas url={url} size={160} />
      <div className="w-full rounded-lg bg-[var(--surface-secondary)] px-3 py-2">
        <p className="text-xs text-[var(--text-tertiary)]">Token</p>
        <code className="text-xs font-bold">{token.token}</code>
      </div>
      <p className="text-xs text-[var(--text-tertiary)] break-all">{url}</p>
    </div>
  );
}

// ── QR detail modal ──────────────────────────────────────────────────────────
function QRModal({
  token,
  judgeUrl,
  onClose,
}: {
  token: JudgeTokenDto;
  judgeUrl: string;
  onClose: () => void;
}) {
  const url = `${judgeUrl}/${token.token}`;

  const handleDownload = () => {
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
          <DialogTitle>Porotce #{token.judgeNumber} — QR kód</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          <QRCanvas url={url} size={220} />
          <div className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)] px-4 py-3 text-center">
            <p className="mb-1 text-xs text-[var(--text-tertiary)]">Odkaz pro porotce</p>
            <code className="break-all text-xs">{url}</code>
          </div>
          <div className="flex w-full gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                navigator.clipboard.writeText(url);
                toast({ title: "Odkaz zkopírován" } as Parameters<typeof toast>[0]);
              }}
            >
              <Copy className="h-4 w-4" /> Kopírovat
            </Button>
            <Button className="flex-1" onClick={handleDownload}>
              <Download className="h-4 w-4" /> Stáhnout PNG
            </Button>
          </div>
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
  const [selectedJudge, setSelectedJudge] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const activeTokens = tokens.filter((t) => t.active);

  const handleSubmit = async () => {
    if (!selectedJudge) return;
    setSaving(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    toast({
      title: "Scores recorded",
      description: `Fallback scores for Judge ${activeTokens.find((t) => t.id === selectedJudge)?.judgeNumber} saved. Marked as "Entered by proxy".`,
      variant: "success",
    } as Parameters<typeof toast>[0]);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Fallback scoring — enter on behalf of judge
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
              Select judge
            </label>
            <Select value={selectedJudge} onValueChange={setSelectedJudge}>
              <SelectTrigger>
                <SelectValue placeholder="Select judge..." />
              </SelectTrigger>
              <SelectContent>
                {activeTokens.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    Judge #{t.judgeNumber}{t.name ? ` — ${t.name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            <strong>Note:</strong> Scores entered here will be marked as &ldquo;Entered by proxy&rdquo;
            in the audit log. This action is logged and cannot be undone.
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)] p-4 space-y-3">
            <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">
              Callback selection (preliminary round)
            </p>
            <p className="text-sm text-[var(--text-secondary)]">
              In the current round, select which pairs to callback by entering their start numbers
              or checking them off in the judging interface after the round is opened.
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">
              For final rounds, enter placement order (1st, 2nd, 3rd…) per dance.
            </p>
          </div>

          <Input
            label="Reason / note (optional)"
            placeholder="e.g. Judge device failure, entered by chief adjudicator"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!selectedJudge} loading={saving} onClick={handleSubmit}>
            Confirm &amp; mark as proxy entry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── PinCell — show/hide PIN ───────────────────────────────────────────────────
function PinCell({ pin }: { pin?: string }) {
  const [visible, setVisible] = useState(false);
  if (!pin) return <span className="text-[var(--text-tertiary)]">—</span>;
  return (
    <div className="flex items-center gap-1">
      <code className="rounded bg-[var(--surface-secondary)] px-2 py-0.5 text-xs">
        {visible ? pin : "••••"}
      </code>
      <button
        onClick={() => setVisible((v) => !v)}
        className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
        title={visible ? "Hide PIN" : "Show PIN"}
      >
        {visible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
      </button>
    </div>
  );
}

// ── Mock activity log entries ─────────────────────────────────────────────────
const MOCK_ACTIVITY = [
  { judgeNumber: 1, event: "Connected", at: "2026-04-15T09:45:00", note: "" },
  { judgeNumber: 3, event: "Connected", at: "2026-04-15T09:47:00", note: "" },
  { judgeNumber: 4, event: "Connected", at: "2026-04-15T09:48:00", note: "" },
  { judgeNumber: 1, event: "Scores submitted", at: "2026-04-15T10:30:00", note: "Round 1 — Waltz, Tango" },
  { judgeNumber: 3, event: "Scores submitted", at: "2026-04-15T10:32:00", note: "Round 1 — Waltz, Tango" },
  { judgeNumber: 4, event: "Scores submitted", at: "2026-04-15T10:28:00", note: "Round 1 — Waltz, Tango" },
  { judgeNumber: 2, event: "Disconnected", at: "2026-04-15T10:15:00", note: "Device offline" },
  { judgeNumber: 5, event: "Disconnected", at: "2026-04-15T10:00:00", note: "No connection" },
];

// ── Main page ────────────────────────────────────────────────────────────────
export default function JudgesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
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
    mutationFn: () => judgeTokensApi.create(id, parseInt(count) || 1),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["judge-tokens", id] });
      setCreateOpen(false);
      toast({ title: `${count} tokenů porotců vytvořeno`, variant: "success" } as Parameters<typeof toast>[0]);
    },
  });

  const revokeToken = useMutation({
    mutationFn: (tokenId: string) => judgeTokensApi.revoke(id, tokenId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["judge-tokens", id] }),
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

  // Print view
  if (printMode) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">QR kódy porotců</h1>
          <p className="text-sm text-gray-500">Soutěž ID: {id}</p>
        </div>
        <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
          {activeTokens.map((t) => (
            <JudgeQRCard key={t.id} token={t} judgeUrl={judgeBaseUrl} />
          ))}
        </div>
        <div className="mt-6 flex justify-center print:hidden">
          <Button variant="outline" onClick={() => setPrintMode(false)}>
            <X className="h-4 w-4" /> Zpět
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
                Fallback scoring
              </Button>
              <Button size="sm" variant="outline" onClick={handlePrintAll}>
                <Printer className="h-4 w-4" />
                Tisknout QR kódy
              </Button>
            </>
          )}
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Vytvořit tokeny
          </Button>
        </div>
      }
    >
      <PageHeader
        title="Tokeny porotců"
        description="Sdílejte QR kódy s porotci. Po naskenování se přihlásí bez registrace."
      />

      {/* Tokens table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Porotce</TableHead>
              <TableHead>Token</TableHead>
              <TableHead>PIN</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-36">Akce</TableHead>
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
            {tokens?.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-bold">#{t.judgeNumber}</TableCell>
                <TableCell>
                  <code className="rounded bg-[var(--surface-secondary)] px-2 py-0.5 text-xs">
                    {t.token.slice(0, 16)}…
                  </code>
                </TableCell>
                <TableCell>
                  <PinCell pin={(t as JudgeTokenDto & { pin?: string }).pin} />
                </TableCell>
                <TableCell>
                  <Badge variant={t.active ? "success" : "secondary"}>
                    {t.active ? "Aktivní" : "Zrušen"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="Zobrazit QR kód"
                      onClick={() => setQrToken(t)}
                    >
                      <QrCode className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="Kopírovat odkaz"
                      onClick={() => {
                        navigator.clipboard.writeText(`${judgeBaseUrl}/${t.token}`);
                        toast({ title: "Odkaz zkopírován" } as Parameters<typeof toast>[0]);
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="Zrušit token"
                      className="text-[var(--text-tertiary)] hover:text-[var(--destructive)]"
                      onClick={() => revokeToken.mutate(t.id)}
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
                  Žádné tokeny. Vytvořte tokeny pro porotce.
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
            Náhled QR kódů ({activeTokens.length} aktivních)
          </p>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {activeTokens.map((t) => (
              <button
                key={t.id}
                onClick={() => setQrToken(t)}
                className="flex flex-col items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-center transition-all hover:border-[var(--accent)]/40 hover:shadow-md"
              >
                <p className="text-xs font-semibold text-[var(--text-secondary)]">
                  Porotce #{t.judgeNumber}
                </p>
                <QRCanvas url={`${judgeBaseUrl}/${t.token}`} size={100} />
                <p className="text-xs text-[var(--text-tertiary)]">Kliknutím zvětšit</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Judge activity log */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Judge activity log</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Judge</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_ACTIVITY.sort(
                (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
              ).map((entry, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">Judge #{entry.judgeNumber}</TableCell>
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
        </Card>
      </div>

      {/* QR detail modal */}
      {qrToken && (
        <QRModal token={qrToken} judgeUrl={judgeBaseUrl} onClose={() => setQrToken(null)} />
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
            <DialogTitle>Vytvořit tokeny porotců</DialogTitle>
          </DialogHeader>
          <Input
            label="Počet porotců"
            type="number"
            min={1}
            max={20}
            value={count}
            onChange={(e) => setCount(e.target.value)}
          />
          <p className="text-xs text-[var(--text-secondary)]">
            Každý porotce dostane unikátní odkaz + QR kód. Po naskenování se přihlásí bez registrace.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Zrušit
            </Button>
            <Button onClick={() => createTokens.mutate()} loading={createTokens.isPending}>
              Vytvořit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
