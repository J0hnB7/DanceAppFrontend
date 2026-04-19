"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Shield, User, Smartphone, FileDown, Trash2 } from "lucide-react";
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
import apiClient from "@/lib/api-client";
import { getInitials } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useLocale } from "@/contexts/locale-context";

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

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export default function SettingsPage() {
  const { t } = useLocale();
  const router = useRouter();
  const { user, checkAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user?.role === "DANCER") {
      router.replace("/profile");
    }
  }, [user, router]);
  const [totpSetup, setTotpSetup] = useState<{ secret: string; qrCodeBase64: string } | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [totpLoading, setTotpLoading] = useState(false);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? "", organizationName: user?.organizationName ?? "" },
  });

  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

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

  return (
    <AppShell>
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

        {/* Profile */}
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
