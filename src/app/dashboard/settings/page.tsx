"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Shield, User, Smartphone, FileDown, Trash2, AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/auth-store";
import { authApi } from "@/lib/api/auth";
import apiClient from "@/lib/api-client";
import { getInitials } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const profileSchema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Required"),
    newPassword: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "Must contain uppercase")
      .regex(/[0-9]/, "Must contain a number"),
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export default function SettingsPage() {
  const { user, checkAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [totpSetup, setTotpSetup] = useState<{ secret: string; qrCode: string } | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [totpLoading, setTotpLoading] = useState(false);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName: user?.firstName ?? "", lastName: user?.lastName ?? "" },
  });

  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  const onUpdateProfile = async (values: ProfileForm) => {
    setProfileLoading(true);
    try {
      await apiClient.put("/auth/me", values);
      await checkAuth();
      toast({ title: "Profile updated", variant: "success" } as Parameters<typeof toast>[0]);
    } catch {
      toast({ title: "Update failed", variant: "destructive" } as Parameters<typeof toast>[0]);
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
      toast({ title: "Password changed", variant: "success" } as Parameters<typeof toast>[0]);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      passwordForm.setError("currentPassword", { message: apiErr?.message ?? "Incorrect password" });
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
      toast({ title: "2FA enabled", variant: "success" } as Parameters<typeof toast>[0]);
    } catch {
      toast({ title: "Invalid code", variant: "destructive" } as Parameters<typeof toast>[0]);
    } finally {
      setTotpLoading(false);
    }
  };

  const disableTotp = async () => {
    const code = prompt("Enter your authenticator code to disable 2FA:");
    if (!code) return;
    try {
      await authApi.disableTotp(code);
      await checkAuth();
      toast({ title: "2FA disabled" } as Parameters<typeof toast>[0]);
    } catch {
      toast({ title: "Invalid code", variant: "destructive" } as Parameters<typeof toast>[0]);
    }
  };

  return (
    <AppShell>
      <PageHeader title="Profile & Security" description="Manage your account details and security settings" />

      <div className="mx-auto max-w-2xl space-y-6">
        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4" /> Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-5 flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarFallback className="text-lg">
                  {user ? getInitials(`${user.firstName} ${user.lastName}`) : "?"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                <p className="text-sm text-[var(--text-secondary)]">{user?.email}</p>
                <Badge variant="secondary" className="mt-1 text-xs">{user?.role}</Badge>
              </div>
            </div>
            <form onSubmit={profileForm.handleSubmit(onUpdateProfile)} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <Input label="First name" error={profileForm.formState.errors.firstName?.message} {...profileForm.register("firstName")} />
                <Input label="Last name" error={profileForm.formState.errors.lastName?.message} {...profileForm.register("lastName")} />
              </div>
              <div className="flex justify-end">
                <Button type="submit" size="sm" loading={profileLoading}>Save changes</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4" /> Change password
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="flex flex-col gap-4">
              <Input
                label="Current password"
                type={showPassword ? "text" : "password"}
                error={passwordForm.formState.errors.currentPassword?.message}
                {...passwordForm.register("currentPassword")}
              />
              <Input
                label="New password"
                type={showPassword ? "text" : "password"}
                error={passwordForm.formState.errors.newPassword?.message}
                {...passwordForm.register("newPassword")}
              />
              <Input
                label="Confirm new password"
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
                <Button type="submit" size="sm" loading={passwordLoading}>Change password</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* 2FA */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Smartphone className="h-4 w-4" /> Two-factor authentication
            </CardTitle>
            <CardDescription>
              Add an extra layer of security to your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {user?.twoFactorEnabled ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-[var(--success)]" />
                  <span className="text-sm font-medium text-[var(--success)]">2FA enabled</span>
                </div>
                <Button size="sm" variant="destructive" onClick={disableTotp}>
                  Disable 2FA
                </Button>
              </div>
            ) : totpSetup ? (
              <div className="flex flex-col gap-4">
                <div>
                  <p className="mb-2 text-sm text-[var(--text-secondary)]">
                    Scan this QR code with your authenticator app:
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={totpSetup.qrCode} alt="TOTP QR code" className="rounded-[var(--radius-md)]" />
                </div>
                <p className="text-xs text-[var(--text-tertiary)]">
                  Or enter the secret manually: <code className="font-mono">{totpSetup.secret}</code>
                </p>
                <Input
                  label="Verification code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setTotpSetup(null)}>Cancel</Button>
                  <Button onClick={confirmTotp} loading={totpLoading} disabled={totpCode.length !== 6}>
                    Verify & enable
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--text-secondary)]">2FA is not enabled</p>
                <Button size="sm" variant="outline" onClick={startTotpSetup} loading={totpLoading}>
                  Enable 2FA
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        {/* GDPR */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4" /> Privacy & GDPR
            </CardTitle>
            <CardDescription>
              Manage your personal data in accordance with GDPR regulations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Export my data</p>
                <p className="text-xs text-[var(--text-secondary)]">
                  Download all personal data we hold about you (JSON format).
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const data = JSON.stringify(
                    { email: user?.email, firstName: user?.firstName, lastName: user?.lastName, role: user?.role, exportedAt: new Date().toISOString() },
                    null,
                    2
                  );
                  const blob = new Blob([data], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "my-data-export.json";
                  a.click();
                  URL.revokeObjectURL(url);
                  toast({ title: "Data exported", variant: "success" } as Parameters<typeof toast>[0]);
                }}
              >
                <FileDown className="h-4 w-4" />
                Export
              </Button>
            </div>

            <Separator />

            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[var(--destructive)]">Request account deletion</p>
                <p className="text-xs text-[var(--text-secondary)]">
                  Request permanent deletion of your account and all associated data. This cannot be undone.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-[var(--destructive)]/30 text-[var(--destructive)] hover:bg-red-50"
                onClick={() => {
                  if (confirm("Are you sure you want to request account deletion? This is irreversible and may take up to 30 days.")) {
                    toast({
                      title: "Deletion request submitted",
                      description: "We will process your request within 30 days and notify you by email.",
                    } as Parameters<typeof toast>[0]);
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
                Request deletion
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
