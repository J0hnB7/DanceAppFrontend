"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Trophy,
  PlayCircle,
  Calendar,
  MapPin,
  Copy,
  Trash2,
  Link2,
  ExternalLink,
  CheckCircle2,
  Newspaper,
  Plus,
  FileText,
  KeyRound,
  AlertTriangle,
  ClipboardCheck,
  CreditCard,
  Clock,
  ChevronDown,
  Pencil,
  UserCircle2,
  Layers,
  ListOrdered,
  Sheet,
  Download,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import {
  useCompetition,
  useUpdateCompetition,
  useDeleteCompetition,
} from "@/hooks/queries/use-competitions";
import type { PairsVisibility, CompetitionNewsItem, PaymentMethodType } from "@/lib/api/competitions";
import { competitionsApi, CompetitionStatus } from "@/lib/api/competitions";
import { useSections } from "@/hooks/queries/use-sections";
import { sectionsApi } from "@/lib/api/sections";
import { JudgesTab } from "@/components/competition/judges-tab";
import { VyhodnoceniTab } from "@/components/competition/vyhodnoceni-tab";
import { usePairs } from "@/hooks/queries/use-pairs";
import apiClient from "@/lib/api-client";
import { judgeTokensApi } from "@/lib/api/judge-tokens";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useLocale } from "@/contexts/locale-context";

// Cached xlsx module — loaded once to avoid repeated webpack chunk recompilation
let xlsxCache: typeof import("xlsx") | null = null;
async function getXlsx() {
  if (!xlsxCache) xlsxCache = await import("xlsx");
  return xlsxCache;
}

const statusColors: Record<CompetitionStatus, "default" | "secondary" | "success" | "warning" | "destructive" | "outline"> = {
  DRAFT: "secondary",
  PUBLISHED: "outline",
  IN_PROGRESS: "warning",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
};

