"use client";

import { useState } from "react";
import { LogoMark } from "@/components/ui/logo-mark";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { dancerApi } from "@/lib/api/dancer";
import { useAuthStore } from "@/store/auth-store";
import { useLocale } from "@/contexts/locale-context";

const currentYear = new Date().getFullYear();

const onboardingSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  birthDate: z.string().min(1, "Zadejte datum narození").refine((v) => {
    const y = new Date(v).getFullYear();
    return y >= 1920 && y <= currentYear;
  }, { message: "Zadejte platné datum narození" }),
  gender: z.enum(["MALE", "FEMALE"], { error: "Vyberte pohlaví" }),
  club: z.string().optional(),
  partnerNameText: z.string().optional(),
});

type OnboardingForm = z.infer<typeof onboardingSchema>;

const STEPS = ["profile", "partner"] as const;
type Step = (typeof STEPS)[number];

export default function OnboardingPage() {
  const { t } = useLocale();
  const router = useRouter();
  const { user } = useAuthStore();

  const [step, setStep] = useState<Step>("profile");
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const nameParts = user?.name?.split(" ") ?? [];
  const defaultFirstName = nameParts[0] ?? "";
  const defaultLastName = nameParts.slice(1).join(" ") ?? "";

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OnboardingForm>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      firstName: defaultFirstName,
      lastName: defaultLastName,
    },
  });

  const selectedGender = watch("gender");

  const [birthParts, setBirthParts] = useState({ year: "", month: "", day: "" });

  const updateBirthDate = (parts: { year: string; month: string; day: string }) => {
    if (parts.year && parts.month && parts.day) {
      setValue("birthDate", `${parts.year}-${parts.month.padStart(2, "0")}-${parts.day.padStart(2, "0")}`, { shouldValidate: true });
    } else {
      setValue("birthDate", "", { shouldValidate: false });
    }
  };

  const setBirthPart = (key: "year" | "month" | "day", value: string) => {
    const next = { ...birthParts, [key]: value };
    setBirthParts(next);
    updateBirthDate(next);
  };

  const MONTHS_CS = ["Leden","Únor","Březen","Duben","Květen","Červen","Červenec","Srpen","Září","Říjen","Listopad","Prosinec"];
  const MONTHS_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const { locale } = useLocale();
  const MONTHS = locale === "cs" ? MONTHS_CS : MONTHS_EN;

  const daysInMonth = birthParts.year && birthParts.month
    ? new Date(Number(birthParts.year), Number(birthParts.month), 0).getDate()
    : 31;

  const goToPartnerStep = async () => {
    const ok = await trigger(["firstName", "lastName", "birthDate", "gender", "club"]);
    if (ok) setStep("partner");
  };

  const onSubmit = async (values: OnboardingForm) => {
    setLoading(true);
    setApiError(null);
    try {
      await dancerApi.completeOnboarding({
        firstName: values.firstName,
        lastName: values.lastName,
        birthDate: values.birthDate,
        gender: values.gender,
        club: values.club || undefined,
        partnerNameText: values.partnerNameText || undefined,
      });
      router.replace("/dashboard/settings");
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setApiError(apiErr?.message ?? t("dancer.onboarding.error"));
    } finally {
      setLoading(false);
    }
  };

  const stepIndex = STEPS.indexOf(step);

  return (
    <>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        .onb-fade{animation:fadeUp .4s ease both}
        .onb-btn{width:100%;padding:12px;border-radius:10px;background:linear-gradient(135deg,#4F46E5,#6D28D9);color:#fff;font-size:.95rem;font-weight:600;border:none;cursor:pointer;transition:all .2s;font-family:inherit}
        .onb-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 20px rgba(79,70,229,.35)}
        .onb-btn:disabled{opacity:.6;cursor:not-allowed}
        .onb-btn-secondary{width:100%;padding:11px;border-radius:10px;background:transparent;color:#6B7280;font-size:.93rem;font-weight:500;border:1.5px solid #E5E7EB;cursor:pointer;transition:all .2s;font-family:inherit}
        .onb-btn-secondary:hover{background:#F9FAFB;border-color:#D1D5DB}
        .auth-light{--surface:#fff;--border:#E5E7EB;--text-primary:#111827;--text-secondary:#6B7280;--text-tertiary:#9CA3AF;--radius-md:8px;--accent:#4F46E5;--destructive:#EF4444}
      `}</style>

      <div style={{
        minHeight: "100vh", background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center",
        padding: "32px 16px", fontFamily: "var(--font-inter, Inter, sans-serif)",
      }}>
        <div style={{ width: "100%", maxWidth: 480 }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32, justifyContent: "center" }}>
            <LogoMark size={32} />
            <span style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontWeight: 800, fontSize: "1.1rem", color: "#111827" }}>ProPodium</span>
          </div>

          {/* Progress */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28, justifyContent: "center" }}>
            {STEPS.map((s, i) => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: ".75rem", fontWeight: 700,
                  background: i <= stepIndex ? "linear-gradient(135deg,#4F46E5,#6D28D9)" : "#E5E7EB",
                  color: i <= stepIndex ? "#fff" : "#9CA3AF",
                  transition: "all .3s",
                }}>
                  {i < stepIndex ? "✓" : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ width: 32, height: 2, background: i < stepIndex ? "#4F46E5" : "#E5E7EB", transition: "background .3s" }} />
                )}
              </div>
            ))}
          </div>

          <div className="onb-fade" style={{
            background: "#fff", borderRadius: 16, padding: "36px 32px",
            boxShadow: "0 4px 6px rgba(0,0,0,.04),0 20px 48px rgba(0,0,0,.09)",
            border: "1px solid #E5E7EB",
          }}>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontSize: "1.3rem", fontWeight: 800, color: "#111827", marginBottom: 6 }}>
                {step === "profile" ? t("dancer.onboarding.titleProfile") : t("dancer.onboarding.titlePartner")}
              </h1>
              <p style={{ fontSize: ".87rem", color: "#6B7280", lineHeight: 1.6 }}>
                {step === "profile" ? t("dancer.onboarding.subtitleProfile") : t("dancer.onboarding.subtitlePartner")}
                {user && `, ${user.email}`}
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="auth-light">
              {step === "profile" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <Input
                      label={t("dancer.onboarding.firstNameDancer")}
                      placeholder="Jana"
                      error={errors.firstName?.message}
                      {...register("firstName")}
                    />
                    <Input
                      label={t("dancer.onboarding.lastNameDancer")}
                      placeholder="Nováková"
                      error={errors.lastName?.message}
                      {...register("lastName")}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: ".8rem", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 6 }}>
                      {t("dancer.onboarding.birthDate")}
                    </label>
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr", gap: 8 }}>
                      <select
                        value={birthParts.year}
                        onChange={(e) => setBirthPart("year", e.target.value)}
                        style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${errors.birthDate ? "#EF4444" : "#E5E7EB"}`, background: "#fff", color: birthParts.year ? "#111827" : "#9CA3AF", fontSize: 16, fontFamily: "inherit", cursor: "pointer" }}
                        aria-label="Rok"
                      >
                        <option value="">{locale === "cs" ? "Rok" : "Year"}</option>
                        {Array.from({ length: currentYear - 1919 }, (_, i) => currentYear - i).map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                      <select
                        value={birthParts.month}
                        onChange={(e) => setBirthPart("month", e.target.value)}
                        style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${errors.birthDate ? "#EF4444" : "#E5E7EB"}`, background: "#fff", color: birthParts.month ? "#111827" : "#9CA3AF", fontSize: 16, fontFamily: "inherit", cursor: "pointer" }}
                        aria-label="Měsíc"
                      >
                        <option value="">{locale === "cs" ? "Měsíc" : "Month"}</option>
                        {MONTHS.map((m, i) => (
                          <option key={i + 1} value={i + 1}>{m}</option>
                        ))}
                      </select>
                      <select
                        value={birthParts.day}
                        onChange={(e) => setBirthPart("day", e.target.value)}
                        style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${errors.birthDate ? "#EF4444" : "#E5E7EB"}`, background: "#fff", color: birthParts.day ? "#111827" : "#9CA3AF", fontSize: 16, fontFamily: "inherit", cursor: "pointer" }}
                        aria-label="Den"
                      >
                        <option value="">{locale === "cs" ? "Den" : "Day"}</option>
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                    {errors.birthDate && (
                      <p style={{ fontSize: ".8rem", color: "#EF4444", marginTop: 4 }}>{errors.birthDate.message}</p>
                    )}
                    <input type="hidden" {...register("birthDate")} />
                  </div>

                  {/* Gender toggle */}
                  <div>
                    <label style={{
                      fontSize: ".8rem", fontWeight: 600, color: "#6B7280",
                      textTransform: "uppercase", letterSpacing: ".05em",
                      display: "block", marginBottom: 6,
                    }}>
                      {t("dancer.onboarding.gender")}
                    </label>
                    <div style={{ display: "flex", gap: 8 }}>
                      {(["MALE", "FEMALE"] as const).map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setValue("gender", g, { shouldValidate: true })}
                          aria-pressed={selectedGender === g}
                          style={{
                            flex: 1, padding: "10px 0", borderRadius: 9, border: "1.5px solid",
                            borderColor: selectedGender === g ? "#4F46E5" : "#E5E7EB",
                            background: selectedGender === g ? "#4F46E5" : "transparent",
                            color: selectedGender === g ? "#fff" : "#6B7280",
                            fontWeight: 600, fontSize: ".9rem", cursor: "pointer",
                            transition: "all .15s", fontFamily: "inherit",
                          }}
                        >
                          {g === "MALE" ? t("dancer.onboarding.genderMale") : t("dancer.onboarding.genderFemale")}
                        </button>
                      ))}
                    </div>
                    {errors.gender && (
                      <p style={{ fontSize: ".8rem", color: "#EF4444", marginTop: 4 }}>{errors.gender.message}</p>
                    )}
                  </div>

                  <Input
                    label={t("dancer.onboarding.club")}
                    placeholder={t("dancer.onboarding.clubPlaceholder")}
                    error={errors.club?.message}
                    {...register("club")}
                  />

                  <button type="button" className="onb-btn" onClick={goToPartnerStep} style={{ marginTop: 8 }}>
                    {t("common.next")} →
                  </button>
                </div>
              )}

              {step === "partner" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{
                    padding: "12px 16px", borderRadius: 10, background: "#F0F9FF",
                    border: "1px solid #BAE6FD", fontSize: ".85rem", color: "#0369A1", lineHeight: 1.6,
                  }}>
                    {t("dancer.onboarding.partnerHint")}
                  </div>

                  <Input
                    label={t("dancer.onboarding.partnerNameText")}
                    placeholder={t("dancer.onboarding.partnerNamePlaceholder")}
                    error={errors.partnerNameText?.message}
                    {...register("partnerNameText")}
                  />

                  {apiError && (
                    <p style={{ fontSize: ".85rem", color: "#EF4444", padding: "8px 12px", background: "#FEF2F2", borderRadius: 8, border: "1px solid #FECACA" }}>
                      {apiError}
                    </p>
                  )}

                  <button type="submit" className="onb-btn" disabled={loading} style={{ marginTop: 8 }}>
                    {loading ? t("dancer.onboarding.saving") : t("dancer.onboarding.submit")}
                  </button>

                  <button type="button" className="onb-btn-secondary" onClick={() => setStep("profile")}>
                    ← {t("common.back")}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
