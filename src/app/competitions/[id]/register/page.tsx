"use client";

import { use, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { CheckCircle2, Trophy, ArrowLeft, FileText, AlertTriangle, Mail, Building2 } from "lucide-react";
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
  gdpr: z.literal(true, "Souhlas s GDPR je povinný"),
});

type RegisterForm = z.infer<typeof schema>;

interface RegistrationResult {
  pairId: string;
  startNumber: number;
  sectionName: string;
  amountDue: number;
  currency: string;
  paymentMethod?: string;
  paymentConfig?: Record<string, string>;
  confirmationEmail?: { subject: string; body: string };
}

export default function PairRegistrationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [result, setResult] = useState<RegistrationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [pendingValues, setPendingValues] = useState<RegisterForm | null>(null);

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
    setConflictWarning(null);
    setPendingValues(null);
    try {
      const res = await apiClient.post<RegistrationResult>(
        `/competitions/${id}/public-registration`,
        values
      );
      setResult(res.data);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      toast({ title: apiErr?.message ?? "Přihlášení se nezdařilo", variant: "destructive" } as Parameters<typeof toast>[0]);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: RegisterForm) => {
    // Task 9: Check for double registration conflicts
    try {
      const conflictRes = await apiClient.get<{ hasConflict: boolean; conflictingCompetition: string | null }>(
        `/competitions/${id}/check-conflicts`
      );
      if (conflictRes.data.hasConflict) {
        setConflictWarning(conflictRes.data.conflictingCompetition ?? "jiná soutěž");
        setPendingValues(values);
        return;
      }
    } catch {
      // If check fails, proceed anyway
    }
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
        <p className="font-medium text-[var(--text-primary)]">Soutěž nenalezena</p>
        <p className="text-sm text-[var(--text-secondary)]">Tento odkaz může být neplatný.</p>
        <Link href="/competitions"><Button variant="outline">Procházet soutěže</Button></Link>
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
              <CardTitle>Přihláška potvrzena!</CardTitle>
              <CardDescription>{competition.name}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="rounded-[var(--radius-lg)] bg-[var(--surface-secondary)] p-4 text-left">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs text-[var(--text-secondary)]">Startovní číslo</span>
                  <span className="text-2xl font-black text-[var(--text-primary)]">#{result.startNumber}</span>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">{result.sectionName}</p>
              </div>
            </CardContent>
          </Card>

          {/* Task 7: Bank transfer info */}
          {result.paymentMethod === "BANK_TRANSFER" && result.amountDue > 0 && (
            <Card className="mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-[var(--accent)]" />
                  Platba bankovním převodem
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-xs text-[var(--text-secondary)]">
                  Proveďte prosím platbu s níže uvedenými údaji. Bez správného referenčního čísla nemůžeme přiřadit platbu k vaší přihlášce.
                </p>
                <div className="space-y-2 text-sm">
                  {result.paymentConfig?.holder && (
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Majitel účtu</span>
                      <span className="font-medium">{result.paymentConfig.holder}</span>
                    </div>
                  )}
                  {result.paymentConfig?.iban && (
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">IBAN</span>
                      <span className="font-mono font-medium">{result.paymentConfig.iban}</span>
                    </div>
                  )}
                  {result.paymentConfig?.bic && (
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">BIC / SWIFT</span>
                      <span className="font-mono font-medium">{result.paymentConfig.bic}</span>
                    </div>
                  )}
                  {result.paymentConfig?.address && (
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Banka</span>
                      <span className="font-medium text-right max-w-[60%]">{result.paymentConfig.address}</span>
                    </div>
                  )}
                  <div className="mt-2 border-t border-[var(--border)] pt-2">
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Částka</span>
                      <span className="font-bold text-[var(--text-primary)]">{formatCurrency(result.amountDue, result.currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Referenční číslo</span>
                      <span className="font-mono font-bold text-[var(--accent)]">{result.pairId.slice(-6).toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Task 8: Confirmation email preview */}
          {result.confirmationEmail && (
            <Card className="mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-[var(--success)]" />
                  Potvrzení odesláno emailem
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-secondary)] p-3">
                  <p className="mb-1 text-xs font-semibold text-[var(--text-secondary)]">
                    Předmět: {result.confirmationEmail.subject}
                  </p>
                  <pre className="whitespace-pre-wrap font-sans text-xs text-[var(--text-secondary)] leading-relaxed">
                    {result.confirmationEmail.body}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}

          <Link href={`/competitions/${id}`}>
            <Button variant="outline" className="w-full">Zpět na stránku soutěže</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isOpen = competition.status === "REGISTRATION_OPEN";

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <PublicNav />
      <div className="mx-auto max-w-xl px-4 py-8">
        {/* Back link */}
        <Link
          href={`/competitions/${id}`}
          className="mb-6 flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" /> Zpět na soutěž
        </Link>

        {/* Competition header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">{competition.name}</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {competition.location} · {formatDate(competition.startDate)}
          </p>
          {competition.registrationDeadline && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--warning)]">
              <AlertTriangle className="h-3.5 w-3.5" />
              Uzávěrka: {formatDate(competition.registrationDeadline)}
            </p>
          )}
        </div>

        {/* Propozice */}
        {competition.propozice && (
          <div className="mb-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
            <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
              <FileText className="h-4 w-4 text-[var(--accent)]" />
              <span className="text-sm font-medium text-[var(--text-primary)]">Propozice</span>
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
              <p className="font-medium text-[var(--text-primary)]">Registrace není otevřena</p>
              <p className="text-sm text-[var(--text-secondary)]">
                Přihlašování pro tuto soutěž momentálně neprobíhá.
              </p>
              <Link href={`/competitions/${id}`}>
                <Button variant="outline">Zpět na soutěž</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
            {/* 1. Section selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">1. Vyberte kategorii</CardTitle>
              </CardHeader>
              <CardContent>
                <Controller
                  control={control}
                  name="sectionId"
                  render={({ field }) => (
                    <div className="flex flex-col gap-2">
                      {sections?.map((section) => {
                        const spotsLeft = section.maxPairs
                          ? section.maxPairs - section.registeredPairsCount
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
                                {isFull && <Badge variant="destructive" className="text-xs">Obsazeno</Badge>}
                                {almostFull && <Badge variant="warning" className="text-xs">Poslední místa</Badge>}
                              </div>
                              <p className="text-xs text-[var(--text-secondary)]">
                                {section.ageCategory} · {section.level} · {section.dances.map((d) => d.name).join(", ")}
                              </p>
                              {spotsLeft !== null && !isFull && (
                                <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                                  {spotsLeft} volných míst
                                </p>
                              )}
                            </div>
                            <div className="ml-3 shrink-0 text-right">
                              {section.entryFee ? (
                                <p className="text-sm font-bold text-[var(--text-primary)]">
                                  {formatCurrency(section.entryFee, section.entryFeeCurrency ?? "EUR")}
                                </p>
                              ) : (
                                <Badge variant="secondary">{section.registeredPairsCount} párů</Badge>
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
                    <span className="text-xs text-[var(--text-tertiary)]"> / pár</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 2. Dancer info */}
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
              </CardContent>
            </Card>

            {/* 3. Contact & discount */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">3. Kontakt a platba</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Input
                  label="Email"
                  type="email"
                  placeholder="vas@email.cz"
                  hint="Na tento email zašleme potvrzení přihlášky"
                  error={errors.email?.message}
                  {...register("email")}
                />
                <Input
                  label="Slevový kód (volitelné)"
                  placeholder="EARLYBIRD"
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
                Souhlasím se zpracováním osobních údajů za účelem organizace a průběhu soutěže.{" "}
                <Link href="/privacy" className="text-[var(--accent)] hover:underline">
                  Zásady ochrany osobních údajů
                </Link>
                .
              </label>
            </div>
            {errors.gdpr && (
              <p className="-mt-4 text-xs text-[var(--destructive)]">{errors.gdpr.message}</p>
            )}

            {/* Task 9: Double registration conflict warning */}
            {conflictWarning && (
              <div className="rounded-[var(--radius-lg)] border border-[var(--warning)]/40 bg-[var(--warning)]/5 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--warning)]" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--text-primary)]">Možný konflikt registrace</p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      Tento pár je pravděpodobně přihlášen na jinou soutěž ve stejném termínu: <strong>{conflictWarning}</strong>.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => { setConflictWarning(null); setPendingValues(null); }}
                      >
                        Zrušit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => pendingValues && doSubmit(pendingValues)}
                        loading={loading}
                      >
                        Přesto se přihlásit
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <Button type="submit" size="lg" loading={loading} className="w-full">
              Odeslat přihlášku
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

function PublicNav() {
  return (
    <nav className="border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
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
