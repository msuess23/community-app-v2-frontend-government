# Globale Rückmeldungen und Bestätigungen

## Ziel des Patches

Der Patch ergänzt anwendungsweite Grundlagen für Rückmeldungen, sichere Bestätigungen und eine einheitliche Darstellung typischer API-Fehler. Fachmodule können diese Infrastruktur verwenden, ohne eigene Toast-, Dialog- oder HTTP-Fehlerlogik zu implementieren.

## Feedback-System

`FeedbackProvider` stellt über `useFeedback()` folgende Operationen bereit:

- `notify(...)` zeigt eine globale Meldung an,
- `dismiss(id)` entfernt eine bestimmte Meldung,
- `clear()` entfernt alle sichtbaren Meldungen.

Erfolgs- und Informationsmeldungen verschwinden standardmäßig nach sechs Sekunden. Warnungen und Fehler bleiben sichtbar, bis sie ausdrücklich geschlossen werden. Über `dedupeKey` können wiederholte Meldungen aus Refetch- oder Retry-Abläufen unterdrückt werden.

Die Meldungen werden semantisch bekannt gegeben:

- Fehler und Warnungen verwenden `role="alert"`,
- Erfolgs- und Informationsmeldungen verwenden `role="status"`,
- jede Meldung besitzt eine eindeutig beschriftete Schließen-Schaltfläche.

Bei einem Wechsel oder Ende der authentifizierten Sitzung werden sichtbare Meldungen gelöscht, damit Informationen eines Kontos nicht in eine andere Sitzung übernommen werden.

## API-Fehler

`getApiErrorPresentation(...)` übersetzt Transportfehler in sichere deutsche Titel und Beschreibungen. Der generische Mapper behandelt insbesondere:

- Netzwerkfehler,
- 400, 401, 403, 404, 409, 422 und 429,
- Serverfehler ab 500,
- die stabilen generischen Backendcodes für Authentifizierung, Validierung, Konflikte und Workflowfehler.

Unbekannte technische Backendmeldungen werden nicht direkt ausgegeben. Fachmodule können über `messagesByErrorCode` präzisere Übersetzungen für stabile Codes wie `APPOINTMENT_SLOT_NOT_AVAILABLE` bereitstellen. Feldfehler bleiben weiterhin Aufgabe des jeweiligen Formulars.

`useApiFeedback()` verbindet den Mapper mit dem globalen Feedback-System.

## Bestätigungsdialog

`ConfirmationProvider` stellt über `useConfirmation()` eine Promise-basierte API bereit:

```ts
const accepted = await confirm({
  title: 'Eintrag wirklich löschen?',
  description: 'Der Eintrag kann anschließend nicht wiederhergestellt werden.',
  confirmLabel: 'Eintrag löschen',
  tone: 'danger',
})
```

Mehrere gleichzeitige Anfragen werden nacheinander verarbeitet. Der Dialog:

- verwendet das native modale Dialogverhalten,
- fokussiert standardmäßig die sichere Abbrechen-Aktion,
- kann mit `Escape` geschlossen werden,
- stellt den Fokus nach der letzten Entscheidung wieder am ursprünglichen Auslöser her,
- verhindert eine doppelte Auflösung derselben Anfrage,
- löst offene Anfragen beim Entfernen des Providers sicher mit `false` auf.

Der Dialog führt keine Fachmutation selbst aus. Nach einer positiven Entscheidung startet das jeweilige Feature seine Mutation und verwaltet deren ausstehenden Zustand. Dadurch bleiben Bestätigung und serverseitiger Lebenszyklus sauber getrennt.

## Entwicklungs-UI-Kit

Das ausschließlich in Entwicklungsbuilds verfügbare UI-Kit enthält Beispiele für:

- eine automatisch verschwindende Erfolgsmeldung,
- einen destruktiven Bestätigungsdialog,
- die anschließende Rückmeldung über Bestätigung oder Abbruch.

## Lokale Prüfung

```bash
npm ci
npm run format:check
npm run lint
npm run test
npm run typecheck
npm run build
```
