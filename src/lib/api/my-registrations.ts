import apiClient from "@/lib/api-client";

export interface MyRegistration {
  id: string;
  competitionId: string;
  competitionName: string;
  competitionLocation: string;
  competitionStartDate: string;
  competitionStatus: string;
  sectionId: string;
  sectionName: string;
  startNumber?: number;
  dancer1FirstName: string;
  dancer1LastName: string;
  dancer2FirstName?: string;
  dancer2LastName?: string;
  paymentStatus: "PENDING" | "PAID" | "WAIVED";
  amountDue?: number;
  currency?: string;
  registeredAt: string;
}

export interface MyPayment {
  id: string;
  registrationId: string;
  competitionName: string;
  amount: number;
  currency: string;
  status: "PENDING" | "PAID" | "REFUNDED";
  dueDate?: string;
  paidAt?: string;
  invoiceUrl?: string;
}

export const myRegistrationsApi = {
  list: () =>
    apiClient.get<MyRegistration[]>("/me/registrations").then((r) => r.data),

  payments: () =>
    apiClient.get<MyPayment[]>("/me/payments").then((r) => r.data),

  cancel: (registrationId: string) =>
    apiClient.delete(`/me/registrations/${registrationId}`).then((r) => r.data),
};
