# Community-App – Behördenclient

Responsiver React-Client für die Behördenfunktionen des Community-App-Backends.

## Voraussetzungen

- Node.js 24.14.1 (siehe `.nvmrc` und `.node-version`)
- npm 11.11.0
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
npm run verify:fast
npm run verify
```

Vitest sammelt ausschließlich Tests unter `src/`. Die Playwright-Spezifikationen unter `tests/e2e/` werden getrennt über `npm run test:e2e` ausgeführt.

Für einen echten Integrationslauf gegen ein frisch migriertes und geseedetes Backend steht zusätzlich `npm run test:fullstack` bereit. Diese Suite verwendet keine API-Mocks, sondern echte Logins, rotierende Refresh-Tokens, mehrere Browser-Sessions, PostgreSQL und reale Datei-Uploads. Voraussetzungen und Ablauf sind in `docs/fullstack-e2e.md` beschrieben.

`verify:fast` führt OpenAPI-Validierung, ESLint, Prettier, Vitest, TypeScript und den Produktionsbuild aus. `verify` ergänzt die Playwright-Tests für Desktop, Tablet und Smartphone. Die Full-Stack-Suite bleibt bewusst separat, weil sie eine entbehrliche, frisch geseedete Backend-Datenbank voraussetzt. Der CI-Workflow verwendet den regulären vollständigen Lauf.

## OpenAPI-Client

Der versionierte Vertrag unter `openapi/openapi.json` erlaubt eine reproduzierbare Orval-Generierung ohne laufendes Backend:

```bash
npm run api:validate
npm run api:generate
```

Bei einer bewussten Backend-Synchronisation kann der Snapshot aktualisiert und der Client anschließend neu erzeugt werden:

```bash
npm run api:sync
```

`OPENAPI_URL` überschreibt bei Bedarf den Standard `http://localhost:8000/api/v1/openapi.json`. Änderungen am Snapshot und an den generierten Dateien sollen gemeinsam geprüft werden. Dateien unter `src/api/generated` werden nicht manuell bearbeitet.

## Aktuelle Struktur

```text
src/
├── api/       # Transport, Fehlernormalisierung und spätere generierte Clients
├── app/       # Router, Provider und anwendungsweite Infrastruktur
├── config/    # geprüfte Laufzeitkonfiguration
├── features/  # fachlich gekapselte Routen, Modelle, Queries und Komponenten
├── pages/     # seitenbezogene Komponenten
├── shared/    # fachlich unabhängige Layout-, Daten- und UI-Bausteine
└── test/      # gemeinsame Testhelfer, MSW-Server und Test-Setup
```

Das erste Fachmodul unter `src/features/users` stellt Benutzerverzeichnis, Profile, Administration, Deaktivierung und Audit-Historie bereit. Weitere Fachbereiche werden in getrennten Patches ergänzt.

## Gemeinsame UI-Bausteine

Die Route `/ui-kit` zeigt in Entwicklungsbuilds die aktuell verfügbaren gemeinsamen Komponenten und semantischen Designfarben. Sie ist nicht Teil der regulären Produktionsanwendung. Die Farbpalette orientiert sich am bisherigen Bürgerclient; Komponenten verwenden ausschließlich semantische Tokens wie `primary`, `surface` oder `error` statt fachlich bedeutungsloser Farbnamen.

Aktuell enthalten sind:

```text
src/shared/
├── confirmation/  # globale Bestätigungsdialoge
├── data-view/     # URL-State, Filter, responsive Listen und Pagination
├── feedback/      # globale Statusmeldungen und API-Fehlerfeedback
├── format/        # zentrale Anzeigeformatierung für Datum und Zahlen
├── forms/         # Hook-Form-Adapter, Fehler- und Dirty-State-Workflow
├── lib/
│   └── cn.ts
├── remote-data/   # Query Keys, Cache-Lifecycle und Datenzustände
├── resource-detail/ # Detaillayouts, Aktionen und Ereignis-Timelines
└── ui/
    ├── Button.tsx
    ├── Card.tsx
    ├── CheckboxField.tsx
    ├── FormActions.tsx
    ├── FormErrorSummary.tsx
    ├── FormSection.tsx
    ├── FormSubmitButton.tsx
    ├── LinkButton.tsx
    ├── PageHeader.tsx
    ├── RadioGroupField.tsx
    ├── SelectField.tsx
    ├── TextAreaField.tsx
    └── TextField.tsx
```

