"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Copy, ExternalLink, FileText, Layers, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { CompetitionSidebar } from "@/components/layout/competition-sidebar";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCompetition, useUpdateCompetition } from "@/hooks/queries/use-competitions";
import { useSections } from "@/hooks/queries/use-sections";
import { competitionsApi } from "@/lib/api/competitions";
import type { PairsVisibility, PaymentMethodType } from "@/lib/api/competitions";
import { toast } from "@/hooks/use-toast";
import { useLocale } from "@/contexts/locale-context";

export default function SettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { t } = useLocale();

  const { data: competition } = useCompetition(id);
  const { data: sections } = useSections(id);
  const updateCompetition = useUpdateCompetition(id);

  const [propoziceText, setPropoziceText] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("PAY_AT_VENUE");
  const [bankIban, setBankIban] = useState("");
  const [bankBic, setBankBic] = useState("");
  const [bankHolder, setBankHolder] = useState("");
  const [bankAddress, setBankAddress] = useState("");
  const [bankQrCode, setBankQrCode] = useState("");
  const [stripeKey, setStripeKey] = useState("");
  const [orgWebsiteUrl, setOrgWebsiteUrl] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (competition) {
      setPropoziceText(competition.propozice ?? "");
      setContactEmail(competition.contactEmail ?? "");
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

  return (
    <AppShell sidebar={<CompetitionSidebar competitionId={id} />}>
      <PageHeader
        title="Nastavení"
        description="Konfigurace soutěže"
        backHref={`/dashboard/competitions/${id}`}
      />

      <div className="flex flex-col gap-4">
        {/* Contact & payment & rules */}
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

                  <div>
                    <p className="mb-1 text-xs font-medium text-[var(--text-secondary)]">QR kód pro platbu</p>
                    <div className="flex items-start gap-4">
                      {bankQrCode ? (
                        <div className="relative shrink-0">
                          <img src={bankQrCode} alt="QR kód" className="h-24 w-24 rounded-lg border border-[var(--border)] object-contain bg-white p-1" />
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
                      )}
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

        {/* Visibility & public page */}
        <Card>
          <CardContent className="flex flex-col gap-4 pt-5">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">{t("competition.settings.pairsVisibility")}</p>
              <p className="mb-2 text-xs text-[var(--text-secondary)]">
                {t("competition.settings.pairsVisibilityDesc")}
              </p>
              <Select
                value={competition?.pairsVisibility ?? "HIDDEN"}
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
                  onClick={() => window.open(`/competitions/${id}`, "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                  {t("competition.openPublicPage")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(`/competitions/${id}/display`, "_blank")}
                >
                  <Layers className="h-4 w-4" />
                  Kiosk / projekce
                </Button>
              </div>
            </div>

            {sections && sections.length > 0 && (
              <>
                <Separator />
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
              </>
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
                  {id}
                </code>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    navigator.clipboard.writeText(id);
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

      {showDeleteDialog && (
        <Dialog open onOpenChange={(v) => !v && setShowDeleteDialog(false)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-[var(--destructive)]">
                <AlertTriangle className="h-5 w-5" />
                {t("competition.deleteDialog.title")}
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-[var(--text-secondary)]">
              {t("competition.deleteDialog.description", { name: competition?.name ?? "" })}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                {t("common.cancel")}
              </Button>
              <Button variant="destructive" onClick={handleDelete} loading={deleting}>
                <Trash2 className="h-4 w-4" />
                {t("competition.deleteDialog.confirm")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AppShell>
  );
}
