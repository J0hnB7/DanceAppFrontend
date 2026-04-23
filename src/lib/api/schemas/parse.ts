import type { ZodType } from "zod";

// Parses an API response against a schema. On validation failure, logs the
// issues (Sentry picks this up) and falls back to the raw data cast to the
// inferred type — so a BE rename doesn't immediately blank out the UI, but the
// drift becomes visible in error monitoring instead of hiding behind `?? 0`.
export function parseApiResponse<T>(schema: ZodType<T>, data: unknown, context: string): T {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  // eslint-disable-next-line no-console
  console.error(`[api-drift] ${context}`, {
    issues: result.error.issues,
    sample: Array.isArray(data) ? data[0] : data,
  });
  return data as T;
}

export function parseApiList<T>(
  schema: ZodType<T>,
  data: unknown,
  context: string,
): T[] {
  if (!Array.isArray(data)) {
    // eslint-disable-next-line no-console
    console.error(`[api-drift] ${context}: expected array, got ${typeof data}`);
    return [];
  }
  return data.map((item, i) => parseApiResponse(schema, item, `${context}[${i}]`));
}
