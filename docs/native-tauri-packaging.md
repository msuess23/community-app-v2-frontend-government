# Native Verpackung mit Tauri 2

Der Behördenclient bleibt eine React/Vite-SPA. Tauri stellt dieselben gebauten Web-Assets in
einer nativen System-WebView bereit; eine zweite UI oder plattformspezifische Fachlogik ist
nicht erforderlich. Dieser Stand bildet zunächst die Desktop-Grundlage. Android-spezifische
Projektdateien und native Datei-/Fensterintegrationen folgen in separaten Patches.

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

## Abgrenzung dieses Patches

Noch nicht enthalten sind:

- Android-Projektgenerierung und APK/AAB-Builds,
- nativer Save-Dialog für Appointment-PDFs,
- Tauri-spezifischer Unsaved-Changes-Guard beim Schließen eines Desktopfensters.

Diese Punkte bleiben bewusst getrennt, damit zunächst React-Build, API-Konfiguration, CSP und
Desktop-Packaging unabhängig verifiziert werden können.
