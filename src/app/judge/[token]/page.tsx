"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import apiClient from "@/lib/api-client";
import { t, detectLocale, type Locale } from "@/lib/i18n/translations";

interface JudgeSession {
  judgeTokenId: string;
  judgeNumber: number;
  competitionId: string;
  competitionName: string;
}

export default function JudgeTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [locale] = useState<Locale>(() => detectLocale());

  const [session, setSession] = useState<JudgeSession | null>(null);
  const [needsPin, setNeedsPin] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSubmitting, setPinSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    // Clear any previous session — PIN is always required on fresh login
    localStorage.removeItem("judge_device_token");
    localStorage.removeItem("judge_competition_id");
    localStorage.removeItem("judge_adjudicator_id");
    localStorage.removeItem("judge_access_token");

    apiClient
      .post<JudgeSession>("/judge-tokens/validate", { token })
      .then((r) => {
        setSession(r.data);
        setNeedsPin(true);
        setLoading(false);
      })
      .catch((e) => {
        setError(e?.message ?? "Invalid or expired judge token");
        setLoading(false);
      });
  }, [token, router]);

  const handlePinSubmit = async () => {
    if (!pin || pin.length < 4) return;
    setPinSubmitting(true);
    setPinError(null);
    try {
      const res = await apiClient.post("/judge-access/connect", { token, pin });
      const { accessToken, adjudicatorId, competitionId, competitionName, deviceToken } = res.data;
      localStorage.setItem("judge_access_token", accessToken);
      localStorage.setItem("judge_device_token", deviceToken);
      localStorage.setItem("judge_competition_id", competitionId);
      localStorage.setItem("judge_adjudicator_id", adjudicatorId);
      void competitionName;
      void accessToken;
      void adjudicatorId;
      router.replace(`/judge/${token}/lobby`);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 423) {
        setPinError(t("judge.pin_locked", locale));
      } else {
        setPinError(t("judge.pin_wrong", locale));
      }
      setPinSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center bg-[var(--background)]">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--destructive)]/10">
          <AlertTriangle className="h-8 w-8 text-[var(--destructive)]" />
        </div>
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">{t("judge.access_denied", locale)}</h1>
        <p className="max-w-xs text-sm text-[var(--text-secondary)]">{error}</p>
      </div>
    );
  }

  if (!needsPin) return null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 bg-[var(--background)]">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent)]/10">
        <Lock className="h-8 w-8 text-[var(--accent)]" />
      </div>
      <div className="text-center">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">{t("judge.pin_prompt", locale)}</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{session?.competitionName}</p>
      </div>

      <div className="w-full max-w-xs space-y-4">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && handlePinSubmit()}
          placeholder="• • • •"
          className="w-full rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-4 py-4 text-center text-2xl font-bold tracking-[0.4em] text-[var(--text-primary)] outline-none focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/30 transition-colors"
        />

        {pinError && (
          <p className="text-center text-sm font-medium text-[var(--destructive)]">{pinError}</p>
        )}

        <Button
          className="w-full"
          size="lg"
          loading={pinSubmitting}
          disabled={pin.length < 4 || pinSubmitting}
          onClick={handlePinSubmit}
        >
          {pinSubmitting ? t("judge.connecting", locale) : t("judge.login_button", locale)}
        </Button>
      </div>
    </div>
  );
}
