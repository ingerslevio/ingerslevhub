# ADR-002: Indkøbsliste UX-principper

**Status:** Accepted  
**Date:** 2026-03-13  
**Deciders:** Emil Krog Ingerslev

---

## Context

Indkøbslisten bruges primært på mobil mens man handler. UX skal optimeres til én hånd, hurtige handlinger og minimal scrolling.

## Decision

- **"Tilføj varer"** er en collapsible sektion — foldet ind som standard på mobil
- **"Købte varer"** er en collapsible sektion med max-height og intern scroll
- Ingen fixed/sticky positionering — alt er i normal document flow så siden kan scrolles
- **"Fra madplan"** funktionen lever KUN på Madplan-siden, ikke på indkøbslisten
- Varer tilføjes med `+`-knap (direkte) eller via expand (mængde/note)

## Consequences

- ✅ Hele listen er tilgængelig på mobil uden overlappende UI
- ✅ Shopping-flow er uforstyrret — accordions gemmes af vejen
- ❌ "Fra madplan" er et ekstra klik væk (madplan-siden) — bevidst tradeoff
