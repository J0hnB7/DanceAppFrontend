"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authApi } from "@/lib/api/auth";
import { getT } from "@/lib/i18n";

function ResetPasswordPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [t] = useState(() => getT());

  const schema = z
    .object({
      password: z
        .string()
        .min(8, t("auth.validationPassword"))
        .regex(/[A-Z]/, t("auth.validationPasswordUpper"))
        .regex(/[0-9]/, t("auth.validationPasswordNumber")),
      confirm: z.string(),
    })
    .refine((v) => v.password === v.confirm, {
      message: t("auth.passwordsMustMatch"),
      path: ["confirm"],
    });

  type Form = z.infer<typeof schema>;

  const { register, handleSubmit, formState: { errors }, setError } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async ({ password }: Form) => {
    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      router.push("/login?reset=success");
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError("password", { message: apiErr?.message ?? t("auth.resetFailed") });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle>{t("auth.newPassword")}</CardTitle>
            <CardDescription>{t("auth.newPasswordDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <Input
                label={t("auth.newPasswordLabel")}
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder={t("auth.newPasswordPlaceholder")}
                error={errors.password?.message}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="pointer-events-auto"
                    aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                  </button>
                }
                {...register("password")}
              />
              <Input
                label={t("auth.confirmPassword")}
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder={t("auth.confirmPasswordPlaceholder")}
                error={errors.confirm?.message}
                {...register("confirm")}
              />
              <Button type="submit" loading={loading} className="w-full">
                {t("auth.setNewPassword")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordPageInner />
    </Suspense>
  );
}
