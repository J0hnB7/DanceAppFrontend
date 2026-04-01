"use client";

import { use, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { CheckCircle2, Trophy, ArrowLeft, FileText, AlertTriangle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import apiClient from "@/lib/api-client";
import type { CompetitionDto } from "@/lib/api/competitions";
import type { SectionDto } from "@/lib/api/sections";
import { formatDate, formatCurrency } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { getT } from "@/lib/i18n";

const _t = getT();

const schema = z.object({
  sectionId: z.string().min(1, _t("auth.validationSelectCategory")),
  dancer1FirstName: z.string().min(1, _t("auth.validationRequired")),
  dancer1LastName: z.string().min(1, _t("auth.validationRequired")),
  dancer1Club: z.string().optional(),
  dancer2FirstName: z.string().optional(),
  dancer2LastName: z.string().optional(),
  dancer2Club: z.string().optional(),
  discountCode: z.string().optional(),
  email: z.string().email(_t("auth.validationEmail")),
  gdpr: z.literal(true, _t("auth.validationGdpr")),
});

type RegisterForm = z.infer<typeof schema>;

interface RegistrationResult {
  pairId: string;
  startNumber: number;
  sectionName: string;
  amountDue: number;
  currency: string;
}

export default function PairRegistrationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [t] = useState(() => getT());
  const [result, setResult] = useState<RegistrationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const { data: competition, isLoading: compLoading } = useQuery({
    queryKey: ["competitions", "detail", id],
    queryFn: () => apiClient.get<CompetitionDto>(`/competitions/${id}`).then((r) => r.data),
  });

  const { data: sections, isLoading: sectionsLoading } = useQuery({
    queryKey: ["sections", id, "list"],
    queryFn: () => apiClient.get<SectionDto[]>(`/competitions/${id}/sections`).then((r) => r.data),
  });

  const { register, control, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      sectionId: "",
      dancer1FirstName: "",
      dancer1LastName: "",
      dancer1Club: "",
      dancer2FirstName: "",
      dancer2LastName: "",
      dancer2Club: "",
      discountCode: "",
      email: "",
      gdpr: undefined,
    },
  });

  const selectedSectionId = watch("sectionId");
  const selectedSection = sections?.find((s) => s.id === selectedSectionId);

  const doSubmit = async (values: RegisterForm) => {
    setLoading(true);
    try {
      const res = await apiClient.post<RegistrationResult>(
        `/competitions/${id}/pairs/public-registration`,
        values
      );
      setResult(res.data);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      toast({ title: apiErr?.message ?? t("publicReg.registrationFailed"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: RegisterForm) => {
    await doSubmit(values);
  };

  if (compLoading || sectionsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
        <Trophy className="h-12 w-12 text-[var(--text-tertiary)]" />
        <p className="font-medium text-[var(--text-primary)]">{t("publicReg.competitionNotFound")}</p>
        <p className="text-sm text-[var(--text-secondary)]">{t("publicReg.invalidLink")}</p>
        <Link href="/competitions"><Button variant="outline">{t("publicReg.browseCompetitions")}</Button></Link>
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <PublicNav />
        <div className="mx-auto max-w-lg p-6">
          <Card className="mb-4 text-center">
            <CardHeader>
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--success)]/10">
                <CheckCircle2 className="h-7 w-7 text-[var(--success)]" />
              </div>
              <CardTitle>{t("publicReg.registrationConfirmed")}</CardTitle>
              <CardDescription>{competition.name}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="rounded-[var(--radius-lg)] bg-[var(--surface-secondary)] p-4 text-left">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs text-[var(--text-secondary)]">{t("publicReg.startNumber")}</span>
                  <span className="text-2xl font-black text-[var(--text-primary)]">#{result.startNumber}</span>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">{result.sectionName}</p>
              </div>
            </CardContent>
          </Card>

          {result.amountDue > 0 && (
            <Card className="mb-4">
              <CardContent className="pt-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">{t("publicReg.entryFee")}</span>
                  <span className="font-bold text-[var(--text-primary)]">{formatCurrency(result.amountDue, result.currency)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <a href={`/competitions/${id}`} style={{ display: "block", textAlign: "center", padding: "10px", borderRadius: 8, border: "1px solid #E5E7EB", fontSize: ".875rem", fontWeight: 600, color: "#4F46E5", textDecoration: "none" }}>
              {t("publicReg.backToCompetition")}
            </a>
            <a href="/competitions" style={{ display: "block", textAlign: "center", fontSize: ".8rem", color: "#6B7280", textDecoration: "none" }}>
              {t("publicCompetition.backToAllCompetitions")}
            </a>
          </div>
        </div>
      </div>
    );
  }

  const isOpen = competition.registrationOpen === true;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <PublicNav />
      <div className="mx-auto max-w-xl px-4 py-8">
        {/* Back links */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 24 }}>
          <a href={`/competitions/${id}`} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: ".875rem", color: "#4F46E5", fontWeight: 600, textDecoration: "none" }}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {t("publicReg.backToCompetitionShort")}
          </a>
          <a href="/competitions" style={{ fontSize: ".8rem", color: "#6B7280", textDecoration: "none" }}>
            {t("publicCompetition.backToAllCompetitions")}
          </a>
        </div>

        {/* Competition header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">{competition.name}</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {competition.venue} · {formatDate(competition.eventDate)}
          </p>
          {competition.registrationDeadline && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--warning)]">
              <AlertTriangle className="h-3.5 w-3.5" />
              {t("publicReg.deadline")} {formatDate(competition.registrationDeadline)}
            </p>
          )}
        </div>

        {/* Contact email */}
        {competition.contactEmail && (
          <div className="mb-4 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <Mail className="h-4 w-4 shrink-0 text-[var(--accent)]" />
            <span>{t("publicReg.contact")} </span>
            <a href={`mailto:${competition.contactEmail}`} className="text-[var(--accent)] hover:underline">
              {competition.contactEmail}
            </a>
          </div>
        )}

        {/* Propozice */}
        {competition.propozice && (
          <div className="mb-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
            <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
              <FileText className="h-4 w-4 text-[var(--accent)]" />
              <span className="text-sm font-medium text-[var(--text-primary)]">{t("publicReg.propozice")}</span>
            </div>
            <div className="px-4 py-4">
              <pre className="whitespace-pre-wrap font-sans text-sm text-[var(--text-secondary)] leading-relaxed">
                {competition.propozice}
              </pre>
            </div>
          </div>
        )}

        {!isOpen ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
              <AlertTriangle className="h-10 w-10 text-[var(--warning)]" />
              <p className="font-medium text-[var(--text-primary)]">{t("publicReg.registrationClosed")}</p>
              <p className="text-sm text-[var(--text-secondary)]">
                {t("publicReg.registrationClosedDesc")}
              </p>
              <Link href={`/competitions/${id}`}>
                <Button variant="outline">{t("publicReg.backToCompetitionShort")}</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
            {/* 1. Section selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t("publicReg.stepCategory")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Controller
                  control={control}
                  name="sectionId"
                  render={({ field }) => (
                    <div className="flex flex-col gap-2">
                      {sections?.map((section) => {
                        const spotsLeft = section.maxPairs
                          ? section.maxPairs - (section.registeredPairsCount ?? 0)
                          : null;
                        const isFull = spotsLeft !== null && spotsLeft <= 0;
                        const almostFull = spotsLeft !== null && spotsLeft > 0 && spotsLeft <= 5;
                        const isSelected = field.value === section.id;
                        return (
                          <button
                            key={section.id}
                            type="button"
                            disabled={isFull}
                            onClick={() => !isFull && field.onChange(section.id)}
                            className={`flex items-start justify-between rounded-[var(--radius-lg)] border p-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                              isSelected
                                ? "border-[var(--accent)] bg-[var(--accent)]/5"
                                : "border-[var(--border)] hover:bg-[var(--surface-secondary)]"
                            }`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">{section.name}</p>
                                {isFull && <Badge variant="destructive" className="text-xs">{t("publicReg.full")}</Badge>}
                                {almostFull && <Badge variant="warning" className="text-xs">{t("publicReg.almostFull")}</Badge>}
                              </div>
                              <p className="text-xs text-[var(--text-secondary)]">
                                {[section.ageCategory, section.level].filter(Boolean).join(" · ")}
                                {section.dances?.length ? ` · ${section.dances.map((d) => d.danceName).join(", ")}` : ""}
                              </p>
                              {spotsLeft !== null && !isFull && (
                                <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                                  {t("publicReg.spotsLeft", { count: spotsLeft })}
                                </p>
                              )}
                            </div>
                            <div className="ml-3 shrink-0 text-right">
                              {section.entryFee ? (
                                <p className="text-sm font-bold text-[var(--text-primary)]">
                                  {formatCurrency(section.entryFee, section.entryFeeCurrency ?? "EUR")}
                                </p>
                              ) : (
                                <Badge variant="secondary">{section.registeredPairsCount} {t("publicReg.pairs")}</Badge>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                />
                {errors.sectionId && (
                  <p className="mt-1 text-xs text-[var(--destructive)]">{errors.sectionId.message}</p>
                )}

                {/* Fee summary for selected section */}
                {selectedSection?.entryFee && (
                  <div className="mt-3 rounded-[var(--radius-lg)] bg-[var(--accent)]/5 px-3 py-2 text-sm">
                    <span className="text-[var(--text-secondary)]">Startovné: </span>
                    <span className="font-semibold text-[var(--text-primary)]">
                      {formatCurrency(selectedSection.entryFee, selectedSection.entryFeeCurrency ?? "EUR")}
                    </span>
                    <span className="text-xs text-[var(--text-tertiary)]"> {t("publicReg.perPair")}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 2. Dancer info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t("publicReg.stepDancers")}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <p className="text-xs font-semibold text-[var(--text-tertiary)]">{t("publicReg.dancer1")}</p>
                <div className="grid grid-cols-2 gap-3">
                  <Input label={t("publicReg.firstName")} placeholder="Jana" error={errors.dancer1FirstName?.message} {...register("dancer1FirstName")} />
                  <Input label={t("publicReg.lastName")} placeholder="Nováková" error={errors.dancer1LastName?.message} {...register("dancer1LastName")} />
                </div>
                <Input label={t("publicReg.club")} placeholder="Taneční klub Bratislava" {...register("dancer1Club")} />

                <div className="border-t border-[var(--border)] pt-4">
                  <p className="mb-3 text-xs font-semibold text-[var(--text-tertiary)]">{t("publicReg.dancer2")}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label={t("publicReg.firstName")} placeholder="Peter" {...register("dancer2FirstName")} />
                    <Input label={t("publicReg.lastName")} placeholder="Kováč" {...register("dancer2LastName")} />
                  </div>
                  <Input label={t("publicReg.club")} placeholder="Taneční klub Bratislava" {...register("dancer2Club")} className="mt-3" />
                </div>
              </CardContent>
            </Card>

            {/* 3. Contact & discount */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t("publicReg.stepContact")}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Input
                  label={t("publicReg.email")}
                  type="email"
                  placeholder="vas@email.cz"
                  hint={t("publicReg.emailHint")}
                  error={errors.email?.message}
                  {...register("email")}
                />
                <Input
                  label={t("publicReg.discountCode")}
                  placeholder={t("publicReg.discountCodePlaceholder")}
                  {...register("discountCode")}
                />
              </CardContent>
            </Card>

            {/* GDPR */}
            <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4">
              <Controller
                control={control}
                name="gdpr"
                render={({ field }) => (
                  <input
                    type="checkbox"
                    id="gdpr"
                    className="mt-0.5 h-4 w-4 rounded border-[var(--border)] accent-[var(--accent)]"
                    checked={field.value === true}
                    onChange={(e) => field.onChange(e.target.checked ? true : undefined)}
                  />
                )}
              />
              <label htmlFor="gdpr" className="cursor-pointer text-sm text-[var(--text-secondary)]">
                {t("publicReg.gdprConsent")}{" "}
                <Link href="/privacy" className="text-[var(--accent)] hover:underline">
                  {t("publicReg.privacyPolicy")}
                </Link>
                .
              </label>
            </div>
            {errors.gdpr && (
              <p className="-mt-4 text-xs text-[var(--destructive)]">{errors.gdpr.message}</p>
            )}

            <Button type="submit" size="lg" loading={loading} className="w-full">
              {t("publicReg.submit")}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

function PublicNav() {
  const t = getT();
  return (
    <nav style={{ borderBottom: "1px solid #E5E7EB", background: "#fff", height: 60, display: "flex", alignItems: "center" }}>
      <div style={{ maxWidth: 896, margin: "0 auto", width: "100%", padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="/competitions" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
          <Trophy style={{ width: 18, height: 18, color: "#4F46E5" }} />
          <span style={{ fontWeight: 700, fontSize: ".9rem", color: "#111827" }}>ProPodium</span>
        </a>
        <a href="/login" style={{ fontSize: ".85rem", fontWeight: 600, color: "#4F46E5", textDecoration: "none" }}>
          {t("publicReg.organizerLogin")}
        </a>
      </div>
    </nav>
  );
}
