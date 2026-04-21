# Zod v4 & paymentConfig gotchas — frontend

> Read on-demand when working with Zod validation schemas or competition paymentConfig.

## Zod v4 gotchas

- `z.enum([...], { required_error: ... })` **nefunguje** → `{ error: "..." }`
- `z.coerce.number()` / `z.preprocess()` inferují `unknown` → TS chyba v RHF resolveru. Fix: `z.string().refine(v => Number.isInteger(Number(v)) && ...)` + `Number(values.field)` v handleru

## paymentConfig struktura

`competition.paymentConfig: Record<String, String>`:
- `BANK_TRANSFER`: `holder`, `iban`, `bic`, `address`, `qrCode` (base64 PNG)
- `ORGANIZER_WEBSITE`: `{ url }`
- `STRIPE`: `{ apiKey }`
