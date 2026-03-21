"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authApi } from "@/lib/api/auth";
import { useLocale } from "@/contexts/locale-context";

const schema = z.object({ email: z.string().email() });
type Form = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const { t } = useLocale();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors }, getValues } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async ({ email }: Form) => {
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)]/10">
              <MailCheck className="h-6 w-6 text-[var(--accent)]" />
            </div>
            <CardTitle>{t("auth.emailSent")}</CardTitle>
            <CardDescription>
              {t("auth.emailSentDesc", { email: getValues("email") })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button variant="outline" className="w-full">{t("auth.backToLogin")}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle>{t("auth.resetPassword")}</CardTitle>
            <CardDescription>{t("auth.resetPasswordDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <Input
                label={t("auth.email")}
                type="email"
                placeholder={t("auth.emailPlaceholder")}
                error={errors.email?.message}
                {...register("email")}
              />
              <Button type="submit" loading={loading} className="w-full">
                {t("auth.sendResetLink")}
              </Button>
              <Link href="/login">
                <Button type="button" variant="ghost" className="w-full">
                  {t("auth.backToLogin")}
                </Button>
              </Link>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
