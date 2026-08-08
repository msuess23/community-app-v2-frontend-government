# Native Verpackung mit Tauri 2

Der Behördenclient bleibt eine einzige React/Vite-SPA. Tauri stellt dieselben gebauten Web-Assets
in den System-WebViews von Desktop und Android bereit. Es existieren deshalb weder eine zweite
UI noch getrennte Phone- und Tablet-Implementierungen. Responsive Breakpoints, Formulare,
Navigation, Authentifizierung und Fachlogik bleiben identisch zum Browserclient.

Die Tauri-Integration besteht aus drei Ebenen:

1. `src-tauri` enthält den nativen Rust-Wrapper und die Capability-Konfiguration.
2. `scripts/run-tauri.mjs` erzeugt pro Dev-/Build-Lauf eine zur API passende CSP-Konfiguration.
3. Das von `tauri android init` erzeugte Android-Studio-Projekt liegt unter
   `src-tauri/gen/android` und wird für Smartphone und Tablet gemeinsam verwendet.

## 1. Gemeinsame Voraussetzungen

Das Projekt benötigt weiterhin die in `package.json` festgelegte Node-/npm-Version. Zusätzlich
wird Rust benötigt. Nach der Installation sollte die Toolchain erreichbar sein:

```bash
node --version
npm --version
rustc --version
cargo --version
```

Danach werden die JavaScript-Abhängigkeiten installiert:

```bash
npm ci
```

Die lokale Tauri-CLI wird dabei aus dem Projekt installiert. Eine globale Tauri-Installation ist
nicht erforderlich. Mit

```bash
npm run tauri info
```

kann die erkannte Tauri-, Rust- und Systemumgebung kontrolliert werden.

Beim ersten Rust-Build erzeugt Cargo `src-tauri/Cargo.lock`. Diese Datei sollte anschließend
versioniert werden, damit auch die nativen Rust-Abhängigkeiten reproduzierbar bleiben.

## 2. Desktop-Voraussetzungen

### Linux

Für Debian/Ubuntu werden insbesondere WebKitGTK und die Tauri-Buildabhängigkeiten benötigt:

```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

Andere Linux-Distributionen benötigen die entsprechenden Pakete ihrer Paketverwaltung.

### Windows

Benötigt werden die Microsoft C++ Build Tools mit **Desktop development with C++** sowie die
WebView2 Runtime. Auf aktuellen Windows-10-/11-Installationen ist WebView2 üblicherweise bereits
vorhanden. Für MSI-Pakete kann zusätzlich die optionale Windows-Komponente VBSCRIPT erforderlich
sein.

### macOS

Für reine Desktop-Builds genügen Xcode Command Line Tools:

```bash
xcode-select --install
```

Für signierte bzw. notarized Distributionen ist die entsprechende Apple-Entwicklerkonfiguration
zusätzlich erforderlich.

## 3. Desktop entwickeln und testen

Backend lokal starten:

```bash
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

Danach im Frontend:

```bash
npm run native:dev
```

Der Development-Build verwendet weiterhin `VITE_API_BASE_URL=/api/v1`. Die Anfrage läuft damit
über den vorhandenen Vite-Proxy zum FastAPI-Backend. Browser- und Tauri-Development verwenden
also dieselbe API-Konfiguration.

Für einen Desktop-Smoke-Test sollten mindestens geprüft werden:

- Login und Logout mit echten Tokens,
- Wiederherstellung einer persistenten Sitzung nach vollständigem App-Neustart,
- Suche/Filter und Navigation,
- ein vollständiger Ticket-Workflow-Schritt,
- Info-Bildanzeige und Upload,
- Appointment-PDF-Upload und nativer Speicherdialog,
- Dirty-Formular schließen: weiterbearbeiten sowie verwerfen,
- Fensterbreiten bis 320 CSS-Pixel für den bestehenden Reflow.

## 4. Desktop-Release bauen

Ein gebündelter Tauri-Client besitzt keinen Vite-Proxy. Release-Builds benötigen deshalb eine
absolute Backend-URL, vorzugsweise in `.env.production.local`:

```dotenv
VITE_API_BASE_URL="https://api.example.com/api/v1"
```

Danach kann das Paket für das aktuelle Host-Betriebssystem erzeugt werden:

```bash
npm run native:build
```

Tauri baut Desktop-Pakete grundsätzlich für das Betriebssystem, auf dem der Build ausgeführt wird.
Für einen gezielten Pakettyp können Argumente weitergereicht werden, beispielsweise:

```bash
# Linux
npm run native:build -- --bundles deb,appimage

# Windows
npm run native:build -- --bundles nsis
# Optional zusätzlich MSI, wenn die Windows-Voraussetzungen erfüllt sind:
npm run native:build -- --bundles msi,nsis

# macOS
npm run native:build -- --bundles app,dmg
```

Die erzeugten Desktoppakete liegen unter `src-tauri/target/<target>/release/bundle/` beziehungsweise
den darin enthaltenen formatspezifischen Unterordnern. Für eine Weitergabe außerhalb einer lokalen
Studien-/Testumgebung gelten die jeweiligen Code-Signing- und gegebenenfalls
Notarisierungsanforderungen des Zielsystems.

