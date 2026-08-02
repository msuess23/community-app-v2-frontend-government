# Remote Data Query und Lifecycle

## Ziel des Patches

Der Patch vervollständigt die fachlich unabhängige Datenschicht für spätere Ticket-, Termin-, Info- und Administrationsfeatures. Er definiert sichere TanStack-Query-Standards, reproduzierbare Query Keys, serverbestätigte Cache-Aktualisierung, gemeinsame Lade- und Fehlerzustände, Request-Abbruch sowie eine MSW-Testgrundlage.

Es werden noch keine fachlichen API-Hooks oder Seiten eingeführt.

## Query-Client

`createQueryClient()` verwendet anwendungsweite Defaults:

- Daten gelten 30 Sekunden als aktuell,
- nicht mehr beobachtete Cache-Einträge werden nach fünf Minuten entfernt,
- ein erneuter Verbindungsaufbau aktualisiert aktive Queries,
- ein Fensterfokus löst nicht automatisch weitere Requests aus,
- Mutationen werden niemals automatisch wiederholt.

Read-Requests werden höchstens einmal wiederholt und nur bei:

- normalisierten Netzwerkfehlern,
- HTTP 408,
- HTTP 500, 502, 503 oder 504.

Clientfehler, fehlende Berechtigungen, Konflikte, Validierungsfehler, Rate Limits, unbekannte Programmfehler und abgebrochene Requests werden nicht automatisch wiederholt. Dadurch werden insbesondere 401-, 409- und 422-Antworten nicht verschleiert oder unnötig vervielfacht.

## Query Keys

`createResourceQueryKeys()` erzeugt pro Feature eine gemeinsame Hierarchie:

```ts
const ticketKeys = createResourceQueryKeys<TicketListParameters>('tickets')

ticketKeys.all
ticketKeys.lists()
ticketKeys.list({ page: 1, status: 'OPEN' })
ticketKeys.details()
ticketKeys.detail(ticketId)
ticketKeys.related(ticketId, 'events', { page: 1 })
```

`undefined`-Filter werden entfernt, damit ein ausgelassener Parameter und ein explizit `undefined` gesetzter Parameter dieselbe Cache-Adresse verwenden. Listen-, Detail- und Eventpräfixe können gezielt invalidiert werden, ohne den gesamten Anwendungscache zu leeren.

Featuremodule sollen ihre Key Factory in der jeweiligen Feature-API-Schicht einmalig exportieren und keine freien Query-Key-Arrays über Komponenten verteilen.

## Mutation und Cache

`commitMutationResult()` übernimmt ausschließlich eine bereits bestätigte Serverantwort:

1. Eine ältere Detailanfrage wird abgebrochen.
2. Die Serverantwort wird direkt als aktuelles Detail gesetzt.
3. Listen, Eventstreams und weitere Projektionen werden gezielt invalidiert.

Damit wird der Backendzustand nicht clientseitig vorweggenommen. Das ist besonders für den Ad-hoc-Workflow und die eventgesourcten Ticket- und Terminprojektionen wichtig.

`refreshQueryKeys()` ist für Konflikte und externe Änderungen vorgesehen. Es bricht veraltete Requests ab und invalidiert anschließend die betroffenen Projektionen. Ein HTTP-409-Handler kann damit Detail, verfügbare Aktionen und Eventstream neu laden.

## Gemeinsame Query-Zustände

`RemoteDataBoundary` trennt folgende Zustände:

- initiales Laden ohne Daten,
- blockierender Fehler ohne Daten,
- erfolgreicher leerer Zustand,
- geladene Inhalte,
- Aktualisierung im Hintergrund,
- fehlgeschlagene Hintergrundaktualisierung bei weiterhin sichtbaren Altdaten.

Bestehende Daten werden bei einem Refetch nicht durch einen Vollbild-Ladezustand ersetzt. Fehlertexte verwenden den sicheren API-Fehlermapper und geben technische Backenddetails nicht ungefiltert aus. Lade-, Fehler- und Aktualisierungszustände werden über geeignete `status`- beziehungsweise `alert`-Semantik bekannt gegeben.

Der kommende Patch **Data View Foundation** baut Tabellen, responsive Karten, Filter und Pagination auf diesen Zuständen auf.

## Request-Abbruch

Der gemeinsame Fetch-Transport reicht `AbortSignal` bereits an `fetch` weiter. Abbruchfehler bleiben unverändert erhalten und werden weder als Netzwerkfehler normalisiert noch durch die Query-Retry-Regel wiederholt. Wird eine Query während einer Access-Token-Aktualisierung beendet, überspringt der Auth-Mutator den anschließenden Wiederholungsrequest. Generierte Query-Funktionen müssen das von TanStack Query gelieferte Signal an den Orval-Mutator übergeben.

## OpenAPI und Orval

`openapi/openapi.json` ist ein versionierter Snapshot des hochgeladenen Backends. Dadurch kann `npm run api:generate` ohne laufenden Backendprozess reproduzierbar aus demselben Vertrag arbeiten.

Verfügbare Befehle:

```bash
npm run api:validate  # prüft Struktur und Lesbarkeit des Snapshots
npm run api:generate  # validiert und erzeugt den Orval-Client
npm run api:pull      # aktualisiert den Snapshot von OPENAPI_URL
npm run api:sync      # aktualisiert Snapshot und generierten Client
```

Der Standard für `OPENAPI_URL` ist `http://localhost:8000/api/v1/openapi.json`. Änderungen am Snapshot und am generierten Client sollen gemeinsam geprüft werden. Dateien unter `src/api/generated` werden nicht manuell bearbeitet.

Die generierten Endpunkte werden erst mit den jeweiligen Feature-Patches importiert. Der vorliegende Patch führt daher noch keine fachlichen Queries in den Anwendungsbundle ein.

## MSW-Testgrundlage

`src/test/server.ts` stellt einen gemeinsamen MSW-Server bereit. Das globale Test-Setup:

- startet den Server vor der Testsuite,
- behandelt unbeabsichtigte echte Requests als Fehler,
- entfernt testspezifische Handler nach jedem Test,
- schließt den Server am Ende der Testsuite.

`mockApiError()` erzeugt das stabile Fehlerformat des Backends. Spätere Featuretests können damit Erfolgs-, Lade-, Konflikt-, Validierungs- und Serverfehlerszenarien ohne eigene Transport-Mocks abbilden.

## Lokale Prüfung

```bash
npm ci
npm run api:validate
npm run format:check
npm run lint
npm run test
npm run typecheck
npm run build
```
