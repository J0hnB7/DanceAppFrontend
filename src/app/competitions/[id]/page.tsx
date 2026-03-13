"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import {
  Trophy, MapPin, Calendar, Users, Clock, ChevronRight,
  Newspaper, Info, Mail, FileText, CheckCircle2, AlertTriangle, CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import apiClient from "@/lib/api-client";
import type { CompetitionDto, CompetitionNewsItem } from "@/lib/api/competitions";
import { competitionKeys } from "@/hooks/queries/use-competitions";
import type { SectionDto } from "@/lib/api/sections";
import { formatDate, formatCurrency } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";


const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft", PUBLISHED: "Zveřejněno", REGISTRATION_OPEN: "Registrace otevřena",
  IN_PROGRESS: "Probíhá", COMPLETED: "Ukončeno", CANCELLED: "Zrušeno",
};

const schema = z.object({
  sectionId: z.string().min(1, "Vyberte prosím kategorii"),
  dancer1FirstName: z.string().min(1, "Povinné pole"),
  dancer1LastName: z.string().min(1, "Povinné pole"),
  dancer1Club: z.string().optional(),
  dancer2FirstName: z.string().optional(),
  dancer2LastName: z.string().optional(),
  dancer2Club: z.string().optional(),
  discountCode: z.string().optional(),
  email: z.string().email("Zadejte platný email"),
  gdpr: z.literal(true, { message: "Souhlas je povinný" }),
});
type RegisterForm = z.infer<typeof schema>;

interface RegistrationResult {
  pairId: string;
  startNumber: number;
  sectionName: string;
  amountDue: number;
  currency: string;
}

function PublicNav() {
  return (
    <nav className="sticky top-0 z-10 border-b border-[var(--border)] bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link href="/competitions" className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
          <Trophy className="h-5 w-5 text-[var(--accent)]" />
          DanceApp
        </Link>
        <Link href="/login" className="text-sm text-[var(--accent)] hover:underline">
          Organizer login →
        </Link>
      </div>
    </nav>
  );
}

