# Data View Foundation

## Ziel des Patches

Der Patch ergänzt die fachlich unabhängigen Grundlagen für serverseitig geladene Listen. Ticket-, Termin-, Info- und Administrationsfeatures können damit Suche, Filter, Sortierung, responsive Darstellung und Pagination konsistent umsetzen, ohne eigene Varianten dieser Querschnittsfunktionen aufzubauen.

Es werden noch keine fachlichen Listenrouten oder Backend-Endpunkte eingebunden.

## URL-gesteuerter Ansichtsstand

`useDataViewUrlState()` hält den Zustand einer Listenansicht in den Search-Parametern der Route. Unterstützt werden:

- `page` für die aktuelle Seite,
- `size` für die Seitengröße,
- `search` für den Suchbegriff,
- `sortBy` und `sortDirection` für die Sortierung,
- featurebezogene einfache oder mehrwertige Filter.

Nicht gesetzte Standardwerte werden nicht in die URL geschrieben. Dadurch bleiben Links kurz, während abweichende Ansichten teilbar und über Vor-/Zurück-Navigation wiederherstellbar sind. Unbekannte Seitengrößen, Sortierfelder, Sortierrichtungen und ungültige Seitenzahlen werden auf konfigurierte Standardwerte normalisiert.

Suche, Filter, Sortierung und Seitengröße setzen die Seite automatisch auf 1 zurück. Ein direkter Seitenwechsel verändert die übrigen Parameter nicht. Search-Parameter, die der Datenansicht nicht gehören, bleiben erhalten.

Featuremodule sollen ihre Konfiguration außerhalb der React-Komponente oder über `useMemo()` stabil halten. Beispiel:

```ts
const ticketListUrlConfig = {
  defaultPageSize: 20,
  defaultSort: { direction: 'desc', field: 'updatedAt' },
  filters: [
    { key: 'status', multiple: true },
    { key: 'officeId' },
  ],
  pageSizeOptions: [10, 20, 50],
  sortFields: ['createdAt', 'title', 'updatedAt'],
} as const
```

## Suche und Filter

`DataViewSearchField` bietet:

- eine sichtbare Beschriftung,
- einen konfigurierbaren Debounce,
- sofortige Ausführung beim Absenden,
- eine zugängliche Löschaktion,
- Fokuswiederherstellung nach dem Löschen.

`DataViewFilterPanel` zeigt Filter auf breiten Viewports dauerhaft und auf kleinen Viewports in einem ein- und ausklappbaren Bereich. `Escape` schließt den kompakten Bereich und setzt den Fokus auf den Auslöser zurück.

`DataViewFilterSelect` ist ein schmaler nativer Select für Listenfilter. Allgemeine Formular-Selects und React-Hook-Form-Adapter folgen im Patch „Form Workflow & Unsaved Changes“.

`ActiveDataViewFilters` stellt aktive Auswahlwerte als einzeln entfernbare Chips dar. Der sichtbare Text muss den Filterinhalt vollständig erklären; Farbe allein darf keine Bedeutung tragen.

`DataViewSortControl` macht dieselbe Sortierung zugänglich, wenn die Tabellenkopfzeile in der mobilen Kartenansicht nicht sichtbar ist.

## Responsive Datendarstellung

`ResponsiveDataView` rendert denselben Datensatz in zwei semantischen Darstellungen:

- ab `md` als HTML-Tabelle,
- auf kleinen Viewports als Kartenliste.

Mindestens eine Spalte muss als `isRowHeader` markiert werden. Fehlt die Markierung, wird die erste Spalte verwendet. Sortierbare Tabellenköpfe setzen `aria-sort` und beschreiben die jeweils nächste Sortierrichtung. Aktionsspalten werden in mobilen Karten als benannte Aktionsgruppe ausgegeben.

Die Renderfunktionen der Spalten werden sowohl für die Desktop- als auch für die mobile Darstellung aufgerufen. Sie müssen daher rein sein und dürfen keine global eindeutigen DOM-IDs erzeugen. Interaktive Elemente benötigen in beiden Darstellungen einen eindeutigen zugänglichen Namen, der die betroffene Ressource nennt.

Ein bloßer horizontaler Scrollcontainer ist nicht die mobile Hauptdarstellung. Die Karten enthalten dieselben fachlichen Informationen und Aktionen wie die Tabelle.

## Pagination

`DataViewPagination` zeigt:

- den sichtbaren Ergebnisbereich,
- die Gesamtanzahl,
- die Seitengröße,
- Vor-/Zurück-Aktionen,
- eine kompakte Seitenzahlenauswahl,
- auf kleinen Viewports die aktuelle Seite und Gesamtseitenzahl.

Die Seite wird für die Darstellung auf den gültigen Bereich begrenzt. Nach einer Mutation, die den letzten Eintrag einer Seite entfernt, soll das Feature die vorherige Seite über den URL-State setzen und die betroffene Liste erneut laden.

## Datenzustände

Listen kombinieren die neuen Komponenten mit `RemoteDataBoundary` aus dem vorherigen Patch:

1. Query mit URL-Parametern ausführen.
2. Initiales Laden, Fehler und leere Ergebnisse über `RemoteDataBoundary` darstellen.
3. Erfolgreiche Daten über `ResponsiveDataView` anzeigen.
4. `DataViewPagination` aus `page`, `size` und `total` aufbauen.
5. Hintergrundaktualisierungen lassen die aktuelle Liste sichtbar.

## Status und Formatierung

`DataViewStatusBadge` bietet neutrale, informative, erfolgreiche, warnende und fehlerbezogene Varianten. Der Text des Badges muss den Status immer selbst benennen.

Die Formatter unter `src/shared/format/display-values.ts` verwenden `de-DE` und standardmäßig `Europe/Berlin`. Zeitstempel des Backends werden als absolute Zeitpunkte geparst und erst bei der Anzeige in die Behördenzeitzone umgerechnet. Ungültige oder fehlende Werte erscheinen als neutraler Gedankenstrich.

## Barrierefreiheit

Featurelisten müssen zusätzlich beachten:

- Tabellen benötigen eine konkrete Caption.
- Die fachliche Hauptspalte wird als Zeilenüberschrift ausgegeben.
- Such- und Filterfelder besitzen sichtbare Labels.
- Sortierung ist sowohl in Tabelle als auch Kartenansicht erreichbar.
- Seitennavigation besitzt einen fachlich verständlichen Namen.
- Touch-Ziele bleiben mindestens 44 Pixel hoch.
- Filter und Aktionen funktionieren vollständig per Tastatur.
- Leere und fehlerhafte Zustände enthalten verständliche nächste Schritte.
- Informationen werden nicht ausschließlich durch Farbe, Position oder Hover vermittelt.

## Bewusste Abgrenzung

Nicht Bestandteil dieses Patches sind:

- konkrete Ticket-, Termin-, Info-, Benutzer- oder Behördenlisten,
- fachliche Filterdefinitionen und Enum-Übersetzungen,
- Auswahlfelder für Bearbeitungsformulare,
- Bulk-Aktionen,
- virtuelle Tabellen oder unendliches Scrollen,
- Feature-spezifische CSV- oder Exportfunktionen.
