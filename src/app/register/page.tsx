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

const registerSchema = z.object({
  firstName: z.string().min(1, "First name required"),
  lastName: z.string().min(1, "Last name required"),
  email: z.string().email("Enter a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[0-9]/, "Must contain a number"),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
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
      const data = await authApi.register(values);
      setUser(data.user, data.accessToken);
      router.replace("/verify-email?sent=true");
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError("email", { message: apiErr?.message ?? "Registration failed" });
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
            <CardTitle>Create account</CardTitle>
            <CardDescription>Start managing your competitions</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="First name"
                  placeholder="Jan"
                  error={errors.firstName?.message}
                  {...register("firstName")}
                />
                <Input
                  label="Last name"
                  placeholder="Novák"
                  error={errors.lastName?.message}
                  {...register("lastName")}
                />
              </div>

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
                autoComplete="new-password"
                placeholder="Min. 8 chars, uppercase, number"
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
                Create account
              </Button>

              <p className="text-center text-sm text-[var(--text-secondary)]">
                Already have an account?{" "}
                <Link href="/login" className="text-[var(--accent)] hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
