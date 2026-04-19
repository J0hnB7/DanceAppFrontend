"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Shield, User, UserX, Smartphone, FileDown, Trash2, Copy, Check } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/auth-store";
import { authApi } from "@/lib/api/auth";
import { gdprApi } from "@/lib/api/gdpr";
import { dancerApi, type DancerProfileResponse, type PartnerInviteResponse } from "@/lib/api/dancer";
import apiClient from "@/lib/api-client";
import { getInitials } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useLocale } from "@/contexts/locale-context";

const currentYear = new Date().getFullYear();

const profileSchema = z.object({
  name: z.string().min(1),
  organizationName: z.string().optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z
      .string()
      .min(8)
      .regex(/[A-Z]/)
      .regex(/[0-9]/),
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, {
    path: ["confirm"],
  });

const dancerProfileSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  birthDate: z.string().min(1),
  club: z.string().optional(),
  partnerNameText: z.string().optional(),
  gender: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;
type DancerProfileForm = z.infer<typeof dancerProfileSchema>;

export default function SettingsPage() {
  const { t } = useLocale();
  const { user, checkAuth } = useAuthStore();
  const isDancer = user?.role === "DANCER";

  const [showPassword, setShowPassword] = useState(false);
  const [totpSetup, setTotpSetup] = useState<{ secret: string; qrCodeBase64: string } | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [totpLoading, setTotpLoading] = useState(false);

  // Dancer-specific state
  const [dancerProfile, setDancerProfile] = useState<DancerProfileResponse | null>(null);
  const [dancerEditMode, setDancerEditMode] = useState(false);
  const [dancerSaving, setDancerSaving] = useState(false);
  const [dancerSaveError, setDancerSaveError] = useState<string | null>(null);
  const [invite, setInvite] = useState<PartnerInviteResponse | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [unlinkLoading, setUnlinkLoading] = useState(false);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? "", organizationName: user?.organizationName ?? "" },
  });

  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  const dancerForm = useForm<DancerProfileForm>({
    resolver: zodResolver(dancerProfileSchema),
  });

  useEffect(() => {
    if (!isDancer) return;
    dancerApi.getProfile().then((p) => {
      setDancerProfile(p);
      dancerForm.reset({
        firstName: p.firstName,
        lastName: p.lastName,
        birthDate: p.birthDate ?? (p.birthYear ? `${p.birthYear}-01-01` : ""),
        club: p.club ?? "",
        partnerNameText: p.partnerName ?? "",
        gender: p.gender ?? "",
      });
    });
  }, [isDancer, dancerForm]);

  const onUpdateProfile = async (values: ProfileForm) => {
    setProfileLoading(true);
    try {
      await apiClient.put("/auth/me", values);
      await checkAuth();
      toast({ title: t("settings.profileUpdated"), variant: "success" });
    } catch {
      toast({ title: t("settings.profileUpdateFailed"), variant: "destructive" });
    } finally {
      setProfileLoading(false);
    }
  };

  const onChangePassword = async (values: PasswordForm) => {
    setPasswordLoading(true);
    try {
      await apiClient.put("/auth/password", {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      passwordForm.reset();
      toast({ title: t("settings.passwordChanged"), variant: "success" });
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      passwordForm.setError("currentPassword", { message: apiErr?.message ?? t("settings.incorrectPassword") });
    } finally {
      setPasswordLoading(false);
    }
  };

  const startTotpSetup = async () => {
    setTotpLoading(true);
    try {
      const data = await authApi.setupTotp();
      setTotpSetup(data);
    } finally {
      setTotpLoading(false);
    }
  };

  const confirmTotp = async () => {
    if (!totpCode) return;
    setTotpLoading(true);
    try {
      await authApi.confirmTotp(totpCode);
      await checkAuth();
      setTotpSetup(null);
      setTotpCode("");
      toast({ title: t("settings.twoFactorEnabledToast"), variant: "success" });
    } catch {
      toast({ title: t("settings.invalidCode"), variant: "destructive" });
    } finally {
      setTotpLoading(false);
    }
  };

  const disableTotp = async () => {
    const code = prompt(t("settings.disable2faPrompt"));
    if (!code) return;
    try {
      await authApi.disableTotp(code);
      await checkAuth();
      toast({ title: t("settings.twoFactorDisabledToast") });
    } catch {
      toast({ title: t("settings.invalidCode"), variant: "destructive" });
    }
  };

  const onDancerSave = async (values: DancerProfileForm) => {
    setDancerSaving(true);
    setDancerSaveError(null);
    try {
      const updated = await dancerApi.updateProfile({
        firstName: values.firstName,
        lastName: values.lastName,
        birthDate: values.birthDate,
        club: values.club || undefined,
        partnerNameText: values.partnerNameText || undefined,
        gender: values.gender || undefined,
      });
      setDancerProfile(updated);
      setDancerEditMode(false);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setDancerSaveError(apiErr?.message ?? t("dancer.profile.saveError"));
    } finally {
      setDancerSaving(false);
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
      setDancerProfile(updated);
    } catch { /* ignore */ } finally {
      setUnlinkLoading(false);
    }
  };

  return (
    <AppShell>
      <style>{`
        .prof-btn{padding:10px 20px;border-radius:9px;background:linear-gradient(135deg,#4F46E5,#6D28D9);color:#fff;font-size:.88rem;font-weight:600;border:none;cursor:pointer;transition:all .2s;font-family:inherit}
        .prof-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 4px 14px rgba(79,70,229,.3)}
        .prof-btn:disabled{opacity:.6;cursor:not-allowed}
        .prof-btn-sm{padding:8px 16px;border-radius:8px;background:transparent;color:var(--accent);font-size:.82rem;font-weight:600;border:1.5px solid var(--accent);cursor:pointer;transition:all .2s;font-family:inherit}
        .prof-btn-sm:hover{background:rgba(var(--accent-rgb,79,70,229),.1)}
        .prof-btn-danger{padding:8px 16px;border-radius:8px;background:transparent;color:var(--destructive);font-size:.82rem;font-weight:500;border:1.5px solid color-mix(in srgb,var(--destructive) 40%,transparent);cursor:pointer;transition:all .2s;font-family:inherit}
        .prof-btn-danger:hover:not(:disabled){background:color-mix(in srgb,var(--destructive) 8%,transparent)}
        .prof-btn-danger:disabled{opacity:.5;cursor:not-allowed}
      `}</style>
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14 shrink-0">
            <AvatarFallback className="bg-[var(--accent)] text-lg font-bold text-white">
              {user ? getInitials(user.name) : "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]" style={{ fontFamily: "var(--font-sora, Sora, sans-serif)" }}>
              {t("settings.profileAndSecurity")}
            </h1>
            <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
              {user?.email ?? t("settings.profileAndSecurityDesc")}
            </p>
          </div>
          <Badge variant="secondary" className="shrink-0 text-xs">{user?.role}</Badge>
        </div>

        {isDancer ? (
          <>
            {/* Dancer: Personal data card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4" aria-hidden="true" /> {t("dancer.profile.sectionProfile")}
                  </CardTitle>
                  {!dancerEditMode && (
                    <Button size="sm" variant="outline" onClick={() => setDancerEditMode(true)}>
                      {t("common.edit")}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {dancerEditMode ? (
                  <form onSubmit={dancerForm.handleSubmit(onDancerSave)} className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-3">
                      <Input label={t("dancer.onboarding.firstNameDancer")} error={dancerForm.formState.errors.firstName?.message} {...dancerForm.register("firstName")} />
                      <Input label={t("dancer.onboarding.lastNameDancer")} error={dancerForm.formState.errors.lastName?.message} {...dancerForm.register("lastName")} />
                    </div>
                    <Input
                      label={t("dancer.onboarding.birthDate")}
                      type="date"
                      min="1920-01-01"
                      max={`${currentYear}-12-31`}
                      error={dancerForm.formState.errors.birthDate?.message}
                      {...dancerForm.register("birthDate")}
                    />
                    <Input label={t("dancer.onboarding.club")} placeholder={t("dancer.onboarding.clubPlaceholder")} {...dancerForm.register("club")} />
                    <div>
                      <label htmlFor="dancer-gender" className="block text-sm font-semibold mb-1 text-[var(--text-primary)]">
                        {t("dancer.profile.gender")}
                      </label>
                      <select id="dancer-gender" {...dancerForm.register("gender")}
                        style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: 16, fontFamily: "inherit" }}>
                        <option value="">{t("dancer.profile.genderUnspecified")}</option>
                        <option value="MALE">{t("dancer.profile.genderMale")}</option>
                        <option value="FEMALE">{t("dancer.profile.genderFemale")}</option>
                      </select>
                    </div>
                    {dancerSaveError && (
                      <p className="text-sm text-[var(--destructive)] bg-red-50 rounded-lg px-3 py-2">{dancerSaveError}</p>
                    )}
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setDancerEditMode(false)}>{t("common.cancel")}</Button>
                      <Button type="submit" size="sm" loading={dancerSaving}>{t("common.save")}</Button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-2 gap-5">
                    {([
                      [t("dancer.onboarding.firstNameDancer"), dancerProfile?.firstName],
                      [t("dancer.onboarding.lastNameDancer"), dancerProfile?.lastName],
                      [t("dancer.onboarding.birthDate"), dancerProfile?.birthDate ? new Date(dancerProfile.birthDate).toLocaleDateString("cs-CZ") : (dancerProfile?.birthYear?.toString() ?? "—")],
                      [t("dancer.onboarding.club"), dancerProfile?.club ?? "—"],
                      [t("dancer.profile.gender"), dancerProfile?.gender
                        ? dancerProfile.gender === "MALE" ? t("dancer.profile.genderMale")
                          : dancerProfile.gender === "FEMALE" ? t("dancer.profile.genderFemale")
                          : t("dancer.profile.genderOther")
                        : "—"],
                    ] as [string, string | undefined][]).map(([label, value]) => (
                      <div key={label}>
                        <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)] mb-1">{label}</p>
                        <p className="text-sm font-medium text-[var(--text-primary)]">{value ?? "—"}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Dancer: Partner card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4" aria-hidden="true" /> {t("dancer.profile.sectionPartner")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dancerProfile?.partnerUserId || dancerProfile?.partnerName ? (
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#4F46E5] to-[#06B6D4] flex items-center justify-center shrink-0">
                        <User className="h-5 w-5 text-white" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">{dancerProfile.partnerName ?? t("dancer.profile.partnerLinked")}</p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {dancerProfile.partnerUserId ? t("dancer.profile.partnerAccount") : t("dancer.profile.partnerManual")}
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
                  <div className="flex flex-col gap-4">
                    <p className="text-sm text-[var(--text-secondary)]">{t("dancer.profile.noPartner")}</p>
                    {invite ? (
                      <div className="rounded-lg bg-[var(--success-subtle,#D1FAE5)] border border-[var(--success-border,#A7F3D0)] p-4">
                        <p className="text-sm font-semibold text-[var(--success-text,#047857)] dark:text-emerald-300 mb-2">{t("dancer.profile.inviteLinkReady")}</p>
                        <div className="flex gap-2 items-center">
                          <code className="flex-1 text-xs text-[var(--text-primary)] bg-[var(--surface)] border border-[var(--border)] rounded px-2 py-1.5 break-all">
                            {invite.inviteUrl}
                          </code>
                          <button
                            type="button"
                            onClick={copyInvite}
                            className="prof-btn-sm shrink-0 min-h-[44px] min-w-[80px] flex items-center justify-center gap-1"
                            aria-label={t("common.copy")}
                          >
                            {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                            {copied ? t("dancer.profile.copied") : t("common.copy")}
                          </button>
                        </div>
                        <p className="text-xs text-[var(--text-tertiary)] mt-2">
                          {t("dancer.profile.inviteExpires")}: {new Date(invite.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="prof-btn-sm self-start min-h-[44px]"
                        onClick={generateInvite}
                        disabled={inviteLoading}
                      >
                        {inviteLoading ? t("dancer.profile.generatingInvite") : t("dancer.profile.generateInvite")}
                      </button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          /* Organizer/Admin: Profile card */
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4" /> {t("settings.profile")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={profileForm.handleSubmit(onUpdateProfile)} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <Input label={t("settings.nameLabel")} error={profileForm.formState.errors.name?.message} {...profileForm.register("name")} />
                  <Input label={t("settings.organizationLabel")} error={profileForm.formState.errors.organizationName?.message} {...profileForm.register("organizationName")} />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" size="sm" loading={profileLoading}>{t("common.saveChanges")}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4" /> {t("settings.changePassword")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="flex flex-col gap-4">
              <Input
                label={t("settings.currentPassword")}
                type={showPassword ? "text" : "password"}
                error={passwordForm.formState.errors.currentPassword?.message}
                {...passwordForm.register("currentPassword")}
              />
              <Input
                label={t("settings.newPassword")}
                type={showPassword ? "text" : "password"}
                error={passwordForm.formState.errors.newPassword?.message}
                {...passwordForm.register("newPassword")}
              />
              <Input
                label={t("settings.confirmNewPassword")}
                type={showPassword ? "text" : "password"}
                error={passwordForm.formState.errors.confirm?.message}
                rightIcon={
                  <button type="button" onClick={() => setShowPassword((s) => !s)} className="pointer-events-auto">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                {...passwordForm.register("confirm")}
              />
              <div className="flex justify-end">
                <Button type="submit" size="sm" loading={passwordLoading}>{t("settings.changePassword")}</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* 2FA */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Smartphone className="h-4 w-4" /> {t("settings.twoFactor")}
            </CardTitle>
            <CardDescription>
              {t("settings.twoFactorDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {user?.twoFactorEnabled ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-[var(--success)]" />
                  <span className="text-sm font-medium text-[var(--success)]">{t("settings.twoFactorEnabled")}</span>
                </div>
                <Button size="sm" variant="destructive" onClick={disableTotp}>
                  {t("settings.disableTwoFactor")}
                </Button>
              </div>
            ) : totpSetup ? (
              <div className="flex flex-col gap-4">
                <div>
                  <p className="mb-2 text-sm text-[var(--text-secondary)]">
                    {t("settings.scanQrCode")}
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`data:image/png;base64,${totpSetup.qrCodeBase64}`} alt="TOTP QR code" className="rounded-[var(--radius-md)]" />
                </div>
                <p className="text-xs text-[var(--text-tertiary)]">
                  {t("settings.orEnterSecret")} <code className="font-mono">{totpSetup.secret}</code>
                </p>
                <Input
                  label={t("settings.verificationCode")}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setTotpSetup(null)}>{t("common.cancel")}</Button>
                  <Button onClick={confirmTotp} loading={totpLoading} disabled={totpCode.length !== 6}>
                    {t("settings.verifyAndEnable")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--text-secondary)]">{t("settings.twoFactorDisabled")}</p>
                <Button size="sm" variant="outline" onClick={startTotpSetup} loading={totpLoading}>
                  {t("settings.enableTwoFactor")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* GDPR */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4" /> {t("settings.privacyGdpr")}
            </CardTitle>
            <CardDescription>
              {t("settings.privacyGdprDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{t("settings.exportMyData")}</p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {t("settings.exportMyDataDesc")}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  if (!user?.id) return;
                  try {
                    const data = await gdprApi.exportData(user.id);
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "my-data-export.json";
                    a.click();
                    URL.revokeObjectURL(url);
                    toast({ title: t("settings.dataExported"), variant: "success" });
                  } catch {
                    toast({ title: t("settings.exportFailed"), variant: "destructive" });
                  }
                }}
              >
                <FileDown className="h-4 w-4" />
                {t("settings.export")}
              </Button>
            </div>

            <Separator />

            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[var(--destructive)]">{t("settings.requestDeletion")}</p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {t("settings.requestDeletionDesc")}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-[var(--destructive)]/30 text-[var(--destructive)] hover:bg-red-50"
                onClick={async () => {
                  if (!user?.id) return;
                  if (confirm(t("settings.requestDeletionConfirm"))) {
                    try {
                      await gdprApi.deletePersonalData(user.id);
                      toast({
                        title: t("settings.deletionRequested"),
                        description: t("settings.deletionRequestedDesc"),
                      });
                    } catch {
                      toast({ title: t("settings.requestFailed"), variant: "destructive" });
                    }
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
                {t("settings.requestDeletionAction")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
