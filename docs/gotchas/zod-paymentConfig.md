# Zod v4 & paymentConfig gotchas — frontend

> Read on-demand when working with Zod validation schemas or competition paymentConfig.

## Zod v4 gotchas

- `z.enum([...], { required_error: ... })` **nefunguje** → `{ error: "..." }`
- `z.coerce.number()` / `z.preprocess()` inferují `unknown` → TS chyba v RHF resolveru. Fix: `z.string().refine(v => Number.isInteger(Number(v)) && ...)` + `Number(values.field)` v handleru
- **`z.string().optional()` odmítá JSON `null`** — přijímá `string | undefined`, NE `null`. Protože `JacksonConfig` nemá `NON_NULL`, nullable Java pole serializes jako JSON `null` → `[api-drift]` error. Fix: `.nullish()` (= `.nullable().optional()`) pro všechna pole backed by nullable Java typy (`String`, `Integer`, boxed enums). Pattern: `dancer1Name: z.string().nullish()`, ne `.optional()`.

## paymentConfig struktura

`competition.paymentConfig: Record<String, String>`:
- `BANK_TRANSFER`: `holder`, `iban`, `bic`, `address`, `qrCode` (base64 PNG)
- `ORGANIZER_WEBSITE`: `{ url }`
- `STRIPE`: `{ apiKey }`
