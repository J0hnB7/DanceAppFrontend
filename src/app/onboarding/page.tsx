"use client";

import { useState } from "react";
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
  birthYear: z
    .string()
    .min(1)
    .refine((v) => {
      const y = parseInt(v, 10);
      return !isNaN(y) && y >= 1920 && y <= currentYear;
    }, { message: "Zadejte platný rok narození" }),
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

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<OnboardingForm>({ resolver: zodResolver(onboardingSchema) });

  const goToPartnerStep = async () => {
    const ok = await trigger(["firstName", "lastName", "birthYear", "club"]);
    if (ok) setStep("partner");
  };

  const onSubmit = async (values: OnboardingForm) => {
    setLoading(true);
    setApiError(null);
    try {
      await dancerApi.completeOnboarding({
        firstName: values.firstName,
        lastName: values.lastName,
        birthYear: parseInt(values.birthYear, 10),
        club: values.club || undefined,
        partnerNameText: values.partnerNameText || undefined,
      });
      router.replace("/profile");
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
      `}</style>

      <div style={{
        minHeight: "100vh", background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center",
        padding: "32px 16px", fontFamily: "var(--font-inter, Inter, sans-serif)",
      }}>
        <div style={{ width: "100%", maxWidth: 480 }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32, justifyContent: "center" }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#4F46E5,#06B6D4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".72rem", fontWeight: 900, color: "#fff" }}>PP</div>
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

            <form onSubmit={handleSubmit(onSubmit)}>
              {step === "profile" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <Input
                      label={t("dancer.register.firstName")}
                      placeholder="Jana"
                      error={errors.firstName?.message}
                      {...register("firstName")}
                    />
                    <Input
                      label={t("dancer.register.lastName")}
                      placeholder="Nováková"
                      error={errors.lastName?.message}
                      {...register("lastName")}
                    />
                  </div>

                  <Input
                    label={t("dancer.onboarding.birthYear")}
                    type="number"
                    placeholder="2000"
                    inputMode="numeric"
                    min={1920}
                    max={currentYear}
                    error={errors.birthYear?.message}
                    {...register("birthYear")}
                  />

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
