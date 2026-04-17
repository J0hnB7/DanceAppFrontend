"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";
import { selfRegistrationApi } from "@/lib/api/self-registration";
import { useAlertsStore } from "@/store/alerts-store";
import { LogoMark } from "@/components/ui/logo-mark";

export default function PartnerConfirmPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const addAlert = useAlertsStore((s) => s.addAlert);

  const { data, isLoading, error } = useQuery({
    queryKey: ["confirm-info", token],
    queryFn: () => selfRegistrationApi.getConfirmInfo(token),
    retry: false,
  });

  const confirmMutation = useMutation({
    mutationFn: () => selfRegistrationApi.confirmPartner(token),
    onSuccess: () => {
      addAlert({ level: "info", title: "Registrace potvrzena! Nyní jste přihlášeni na soutěž." });
      router.push("/dashboard");
    },
    onError: () => {
      addAlert({ level: "error", title: "Nepodařilo se potvrdit registraci. Zkuste to znovu." });
    },
  });

  const declineMutation = useMutation({
    mutationFn: () => selfRegistrationApi.declinePartner(token),
    onSuccess: () => {
      addAlert({ level: "info", title: "Registrace odmítnuta." });
      router.push("/");
    },
    onError: () => {
      addAlert({ level: "error", title: "Nepodařilo se odmítnout registraci." });
    },
  });

  const loginUrl = `/login?returnTo=${encodeURIComponent(`/registrations/confirm/${token}`)}`;

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.08)", padding: "40px 32px", maxWidth: 480, width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <LogoMark size={40} />
        </div>

        {isLoading && (
          <p style={{ textAlign: "center", color: "#6B7280" }}>Načítám...</p>
        )}

        {error && (
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "#DC2626", marginBottom: 16 }}>Pozvánka nebyla nalezena nebo již byla potvrzena.</p>
            <a href="/" style={{ color: "#4F46E5", textDecoration: "underline" }}>Zpět na hlavní stránku</a>
          </div>
        )}

        {data && (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 8, textAlign: "center" }}>
              Pozvánka na soutěž
            </h1>
            <p style={{ color: "#6B7280", textAlign: "center", marginBottom: 24, fontSize: 15 }}>
              Taneční partner/ka <strong style={{ color: "#111827" }}>{data.inviterName}</strong> vás zve k registraci.
            </p>

            <div style={{ background: "#F3F4F6", borderRadius: 12, padding: "16px 20px", marginBottom: 24 }}>
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 1 }}>Soutěž</span>
                <p style={{ color: "#111827", fontWeight: 600, margin: 0 }}>{data.competitionName}</p>
              </div>
              <div>
                <span style={{ fontSize: 12, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 1 }}>Kategorie</span>
                <p style={{ color: "#111827", fontWeight: 600, margin: 0 }}>{data.sectionName}</p>
              </div>
            </div>

            {!user ? (
              <div style={{ textAlign: "center" }}>
                <p style={{ color: "#6B7280", marginBottom: 16, fontSize: 14 }}>
                  Pro potvrzení registrace se musíte přihlásit.
                </p>
                <a
                  href={loginUrl}
                  style={{
                    display: "inline-block",
                    background: "#4F46E5",
                    color: "#fff",
                    padding: "12px 32px",
                    borderRadius: 8,
                    fontWeight: 600,
                    textDecoration: "none",
                    fontSize: 15,
                  }}
                >
                  Přihlásit se
                </a>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <button
                  onClick={() => confirmMutation.mutate()}
                  disabled={confirmMutation.isPending || declineMutation.isPending}
                  style={{
                    background: "#4F46E5",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "14px 0",
                    fontWeight: 700,
                    fontSize: 15,
                    cursor: confirmMutation.isPending ? "not-allowed" : "pointer",
                    opacity: confirmMutation.isPending ? 0.7 : 1,
                  }}
                >
                  {confirmMutation.isPending ? "Potvrzuji..." : "Potvrdit registraci"}
                </button>
                <button
                  onClick={() => declineMutation.mutate()}
                  disabled={confirmMutation.isPending || declineMutation.isPending}
                  style={{
                    background: "#F3F4F6",
                    color: "#374151",
                    border: "1px solid #E5E7EB",
                    borderRadius: 8,
                    padding: "12px 0",
                    fontWeight: 600,
                    fontSize: 15,
                    cursor: declineMutation.isPending ? "not-allowed" : "pointer",
                    opacity: declineMutation.isPending ? 0.7 : 1,
                  }}
                >
                  {declineMutation.isPending ? "Odmítám..." : "Odmítnout"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
