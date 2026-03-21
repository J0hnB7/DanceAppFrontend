"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Eye, EyeOff, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/store/auth-store";
import { useLocale } from "@/contexts/locale-context";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  totpCode: z.string().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

function LoginPageInner() {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const { loginWithTokens } = useAuthStore();

  const [showPassword, setShowPassword] = useState(false);
  const [requireTotp, setRequireTotp] = useState(false);
  const [loading, setLoading] = useState(false);

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
        setError("password", { message: apiErr?.message ?? t("auth.invalidEmailOrPassword") });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-xl)] bg-[var(--accent)]/10">
            <Trophy className="h-6 w-6 text-[var(--accent)]" />
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">DanceApp</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("auth.signIn")}</CardTitle>
            <CardDescription>{t("auth.signInDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
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
                autoComplete="current-password"
                placeholder={t("auth.passwordPlaceholder")}
                error={errors.password?.message}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="pointer-events-auto"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                {...register("password")}
              />

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

              <div className="flex items-center justify-end">
                <Link
                  href="/forgot-password"
                  className="text-sm text-[var(--accent)] hover:underline"
                >
                  {t("auth.forgotPassword")}
                </Link>
              </div>

              <Button type="submit" loading={loading} className="w-full">
                {t("auth.signIn")}
              </Button>

              <p className="text-center text-sm text-[var(--text-secondary)]">
                {t("auth.noAccountLink")}{" "}
                <Link href="/register" className="text-[var(--accent)] hover:underline">
                  {t("auth.signUp")}
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  );
}