// Separate component to read searchParams (required by Next.js Suspense rule)
function NewCompetitionModal({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useLocale();
  const isNew = searchParams.get("new") === "1";
  const [open, setOpen] = useState(isNew);
  const [copied, setCopied] = useState(false);

  const registrationUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/competitions/${id}`
      : `/competitions/${id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(registrationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setOpen(false);
    router.replace(`/dashboard/competitions/${id}`);
  };

  if (!isNew) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-[var(--success)]" />
            {t("competition.created")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            {t("competition.shareLink")}
          </p>

          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-secondary)] p-3">
            <p className="mb-1.5 text-xs font-semibold text-[var(--text-tertiary)]">
              {t("competition.registrationLink")}
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate text-xs text-[var(--text-primary)]">
                {registrationUrl}
              </code>
              <Button
                size="sm"
                variant={copied ? "outline" : "default"}
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {t("judges.linkCopied")}
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    {t("common.copy")}
                  </>
                )}
              </Button>
            </div>
          </div>

          <a
            href={registrationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-[var(--accent)] hover:text-[var(--accent-hover)]"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {t("competition.previewRegistration")}
          </a>

          <div className="flex justify-end">
            <Button onClick={handleClose}>{t("common.done")}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RegistrationLinkCard({ id }: { id: string }) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);

  const registrationUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/competitions/${id}`
      : `/competitions/${id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(registrationUrl);
    setCopied(true);
    toast({ title: t("judges.linkCopied") } as Parameters<typeof toast>[0]);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="sm:col-span-2 lg:col-span-3 border-[var(--accent)]/20 bg-[var(--accent)]/3">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <Link2 className="h-4 w-4 text-[var(--accent)]" /> {t("competition.registrationLink")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate rounded bg-[var(--surface)] px-2 py-1.5 text-xs text-[var(--text-primary)]">
            {registrationUrl}
          </code>
          <Button size="sm" variant="outline" onClick={handleCopy} className="shrink-0">
            {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-[var(--success)]" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? t("judges.linkCopied") : t("common.copy")}
          </Button>
          <Button size="sm" variant="ghost" asChild className="shrink-0">
            <a href={registrationUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
        <p className="mt-1.5 text-xs text-[var(--text-tertiary)]">
          {t("competition.registrationLinkDesc")}
        </p>
      </CardContent>
    </Card>
  );
}

function DeleteConfirmDialog({
  open,
  name,
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  name: string;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useLocale();
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[var(--destructive)]">
            <AlertTriangle className="h-5 w-5" />
            {t("competition.deleteDialog.title")}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-[var(--text-secondary)]">
          {t("competition.deleteDialog.description", { name })}
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button variant="destructive" onClick={onConfirm} loading={loading}>
            <Trash2 className="h-4 w-4" />
            {t("competition.deleteDialog.confirm")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function CompetitionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { t } = useLocale();
  const { data: competition, isLoading } = useCompetition(id);
  const { data: sections } = useSections(id);
  const { data: pairs } = usePairs(id);
  const updateCompetition = useUpdateCompetition(id);
  const deleteCompetition = useDeleteCompetition();

  const [tab, setTab] = useState("overview");
  const xlsxFileRef = useRef<HTMLInputElement>(null);
  const [xlsxImporting, setXlsxImporting] = useState(false);
  const [xlsxResult, setXlsxResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const sectionsImportRef = useRef<HTMLInputElement>(null);
  const [sectionsImporting, setSectionsImporting] = useState(false);
  const [sectionsImportResult, setSectionsImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const [newNewsTitle, setNewNewsTitle] = useState("");
  const [newNewsContent, setNewNewsContent] = useState("");
  const [propoziceText, setPropoziceText] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [contentDescription, setContentDescription] = useState("");
  const [contentSaved, setContentSaved] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("PAY_AT_VENUE");
  const [bankIban, setBankIban] = useState("");
  const [bankBic, setBankBic] = useState("");
  const [bankHolder, setBankHolder] = useState("");
  const [bankAddress, setBankAddress] = useState("");
  const [stripeKey, setStripeKey] = useState("");
  const [orgWebsiteUrl, setOrgWebsiteUrl] = useState("");
  const qc = useQueryClient();

  const { data: newsItems = [] } = useQuery({
    queryKey: ["competition-news", id],
    queryFn: () => competitionsApi.listNews(id),
    enabled: !!id,
  });

  const { data: judgeTokens = [] } = useQuery({
    queryKey: ["judge-tokens", id],
    queryFn: () => judgeTokensApi.list(id),
    enabled: !!id,
  });

  const addNews = useMutation({
    mutationFn: () => competitionsApi.createNews(id, { title: newNewsTitle, content: newNewsContent }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["competition-news", id] });
      setNewNewsTitle("");
      setNewNewsContent("");
      toast({ title: t("news.published") } as Parameters<typeof toast>[0]);
    },
  });

  const deleteNews = useMutation({
    mutationFn: (newsId: string) => competitionsApi.deleteNews(id, newsId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["competition-news", id] }),
  });

  useEffect(() => {
    if (competition) {
      setPropoziceText(competition.propozice ?? "");
      setContactEmail(competition.contactEmail ?? "");
      setContentDescription(competition.contentDescription ?? "");
      setPaymentMethod(competition.paymentMethod ?? "PAY_AT_VENUE");
      const pc = (competition.paymentConfig ?? {}) as Record<string, string>;
      setBankIban(pc.iban ?? "");
      setBankBic(pc.bic ?? "");
      setBankHolder(pc.holder ?? "");
      setBankAddress(pc.address ?? "");
      setStripeKey(pc.apiKey ?? "");
      setOrgWebsiteUrl(pc.url ?? "");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competition?.id]);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef<Record<string, unknown>>({});
  function scheduleSave(data: Record<string, unknown>, delay = 700) {
    Object.assign(pendingSaveRef.current, data);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      updateCompetition.mutate(pendingSaveRef.current as Parameters<typeof updateCompetition.mutate>[0]);
      pendingSaveRef.current = {};
      saveTimerRef.current = null;
    }, delay);
  }

  const contentSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function scheduleContentSave(data: Record<string, unknown>) {
    if (contentSaveTimerRef.current) clearTimeout(contentSaveTimerRef.current);
    contentSaveTimerRef.current = setTimeout(() => {
      updateCompetition.mutate(data as Parameters<typeof updateCompetition.mutate>[0]);
      contentSaveTimerRef.current = null;
      setContentSaved(true);
      if (contentSavedTimerRef.current) clearTimeout(contentSavedTimerRef.current);
      contentSavedTimerRef.current = setTimeout(() => setContentSaved(false), 2000);
    }, 400);
  }

  const [deleting, setDeleting] = useState(false);
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await competitionsApi.delete(id);
    } catch {
      toast({ title: t("competitionDetail.deleteFailed"), variant: "destructive" } as Parameters<typeof toast>[0]);
      setDeleting(false);
      return;
    }
    router.push("/dashboard");
  };

  const handlePublish = async () => {
    await competitionsApi.publish(id);
    toast({ title: t("competition.published"), variant: "success" } as Parameters<typeof toast>[0]);
  };

  const handleXlsxImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setXlsxImporting(true);
    let skipped = 0;
    try {
      const XLSX = await getXlsx();
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 }) as unknown[][];
      const dataRows = rows.slice(1).filter((r) => (r as unknown[])[4]);

      const batch: Record<string, unknown>[] = [];
      for (const row of dataRows) {
        const r = row as (string | number | undefined)[];
        const externalSectionId = String(r[0] ?? "");
        const externalCompetitorId = String(r[1] ?? "");
        const sectionName = String(r[3] ?? "");
        const firstName1 = String(r[4] ?? "").trim();
        const lastName1 = String(r[5] ?? "").trim();
        const firstName2 = String(r[6] ?? "").trim();
        const lastName2 = String(r[7] ?? "").trim();
        const country = String(r[8] ?? "").trim();
        const club = String(r[9] ?? "").trim();
        const feePerPerson = r[14] != null ? Number(r[14]) : undefined;
        const feeTotal = r[15] != null ? Number(r[15]) : undefined;
        const starts = String(r[16]) === "1";
        const startType = String(r[18] ?? "").trim() || undefined;
        const startsFromRound = r[19] != null ? Number(r[19]) : undefined;
        const classValue = String(r[20] ?? "").trim() || undefined;

        if (!firstName1 || !lastName1) { skipped++; continue; }

        const section = sections?.find((s) => s.name === sectionName || s.externalId === externalSectionId);
        batch.push({
          sectionId: section?.id ?? "",
          dancer1Name: `${firstName1} ${lastName1}`,
          dancer1FirstName: firstName1,
          dancer1LastName: lastName1,
          dancer2Name: firstName2 ? `${firstName2} ${lastName2}` : undefined,
          dancer2FirstName: firstName2 || undefined,
          dancer2LastName: lastName2 || undefined,
          club: club || undefined,
          country: country || undefined,
          externalId: externalCompetitorId,
          externalSectionId,
          feePerPerson,
          feeTotal,
          starts,
          startType,
          startsFromRound,
          classValue,
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

  const handleSectionsImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSectionsImporting(true);
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];
    try {
      const XLSX = (await import("xlsx"));
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      // Columns: Název(0), Styl(1), Věková kategorie(2), Úroveň(3), Typ soutěžícího(4), Typ soutěže(5), Počet rozhodčích(6), Max párů finále(7), Startovné(8), Měna(9)
      const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 }) as unknown[][];
      const dataRows = rows.slice(1).filter((r) => (r as unknown[])[0]);

      for (const row of dataRows) {
        const r = row as (string | number | undefined)[];
        const name = String(r[0] ?? "").trim();
        if (!name) { skipped++; continue; }
        const danceStyle = String(r[1] ?? "").trim() || undefined;
        const ageCategory = String(r[2] ?? "").trim() || undefined;
        const level = String(r[3] ?? "").trim() || undefined;
        const competitorType = String(r[4] ?? "").trim() || undefined;
        const competitionType = String(r[5] ?? "").trim() || undefined;
        const rawJudges = r[6] != null && r[6] !== "" ? Number(r[6]) : NaN;
        const rawFinal = r[7] != null && r[7] !== "" ? Number(r[7]) : NaN;
        const numberOfJudges = isNaN(rawJudges) ? 5 : Math.max(1, rawJudges);
        const maxFinalPairs = isNaN(rawFinal) ? 6 : Math.max(2, rawFinal);
        const rawFee = r[8] != null && r[8] !== "" ? Number(r[8]) : NaN;
        const entryFee = isNaN(rawFee) ? undefined : rawFee;
        const entryFeeCurrency = String(r[9] ?? "").trim() || undefined;
        try {
          await sectionsApi.create(id, {
            name,
            danceStyle,
            ageCategory: ageCategory as Parameters<typeof sectionsApi.create>[1]["ageCategory"],
            level: level as Parameters<typeof sectionsApi.create>[1]["level"],
            competitorType: competitorType as Parameters<typeof sectionsApi.create>[1]["competitorType"],
            competitionType: competitionType as Parameters<typeof sectionsApi.create>[1]["competitionType"],
            numberOfJudges,
            maxFinalPairs,
            orderIndex: 0,
            dances: [],
            entryFee,
            entryFeeCurrency,
          });
          imported++;
        } catch (err) {
          errors.push(`${name}: ${(err as { message?: string })?.message ?? "Chyba"}`);
        }
      }
      qc.invalidateQueries({ queryKey: ["sections", id] });
      setSectionsImportResult({ imported, skipped, errors });
    } catch (err) {
      setSectionsImportResult({ imported, skipped, errors: [(err as { message?: string })?.message ?? "Neznámá chyba"] });
    } finally {
      setSectionsImporting(false);
      e.target.value = "";
    }
  };

  const handleSectionsExport = async () => {
    const XLSX = await getXlsx();
    const rows = (sections ?? []).map((s) => ({
      "Název": s.name,
      "Styl": s.danceStyle ?? "",
      "Věková kategorie": s.ageCategory ?? "",
      "Úroveň": s.level ?? "",
      "Typ soutěžícího": s.competitorType ?? "",
      "Typ soutěže": s.competitionType ?? "",
      "Počet rozhodčích": s.numberOfJudges ?? "",
      "Max párů finále": s.maxFinalPairs ?? "",
      "Startovné": s.entryFee ?? "",
      "Měna": s.entryFeeCurrency ?? "",
      "Párů registrováno": s.registeredPairsCount ?? 0,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Kategorie");
    XLSX.writeFile(wb, `kategorie-${competition?.name ?? id}.xlsx`);
  };

  const handlePairsExport = async () => {
    const XLSX = await getXlsx();
    // Format matches handleXlsxImport expectations:
    // r[0]=externalSectionId, r[1]=externalCompetitorId, r[2]=startNumber,
    // r[3]=sectionName, r[4]=firstName1, r[5]=lastName1, r[6]=firstName2, r[7]=lastName2,
    // r[8]=country, r[9]=club, r[16]=starts(1/0)
    const rows = (pairs ?? []).map((pair) => {
      const sectionId = pair.sectionId ?? pair.sections?.[0]?.sectionId;
      const section = sections?.find((s) => s.id === sectionId);
      const sectionName = section?.name ?? pair.sections?.[0]?.sectionName ?? "";
      const firstName1 = pair.dancer1FirstName ?? (pair.dancer1Name ?? "").split(" ")[0] ?? "";
      const lastName1 = pair.dancer1LastName ?? (pair.dancer1Name ?? "").split(" ").slice(1).join(" ") ?? "";
      const firstName2 = pair.dancer2FirstName ?? (pair.dancer2Name ?? "").split(" ")[0] ?? "";
      const lastName2 = pair.dancer2LastName ?? (pair.dancer2Name ?? "").split(" ").slice(1).join(" ") ?? "";
      return [
        sectionId ?? "",                                   // r[0]  externalSectionId
        pair.externalId ?? "",                             // r[1]  externalCompetitorId
        String(pair.startNumber ?? "").padStart(3, "0"),   // r[2]  startNumber
        sectionName,                                       // r[3]  sectionName
        firstName1,                                        // r[4]  firstName1
        lastName1,                                         // r[5]  lastName1
        firstName2,                                        // r[6]  firstName2
        lastName2,                                         // r[7]  lastName2
        pair.country ?? "",                                // r[8]  country
        pair.dancer1Club ?? pair.club ?? "",               // r[9]  club
        "", "", "", "", "",                                // r[10-13] unused
        "",                                                // r[14] feePerPerson
        "",                                                // r[15] feeTotal
        "1",                                               // r[16] starts
        "",                                                // r[17] unused
        "",                                                // r[18] startType
        "",                                                // r[19] startsFromRound
        pair.classValue ?? "",                             // r[20] classValue
        pair.email ?? "",                                  // r[21] email
        pair.paymentStatus ?? "",                          // r[22] paymentStatus
      ];
    });
    const header = [
      "ID kategorie", "ID páru", "Startovní číslo", "Kategorie",
      "Jméno 1", "Příjmení 1", "Jméno 2", "Příjmení 2",
      "Země", "Klub", "", "", "", "", "Startovné/os", "Startovné celkem",
      "Startuje", "", "Typ startu", "Od kola", "Třída",
      "Email", "Platba",
    ];
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Páry");
    XLSX.writeFile(wb, `pary-${competition?.name ?? id}.xlsx`);
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      </AppShell>
    );
  }

  if (!competition) return null;

  return (
    <AppShell>
      <Suspense>
        <NewCompetitionModal id={id} />
      </Suspense>

      <DeleteConfirmDialog
        open={showDeleteDialog}
        name={competition.name}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />

      <PageHeader
        title={competition.name}
        description={`${competition.venue} · ${formatDate(competition.eventDate)}`}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">{t("competitionDetail.overview")}</TabsTrigger>
          <TabsTrigger value="sections">Kategorie</TabsTrigger>
          <TabsTrigger value="pairs">{t("competitionDetail.pairs")}</TabsTrigger>
          <TabsTrigger value="judges">{t("competitionDetail.judges")}</TabsTrigger>
          <TabsTrigger value="analytics">Vyhodnocení</TabsTrigger>
          <TabsTrigger value="content">{t("competitionDetail.content")}</TabsTrigger>
          <TabsTrigger value="settings">{t("competitionDetail.settings")}</TabsTrigger>
          <TabsTrigger value="schedule" onClick={() => router.push(`/dashboard/competitions/${id}/schedule`)}>
            Harmonogram
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {/* Main card: status + URL + action buttons */}
          <Card className="mb-6">
            <CardContent className="pt-5">
              <div className="mb-4">
                {competition.registrationOpen ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-sm font-medium text-white">
                    <CheckCircle2 className="h-4 w-4" /> {t("competitionDetail.registrationOpen")}
                  </span>
                ) : (
                  <Badge variant={statusColors[competition.status]}>{t(`status.${competition.status}`)}</Badge>
                )}
              </div>
              <p className="mb-3 truncate text-sm text-[var(--text-secondary)]">
                {typeof window !== "undefined" ? window.location.host : "dancecomp.com"}/competitions/{id}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const url = `${window.location.origin}/competitions/${id}`;
                    navigator.clipboard.writeText(url);
                    toast({ title: t("judges.linkCopied") } as Parameters<typeof toast>[0]);
                  }}
                >
                  <Copy className="h-3.5 w-3.5" /> {t("competitionDetail.copyLink")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(`/competitions/${id}`, "_blank")}
                >
                  <ExternalLink className="h-3.5 w-3.5" /> {t("competitionDetail.openLink")}
                </Button>
                <div className="h-4 w-px bg-[var(--border)] mx-1" />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateCompetition.mutate({ registrationOpen: !competition.registrationOpen })}
                  loading={updateCompetition.isPending}
                >
                  <PlayCircle className="h-4 w-4" />
                  {competition.registrationOpen ? t("competitionDetail.closeRegistration") : t("competitionDetail.openRegistration")}
                </Button>
                <button
                  onClick={() => router.push(`/dashboard/competitions/${id}/presence`)}
                  className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-3 py-1.5 text-sm transition-colors"
                >
                  <ClipboardCheck className="h-4 w-4" />
                  {t("competitionDetail.openCheckIn")}
                </button>
                <button
                  onClick={() => router.push(`/dashboard/competitions/${id}/live`)}
                  className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent)] hover:opacity-90 text-white font-semibold px-3 py-1.5 text-sm transition-opacity"
                >
                  <PlayCircle className="h-4 w-4" />
                  Spustit soutěž
                </button>
              </div>
            </CardContent>
          </Card>

          {/* 3 stat cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-4">
                <div className="mb-1 flex items-center gap-1.5 text-[var(--text-secondary)]">
                  <Users className="h-4 w-4" />
                  <span className="text-sm">{t("competitionDetail.pairs")}</span>
                </div>
                <p className="mb-3 text-3xl font-bold">{competition.registeredPairsCount ?? 0}</p>
                <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => setTab("pairs")}>
                  {t("competitionDetail.showPairs")}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="mb-1 flex items-center gap-1.5 text-[var(--text-secondary)]">
                  <Layers className="h-4 w-4" />
                  <span className="text-sm">Kategorie</span>
                </div>
                <p className="mb-3 text-3xl font-bold">{sections?.length ?? 0}</p>
                <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => router.push(`/dashboard/competitions/${id}/sections/new`)}>
                  <Plus className="h-3.5 w-3.5" /> Přidat kategorii
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="mb-1 flex items-center gap-1.5 text-[var(--text-secondary)]">
                  <UserCircle2 className="h-4 w-4" />
                  <span className="text-sm">{t("competitionDetail.judges")}</span>
                </div>
                <p className="mb-3 text-3xl font-bold">{judgeTokens.length}</p>
                <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => setTab("judges")}>
                  <Pencil className="h-3.5 w-3.5" /> {t("competitionDetail.manageJudges")}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sections">
          <div className="flex flex-col gap-3">
            <div className="flex justify-end gap-2">
              <input ref={sectionsImportRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleSectionsImport} />
              <Button
                size="sm"
                variant="outline"
                onClick={() => sectionsImportRef.current?.click()}
                loading={sectionsImporting}
                title="Import kategorií z Excel souboru (sloupce: Název, Styl, Věková kategorie, Úroveň, Typ soutěžícího, Typ soutěže, Počet rozhodčích, Max párů finále, Startovné, Měna)"
              >
                <Sheet className="h-4 w-4" />
                Import kategorií XLSX
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSectionsExport}
                title="Export kategorií do Excel souboru"
              >
                <Download className="h-4 w-4" />
                Export kategorií XLSX
              </Button>
              <Button
                size="sm"
                onClick={() => router.push(`/dashboard/competitions/${id}/sections/new`)}
              >
                <Trophy className="h-4 w-4" />
                {t("section.new")}
              </Button>
            </div>
            {!sections?.length && (
              <p className="py-12 text-center text-sm text-[var(--text-secondary)]">
                {t("section.noSections")}
              </p>
            )}
            {sections?.map((section) => (
              <Card
                key={section.id}
                className="cursor-pointer hover:shadow-sm"
                onClick={() =>
                  router.push(`/dashboard/competitions/${id}/sections/${section.id}`)
                }
              >
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium text-sm">{section.name}</p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {section.ageCategory} · {section.level} · {section.danceStyle} ·{" "}
                      {section.dances.length} {t("competitionDetail.dances")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-[var(--text-secondary)]">
                      {section.registeredPairsCount} {t("competitionDetail.pairsLabel")}
                    </span>
                    <Badge variant="secondary">{section.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="pairs">
          {/* Registration stats */}
          {(() => {
            const total = pairs?.length ?? 0;
            const paid = pairs?.filter((p) => p.paymentStatus === "PAID" || p.paymentStatus === "WAIVED").length ?? 0;
            const pending = pairs?.filter((p) => p.paymentStatus === "PENDING").length ?? 0;
            const maxPairs = competition.maxPairs;
            const capacityPct = maxPairs ? Math.min(100, Math.round((total / maxPairs) * 100)) : null;
            const spotsLeft = maxPairs ? maxPairs - total : null;
            return (
              <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                      <Users className="h-4 w-4" /> {t("competitionDetail.totalRegistered")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{total}</p>
                    {maxPairs && <p className="text-xs text-[var(--text-tertiary)]">{t("competitionDetail.ofMax", { max: maxPairs })}</p>}
                  </CardContent>
                </Card>
                <Card className="">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                      <CreditCard className="h-4 w-4" /> {t("competitionDetail.paidLabel")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{paid}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">{total > 0 ? Math.round((paid / total) * 100) : 0}% {t("common.of")} {t("common.pairs")}</p>
                  </CardContent>
                </Card>
                <Card className="">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                      <Clock className="h-4 w-4" /> {t("competitionDetail.pendingPayment")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{pending}</p>
                  </CardContent>
                </Card>
                {maxPairs && (
                  <Card className="sm:col-span-2 lg:col-span-4">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs text-[var(--text-secondary)]">{t("competitionDetail.capacity")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-end gap-2">
                        <p className="text-2xl font-bold">{capacityPct}%</p>
                        {spotsLeft !== null && spotsLeft > 0 && (
                          <p className="mb-0.5 text-xs text-[var(--text-tertiary)]">{t("competitionDetail.capacityLeft", { count: spotsLeft })}</p>
                        )}
                      </div>
                      <Progress value={capacityPct ?? 0} className="mt-2 h-1.5" />
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })()}
          {/* Summary stats bar */}
          {(() => {
            const total = pairs?.length ?? 0;
            const duos = pairs?.filter((p) => {
              const d2 = p.dancer2FirstName ?? p.dancer2Name ?? "";
              return d2.trim().length > 0;
            }).length ?? 0;
            const solos = total - duos;
            const competitors = duos * 2 + solos;
            return (
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold" style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)" }}>
                  Soutěžící: {competitors}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold" style={{ background: "color-mix(in srgb, #bf5af2 15%, transparent)", color: "#bf5af2" }}>
                  Unikátních: {competitors}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold" style={{ background: "color-mix(in srgb, var(--success) 15%, transparent)", color: "var(--success)" }}>
                  Párů: {total}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold" style={{ background: "color-mix(in srgb, #ff9f0a 15%, transparent)", color: "#ff9f0a" }}>
                  Duí: {duos}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold" style={{ background: "color-mix(in srgb, var(--destructive) 15%, transparent)", color: "var(--destructive)" }}>
                  Jednotlivců: {solos}
                </span>
              </div>
            );
          })()}
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm text-[var(--text-secondary)]">
              {t("pairs.registered", { count: String(pairs?.length ?? 0) })}
            </p>
            <div className="flex items-center gap-2">
              <input ref={xlsxFileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleXlsxImport} />
              <Button size="sm" variant="outline" onClick={() => xlsxFileRef.current?.click()} loading={xlsxImporting} title="Import párů z Excel souboru">
                <Sheet className="h-4 w-4" />
                Import XLSX
              </Button>
              <Button size="sm" variant="outline" onClick={handlePairsExport} title="Export párů do Excel souboru">
                <Download className="h-4 w-4" />
                Export XLSX
              </Button>
            </div>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">#</TableHead>
                  <TableHead>Tančící</TableHead>
                  <TableHead>Kategorie</TableHead>
                  <TableHead>Klub</TableHead>
                  <TableHead>Platba</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!pairs?.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-[var(--text-secondary)]">
                      {t("pairs.noPairs")}
                    </TableCell>
                  </TableRow>
                )}
                {pairs?.map((pair) => {
                  const code = String(pair.startNumber).padStart(3, "0");
                  // Backend returns sections array; mock uses flat sectionId
                  const sectionId = pair.sectionId ?? pair.sections?.[0]?.sectionId;
                  const sectionName =
                    sections?.find((s) => s.id === sectionId)?.name ??
                    pair.sections?.[0]?.sectionName ??
                    null;
                  // Backend returns club as single field; mock splits into dancer1Club/dancer2Club
                  const clubDisplay = pair.dancer1Club ?? pair.club ?? pair.dancer2Club ?? null;
                  const dancer1 = pair.dancer1FirstName && pair.dancer1LastName
                    ? `${pair.dancer1FirstName} ${pair.dancer1LastName}`
                    : pair.dancer1Name ?? "";
                  const dancer2 = pair.dancer2FirstName && pair.dancer2LastName
                    ? `${pair.dancer2FirstName} ${pair.dancer2LastName}`
                    : pair.dancer2Name ?? "";
                  return (
                    <TableRow key={pair.id}>
                      <TableCell>
                        <code className="rounded-md bg-[var(--surface-secondary)] px-2.5 py-1 font-mono text-base font-bold tracking-widest text-[var(--text-primary)]">
                          {code}
                        </code>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-sm">{dancer1}</p>
                        {dancer2 && (
                          <p className="text-sm text-[var(--text-secondary)]">{dancer2}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        {sectionName ? (
                          <Badge variant="secondary" className="whitespace-nowrap text-xs">{sectionName}</Badge>
                        ) : (
                          <span className="text-xs text-[var(--text-tertiary)]">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {clubDisplay ? (
                          <span className="text-sm text-[var(--text-secondary)]">{clubDisplay}</span>
                        ) : (
                          <span className="text-xs text-[var(--text-tertiary)]">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            pair.paymentStatus === "PAID" ? "success"
                            : pair.paymentStatus === "WAIVED" ? "secondary"
                            : "warning"
                          }
                        >
                          {pair.paymentStatus}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

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
                    <p className="font-medium text-[var(--destructive)]">✗ Chyby ({xlsxResult.errors.length}):</p>
                    <ul className="mt-1 max-h-40 overflow-y-auto rounded border border-[var(--border)] bg-[var(--surface-secondary)] p-2 text-xs space-y-1">
                      {xlsxResult.errors.map((e, i) => <li key={i} className="text-[var(--destructive)]">{e}</li>)}
                    </ul>
                  </div>
                )}
              </div>
              <div className="mt-2 flex justify-end">
                <Button onClick={() => setXlsxResult(null)}>Zavřít</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {sectionsImportResult && (
          <Dialog open onOpenChange={() => setSectionsImportResult(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sheet className="h-5 w-5 text-[var(--accent)]" />
                  Výsledek importu kategorií XLSX
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <p className="text-[var(--success-text)]">✓ Importováno: <strong>{sectionsImportResult.imported}</strong></p>
                {sectionsImportResult.skipped > 0 && <p className="text-[var(--text-secondary)]">↷ Přeskočeno: {sectionsImportResult.skipped}</p>}
                {sectionsImportResult.errors.length > 0 && (
                  <div>
                    <p className="font-medium text-[var(--destructive)]">✗ Chyby ({sectionsImportResult.errors.length}):</p>
                    <ul className="mt-1 max-h-40 overflow-y-auto rounded border border-[var(--border)] bg-[var(--surface-secondary)] p-2 text-xs space-y-1">
                      {sectionsImportResult.errors.map((e, i) => <li key={i} className="text-[var(--destructive)]">{e}</li>)}
                    </ul>
                  </div>
                )}
              </div>
              <div className="mt-2 flex justify-end">
                <Button onClick={() => setSectionsImportResult(null)}>Zavřít</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        <TabsContent value="judges">
          <JudgesTab competitionId={id} />
        </TabsContent>

        <TabsContent value="analytics">
          <VyhodnoceniTab
            competitionId={id}
            sections={sections ?? []}
            pairs={pairs ?? []}
          />
        </TabsContent>

        {/* ── Content pages tab ─────────────────────────────────────── */}
        <TabsContent value="content">
          <div className="flex flex-col gap-4">
            <p className="text-sm text-[var(--text-secondary)]">
              {t("competitionDetail.contentPageDesc")}
            </p>
            <Card>
              <CardContent className="flex flex-col gap-4 pt-5">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold">{t("competitionDetail.generalDesc")}</p>
                    {contentSaved && (
                      <span className="flex items-center gap-1 text-xs text-[var(--success,#30d158)]">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Uloženo
                      </span>
                    )}
                  </div>
                  <p className="mb-2 text-xs text-[var(--text-secondary)]">
                    {t("competitionDetail.generalDescSub")}
                  </p>
                  <Textarea
                    rows={5}
                    value={contentDescription}
                    onChange={(e) => {
                      setContentDescription(e.target.value);
                      scheduleContentSave({ contentDescription: e.target.value });
                    }}
                  />
                </div>

                <Separator />

                {/* ── Aktuality subsection ─────────────────────────────── */}
                <div>
                  <p className="mb-1 text-sm font-semibold">{t("competition.tabs.news", { count: String(newsItems.length) })}</p>
                  <div className="flex flex-col gap-3">
                    <Card className="border-[var(--border)]">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <Plus className="h-4 w-4" /> {t("news.add")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-3">
                        <Input
                          label={t("news.titleLabel")}
                          placeholder={t("news.titlePlaceholder")}
                          value={newNewsTitle}
                          onChange={(e) => setNewNewsTitle(e.target.value)}
                        />
                        <Textarea
                          label={t("news.contentLabel")}
                          placeholder={t("news.contentPlaceholder")}
                          rows={4}
                          value={newNewsContent}
                          onChange={(e) => setNewNewsContent(e.target.value)}
                        />
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            onClick={() => addNews.mutate()}
                            loading={addNews.isPending}
                            disabled={!newNewsTitle.trim() || !newNewsContent.trim()}
                          >
                            <Newspaper className="h-4 w-4" />
                            {t("news.add")}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {newsItems.length === 0 ? (
                      <p className="py-4 text-center text-sm text-[var(--text-secondary)]">
                        {t("news.noNews")}
                      </p>
                    ) : (
                      newsItems.map((item: CompetitionNewsItem) => (
                        <Card key={item.id} className="border-[var(--border)]">
                          <CardContent className="flex items-start justify-between gap-4 py-4">
                            <div className="flex-1">
                              <p className="text-xs text-[var(--text-tertiary)]">
                                {new Date(item.publishedAt).toLocaleDateString("en-GB", {
                                  day: "numeric", month: "long", year: "numeric",
                                })}
                              </p>
                              <p className="font-medium text-[var(--text-primary)]">{item.title}</p>
                              <p className="mt-1 text-sm text-[var(--text-secondary)]">{item.content}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => deleteNews.mutate(item.id)}
                            >
                              <Trash2 className="h-4 w-4 text-[var(--destructive)]" />
                            </Button>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <div className="flex flex-col gap-4">
            {/* Contact & rules */}
            <Card>
              <CardContent className="flex flex-col gap-4 pt-5">
                <div>
                  <p className="mb-1 text-sm font-medium text-[var(--text-primary)]">{t("competition.settings.contactEmail")}</p>
                  <p className="mb-2 text-xs text-[var(--text-secondary)]">
                    {t("competition.settings.contactEmailDesc")}
                  </p>
                  <Input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => { setContactEmail(e.target.value); scheduleSave({ contactEmail: e.target.value }); }}
                    placeholder="info@yourcompetition.com"
                  />
                </div>

                <Separator />

                <div>
                  <p className="mb-1 text-sm font-medium text-[var(--text-primary)]">{t("competitionDetail.paymentMethodLabel")}</p>
                  <p className="mb-2 text-xs text-[var(--text-secondary)]">
                    {t("competitionDetail.paymentMethodDesc")}
                  </p>
                  <Select value={paymentMethod} onValueChange={(v) => {
                    setPaymentMethod(v as PaymentMethodType);
                    updateCompetition.mutate({ paymentMethod: v as PaymentMethodType });
                  }}>
                    <SelectTrigger className="w-72">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PAY_AT_VENUE">{t("competitionDetail.payAtVenue")}</SelectItem>
                      <SelectItem value="ORGANIZER_WEBSITE">{t("competitionDetail.organizerWebsite")}</SelectItem>
                      <SelectItem value="BANK_TRANSFER">{t("competitionDetail.bankTransfer")}</SelectItem>
                      <SelectItem value="STRIPE">{t("competitionDetail.stripe")}</SelectItem>
                      <SelectItem value="OTHER">{t("competitionDetail.otherMethod")}</SelectItem>
                    </SelectContent>
                  </Select>

                  {paymentMethod === "BANK_TRANSFER" && (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <Input label={t("competitionDetail.bankHolder")} value={bankHolder} onChange={(e) => { setBankHolder(e.target.value); scheduleSave({ paymentConfig: { iban: bankIban, bic: bankBic, holder: e.target.value, address: bankAddress } }); }} />
                      <Input label={t("competitionDetail.bankIban")} value={bankIban} onChange={(e) => { setBankIban(e.target.value); scheduleSave({ paymentConfig: { iban: e.target.value, bic: bankBic, holder: bankHolder, address: bankAddress } }); }} placeholder="SK89 0900 0000 0051..." />
                      <Input label={t("competitionDetail.bankBic")} value={bankBic} onChange={(e) => { setBankBic(e.target.value); scheduleSave({ paymentConfig: { iban: bankIban, bic: e.target.value, holder: bankHolder, address: bankAddress } }); }} placeholder="GIBASKBX" />
                      <Input label={t("competitionDetail.bankAddress")} value={bankAddress} onChange={(e) => { setBankAddress(e.target.value); scheduleSave({ paymentConfig: { iban: bankIban, bic: bankBic, holder: bankHolder, address: e.target.value } }); }} />
                    </div>
                  )}
                  {paymentMethod === "ORGANIZER_WEBSITE" && (
                    <div className="mt-3">
                      <Input label={t("competitionDetail.paymentUrl")} value={orgWebsiteUrl} onChange={(e) => { setOrgWebsiteUrl(e.target.value); scheduleSave({ paymentConfig: { url: e.target.value } }); }} placeholder="https://..." />
                    </div>
                  )}
                  {paymentMethod === "STRIPE" && (
                    <div className="mt-3">
                      <Input label={t("competitionDetail.stripeKey")} value={stripeKey} onChange={(e) => { setStripeKey(e.target.value); scheduleSave({ paymentConfig: { apiKey: e.target.value } }); }} placeholder="sk_live_..." />
                    </div>
                  )}
                </div>

                <Separator />

                <div>
                  <p className="mb-1 text-sm font-medium text-[var(--text-primary)]">
                    <FileText className="mr-1 inline-block h-4 w-4" />
                    {t("competition.settings.rules")}
                  </p>
                  <p className="mb-2 text-xs text-[var(--text-secondary)]">
                    {t("competition.settings.rulesDesc")}
                  </p>
                  <Textarea
                    rows={6}
                    value={propoziceText}
                    onChange={(e) => { setPropoziceText(e.target.value); scheduleSave({ propozice: e.target.value }); }}
                    placeholder={t("competition.settings.rulesPlaceholder")}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Pairs visibility */}
            <Card>
              <CardContent className="flex flex-col gap-4 pt-5">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{t("competition.settings.pairsVisibility")}</p>
                  <p className="mb-2 text-xs text-[var(--text-secondary)]">
                    {t("competition.settings.pairsVisibilityDesc")}
                  </p>
                  <Select
                    value={competition.pairsVisibility ?? "HIDDEN"}
                    onValueChange={(v) =>
                      updateCompetition.mutate({ pairsVisibility: v as PairsVisibility })
                    }
                  >
                    <SelectTrigger className="w-56">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PUBLIC">{t("competition.settings.visibilityPublic")}</SelectItem>
                      <SelectItem value="PRIVATE">{t("competition.settings.visibilityPrivate")}</SelectItem>
                      <SelectItem value="HIDDEN">{t("competition.settings.visibilityHidden")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{t("competition.settings.publicPage")}</p>
                  <p className="mb-2 text-xs text-[var(--text-secondary)]">
                    {t("competition.settings.publicPageDesc")}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      window.open(`/competitions/${competition.id}`, "_blank")
                    }
                  >
                    <ExternalLink className="h-4 w-4" />
                    {t("competition.openPublicPage")}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Technical */}
            <Card>
              <CardContent className="flex flex-col gap-4 pt-5">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{t("competition.settings.competitionId")}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="rounded bg-[var(--surface-secondary)] px-2 py-1 text-xs">
                      {competition.id}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => {
                        navigator.clipboard.writeText(competition.id);
                        toast({ title: t("judges.linkCopied") } as Parameters<typeof toast>[0]);
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="mb-1 text-sm font-medium text-[var(--destructive)]">{t("competition.settings.dangerZone")}</p>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    {t("competition.settings.deleteCompetition")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
