import apiClient from "@/lib/api-client";

export interface InvoiceDto {
  id: string;
  competitionId: string;
  /** Backend returns totalAmount; mapped to amount for display */
  amount: number;
  totalAmount?: number;
  currency: string;
  status: "DRAFT" | "SENT" | "PAID" | "CANCELLED" | "REFUNDED";
  invoiceNumber?: string;
  paidAt?: string;
  startNumber?: number;
  dancer1Name?: string;
}


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

/** Backend invoice system: /competitions/{id}/invoices */
export const invoicesApi = {
  list: (competitionId: string) =>
    apiClient.get<InvoiceDto[]>(`/competitions/${competitionId}/invoices`).then((r) =>
      (r.data ?? []).map((inv) => ({ ...inv, amount: inv.amount ?? inv.totalAmount ?? 0 }))
    ),

  create: (competitionId: string, data: { pairId?: string; amount: number; currency: string }) =>
    apiClient.post<InvoiceDto>(`/competitions/${competitionId}/invoices`, {
      pairId: data.pairId,
      currency: data.currency,
      lineItems: [{ description: "Startovné", quantity: 1, unitPrice: data.amount }],
    }).then((r) => r.data),

  markPaid: (competitionId: string, invoiceId: string) =>
    apiClient.post<void>(`/competitions/${competitionId}/invoices/${invoiceId}/mark-paid`).then((r) => r.data),

  send: (competitionId: string, invoiceId: string) =>
    apiClient.post<InvoiceDto>(`/competitions/${competitionId}/invoices/${invoiceId}/send`).then((r) => r.data),

  downloadPdf: (competitionId: string, invoiceId: string) =>
    apiClient
      .get(`/competitions/${competitionId}/invoices/${invoiceId}/pdf`, { responseType: "blob" })
      .then((r) => {
        const url = URL.createObjectURL(r.data as Blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `faktura-${invoiceId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }),
};
