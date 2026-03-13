# ADR-004: Familie-model — delt data på tværs af brugere

**Status:** Accepted  
**Date:** 2026-03-13  
**Deciders:** Emil Krog Ingerslev

---

## Context

Ingerslevhub er bygget med `userId` som primær adgangskontrol-nøgle på alle tabeller. Det betyder at alle data (lektier, indkøbsliste, madplan, opskrifter) tilhører én bruger og ikke kan deles.

Familien Ingerslev har brug for at alle familiemedlemmer (Emil, Anne, Ron og fremtidige brugere) kan se og redigere de samme data — lektier, madplan, indkøbsliste osv.

## Decision

Indfør et **familie-lag** (family) som den primære enhed for delt data:

### Nye tabeller

```sql
families (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  createdAt timestamp
)

family_members (
  id uuid PRIMARY KEY,
  familyId uuid REFERENCES families(id),
  userId uuid REFERENCES users(id),
  role text DEFAULT 'member',  -- 'owner' | 'member'
  createdAt timestamp
)
```

### Ændringer i eksisterende tabeller

Alle tabeller der i dag har `userId` som adgangsnøgle får et `familyId` tilføjet:
- `grocery_lists` → `familyId`
- `homework_students` → `familyId`
- `homework_tasks` → via `homework_students.familyId`
- `meal_plans` → `familyId`
- `recipes` → `familyId`
- `grocery_products` → `familyId`
- `grocery_categories` → `familyId`

`userId` beholdes på alle tabeller som audit-felt ("hvem oprettede det").

### Auth-flow

1. Bruger logger ind → `userId` resolves fra token/API-nøgle
2. Auth-middleware resolver `familyId` fra `family_members` tabellen
3. Services filtrerer på `familyId` i stedet for `userId`
4. Hvis bruger ikke har nogen familie → auto-opret en enkelt-bruger familie

### Migration

1. Opret `families` og `family_members` tabeller
2. For hver eksisterende bruger: opret en familie og tilføj brugeren som `owner`
3. Kopier `userId` → `familyId` på alle tabeller via join
4. Deploy ny kode der bruger `familyId`
5. `userId`-kolonner gøres nullable over tid (bagudkompatibelt)

### Familie-invite flow (fremtidigt)

- Owner kan invite via e-mail
- Invite-link → ny bruger oprettes og tilknyttes familien
- Ron (`ron@ingerslev.io`) tilknyttes Ingerslev-familien som `member`

## Consequences

- ✅ Alle familiemedlemmer ser samme indkøbsliste, lektier og madplan
- ✅ Ron kan oprette data der er synlig for Emil og omvendt
- ✅ Fremtidige brugere (Anne) kan tilføjes uden datamigrering
- ❌ Kræver en database-migration med risiko — testes lokalt før deploy
- ❌ Alle services og routes skal opdateres (ca. 8-10 filer)

## Implementation scope

**Backend:**
- `src/api/src/db/schema.ts` — nye tabeller + familyId kolonner
- `src/api/src/db/migrate.ts` — migration script
- `src/api/src/plugins/auth.ts` — resolver familyId fra userId
- Alle services — filter på familyId i stedet for userId

**Frontend:** Ingen ændringer nødvendige (data er bare synlig)

**Estimat:** 4-6 timers arbejde inkl. test