Neue fachliche Seiten sollen diese Bausteine wiederverwenden. Einzeilige und mehrzeilige Texteingaben, Checkboxen, native Selects, Radio-Gruppen und Datei-Auswahl stellen sichtbare Beschriftungen, Beschreibungen, Fehlerzustände und ausreichend große Interaktionsflächen bereit. Unter `src/shared/forms` liegen schmale React-Hook-Form-Adapter, gemeinsame Zod-Validierung, Fehlerzusammenfassung und der Schutz vor dem Verlassen ungespeicherter Formulare. Der Vertrag ist unter `docs/form-workflow-and-unsaved-changes.md` dokumentiert. Lange Referenzlisten können über `SearchableSelectField` mit einer sichtbaren Suche gefiltert werden, während die eigentliche Auswahl ein zuverlässiges natives Select bleibt. Serverseitig paginierte Remote-Comboboxen werden nur ergänzt, wenn ein Fachbereich sie tatsächlich benötigt.

Globale Rückmeldungen werden über `useFeedback()` ausgelöst. Kritische Meldungen bleiben bis zum Schließen sichtbar; wiederholte Meldungen können dedupliziert werden. Folgenreiche Aktionen verwenden `useConfirmation()` statt `window.confirm()`. Typische Transportfehler werden über `getApiErrorPresentation()` beziehungsweise `useApiFeedback()` in sichere, lokalisierte Meldungen überführt. Der genaue Vertrag ist unter `docs/global-feedback-and-confirmation.md` dokumentiert.

Gemeinsame Remote-Data-Bausteine liegen unter `src/shared/remote-data`. Sie definieren Query-Key-Hierarchien, sichere Retry-Regeln, serverbestätigte Cache-Aktualisierung sowie zugängliche Lade-, Leer-, Refetch- und Fehlerzustände. Featuremodule bauen darauf auf, statt eigene Query-Lebenszyklen zu implementieren. Details stehen unter `docs/remote-data-query-and-lifecycle.md`.

Listenansichten verwenden die Grundlagen unter `src/shared/data-view`: URL-gesteuerte Suche, Filter, Sortierung und Pagination sowie eine semantische Tabelle mit gleichwertiger mobiler Kartenansicht. Zentrale Datum-/Zeit- und Zahlenformatierung liegt unter `src/shared/format`. Der Komponentenvertrag und die Barrierefreiheitsanforderungen sind unter `docs/data-view-foundation.md` beschrieben.

Detailseiten verwenden die Grundlagen unter `src/shared/resource-detail`: explizite Rücksprungziele, benannte Inhaltsabschnitte, semantische Metadaten, servergesteuerte Aktionsregistrierung, serverbestätigte Mutationsabläufe und erweiterbare Ereignis-Timelines. Unbekannte Backendaktionen werden nicht geraten, unbekannte Ereignisse erhalten eine sichere Fallbackdarstellung. Der Vertrag ist unter `docs/resource-detail-actions-and-event-timeline.md` dokumentiert.

Die Härtung von Cross-Tab-Sitzungen, API-Origins, Formular-IDs und CI ist unter `docs/core-hardening-and-verification.md` beschrieben. Formulare mit Controlled Fields verwenden `FormFieldScope`, damit parallele Formulare keine doppelten DOM-IDs erzeugen.

## API-Transport

Der gemeinsame Fetch-Mutator liegt unter `src/api/client`. Er verbindet relative OpenAPI-Pfade mit `VITE_API_BASE_URL`, verarbeitet JSON-, Text-, Blob- und leere Antworten und überführt Backendfehler in `ApiError`.

Orval verwendet diesen Mutator für alle später generierten Funktionen und TanStack-Query-Hooks. Die allgemeine Antwort- und Fehlerverarbeitung bleibt in einer auth-unabhängigen Transportfunktion gekapselt; der äußere Mutator ergänzt bei Bedarf die Sitzungsinformationen.

## Token-Speicherung

Der Client hält Access-Tokens ausschließlich im Arbeitsspeicher. Refresh-Tokens werden standardmäßig tablokal in `sessionStorage` gespeichert und nur bei einer expliziten „Angemeldet bleiben“-Entscheidung in `localStorage` abgelegt. Persistente Werte enthalten zusätzlich eine stabile Sitzungs-ID, damit andere Tabs eine normale Tokenrotation von einem tatsächlichen Kontowechsel unterscheiden können. Login, Logout und die React-Sitzungsintegration werden durch den Session-Core unter `src/auth` ergänzt.

## Authentifizierter API-Transport

Der Orval-Mutator ergänzt bei verwalteten API-Aufrufen automatisch den aktuellen Access-Token aus dem speicherunabhängigen `TokenStore`. Öffentliche oder bewusst fremdauthentifizierte Requests können mit `authentication: 'none'` von diesem Verhalten ausgenommen werden. Managed Authentication wird ausschließlich an den konfigurierten API-Origin gesendet und folgt keinen Redirects.

Antwortet ein verwalteter Request mit HTTP 401 und ist ein Refresh-Token vorhanden, koordiniert der Client genau eine Rotation pro Tab. Die Web-Locks-API serialisiert Rotationen zwischen Tabs. Browser ohne Web Locks verwenden eine erneuerte `localStorage`-Lease als Fallback. Nach erfolgreicher Rotation wird die ursprüngliche Anfrage genau einmal mit dem neuen Access-Token wiederholt.

