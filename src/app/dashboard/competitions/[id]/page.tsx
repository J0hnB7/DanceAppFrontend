"use client";

import React, { use, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Trophy,
  PlayCircle,
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
  Layers,
  Sheet,
  Download,
  Settings,
  Mail,
  Send,
  Pencil,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { CompetitionSidebar } from "@/components/layout/competition-sidebar";
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
import { formatDate, safeQrImageSrc } from "@/lib/utils";
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
import { scheduleApi } from "@/lib/api/schedule";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useLocale } from "@/contexts/locale-context";
import { LaunchCompetitionDialog } from "@/components/competition/launch-competition-dialog";
import { SimpleDialog } from "@/components/ui/dialog";
import { notificationsApi } from "@/lib/api/notifications";
import { fetchActivityFeed, type ActivityEvent } from "@/lib/api/activity";


function renderActivityText(event: ActivityEvent, t: (key: string, params?: Record<string, string | number>) => string): React.ReactNode {
  const meta: Record<string, unknown> = event.metadata ? JSON.parse(event.metadata) : {};
  switch (event.eventType) {
    case "ROUND_STARTED":
      return <><strong className="font-semibold text-[var(--text-primary)]">{t("competitionDetail.checklistCompetitionStarted").split(" ")[0]}</strong> {t("competitionDetail.activityRoundStarted", { roundType: String(meta.roundType ?? ""), danceStyle: String(meta.danceStyle ?? ""), ageCategory: String(meta.ageCategory ?? "") })}</>;
    case "ROUND_CLOSED":
      return <><strong className="font-semibold text-[var(--text-primary)]">{t("competitionDetail.checklistCompetitionStarted").split(" ")[0]}</strong> {t("competitionDetail.activityRoundClosed", { roundType: String(meta.roundType ?? ""), danceStyle: String(meta.danceStyle ?? ""), ageCategory: String(meta.ageCategory ?? "") })}</>;
    case "RESULTS_PUBLISHED":
      return <><strong className="font-semibold text-[var(--text-primary)]">{t("competitionDetail.checklistResultsPublished").split(" ")[0]}</strong> {t("competitionDetail.activityResultsPublished", { roundType: String(meta.roundType ?? ""), danceStyle: String(meta.danceStyle ?? "") })}</>;
    case "JUDGE_CONNECTED":
      return <><strong className="font-semibold text-[var(--text-primary)]">{t("competitionDetail.judgesLabel")}</strong> {t("competitionDetail.activityJudgeConnected")}</>;
    case "PAIR_REGISTERED":
      return <><strong className="font-semibold text-[var(--text-primary)]">{t("competitionDetail.registrationLabel")}</strong> {t("competitionDetail.activityPairRegistered", { startNumber: String(meta.startNumber ?? ""), dancer1Name: String(meta.dancer1Name ?? "") })}</>;
    case "PAIR_PUBLIC_REGISTERED":
      return <><strong className="font-semibold text-[var(--text-primary)]">{t("competitionDetail.registrationLabel")}</strong> {t("competitionDetail.activityPairPublicRegistered", { startNumber: String(meta.startNumber ?? ""), dancer1Name: String(meta.dancer1Name ?? "") })}</>;
    case "PAIR_WITHDRAWN":
      return <><strong className="font-semibold text-[var(--text-primary)]">{t("competitionDetail.registrationLabel")}</strong> {t("competitionDetail.activityPairWithdrawn", { startNumber: String(meta.startNumber ?? "") })}</>;
    case "CHECKIN_OPENED":
      return <><strong className="font-semibold text-[var(--text-primary)]">Check-in</strong> {t("competitionDetail.activityCheckinOpened")}</>;
    case "CHECKIN_CLOSED":
      return <><strong className="font-semibold text-[var(--text-primary)]">Check-in</strong> {t("competitionDetail.activityCheckinClosed")}</>;
    case "COMPETITION_STARTED":
      return <><strong className="font-semibold text-[var(--text-primary)]">{t("competitionDetail.checklistCompetitionStarted").split(" ")[0]}</strong> {t("competitionDetail.activityCompetitionStarted")}</>;
    case "COMPETITION_COMPLETED":
      return <><strong className="font-semibold text-[var(--text-primary)]">{t("competitionDetail.checklistCompetitionStarted").split(" ")[0]}</strong> {t("competitionDetail.activityCompetitionCompleted")}</>;
    default:
      return <span>{event.eventType}</span>;
  }
}

const statusColors: Record<CompetitionStatus, "default" | "secondary" | "success" | "warning" | "destructive" | "outline"> = {
  DRAFT: "secondary",
  PUBLISHED: "outline",
  IN_PROGRESS: "warning",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
};

