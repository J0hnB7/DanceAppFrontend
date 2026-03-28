import apiClient from "@/lib/api-client";

export type ExpenseCategory =
  | "VENUE"
  | "DJ"
  | "SCORER"
  | "JUDGE_FEE"
  | "PRINTING"
  | "CATERING"
  | "OTHER";

export interface ExpenseDto {
  id: string;
  name: string;
  category: ExpenseCategory;
  amount: number;
  currency: string;
  note?: string;
}

export interface BudgetSummaryDto {
  paidRevenue: number;
  pendingRevenue: number;
  totalExpenses: number;
  netProfit: number;
  projectedProfit: number;
  currency: string;
  expenses: ExpenseDto[];
}

export interface CreateExpenseRequest {
  name: string;
  category: ExpenseCategory;
  amount: number;
  currency: string;
  note?: string;
}

export const budgetApi = {
  getSummary: (competitionId: string): Promise<BudgetSummaryDto> =>
    apiClient.get<BudgetSummaryDto>(`/competitions/${competitionId}/budget`).then((r) => r.data),

  createExpense: (competitionId: string, data: CreateExpenseRequest): Promise<ExpenseDto> =>
    apiClient.post<ExpenseDto>(`/competitions/${competitionId}/expenses`, data).then((r) => r.data),

  updateExpense: (
    competitionId: string,
    expenseId: string,
    data: CreateExpenseRequest
  ): Promise<ExpenseDto> =>
    apiClient
      .put<ExpenseDto>(`/competitions/${competitionId}/expenses/${expenseId}`, data)
      .then((r) => r.data),

  deleteExpense: (competitionId: string, expenseId: string): Promise<void> =>
    apiClient
      .delete(`/competitions/${competitionId}/expenses/${expenseId}`)
      .then(() => undefined),
};
