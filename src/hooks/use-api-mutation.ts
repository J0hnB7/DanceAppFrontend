import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/utils";

/**
 * Drop-in `useMutation` replacement that adds a default destructive-toast
 * onError when the caller doesn't supply one. Closes MED-30: ~13 mutation
 * sites in the codebase had no onError, so failures (409, 422, 5xx) became
 * unhandled promise rejections that Sentry captured as
 *   `Object captured as promise rejection with keys: status, message`
 * with no domain context. Users saw save buttons spin and reset with no
 * feedback — silent data-loss perception.
 *
 * Caller may still override onError when more specialised handling is
 * needed (optimistic-update rollback, modal logic, custom message, etc.) —
 * the override completely replaces the default toast.
 *
 * Audit ref: docs/audits/2026-04-27-full-audit/05-fe-correctness.md §4 (MED-30).
 */
export function useApiMutation<TData = unknown, TError = unknown, TVariables = void, TContext = unknown>(
  options: UseMutationOptions<TData, TError, TVariables, TContext> & {
    /**
     * Override the default toast title shown on error. Use the i18n key your
     * page already imports — the wrapper does not own translation.
     */
    errorTitle?: string;
  },
) {
  const { errorTitle, onError, ...rest } = options;
  return useMutation<TData, TError, TVariables, TContext>({
    ...rest,
    onError: onError
      ? onError
      : (err) => {
          toast({
            title: errorTitle ?? getErrorMessage(err, "Operation failed"),
            variant: "destructive",
          });
        },
  });
}