// Reads ?tab= from URL and sets initial tab state
function TabInitializer({ onTab }: { onTab: (tab: string) => void }) {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  useEffect(() => {
    if (tab) onTab(tab);
  }, [tab, onTab]);
  return null;
}

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
    toast({ title: t("judges.linkCopied") });
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
  const qc = useQueryClient();
  const cancelStartMutation = useMutation({
    mutationFn: () => competitionsApi.cancelStart(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["competition", id] });
      toast({ title: "Start soutěže zrušen", variant: "success" });
    },
    onError: () => toast({ title: "Nelze zrušit start", variant: "destructive" }),
  });

  const completeMutation = useMutation({
    mutationFn: () => competitionsApi.complete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["competition", id] });
      toast({ title: "Soutěž uzavřena, výsledky jsou zveřejněny", variant: "success" });
    },
    onError: () => toast({ title: "Nepodařilo se uzavřít soutěž", variant: "destructive" }),
  });

  const [tab, setTab] = useState("overview");
  const [launchDialogOpen, setLaunchDialogOpen] = useState(false);
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
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEventDate, setEditEventDate] = useState("");
  const [editVenue, setEditVenue] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [contentDescription, setContentDescription] = useState("");
  const [contentSaved, setContentSaved] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("PAY_AT_VENUE");
  const [bankIban, setBankIban] = useState("");
  const [bankBic, setBankBic] = useState("");
  const [bankHolder, setBankHolder] = useState("");
  const [bankAddress, setBankAddress] = useState("");
  const [bankQrCode, setBankQrCode] = useState("");
  const [stripeKey, setStripeKey] = useState("");
  const [orgWebsiteUrl, setOrgWebsiteUrl] = useState("");

  // Bulk email dialog
  const [bulkEmailOpen, setBulkEmailOpen] = useState(false);
  const [bulkEmailSubject, setBulkEmailSubject] = useState("");
  const [bulkEmailBody, setBulkEmailBody] = useState("");
  const bulkEmailSend = useMutation({
    mutationFn: () =>
      notificationsApi.send(id, {
        subject: bulkEmailSubject,
        body: bulkEmailBody,
        recipientType: "ALL_PAIRS",
      }),
    onSuccess: () => {
      toast({ title: "E-mail odeslán všem soutěžícím", variant: "success" });
      setBulkEmailOpen(false);
      setBulkEmailSubject("");
      setBulkEmailBody("");
      qc.invalidateQueries({ queryKey: ["notifications", id] });
    },
    onError: () => {
      toast({ title: "Odeslání se nezdařilo", variant: "destructive" });
    },
  });

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

  const { data: scheduleStatus } = useQuery({
    queryKey: ["schedule-status", id],
    queryFn: () => scheduleApi.getStatus(id),
    enabled: !!id,
    retry: false,
  });

  const { data: activityEvents = [] } = useQuery({
    queryKey: ["activity", id],
    queryFn: () => fetchActivityFeed(id),
    refetchInterval: 30_000,
  });

  const addNews = useMutation({
    mutationFn: () => competitionsApi.createNews(id, { title: newNewsTitle, content: newNewsContent }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["competition-news", id] });
      setNewNewsTitle("");
      setNewNewsContent("");
      toast({ title: t("news.published") });
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
      setBankQrCode(pc.qrCode ?? "");
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

  const handleEditSave = async () => {
    try {
      await updateCompetition.mutateAsync({
        name: editName || undefined,
        eventDate: editEventDate || undefined,
        venue: editVenue || undefined,
        registrationDeadline: editDeadline || undefined,
      });
      setShowEditDialog(false);
      toast({ title: "Základní info aktualizováno", variant: "success" });
    } catch {
      toast({ title: "Chyba při ukládání", variant: "destructive" });
    }
  };

  const openEditDialog = () => {
    setEditName(competition?.name ?? "");
    setEditEventDate(competition?.eventDate ?? "");
    setEditVenue(competition?.venue ?? "");
    setEditDeadline(competition?.registrationDeadline ? competition.registrationDeadline.slice(0, 16) : "");
    setShowEditDialog(true);
  };

  const [deleting, setDeleting] = useState(false);
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await competitionsApi.delete(id);
    } catch {
      toast({ title: t("competitionDetail.deleteFailed"), variant: "destructive" });
      setDeleting(false);
      return;
    }
    router.push("/dashboard");
  };

  const handlePublish = async () => {
    await competitionsApi.publish(id);
    toast({ title: t("competition.published"), variant: "success" });
  };

  const handleXlsxImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setXlsxImporting(true);
    let skipped = 0;
    try {
      const { default: readXlsxFile } = await import("read-excel-file/browser");
      const rows = await readXlsxFile(file);
      const dataRows = rows.slice(1).filter((r) => r[4]);

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
      const { default: readXlsxFile } = await import("read-excel-file/browser");
      // Columns: Název(0), Styl(1), Věková kategorie(2), Úroveň(3), Typ soutěžícího(4), Typ soutěže(5), Počet rozhodčích(6), Max párů finále(7), Startovné(8), Měna(9)
      const rows = await readXlsxFile(file);
      const dataRows = rows.slice(1).filter((r) => r[0]);

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
          errors.push(`${name}: ${(err as { message?: string })?.message ?? t("competitionDetail.error")}`);
        }
      }
      qc.invalidateQueries({ queryKey: ["sections", id] });
      setSectionsImportResult({ imported, skipped, errors });
    } catch (err) {
      setSectionsImportResult({ imported, skipped, errors: [(err as { message?: string })?.message ?? t("competitionDetail.unknownError")] });
    } finally {
      setSectionsImporting(false);
      e.target.value = "";
    }
  };

  const handleSectionsExport = async () => {
    const { default: writeXlsxFile } = await import("write-excel-file/browser");
    const HEADERS = [
      t("competitionDetail.exportName"), t("competitionDetail.exportStyle"),
      t("competitionDetail.exportAgeCategory"), t("competitionDetail.exportLevel"),
      t("competitionDetail.exportCompetitorType"), t("competitionDetail.exportCompetitionType"),
      t("competitionDetail.exportJudgesCount"), t("competitionDetail.exportMaxFinalPairs"),
      t("competitionDetail.exportEntryFee"), t("competitionDetail.exportCurrency"),
      t("competitionDetail.exportRegisteredPairs"),
    ];
    const data = [
      HEADERS.map((h) => ({ value: h, fontWeight: "bold" as const })),
      ...(sections ?? []).map((s) => [
        { value: s.name ?? "" },
        { value: s.danceStyle ?? "" },
        { value: s.ageCategory ?? "" },
        { value: s.level ?? "" },
        { value: s.competitorType ?? "" },
        { value: s.competitionType ?? "" },
        { value: s.numberOfJudges ?? 0, type: Number },
        { value: s.maxFinalPairs ?? 0, type: Number },
        { value: s.entryFee ?? 0, type: Number },
        { value: s.entryFeeCurrency ?? "" },
        { value: s.registeredPairsCount ?? 0, type: Number },
      ]),
    ];
    await writeXlsxFile(data, {
      fileName: `kategorie-${competition?.name ?? id}.xlsx`,
      sheet: t("competitionDetail.exportSheetSections"),
    });
  };

  const handlePairsExport = async () => {
    const { default: writeXlsxFile } = await import("write-excel-file/browser");
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
        pair.athlete1Id ?? "",                             // r[10] ID competitora 1
        pair.athlete2Id ?? "",                             // r[11] ID competitora 2
        pair.registeredAt ? new Date(pair.registeredAt).toLocaleDateString("cs-CZ") : "", // r[12] Datum přihlášení
        pair.withdrawalDate ? new Date(pair.withdrawalDate).toLocaleDateString("cs-CZ") : "", // r[13] Datum odhlášení
        pair.feePerPerson ?? "",                           // r[14] feePerPerson
        pair.feeTotal ?? "",                               // r[15] feeTotal
        pair.starts === false ? "0" : "1",                 // r[16] starts
        pair.presenceDeadline ? new Date(pair.presenceDeadline).toLocaleDateString("cs-CZ") : "", // r[17] Konec prezence
        pair.startType ?? "",                              // r[18] startType
        pair.startsFromRound ?? "",                        // r[19] startsFromRound
        pair.classValue ?? "",                             // r[20] classValue
        pair.email ?? "",                                  // r[21] email
        pair.paymentStatus ?? "",                          // r[22] paymentStatus
      ];
    });
    const header = [
      t("competitionDetail.exportSectionId"), t("competitionDetail.exportPairId"), t("competitionDetail.exportStartNumber"), t("competitionDetail.exportSection"),
      t("competitionDetail.exportFirstName1"), t("competitionDetail.exportLastName1"), t("competitionDetail.exportFirstName2"), t("competitionDetail.exportLastName2"),
      t("competitionDetail.exportCountry"), t("competitionDetail.exportClub"), t("competitionDetail.exportCompetitor1Id"), t("competitionDetail.exportCompetitor2Id"), t("competitionDetail.exportRegistrationDate"), t("competitionDetail.exportWithdrawalDate"), t("competitionDetail.exportFeePerPerson"), t("competitionDetail.exportFeeTotal"),
      t("competitionDetail.exportStarts"), t("competitionDetail.exportPresenceEnd"), t("competitionDetail.exportStartType"), t("competitionDetail.exportFromRound"), t("competitionDetail.exportClass"),
      t("competitionDetail.exportEmail"), t("competitionDetail.exportPayment"),
    ];
    const data = [
      header.map((h) => ({ value: h, fontWeight: "bold" as const })),
      ...rows.map((row) => row.map((cell) => ({ value: cell ?? "" }))),
    ];
    await writeXlsxFile(data, {
      fileName: `pary-${competition?.name ?? id}.xlsx`,
      sheet: t("competitionDetail.exportSheetPairs"),
    });
  };

  if (isLoading) {
    return (
      <AppShell noPadding sidebar={
        <CompetitionSidebar competitionId={id} competitionName="..." />
      }>
        <div className="space-y-4 p-8">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      </AppShell>
    );
  }

  if (!competition) return null;

  const competitionSidebar = (
    <CompetitionSidebar
      competitionId={id}
      competitionName={competition.name}
    />
  );

  // Phase stepper logic
  const hasResultsPublished = activityEvents.some((e) => e.eventType === "RESULTS_PUBLISHED");
  const phases = [t("competitionDetail.phaseCreation"), t("competitionDetail.phaseRegistration"), t("competitionDetail.phaseCheckIn"), t("competitionDetail.phaseSchedule"), t("competitionDetail.phaseCompetition"), t("competitionDetail.phaseResults")];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDay = competition.eventDate ? new Date(competition.eventDate) : null;
  if (eventDay) eventDay.setHours(0, 0, 0, 0);
  const isEventDay = eventDay ? eventDay <= today : false;
  const anyPresenceClosed = (sections ?? []).some((s) => s.presenceClosed);
  const phasesDone = [
    true,
    competition.registrationOpen === true || (competition.registeredPairsCount ?? 0) > 0 || competition.status === "PUBLISHED" || competition.status === "IN_PROGRESS" || competition.status === "COMPLETED",
    anyPresenceClosed || isEventDay || competition.status === "IN_PROGRESS" || competition.status === "COMPLETED",
    scheduleStatus?.status === "PUBLISHED" || competition.status === "IN_PROGRESS" || competition.status === "COMPLETED",
    competition.status === "IN_PROGRESS" || competition.status === "COMPLETED" || hasResultsPublished,
    competition.status === "COMPLETED",
  ];
  let currentPhaseIdx = 0;
  for (let i = 0; i < phasesDone.length; i++) {
    if (phasesDone[i]) currentPhaseIdx = i;
  }

  // Checklist logic
  const judgesReady = judgeTokens.length > 0;
  const categoriesReady = (sections?.length ?? 0) > 0;
  const registrationWasOpen = competition.registrationOpen === true || (competition.registeredPairsCount ?? 0) > 0;
  const checkinReady = anyPresenceClosed || isEventDay || competition.status === "IN_PROGRESS" || competition.status === "COMPLETED";
  const isRunning = competition.status === "IN_PROGRESS" || competition.status === "COMPLETED" || hasResultsPublished;
  const resultsReady = competition.status === "COMPLETED";
  const schedulePublished = scheduleStatus?.status === "PUBLISHED";
  const checklistItems: { done: boolean; label: string; action?: () => void; actionLabel?: string }[] = [
    { done: true, label: t("competitionDetail.checklistCreated") },
    { done: registrationWasOpen, label: t("competitionDetail.checklistRegistrationOpen"), action: !registrationWasOpen ? () => updateCompetition.mutate({ registrationOpen: true }) : undefined, actionLabel: t("competitionDetail.actionOpen") },
    { done: judgesReady, label: `${t("competitionDetail.checklistJudgesAssigned")}${judgesReady ? ` (${judgeTokens.length})` : ""}`, action: !judgesReady ? () => router.push(`/dashboard/competitions/${id}/judges`) : undefined, actionLabel: t("competitionDetail.actionAdd") },
    { done: categoriesReady, label: `${t("competitionDetail.checklistSectionsAdded")}${categoriesReady ? ` (${sections?.length})` : ""}`, action: !categoriesReady ? () => router.push(`/dashboard/competitions/${id}/sections/new`) : undefined, actionLabel: t("competitionDetail.actionAdd") },
    { done: checkinReady, label: t("competitionDetail.checklistCheckInOpen"), action: !checkinReady ? () => router.push(`/dashboard/competitions/${id}/presence`) : undefined, actionLabel: t("competitionDetail.actionOpen") },
    { done: schedulePublished, label: t("competitionDetail.checklistScheduleReady"), action: !schedulePublished ? () => router.push(`/dashboard/competitions/${id}/schedule`) : undefined, actionLabel: t("competitionDetail.actionBuild") },
    { done: isRunning, label: t("competitionDetail.checklistCompetitionStarted"), action: !isRunning ? () => router.push(`/dashboard/competitions/${id}/live`) : undefined, actionLabel: t("competitionDetail.actionStart") },
    { done: resultsReady, label: t("competitionDetail.checklistResultsPublished"), action: !resultsReady && isRunning ? () => completeMutation.mutate() : undefined, actionLabel: t("competitionDetail.actionPublish") },
  ];
  const checklistDoneCount = checklistItems.filter((i) => i.done).length;

  return (
    <AppShell sidebar={competitionSidebar} noPadding>
      <Suspense>
        <NewCompetitionModal id={id} />
        <TabInitializer onTab={setTab} />
      </Suspense>

      <DeleteConfirmDialog
        open={showDeleteDialog}
        name={competition.name}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />

      <SimpleDialog
        open={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        title="Upravit základní info"
      >
        <div className="space-y-4 pt-1">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]" htmlFor="edit-name">Název soutěže</label>
            <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]" htmlFor="edit-date">Datum konání</label>
            <input id="edit-date" type="date" value={editEventDate} onChange={(e) => setEditEventDate(e.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-base text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]" htmlFor="edit-venue">Místo konání</label>
            <Input id="edit-venue" value={editVenue} onChange={(e) => setEditVenue(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]" htmlFor="edit-deadline">Uzávěrka přihlášek</label>
            <input id="edit-deadline" type="datetime-local" value={editDeadline} min={new Date().toISOString().slice(0, 16)} onChange={(e) => setEditDeadline(e.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-base text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Zrušit</Button>
            <Button onClick={handleEditSave} loading={updateCompetition.isPending}>Uložit</Button>
          </div>
        </div>
      </SimpleDialog>

      <LaunchCompetitionDialog
        competitionId={id}
        open={launchDialogOpen}
        onClose={() => setLaunchDialogOpen(false)}
      />

      <Tabs value={tab} onValueChange={setTab}>
        {/* ══ HERO ══ */}
        <div className="border-b border-[var(--border)] bg-[var(--surface)]">

          <div className="px-8 pb-5 pt-6 max-md:px-4">
            {/* Title row + badge */}
            <div className="mb-5 flex items-start justify-between gap-4 max-md:flex-col max-md:gap-3">
              <div>
                <div className="mb-1.5 flex items-center gap-2">
                  <h1 className="text-[22px] font-bold text-[var(--text-primary)] max-md:text-lg" style={{ fontFamily: "var(--font-sora)" }}>
                    {competition.name}
                  </h1>
                  <button
                    onClick={openEditDialog}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-tertiary)] transition-colors hover:bg-[var(--surface-secondary)] hover:text-[var(--text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border)]"
                    aria-label="Upravit základní info soutěže"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
                {/* Meta items with SVG icons */}
                <div className="flex flex-wrap gap-3 text-[13px] text-[var(--text-secondary)]">
                  {competition.venue && (
                    <span className="flex items-center gap-1">
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0" /><circle cx="12" cy="10" r="3" /></svg>
                      {competition.venue}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /></svg>
                    {formatDate(competition.eventDate)}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                    {t("competition.pairsCount", { count: competition.registeredPairsCount ?? 0 })}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" /><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" /><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" /></svg>
                    {t("competition.categoriesCount", { count: sections?.length ?? 0 })}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="5" /><path d="M20 21a8 8 0 0 0-16 0" /></svg>
                    {t("competition.judgesCount", { count: judgeTokens.length })}
                  </span>
                </div>
              </div>
              {/* Status badge */}
              {competition.registrationOpen && (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-100 px-3.5 py-1.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300" role="status">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse dark:bg-[#34D399]" />
                  {t("competitionDetail.registrationOpen")}
                </span>
              )}
            </div>

            {/* ══ STEPPER ══ */}
            <div className="overflow-x-auto max-md:[-webkit-overflow-scrolling:touch]" style={{ scrollbarWidth: "none" }}>
              <div className="flex items-start max-md:min-w-[520px] max-md:pb-1">
                {phases.map((label, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && (
                      <div
                        className="mt-3.5 h-0.5 flex-1 rounded-[1px] transition-colors duration-500"
                        style={{ background: i <= currentPhaseIdx ? "#3B82F6" : "var(--border)" }}
                      />
                    )}
                    <div className="flex flex-col items-center gap-1.5">
                      <div
                        className="flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all duration-500"
                        style={
                          i < currentPhaseIdx
                            ? { borderColor: "#3B82F6", background: "rgba(59,130,246,0.6)", color: "#fff" }
                            : i === currentPhaseIdx
                            ? { borderColor: "#3B82F6", background: "#3B82F6", color: "#fff", boxShadow: "0 0 12px rgba(59,130,246,0.5)" }
                            : { borderColor: "var(--border)", background: "var(--surface-secondary)" }
                        }
                      >
                        {i < currentPhaseIdx ? (
                          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        ) : i === currentPhaseIdx ? (
                          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                        ) : null}
                      </div>
                      <span
                        className="whitespace-nowrap text-[11px] transition-colors duration-500"
                        style={
                          i === currentPhaseIdx
                            ? { color: "var(--text-primary)", fontWeight: 600 }
                            : i < currentPhaseIdx
                            ? { color: "var(--text-secondary)" }
                            : { color: "var(--text-tertiary)" }
                        }
                      >
                        {label}
                      </span>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ══ CONTENT ══ */}
        <section className="px-8 pb-12 pt-9 max-md:px-4">

        <TabsContent value="overview">
          {/* ── Registration Card ── */}
          <div className="mb-5 rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-5" style={{ boxShadow: "var(--shadow-sm)" }}>
            <div className="mb-3 text-[13px] text-[var(--text-secondary)]">{t("competitionDetail.publicRegistrationLink")}</div>
            {/* URL row */}
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)] px-3 py-2.5">
              <svg className="h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
              <span className="flex-1 truncate text-[13px] text-[var(--text-secondary)]">
                {typeof window !== "undefined" ? window.location.host : "localhost:3000"}/competitions/{id}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0 gap-1 px-2.5 text-[13px]"
                onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/competitions/${id}`); toast({ title: t("judges.linkCopied") }); }}
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                {t("competitionDetail.copyLink")}
              </Button>
              <Button size="sm" variant="ghost" className="shrink-0 gap-1 px-2.5 text-[13px]" asChild>
                <a href={`/competitions/${id}`} target="_blank" rel="noopener noreferrer">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>
                  {t("competitionDetail.openLink")}
                </a>
              </Button>
            </div>
            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="muted"
                title="Uzavře registraci — noví soutěžící se nebudou moci přihlásit"
                onClick={() => updateCompetition.mutate({ registrationOpen: !competition.registrationOpen })}
                loading={updateCompetition.isPending}
              >
                {competition.registrationOpen ? t("competitionDetail.closeRegistration") : t("competitionDetail.openRegistration")}
              </Button>
              <div className="flex-1 max-md:hidden" />
              {competition.status === "IN_PROGRESS" ? (
                <Button
                  size="sm"
                  variant="destructive-outline"
                  title="Zruší spuštěnou soutěž — všechny probíhající kola budou zastavena"
                  onClick={() => cancelStartMutation.mutate()}
                  loading={cancelStartMutation.isPending}
                  disabled={cancelStartMutation.isPending}
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
                  {t("competitionDetail.cancelStart")}
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setLaunchDialogOpen(true)}
                  disabled={competition.status !== "PUBLISHED"}
                >
                  <PlayCircle className="h-3.5 w-3.5" /> {t("competitionDetail.startCompetition")}
                </Button>
              )}
            </div>
          </div>

          {/* ── Stats Grid ── */}
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            {/* Registrace */}
            <article className="flex items-center gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3" style={{ boxShadow: "var(--shadow-sm)" }}>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="mb-1 flex items-center gap-1.5 text-[var(--text-secondary)]">
                  <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.5px]">{t("competitionDetail.registrationLabel")}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[22px] font-bold leading-none text-[#3B82F6]" style={{ fontFamily: "var(--font-sora)" }}>{competition.registeredPairsCount ?? 0}</span>
                  <span className="text-[12px] text-[var(--text-secondary)]">{t("competitionDetail.registeredLabel")}</span>
                  <span className="rounded-xl bg-[var(--accent-subtle)] px-2 py-px text-[10px] font-semibold text-[var(--accent)]">
                    {competition.registrationOpen ? t("competitionDetail.statusOpen") : t("competitionDetail.statusClosed")}
                  </span>
                </div>
              </div>
              <button
                onClick={() => router.push(`/dashboard/competitions/${id}/pairs`)}
                className="shrink-0 flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-medium text-[var(--accent)] transition-colors hover:bg-[var(--accent-subtle)]"
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                {t("common.view")}
              </button>
            </article>

            {/* Kategorie */}
            <article className="flex items-center gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3" style={{ boxShadow: "var(--shadow-sm)" }}>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="mb-1 flex items-center gap-1.5 text-[var(--text-secondary)]">
                  <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" /><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" /><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" /></svg>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.5px]">{t("competitionDetail.sections")}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[22px] font-bold leading-none text-[#06B6D4]" style={{ fontFamily: "var(--font-sora)" }}>{sections?.length ?? 0}</span>
                  <span className="text-[12px] text-[var(--text-secondary)]">{t("competitionDetail.activeLabel")}</span>
                  {categoriesReady && (
                    <span className="rounded-xl bg-[var(--success-subtle)] px-2 py-px text-[10px] font-semibold text-[var(--success-text)]">{t("competitionDetail.complete")}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => router.push(`/dashboard/competitions/${id}/sections`)}
                className="shrink-0 flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-medium text-[var(--accent)] transition-colors hover:bg-[var(--accent-subtle)]"
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                {t("common.view")}
              </button>
            </article>

            {/* Porota */}
            <article className="flex items-center gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3" style={{ boxShadow: "var(--shadow-sm)" }}>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="mb-1 flex items-center gap-1.5 text-[var(--text-secondary)]">
                  <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="5" /><path d="M20 21a8 8 0 0 0-16 0" /></svg>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.5px]">{t("competitionDetail.judgesLabel")}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[22px] font-bold leading-none text-[#F59E0B]" style={{ fontFamily: "var(--font-sora)" }}>{judgeTokens.length}</span>
                  <span className="text-[12px] text-[var(--text-secondary)]">{t("competitionDetail.judgesCountLabel")}</span>
                  {judgesReady && (
                    <span className="rounded-xl bg-[var(--success-subtle)] px-2 py-px text-[10px] font-semibold text-[var(--success-text)]">{t("competitionDetail.complete")}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => router.push(`/dashboard/competitions/${id}/judges`)}
                className="shrink-0 flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-medium text-[var(--accent)] transition-colors hover:bg-[var(--accent-subtle)]"
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                {t("common.manage")}
              </button>
            </article>
          </div>

          {/* ── Bottom Grid: Checklist + Activity ── */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Checklist */}
            <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-5" style={{ boxShadow: "var(--shadow-sm)" }}>
              <div className="mb-4 flex items-center gap-2">
                <svg className="h-4 w-4 text-[var(--accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                <h3 className="text-sm font-semibold">{t("competitionDetail.checklistTitle")}</h3>
              </div>
              {/* Progress bar */}
              <div className="mb-3.5 flex items-center gap-2.5 border-b border-[var(--border)] pb-3.5">
                <div className="flex-1 h-1.5 rounded-full bg-[var(--surface-secondary)] overflow-hidden">
                  <div className="h-full rounded-full bg-[var(--accent)] transition-all duration-500" style={{ width: `${(checklistDoneCount / checklistItems.length) * 100}%` }} />
                </div>
                <span className="text-xs font-semibold text-[var(--text-secondary)]">{checklistDoneCount} / {checklistItems.length}</span>
              </div>
              {/* Items */}
              <div className="space-y-0">
                {checklistItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5 py-[5px] text-[13px]">
                    {/* Circle icon */}
                    <div className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full ${item.done ? "bg-[rgba(59,130,246,0.15)]" : "border-[1.5px] border-[var(--border)] bg-[var(--surface-secondary)]"}`}>
                      {item.done ? (
                        <svg className="h-2.5 w-2.5 text-[#3B82F6]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                      ) : (
                        <svg className="h-2.5 w-2.5 text-[var(--text-tertiary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1" /></svg>
                      )}
                    </div>
                    <span className={`flex-1 ${item.done ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"}`}>{item.label}</span>
                    {!item.done && item.action && (
                      <button
                        onClick={item.action}
                        className="rounded-md border border-[var(--border)] px-2.5 py-[3px] text-[11px] font-semibold text-[var(--accent)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-subtle)]"
                      >
                        {item.actionLabel}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Activity timeline */}
            <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-5" style={{ boxShadow: "var(--shadow-sm)" }}>
              <div className="mb-4 flex items-center gap-2">
                <svg className="h-4 w-4 text-[var(--accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                <h3 className="text-sm font-semibold">{t("competitionDetail.activityTitle")}</h3>
              </div>
              <div>
                {activityEvents.length === 0 ? (
                  <p className="text-sm text-[var(--text-tertiary)] py-2">{t("common.noData")}</p>
                ) : (
                  activityEvents.map((event, i) => (
                    <div key={event.id} className={`flex items-start gap-4 py-3 ${i < activityEvents.length - 1 ? "border-b border-[var(--border)]" : ""}`}>
                      <span className="min-w-[40px] text-xs text-[var(--text-tertiary)] pt-0.5">
                        {new Date(event.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span className="text-sm text-[var(--text-secondary)]">
                        {renderActivityText(event, t)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
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
                    {(() => {
                      const d = pairs?.filter((p) => {
                        const d2 = p.dancer2FirstName ?? p.dancer2Name ?? "";
                        return d2.trim().length > 0;
                      }).length ?? 0;
                      const s = total - d;
                      const people = d * 2 + s;
                      return <p className="mt-1 text-xs text-[var(--text-tertiary)]">{people} soutěžících</p>;
                    })()}
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
<span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold" style={{ background: "color-mix(in srgb, var(--success) 15%, transparent)", color: "var(--success)" }}>
                  Párů: {total}
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
              <Button size="sm" variant="outline" onClick={() => setBulkEmailOpen(true)} title="Poslat hromadný e-mail soutěžícím">
                <Mail className="h-4 w-4" />
                Poslat email
              </Button>
            </div>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">#</TableHead>
                  <TableHead>{t("competitionDetail.tableDancers")}</TableHead>
                  <TableHead>{t("competitionDetail.tableSection")}</TableHead>
                  <TableHead>{t("competitionDetail.tableClub")}</TableHead>
                  <TableHead>{t("competitionDetail.tablePayment")}</TableHead>
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
                                {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString("en-GB", {
                                  day: "numeric", month: "long", year: "numeric",
                                }) : "—"}
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

            {/* Veřejné zobrazení */}
            <Card>
              <CardContent className="flex flex-col gap-4 pt-5">
                <div>
                  <p className="mb-1 text-sm font-semibold text-[var(--text-primary)]">Kiosk / projekce</p>
                  <p className="mb-3 text-xs text-[var(--text-secondary)]">
                    Odkaz pro zobrazení live stavu na velkoplošné obrazovce nebo kioskovém zařízení.
                    Stránka nevyžaduje přihlášení.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded border border-[var(--border)] bg-[var(--surface-secondary)] px-3 py-1.5 text-xs text-[var(--text-secondary)] overflow-x-auto">
                      {typeof window !== "undefined" ? `${window.location.origin}/competitions/${competition.id}/display` : `/competitions/${competition.id}/display`}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/competitions/${competition.id}/display`); toast({ title: "Odkaz zkopírován" }); }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`/competitions/${competition.id}/display`, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Sponsors placeholder */}
                <div>
                  <p className="mb-1 text-sm font-semibold text-[var(--text-primary)]">Sponzoři / partneři</p>
                  <p className="mb-2 text-xs text-[var(--text-secondary)]">
                    Logotip a odkaz na web sponzora.
                  </p>
                  <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center">
                    <p className="text-sm text-[var(--text-tertiary)]">Správa sponzorů bude dostupná v příští verzi.</p>
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
                    <div className="mt-3 space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Input label={t("competitionDetail.bankHolder")} value={bankHolder} onChange={(e) => { setBankHolder(e.target.value); scheduleSave({ paymentConfig: { iban: bankIban, bic: bankBic, holder: e.target.value, address: bankAddress, qrCode: bankQrCode } }); }} />
                        <Input label={t("competitionDetail.bankIban")} value={bankIban} onChange={(e) => { setBankIban(e.target.value); scheduleSave({ paymentConfig: { iban: e.target.value, bic: bankBic, holder: bankHolder, address: bankAddress, qrCode: bankQrCode } }); }} placeholder="SK89 0900 0000 0051..." />
                        <Input label={t("competitionDetail.bankBic")} value={bankBic} onChange={(e) => { setBankBic(e.target.value); scheduleSave({ paymentConfig: { iban: bankIban, bic: e.target.value, holder: bankHolder, address: bankAddress, qrCode: bankQrCode } }); }} placeholder="GIBASKBX" />
                        <Input label={t("competitionDetail.bankAddress")} value={bankAddress} onChange={(e) => { setBankAddress(e.target.value); scheduleSave({ paymentConfig: { iban: bankIban, bic: bankBic, holder: bankHolder, address: e.target.value, qrCode: bankQrCode } }); }} />
                      </div>

                      {/* QR Code upload */}
                      <div>
                        <p className="mb-1 text-xs font-medium text-[var(--text-secondary)]">QR kód pro platbu</p>
                        <div className="flex items-start gap-4">
                          {(() => { const safeBankQr = safeQrImageSrc(bankQrCode); return safeBankQr ? (
                            <div className="relative shrink-0">
                              <img src={safeBankQr} alt="QR kód" className="h-24 w-24 rounded-lg border border-[var(--border)] object-contain bg-white p-1" />
                              <button
                                type="button"
                                onClick={() => { setBankQrCode(""); scheduleSave({ paymentConfig: { iban: bankIban, bic: bankBic, holder: bankHolder, address: bankAddress, qrCode: "" } }); }}
                                className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow hover:bg-red-600"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <label className="flex h-24 w-24 shrink-0 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--text-tertiary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]">
                              <svg xmlns="http://www.w3.org/2000/svg" className="mb-1 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-8m-4 4h8m-12 8h16a2 2 0 002-2V6a2 2 0 00-2-2H4a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              <span className="text-[10px] font-medium">Nahrát QR</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const reader = new FileReader();
                                  reader.onload = () => {
                                    const dataUrl = reader.result as string;
                                    setBankQrCode(dataUrl);
                                    scheduleSave({ paymentConfig: { iban: bankIban, bic: bankBic, holder: bankHolder, address: bankAddress, qrCode: dataUrl } });
                                  };
                                  reader.readAsDataURL(file);
                                }}
                              />
                            </label>
                          ); })()}
                          <p className="text-[11px] leading-relaxed text-[var(--text-tertiary)]">
                            Nahrajte QR kód pro platbu převodem. Zobrazí se na veřejné registrační stránce vedle bankovních údajů.
                          </p>
                        </div>
                      </div>
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
                  <div className="flex flex-wrap gap-2">
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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        window.open(`/competitions/${competition.id}/display`, "_blank")
                      }
                    >
                      <Layers className="h-4 w-4" />
                      Kiosk / projekce
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Scoring system per section */}
                {sections && sections.length > 0 && (
                  <div>
                    <p className="mb-1 text-sm font-medium text-[var(--text-primary)]">Soutěžní systém</p>
                    <p className="mb-3 text-xs text-[var(--text-secondary)]">Způsob hodnocení pro každou kategorii.</p>
                    <div className="flex flex-col gap-2">
                      {sections.map((section) => (
                        <div key={section.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
                          <div>
                            <p className="text-sm font-medium text-[var(--text-primary)]">{section.name}</p>
                            <p className="text-xs text-[var(--text-secondary)]">{section.ageCategory} · {section.level}</p>
                          </div>
                          <Select
                            defaultValue={(section as unknown as { scoringSystem?: string }).scoringSystem ?? "skating"}
                            onValueChange={(v) => {
                              // Optimistic update — actual persistence would need a section PATCH endpoint
                              toast({ title: `Systém pro ${section.name} nastaven na ${v}` });
                            }}
                          >
                            <SelectTrigger className="h-8 w-36 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="skating">Skating System</SelectItem>
                              <SelectItem value="wdsf">WDSF</SelectItem>
                              <SelectItem value="custom">{t("competitionDetail.scoringCustom")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                        toast({ title: t("judges.linkCopied") });
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
        </section>
      </Tabs>

      {/* Bulk email dialog */}
      <Dialog open={bulkEmailOpen} onOpenChange={setBulkEmailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {t("competitionDetail.bulkEmailTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-secondary)]">
              {t("competitionDetail.bulkEmailDesc", { count: pairs?.filter((p) => p.email).length ?? 0 })}
              {competition.contactEmail && (
                <> {t("competitionDetail.bulkEmailReplyTo", { email: competition.contactEmail })}</>
              )}
            </p>
            <div>
              <label className="mb-1.5 block text-sm font-medium">{t("competitionDetail.bulkEmailSubject")}</label>
              <Input
                value={bulkEmailSubject}
                onChange={(e) => setBulkEmailSubject(e.target.value)}
                placeholder={t("competitionDetail.bulkEmailSubjectPlaceholder")}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">{t("competitionDetail.bulkEmailMessage")}</label>
              <Textarea
                value={bulkEmailBody}
                onChange={(e) => setBulkEmailBody(e.target.value)}
                placeholder={t("competitionDetail.bulkEmailMessagePlaceholder")}
                rows={6}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setBulkEmailOpen(false)}>
                {t("competitionDetail.bulkEmailCancel")}
              </Button>
              <Button
                onClick={() => bulkEmailSend.mutate()}
                loading={bulkEmailSend.isPending}
                disabled={!bulkEmailSubject.trim() || bulkEmailBody.trim().length < 10}
              >
                <Send className="h-4 w-4" />
                {t("competitionDetail.bulkEmailSend")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
