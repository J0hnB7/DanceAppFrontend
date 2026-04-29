"use client";

import React, { use, useState, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus, Upload, Search, Trash2, ToggleLeft, ToggleRight,
  Users, CreditCard, Clock, QrCode, Copy, Check, Mail,
  FileText, Download, Printer, Info, X, CheckCircle,
  AlertCircle, Sheet,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { CompetitionSidebar } from "@/components/layout/competition-sidebar";
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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { usePairs, useCreatePair, useDeletePair, useImportPairs, useRemovePairFromSection } from "@/hooks/queries/use-pairs";
import { useSections } from "@/hooks/queries/use-sections";
import { competitionsApi } from "@/lib/api/competitions";
import { pairsApi } from "@/lib/api/pairs";
import type { PairDto, RegistrationStatus } from "@/lib/api/pairs";

type PaymentStatus = "PENDING" | "PAID" | "WAIVED";
import apiClient from "@/lib/api-client";
import { toast } from "@/hooks/use-toast";
import { useLocale } from "@/contexts/locale-context";

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

const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, {
  labelKey: string;
  next: PaymentStatus;
  variant: "secondary" | "success" | "warning";
}> = {
  PENDING: { labelKey: "pairs.paymentPending", next: "PAID", variant: "warning" },
  PAID:    { labelKey: "pairs.paymentPaid",    next: "WAIVED", variant: "success" },
  WAIVED:  { labelKey: "pairs.paymentWaived",  next: "PENDING", variant: "secondary" },
};

const REG_STATUS_CONFIG: Record<RegistrationStatus, {
  labelKey: string;
  next: RegistrationStatus;
  variant: "secondary" | "success" | "destructive";
  icon: React.ElementType;
}> = {
  UNCONFIRMED: { labelKey: "pairs.unconfirmed", next: "CONFIRMED", variant: "secondary", icon: AlertCircle },
  CONFIRMED: { labelKey: "pairs.confirmed", next: "CANCELLED", variant: "success", icon: CheckCircle },
  CANCELLED: { labelKey: "pairs.cancelled", next: "UNCONFIRMED", variant: "destructive", icon: X },
};

// ── RegistrationStats ─────────────────────────────────────────────────────────
function RegistrationStats({ total, paid, pending, maxPairs }: {
  total: number; paid: number; pending: number; maxPairs?: number;
}) {
  const { t } = useLocale();
  const capacityPct = maxPairs ? Math.min(100, Math.round((total / maxPairs) * 100)) : null;
  const spotsLeft = maxPairs ? maxPairs - total : null;

  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <Users className="h-4 w-4" /> {t("pairs.totalRegistered")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{total}</p>
          {maxPairs && <p className="text-xs text-[var(--text-tertiary)]">{t("pairs.ofMax", { max: maxPairs })}</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <CreditCard className="h-4 w-4" /> {t("pairs.confirmedPaid")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{paid}</p>
          <p className="text-xs text-[var(--text-tertiary)]">
            {total > 0 ? Math.round((paid / total) * 100) : 0}{t("pairs.ofTotal")}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <Clock className="h-4 w-4" /> {t("pairs.pendingPayment")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{pending}</p>
        </CardContent>
      </Card>
      {maxPairs && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-[var(--text-secondary)]">{t("pairs.capacity")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <p className="text-2xl font-bold">{capacityPct}%</p>
              {spotsLeft !== null && spotsLeft > 0 && (
                <p className="mb-0.5 text-xs text-[var(--text-tertiary)]">{t("pairs.spotsLeft", { count: spotsLeft })}</p>
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
  const { t } = useLocale();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(pair.adminNote ?? "");
  const qc = useQueryClient();
  const cancelRef = useRef(false);

  const save = useApiMutation({
    mutationFn: (note: string) => pairsApi.setNote(competitionId, pair.id, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pairs", competitionId] });
      setEditing(false);
    },
  });

  const handleBlur = () => {
    if (cancelRef.current) { cancelRef.current = false; return; }
    if (draft !== (pair.adminNote ?? "")) {
      save.mutate(draft);
    } else {
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <div className="flex flex-col gap-1 min-w-[160px]">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleBlur}
          className="h-16 text-xs"
          autoFocus
        />
        <div className="flex gap-1">
          <Button
            size="icon-sm"
            variant="outline"
            onMouseDown={() => { cancelRef.current = true; }}
            onClick={() => { setEditing(false); setDraft(pair.adminNote ?? ""); }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <button
      className="flex items-center gap-1 text-xs text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors"
      onClick={() => { setDraft(pair.adminNote ?? ""); setEditing(true); }}
      title={pair.adminNote ?? t("pairs.note")}
    >
      <FileText className="h-3.5 w-3.5 shrink-0" />
      {pair.adminNote ? (
        <span className="max-w-[100px] truncate text-[var(--text-secondary)]">{pair.adminNote}</span>
      ) : (
        <span className="italic">{t("pairs.note")}</span>
      )}
    </button>
  );
}

// ── ContactModal ──────────────────────────────────────────────────────────────
function ContactModal({ pair, competitionId, onClose }: { pair: PairDto; competitionId: string; onClose: () => void }) {
  const { t } = useLocale();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const send = useApiMutation({
    mutationFn: () => pairsApi.contactEmail(competitionId, pair.id, { subject, message }),
    onSuccess: () => {
      toast({ title: t("pairs.emailSent"), variant: "success" });
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
            {t("pairs.contactPair")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <p className="mb-1 text-xs text-[var(--text-secondary)]">{t("pairs.to")}</p>
            <p className="rounded border border-[var(--border)] bg-[var(--surface-secondary)] px-3 py-2 text-sm">
              {pairName}
              {pair.email && <span className="ml-2 text-xs text-[var(--text-tertiary)]">({pair.email})</span>}
            </p>
          </div>
          <Input
            label={t("pairs.subject")}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t("pairs.subjectPlaceholder")}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium">{t("pairs.message")}</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("pairs.messagePlaceholder")}
              className="h-28"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
          <Button
            onClick={() => send.mutate()}
            loading={send.isPending}
            disabled={!subject || !message}
          >
            <Mail className="h-4 w-4" />
            {t("pairs.sendEmail")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Excel export ──────────────────────────────────────────────────────────────
async function exportToExcel(pairs: PairDto[], sections: { id: string; name: string }[], competitionName?: string) {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");

  const getSectionName = (p: PairDto) => {
    const sectionId = p.sectionId ?? p.sections?.[0]?.sectionId;
    return sections.find((s) => s.id === sectionId)?.name ?? p.sections?.[0]?.sectionName ?? "";
  };

  const fmt = (d?: string | null) => d ? new Date(d).toLocaleDateString("cs-CZ") : "";
  const HEADERS = [
    "Startovní číslo", "Kategorie", "Jméno 1", "Příjmení 1", "Jméno 2", "Příjmení 2",
    "Země", "Klub", "ID competitora", "Datum přihlášení",
    "Startovné/os", "Startovné celkem", "Startuje", "Datum odhlášení",
    "Konec prezence", "Typ startu", "Od kola", "Třída",
    "Finale count", "Points", "Ranklist", "Email", "Platba",
  ];
  const COLUMNS = [
    { width: 5 },  { width: 24 }, { width: 12 }, { width: 14 }, { width: 12 }, { width: 14 },
    { width: 6 },  { width: 22 }, { width: 12 }, { width: 14 },
    { width: 12 }, { width: 14 }, { width: 8 },  { width: 14 }, { width: 14 },
    { width: 12 }, { width: 8 },  { width: 8 },
    { width: 10 }, { width: 8 },  { width: 8 },
    { width: 28 }, { width: 10 },
  ];
  const data = [
    HEADERS.map((h) => ({ value: h, fontWeight: "bold" as const })),
    ...pairs.map((p) => [
      { value: String(p.startNumber).padStart(3, "0") },
      { value: getSectionName(p) },
      { value: p.dancer1FirstName ?? (p.dancer1Name?.split(" ")[0] ?? "") },
      { value: p.dancer1LastName ?? (p.dancer1Name?.split(" ").slice(1).join(" ") ?? "") },
      { value: p.dancer2FirstName ?? (p.dancer2Name?.split(" ")[0] ?? "") },
      { value: p.dancer2LastName ?? (p.dancer2Name?.split(" ").slice(1).join(" ") ?? "") },
      { value: p.country ?? "" },
      { value: p.dancer1Club ?? p.club ?? "" },
      { value: p.athlete1Id ?? "" },
      { value: fmt(p.registeredAt) },
      { value: p.feePerPerson ?? "" },
      { value: p.feeTotal ?? "" },
      { value: p.starts === false ? 0 : 1, type: Number },
      { value: fmt(p.withdrawalDate) },
      { value: fmt(p.presenceDeadline) },
      { value: p.startType ?? "" },
      { value: p.startsFromRound ?? "" },
      { value: p.classValue ?? "" },
      { value: p.finaleCount ?? "" },
      { value: p.points ?? "" },
      { value: p.ranklistPosition ?? "" },
      { value: p.email ?? "" },
      { value: p.paymentStatus ?? "" },
    ]),
  ];
  const filename = `${(competitionName ?? "registrace").replace(/[^a-z0-9]/gi, "_")}_pary.xlsx`;
  await writeXlsxFile(data, { columns: COLUMNS, fileName: filename, sheet: "Páry" });
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

// ── AddSectionDropdown ────────────────────────────────────────────────────────
function AddSectionDropdown({
  competitionId,
  pairId,
  assignedSectionIds,
  allSections,
}: {
  competitionId: string;
  pairId: string;
  assignedSectionIds: string[];
  allSections: { id: string; name: string }[];
}) {
  const { t } = useLocale();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const available = allSections.filter((s) => !assignedSectionIds.includes(s.id));

  const add = useApiMutation({
    mutationFn: (sectionId: string) =>
      apiClient.post(`/competitions/${competitionId}/pairs/${pairId}/sections/${sectionId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pairs", competitionId] }),
  });

  if (available.length === 0) return null;

  return (
    <Select
      open={open}
      onOpenChange={setOpen}
      onValueChange={(sectionId) => {
        add.mutate(sectionId);
        setOpen(false);
      }}
    >
      <SelectTrigger className="h-7 w-auto gap-1 border-dashed text-xs">
        <Plus className="h-3 w-3" />
        <span>{t("pairs.addCategory")}</span>
      </SelectTrigger>
      <SelectContent>
        {available.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {s.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PairsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useLocale();
  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toggleConfirmOpen, setToggleConfirmOpen] = useState(false);
  const [checkinDialogOpen, setCheckinDialogOpen] = useState(false);
  const [checkinToken, setCheckinToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [contactPair, setContactPair] = useState<PairDto | null>(null);
  const [expandedPairId, setExpandedPairId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const xlsxFileRef = useRef<HTMLInputElement>(null);
  const [xlsxResult, setXlsxResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const [xlsxImporting, setXlsxImporting] = useState(false);
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
  const removePairFromSection = useRemovePairFromSection(id);

  const generateCheckinLink = useApiMutation({
    mutationFn: () =>
      apiClient.post<{ token: string }>(`/competitions/${id}/checkin-token`).then((r) => r.data.token),
    onSuccess: (token) => {
      setCheckinToken(token);
      setCheckinDialogOpen(true);
    },
  });

  const cycleStatus = useApiMutation({
    mutationFn: ({ pairId, status }: { pairId: string; status: RegistrationStatus }) =>
      pairsApi.setRegistrationStatus(id, pairId, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pairs", id] }),
  });

  const cyclePayment = useApiMutation({
    mutationFn: ({ pairId, status }: { pairId: string; status: PaymentStatus }) =>
      pairsApi.setPaymentStatus(id, pairId, status),
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

  const toggleRegistration = useApiMutation({
    mutationFn: () => {
      if (competition?.registrationOpen === true) {
        return competitionsApi.closeRegistration(id);
      }
      return competitionsApi.openRegistration(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["competitions", "detail", id] });
      setToggleConfirmOpen(false);
      toast({
        title: competition?.registrationOpen === true ? t("competition.registrationClosed") : t("competition.registrationOpened"),
        variant: "success",
      });
    },
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddPairForm>({ resolver: zodResolver(addPairSchema), defaultValues: { sectionId: "" } });

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
    const matchesSection = sectionFilter === "all" ||
      (p.sections && p.sections.some(ps => ps.sectionId === sectionFilter)) ||
      p.sectionId === sectionFilter;
    return matchesSearch && matchesSection;
  });

  const onSubmit = async (values: AddPairForm) => {
    try {
      await createPair.mutateAsync({
        sectionId: values.sectionId,
        startNumber: values.startNumber ? Number(values.startNumber) : undefined,
        dancer1Name: `${values.dancer1FirstName} ${values.dancer1LastName}`,
        dancer2Name: values.dancer2FirstName ? `${values.dancer2FirstName} ${values.dancer2LastName ?? ""}`.trim() : undefined,
        dancer1FirstName: values.dancer1FirstName,
        dancer1LastName: values.dancer1LastName,
        dancer1Club: values.dancer1Club,
        dancer2FirstName: values.dancer2FirstName,
        dancer2LastName: values.dancer2LastName,
        dancer2Club: values.dancer2Club,
        email: values.email || undefined,
      });
      toast({ title: t("pairs.added"), variant: "success" });
      reset();
      setDialogOpen(false);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ title: msg ?? t("common.error"), variant: "destructive" });
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await importPairs.mutateAsync(file);
    toast({
      title: t("pairs.importedCount", { count: result.imported }),
      description: result.errors.length ? t("pairs.importErrors", { count: result.errors.length }) : undefined,
      variant: result.errors.length ? "warning" : "success",
    });
    e.target.value = "";
  };

  const handleXlsxImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setXlsxImporting(true);
    let skipped = 0;
    try {
      const { default: readXlsxFile } = await import("read-excel-file/browser");
      const rows = await readXlsxFile(file);
      if (rows.length < 2) {
        setXlsxResult({ imported: 0, skipped: 0, errors: ["Soubor neobsahuje žádná data."] });
        return;
      }

      // Detect column positions from header row so any column order works
      const HEADER_MAP: Record<string, string> = {
        "Startovní číslo": "startNum", "Kategorie": "category",
        "Jméno 1": "firstName1", "Příjmení 1": "lastName1",
        "Jméno 2": "firstName2", "Příjmení 2": "lastName2",
        "Země": "country", "Klub": "club",
        "ID competitora": "externalId",
        "Email": "email",
        "Startovné/os": "feePerPerson", "Startovné celkem": "feeTotal",
        "Startuje": "starts",
      };
      // Positional fallback for files without our headers
      const colIdx: Record<string, number> = {
        startNum: 0, category: 1, firstName1: 2, lastName1: 3,
        firstName2: 4, lastName2: 5, country: 6, club: 7,
        externalId: 8, email: 9, feePerPerson: 10, feeTotal: 11, starts: 12,
      };
      const headerRow = rows[0];
      if (headerRow.some((h) => Object.keys(HEADER_MAP).includes(String(h ?? "").trim()))) {
        headerRow.forEach((cell, idx) => {
          const field = HEADER_MAP[String(cell ?? "").trim()];
          if (field) colIdx[field] = idx;
        });
      }

      // Read a cell as string — returns "" for Date objects (date in a text column = bad data)
      const str = (val: string | number | Date | boolean | undefined | null): string => {
        if (val == null || val instanceof Date) return "";
        return String(val).trim();
      };

      const dataRows = rows.slice(1).filter((r) => r[colIdx.firstName1] || r[colIdx.lastName1]);

      const batch: Record<string, unknown>[] = [];
      for (const row of dataRows) {
        const r = row as (string | number | Date | boolean | undefined | null)[];
        const sectionName = str(r[colIdx.category]);
        const firstName1 = str(r[colIdx.firstName1]);
        const lastName1 = str(r[colIdx.lastName1]);
        const firstName2 = str(r[colIdx.firstName2]);
        const lastName2 = str(r[colIdx.lastName2]);
        const country = str(r[colIdx.country]);
        const club = str(r[colIdx.club]);
        const rawExternalId = r[colIdx.externalId];
        const externalCompetitorId = rawExternalId != null && !(rawExternalId instanceof Date)
          ? String(rawExternalId) : undefined;
        const rawFeePerPerson = r[colIdx.feePerPerson];
        const feePerPerson = typeof rawFeePerPerson === "number" ? rawFeePerPerson : undefined;
        const rawFeeTotal = r[colIdx.feeTotal];
        const feeTotal = typeof rawFeeTotal === "number" ? rawFeeTotal : undefined;
        const email = colIdx.email !== undefined ? str(r[colIdx.email]) : "";
        const startsVal = r[colIdx.starts];
        const starts = startsVal === 1 || startsVal === true || String(startsVal) === "1";
        if (!firstName1 || !lastName1) { skipped++; continue; }
        const section = sections?.find((s) => s.name === sectionName);
        batch.push({
          sectionId: section?.id ?? "",
          dancer1Name: `${firstName1} ${lastName1}`.trim(),
          dancer1FirstName: firstName1,
          dancer1LastName: lastName1,
          dancer2Name: firstName2 ? `${firstName2} ${lastName2}`.trim() : undefined,
          dancer2FirstName: firstName2 || undefined,
          dancer2LastName: lastName2 || undefined,
          club: club || undefined,
          country: country || undefined,
          externalId: externalCompetitorId,
          email: email || undefined,
          feePerPerson,
          feeTotal,
          starts,
        });
      }

      const res = await apiClient.post<{ imported: number; errors: string[] }>(
        `/competitions/${id}/pairs/batch-import`,
        batch,
      );
      qc.invalidateQueries({ queryKey: ["pairs", id] });
      setXlsxResult({ imported: res.data.imported, skipped, errors: res.data.errors });
    } catch (err) {
      setXlsxResult({ imported: 0, skipped, errors: [(err as { message?: string })?.message ?? "Neznámá chyba"] });
    } finally {
      setXlsxImporting(false);
      e.target.value = "";
    }
  };

  const isRegistrationOpen = competition?.registrationOpen === true;

  return (
    <AppShell
      sidebar={<CompetitionSidebar competitionId={id} />}
      headerActions={
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            className={isRegistrationOpen ? "border-[var(--success)]/40 text-[var(--success)]" : ""}
            onClick={() => setToggleConfirmOpen(true)}
          >
            {isRegistrationOpen ? (
              <><ToggleRight className="h-4 w-4" />{t("pairs.registrationOpen")}</>
            ) : (
              <><ToggleLeft className="h-4 w-4" />{t("pairs.registrationClosed")}</>
            )}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => generateCheckinLink.mutate()}
            loading={generateCheckinLink.isPending}
          >
            <QrCode className="h-4 w-4" />
            {t("pairs.checkinLink")}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => exportToExcel(pairs ?? [], sections ?? [], competition?.name)}
            disabled={!pairs?.length}
          >
            <Download className="h-4 w-4" />
            {t("pairs.excelExport")}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => printStartNumbers(pairs ?? [], competition?.name ?? "", sections ?? [])}
            disabled={!pairs?.length}
          >
            <Printer className="h-4 w-4" />
            {t("pairs.startNumbers")}
          </Button>

          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileImport} />
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} loading={importPairs.isPending}>
            <Upload className="h-4 w-4" />
            {t("pairs.import")}
          </Button>
          <input ref={xlsxFileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleXlsxImport} />
          <Button size="sm" variant="outline" onClick={() => xlsxFileRef.current?.click()} loading={xlsxImporting} title="Import párů z Excel souboru (testovací)">
            <Sheet className="h-4 w-4" />
            Import XLSX
          </Button>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            {t("pairs.add")}
          </Button>
        </div>
      }
    >
      <PageHeader title={t("pairs.title")} description={t("pairs.registered", { count: String(total) })} backHref={`/dashboard/competitions/${id}`} />

      <RegistrationStats
        total={total}
        paid={confirmedCount}
        pending={pendingCount}
        maxPairs={competition?.maxPairs}
      />

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <Input
          placeholder={t("pairs.searchPlaceholder")}
          leftIcon={<Search className="h-4 w-4" />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={sectionFilter} onValueChange={setSectionFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t("section.title")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("section.title")}</SelectItem>
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
              <TableHead>{t("pairs.dancer1")}</TableHead>
              <TableHead>{t("pairs.dancer2")}</TableHead>
              <TableHead>{t("pairs.clubColumn")}</TableHead>
              <TableHead>{t("pairs.section")}</TableHead>
              <TableHead>{t("pairs.status")}</TableHead>
              <TableHead>{t("pairs.payment")}</TableHead>
              <TableHead>{t("pairs.note")}</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))}
            {!isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-12 text-center text-[var(--text-secondary)]">
                  {search || sectionFilter !== "all" ? t("pairs.noMatchFilter") : t("pairs.noPairsYet")}
                </TableCell>
              </TableRow>
            )}
            {filtered.map((pair) => {
              // backend returns pair.sections[]; mock uses pair.sectionId
              const allSectionNames: string[] = pair.sections && pair.sections.length > 0
                ? pair.sections.map(ps => sections?.find(s => s.id === ps.sectionId)?.name ?? ps.sectionName ?? "")
                : pair.sectionId
                  ? [sections?.find(s => s.id === pair.sectionId)?.name ?? ""]
                  : [];
              const regStatus = pair.registrationStatus ?? "UNCONFIRMED";
              const statusCfg = REG_STATUS_CONFIG[regStatus];
              return (
                <React.Fragment key={pair.id}>
                <TableRow
                  className="cursor-pointer"
                  onClick={() => setExpandedPairId((prev) => (prev === pair.id ? null : pair.id))}
                >
                  <TableCell className="font-mono font-semibold">
                    {String(pair.startNumber).padStart(3, "0")}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-sm">
                      {pair.dancer1FirstName && pair.dancer1LastName
                        ? `${pair.dancer1FirstName} ${pair.dancer1LastName}`
                        : pair.dancer1Name ?? "—"}
                    </p>
                  </TableCell>
                  <TableCell>
                    {(pair.dancer2FirstName || pair.dancer2Name) && (
                      <p className="text-sm">
                        {pair.dancer2FirstName && pair.dancer2LastName
                          ? `${pair.dancer2FirstName} ${pair.dancer2LastName}`
                          : pair.dancer2Name}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {pair.dancer1Club ?? pair.dancer2Club ?? pair.club ?? "—"}
                    </p>
                  </TableCell>
                  <TableCell>
                    {allSectionNames.filter(Boolean).length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {allSectionNames.filter(Boolean).map((name, i) => (
                          <Badge key={i} variant="secondary" className="whitespace-nowrap text-xs">
                            {name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-[var(--text-tertiary)]">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <button
                      className="group"
                      title={t("pairs.cycleStatusTitle", { next: t(REG_STATUS_CONFIG[statusCfg.next].labelKey) })}
                      onClick={() => cycleStatus.mutate({ pairId: pair.id, status: statusCfg.next })}
                      disabled={cycleStatus.isPending}
                    >
                      <Badge variant={statusCfg.variant} className="flex items-center gap-1 cursor-pointer group-hover:opacity-80 transition-opacity">
                        <statusCfg.icon className="h-3 w-3" />
                        {t(statusCfg.labelKey)}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const payStatus = (pair.paymentStatus ?? "PENDING") as PaymentStatus;
                      const cfg = PAYMENT_STATUS_CONFIG[payStatus] ?? PAYMENT_STATUS_CONFIG.PENDING;
                      return (
                        <button
                          className="group"
                          title={t("pairs.cyclePaymentTitle", { next: t(PAYMENT_STATUS_CONFIG[cfg.next].labelKey) })}
                          onClick={() => cyclePayment.mutate({ pairId: pair.id, status: cfg.next })}
                          disabled={cyclePayment.isPending}
                        >
                          <Badge variant={cfg.variant} className="cursor-pointer group-hover:opacity-80 transition-opacity">
                            {t(cfg.labelKey)}
                          </Badge>
                        </button>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    <NoteCell pair={pair} competitionId={id} />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      {pair.email && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-[var(--text-tertiary)] hover:text-[var(--accent)]"
                          onClick={() => setContactPair(pair)}
                          title={t("pairs.contactEmail")}
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
                          title={t("pairs.contactNoEmail")}
                        >
                          <Mail className="h-4 w-4 opacity-40" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-[var(--text-tertiary)] hover:text-[var(--destructive)]"
                        onClick={() => { if (confirm(t("pairs.deleteConfirm"))) deletePair.mutate(pair.id); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                {expandedPairId === pair.id && (
                  <TableRow>
                    <TableCell colSpan={9} className="bg-muted/30 px-6 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm text-muted-foreground mr-1">
                          {t("pairs.categories")}:
                        </span>
                        {(pair.sections ?? []).map((ps) => (
                          <Badge
                            key={ps.sectionId}
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            {ps.sectionName ?? sections?.find((s) => s.id === ps.sectionId)?.name ?? ps.sectionId}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removePairFromSection.mutate(
                                  { pairId: pair.id, sectionId: ps.sectionId },
                                  {
                                    onSuccess: (data) => {
                                      if (data.hadScoringData) {
                                        toast({ description: t("pairs.removedWithScoringData") });
                                      }
                                    },
                                    onError: () => {
                                      toast({
                                        description: t("pairs.cannotRemoveOnlySection"),
                                        variant: "destructive",
                                      });
                                    },
                                  }
                                );
                              }}
                              className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"
                              aria-label={`Remove ${ps.sectionName}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                        <AddSectionDropdown
                          competitionId={id}
                          pairId={pair.id}
                          assignedSectionIds={(pair.sections ?? []).map((s) => s.sectionId)}
                          allSections={(sections ?? []).map((s) => ({ id: s.id, name: s.name }))}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Contact modal */}
      {contactPair && (
        <ContactModal pair={contactPair} competitionId={id} onClose={() => setContactPair(null)} />
      )}

      {/* Registration toggle confirm */}
      <Dialog open={toggleConfirmOpen} onOpenChange={setToggleConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {isRegistrationOpen ? t("pairs.closeRegistrationConfirm") : t("pairs.openRegistrationConfirm")}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--text-secondary)]">
            {isRegistrationOpen ? t("pairs.closeRegistrationDesc") : t("pairs.openRegistrationDesc")}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToggleConfirmOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={() => toggleRegistration.mutate()} loading={toggleRegistration.isPending}>
              {isRegistrationOpen ? t("pairs.closeAction") : t("pairs.openAction")}
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
              {t("pairs.checkinLinkTitle")}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--text-secondary)]">
            {t("pairs.checkinLinkDesc")}
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
            <Button onClick={() => setCheckinDialogOpen(false)}>{t("common.close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* XLSX import result dialog */}
      {xlsxResult && (
        <Dialog open onOpenChange={() => setXlsxResult(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sheet className="h-5 w-5 text-[var(--accent)]" />
                Výsledek importu XLSX
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              <p className="text-[var(--success-text)]">✓ Importováno: <strong>{xlsxResult.imported}</strong></p>
              {xlsxResult.skipped > 0 && <p className="text-[var(--text-secondary)]">↷ Přeskočeno: {xlsxResult.skipped}</p>}
              {xlsxResult.errors.length > 0 && (
                <div>
                  <p className="text-[var(--destructive)] font-medium">✗ Chyby ({xlsxResult.errors.length}):</p>
                  <ul className="mt-1 max-h-40 overflow-y-auto rounded border border-[var(--border)] bg-[var(--surface-secondary)] p-2 text-xs space-y-1">
                    {xlsxResult.errors.map((e, i) => <li key={i} className="text-[var(--destructive)]">{e}</li>)}
                  </ul>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => setXlsxResult(null)}>Zavřít</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Add pair dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("pairs.addManually")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">{t("pairs.section")}</label>
              <Controller
                control={control}
                name="sectionId"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger error={!!errors.sectionId}>
                      <SelectValue placeholder={t("pairs.selectSection")} />
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
            <Input label={t("pairs.startNumberOptional")} type="number" min={1} {...register("startNumber")} />
            <div className="grid grid-cols-2 gap-3">
              <Input label={t("pairs.dancer1FirstName")} error={errors.dancer1FirstName?.message} {...register("dancer1FirstName")} />
              <Input label={t("pairs.dancer1LastName")} error={errors.dancer1LastName?.message} {...register("dancer1LastName")} />
            </div>
            <Input label={t("pairs.dancer1ClubOptional")} {...register("dancer1Club")} />
            <div className="grid grid-cols-2 gap-3">
              <Input label={t("pairs.dancer2FirstName")} {...register("dancer2FirstName")} />
              <Input label={t("pairs.dancer2LastName")} {...register("dancer2LastName")} />
            </div>
            <Input label={t("pairs.dancer2ClubOptional")} {...register("dancer2Club")} />
            <Input label={t("pairs.emailOptional")} type="email" {...register("email")} error={errors.email?.message} />
            <div className="flex items-center gap-2">
              <input type="checkbox" id="markAsPaid" className="h-4 w-4 rounded border-[var(--border)]" {...register("markAsPaid")} />
              <label htmlFor="markAsPaid" className="text-sm text-[var(--text-secondary)]">
                {t("pairs.markAsPaid")}
              </label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
              <Button type="submit" loading={createPair.isPending}>{t("pairs.add")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
