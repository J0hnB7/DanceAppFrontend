"use client";

import { Suspense, useState, useEffect } from "react";
import { LogoMark } from "@/components/ui/logo-mark";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/store/auth-store";
import { useLocale } from "@/contexts/locale-context";
import { GoogleLogin } from "@react-oauth/google";
import { googleAuthApi } from "@/lib/api/google-auth";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  totpCode: z.string().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

function LoginPageInner() {
  const { t: _t, locale } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const { loginWithTokens } = useAuthStore();

  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [requireTotp, setRequireTotp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);
  const t = (key: string, params?: Record<string, string | number>) => mounted ? _t(key, params) : "\u00A0";

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginForm) => {
    setLoading(true);
    try {
      const tokens = await authApi.login(values);
      await loginWithTokens(tokens.accessToken);
      router.replace(callbackUrl);
    } catch (err: unknown) {
      const apiErr = err as { status?: number; message?: string };
      if (apiErr?.status === 403 && apiErr?.message?.includes("TOTP")) {
        setRequireTotp(true);
      } else {
        setError("password", { message: t("auth.invalidEmailOrPassword") });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes orb{0%,100%{transform:translate(0,0)}33%{transform:translate(15px,-25px)}66%{transform:translate(-12px,18px)}}
        @keyframes pdot{0%{box-shadow:0 0 0 0 rgba(74,222,128,.6)}70%{box-shadow:0 0 0 8px rgba(74,222,128,0)}100%{box-shadow:0 0 0 0 rgba(74,222,128,0)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        .login-fadein{animation:fadeUp .5s ease both}
        .login-fadein-1{animation:fadeUp .5s ease .08s both}
        .login-fadein-2{animation:fadeUp .5s ease .16s both}
        .login-fadein-3{animation:fadeUp .5s ease .24s both}
        .badge-dot-g{width:6px;height:6px;border-radius:50%;background:#4ade80;box-shadow:0 0 0 0 rgba(74,222,128,.6);animation:pdot 2s infinite;display:inline-block;flex-shrink:0}
        .login-input:focus{outline:none;border-color:#4F46E5;box-shadow:0 0 0 3px rgba(79,70,229,.12)}
        .login-btn{width:100%;padding:11px;border-radius:9px;background:linear-gradient(135deg,#4F46E5,#6D28D9);color:#fff;font-size:.93rem;font-weight:600;border:none;cursor:pointer;transition:all .2s;font-family:inherit}
        .login-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 20px rgba(79,70,229,.35)}
        .login-btn:disabled{opacity:.6;cursor:not-allowed}
        .login-link{color:#4F46E5;text-decoration:none;font-weight:500}
        .login-link:hover{text-decoration:underline}
        @media(max-width:860px){.login-left{display:none!important}.login-right{border-radius:0!important;box-shadow:none!important}}
        .auth-light{--surface:#fff;--border:#E5E7EB;--text-primary:#111827;--text-secondary:#6B7280;--text-tertiary:#9CA3AF;--background:#F9FAFB;--radius-md:8px}
      `}</style>

      <div style={{
        display: "flex", minHeight: "100vh", background: "#0A1628",
        fontFamily: "var(--font-inter, Inter, sans-serif)",
      }}>
        {/* LEFT — branding panel */}
        <div className="login-left" style={{
          flex: "0 0 52%", position: "relative", overflow: "hidden",
          display: "flex", flexDirection: "column", justifyContent: "space-between",
          padding: "48px 56px",
        }}>
          {/* orbs */}
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

          {/* logo */}
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none", position: "relative", zIndex: 1 }}>
            <LogoMark size={32} />
            <span style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontWeight: 800, fontSize: "1.1rem", color: "#fff", letterSpacing: "-.03em" }}>ProPodium</span>
          </Link>

          {/* center content */}
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 13px", borderRadius: 100, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.07)", fontSize: ".73rem", fontWeight: 500, color: "rgba(255,255,255,.7)", marginBottom: 24 }}>
              <span className="badge-dot-g" /> {t("auth.systemTagline")}
            </div>
            <h2 style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontSize: "clamp(1.9rem,2.8vw,2.7rem)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-.04em", color: "#fff", marginBottom: 16 }}>
              {mounted ? (locale === "en" ? "Organize competitions" : "Organizujte soutěže") : "\u00A0"}<br />
              <em style={{ fontStyle: "italic", background: "linear-gradient(105deg,#a5b4fc 0%,#67e8f9 45%,#6ee7b7 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>{mounted ? (locale === "en" ? "without paperwork." : "bez papírů.") : "\u00A0"}</em>
            </h2>
            <p style={{ fontSize: ".97rem", lineHeight: 1.72, color: "rgba(255,255,255,.5)", maxWidth: 400, marginBottom: 40 }}>
              {t("auth.taglineDesc")}
            </p>

          </div>

          {/* bottom */}
          <div style={{ position: "relative", zIndex: 1 }}>
            <p style={{ fontSize: ".73rem", color: "rgba(255,255,255,.25)" }}>{t("auth.copyright")}</p>
          </div>
        </div>

        {/* RIGHT — form panel */}
        <div className="login-right" style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          background: "#F3F4F6", padding: "32px 24px",
          borderRadius: "0",
        }}>
          <div style={{ width: "100%", maxWidth: 400 }}>
            {/* Mobile logo */}
            <div className="login-left" style={{
              display: "none",
              marginBottom: 32, textAlign: "center",
              flexDirection: "column", alignItems: "center", gap: 8,
            }}>
              <LogoMark size={36} />
              <span style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontWeight: 800, fontSize: "1.1rem", color: "#111827" }}>ProPodium</span>
            </div>

            <div className="login-fadein" style={{
              background: "#fff", borderRadius: 16, padding: "36px 32px",
              boxShadow: "0 4px 6px rgba(0,0,0,.04),0 20px 48px rgba(0,0,0,.09)",
              border: "1px solid #E5E7EB",
            }}>
              {/* header */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <LogoMark size={28} />
                  <h1 style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontSize: "1.25rem", fontWeight: 800, color: "#111827", letterSpacing: "-.03em" }}>
                    {t("auth.signIn")}
                  </h1>
                </div>
                <p style={{ fontSize: ".85rem", color: "#6B7280", marginTop: 6 }}>{t("auth.signInDesc")}</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="auth-light" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <Input
                  label={t("auth.email")}
                  type="email"
                  autoComplete="email"
                  placeholder={t("auth.emailPlaceholder")}
                  error={errors.email?.message}
                  {...register("email")}
                />

                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <Input
                    label={t("auth.passwordLabel")}
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder={t("auth.passwordPlaceholder")}
                    error={errors.password?.message}
                    rightIcon={
                      <button type="button" onClick={() => setShowPassword((s) => !s)} className="pointer-events-auto" style={{ color: "#9CA3AF" }}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                    {...register("password")}
                  />
                  <div style={{ textAlign: "right" }}>
                    <Link href="/forgot-password" className="login-link" style={{ fontSize: ".8rem" }}>
                      {t("auth.forgotPassword")}
                    </Link>
                  </div>
                </div>

                {requireTotp && (
                  <Input
                    label={t("auth.authenticatorCode")}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder={t("auth.authenticatorPlaceholder")}
                    autoFocus
                    error={errors.totpCode?.message}
                    {...register("totpCode")}
                  />
                )}

                <button type="submit" className="login-btn" disabled={loading} style={{ marginTop: 4 }}>
                  {loading ? t("auth.signingIn") : t("auth.signIn")}
                </button>

                {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#9CA3AF", fontSize: ".8rem", margin: "4px 0" }}>
                      <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
                      {mounted ? (locale === "en" ? "or" : "nebo") : ""}
                      <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
                    </div>

                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <GoogleLogin
                        onSuccess={async (credentialResponse) => {
                          if (!credentialResponse.credential) return;
                          setGoogleError(null);
                          try {
                            const result = await googleAuthApi.signIn(credentialResponse.credential);
                            await loginWithTokens(result.accessToken);
                            if (result.requiresOnboarding) {
                              router.replace("/onboarding");
                            } else {
                              router.replace(callbackUrl);
                            }
                          } catch {
                            setGoogleError(t("auth.googleSignInFailed") || "Google sign-in failed");
                          }
                        }}
                        onError={() => setGoogleError(t("auth.googleSignInFailed") || "Google sign-in failed")}
                        width="368"
                      />
                    </div>
                  </>
                )}
                {googleError && (
                  <p style={{ fontSize: ".8rem", color: "#EF4444", textAlign: "center", marginTop: -4 }}>{googleError}</p>
                )}

                <p style={{ textAlign: "center", fontSize: ".83rem", color: "#6B7280", marginTop: 4 }}>
                  {t("auth.noAccountLink")}{" "}
                  <Link href="/register" className="login-link">{t("auth.signUp")}</Link>
                </p>
              </form>
            </div>

            {/* back to landing */}
            <p style={{ textAlign: "center", marginTop: 20, fontSize: ".78rem", color: "#9CA3AF" }}>
              <Link href="/" style={{ color: "#6B7280", textDecoration: "none" }}>
                {t("auth.backToHome")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  );
}
