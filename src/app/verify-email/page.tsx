"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MailCheck, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/store/auth-store";
import { useLocale } from "@/contexts/locale-context";

function VerifyEmailPageInner() {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const sent = searchParams.get("sent");
  const { user } = useAuthStore();

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    token ? "loading" : "idle"
  );
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    authApi
      .verifyEmail(token)
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
  }, [token]);

  const handleResend = async () => {
    if (!user?.email) return;
    setResendLoading(true);
    try {
      await authApi.resendVerification(user.email);
    } catch (e) {
      console.error("[verify-email] resend failed", e);
    } finally {
      setResendLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--success)]/10">
              <CheckCircle2 className="h-6 w-6 text-[var(--success)]" />
            </div>
            <CardTitle>{t("auth.emailVerified")}</CardTitle>
            <CardDescription>{t("auth.emailVerifiedDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => router.push("/dashboard")}>
              {t("auth.goToDashboard")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--destructive)]/10">
              <XCircle className="h-6 w-6 text-[var(--destructive)]" />
            </div>
            <CardTitle>{t("auth.verificationFailed")}</CardTitle>
            <CardDescription>{t("auth.verificationFailedDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button variant="outline" loading={resendLoading} onClick={handleResend}>
              {t("auth.resendVerification")}
            </Button>
            <Button variant="ghost" onClick={() => router.push("/login")}>
              {t("auth.backToLogin")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // idle — just registered
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)]/10">
            <MailCheck className="h-6 w-6 text-[var(--accent)]" />
          </div>
          <CardTitle>{t("auth.verifyEmail")}</CardTitle>
          <CardDescription>
            {sent
              ? t("auth.verifyEmailDesc", { email: user?.email ?? "" })
              : t("auth.verifyEmailPrompt")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button variant="outline" loading={resendLoading} onClick={handleResend}>
            {t("auth.resendEmail")}
          </Button>
          <Button variant="ghost" onClick={() => router.push("/login")}>
            {t("auth.backToLogin")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailPageInner />
    </Suspense>
  );
}
