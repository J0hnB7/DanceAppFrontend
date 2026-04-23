import apiClient from "@/lib/api-client";
import {
  InvoiceSchema,
  PaymentRecordSchema,
  PaymentSummarySchema,
  type InvoiceDto,
  type PaymentRecord,
  type PaymentSummary,
} from "@/lib/api/schemas/invoice";
import { parseApiList, parseApiResponse } from "@/lib/api/schemas/parse";

export type { InvoiceDto, PaymentRecord, PaymentSummary };

export const paymentsApi = {
  list: (competitionId: string, params?: { status?: string; sectionId?: string }) =>
    apiClient
      .get(`/competitions/${competitionId}/payments`, { params })
      .then((r) => parseApiList(PaymentRecordSchema, r.data, "paymentsApi.list")),

  summary: (competitionId: string) =>
    apiClient
      .get(`/competitions/${competitionId}/payments/summary`)
      .then((r) => parseApiResponse(PaymentSummarySchema, r.data, "paymentsApi.summary")),

  markPaid: (competitionId: string, paymentId: string) =>
    apiClient
      .put(`/competitions/${competitionId}/payments/${paymentId}/mark-paid`)
      .then((r) => parseApiResponse(PaymentRecordSchema, r.data, "paymentsApi.markPaid")),

  waive: (competitionId: string, paymentId: string, reason?: string) =>
    apiClient
      .put(`/competitions/${competitionId}/payments/${paymentId}/waive`, { reason })
      .then((r) => parseApiResponse(PaymentRecordSchema, r.data, "paymentsApi.waive")),

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
// Reconciles BE `totalAmount` ↔ legacy `amount`. Callers read `.amount`.
function reconcileInvoiceAmount(inv: InvoiceDto): InvoiceDto & { amount: number } {
  return { ...inv, amount: inv.amount ?? inv.totalAmount ?? 0 };
}

export const invoicesApi = {
  list: (competitionId: string) =>
    apiClient
      .get(`/competitions/${competitionId}/invoices`)
      .then((r) => parseApiList(InvoiceSchema, r.data ?? [], "invoicesApi.list").map(reconcileInvoiceAmount)),

  create: (competitionId: string, data: { pairId?: string; amount: number; currency: string }) =>
    apiClient
      .post(`/competitions/${competitionId}/invoices`, {
        pairId: data.pairId,
        currency: data.currency,
        lineItems: [{ description: "Startovné", quantity: 1, unitPrice: data.amount }],
      })
      .then((r) => reconcileInvoiceAmount(parseApiResponse(InvoiceSchema, r.data, "invoicesApi.create"))),

  markPaid: (competitionId: string, invoiceId: string) =>
    apiClient.post<void>(`/competitions/${competitionId}/invoices/${invoiceId}/mark-paid`).then((r) => r.data),

  send: (competitionId: string, invoiceId: string) =>
    apiClient
      .post(`/competitions/${competitionId}/invoices/${invoiceId}/send`)
      .then((r) => reconcileInvoiceAmount(parseApiResponse(InvoiceSchema, r.data, "invoicesApi.send"))),

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
