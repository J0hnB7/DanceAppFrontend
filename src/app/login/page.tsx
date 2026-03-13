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
import { toast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
  totpCode: z.string().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const { setUser } = useAuthStore();

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
      const data = await authApi.login(values);
      setUser(data.user, data.accessToken);
      router.replace(callbackUrl);
    } catch (err: unknown) {
      const apiErr = err as { status?: number; message?: string };
      if (apiErr?.status === 403 && apiErr?.message?.includes("TOTP")) {
        setRequireTotp(true);
      } else {
        setError("password", { message: apiErr?.message ?? "Invalid email or password" });
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
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Enter your credentials to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <Input
                label="Email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                error={errors.email?.message}
                {...register("email")}
              />

              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
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
                  label="Authenticator code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
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
                  Forgot password?
                </Link>
              </div>

              <Button type="submit" loading={loading} className="w-full">
                Sign in
              </Button>

              <p className="text-center text-sm text-[var(--text-secondary)]">
                No account?{" "}
                <Link href="/register" className="text-[var(--accent)] hover:underline">
                  Sign up
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
