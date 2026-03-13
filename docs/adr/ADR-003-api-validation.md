# ADR-003: API-validering med Zod

**Status:** Accepted  
**Date:** 2026-03-13  
**Deciders:** Emil Krog Ingerslev

---

## Context

Fastify-backend modtager data fra frontend og skal validere input. Vi skal sikre at alle felter der sendes fra frontend også accepteres af backend-skemaet.

## Decision

- Alle route-inputs valideres med **Zod-skemaer** i `src/api/src/routes/`
- Skemaer skal matche de felter frontend sender — ved tvivl: tjek begge sider
- `categoryId`, `productId` og andre optional felter skal eksplicit inkluderes i skemaet

**Læring (2026-03-13):** `categoryId` manglede i `addItemSchema` og blev stille fjernet af Zod-validering, selvom service-laget håndterede det korrekt. Tjek altid skema ↔ frontend-payload alignment.

## Consequences

- ✅ Type-sikkerhed end-to-end
- ✅ Tydelige fejlbeskeder ved validation-fejl
- ❌ Skema og service-input-type kan gå ud af sync — kræver opmærksomhed