export default function PublicCompetitionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [result, setResult] = useState<RegistrationResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: competition, isLoading } = useQuery({
    queryKey: competitionKeys.detail(id),
    queryFn: () => apiClient.get<CompetitionDto>(`/competitions/${id}`).then((r) => r.data),
  });

  const { data: sections = [] } = useQuery({
    queryKey: ["sections", "public", id],
    queryFn: () => apiClient.get<SectionDto[]>(`/competitions/${id}/sections`).then((r) => r.data),
  });

  const { data: newsItems = [] } = useQuery({
    queryKey: ["competition-news", id],
    queryFn: () => apiClient.get<CompetitionNewsItem[]>(`/competitions/${id}/news`).then((r) => r.data),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval: 10_000,
  });

  const { register, control, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(schema),
    defaultValues: { sectionId: "", dancer1FirstName: "", dancer1LastName: "", dancer1Club: "",
      dancer2FirstName: "", dancer2LastName: "", dancer2Club: "", discountCode: "", email: "", gdpr: undefined },
  });

  const selectedSectionId = watch("sectionId");
  const selectedSection = sections.find((s) => s.id === selectedSectionId);

  const onSubmit = async (values: RegisterForm) => {
    setSubmitting(true);
    try {
      const res = await apiClient.post<RegistrationResult>(`/competitions/${id}/public-registration`, values);
      setResult(res.data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      toast({ title: apiErr?.message ?? "Přihlášení se nezdařilo", variant: "destructive" } as Parameters<typeof toast>[0]);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <PublicNav />
        <div className="h-60 animate-pulse bg-[var(--surface-secondary)]" />
        <div className="mx-auto max-w-4xl space-y-4 px-4 py-8">
          <Skeleton className="h-12" /><Skeleton className="h-40" /><Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <PublicNav />
        <div className="flex flex-col items-center gap-4 py-32 text-center">
          <Trophy className="h-12 w-12 text-[var(--text-tertiary)]" />
          <p className="font-semibold text-[var(--text-primary)]">Soutěž nenalezena</p>
          <Link href="/competitions"><Button variant="outline">Všechny soutěže</Button></Link>
        </div>
      </div>
    );
  }

  const isOpen = competition.status === "REGISTRATION_OPEN";
  const capacityPct = competition.maxPairs
    ? Math.round((competition.registeredPairsCount / competition.maxPairs) * 100) : null;
  const spotsLeft = competition.maxPairs ? competition.maxPairs - competition.registeredPairsCount : null;

  // ── Registration success ───────────────────────────────────────────────────
  if (result) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <PublicNav />
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--success)]/10">
            <CheckCircle2 className="h-8 w-8 text-[var(--success)]" />
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Přihláška potvrzena!</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{competition.name}</p>

          <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-left">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-secondary)]">Startovní číslo</span>
              <span className="text-3xl font-black text-[var(--text-primary)]">#{result.startNumber}</span>
            </div>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{result.sectionName}</p>
          </div>

          {result.amountDue > 0 && (
            <div className="mt-3 rounded-2xl border border-[var(--warning)]/30 bg-[var(--warning)]/5 p-4 text-left">
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Startovné: {formatCurrency(result.amountDue, result.currency)}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">Uhraďte prosím před uzávěrkou přihlášek.</p>
            </div>
          )}

          <p className="mt-4 text-sm text-[var(--text-secondary)]">Potvrzení bylo odesláno na váš email.</p>
          <button
            onClick={() => setResult(null)}
            className="mt-6 text-sm text-[var(--accent)] hover:underline"
          >
            ← Zpět na stránku soutěže
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <PublicNav />

      {/* Hero */}
      <div className="relative overflow-hidden" style={{
        background: competition.bannerUrl
          ? `url(${competition.bannerUrl}) center/cover no-repeat`
          : "linear-gradient(135deg, #1d2b6b 0%, #3730a3 60%, #5856d6 100%)",
        minHeight: 220,
      }}>
        <div className="absolute inset-0 bg-black/35" />
        <div className="relative mx-auto max-w-4xl px-4 py-12">
          <div className="flex items-end gap-5">
            {competition.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={competition.logoUrl} alt="Logo"
                className="h-20 w-20 shrink-0 rounded-2xl border-2 border-white/30 object-cover shadow-lg" />
            )}
            <div className="flex-1">
              <Badge className="mb-3" variant={isOpen ? "success" : "secondary"}>
                {STATUS_LABEL[competition.status] ?? competition.status}
              </Badge>
              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{competition.name}</h1>
              {competition.description && (
                <p className="mt-2 max-w-xl text-sm text-white/75">{competition.description}</p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-white/80">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(competition.startDate)}
                  {competition.startDate !== competition.endDate && <> — {formatDate(competition.endDate)}</>}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />{competition.location}
                </span>
                {competition.registrationDeadline && (
                  <span className="flex items-center gap-1.5 text-yellow-300">
                    <Clock className="h-3.5 w-3.5" />
                    Uzávěrka: {formatDate(competition.registrationDeadline)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-4xl items-center gap-8 px-4 py-3 text-sm">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[var(--text-tertiary)]" />
            <span className="font-semibold text-[var(--text-primary)]">{competition.registeredPairsCount}</span>
            <span className="text-[var(--text-secondary)]">
              {competition.maxPairs ? `/ ${competition.maxPairs} párů` : "párů přihlášeno"}
            </span>
          </div>
          {capacityPct !== null && (
            <div className="flex flex-1 items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
                <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.min(capacityPct, 100)}%` }} />
              </div>
              <span className="shrink-0 text-xs text-[var(--text-tertiary)]">{capacityPct}%</span>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex flex-col gap-8">

          {/* Aktuality */}
          {newsItems.length > 0 && (
            <>
              <div>
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--text-primary)]">
                  <Newspaper className="h-4 w-4" /> Aktuality
                </h2>
                <div className="flex flex-col gap-3">
                  {newsItems.map((item) => (
                    <Card key={item.id}>
                      <CardContent className="p-5">
                        <p className="text-xs text-[var(--text-tertiary)]">
                          {new Date(item.publishedAt).toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" })}
                        </p>
                        <p className="mt-1 font-semibold text-[var(--text-primary)]">{item.title}</p>
                        <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">{item.content}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Základní informace */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <Info className="h-4 w-4" /> Základní informace
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                  <div>
                    <p className="text-xs text-[var(--text-tertiary)]">Datum konání</p>
                    <p className="text-sm font-medium">{formatDate(competition.startDate)}</p>
                    {competition.startDate !== competition.endDate && (
                      <p className="text-sm text-[var(--text-secondary)]">— {formatDate(competition.endDate)}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                  <div>
                    <p className="text-xs text-[var(--text-tertiary)]">Místo konání</p>
                    <p className="text-sm font-medium">{competition.location}</p>
                  </div>
                </div>
                {competition.registrationDeadline && (
                  <div className="flex items-start gap-3">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning)]" />
                    <div>
                      <p className="text-xs text-[var(--text-tertiary)]">Uzávěrka přihlášek</p>
                      <p className="text-sm font-medium text-[var(--warning)]">{formatDate(competition.registrationDeadline)}</p>
                    </div>
                  </div>
                )}
                {competition.maxPairs && (
                  <div className="flex items-start gap-3">
                    <Users className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                    <div>
                      <p className="text-xs text-[var(--text-tertiary)]">Kapacita</p>
                      <p className="text-sm font-medium">
                        max. {competition.maxPairs} párů
                        <span className="ml-1 text-[var(--text-secondary)]">({competition.registeredPairsCount} přihlášeno)</span>
                      </p>
                    </div>
                  </div>
                )}
                {competition.contactEmail && (
                  <div className="flex items-start gap-3">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                    <div>
                      <p className="text-xs text-[var(--text-tertiary)]">Kontakt</p>
                      <a href={`mailto:${competition.contactEmail}`} className="text-sm font-medium text-[var(--accent)] hover:underline">
                        {competition.contactEmail}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Propozice */}
          {competition.propozice && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <FileText className="h-4 w-4" /> Pravidla a propozice
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--text-primary)]">
                  {competition.propozice}
                </p>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Registration form */}
          {isOpen ? (
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
              <div>
                <h2 className="mb-1 text-lg font-bold text-[var(--text-primary)]">Přihlásit pár</h2>
                {spotsLeft !== null && spotsLeft > 0 && (
                  <p className="text-sm text-[var(--text-secondary)]">Zbývá {spotsLeft} volných míst.</p>
                )}
              </div>

              {/* Způsob platby — inline pod nadpisem */}
              {competition.paymentInfo && (
                <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4">
                  <p className="mb-1 flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
                    <CreditCard className="h-3.5 w-3.5" /> Způsob platby
                  </p>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--text-primary)]">
                    {competition.paymentInfo}
                  </p>
                </div>
              )}

              {/* 1. Kategorie */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">1. Vyberte kategorii</CardTitle>
                </CardHeader>
                <CardContent>
                  <Controller control={control} name="sectionId" render={({ field }) => (
                    <div className="flex flex-col gap-2">
                      {sections.map((section) => {
                        const sl = section.maxPairs ? section.maxPairs - section.registeredPairsCount : null;
                        const isFull = sl !== null && sl <= 0;
                        const almostFull = sl !== null && sl > 0 && sl <= 5;
                        const isSelected = field.value === section.id;
                        return (
                          <button key={section.id} type="button" disabled={isFull}
                            onClick={() => !isFull && field.onChange(section.id)}
                            className={`flex items-start justify-between rounded-[var(--radius-lg)] border p-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                              isSelected ? "border-[var(--accent)] bg-[var(--accent)]/5" : "border-[var(--border)] hover:bg-[var(--surface-secondary)]"
                            }`}>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">{section.name}</p>
                                {isFull && <Badge variant="destructive" className="text-xs">Obsazeno</Badge>}
                                {almostFull && <Badge variant="warning" className="text-xs">Poslední místa</Badge>}
                              </div>
                              <p className="text-xs text-[var(--text-secondary)]">
                                {section.ageCategory} · {section.level} · {section.dances.map((d) => d.name).join(", ")}
                              </p>
                            </div>
                            <div className="ml-3 shrink-0 text-right">
                              {section.entryFee
                                ? <p className="text-sm font-bold">{formatCurrency(section.entryFee, section.entryFeeCurrency ?? "EUR")}</p>
                                : <Badge variant="secondary">{section.registeredPairsCount} párů</Badge>
                              }
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )} />
                  {errors.sectionId && (
                    <p className="mt-1 text-xs text-[var(--destructive)]">{errors.sectionId.message}</p>
                  )}
                  {selectedSection?.entryFee && (
                    <div className="mt-3 rounded-[var(--radius-lg)] bg-[var(--accent)]/5 px-3 py-2 text-sm">
                      <span className="text-[var(--text-secondary)]">Startovné: </span>
                      <span className="font-semibold">{formatCurrency(selectedSection.entryFee, selectedSection.entryFeeCurrency ?? "EUR")}</span>
                      <span className="text-xs text-[var(--text-tertiary)]"> / pár</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 2. Tančící */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">2. Informace o tančících</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <p className="text-xs font-semibold text-[var(--text-tertiary)]">PRVNÍ TANČÍCÍ</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Jméno" placeholder="Jana" error={errors.dancer1FirstName?.message} {...register("dancer1FirstName")} />
                    <Input label="Příjmení" placeholder="Nováková" error={errors.dancer1LastName?.message} {...register("dancer1LastName")} />
                  </div>
                  <Input label="Klub / tanečná škola (volitelné)" placeholder="Taneční klub Bratislava" {...register("dancer1Club")} />
                  <div className="border-t border-[var(--border)] pt-4">
                    <p className="mb-3 text-xs font-semibold text-[var(--text-tertiary)]">PARTNER / PARTNERKA (VOLITELNÉ)</p>
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="Jméno" placeholder="Peter" {...register("dancer2FirstName")} />
                      <Input label="Příjmení" placeholder="Kováč" {...register("dancer2LastName")} />
                    </div>
                    <Input label="Klub / tanečná škola (volitelné)" placeholder="Taneční klub Bratislava" {...register("dancer2Club")} className="mt-3" />
                  </div>
                  <div className="border-t border-[var(--border)] pt-4">
                    <Input label="Email" type="email" placeholder="vas@email.cz"
                      hint="Na tento email zašleme potvrzení přihlášky"
                      error={errors.email?.message} {...register("email")} />
                  </div>
                </CardContent>
              </Card>

              {/* GDPR */}
              <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4">
                <Controller control={control} name="gdpr" render={({ field }) => (
                  <input type="checkbox" id="gdpr"
                    className="mt-0.5 h-4 w-4 rounded border-[var(--border)] accent-[var(--accent)]"
                    checked={field.value === true}
                    onChange={(e) => field.onChange(e.target.checked ? true : undefined)} />
                )} />
                <label htmlFor="gdpr" className="cursor-pointer text-sm text-[var(--text-secondary)]">
                  Souhlasím se zpracováním osobních údajů za účelem organizace a průběhu soutěže.{" "}
                  <Link href="/privacy" className="text-[var(--accent)] hover:underline">
                    Zásady ochrany osobních údajů
                  </Link>.
                </label>
              </div>
              {errors.gdpr && (
                <p className="-mt-4 text-xs text-[var(--destructive)]">{errors.gdpr.message}</p>
              )}

              <Button type="submit" size="lg" loading={submitting} className="w-full">
                Odeslat přihlášku <ChevronRight className="h-4 w-4" />
              </Button>
            </form>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] py-12 text-center">
              <AlertTriangle className="h-8 w-8 text-[var(--warning)]" />
              <p className="font-semibold text-[var(--text-primary)]">Registrace není otevřena</p>
              <p className="text-sm text-[var(--text-secondary)]">
                Přihlašování momentálně neprobíhá.
                {competition.contactEmail && (
                  <> Pro dotazy: <a href={`mailto:${competition.contactEmail}`} className="text-[var(--accent)] hover:underline">{competition.contactEmail}</a></>
                )}
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