Ein vom Backend abgelehnter Refresh-Token löscht die lokale Sitzung und veröffentlicht ein `session-expired`-Ereignis. Temporäre Netzwerkfehler löschen den gespeicherten Refresh-Token dagegen nicht. Die React-Sitzungsintegration und die sichtbaren Authentifizierungsseiten bauen auf diesem Verhalten auf.

## Auth-Sitzung

`src/auth/auth-session.ts` kapselt den browserseitigen Sitzungszustand unabhängig von React. Die Zustände `initializing`, `anonymous` und `authenticated` werden als unveränderliche Snapshots veröffentlicht und im `AuthProvider` über `useSyncExternalStore` bereitgestellt.

Der Session-Core übernimmt:

- Login über das OAuth2-Formular des FastAPI-Backends,
- optionale persistente Refresh-Token-Speicherung,
- Wiederherstellung einer vorhandenen Sitzung durch Tokenrotation und `/users/me`,
- Registrierung eines Bürgerkontos ohne automatische Behördenanmeldung,
- lokalen Logout auch bei nicht erreichbarem Backend,
- Aktualisierung der selbst verwalteten Profildaten,
- Logout aller Sitzungen mit verständlichem Teilfehler-Verhalten,
- Bereinigung des TanStack-Query-Caches beim Benutzerwechsel,
- Reaktion auf abgelehnte Refresh-Tokens und tabübergreifenden Logout,
- einmalige Rückmeldung zum Grund einer beendeten Sitzung.

Die geschützte Route `/account` bietet die Bearbeitung von Vor- und Nachname sowie die Abmeldung dieser oder aller Sitzungen. E-Mail-Adresse, Rolle und Behördenzuordnung bleiben entsprechend dem Backendvertrag schreibgeschützt. Details stehen unter `docs/account-session-management.md`.

Login, Registrierung, Passwort-Wiederherstellung und Rollenfreischaltung verwenden diesen Session-Core über den `AuthProvider`.

### API-Vertrag und Featuremodule

Orval erzeugt den typisierten Transportclient aus `openapi/openapi.json`; die generierten Dateien werden bewusst nicht manuell gepflegt. Konkrete Fachmodule registrieren ihre geschützten Routen und Navigation zentral über `src/app/features/index.ts`. Details zu Generierung, DTO-Mapping und Capabilities stehen in `docs/api-contract-and-feature-architecture.md`.

## Benutzerverzeichnis

Das Feature unter `src/features/users` registriert `/users` und `/users/:userId` über die Feature-Registry. Suche, rollenabhängige Filter, Sortierung und Pagination bleiben URL-gesteuert. Smartphones verwenden Benutzerkarten, Tablets ein zweispaltiges Kartenraster und Desktopansichten eine semantische Tabelle. Behörden-IDs werden über gemeinsame Office-Reference-Queries in lesbare Namen aufgelöst. Details stehen unter `docs/user-directory-and-profile-integration.md`.

## Benutzeradministration

Administratoren bearbeiten aktive Benutzerkonten über `/users/:userId/edit`. Der Workflow unterstützt Namen, Rolle, aktive Behördenzuordnung und einen verpflichtenden Änderungsgrund. Rollen- und Behördenregeln werden bereits im Formular abgebildet, bleiben aber serverseitig maßgeblich. Eine gemeinsame durchsuchbare Native-Select-Komponente erhält zuverlässige Tastatur-, Touch- und Screenreader-Funktionalität auf Smartphone, Tablet und Desktop. Details stehen unter `docs/user-administration-and-role-assignment.md`.

## Benutzer-Lebenszyklus und Audit-Historie

Administratoren können andere aktive Konten mit verpflichtendem Änderungsgrund deaktivieren. Die Oberfläche erläutert Anonymisierung, Sitzungswiderruf und mögliche Ticket- oder Terminkonflikte. `/users/:userId/history` zeigt die unveränderlichen Kontostände paginiert und mit timezone-bewussten Datumsfiltern als Desktop-Tabelle beziehungsweise responsive Karten. Details stehen unter `docs/user-lifecycle-and-audit-history.md`.

## Native Desktop-Verpackung (Tauri 2)

Zusätzlich zum Browser-Build kann dieselbe React/Vite-Anwendung als Tauri-2-Desktop-App
ausgeführt und gebündelt werden:

```bash
npm run native:dev
```

Für `npm run native:build` muss `VITE_API_BASE_URL` eine absolute `http(s)`-URL sein.
Einzelheiten zu Rust-/Systemvoraussetzungen, CSP und der Abgrenzung der späteren Android-
und Runtime-Patches stehen in [`docs/native-tauri-packaging.md`](docs/native-tauri-packaging.md).