## 5. Android-Voraussetzungen

Für Android werden zusätzlich Android Studio und dessen SDK-Komponenten benötigt. Im SDK Manager
sollten installiert sein:

- Android SDK Platform,
- Android SDK Platform-Tools,
- Android SDK Build-Tools,
- Android SDK Command-line Tools,
- NDK (Side by side).

`JAVA_HOME`, `ANDROID_HOME` und `NDK_HOME` müssen auf die lokalen Installationen zeigen. Typische
Linux-Werte sind beispielsweise:

```bash
export JAVA_HOME=/opt/android-studio/jbr
export ANDROID_HOME="$HOME/Android/Sdk"
export NDK_HOME="$ANDROID_HOME/ndk/$(ls -1 "$ANDROID_HOME/ndk" | tail -1)"
```

Die genauen Pfade unterscheiden sich je nach Betriebssystem und Android-Studio-Installation.
Zusätzlich werden die Android-Rust-Targets installiert:

```bash
rustup target add \
  aarch64-linux-android \
  armv7-linux-androideabi \
  i686-linux-android \
  x86_64-linux-android
```

Mit

```bash
adb devices
```

lässt sich anschließend prüfen, ob ein gestarteter Emulator oder ein per USB-Debugging
angeschlossenes Gerät erkannt wird.

## 6. Android einmalig initialisieren

Nach Anwendung der Tauri-Patches und Installation der Toolchain wird das Android-Studio-Projekt
genau einmal erzeugt:

```bash
npm run native:android:init
```

Tauri legt es unter `src-tauri/gen/android` an. Das Verzeichnis gehört danach grundsätzlich zum
Projekt und sollte – abgesehen von lokalen Builddaten und Signing-Secrets – versioniert werden.
Die Top-Level-`.gitignore` blendet insbesondere `local.properties`, Gradle-Buildverzeichnisse,
`keystore.properties` und lokale `.jks`-Dateien aus.

Nach der Initialisierung können die vorhandenen 1024x1024-Quellicons in die von Android und den
Desktopplattformen benötigten Größen übertragen werden:

```bash
npm run native:icons
```

Die Android-spezifische Tauri-Konfiguration liegt in `src-tauri/tauri.android.conf.json` und setzt
die minimale Android-Version explizit auf SDK 24 (Android 7). Phone und Tablet verwenden dasselbe
Application-ID-/APK-Projekt.

## 7. Android auf Emulator oder Gerät entwickeln

Backend wie bei Desktop auf Port 8000 starten. Anschließend einen Android-Emulator in Android
Studio starten oder ein physisches Gerät mit aktiviertem USB-Debugging anschließen.

Der normale Entwicklungsstart lautet:

```bash
npm run native:android:dev
```

Sind mehrere Geräte vorhanden, kann der von Tauri erwartete Gerätename weitergereicht werden:

```bash
npm run native:android:dev -- <DEVICE>
```

Für ein physisches Gerät kann zusätzlich die vom Gerät erreichbare Netzwerkadresse des
Entwicklungsrechners vorgegeben werden:

```bash
npm run native:android:dev -- --host 192.168.178.25
```

Tauri setzt dabei `TAURI_DEV_HOST`; die vorhandene Vite-Konfiguration bindet den Dev-Server an
diese Adresse und konfiguriert HMR entsprechend. Im Development-Modus kann
`VITE_API_BASE_URL=/api/v1` bestehen bleiben: Android spricht den Vite-Dev-Server an und dessen
Proxy reicht `/api` an das lokale FastAPI-Backend weiter.

Alternativ kann das generierte Projekt in Android Studio geöffnet werden:

```bash
npm run native:android:open
```

## 8. Android Phone und Tablet testen

Es werden keine unterschiedlichen APKs für Phone und Tablet benötigt. Für den Nachweis der
plattformübergreifenden Darstellung sollten jedoch zwei verschiedene AVDs oder reale Geräte
verwendet werden, beispielsweise:

- Smartphone-Profil mit schmalem Portrait-Viewport,
- Tablet-Profil mit mindestens etwa 800 dp Breite.

Auf beiden Geräten sollte mindestens folgende Matrix manuell geprüft werden:

| Bereich | Android Phone | Android Tablet |
| --- | --- | --- |
| App-Start und Login | ✓ | ✓ |
| Session nach App-Neustart | ✓ | ✓ |
| Navigation und Responsive Layout | ✓ | ✓ |
| Suche, Filter, Sortierung | ✓ | ✓ |
| Ticketdetail und Workflowaktion | ✓ | ✓ |
| Info mit Bild | ✓ | ✓ |
| Info-Bildupload | ✓ | ✓ |
| Appointment verschieben | ✓ | ✓ |
| PDF hochladen | ✓ | ✓ |
| PDF über nativen Speicherdialog speichern | ✓ | ✓ |
| Formularvalidierung/Fehlerausgabe | ✓ | ✓ |

