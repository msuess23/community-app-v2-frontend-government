# Konto- und Sitzungsverwaltung

## Ziel des Patches

Der Patch ergänzt die erste geschützte Selbstbedienungsseite für Behördenkonten. Sie verwendet ausschließlich Funktionen, die das Backend bereits für das angemeldete Konto anbietet, und trennt bearbeitbare Profildaten von administrativ verwalteten Kontometadaten.

## Kontoseite

Die Route `/account` ist über das Kontomenü des App-Shells erreichbar. Sie steht allen Rollen mit Zugang zum Behördenclient zur Verfügung.

Selbst änderbar sind:

- Vorname,
- Nachname.

Das Formular verwendet `PATCH /users/me`, übernimmt die Serverantwort in den zentralen Auth-Snapshot und aktualisiert dadurch das Kontomenü unmittelbar. Feldfehler des Backends werden den passenden Eingaben zugeordnet; übrige Fehler erscheinen in der Formularzusammenfassung.

Nur lesbar sind:

- E-Mail-Adresse,
- aktuelle Rolle,
- zugeordnete Behörden-ID.

Diese Werte dürfen nach dem aktuellen Backendvertrag nur durch administrative Abläufe geändert werden. Solange die Behördenverwaltung noch nicht implementiert ist, zeigt die Kontoseite die vorhandene ID statt eines erfundenen Behördennamens.

## Sitzungsaktionen

Die Kontoseite bietet zwei getrennte Aktionen:

- **Diese Sitzung abmelden** beendet die lokal verwendete Refresh-Sitzung und versucht anschließend den einzelnen Refresh-Token serverseitig zu widerrufen.
- **Alle Sitzungen beenden** verlangt eine destruktive Bestätigung und ruft `POST /auth/logout-all` auf.

Das Backend stellt keine Liste einzelner Geräte oder Refresh-Sitzungen bereit. Der Client zeigt daher bewusst keine vermeintliche Geräteverwaltung an.

Falls `logout-all` nicht erreichbar ist, wird die lokale Sitzung trotzdem sicher beendet. Eine persistente Warnung erklärt, dass andere Sitzungen möglicherweise aktiv geblieben sind. Bei erfolgreichem Widerruf bestätigt eine globale Erfolgsmeldung das Ende aller Sitzungen.

## Ablaufende Sitzung

Ein serverseitig abgelehnter Refresh wird vor dem Löschen des Token-Stores als Sitzungsendegrund veröffentlicht. `AuthSession` bewahrt diesen Grund bis zur einmaligen Auswertung durch den `AuthProvider` auf.

Dadurch kann die Anwendung:

- den Query-Cache und die lokale Sitzung bereinigen,
- eine persistente Meldung „Sitzung abgelaufen“ anzeigen,
- über `RequireAuth` zur Anmeldung wechseln,
- das ursprünglich angeforderte interne Ziel als `returnTo` erhalten.

Nach erfolgreicher erneuter Anmeldung kann die Person damit direkt an die vorherige Stelle zurückkehren.

## Formulargrundlage

Die bisher in `auth-form.ts` eingebettete Zuordnung von Backend-Feldfehlern wurde nach `src/shared/forms/apply-submission-error.ts` verschoben. Login, Registrierung und Kontoprofil verwenden damit denselben sicheren Mechanismus, ohne fachliche Formularlogik miteinander zu koppeln.

Ein allgemeiner Schutz vor ungespeicherten Änderungen ist noch nicht Teil dieses Patches. Er wird mit der vorgesehenen Grundlage **Form Workflow & Unsaved Changes** ergänzt.

## Barrierefreiheit und Responsivität

- Die Seite verwendet eine klare Überschriftenhierarchie und semantische Abschnitte.
- Unveränderliche Kontodaten werden als Description List ausgegeben.
- Alle Aktionen besitzen sichtbare Texte und ausreichend große Interaktionsflächen.
- Die Profilfelder stehen auf kleinen Displays untereinander und ab mittleren Viewports nebeneinander.
- Sitzungsaktionen werden responsiv als Karten angeordnet.
- Die folgenreiche globale Abmeldung verwendet den zentralen, tastaturbedienbaren Bestätigungsdialog.
- Session-Endmeldungen werden über die bereits vorhandenen barrierefreien Live-Regionen bekannt gegeben.

## Lokale Prüfung

```bash
npm ci
npm run format:check
npm run lint
npm run test
npm run typecheck
npm run build
```
