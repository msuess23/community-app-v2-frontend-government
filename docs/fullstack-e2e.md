# Full-Stack-E2E-Tests

Die normale Playwright-Suite unter `tests/e2e` arbeitet absichtlich mit kontrollierten API-Fixtures. Die zusätzliche Suite unter `tests/fullstack` verfolgt einen anderen Zweck: Sie verbindet den echten Behörden-Client mit einem real gestarteten, frisch migrierten und vollständig geseedeten Backend samt PostgreSQL und Dateispeicher.

## Voraussetzungen

Vor dem Lauf muss das Backend vollständig verfügbar sein. Die Suite verändert Seed-Daten dauerhaft und setzt deshalb eine entbehrliche Entwicklungs-/Testdatenbank voraus. Der vorgesehene Ablauf ist:

1. Datenbankcontainer frisch erstellen.
2. `alembic upgrade head` ausführen.
3. `python -m scripts.seed.run_seed` mit dem gewünschten `SEED_DEFAULT_PASSWORD` ausführen.
4. Backend auf `http://localhost:8000` starten.
5. Sicherstellen, dass der Frontend-Port `5173` frei ist; Playwright startet den Vite-Server für diesen Lauf selbst.
6. Im Frontend `npm run test:fullstack` starten.

Die Standardwerte entsprechen der lokalen Backend-Dokumentation:

```bash
FULLSTACK_API_BASE_URL=http://localhost:8000/api/v1
FULLSTACK_SEED_PASSWORD='ChangeThisDemoPassword123!'
npm run test:fullstack
```

Wurde beim Seeding ein anderes Passwort verwendet, muss `FULLSTACK_SEED_PASSWORD` auf denselben Wert gesetzt werden. Verwendet das Backend einen anderen Origin oder Port, kann `FULLSTACK_API_BASE_URL` überschrieben werden. Der Backend-CORS-Vertrag muss `http://localhost:5173` beziehungsweise einen über `FULLSTACK_FRONTEND_BASE_URL` gewählten Frontend-Origin erlauben.

## Teststrategie

Die Full-Stack-Suite läuft absichtlich mit genau einem Worker und nur einem Desktop-Chromium-Projekt. Die Datenbank wird während des Master-Szenarios verändert; parallele oder dreifach nach Geräteprofil ausgeführte Kopien würden dieselben Seed-Vorgänge konkurrierend bearbeiten. Responsive Layout und Geräteklassen bleiben Aufgabe der schnelleren Mock-E2E-Suite.

Die Suite installiert keine `page.route()`-Mocks. Sämtliche fachlichen Browseraktionen nutzen echte HTTP-Aufrufe, echte JWT-Access-Tokens, echte rotierende Refresh-Tokens und die realen Backendberechtigungen.

### Authentifizierung und Refresh

`auth-refresh.spec.ts` meldet den Seed-Administrator über die Login-Oberfläche mit aktivierter Option „Angemeldet bleiben“ an. Der Access-Token lebt ausschließlich im Speicher der Anwendung, während der Refresh-Token persistent im Browser-Storage liegt. Ein vollständiges Reload verwirft daher den Access-Token und zwingt den `AuthProvider`, die Sitzung über `/auth/refresh` wiederherzustellen. Der Test prüft die echte Refresh-Antwort, die Rotation des gespeicherten Refresh-Tokens, die unveränderte logische Session-ID und den Erhalt der persistenten Speicherung.

### Master-Szenario

`master-workflow.spec.ts` kombiniert bewusst mehrere fachliche Bereiche und Browser-Sessions:

- drei Bürgerkonten werden real registriert,
- ein zukünftiger Officer meldet sich zunächst als Citizen an und wird korrekt auf den noch nicht freigeschalteten Behördenzugang begrenzt,
- ein Seed-Administrator legt eine Behörde an und befördert die Konten zu Manager/Officers,
- die bereits laufende Citizen-Sitzung übernimmt die neue Officer-Rolle erst nach einer echten erneuten Profilprüfung,
- der Seed-Dispatcher weist ein neues Seed-Ticket der neuen Behörde zu,
- der neue Manager weist einen primären Officer zu,
- die aktuelle Bearbeitung wird zwischen zwei Officers hin- und zurückgeleitet, ohne die primäre Zuständigkeit zu ändern,
- der primäre Officer fordert anschließend eine Mitzeichnung beim zweiten Officer an,
- der zweite Officer zeichnet mit,
- der primäre Officer eskaliert an den Manager,
- der Manager genehmigt die Eskalation,
- der Officer ergänzt eine interne Notiz und schließt das Ticket ab,
- die Ereignishistorie wird über die echte Projektion/Event-API geprüft,
- nicht beteiligte sowie fremdbehördliche Officers und Manager erhalten keinen internen Ticketzugriff; der Test erwartet dabei auch den echten `404`-Status des internen Detailendpunkts,
- ein Officer erstellt eine Info mit echtem PNG-Upload, veröffentlicht den Status, bearbeitet und löscht sie,
- ein fremdbehördlicher Officer darf dieselbe Info nicht bearbeiten,
- ein Seed-Officer verschiebt ein geseedetes Appointment auf einen tatsächlich freien Slot, lädt ein echtes PDF hoch und lädt dieselbe Datei anschließend über den authentifizierten Binärendpunkt wieder herunter,
- Dispatcher und Officer werden zusätzlich an capability-geschützten Direktrouten geprüft.

Der Test ist damit bewusst kein isolierter Happy Path. Er überprüft insbesondere jene Rollen- und Objektgrenzen, an denen ein gespeicherter Zustand aus einem Browser erst die zulässige Folgebearbeitung in einem anderen Browser eröffnet.

## Ausführung und Fehlersuche

Die Full-Stack-Suite setzt einen frisch geseedeten Stand voraus. Insbesondere `[Demo] Schlagloch am Rathausplatz` muss noch im initialen Routingzustand liegen. Nach einem fehlgeschlagenen oder erfolgreichen Master-Lauf sollte die Datenbank deshalb vor einem erneuten Lauf zurückgesetzt und erneut geseedet werden.

Für interaktive Fehlersuche steht zusätzlich zur Verfügung:

```bash
npm run test:fullstack:ui
```

Fehlgeschlagene Läufe behalten Trace und Video bei. Dadurch lassen sich sowohl Browserzustand als auch reale Netzwerkrequests und Cross-Account-Übergänge nachvollziehen.
