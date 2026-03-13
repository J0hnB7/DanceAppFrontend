"use client";

import { use, useState, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus, Upload, Search, Trash2, ToggleLeft, ToggleRight,
  Users, CreditCard, Clock, QrCode, Copy, Check, Mail,
  FileText, Download, Printer, Info, X, CheckCircle,
  AlertCircle,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePairs, useCreatePair, useDeletePair, useImportPairs } from "@/hooks/queries/use-pairs";
import { useSections } from "@/hooks/queries/use-sections";
import { competitionsApi } from "@/lib/api/competitions";
import { pairsApi } from "@/lib/api/pairs";
import type { PairDto, RegistrationStatus } from "@/lib/api/pairs";
import apiClient from "@/lib/api-client";
import { toast } from "@/hooks/use-toast";

const addPairSchema = z.object({
  sectionId: z.string().min(1, "Required"),
  startNumber: z.string().optional(),
  dancer1FirstName: z.string().min(1, "Required"),
  dancer1LastName: z.string().min(1, "Required"),
  dancer1Club: z.string().optional(),
  dancer2FirstName: z.string().optional(),
  dancer2LastName: z.string().optional(),
  dancer2Club: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  markAsPaid: z.boolean().optional(),
});
type AddPairForm = z.infer<typeof addPairSchema>;

const REG_STATUS_CONFIG: Record<RegistrationStatus, {
  label: string;
  next: RegistrationStatus;
  variant: "secondary" | "success" | "destructive";
  icon: React.ElementType;
}> = {
  UNCONFIRMED: { label: "Nepotvrzeno", next: "CONFIRMED", variant: "secondary", icon: AlertCircle },
  CONFIRMED: { label: "Potvrzeno", next: "CANCELLED", variant: "success", icon: CheckCircle },
  CANCELLED: { label: "Zrušeno", next: "UNCONFIRMED", variant: "destructive", icon: X },
};

