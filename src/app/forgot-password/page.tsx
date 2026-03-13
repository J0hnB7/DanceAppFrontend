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

const schema = z.object({ email: z.string().email("Enter a valid email") });
type Form = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
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
            <CardTitle>Email sent</CardTitle>
            <CardDescription>
              If <strong>{getValues("email")}</strong> exists, you&apos;ll receive a reset link shortly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button variant="outline" className="w-full">Back to login</Button>
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
            <CardTitle>Reset password</CardTitle>
            <CardDescription>Enter your email and we&apos;ll send a reset link.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                error={errors.email?.message}
                {...register("email")}
              />
              <Button type="submit" loading={loading} className="w-full">
                Send reset link
              </Button>
              <Link href="/login">
                <Button type="button" variant="ghost" className="w-full">
                  Back to login
                </Button>
              </Link>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
