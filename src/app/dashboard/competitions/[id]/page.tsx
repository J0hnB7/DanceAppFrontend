"use client";

import { use, useEffect, useState } from "react";
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
import type { PairsVisibility, CompetitionNewsItem, FeeCalculationType, PaymentMethodType } from "@/lib/api/competitions";
import { competitionsApi, CompetitionStatus } from "@/lib/api/competitions";
import { useSections } from "@/hooks/queries/use-sections";
import { JudgesTab } from "@/components/competition/judges-tab";
import { usePairs } from "@/hooks/queries/use-pairs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useLocale } from "@/contexts/locale-context";

const statusColors: Record<CompetitionStatus, "default" | "secondary" | "success" | "warning" | "destructive" | "outline"> = {
  DRAFT: "secondary",
  PUBLISHED: "outline",
  REGISTRATION_OPEN: "success",
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
  const [newNewsTitle, setNewNewsTitle] = useState("");
  const [newNewsContent, setNewNewsContent] = useState("");
  const [propoziceText, setPropoziceText] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [paymentInfo, setPaymentInfo] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [contentDescription, setContentDescription] = useState("");
  const [contentFees, setContentFees] = useState("");
  const [contentPayment, setContentPayment] = useState("");
  const [feeCalcType, setFeeCalcType] = useState<FeeCalculationType>("ASK_ORGANIZER");
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

  const addNews = useMutation({
    mutationFn: () => competitionsApi.createNews(id, { title: newNewsTitle, content: newNewsContent }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["competition-news", id] });
      setNewNewsTitle("");
      setNewNewsContent("");
      toast({ title: "News published" } as Parameters<typeof toast>[0]);
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
      setPaymentInfo(competition.paymentInfo ?? "");
      setContentDescription(competition.contentDescription ?? "");
      setContentFees(competition.contentFees ?? "");
      setContentPayment(competition.contentPayment ?? "");
      setFeeCalcType(competition.feeCalculationType ?? "ASK_ORGANIZER");
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

  const handleDelete = async () => {
    try {
      await deleteCompetition.mutateAsync(id);
      router.push("/dashboard");
    } catch {
      toast({ title: "Nepodařilo se smazat soutěž", variant: "destructive" } as Parameters<typeof toast>[0]);
    }
  };

  const handlePublish = async () => {
    await updateCompetition.mutateAsync({ status: "PUBLISHED" });
    toast({ title: "Competition published", variant: "success" } as Parameters<typeof toast>[0]);
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
        loading={deleteCompetition.isPending}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />

      <PageHeader
        title={competition.name}
        description={competition.location}
        actions={
          <div className="flex items-center gap-2">
            {(competition.status === "DRAFT" || competition.status === "PUBLISHED") && (
              <Button
                size="sm"
                onClick={() => updateCompetition.mutate({ status: "REGISTRATION_OPEN" })}
                loading={updateCompetition.isPending}
              >
                <PlayCircle className="h-4 w-4" />
                {t("competition.openRegistration")}
              </Button>
            )}
            <Badge variant={statusColors[competition.status]}>
              {t(`status.${competition.status}`)}
            </Badge>
          </div>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">{t("competition.tabs.overview")}</TabsTrigger>
          <TabsTrigger value="sections">{t("competition.tabs.sections", { count: String(sections?.length ?? 0) })}</TabsTrigger>
          <TabsTrigger value="pairs">{t("competition.tabs.pairs", { count: String(pairs?.length ?? 0) })}</TabsTrigger>
          <TabsTrigger value="judges">{t("competition.tabs.judges")}</TabsTrigger>
          <TabsTrigger value="news">{t("competition.tabs.news", { count: String(newsItems.length) })}</TabsTrigger>
          <TabsTrigger value="content">Obsah</TabsTrigger>
          <TabsTrigger value="settings">{t("competition.tabs.settings")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <RegistrationLinkCard id={id} />

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <Calendar className="h-4 w-4" /> {t("competition.overview.dates")}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <p className="font-medium">{formatDate(competition.startDate)}</p>
                {competition.startDate !== competition.endDate && (
                  <p className="text-[var(--text-secondary)]">
                    → {formatDate(competition.endDate)}
                  </p>
                )}
                {competition.registrationDeadline && (
                  <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                    {formatDate(competition.registrationDeadline)}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <MapPin className="h-4 w-4" /> {t("competition.overview.location")}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm font-medium">{competition.location}</CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <Users className="h-4 w-4" /> {t("competition.overview.pairsCard")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{competition.registeredPairsCount}</p>
                {competition.maxPairs && (
                  <p className="text-xs text-[var(--text-tertiary)]">{t("competition.overview.max", { max: String(competition.maxPairs) })}</p>
                )}
              </CardContent>
            </Card>

            {competition.numberOfRounds && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <PlayCircle className="h-4 w-4" /> {t("competition.overview.rounds")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{competition.numberOfRounds}</p>
                  <div className="mt-1 flex flex-col gap-0.5">
                    {Array.from({ length: competition.numberOfRounds }).map((_, i) => (
                      <p key={i} className="text-xs text-[var(--text-tertiary)]">
                        {i === competition.numberOfRounds! - 1
                          ? t("competition.overview.roundFinal", { n: String(i + 1) })
                          : t("competition.overview.round", { n: String(i + 1) })}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Judges quick link */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <KeyRound className="h-4 w-4" /> {t("competition.overview.judges")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setTab("judges")}
                >
                  {t("competition.overview.manageJudges")}
                </Button>
              </CardContent>
            </Card>

          </div>
        </TabsContent>

        <TabsContent value="sections">
          <div className="flex flex-col gap-3">
            <div className="flex justify-end">
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
                      {section.dances.length} dances
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-[var(--text-secondary)]">
                      {section.registeredPairsCount} pairs
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
                      <Users className="h-4 w-4" /> Total registered
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{total}</p>
                    {maxPairs && <p className="text-xs text-[var(--text-tertiary)]">of {maxPairs} max</p>}
                  </CardContent>
                </Card>
                <Card className="">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                      <CreditCard className="h-4 w-4" /> Paid
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{paid}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">{total > 0 ? Math.round((paid / total) * 100) : 0}% of total</p>
                  </CardContent>
                </Card>
                <Card className="">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                      <Clock className="h-4 w-4" /> Pending payment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{pending}</p>
                  </CardContent>
                </Card>
                <Card className="">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                      <ClipboardCheck className="h-4 w-4" /> Prezence
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/dashboard/competitions/${id}/presence`)}
                    >
                      Otevřít check-in
                    </Button>
                  </CardContent>
                </Card>
                {maxPairs && (
                  <Card className="sm:col-span-2 lg:col-span-4">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs text-[var(--text-secondary)]">Capacity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-end gap-2">
                        <p className="text-2xl font-bold">{capacityPct}%</p>
                        {spotsLeft !== null && spotsLeft > 0 && (
                          <p className="mb-0.5 text-xs text-[var(--text-tertiary)]">{spotsLeft} left</p>
                        )}
                      </div>
                      <Progress value={capacityPct ?? 0} className="mt-2 h-1.5" />
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })()}
          <p className="mb-3 text-sm text-[var(--text-secondary)]">
            {t("pairs.registered", { count: String(pairs?.length ?? 0) })}
          </p>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">#</TableHead>
                  <TableHead>Dancers</TableHead>
                  <TableHead>{t("section.title")}</TableHead>
                  <TableHead>Payment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!pairs?.length && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-12 text-center text-[var(--text-secondary)]">
                      {t("pairs.noPairs")}
                    </TableCell>
                  </TableRow>
                )}
                {pairs?.map((pair) => {
                  const code = String(pair.startNumber).padStart(3, "0");
                  const sectionName = sections?.find((s) => s.id === pair.sectionId)?.name ?? pair.sectionId;
                  return (
                    <TableRow key={pair.id}>
                      <TableCell>
                        <code className="rounded-md bg-[var(--surface-secondary)] px-2.5 py-1 font-mono text-base font-bold tracking-widest text-[var(--text-primary)]">
                          {code}
                        </code>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-sm">
                          {pair.dancer1FirstName} {pair.dancer1LastName}
                          {pair.dancer2FirstName && (
                            <span className="text-[var(--text-secondary)]">
                              {" & "}{pair.dancer2FirstName} {pair.dancer2LastName}
                            </span>
                          )}
                        </p>
                        {pair.dancer1Club && (
                          <p className="text-xs text-[var(--text-tertiary)]">{pair.dancer1Club}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-[var(--text-secondary)]">{sectionName}</TableCell>
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

        <TabsContent value="judges">
          <JudgesTab competitionId={id} />
        </TabsContent>

        <TabsContent value="news">
          <div className="flex flex-col gap-4">
            <Card>
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
              <p className="py-8 text-center text-sm text-[var(--text-secondary)]">
                {t("news.noNews")}
              </p>
            ) : (
              newsItems.map((item: CompetitionNewsItem) => (
                <Card key={item.id}>
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
        </TabsContent>

        {/* ── Content pages tab ─────────────────────────────────────── */}
        <TabsContent value="content">
          <div className="flex flex-col gap-4">
            <p className="text-sm text-[var(--text-secondary)]">
              Tyto texty jsou zobrazeny účastníkům při registraci na soutěž — tři sekce dle WDSF CRS standardu.
            </p>
            <Card>
              <CardContent className="flex flex-col gap-4 pt-5">
                <div>
                  <p className="mb-1 text-sm font-semibold">1. Obecný popis akce</p>
                  <p className="mb-2 text-xs text-[var(--text-secondary)]">
                    Základní informace o soutěži — místo, program, organizátor.
                  </p>
                  <Textarea
                    rows={5}
                    value={contentDescription}
                    onChange={(e) => setContentDescription(e.target.value)}
                    placeholder="Vítejte na naší soutěži! Akce se koná v..."
                  />
                  <div className="mt-2 flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateCompetition.mutate({ contentDescription })}
                      loading={updateCompetition.isPending}
                    >
                      {t("common.save")}
                    </Button>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="mb-1 text-sm font-semibold">2. Informace o poplatcích</p>
                  <p className="mb-2 text-xs text-[var(--text-secondary)]">
                    Výše poplatků, způsob výpočtu, slevy.
                  </p>
                  <Textarea
                    rows={5}
                    value={contentFees}
                    onChange={(e) => setContentFees(e.target.value)}
                    placeholder="Startovní poplatek: 40 EUR / pár / den. Za více disciplín se platí..."
                  />
                  <div className="mt-2 flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateCompetition.mutate({ contentFees })}
                      loading={updateCompetition.isPending}
                    >
                      {t("common.save")}
                    </Button>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="mb-1 text-sm font-semibold">3. Platební metody</p>
                  <p className="mb-2 text-xs text-[var(--text-secondary)]">
                    Jak a kam zaplatit — bankovní převod, hotovost, online platba.
                  </p>
                  <Textarea
                    rows={5}
                    value={contentPayment}
                    onChange={(e) => setContentPayment(e.target.value)}
                    placeholder="Platba převodem na účet: IBAN SK00... nebo hotovostí na místě."
                  />
                  <div className="mt-2 flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateCompetition.mutate({ contentPayment })}
                      loading={updateCompetition.isPending}
                    >
                      {t("common.save")}
                    </Button>
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
                  <div className="flex items-center gap-2">
                    <Input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="info@yourcompetition.com"
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateCompetition.mutate({ contactEmail })}
                      loading={updateCompetition.isPending}
                    >
                      {t("common.save")}
                    </Button>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="mb-1 text-sm font-medium text-[var(--text-primary)]">Způsob platby</p>
                  <p className="mb-2 text-xs text-[var(--text-secondary)]">
                    Číslo účtu, IBAN nebo jiné platební údaje — zobrazí se účastníkům na stránce soutěže.
                  </p>
                  <Textarea
                    rows={3}
                    value={paymentInfo}
                    onChange={(e) => setPaymentInfo(e.target.value)}
                    placeholder={"IBAN: SK00 0000 0000 0000 0000 0000\nBIC: TATRSKBX\nVS: startovní číslo páru"}
                  />
                  <div className="mt-2 flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateCompetition.mutate({ paymentInfo })}
                      loading={updateCompetition.isPending}
                    >
                      {t("common.save")}
                    </Button>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="mb-1 text-sm font-medium text-[var(--text-primary)]">Výpočet registračního poplatku</p>
                  <p className="mb-2 text-xs text-[var(--text-secondary)]">
                    Způsob výpočtu poplatku — zobrazí se účastníkům i ve výpisu registrací.
                  </p>
                  <Select value={feeCalcType} onValueChange={(v) => {
                    const t = v as FeeCalculationType;
                    setFeeCalcType(t);
                    updateCompetition.mutate({ feeCalculationType: t });
                  }}>
                    <SelectTrigger className="w-72">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ASK_ORGANIZER">Zeptejte se organizátora</SelectItem>
                      <SelectItem value="DAILY_MAX">Denní maximum (strop)</SelectItem>
                      <SelectItem value="MOST_EXPENSIVE">Nejdražší disciplína za den</SelectItem>
                      <SelectItem value="PER_COMPETITION_TYPE">Cena dle typu soutěže</SelectItem>
                      <SelectItem value="PER_DAY">Cena za den</SelectItem>
                      <SelectItem value="BASE_PLUS_ADDITIONAL">Základní + příplatek za každou disciplínu</SelectItem>
                      <SelectItem value="COMBINATION">Kombinace disciplín</SelectItem>
                      <SelectItem value="PER_ATHLETE_AGE_GROUP">Cena dle sportovce a věk. skupiny</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div>
                  <p className="mb-1 text-sm font-medium text-[var(--text-primary)]">Platební metoda</p>
                  <p className="mb-2 text-xs text-[var(--text-secondary)]">
                    Jak budou účastníci platit registrační poplatek.
                  </p>
                  <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethodType)}>
                    <SelectTrigger className="w-72">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PAY_AT_VENUE">Platba na místě</SelectItem>
                      <SelectItem value="ORGANIZER_WEBSITE">Na webu organizátora</SelectItem>
                      <SelectItem value="BANK_TRANSFER">Bankovní převod</SelectItem>
                      <SelectItem value="STRIPE">Stripe (karta online)</SelectItem>
                      <SelectItem value="OTHER">Jiná metoda</SelectItem>
                    </SelectContent>
                  </Select>

                  {paymentMethod === "BANK_TRANSFER" && (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <Input label="Majitel účtu" value={bankHolder} onChange={(e) => setBankHolder(e.target.value)} placeholder="Jan Novák" />
                      <Input label="IBAN" value={bankIban} onChange={(e) => setBankIban(e.target.value)} placeholder="SK89 0900 0000 0051..." />
                      <Input label="BIC / SWIFT" value={bankBic} onChange={(e) => setBankBic(e.target.value)} placeholder="GIBASKBX" />
                      <Input label="Adresa banky" value={bankAddress} onChange={(e) => setBankAddress(e.target.value)} placeholder="Bajkalská 30, Bratislava" />
                    </div>
                  )}
                  {paymentMethod === "ORGANIZER_WEBSITE" && (
                    <div className="mt-3">
                      <Input label="URL platební stránky" value={orgWebsiteUrl} onChange={(e) => setOrgWebsiteUrl(e.target.value)} placeholder="https://mojasoutez.sk/platba" />
                    </div>
                  )}
                  {paymentMethod === "STRIPE" && (
                    <div className="mt-3">
                      <Input label="Stripe API klíč" value={stripeKey} onChange={(e) => setStripeKey(e.target.value)} placeholder="sk_live_..." />
                    </div>
                  )}

                  <div className="mt-2 flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const config: Record<string, string> = {};
                        if (paymentMethod === "BANK_TRANSFER") {
                          config.iban = bankIban; config.bic = bankBic;
                          config.holder = bankHolder; config.address = bankAddress;
                        } else if (paymentMethod === "ORGANIZER_WEBSITE") {
                          config.url = orgWebsiteUrl;
                        } else if (paymentMethod === "STRIPE") {
                          config.apiKey = stripeKey;
                        }
                        updateCompetition.mutate({ paymentMethod, paymentConfig: config });
                      }}
                      loading={updateCompetition.isPending}
                    >
                      {t("common.save")}
                    </Button>
                  </div>
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
                    onChange={(e) => setPropoziceText(e.target.value)}
                    placeholder={t("competition.settings.rulesPlaceholder")}
                  />
                  <div className="mt-2 flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateCompetition.mutate({ propozice: propoziceText })}
                      loading={updateCompetition.isPending}
                    >
                      {t("competition.settings.saveRules")}
                    </Button>
                  </div>
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

            {/* Rounds */}
            <Card>
              <CardContent className="flex flex-col gap-4 pt-5">
                <div>
                  <p className="mb-1 text-sm font-medium text-[var(--text-primary)]">{t("competition.settings.numberOfRounds")}</p>
                  <p className="mb-2 text-xs text-[var(--text-secondary)]">
                    {t("competition.settings.numberOfRoundsDesc")}
                  </p>
                  <Select
                    value={String(competition.numberOfRounds ?? 2)}
                    onValueChange={(v) => updateCompetition.mutate({ numberOfRounds: Number(v) })}
                  >
                    <SelectTrigger className="w-56">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n === 1 ? t("competition.settings.round", { n: String(n) }) : t("competition.settings.rounds", { n: String(n) })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
