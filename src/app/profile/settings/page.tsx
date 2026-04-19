"use client";

import { useState, useEffect } from "react";
import { LogoMark } from "@/components/ui/logo-mark";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Copy, Check, UserX, User, Trophy, LogOut, LayoutDashboard, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { dancerApi, type DancerProfileResponse, type PartnerInviteResponse } from "@/lib/api/dancer";
import { useAuthStore } from "@/store/auth-store";
import { useLocale } from "@/contexts/locale-context";

const currentYear = new Date().getFullYear();

const profileSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  birthDate: z.string().min(1, "Zadejte datum narození"),
  club: z.string().optional(),
  partnerNameText: z.string().optional(),
  gender: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function ProfileSettingsPage() {
  const { t } = useLocale();
  const router = useRouter();
  const { logout } = useAuthStore();

  const [profile, setProfile] = useState<DancerProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [invite, setInvite] = useState<PartnerInviteResponse | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [unlinkLoading, setUnlinkLoading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    dancerApi.getProfile().then((p) => {
      if (!p.onboardingCompleted) {
        router.replace("/onboarding");
        return;
      }
      setProfile(p);
      reset({
        firstName: p.firstName,
        lastName: p.lastName,
        birthDate: p.birthDate ?? (p.birthYear ? `${p.birthYear}-01-01` : ""),
        club: p.club ?? "",
        partnerNameText: p.partnerName ?? "",
        gender: p.gender ?? "",
      });
      setLoading(false);
    }).catch(() => {
      router.replace("/login");
    });
  }, [reset, router]);

  const onSave = async (values: ProfileForm) => {
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await dancerApi.updateProfile({
        firstName: values.firstName,
        lastName: values.lastName,
        birthDate: values.birthDate,
        club: values.club || undefined,
        partnerNameText: values.partnerNameText || undefined,
        gender: values.gender || undefined,
      });
      setProfile(updated);
      setEditMode(false);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setSaveError(apiErr?.message ?? t("dancer.profile.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const generateInvite = async () => {
    setInviteLoading(true);
    try {
      const result = await dancerApi.generateInvite();
      setInvite(result);
    } catch { /* ignore */ } finally {
      setInviteLoading(false);
    }
  };

  const copyInvite = async () => {
    if (!invite) return;
    await navigator.clipboard.writeText(invite.inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const unlinkPartner = async () => {
    if (!confirm(t("dancer.profile.unlinkConfirm"))) return;
    setUnlinkLoading(true);
    try {
      await dancerApi.unlinkPartner();
      const updated = await dancerApi.getProfile();
      setProfile(updated);
    } catch { /* ignore */ } finally {
      setUnlinkLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid #E5E7EB", borderTopColor: "#4F46E5", animation: "spin .8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .auth-light{--surface:#fff;--border:#E5E7EB;--text-primary:#111827;--text-secondary:#6B7280;--text-tertiary:#9CA3AF;--radius-md:8px;--accent:#4F46E5;--destructive:#EF4444}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        .prof-fade{animation:fadeUp .4s ease both}
        .prof-btn{padding:10px 20px;border-radius:9px;background:linear-gradient(135deg,#4F46E5,#6D28D9);color:#fff;font-size:.88rem;font-weight:600;border:none;cursor:pointer;transition:all .2s;font-family:inherit}
        .prof-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 4px 14px rgba(79,70,229,.3)}
        .prof-btn:disabled{opacity:.6;cursor:not-allowed}
        .prof-btn-sm{padding:8px 16px;border-radius:8px;background:transparent;color:#4F46E5;font-size:.82rem;font-weight:600;border:1.5px solid #4F46E5;cursor:pointer;transition:all .2s;font-family:inherit}
        .prof-btn-sm:hover{background:#EEF2FF}
        .prof-btn-danger{padding:8px 16px;border-radius:8px;background:transparent;color:#EF4444;font-size:.82rem;font-weight:500;border:1.5px solid #FCA5A5;cursor:pointer;transition:all .2s;font-family:inherit}
        .prof-btn-danger:hover:not(:disabled){background:#FEF2F2}
        .prof-btn-danger:disabled{opacity:.5;cursor:not-allowed}
        .prof-nav-link{padding:8px 16px;border-radius:8px;font-size:.87rem;font-weight:500;color:#6B7280;text-decoration:none;transition:background .15s}
        .prof-nav-link:hover{background:#F3F4F6;color:#111827}
        .prof-nav-link.active{background:#EEF2FF;color:#4F46E5;font-weight:600}
      `}</style>

      <div style={{ minHeight: "100vh", background: "#F3F4F6", fontFamily: "var(--font-inter, Inter, sans-serif)" }}>
        <nav style={{ background: "#fff", borderBottom: "1px solid #E5E7EB", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
              <LogoMark size={26} />
              <span style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontWeight: 800, fontSize: ".95rem", color: "#111827" }}>ProPodium</span>
            </Link>
            <div style={{ display: "flex", gap: 4 }}>
              <Link href="/dashboard" className="prof-nav-link">
                <LayoutDashboard className="inline h-4 w-4 mr-1" aria-hidden="true" />{t("nav.competitions")}
              </Link>
<Link href="/profile/my-competitions" className="prof-nav-link">
                <Trophy className="inline h-4 w-4 mr-1" aria-hidden="true" />{t("dancer.profile.navCompetitions")}
              </Link>
              <Link href="/profile/settings" className="prof-nav-link active">
                <Settings className="inline h-4 w-4 mr-1" aria-hidden="true" />{t("dancer.profile.navSettings")}
              </Link>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: ".85rem", color: "#6B7280", background: "none", border: "none", cursor: "pointer", padding: "6px 10px", borderRadius: 7 }}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />{t("nav.logout")}
          </button>
        </nav>

        <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Personal data card */}
          <div className="prof-fade" style={{ background: "#fff", borderRadius: 14, border: "1px solid #E5E7EB", overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontWeight: 700, fontSize: "1rem", color: "#111827" }}>
                {t("dancer.profile.sectionProfile")}
              </h2>
              {!editMode && (
                <button type="button" className="prof-btn-sm" onClick={() => setEditMode(true)}>
                  {t("common.edit")}
                </button>
              )}
            </div>

            <div style={{ padding: "24px" }}>
              {editMode ? (
                <form onSubmit={handleSubmit(onSave)} className="auth-light">
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <Input label={t("dancer.register.firstName")} error={errors.firstName?.message} {...register("firstName")} />
                      <Input label={t("dancer.register.lastName")} error={errors.lastName?.message} {...register("lastName")} />
                    </div>
                    <Input
                      label={t("dancer.onboarding.birthDate")}
                      type="date"
                      min="1920-01-01"
                      max={`${currentYear}-12-31`}
                      error={errors.birthDate?.message}
                      {...register("birthDate")}
                    />
                    <Input label={t("dancer.onboarding.club")} placeholder={t("dancer.onboarding.clubPlaceholder")} {...register("club")} />
                    <div>
                      <label htmlFor="gender" style={{ display: "block", fontWeight: 600, marginBottom: 4, fontSize: ".88rem", color: "#374151" }}>
                        {t("dancer.profile.gender")}
                      </label>
                      <select id="gender" {...register("gender")}
                        style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E7EB", background: "#fff", color: "#111827", fontSize: 16, fontFamily: "inherit" }}>
                        <option value="">{t("dancer.profile.genderUnspecified")}</option>
                        <option value="MALE">{t("dancer.profile.genderMale")}</option>
                        <option value="FEMALE">{t("dancer.profile.genderFemale")}</option>
                        <option value="OTHER">{t("dancer.profile.genderOther")}</option>
                      </select>
                    </div>

                    {saveError && (
                      <p style={{ fontSize: ".85rem", color: "#EF4444", padding: "8px 12px", background: "#FEF2F2", borderRadius: 8 }}>{saveError}</p>
                    )}

                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                      <button type="button" onClick={() => setEditMode(false)} style={{ padding: "9px 18px", borderRadius: 8, background: "transparent", border: "1.5px solid #E5E7EB", color: "#6B7280", cursor: "pointer", fontFamily: "inherit", fontSize: ".88rem" }}>
                        {t("common.cancel")}
                      </button>
                      <button type="submit" className="prof-btn" disabled={saving}>
                        {saving ? t("dancer.profile.saving") : t("common.save")}
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  {([
                    [t("dancer.register.firstName"), profile?.firstName],
                    [t("dancer.register.lastName"), profile?.lastName],
                    [t("dancer.onboarding.birthDate"), profile?.birthDate ? new Date(profile.birthDate).toLocaleDateString("cs-CZ") : (profile?.birthYear?.toString() ?? "—")],
                    [t("dancer.onboarding.club"), profile?.club ?? "—"],
                    [t("dancer.profile.gender"), profile?.gender
                      ? profile.gender === "MALE" ? t("dancer.profile.genderMale")
                        : profile.gender === "FEMALE" ? t("dancer.profile.genderFemale")
                        : t("dancer.profile.genderOther")
                      : "—"],
                  ] as [string, string | undefined][]).map(([label, value]) => (
                    <div key={label}>
                      <p style={{ fontSize: ".75rem", color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>{label}</p>
                      <p style={{ fontSize: ".95rem", color: "#111827", fontWeight: 500 }}>{value ?? "—"}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Partner card */}
          <div className="prof-fade" style={{ background: "#fff", borderRadius: 14, border: "1px solid #E5E7EB", overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #F3F4F6" }}>
              <h2 style={{ fontFamily: "var(--font-sora, Sora, sans-serif)", fontWeight: 700, fontSize: "1rem", color: "#111827" }}>
                {t("dancer.profile.sectionPartner")}
              </h2>
            </div>

            <div style={{ padding: "24px" }}>
              {profile?.partnerUserId || profile?.partnerName ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#4F46E5,#06B6D4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <User className="h-5 w-5 text-white" aria-hidden="true" />
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, color: "#111827", fontSize: ".95rem" }}>{profile.partnerName ?? t("dancer.profile.partnerLinked")}</p>
                      <p style={{ fontSize: ".82rem", color: "#6B7280" }}>
                        {profile.partnerUserId ? t("dancer.profile.partnerAccount") : t("dancer.profile.partnerManual")}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="prof-btn-danger"
                    onClick={unlinkPartner}
                    disabled={unlinkLoading}
                    aria-label={t("dancer.profile.unlinkPartner")}
                  >
                    <UserX className="inline h-4 w-4 mr-1" aria-hidden="true" />
                    {t("dancer.profile.unlink")}
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <p style={{ fontSize: ".9rem", color: "#6B7280" }}>{t("dancer.profile.noPartner")}</p>

                  {invite ? (
                    <div style={{ padding: "14px 16px", borderRadius: 10, background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
                      <p style={{ fontSize: ".82rem", color: "#15803D", fontWeight: 600, marginBottom: 8 }}>{t("dancer.profile.inviteLinkReady")}</p>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <code style={{ flex: 1, fontSize: ".78rem", color: "#374151", background: "#fff", padding: "6px 10px", borderRadius: 6, border: "1px solid #D1FAE5", wordBreak: "break-all" }}>
                          {invite.inviteUrl}
                        </code>
                        <button type="button" onClick={copyInvite} className="prof-btn-sm" style={{ flexShrink: 0, minWidth: 80, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }} aria-label={t("common.copy")}>
                          {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                          {copied ? t("dancer.profile.copied") : t("common.copy")}
                        </button>
                      </div>
                      <p style={{ fontSize: ".76rem", color: "#6B7280", marginTop: 8 }}>
                        {t("dancer.profile.inviteExpires")}: {new Date(invite.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="prof-btn-sm"
                      onClick={generateInvite}
                      disabled={inviteLoading}
                      style={{ alignSelf: "flex-start", minHeight: 44 }}
                    >
                      {inviteLoading ? t("dancer.profile.generatingInvite") : t("dancer.profile.generateInvite")}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