Die bestehenden Playwright-E2E- und Full-Stack-Tests bleiben der automatisierte fachliche
Nachweis. Die Android-Matrix ergänzt sie um einen nativen WebView-/Gerätenachweis und soll nicht
dieselben Geschäftsabläufe vollständig duplizieren.

## 9. Android APK und AAB erzeugen

Wie bei Desktop muss für einen Release-Build eine absolute API-URL konfiguriert sein:

```dotenv
VITE_API_BASE_URL="https://api.example.com/api/v1"
```

APK für direkte Installation/Testverteilung:

```bash
npm run native:android:build:apk
```

Android App Bundle für Google Play:

```bash
npm run native:android:build:aab
```

Tauri baut standardmäßig alle unterstützten Android-Architekturen. Für eine kleinere lokale
Testdatei kann die Architektur eingeschränkt werden, zum Beispiel:

```bash
npm run native:android:build:apk -- --target aarch64
```

Ein bereits initialisiertes Projekt kann auch im Produktionsmodus direkt auf einem Gerät gestartet
werden:

```bash
npm run native:android:run
```

Auch hierfür ist eine absolute `VITE_API_BASE_URL` erforderlich.

## 10. Android-Signing

Debug-/lokale Entwicklungsstarts benötigen keinen eigenen Release-Key. Für eine veröffentlichbare
AAB/APK muss ein Android-Upload-Key erzeugt und Gradle entsprechend konfiguriert werden. Private
Keystores und `src-tauri/gen/android/keystore.properties` dürfen nicht ins Repository eingecheckt
werden. Signing ist deshalb bewusst Deployment-Konfiguration und nicht Bestandteil des
Quellcode-Patches.

## 11. API, CORS und lokale Geräte

Der zugehörige Backend-Tauri-Patch erlaubt die Tauri-WebView-Origins. Für Development läuft der
API-Verkehr bevorzugt über den Vite-Proxy. Bei einem gebündelten Client wird dagegen direkt die in
`VITE_API_BASE_URL` konfigurierte Backendadresse angesprochen.

Für lokale Experimente kann eine LAN-Adresse verwendet werden, beispielsweise
`http://192.168.178.25:8000/api/v1`. Android kann unverschlüsselten HTTP-Verkehr abhängig von
System- und Network-Security-Konfiguration blockieren; der finale Releasepfad sollte daher keine
Cleartext-Ausnahme einführen, sondern ein über HTTPS erreichbares Backend verwenden.

## 12. CSP und Runtime-Konfiguration

`scripts/run-tauri.mjs` wird für Desktop `dev/build` und Android `dev/run/build` verwendet. Der
Wrapper:

- lädt die passende Vite-Umgebung,
- verbietet relative API-URLs für Release-/Production-Läufe,
- erzeugt eine CSP mit ausschließlich dem tatsächlich konfigurierten API-Origin,
- leitet zusätzliche Tauri-CLI-Argumente unverändert weiter,
- bricht Android-Dev-/Build-/Run-Befehle mit einer verständlichen Meldung ab, wenn
  `src-tauri/gen/android` noch nicht initialisiert wurde.

Damit verwenden Desktop und Android denselben Transport- und Sicherheitsvertrag.

## 13. Persistente Anmeldung

`useHttpsScheme` bleibt bewusst auf `false`. Damit bleibt die Produktions-Origin auf
Windows/Android stabil bei `http://tauri.localhost`; ein späterer Wechsel würde den
WebView-Speicherort für LocalStorage und damit die persistierten Refresh-Sessions verändern.

Beim nativen Smoke-Test ist deshalb insbesondere zu verifizieren:

```text
Login mit „Angemeldet bleiben“
→ Anwendung vollständig beenden
→ Anwendung erneut starten
→ Sitzung wird über Refresh-Token wiederhergestellt
→ authentifizierte Seite ist erreichbar
```

## 14. Native Dateiablage und Dirty-Formulare

Appointment-PDFs verwenden weiterhin denselben authentifizierten HTTP-Download. Im Browser wird
der Blob über einen temporären Download-Link gespeichert; Tauri nutzt den System-Speicherdialog
und das Filesystem-Plugin. Die Capability erlaubt nur den Save-Dialog und `writeFile`.

Auf Desktop schützt der bestehende Unsaved-Changes-Guard zusätzlich das native Fenster-X. Auf
Android greifen weiterhin die vorhandenen Formular- und Routerguards; ein hartes Beenden des
App-Prozesses durch das Betriebssystem kann – wie bei anderen mobilen Apps – nicht zuverlässig
abgefangen werden.

## 15. Empfohlene Abschlussreihenfolge

Nach Anwendung aller Patches:

```bash
# JavaScript-Abhängigkeiten
npm ci

# bestehende Browserqualität sichern
npm run verify
npm run test:fullstack

# Tauri-/Rust-Umgebung ansehen
npm run tauri info

# Desktop Development
npm run native:dev

# Android einmalig generieren
npm run native:android:init
npm run native:icons

# Android Phone/Tablet Development
npm run native:android:dev
```

Erst nach erfolgreichen Smoke-Tests sollten Release-Pakete mit einer absoluten HTTPS-API gebaut
und gegebenenfalls signiert werden.
