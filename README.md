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
├── lib/
│   └── cn.ts
└── ui/
    ├── Button.tsx
    ├── Card.tsx
    ├── LinkButton.tsx
    └── PageHeader.tsx
```

Neue fachliche Seiten sollen diese Bausteine wiederverwenden. Zusätzliche Varianten werden erst ergänzt, wenn ein konkreter Anwendungsfall sie benötigt.
