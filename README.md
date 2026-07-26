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

Orval verwendet diesen Mutator für alle später generierten Funktionen und TanStack-Query-Hooks. Die allgemeine Antwort- und Fehlerverarbeitung bleibt in einer auth-unabhängigen Transportfunktion gekapselt; der äußere Mutator ergänzt bei Bedarf die Sitzungsinformationen.

## Token-Speicherung

Der Client hält Access-Tokens ausschließlich im Arbeitsspeicher. Refresh-Tokens werden standardmäßig tablokal in `sessionStorage` gespeichert und nur bei einer späteren expliziten „Angemeldet bleiben“-Entscheidung in `localStorage` abgelegt. Login, Logout und die React-Sitzungsintegration werden in separaten Patches ergänzt.

## Authentifizierter API-Transport

Der Orval-Mutator ergänzt bei verwalteten API-Aufrufen automatisch den aktuellen Access-Token aus dem speicherunabhängigen `TokenStore`. Öffentliche oder bewusst fremdauthentifizierte Requests können mit `authentication: 'none'` von diesem Verhalten ausgenommen werden.

Antwortet ein verwalteter Request mit HTTP 401 und ist ein Refresh-Token vorhanden, koordiniert der Client genau eine Rotation pro Tab. Unterstützt der Browser die Web-Locks-API, werden Rotationen zusätzlich zwischen Tabs serialisiert. Nach erfolgreicher Rotation wird die ursprüngliche Anfrage genau einmal mit dem neuen Access-Token wiederholt.

Ein vom Backend abgelehnter Refresh-Token löscht die lokale Sitzung und veröffentlicht ein `session-expired`-Ereignis. Temporäre Netzwerkfehler löschen den gespeicherten Refresh-Token dagegen nicht. Auth-Provider und Login-Oberflächen werden weiterhin in späteren Patches ergänzt.
