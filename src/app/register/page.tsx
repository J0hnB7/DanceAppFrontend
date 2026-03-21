"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/)
    .regex(/[0-9]/),
  organizationName: z.string().optional(),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { t } = useLocale();
  const router = useRouter();
  const { loginWithTokens } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (values: RegisterForm) => {
    setLoading(true);
    try {
      const tokens = await authApi.register({
        name: values.name,
        email: values.email,
        password: values.password,
        organizationName: values.organizationName,
        gdprAccepted: true,
      });
      await loginWithTokens(tokens.accessToken);
      router.replace("/verify-email?sent=true");
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError("email", { message: apiErr?.message ?? t("auth.registrationFailed") });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-xl)] bg-[var(--accent)]/10">
            <Trophy className="h-6 w-6 text-[var(--accent)]" />
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">DanceApp</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("auth.createAccount")}</CardTitle>
            <CardDescription>{t("auth.createAccountDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <Input
                label={t("auth.name")}
                placeholder={t("auth.namePlaceholder")}
                error={errors.name?.message}
                {...register("name")}
              />

              <Input
                label={t("auth.organizationOptional")}
                placeholder={t("auth.organizationPlaceholder")}
                error={errors.organizationName?.message}
                {...register("organizationName")}
              />

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

              <Button type="submit" loading={loading} className="w-full">
                {t("auth.createAccount")}
              </Button>

              <p className="text-center text-sm text-[var(--text-secondary)]">
                {t("auth.hasAccount")}{" "}
                <Link href="/login" className="text-[var(--accent)] hover:underline">
                  {t("auth.signIn")}
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
