# Community-App – Behördenclient

Responsiver React-Client für die Behördenfunktionen des Community-App-Backends.

## Voraussetzungen

- Node.js 22.22 oder neuer
- npm
- optional: laufendes FastAPI-Backend für OpenAPI-Synchronisation und spätere API-Aufrufe

## Installation

```bash
npm ci
cp .env.example .env
```

## Entwicklung

```bash
npm run dev
```

Die Anwendung ist standardmäßig unter `http://localhost:5173` erreichbar. Anfragen an `/api` werden im Entwicklungsmodus an `http://localhost:8000` weitergeleitet.

## Qualitätssicherung

```bash
npm run verify
npm run test:e2e
```

Vitest sammelt ausschließlich Tests unter `src/`. Die Playwright-Spezifikationen unter `tests/e2e/` werden getrennt über `npm run test:e2e` ausgeführt.

`verify` führt ESLint, Prettier, Vitest, TypeScript und den Produktionsbuild aus. Die Playwright-Tests werden separat ausgeführt.

## OpenAPI-Client

Bei laufendem Backend kann die OpenAPI-Spezifikation geladen und der Orval-Client erzeugt werden:

```bash
npm run api:sync
```

Generierte Dateien unter `src/api/generated` werden nicht manuell bearbeitet.

## Aktuelle Struktur

```text
src/
├── app/       # Router, Provider und anwendungsweite Infrastruktur
├── config/    # geprüfte Laufzeitkonfiguration
├── pages/     # seitenbezogene Komponenten
├── shared/    # fachlich unabhängige Layout- und UI-Bausteine
└── test/      # gemeinsame Testhelfer und Test-Setup
```

Fachliche Features, Authentifizierung und API-Kommunikation werden in getrennten Patches ergänzt.

## Gemeinsame UI-Bausteine

Die Route `/ui-kit` zeigt die aktuell verfügbaren gemeinsamen Komponenten und semantischen Designfarben. Die Farbpalette orientiert sich am bisherigen Bürgerclient; Komponenten verwenden ausschließlich semantische Tokens wie `primary`, `surface` oder `error` statt fachlich bedeutungsloser Farbnamen.

Aktuell enthalten sind:

```text
src/shared/
├── forms/
│   ├── ControlledCheckboxField.tsx
│   ├── ControlledTextField.tsx
│   ├── field-name.ts
│   ├── form-errors.ts
│   └── zod-resolver.ts
├── lib/
│   └── cn.ts
└── ui/
    ├── Button.tsx
    ├── Card.tsx
    ├── CheckboxField.tsx
    ├── FormActions.tsx
    ├── FormErrorSummary.tsx
    ├── LinkButton.tsx
    ├── PageHeader.tsx
    └── TextField.tsx
```

Neue fachliche Seiten sollen diese Bausteine wiederverwenden. Text- und Checkboxfelder basieren auf React Aria Components und stellen sichtbare Beschriftungen, Beschreibungen, Fehlerzustände und ausreichend große Interaktionsflächen bereit. Unter `src/shared/forms` liegen die schmalen React-Hook-Form-Adapter sowie die gemeinsame Zod-Validierung und Fehlerzusammenfassung. Zusätzliche Varianten werden erst ergänzt, wenn ein konkreter Anwendungsfall sie benötigt.

## API-Transport

Der gemeinsame Fetch-Mutator liegt unter `src/api/client`. Er verbindet relative OpenAPI-Pfade mit `VITE_API_BASE_URL`, verarbeitet JSON-, Text-, Blob- und leere Antworten und überführt Backendfehler in `ApiError`.

Orval verwendet diesen Mutator für alle später generierten Funktionen und TanStack-Query-Hooks. Authentifizierungsheader und Token-Rotation sind bewusst noch nicht Bestandteil dieser Schicht und werden in einem eigenen Patch ergänzt.
