# Community-App – Behördenclient

Responsiver React-Client für die Behördenfunktionen des Community-App-Backends.

## Voraussetzungen

- Node.js 22.22.x (siehe `.nvmrc` und `.node-version`)
- npm 10.9.x
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

`verify:fast` führt OpenAPI-Validierung, ESLint, Prettier, Vitest, TypeScript und den Produktionsbuild aus. `verify` ergänzt die Playwright-Tests für Desktop, Tablet und Smartphone. Der CI-Workflow verwendet den vollständigen Lauf.

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
├── pages/     # seitenbezogene Komponenten
├── shared/    # fachlich unabhängige Layout-, Daten- und UI-Bausteine
└── test/      # gemeinsame Testhelfer, MSW-Server und Test-Setup
```

Fachliche Features und die dazugehörige API-Kommunikation werden in getrennten Patches ergänzt.

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

Neue fachliche Seiten sollen diese Bausteine wiederverwenden. Einzeilige und mehrzeilige Texteingaben, Checkboxen, native Selects, Radio-Gruppen und Datei-Auswahl stellen sichtbare Beschriftungen, Beschreibungen, Fehlerzustände und ausreichend große Interaktionsflächen bereit. Unter `src/shared/forms` liegen schmale React-Hook-Form-Adapter, gemeinsame Zod-Validierung, Fehlerzusammenfassung und der Schutz vor dem Verlassen ungespeicherter Formulare. Der Vertrag ist unter `docs/form-workflow-and-unsaved-changes.md` dokumentiert. Entfernte Suchauswahlen werden erst mit einem konkreten Feature als zugängliche Remote-Combobox ergänzt.

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
