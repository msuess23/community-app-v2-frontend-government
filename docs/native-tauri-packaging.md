# Native Verpackung mit Tauri 2

Der Behördenclient bleibt eine React/Vite-SPA. Tauri stellt dieselben gebauten Web-Assets in
einer nativen System-WebView bereit; eine zweite UI oder plattformspezifische Fachlogik ist
nicht erforderlich. Die Desktop-Grundlage wird um zwei gezielte Runtime-Integrationen ergänzt:
PDF-Downloads verwenden im nativen Client einen System-Speicherdialog und Dirty-Formulare
schützen zusätzlich das Schließen des nativen Desktopfensters. Android-Projektdateien folgen
weiterhin in einem separaten Patch.

## Voraussetzungen

Neben den bestehenden Node-/npm-Anforderungen werden Rust sowie die plattformspezifischen
Tauri-Systemabhängigkeiten benötigt. Nach dem Checkout installiert `npm ci` auch die lokale
Tauri-CLI. Die Rust-Abhängigkeiten werden beim ersten nativen Build über Cargo aufgelöst; die
dabei erzeugte `src-tauri/Cargo.lock` sollte anschließend mit dem Projekt versioniert werden.

## Entwicklung

Backend wie gewohnt auf Port 8000 starten und anschließend:

```bash
npm run native:dev
```

Der Development-Build verwendet weiterhin `VITE_API_BASE_URL=/api/v1`. Die Anfrage läuft
damit über den vorhandenen Vite-Proxy zum Backend; Browser- und Tauri-Entwicklung verwenden
dieselbe API-Konfiguration.

## Native Release-Builds

Ein gebündelter Tauri-Client besitzt keinen Vite-Proxy. Für einen Release-Build muss daher eine
absolute Backend-URL konfiguriert werden, zum Beispiel in `.env.production.local`:

```dotenv
VITE_API_BASE_URL="https://api.example.com/api/v1"
```

Danach:

```bash
npm run native:build
```

`scripts/run-tauri.mjs` lehnt relative API-URLs für Release-Builds ab und erzeugt pro Lauf eine
nicht versionierte Tauri-Konfiguration. Die Content Security Policy erlaubt Netzwerk- und
Bildzugriffe nur auf den konfigurierten API-Origin; im Development-Modus kommen lediglich die
für Vite/HMR benötigten lokalen Verbindungen hinzu.

Das Backend muss die Tauri-WebView-Origin zusätzlich per CORS erlauben. Dafür ist der
zugehörige Backend-Tauri-Patch vorgesehen. Bei produktiven Builds sollten sowohl Frontend als
auch Backend ausschließlich über HTTPS angebunden werden.

## Persistente Anmeldung

`useHttpsScheme` bleibt bewusst auf dem Tauri-Standard `false`. Damit bleibt die Produktions-Origin
auf Windows/Android stabil bei `http://tauri.localhost`; ein späterer Wechsel dieses Schalters
würde den WebView-Speicherort für LocalStorage und damit die persistierten Refresh-Sessions ändern.

## Native Dateiablage

Appointment-PDFs verwenden weiterhin denselben authentifizierten HTTP-Download. Erst nachdem
der Blob vollständig aus dem Backend geladen wurde, verzweigt die Laufzeit:

- im Browser bleibt der bestehende Download über einen temporären Object-URL-Link erhalten,
- in Tauri öffnet `@tauri-apps/plugin-dialog` den System-Speicherdialog und
  `@tauri-apps/plugin-fs` schreibt die Bytes an das ausgewählte Ziel.

Die Capability erlaubt ausschließlich den Save-Dialog und `writeFile`. Der Dialog fügt den vom
Benutzer ausgewählten Zielpfad temporär zum Filesystem-Scope hinzu; ein allgemeiner Zugriff auf
Benutzerverzeichnisse wird deshalb nicht freigeschaltet. Abbrechen des Speicherdialogs ist ein
normaler Benutzerpfad und wird nicht als Downloadfehler behandelt.

## Ungespeicherte Änderungen beim nativen Fensterschließen

Der vorhandene Unsaved-Changes-Guard schützt weiterhin React-Router-Navigationen und
`beforeunload`. In Tauri registriert derselbe Guard zusätzlich `onCloseRequested` für das
Hauptfenster. Ist ein Formular dirty, wird der erste native Close sofort verhindert und die
bereits vorhandene React-Bestätigung angezeigt. Nach bestätigtem Verwerfen wird das Fenster
anschließend gezielt beendet. Dafür wird kein zweiter Close-Request erzeugt; der Guard kann daher
weder rekursiv erneut ausgelöst werden noch mit dem Browser-`beforeunload`-Schutz konkurrieren.
Dadurch bleibt dieselbe Bedienoberfläche für Browser- und Desktop-Navigation erhalten.

## Abgrenzung dieses Patches

Noch nicht enthalten sind Android-Projektgenerierung und APK/AAB-Builds. Diese bleiben im
folgenden Packaging-Patch getrennt, damit Desktop-Runtime, Dateispeicherung und Fensterverhalten
zunächst unabhängig verifiziert werden können.
