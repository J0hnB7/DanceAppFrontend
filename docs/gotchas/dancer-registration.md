# Dancer registration gotchas — frontend

> Read on-demand when working on dancer self-registration, profile, or eligibleSections.

## Dancer — registrace & profile

- **Dancer se MUSÍ přihlásit** — anonymní registrace zrušena
- `/competitions/[id]/page.tsx` zobrazuje jen `eligibleSections` (filtr podle `birthYear` profilu)
- `/competitions/[id]/register/page.tsx` → redirect na detail
- BE validuje věk v `SelfRegistrationService.register()`
- CSP: Google Sign-In (`@react-oauth/google`) vyžaduje `https://accounts.google.com` v `script-src` + `frame-src`

### eligibleSections query guard
`enabled: isDancer && dancerProfile !== undefined` — bez toho query běží před načtením profilu (birthYear undefined → jiný query key → zbytečný request)

### Batch self-registration — shared startNumber
- `POST /competitions/{id}/pairs/self-register-batch` s `{ sectionIds: UUID[] }` → jeden `pairId` + `startNumber` pro všechny sekce
- BE: `SelfRegistrationService.registerBatch()` reuses Pair přes `PairRepository.findByCompetitionIdAndUserId`
- Jeden souhrnný email přes `registration-confirmed-batch.html` (`sectionRows` HTML string, `sectionCount`, total `entryFee`)
- FE: volej `selfRegistrationApi.registerBatch()` jednou, NE loop `register()`
- Starý `register()` zachován pro kompat

### competitionType pravidla
- `danceStyle = SINGLE_DANCE | MULTIDANCE` → Richtar SOLO, okamžitý `REGISTERED`
- `competitionType = null | COUPLE` → párová (`PENDING_PARTNER`)
- `competitionType` začíná `SOLO` → solo
- `FORMATION_*` nebo `SHOW` → self-registration zamítnuta (400)

### MyCompetitionEntry — flat
BE `GET /profile/dancer/competitions` vrací flat záznamy (`startNumber`, `sectionName`, `reachedRound` top-level) — ne `sections[]` array.
