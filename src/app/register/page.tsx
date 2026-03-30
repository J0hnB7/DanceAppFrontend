"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { dancerApi } from "@/lib/api/dancer";
import { useLocale } from "@/contexts/locale-context";

const dancerRegisterSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/, "Musí obsahovat velké písmeno")
    .regex(/[0-9]/, "Musí obsahovat číslo"),
  gdprAccepted: z.boolean().refine((v) => v === true, { message: "Souhlas je povinný" }),
});

type DancerRegisterForm = z.infer<typeof dancerRegisterSchema>;

function RegisterPageInner() {
  const { t, locale } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<DancerRegisterForm>({ resolver: zodResolver(dancerRegisterSchema) });

  const onSubmit = async (values: DancerRegisterForm) => {
    setLoading(true);
    try {
      await dancerApi.register({
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        gdprAccepted: values.gdprAccepted,
      });
      setSuccess(true);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError("email", { message: apiErr?.message ?? t("dancer.register.failed") });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const params = next ? `?next=${encodeURIComponent(next)}` : "";
    window.location.href = `/api/v1/auth/oauth2/google${params}`;
  };

  return (
    <>
      <style>{`
        @keyframes orb{0%,100%{transform:translate(0,0)}33%{transform:translate(15px,-25px)}66%{transform:translate(-12px,18px)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        .dreg-fadein{animation:fadeUp .5s ease both}
        .dreg-input:focus{outline:none;border-color:#4F46E5;box-shadow:0 0 0 3px rgba(79,70,229,.12)}
        .dreg-btn{width:100%;padding:11px;border-radius:9px;background:linear-gradient(135deg,#4F46E5,#6D28D9);color:#fff;font-size:.93rem;font-weight:600;border:none;cursor:pointer;transition:all .2s;font-family:inherit}
        .dreg-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 20px rgba(79,70,229,.35)}
        .dreg-btn:disabled{opacity:.6;cursor:not-allowed}
        .dreg-btn-google{width:100%;padding:10px;border-radius:9px;background:#fff;color:#111827;font-size:.93rem;font-weight:600;border:1.5px solid #E5E7EB;cursor:pointer;transition:all .2s;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:10px}
        .dreg-btn-google:hover{background:#F9FAFB;border-color:#D1D5DB;transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,.08)}
        .dreg-link{color:#4F46E5;text-decoration:none;font-weight:500}
        .dreg-link:hover{text-decoration:underline}
        .dreg-divider{display:flex;align-items:center;gap:12px;color:#9CA3AF;font-size:.8rem;margin:4px 0}
        .dreg-divider::before,.dreg-divider::after{content:'';flex:1;height:1px;background:#E5E7EB}
        .dreg-checkbox-row{display:flex;align-items:flex-start;gap:10px;margin-top:4px}
        @media(max-width:860px){.dreg-left{display:none!important}.dreg-right{border-radius:0!important;box-shadow:none!important}}
        .auth-light{--surface:#fff;--border:#E5E7EB;--text-primary:#111827;--text-secondary:#6B7280;--text-tertiary:#9CA3AF;--background:#F9FAFB;--radius-md:8px}
      `}</style>

      <div style={{
        display: "flex", minHeight: "100vh", background: "#0A1628",
        fontFamily: "var(--font-inter, Inter, sans-serif)",
      }}>
        {/* LEFT — branding panel */}
        <div className="dreg-left" style={{
          flex: "0 0 52%", position: "relative", overflow: "hidden",
          display: "flex", flexDirection: "column", justifyContent: "space-between",
          padding: "48px 56px",
        }}>
          {[
            { w: 600, h: 600, bg: "radial-gradient(circle,rgba(79,70,229,.35) 0%,transparent 65%)", top: -200, right: -100, dur: "9s", del: "0s" },
            { w: 480, h: 480, bg: "radial-gradient(circle,rgba(124,58,237,.22) 0%,transparent 65%)", bottom: -160, left: -80, dur: "11s", del: "-4s" },
            { w: 340, h: 340, bg: "radial-gradient(circle,rgba(6,182,212,.18) 0%,transparent 65%)", top: "40%", right: "10%", dur: "13s", del: "-7s" },
          ].map((o, i) => (
            <div key={i} style={{
              position: "absolute", borderRadius: "50%", filter: "blur(80px)", pointerEvents: "none",
              width: o.w, height: o.h, background: o.bg,
              animation: `orb ${o.dur} ease-in-out ${o.del} infinite`,
              ...(o.top !== undefined ? { top: o.top } : { bottom: (o as { bottom: number }).bottom }),
              ...(o.right !== undefined ? { right: o.right } : {}),
              ...(o.left !== undefined ? { left: o.left } : {}),
            }} />
          ))}

          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none", position: "relative", zIndex: 1 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#4F46E5,#06B6D4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".72rem", fontWeight: 900, color: "#fff", letterSpacing: "-.05em" }}>DA</div>
            <span style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontWeight: 800, fontSize: "1.1rem", color: "#fff", letterSpacing: "-.03em" }}>DanceApp</span>
          </Link>

          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 13px", borderRadius: 100, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.07)", fontSize: ".73rem", fontWeight: 500, color: "rgba(255,255,255,.7)", marginBottom: 24 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", display: "inline-block", flexShrink: 0 }} />
              {locale === "en" ? "Dancer Platform" : "Taneční platforma"}
            </div>
            <h2 style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontSize: "clamp(1.9rem,2.8vw,2.7rem)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-.04em", color: "#fff", marginBottom: 16 }}>
              {locale === "en" ? "Your dance journey" : "Vaše taneční cesta"}<br />
              <em style={{ fontStyle: "italic", background: "linear-gradient(105deg,#a5b4fc 0%,#67e8f9 45%,#6ee7b7 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                {locale === "en" ? "starts here." : "začíná tady."}
              </em>
            </h2>
            <p style={{ fontSize: ".97rem", lineHeight: 1.72, color: "rgba(255,255,255,.5)", maxWidth: 400, marginBottom: 40 }}>
              {locale === "en"
                ? "Register for competitions, track your results, and connect with your partner."
                : "Přihlaste se na soutěže, sledujte výsledky a propojte se s partnerem."}
            </p>
          </div>

          <div style={{ position: "relative", zIndex: 1 }}>
            <p style={{ fontSize: ".73rem", color: "rgba(255,255,255,.25)" }}>{t("auth.copyright")}</p>
          </div>
        </div>

        {/* RIGHT — form panel */}
        <div className="dreg-right" style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          background: "#F3F4F6", padding: "32px 24px",
        }}>
          <div style={{ width: "100%", maxWidth: 420 }}>
            <div className="dreg-fadein" style={{
              background: "#fff", borderRadius: 16, padding: "36px 32px",
              boxShadow: "0 4px 6px rgba(0,0,0,.04),0 20px 48px rgba(0,0,0,.09)",
              border: "1px solid #E5E7EB",
            }}>
              {success ? (
                <div style={{ textAlign: "center", padding: "16px 0" }}>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg,#4ade80,#22c55e)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: "1.5rem" }}>✓</div>
                  <h2 style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontSize: "1.2rem", fontWeight: 800, color: "#111827", marginBottom: 10 }}>
                    {t("dancer.register.successTitle")}
                  </h2>
                  <p style={{ fontSize: ".9rem", color: "#6B7280", lineHeight: 1.6, marginBottom: 24 }}>
                    {t("dancer.register.successDesc")}
                  </p>
                  <Link href="/login" className="dreg-btn" style={{ display: "block", textAlign: "center", textDecoration: "none", padding: "11px", borderRadius: 9, background: "linear-gradient(135deg,#4F46E5,#6D28D9)", color: "#fff", fontWeight: 600 }}>
                    {t("auth.signIn")}
                  </Link>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#4F46E5,#06B6D4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".6rem", fontWeight: 900, color: "#fff" }}>DA</div>
                      <h1 style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontSize: "1.2rem", fontWeight: 800, color: "#111827", letterSpacing: "-.03em" }}>
                        {t("dancer.register.title")}
                      </h1>
                    </div>
                    <p style={{ fontSize: ".85rem", color: "#6B7280", marginTop: 6 }}>{t("dancer.register.subtitle")}</p>
                  </div>

                  <button
                    type="button"
                    className="dreg-btn-google"
                    onClick={handleGoogleLogin}
                    style={{ marginBottom: 16 }}
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                      <path fill="#4285F4" d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/>
                      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
                    </svg>
                    {t("dancer.register.continueWithGoogle")}
                  </button>

                  <div className="dreg-divider">{locale === "en" ? "or" : "nebo"}</div>

                  <form onSubmit={handleSubmit(onSubmit)} className="auth-light" style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 8 }}>
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
                      label={t("auth.email")}
                      type="email"
                      autoComplete="email"
                      placeholder={t("auth.emailPlaceholder")}
                      error={errors.email?.message}
                      {...register("email")}
                    />

                    <Input
                      label={t("auth.passwordLabel")}
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder={t("auth.passwordPlaceholder")}
                      error={errors.password?.message}
                      rightIcon={
                        <button type="button" onClick={() => setShowPassword((s) => !s)} className="pointer-events-auto" style={{ color: "#9CA3AF" }}>
                          {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                        </button>
                      }
                      {...register("password")}
                    />

                    <div className="dreg-checkbox-row">
                      <input
                        id="gdpr-dancer"
                        type="checkbox"
                        style={{ marginTop: 3, width: 16, height: 16, flexShrink: 0, cursor: "pointer", accentColor: "#4F46E5" }}
                        {...register("gdprAccepted")}
                      />
                      <label htmlFor="gdpr-dancer" style={{ fontSize: ".82rem", color: "#6B7280", lineHeight: 1.5, cursor: "pointer" }}>
                        {t("dancer.register.gdprText")}{" "}
                        <Link href="/privacy" className="dreg-link">{t("dancer.register.gdprLink")}</Link>
                      </label>
                    </div>
                    {errors.gdprAccepted && (
                      <p style={{ fontSize: ".8rem", color: "#EF4444", marginTop: -8 }}>{errors.gdprAccepted.message}</p>
                    )}

                    <button type="submit" className="dreg-btn" disabled={loading} style={{ marginTop: 4 }}>
                      {loading ? t("dancer.register.creating") : t("dancer.register.submit")}
                    </button>

                    <p style={{ textAlign: "center", fontSize: ".83rem", color: "#6B7280", marginTop: 4 }}>
                      {t("auth.hasAccount")}{" "}
                      <Link href="/login" className="dreg-link">{t("auth.signIn")}</Link>
                    </p>
                  </form>
                </>
              )}
            </div>

            <p style={{ textAlign: "center", marginTop: 20, fontSize: ".78rem", color: "#9CA3AF" }}>
              <Link href="/login" style={{ color: "#6B7280", textDecoration: "none" }}>
                {t("auth.signIn")} →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterPageInner />
    </Suspense>
  );
}
