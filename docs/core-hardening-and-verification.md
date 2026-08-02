# Core Hardening und Verifikation

## Ziel des Patches

Dieser Patch härtet den generischen Frontend-Kern vor den ersten fachlichen Modulen. Er schließt bekannte Risiken bei tabübergreifenden Sitzungen, authentifizierten Requests, parallelen Formularen und der reproduzierbaren Qualitätsprüfung.

## Tabübergreifende Sitzungen

Persistente Refresh-Sitzungen werden unter dem bestehenden Storage-Key als versionierte JSON-Hülle gespeichert. Neben dem Refresh-Token enthält die Hülle eine stabile `sessionId`.

Die Sitzungs-ID unterscheidet zwei Fälle:

- Eine Refresh-Rotation derselben Sitzung ändert nur den Token. Andere Tabs behalten ihren Benutzerzustand und verwenden beim nächsten erforderlichen Refresh den aktuellen gemeinsamen Token.
- Eine Anmeldung mit einem anderen Konto erzeugt eine neue Sitzungs-ID. Andere Tabs verwerfen daraufhin Access-Token, Benutzerprojektion und Query-Cache und lösen `/users/me` für die neue Sitzung erneut auf.

Alte Installationen mit einem unverpackten Refresh-Token bleiben lesbar. Für die Übergangsphase wird daraus nur ein stabiler Fingerabdruck als Sitzungs-ID gebildet; der alte Token wird nicht als Metadatum dupliziert. Bei der nächsten erfolgreichen Rotation wird der Wert automatisch in das neue Format überführt.

### Refresh-Lock-Fallback

Die Web-Locks-API bleibt die bevorzugte Koordination. Falls sie nicht verfügbar ist, verwendet der Client eine kurzlebige, erneuerte Lease in `localStorage`. Die Lease:

- serialisiert Refresh-Versuche zwischen Tabs,
- besitzt eine Ablaufzeit für abgestürzte Tabs,
- wird während eines laufenden Requests erneuert,
- wird nach Abschluss nur vom aktuellen Besitzer entfernt.

Nach dem Erwerb des Locks liest der Coordinator den persistenten Token erneut direkt aus dem Storage. Damit verwendet ein wartender Tab nicht versehentlich eine bereits verbrauchte Token-Generation. Hat ein anderer Tab währenddessen das Konto ersetzt, wird der ursprüngliche Request nicht unter dem neuen Konto wiederholt.

Wenn Browserrichtlinien den Storage vollständig blockieren, fällt der Client auf die bereits vorhandene tablokale Koordination zurück, statt die Sitzung unbenutzbar zu machen.

## Vertrauenswürdige API-Ziele

Managed Authentication ist ausschließlich für den Origin von `VITE_API_BASE_URL` zulässig. Relative API-Pfade gelten dabei als Ziele des Browser-Origins, sofern auch die Basis relativ konfiguriert ist.

Ein absoluter oder protokollrelativer Fremd-URL wird vor dem Request abgelehnt. Ein bewusst öffentlicher oder externer Abruf muss explizit `authentication: 'none'` setzen. Authentifizierte Requests verwenden außerdem `redirect: 'error'`, damit Credentials keinem Redirect zu einem anderen Ziel folgen.

Medien- und Dokumentfeatures sollen externe Download-URLs daher nicht ungeprüft über den authentifizierten Mutator abrufen.

## Eindeutige Formular-IDs

`FormFieldScope` erzeugt pro gerendertem Formular einen stabilen ID-Namensraum. Die React-Hook-Form-Adapter lösen ihre Feld-ID über diesen Scope auf. Fehlerzusammenfassungen speichern den fachlichen Feldnamen und erzeugen den tatsächlichen Link im selben Scope.

Damit bleiben Labels, `aria-describedby`, Fehlermeldungen und Fokuslinks korrekt, wenn beispielsweise eine Detailseite und ein Aktionsdialog gleichzeitig ein Feld `description` oder `changeReason` enthalten.

Jedes Formular mit gemeinsamen Controlled Fields und `FormErrorSummary` muss seine Inhalte in `FormFieldScope` einschließen.

## Toolchain und CI

Die unterstützte Laufzeit wird an drei Stellen festgeschrieben:

- `.nvmrc`
- `.node-version`
- `package.json` über `engines` und `packageManager`

Der Referenzstand ist Node.js 24.14.1 und npm 11.11.0.

`npm run verify:fast` führt OpenAPI-Validierung, ESLint, Prettier, Vitest, TypeScript und Produktionsbuild aus. `npm run verify` ergänzt anschließend die Playwright-Suite.

Der GitHub-Actions-Workflow installiert exakt die konfigurierte Node-Version, führt `npm ci` aus, installiert Chromium samt Systemabhängigkeiten und startet den vollständigen Verify-Lauf.

## E2E-Grundlage

Die Smoke-Suite unterscheidet nun korrekt zwischen öffentlichen und geschützten unbekannten Routen:

- anonym erfolgt die Weiterleitung zum Login mit `returnTo`,
- nach einer Anmeldung erscheint die geschützte 404-Seite.

Ein gemeinsamer Playwright-Helper meldet einen Behördennutzer über das reale Loginformular an und mockt nur die dazu erforderlichen Backendantworten. Damit können folgende Feature-Patches geschützte Routing-, Responsive- und Axe-Prüfungen auf derselben Grundlage ergänzen.

## Lokale Prüfung

```bash
nvm use
npm ci
npm run verify
```

Für einen schnelleren Lauf ohne Browserprüfung:

```bash
npm run verify:fast
```
