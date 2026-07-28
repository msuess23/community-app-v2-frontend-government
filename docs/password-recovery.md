# Passwort-Wiederherstellung

## Öffentliche Routen

```text
/password-forgotten
/password-reset
```

Die Seiten sind öffentlich und verwenden den bestehenden Auth-Seitenaufbau. Bereits angemeldete Behördenkonten werden zur Anwendung, angemeldete Bürgerkonten zur 403-Seite weitergeleitet.

## FastAPI-Vertrag

Der Client sendet ausschließlich öffentliche Requests:

```text
POST /api/v1/auth/forgot-password-request
POST /api/v1/auth/reset-password
```

Reset-Code anfordern:

```json
{
  "email": "citizen@example.com"
}
```

Passwort ändern:

```json
{
  "email": "citizen@example.com",
  "otp": "123456",
  "new_password": "..."
}
```

E-Mail-Adressen werden getrimmt und kleingeschrieben. Der Einmalcode muss aus genau sechs Ziffern bestehen. Für das neue Passwort gelten dieselben Grenzen wie bei der Registrierung: 8 bis 128 Zeichen und höchstens 72 UTF-8-Byte.

## Schutz vor Kontoermittlung

Nach einer erfolgreichen Code-Anforderung zeigt die Oberfläche immer dieselbe Meldung, unabhängig davon, ob ein aktives Konto zur E-Mail-Adresse existiert. Backenddetails zur Kontoexistenz dürfen nicht in der Oberfläche erscheinen.

## Sitzungsverhalten

Die Wiederherstellung ist bewusst nicht Teil des `AuthSession`-Cores. Nach einem erfolgreichen Passwortwechsel führt der Client zur Anmeldung zurück. Das Backend widerruft dabei bestehende Sitzungen entsprechend seinem Authentifizierungsvertrag.

## Lokale Prüfung

```bash
npm run format
npm run typecheck
npm run build
npm run verify
npm run test:e2e
```
