# App-Shell und Hauptnavigation

## Ziel des Patches

Der Patch trennt öffentliche Authentifizierungsseiten vom geschützten Behördenbereich und stellt den ersten wiederverwendbaren Anwendungskern bereit. Fachmodule wie Tickets, Termine, Informationen oder Administration werden noch nicht angelegt.

## Layouts

- `RootLayout` enthält den globalen Skip-Link sowie Titel- und Fokussteuerung bei Routenwechseln.
- `PublicLayout` rahmt Anmeldung, Registrierung, Passwort-Wiederherstellung und den Status einer noch nicht freigeschalteten Registrierung.
- `AppShellLayout` enthält die responsive Hauptnavigation und das Kontomenü für berechtigte Behördenrollen.

Die Hauptnavigation ist auf kleinen Viewports ein- und ausklappbar. Sie bleibt per Tastatur bedienbar, kann mit `Escape` geschlossen werden und markiert den aktiven Eintrag semantisch. Auf Desktop-Viewports stehen App-Name, mittig ausgerichtete Hauptnavigation und Kontomenü in einer gemeinsamen Kopfzeile. Der Inhaltscontainer nutzt bis zu 100rem, damit breite Tabellen und Formulare auch auf 2K-Displays sinnvoll Platz erhalten, ohne auf 1080p-Displays randlos zu wirken.

## Rollenfreischaltung

Die öffentliche Registrierung erzeugt weiterhin ein `CITIZEN`-Konto. Ein angemeldetes Bürgerkonto wird nicht als allgemeiner 403-Fehler behandelt, sondern nach `/access-pending` geführt.

Dort kann die Person:

- den aktuellen Rollenstatus erneut über `/users/me` laden,
- nach einer administrativen Rollenänderung unmittelbar in den Behördenclient wechseln,
- oder die Sitzung beenden und ein anderes Konto verwenden.

## Capability-Grundlage

Routen und Navigation verwenden die benannte Capability `accessAuthorityClient` statt direkter Rollenabfragen. Weitere fachliche Capabilities werden erst mit den jeweiligen Modulen ergänzt.

## UI-Kit

`/ui-kit` bleibt ausschließlich in Entwicklungsbuilds erreichbar und wird dynamisch geladen. Die reguläre Anwendung verlinkt nicht mehr auf diese Route.

## Barrierefreiheit

Der Patch ergänzt:

- einen globalen Skip-Link,
- fokussierbare Hauptüberschriften,
- Fokuswechsel auf die neue Überschrift nach einer Navigation, wobei nicht interaktive Überschriften keinen irreführenden Browser-Standardrahmen erhalten,
- dokumentbezogene Seitentitel,
- eine semantische Hauptnavigation mit `aria-current`,
- ausreichend große Bedienelemente und sichtbare Fokusdarstellung,
- einen zugänglichen Sitzungs-Ladezustand.

## Lokale Prüfung

```bash
npm ci
npm run format:check
npm run lint
npm run test
npm run typecheck
npm run build
```
## Info navigation

The authenticated authority shell registers `Mitteilungen` through the Info feature module. Its read routes require `viewInfos`, which is granted to dispatcher, officer, manager, and administrator roles. Public and citizen-facing Info routes are intentionally excluded from this React client.