// ── RegistrationStats ─────────────────────────────────────────────────────────
function RegistrationStats({ total, paid, pending, maxPairs }: {
  total: number; paid: number; pending: number; maxPairs?: number;
}) {
  const capacityPct = maxPairs ? Math.min(100, Math.round((total / maxPairs) * 100)) : null;
  const spotsLeft = maxPairs ? maxPairs - total : null;

  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <Users className="h-4 w-4" /> Celkem registrováno
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{total}</p>
          {maxPairs && <p className="text-xs text-[var(--text-tertiary)]">z {maxPairs} max</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <CreditCard className="h-4 w-4" /> Potvrzeno / Zaplaceno
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{paid}</p>
          <p className="text-xs text-[var(--text-tertiary)]">
            {total > 0 ? Math.round((paid / total) * 100) : 0}% z celku
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <Clock className="h-4 w-4" /> Čeká na platbu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{pending}</p>
        </CardContent>
      </Card>
      {maxPairs && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-[var(--text-secondary)]">Kapacita</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <p className="text-2xl font-bold">{capacityPct}%</p>
              {spotsLeft !== null && spotsLeft > 0 && (
                <p className="mb-0.5 text-xs text-[var(--text-tertiary)]">{spotsLeft} volných</p>
              )}
            </div>
            <Progress value={capacityPct ?? 0} className="mt-2 h-1.5" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── NoteCell ──────────────────────────────────────────────────────────────────
function NoteCell({ pair, competitionId }: { pair: PairDto; competitionId: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(pair.adminNote ?? "");
  const qc = useQueryClient();

  const save = useMutation({
    mutationFn: (note: string) => pairsApi.setNote(competitionId, pair.id, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pairs", competitionId] });
      setEditing(false);
      toast({ title: "Poznámka uložena", variant: "success" } as Parameters<typeof toast>[0]);
    },
  });

  if (editing) {
    return (
      <div className="flex flex-col gap-1 min-w-[160px]">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="h-16 text-xs"
          autoFocus
        />
        <div className="flex gap-1">
          <Button size="icon-sm" variant="outline" onClick={() => setEditing(false)}>
            <X className="h-3 w-3" />
          </Button>
          <Button size="icon-sm" onClick={() => save.mutate(draft)} loading={save.isPending}>
            <Check className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <button
      className="flex items-center gap-1 text-xs text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors"
      onClick={() => { setDraft(pair.adminNote ?? ""); setEditing(true); }}
      title={pair.adminNote ?? "Přidat poznámku"}
    >
      <FileText className="h-3.5 w-3.5 shrink-0" />
      {pair.adminNote ? (
        <span className="max-w-[100px] truncate text-[var(--text-secondary)]">{pair.adminNote}</span>
      ) : (
        <span className="italic">poznámka</span>
      )}
    </button>
  );
}

// ── ContactModal ──────────────────────────────────────────────────────────────
function ContactModal({ pair, onClose }: { pair: PairDto; onClose: () => void }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const send = useMutation({
    mutationFn: () => pairsApi.contactEmail(pair.competitionId, pair.id, { subject, message }),
    onSuccess: () => {
      toast({ title: "Email odeslán", variant: "success" } as Parameters<typeof toast>[0]);
      onClose();
    },
  });

  const pairName = `${pair.dancer1FirstName} ${pair.dancer1LastName}${pair.dancer2FirstName ? ` – ${pair.dancer2FirstName} ${pair.dancer2LastName}` : ""}`;

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-[var(--accent)]" />
            Kontaktovat pár
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <p className="mb-1 text-xs text-[var(--text-secondary)]">Komu</p>
            <p className="rounded border border-[var(--border)] bg-[var(--surface-secondary)] px-3 py-2 text-sm">
              {pairName}
              {pair.email && <span className="ml-2 text-xs text-[var(--text-tertiary)]">({pair.email})</span>}
            </p>
          </div>
          <Input
            label="Předmět"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Předmět emailu..."
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium">Zpráva</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Text zprávy..."
              className="h-28"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Zrušit</Button>
          <Button
            onClick={() => send.mutate()}
            loading={send.isPending}
            disabled={!subject || !message}
          >
            <Mail className="h-4 w-4" />
            Odeslat email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Excel export ──────────────────────────────────────────────────────────────
function exportToExcel(pairs: PairDto[], sections: { id: string; name: string }[]) {
  const rows = [
    ["#", "Tanečník 1", "Tanečník 2", "Klub 1", "Klub 2", "Sekce", "Email", "Status registrace", "Platba", "Registrován"],
    ...pairs.map((p) => [
      String(p.startNumber).padStart(3, "0"),
      `${p.dancer1FirstName} ${p.dancer1LastName}`,
      p.dancer2FirstName ? `${p.dancer2FirstName} ${p.dancer2LastName}` : "",
      p.dancer1Club ?? "",
      p.dancer2Club ?? "",
      sections.find((s) => s.id === p.sectionId)?.name ?? p.sectionId,
      p.email ?? "",
      p.registrationStatus,
      p.paymentStatus,
      new Date(p.registeredAt).toLocaleDateString("cs-CZ"),
    ]),
  ];

  const tsv = rows.map((r) => r.join("\t")).join("\n");
  const blob = new Blob(["\uFEFF" + tsv], { type: "text/tab-separated-values;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "registrations.xls";
  a.click();
  URL.revokeObjectURL(url);
}

// ── PDF start numbers ─────────────────────────────────────────────────────────
function printStartNumbers(pairs: PairDto[], competitionName: string, sections: { id: string; name: string }[]) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Startovní čísla</title>
  <style>
    @page { size: A4; margin: 10mm; }
    body { font-family: Arial, sans-serif; margin: 0; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; }
    .card { border: 3px solid #000; border-radius: 8px; padding: 8mm; text-align: center; page-break-inside: avoid; }
    .number { font-size: 72pt; font-weight: 900; line-height: 1; }
    .name { font-size: 12pt; font-weight: bold; margin-top: 4mm; }
    .club { font-size: 9pt; color: #555; }
    .section { font-size: 9pt; margin-top: 2mm; color: #333; }
    .comp { font-size: 8pt; color: #888; margin-top: 1mm; }
  </style></head><body>
  <div class="grid">
  ${pairs.map((p) => {
    const sectionName = sections.find((s) => s.id === p.sectionId)?.name ?? "";
    const name = `${p.dancer1FirstName} ${p.dancer1LastName}${p.dancer2FirstName ? ` / ${p.dancer2FirstName} ${p.dancer2LastName}` : ""}`;
    const club = [p.dancer1Club, p.dancer2Club].filter(Boolean).join(", ");
    return `<div class="card">
      <div class="number">${String(p.startNumber).padStart(3, "0")}</div>
      <div class="name">${name}</div>
      ${club ? `<div class="club">${club}</div>` : ""}
      <div class="section">${sectionName}</div>
      <div class="comp">${competitionName}</div>
    </div>`;
  }).join("")}
  </div></body></html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.print();
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PairsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toggleConfirmOpen, setToggleConfirmOpen] = useState(false);
  const [checkinDialogOpen, setCheckinDialogOpen] = useState(false);
  const [checkinToken, setCheckinToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [contactPair, setContactPair] = useState<PairDto | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const { data: pairs, isLoading } = usePairs(id);
  const { data: sections } = useSections(id);
  const { data: competition } = useQuery({
    queryKey: ["competitions", "detail", id],
    queryFn: () => competitionsApi.get(id),
  });
  const createPair = useCreatePair(id);
  const deletePair = useDeletePair(id);
  const importPairs = useImportPairs(id);

  const generateCheckinLink = useMutation({
    mutationFn: () =>
      apiClient.post<{ token: string }>(`/competitions/${id}/checkin-token`).then((r) => r.data.token),
    onSuccess: (token) => {
      setCheckinToken(token);
      setCheckinDialogOpen(true);
    },
  });

  const cycleStatus = useMutation({
    mutationFn: ({ pairId, status }: { pairId: string; status: RegistrationStatus }) =>
      pairsApi.setRegistrationStatus(id, pairId, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pairs", id] }),
  });

  const checkinUrl = checkinToken
    ? (typeof window !== "undefined" ? window.location.origin : "") + `/checkin/${checkinToken}`
    : "";

  const handleCopy = () => {
    if (!checkinUrl) return;
    navigator.clipboard.writeText(checkinUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const toggleRegistration = useMutation({
    mutationFn: () => {
      if (competition?.status === "REGISTRATION_OPEN") {
        return competitionsApi.update(id, { status: "PUBLISHED" });
      }
      return competitionsApi.openRegistration(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["competitions", "detail", id] });
      setToggleConfirmOpen(false);
      toast({
        title: competition?.status === "REGISTRATION_OPEN" ? "Registrace uzavřena" : "Registrace otevřena",
        variant: "success",
      } as Parameters<typeof toast>[0]);
    },
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddPairForm>({ resolver: zodResolver(addPairSchema) });

  const confirmedCount = pairs?.filter((p) => p.registrationStatus === "CONFIRMED").length ?? 0;
  const pendingCount = pairs?.filter((p) => p.registrationStatus === "UNCONFIRMED").length ?? 0;
  const total = pairs?.length ?? 0;

  const filtered = (pairs ?? []).filter((p) => {
    const matchesSearch = (() => {
      const q = search.toLowerCase();
      return (
        `${p.dancer1FirstName} ${p.dancer1LastName}`.toLowerCase().includes(q) ||
        String(p.startNumber).includes(q) ||
        (p.dancer2FirstName ?? "").toLowerCase().includes(q)
      );
    })();
    const matchesSection = sectionFilter === "all" || p.sectionId === sectionFilter;
    return matchesSearch && matchesSection;
  });

  const onSubmit = async (values: AddPairForm) => {
    await createPair.mutateAsync({
      sectionId: values.sectionId,
      startNumber: values.startNumber ? Number(values.startNumber) : undefined,
      dancer1FirstName: values.dancer1FirstName,
      dancer1LastName: values.dancer1LastName,
      dancer1Club: values.dancer1Club,
      dancer2FirstName: values.dancer2FirstName,
      dancer2LastName: values.dancer2LastName,
      dancer2Club: values.dancer2Club,
    });
    toast({ title: "Pár přidán", variant: "success" } as Parameters<typeof toast>[0]);
    reset();
    setDialogOpen(false);
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await importPairs.mutateAsync(file);
    toast({
      title: `Importováno ${result.imported} párů`,
      description: result.errors.length ? `${result.errors.length} chyb` : undefined,
      variant: result.errors.length ? "warning" : "success",
    } as Parameters<typeof toast>[0]);
    e.target.value = "";
  };

  const isRegistrationOpen = competition?.status === "REGISTRATION_OPEN";

  return (
    <AppShell
      headerActions={
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            className={isRegistrationOpen ? "border-[var(--success)]/40 text-[var(--success)]" : ""}
            onClick={() => setToggleConfirmOpen(true)}
          >
            {isRegistrationOpen ? (
              <><ToggleRight className="h-4 w-4" />Registrace: Otevřená</>
            ) : (
              <><ToggleLeft className="h-4 w-4" />Registrace: Uzavřená</>
            )}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => generateCheckinLink.mutate()}
            loading={generateCheckinLink.isPending}
          >
            <QrCode className="h-4 w-4" />
            Check-in odkaz
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => exportToExcel(pairs ?? [], sections ?? [])}
            disabled={!pairs?.length}
          >
            <Download className="h-4 w-4" />
            Excel
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => printStartNumbers(pairs ?? [], competition?.name ?? "", sections ?? [])}
            disabled={!pairs?.length}
          >
            <Printer className="h-4 w-4" />
            Startovní čísla
          </Button>

          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileImport} />
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} loading={importPairs.isPending}>
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Přidat pár
          </Button>
        </div>
      }
    >
      <PageHeader title="Páry" description={`${total} párů registrováno`} />

      <RegistrationStats
        total={total}
        paid={confirmedCount}
        pending={pendingCount}
        maxPairs={competition?.maxPairs}
      />

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <Input
          placeholder="Hledat jménem nebo startovním číslem..."
          leftIcon={<Search className="h-4 w-4" />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={sectionFilter} onValueChange={setSectionFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Všechny sekce" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny sekce</SelectItem>
            {sections?.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">#</TableHead>
              <TableHead>Tanečník 1</TableHead>
              <TableHead>Tanečník 2</TableHead>
              <TableHead>Sekce</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Poznámka</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))}
            {!isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-[var(--text-secondary)]">
                  {search || sectionFilter !== "all" ? "Žádné páry neodpovídají filtru" : "Žádné páry zatím neregistrovány"}
                </TableCell>
              </TableRow>
            )}
            {filtered.map((pair) => {
              const section = sections?.find((s) => s.id === pair.sectionId);
              const regStatus = pair.registrationStatus ?? "UNCONFIRMED";
              const statusCfg = REG_STATUS_CONFIG[regStatus];
              return (
                <TableRow key={pair.id}>
                  <TableCell className="font-mono font-semibold">
                    {String(pair.startNumber).padStart(3, "0")}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">
                        {pair.dancer1FirstName} {pair.dancer1LastName}
                      </p>
                      {pair.dancer1Club && (
                        <p className="text-xs text-[var(--text-tertiary)]">{pair.dancer1Club}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {pair.dancer2FirstName && (
                      <div>
                        <p className="text-sm">{pair.dancer2FirstName} {pair.dancer2LastName}</p>
                        {pair.dancer2Club && (
                          <p className="text-xs text-[var(--text-tertiary)]">{pair.dancer2Club}</p>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {section?.name ?? pair.sectionId.slice(0, 8) + "…"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <button
                      className="group"
                      title={`Kliknutím změníš na: ${REG_STATUS_CONFIG[statusCfg.next].label}`}
                      onClick={() => cycleStatus.mutate({ pairId: pair.id, status: statusCfg.next })}
                      disabled={cycleStatus.isPending}
                    >
                      <Badge variant={statusCfg.variant} className="flex items-center gap-1 cursor-pointer group-hover:opacity-80 transition-opacity">
                        <statusCfg.icon className="h-3 w-3" />
                        {statusCfg.label}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell>
                    <NoteCell pair={pair} competitionId={id} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {pair.email && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-[var(--text-tertiary)] hover:text-[var(--accent)]"
                          onClick={() => setContactPair(pair)}
                          title="Kontaktovat emailem"
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                      )}
                      {!pair.email && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-[var(--text-tertiary)] hover:text-[var(--accent)]"
                          onClick={() => setContactPair(pair)}
                          title="Kontaktovat (bez emailu)"
                        >
                          <Mail className="h-4 w-4 opacity-40" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-[var(--text-tertiary)] hover:text-[var(--destructive)]"
                        onClick={() => { if (confirm("Smazat tento pár?")) deletePair.mutate(pair.id); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Contact modal */}
      {contactPair && (
        <ContactModal pair={contactPair} onClose={() => setContactPair(null)} />
      )}

      {/* Registration toggle confirm */}
      <Dialog open={toggleConfirmOpen} onOpenChange={setToggleConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {isRegistrationOpen ? "Uzavřít registraci?" : "Otevřít registraci?"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--text-secondary)]">
            {isRegistrationOpen
              ? "Páry se již nebudou moci registrovat. Registraci lze kdykoliv znovu otevřít."
              : "Páry se budou moci registrovat přes veřejný odkaz. Status soutěže bude změněn na Registrace otevřena."}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToggleConfirmOpen(false)}>Zrušit</Button>
            <Button onClick={() => toggleRegistration.mutate()} loading={toggleRegistration.isPending}>
              {isRegistrationOpen ? "Uzavřít" : "Otevřít"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Check-in link dialog */}
      <Dialog open={checkinDialogOpen} onOpenChange={setCheckinDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-[var(--accent)]" />
              Check-in odkaz pro vstup
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--text-secondary)]">
            Otevřete tento odkaz na telefonu nebo tabletu u vstupu.
          </p>
          <div className="flex items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-secondary)] px-3 py-2">
            <p className="flex-1 truncate font-mono text-xs text-[var(--text-primary)]">{checkinUrl}</p>
            <button
              onClick={handleCopy}
              className="shrink-0 rounded-md p-1 text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors"
            >
              {copied ? <Check className="h-4 w-4 text-[var(--success)]" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <DialogFooter>
            <Button onClick={() => setCheckinDialogOpen(false)}>Zavřít</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add pair dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Přidat pár ručně</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Sekce</label>
              <Controller
                control={control}
                name="sectionId"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger error={!!errors.sectionId}>
                      <SelectValue placeholder="Vyberte sekci..." />
                    </SelectTrigger>
                    <SelectContent>
                      {sections?.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <Input label="Startovní číslo (volitelné)" type="number" min={1} {...register("startNumber")} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Jméno tanečníka 1" error={errors.dancer1FirstName?.message} {...register("dancer1FirstName")} />
              <Input label="Příjmení tanečníka 1" error={errors.dancer1LastName?.message} {...register("dancer1LastName")} />
            </div>
            <Input label="Klub tanečníka 1 (volitelné)" {...register("dancer1Club")} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Jméno tanečníka 2" {...register("dancer2FirstName")} />
              <Input label="Příjmení tanečníka 2" {...register("dancer2LastName")} />
            </div>
            <Input label="Klub tanečníka 2 (volitelné)" {...register("dancer2Club")} />
            <Input label="Kontaktní email (volitelné)" type="email" {...register("email")} error={errors.email?.message} />
            <div className="flex items-center gap-2">
              <input type="checkbox" id="markAsPaid" className="h-4 w-4 rounded border-[var(--border)]" {...register("markAsPaid")} />
              <label htmlFor="markAsPaid" className="text-sm text-[var(--text-secondary)]">
                Označit jako potvrzeno/zaplaceno ihned
              </label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Zrušit</Button>
              <Button type="submit" loading={createPair.isPending}>Přidat pár</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
