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

const schema = z
  .object({
    password: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "Must contain uppercase")
      .regex(/[0-9]/, "Must contain a number"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

type Form = z.infer<typeof schema>;

function ResetPasswordPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

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
      setError("password", { message: apiErr?.message ?? "Reset failed. Link may have expired." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle>New password</CardTitle>
            <CardDescription>Choose a strong password for your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <Input
                label="New password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Min. 8 chars, uppercase, number"
                error={errors.password?.message}
                rightIcon={
                  <button type="button" onClick={() => setShowPassword((s) => !s)} className="pointer-events-auto">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                {...register("password")}
              />
              <Input
                label="Confirm password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Repeat password"
                error={errors.confirm?.message}
                {...register("confirm")}
              />
              <Button type="submit" loading={loading} className="w-full">
                Set new password
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
