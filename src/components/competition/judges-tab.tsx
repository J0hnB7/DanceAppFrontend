"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Copy, Plus, Trash2, Download, Printer, QrCode, X, ClipboardList, Eye, EyeOff, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { judgeTokensApi, type JudgeTokenDto, type JudgeTokenCreatedResponse } from "@/lib/api/judge-tokens";
import { judgeCredentialsCache } from "@/lib/judge-credentials-cache";
import { liveApi } from "@/lib/api/live";
import { useLiveStore } from "@/store/live-store";
import { useSSE } from "@/hooks/use-sse";
import { toast } from "@/hooks/use-toast";
import QRCode from "qrcode";
import { useLocale } from "@/contexts/locale-context";

function QRCanvas({ url, size = 140 }: { url: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, url, {
      width: size, margin: 1, color: { dark: "#000000", light: "#ffffff" },
    });
  }, [url, size]);
  return <canvas ref={canvasRef} width={size} height={size} className="rounded" />;
}

// Resolve raw token from session cache (CRIT-2 — backend no longer returns plaintext
// on list endpoints). Returns null if creds not captured this session → admin must
// revoke + reissue to get new QR.
function resolveJudgeUrl(judgeUrl: string, token: JudgeTokenDto): string | null {
  const creds = judgeCredentialsCache.get(token.id);
  if (creds?.rawToken) return `${judgeUrl}/${creds.rawToken}`;
  // Legacy mock fallback (MSW dev only). Production tok.token is always undefined.
  if (token.token) return `${judgeUrl}/${token.token}`;
  return null;
}

function JudgeQRCard({ token, judgeUrl }: { token: JudgeTokenDto; judgeUrl: string }) {
  const url = resolveJudgeUrl(judgeUrl, token);
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center print:break-inside-avoid">
      <p className="text-lg font-bold text-[var(--text-primary)]">#{token.judgeNumber}</p>
      {token.name && <p className="text-sm text-[var(--text-secondary)]">{token.name}</p>}
      {url ? (
        <>
          <QRCanvas url={url} size={160} />
          <p className="text-xs text-[var(--text-tertiary)] break-all">{url}</p>
        </>
      ) : (
        <div className="rounded-lg bg-[var(--warning)]/10 px-3 py-2 text-xs text-[var(--warning)]">
          QR nedostupné — vystavte nový token
        </div>
      )}
    </div>
  );
}

