"use client";

import { Suspense, useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserCheck, UserX, Heart } from "lucide-react";
import { dancerApi, type PartnerInvitePreview } from "@/lib/api/dancer";
import { useAuthStore } from "@/store/auth-store";
import { useLocale } from "@/contexts/locale-context";

interface Props {
  params: Promise<{ token: string }>;
}

function PartnerInviteInner({ params }: Props) {
  const { token } = use(params);
  const { t } = useLocale();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const [preview, setPreview] = useState<PartnerInvitePreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  useEffect(() => {
    dancerApi.getInvitePreview(token).then((data) => {
      setPreview(data);
      setLoadingPreview(false);
    }).catch(() => {
      setPreviewError(t("dancer.partnerInvite.invalidToken"));
      setLoadingPreview(false);
    });
  }, [token, t]);

  const handleAccept = async () => {
    if (!isAuthenticated) {
      router.push(`/login?callbackUrl=/partner-invite/${token}`);
      return;
    }
    if (user?.role !== "DANCER") {
      setAcceptError(t("dancer.partnerInvite.notDancer"));
      return;
    }
    setAccepting(true);
    setAcceptError(null);
    try {
      await dancerApi.acceptInvite(token);
      setAccepted(true);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setAcceptError(apiErr?.message ?? t("dancer.partnerInvite.acceptError"));
    } finally {
      setAccepting(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes orb{0%,100%{transform:translate(0,0)}33%{transform:translate(15px,-25px)}66%{transform:translate(-12px,18px)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        @keyframes heartbeat{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}
        .pi-fade{animation:fadeUp .5s ease both}
        .pi-btn{width:100%;padding:12px;border-radius:10px;background:linear-gradient(135deg,#4F46E5,#6D28D9);color:#fff;font-size:.95rem;font-weight:600;border:none;cursor:pointer;transition:all .2s;font-family:inherit}
        .pi-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 20px rgba(79,70,229,.35)}
        .pi-btn:disabled{opacity:.6;cursor:not-allowed}
        .pi-btn-secondary{width:100%;padding:11px;border-radius:10px;background:transparent;color:#6B7280;font-size:.93rem;font-weight:500;border:1.5px solid #E5E7EB;cursor:pointer;transition:all .2s;font-family:inherit;text-align:center;text-decoration:none;display:block}
        .pi-btn-secondary:hover{background:#F9FAFB;border-color:#D1D5DB}
      `}</style>

      <div style={{
        display: "flex", minHeight: "100vh", background: "#0A1628",
        fontFamily: "var(--font-inter, Inter, sans-serif)",
        alignItems: "center", justifyContent: "center", padding: "32px 16px",
        position: "relative", overflow: "hidden",
      }}>
        {/* Background orbs */}
        {[
          { w: 500, h: 500, bg: "radial-gradient(circle,rgba(79,70,229,.3) 0%,transparent 65%)", top: -150, right: -80, dur: "9s", del: "0s" },
          { w: 400, h: 400, bg: "radial-gradient(circle,rgba(236,72,153,.2) 0%,transparent 65%)", bottom: -120, left: -60, dur: "11s", del: "-4s" },
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

        <div className="pi-fade" style={{ width: "100%", maxWidth: 440, position: "relative", zIndex: 1 }}>
          {/* Logo */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#4F46E5,#06B6D4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".72rem", fontWeight: 900, color: "#fff" }}>PP</div>
              <span style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontWeight: 800, fontSize: "1.1rem", color: "#fff" }}>ProPodium</span>
            </Link>
          </div>

          <div style={{ background: "#fff", borderRadius: 16, padding: "36px 32px", boxShadow: "0 4px 6px rgba(0,0,0,.1),0 24px 56px rgba(0,0,0,.25)", border: "1px solid rgba(255,255,255,.08)" }}>
            {loadingPreview ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid #E5E7EB", borderTopColor: "#4F46E5", animation: "spin .8s linear infinite" }} />
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </div>
            ) : previewError ? (
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <UserX className="h-7 w-7" style={{ color: "#EF4444" }} aria-hidden="true" />
                </div>
                <h2 style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontSize: "1.15rem", fontWeight: 700, color: "#111827", marginBottom: 10 }}>
                  {t("dancer.partnerInvite.invalidTitle")}
                </h2>
                <p style={{ fontSize: ".87rem", color: "#6B7280", lineHeight: 1.6, marginBottom: 24 }}>{previewError}</p>
                <Link href="/" className="pi-btn-secondary">{t("auth.backToHome")}</Link>
              </div>
            ) : accepted ? (
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg,#EC4899,#8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", animation: "heartbeat 1s ease infinite" }}>
                  <Heart className="h-8 w-8" style={{ color: "#fff", fill: "#fff" }} aria-hidden="true" />
                </div>
                <h2 style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontSize: "1.3rem", fontWeight: 800, color: "#111827", marginBottom: 10 }}>
                  {t("dancer.partnerInvite.acceptedTitle")}
                </h2>
                <p style={{ fontSize: ".9rem", color: "#6B7280", lineHeight: 1.6, marginBottom: 24 }}>
                  {t("dancer.partnerInvite.acceptedDesc", { name: preview?.fromName ?? "" })}
                </p>
                <Link href="/profile" className="pi-btn" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
                  {t("dancer.partnerInvite.goToProfile")}
                </Link>
              </div>
            ) : (
              <div>
                {/* Invite header */}
                <div style={{ textAlign: "center", marginBottom: 28 }}>
                  <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg,#4F46E5,#EC4899)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                    <UserCheck className="h-8 w-8" style={{ color: "#fff" }} aria-hidden="true" />
                  </div>
                  <h2 style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontSize: "1.2rem", fontWeight: 800, color: "#111827", marginBottom: 8 }}>
                    {t("dancer.partnerInvite.title")}
                  </h2>
                  <p style={{ fontSize: ".9rem", color: "#6B7280", lineHeight: 1.6 }}>
                    <strong style={{ color: "#111827" }}>{preview?.fromName}</strong>{" "}
                    {t("dancer.partnerInvite.subtitle")}
                  </p>
                </div>

                {acceptError && (
                  <div style={{ padding: "10px 14px", borderRadius: 8, background: "#FEF2F2", border: "1px solid #FECACA", fontSize: ".85rem", color: "#991B1B", marginBottom: 16 }}>
                    {acceptError}
                  </div>
                )}

                {isAuthenticated && user?.role === "DANCER" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <button type="button" className="pi-btn" onClick={handleAccept} disabled={accepting}>
                      {accepting ? t("dancer.partnerInvite.accepting") : t("dancer.partnerInvite.accept")}
                    </button>
                    <Link href="/profile" className="pi-btn-secondary">{t("common.cancel")}</Link>
                  </div>
                ) : isAuthenticated && user?.role !== "DANCER" ? (
                  <div>
                    <p style={{ fontSize: ".87rem", color: "#6B7280", marginBottom: 16, textAlign: "center" }}>{t("dancer.partnerInvite.notDancer")}</p>
                    <Link href="/" className="pi-btn-secondary">{t("auth.backToHome")}</Link>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <p style={{ fontSize: ".85rem", color: "#6B7280", textAlign: "center", marginBottom: 8 }}>
                      {t("dancer.partnerInvite.loginPrompt")}
                    </p>
                    <Link href={`/login?callbackUrl=/partner-invite/${token}`} className="pi-btn" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
                      {t("auth.signIn")}
                    </Link>
                    <Link href={`/register/dancer?next=/partner-invite/${token}`} className="pi-btn-secondary">
                      {t("dancer.partnerInvite.registerLink")}
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default function PartnerInvitePage({ params }: Props) {
  return (
    <Suspense>
      <PartnerInviteInner params={params} />
    </Suspense>
  );
}
