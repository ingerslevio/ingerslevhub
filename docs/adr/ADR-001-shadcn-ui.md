# ADR-001: Shadcn/ui som komponentbibliotek

**Status:** Accepted  
**Date:** 2026-03-13  
**Deciders:** Emil Krog Ingerslev

---

## Context

Ingerslevhub er en familie-app med behov for et konsistent og mobil-venligt UI. Vi skulle vælge mellem et fuldt komponentbibliotek (MUI, Chakra) og en copy-paste tilgang.

## Decision

Vi bruger **Shadcn/ui** — komponenter kopieres ind i `src/web/src/components/ui/` og ejes af projektet.

## Consequences

- ✅ Fuld kontrol over komponenter — ingen breaking changes fra upstream
- ✅ Tailwind-baseret — konsistent med resten af styling
- ✅ AI-agenter kan redigere komponenter direkte
- ❌ Opdateringer er manuelle (copy-paste fra shadcn)