function QRModal({ token, judgeUrl, onClose }: { token: JudgeTokenDto; judgeUrl: string; onClose: () => void }) {
  const { t } = useLocale();
  const url = resolveJudgeUrl(judgeUrl, token);
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
          <DialogTitle>{t("judges.qrTitle", { number: String(token.judgeNumber) })}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          {url ? (
            <>
              <QRCanvas url={url} size={220} />
              <div className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)] px-4 py-3 text-center">
                <p className="mb-1 text-xs text-[var(--text-tertiary)]">{t("judges.judgeLink")}</p>
                <code className="break-all text-xs">{url}</code>
              </div>
              <div className="flex w-full gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { navigator.clipboard.writeText(url); toast({ title: t("judges.linkCopied") }); }}>
                  <Copy className="h-4 w-4" /> {t("common.copy")}
                </Button>
                <Button className="flex-1" onClick={handleDownload}>
                  <Download className="h-4 w-4" /> {t("judges.downloadPng")}
                </Button>
              </div>
            </>
          ) : (
            <div className="rounded-lg bg-[var(--warning)]/10 px-4 py-3 text-center text-sm text-[var(--warning)]">
              QR kód není dostupný — vystavte nový token a okamžitě jej zachyťte.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FallbackScoringModal({ tokens, onClose }: { tokens: JudgeTokenDto[]; onClose: () => void }) {
  const { t } = useLocale();
  const [selectedJudge, setSelectedJudge] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const activeTokens = tokens.filter((tok) => tok.active);
  const handleSubmit = async () => {
    if (!selectedJudge) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    toast({ title: t("common.success"), variant: "success" });
    onClose();
  };
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" /> {t("judges.fallbackScoring")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Select value={selectedJudge} onValueChange={setSelectedJudge}>
            <SelectTrigger><SelectValue placeholder={t("judges.fallbackDialog.selectJudge")} /></SelectTrigger>
            <SelectContent>
              {activeTokens.map((tok) => (
                <SelectItem key={tok.id} value={tok.id}>{t("judges.judgeNumber", { number: String(tok.judgeNumber) })}{tok.name ? ` — ${tok.name}` : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input label={t("judges.fallbackDialog.reasonLabel")} placeholder={t("judges.fallbackDialog.reasonPlaceholder")} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
          <Button disabled={!selectedJudge} loading={saving} onClick={handleSubmit}>{t("common.confirm")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PinCell({ pin }: { pin?: string }) {
  const [visible, setVisible] = useState(true);
  if (!pin) return <span className="text-[var(--text-tertiary)]">—</span>;
  return (
    <div className="flex items-center gap-1">
      <code className="rounded bg-[var(--surface-secondary)] px-2 py-0.5 text-xs">{visible ? pin : "••••"}</code>
      <button onClick={() => setVisible((v) => !v)} className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
        {visible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
      </button>
    </div>
  );
}

function OnlineDot({ online }: { online: boolean }) {
  return (
    <div
      className={`h-2 w-2 rounded-full ${online ? "animate-pulse" : ""}`}
      style={{ background: online ? "var(--success)" : "var(--text-tertiary)" }}
      title={online ? "Online" : "Offline"}
    />
  );
}

function NewTokensDialog({ tokens, judgeBaseUrl, onClose }: {
  tokens: JudgeTokenCreatedResponse[];
  judgeBaseUrl: string;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const [visiblePins, setVisiblePins] = useState<Record<number, boolean>>({});

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("judges.newTokensDialog.title")}</DialogTitle>
        </DialogHeader>
        <div className="rounded-lg border border-[var(--warning)]/40 bg-[var(--warning)]/10 px-4 py-3 text-sm text-[var(--warning)]">
          {t("judges.newTokensDialog.warning")}
        </div>
        <div className="space-y-3">
          {tokens.map((tok, idx) => {
            const url = `${judgeBaseUrl}/${tok.rawToken}`;
            const pinVisible = visiblePins[idx] ?? true;
            return (
              <div key={tok.id} className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <QRCanvas url={url} size={80} />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <p className="font-semibold text-sm text-[var(--text-primary)]">
                    {t("judges.judgeNumber", { number: String(tok.judgeNumber ?? idx + 1) })}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-tertiary)]">PIN:</span>
                    <code className="rounded bg-[var(--surface-secondary)] px-2 py-0.5 text-sm font-bold tracking-widest">
                      {pinVisible ? tok.pin : "••••"}
                    </code>
                    <button
                      onClick={() => setVisiblePins((p) => ({ ...p, [idx]: !pinVisible }))}
                      className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                    >
                      {pinVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-tertiary)] truncate max-w-[260px]">{url}</span>
                    <button
                      onClick={() => { navigator.clipboard.writeText(url); toast({ title: t("judges.linkCopied") }); }}
                      className="shrink-0 text-[var(--text-tertiary)] hover:text-[var(--accent)]"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button onClick={onClose}>{t("common.close")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function JudgesTab({ competitionId }: { competitionId: string }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [count, setCount] = useState("5");
  const [qrToken, setQrToken] = useState<JudgeTokenDto | null>(null);
  const [newTokens, setNewTokens] = useState<JudgeTokenCreatedResponse[]>([]);
  const [printMode, setPrintMode] = useState(false);
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, { name: string; country: string }>>({});
  const [revokeConfirmId, setRevokeConfirmId] = useState<string | null>(null);
  const printTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const qc = useQueryClient();
  const { t } = useLocale();

  useEffect(() => {
    return () => {
      if (printTimerRef.current !== null) {
        clearTimeout(printTimerRef.current);
      }
    };
  }, []);

  const judgeBaseUrl = typeof window !== "undefined" ? `${window.location.origin}/judge` : "/judge";

  const { data: tokens, isLoading } = useQuery({
    queryKey: ["judge-tokens", competitionId],
    queryFn: () => judgeTokensApi.list(competitionId),
  });

  useEffect(() => {
    if (tokens) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditValues((prev) => {
        const next = { ...prev };
        for (const tok of tokens) {
          if (!next[tok.id]) next[tok.id] = { name: tok.name ?? "", country: tok.country ?? "" };
        }
        return next;
      });
    }
  }, [tokens]);

  const createTokens = useMutation({
    mutationFn: async () => {
      const n = parseInt(count) || 1;
      const existingMax = tokens?.reduce((max, tok) => Math.max(max, tok.judgeNumber ?? 0), 0) ?? 0;
      const results: JudgeTokenCreatedResponse[] = [];
      for (let i = 1; i <= n; i++) {
        const created = await judgeTokensApi.create(competitionId, { judgeNumber: existingMax + i, role: "JUDGE" });
        results.push(created);
      }
      return results;
    },
    onSuccess: (results) => {
      // Persist the just-returned plaintext credentials in session cache so QR cards,
      // copy-link buttons, and the table row keep showing them until reload.
      results.forEach((r) =>
        judgeCredentialsCache.set(r.id, { rawToken: r.rawToken, rawPin: r.pin })
      );
      qc.invalidateQueries({ queryKey: ["judge-tokens", competitionId] });
      setCreateOpen(false);
      setNewTokens(results);
    },
  });

  const revokeToken = useMutation({
    mutationFn: (tokenId: string) => judgeTokensApi.deletePermanent(competitionId, tokenId),
    onSuccess: (_data, tokenId) => {
      // Drop cached creds for the revoked token (no point keeping them).
      judgeCredentialsCache.delete(tokenId);
      qc.invalidateQueries({ queryKey: ["judge-tokens", competitionId] });
      setRevokeConfirmId(null);
      toast({ title: t("judges.tokenDeleted"), variant: "success" });
    },
    onError: () => {
      toast({ title: t("common.error"), variant: "destructive" });
      setRevokeConfirmId(null);
    },
  });

  const updateToken = useMutation({
    mutationFn: ({ id, name, country }: { id: string; name: string; country: string }) =>
      judgeTokensApi.update(competitionId, id, { name, country }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["judge-tokens", competitionId] });
    },
  });

  const getEditVal = useCallback((tok: JudgeTokenDto) => {
    return editValues[tok.id] ?? { name: tok.name ?? "", country: tok.country ?? "" };
  }, [editValues]);

  const handleBlurSave = useCallback((tok: JudgeTokenDto, name: string, country: string) => {
    const orig = { name: tok.name ?? "", country: tok.country ?? "" };
    if (name !== orig.name || country !== orig.country) {
      updateToken.mutate({ id: tok.id, name, country });
    }
  }, [updateToken]);

  const handlePrintAll = () => {
    setPrintMode(true);
    printTimerRef.current = setTimeout(() => {
      printTimerRef.current = null;
      window.print();
    }, 300);
    const afterPrint = () => { setPrintMode(false); window.removeEventListener("afterprint", afterPrint); };
    window.addEventListener("afterprint", afterPrint);
  };

  // SSE: track online/status per judge
  const { judgeStatuses, updateJudgeStatus, selectedHeatId } = useLiveStore();

  useSSE(competitionId, "judge:status-changed", (data: { judgeId: string; status: string }) => {
    updateJudgeStatus(data.judgeId, data.status as Parameters<typeof updateJudgeStatus>[1]);
  });

  const handlePing = useCallback(async (judgeId: string) => {
    try {
      await liveApi.pingJudge(judgeId);
      toast({ title: "Ping odeslán porotci" });
    } catch {
      toast({ title: "Ping se nezdařil", variant: "destructive" });
    }
  }, []);

  const activeTokens = tokens?.filter((tok) => tok.active) ?? [];

  if (printMode) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">{t("judges.qrCodes")}</h1>
        </div>
        <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
          {activeTokens.map((tok) => <JudgeQRCard key={tok.id} token={tok} judgeUrl={judgeBaseUrl} />)}
        </div>
        <div className="mt-6 flex justify-center print:hidden">
          <Button variant="outline" onClick={() => setPrintMode(false)}><X className="h-4 w-4" /> {t("common.back")}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Actions bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[var(--text-secondary)]">{t("judges.title")}</p>
        <div className="flex items-center gap-2">
          {activeTokens.length > 0 && (
            <>
              <Button size="sm" variant="outline" onClick={() => setFallbackOpen(true)}>
                <ClipboardList className="h-4 w-4" /> {t("judges.fallbackScoring")}
              </Button>
              <Button size="sm" variant="outline" onClick={handlePrintAll}>
                <Printer className="h-4 w-4" /> {t("judges.printQr")}
              </Button>
            </>
          )}
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> {t("judges.createTokens")}
          </Button>
        </div>
      </div>

      {/* Tokens table */}
      <Card>
        <Table className="table-fixed">
          <colgroup>
            {/* Porotce */}<col style={{ width: "6%" }} />
            {/* Jméno */}<col style={{ width: "14%" }} />
            {/* Země */}<col style={{ width: "7%" }} />
            {/* Token */}<col style={{ width: "18%" }} />
            {/* PIN */}<col style={{ width: "10%" }} />
            {/* Status */}<col style={{ width: "10%" }} />
            {/* Online */}<col style={{ width: "7%" }} />
            {/* Akce */}<col style={{ width: "10%" }} />
          </colgroup>
          <TableHeader>
            <TableRow>
              <TableHead>{t("judges.table.judge")}</TableHead>
              <TableHead>Jméno</TableHead>
              <TableHead>Země</TableHead>
              <TableHead>{t("judges.table.token")}</TableHead>
              <TableHead>{t("judgesActivity.pin")}</TableHead>
              <TableHead>{t("judges.table.status")}</TableHead>
              <TableHead>Online</TableHead>
              <TableHead>{t("judges.table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
            ))}
            {tokens?.map((tok) => (
              <TableRow key={tok.id}>
                <TableCell className="font-bold">#{tok.judgeNumber}</TableCell>
                <TableCell>
                  <input
                    className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 text-xs focus:border-[var(--accent)] focus:outline-none"
                    placeholder="Jméno"
                    value={getEditVal(tok).name}
                    onChange={(e) => setEditValues((prev) => ({ ...prev, [tok.id]: { ...getEditVal(tok), name: e.target.value } }))}
                    onBlur={(e) => handleBlurSave(tok, e.target.value, getEditVal(tok).country)}
                  />
                </TableCell>
                <TableCell>
                  <input
                    className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 text-xs uppercase focus:border-[var(--accent)] focus:outline-none"
                    placeholder="CZE"
                    maxLength={3}
                    value={getEditVal(tok).country}
                    onChange={(e) => setEditValues((prev) => ({ ...prev, [tok.id]: { ...getEditVal(tok), country: e.target.value.toUpperCase() } }))}
                    onBlur={(e) => handleBlurSave(tok, getEditVal(tok).name, e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  {(() => {
                    const cached = judgeCredentialsCache.get(tok.id);
                    const raw = cached?.rawToken ?? tok.token ?? "";
                    return raw
                      ? <code className="rounded bg-[var(--surface-secondary)] px-2 py-0.5 text-xs">{raw.slice(0, 16)}…</code>
                      : <span className="text-xs text-[var(--text-tertiary)]">—</span>;
                  })()}
                </TableCell>
                <TableCell><PinCell pin={judgeCredentialsCache.get(tok.id)?.rawPin ?? tok.pin} /></TableCell>
                <TableCell><Badge variant={tok.active ? "success" : "secondary"}>{tok.active ? t("judges.active") : t("judges.revoked")}</Badge></TableCell>
                <TableCell>
                  <div className="flex items-center justify-center">
                    <OnlineDot online={tok.connected ?? false} />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => setQrToken(tok)}><QrCode className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => {
                      const url = resolveJudgeUrl(judgeBaseUrl, tok);
                      if (!url) {
                        toast({ title: "Token nedostupný — vystavte nový", variant: "destructive" });
                        return;
                      }
                      navigator.clipboard.writeText(url);
                      toast({ title: t("judges.linkCopied") });
                    }}><Copy className="h-3.5 w-3.5" /></Button>
                    {/* Ping — only when live heat is active and judge is pending/scoring */}
                    {selectedHeatId && tok.id && (() => {
                      const status = judgeStatuses[tok.id];
                      if (status === "pending" || status === "scoring") {
                        return (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="Ping porotce"
                            onClick={() => handlePing(tok.id)}
                          >
                            <Bell className="h-3.5 w-3.5" />
                          </Button>
                        );
                      }
                      return null;
                    })()}
                    <Button variant="ghost" size="icon-sm" className="text-[var(--text-tertiary)] hover:text-[var(--destructive)]" onClick={() => setRevokeConfirmId(tok.id)} disabled={revokeToken.isPending}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && !tokens?.length && (
              <TableRow><TableCell colSpan={7} className="py-12 text-center text-[var(--text-secondary)]">{t("judges.noTokens")}</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* QR preview */}
      {activeTokens.length > 0 && (
        <div>
          <p className="mb-3 text-sm font-medium text-[var(--text-secondary)]">{t("judges.qrPreview", { count: String(activeTokens.length) })}</p>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {activeTokens.map((tok) => (
              <button key={tok.id} onClick={() => setQrToken(tok)} className="flex flex-col items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-center transition-all hover:border-[var(--accent)]/40 hover:shadow-md">
                <p className="text-xs font-semibold text-[var(--text-secondary)]">#{tok.judgeNumber}</p>
                {(() => {
                  const url = resolveJudgeUrl(judgeBaseUrl, tok);
                  return url
                    ? <QRCanvas url={url} size={100} />
                    : <div className="flex h-[100px] w-[100px] items-center justify-center rounded bg-[var(--warning)]/10 px-2 text-[10px] text-[var(--warning)]">QR nedost.</div>;
                })()}
                <p className="text-xs text-[var(--text-tertiary)]">{t("judges.clickToEnlarge")}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {newTokens.length > 0 && (
        <NewTokensDialog tokens={newTokens} judgeBaseUrl={judgeBaseUrl} onClose={() => setNewTokens([])} />
      )}
      {qrToken && <QRModal token={qrToken} judgeUrl={judgeBaseUrl} onClose={() => setQrToken(null)} />}
      {fallbackOpen && <FallbackScoringModal tokens={tokens ?? []} onClose={() => setFallbackOpen(false)} />}

      <Dialog open={revokeConfirmId !== null} onOpenChange={(v) => { if (!v) setRevokeConfirmId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t("judges.deleteConfirm.title")}</DialogTitle></DialogHeader>
          <p className="text-sm text-[var(--text-secondary)]">{t("judges.deleteConfirm.description")}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeConfirmId(null)}>{t("common.cancel")}</Button>
            <Button variant="destructive" loading={revokeToken.isPending} onClick={() => revokeConfirmId && revokeToken.mutate(revokeConfirmId)}>
              {t("judges.deleteConfirm.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t("judges.createDialog.title")}</DialogTitle></DialogHeader>
          <Input label={t("judges.createDialog.countLabel")} type="number" min={1} max={20} value={count} onChange={(e) => setCount(e.target.value)} />
          <p className="text-xs text-[var(--text-secondary)]">{t("judges.createDialog.description")}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={() => createTokens.mutate()} loading={createTokens.isPending}>{t("common.create")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
