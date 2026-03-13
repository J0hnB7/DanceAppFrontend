import apiClient from "@/lib/api-client";

export interface PaymentRecord {
  id: string;
  pairId: string;
  dancer1Name: string;
  dancer2Name?: string;
  startNumber?: number;
  sectionName: string;
  amount: number;
  currency: string;
  status: "PENDING" | "PAID" | "REFUNDED" | "WAIVED";
  paidAt?: string;
  dueDate?: string;
  invoiceNumber?: string;
  notes?: string;
}

export interface PaymentSummary {
  totalExpected: number;
  totalCollected: number;
  totalPending: number;
  currency: string;
  paidCount: number;
  pendingCount: number;
}

export const paymentsApi = {
  list: (competitionId: string, params?: { status?: string; sectionId?: string }) =>
    apiClient
      .get<PaymentRecord[]>(`/competitions/${competitionId}/payments`, { params })
      .then((r) => r.data),

  summary: (competitionId: string) =>
    apiClient
      .get<PaymentSummary>(`/competitions/${competitionId}/payments/summary`)
      .then((r) => r.data),

  markPaid: (competitionId: string, paymentId: string) =>
    apiClient
      .put<PaymentRecord>(`/competitions/${competitionId}/payments/${paymentId}/mark-paid`)
      .then((r) => r.data),

  waive: (competitionId: string, paymentId: string, reason?: string) =>
    apiClient
      .put<PaymentRecord>(`/competitions/${competitionId}/payments/${paymentId}/waive`, { reason })
      .then((r) => r.data),

  bulkMarkPaid: (competitionId: string, paymentIds: string[]) =>
    apiClient
      .put(`/competitions/${competitionId}/payments/bulk-mark-paid`, { paymentIds })
      .then((r) => r.data),

  exportCsv: (competitionId: string) =>
    apiClient
      .get(`/competitions/${competitionId}/payments/export`, { responseType: "blob" })
      .then((r) => {
        const url = URL.createObjectURL(r.data as Blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `payments_${competitionId}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }),
};
