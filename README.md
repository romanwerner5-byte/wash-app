# Waschkalender Haus-App

Teilbare Web-App für Mehrfamilienhäuser.

Funktionen:
- gemeinsame Online-Kalenderansicht für alle Mieter
- Wasch-Slots reservieren
- Mieter verwalten
- "fertig" markieren
- automatische Benachrichtigung der nächsten Person per E-Mail oder SMS über Webhook
- deploybar auf Vercel
- Datenhaltung in Supabase

## 1) Lokal starten

```bash
npm install
cp .env.example .env.local
npm run dev
```

Dann im Browser öffnen:

```bash
http://localhost:3000
```

## 2) Supabase vorbereiten

1. Neues Supabase-Projekt erstellen.
2. In Supabase SQL Editor den Inhalt von `supabase/schema.sql` ausführen.
3. Danach folgende Werte kopieren:
   - Project URL
   - anon public key
   - service role key

## 3) Umgebungsvariablen setzen

In `.env.local` oder bei Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_HOUSE_ID=haus-luzern
EMAIL_WEBHOOK_URL=
SMS_WEBHOOK_URL=
```

## 4) Webhooks für Mail oder SMS

Die App sendet bei Klick auf "fertig" ein JSON an den passenden Webhook.

### Beispiel Payload

```json
{
  "houseId": "haus-luzern",
  "channel": "email",
  "to": "anna@example.com",
  "subject": "Waschküche: Du bist jetzt dran",
  "tenantName": "Anna Keller",
  "message": "Die Wäsche vor deinem Termin ist fertig. Du bist als Nächstes dran: 21.03.2026, 10:00–12:00.",
  "booking": {},
  "previousBooking": {}
}
```

Du kannst dafür verwenden:
- Make
- n8n
- Zapier
- Brevo
- Resend
- Twilio

## 5) Auf Vercel deployen

1. Projekt bei GitHub hochladen.
2. Bei Vercel importieren.
3. Alle Umgebungsvariablen setzen.
4. Deploy klicken.

## 6) Wichtiger Hinweis

Diese App ist technisch launch-ready, aber die automatische Zustellung von SMS oder E-Mails funktioniert erst, wenn du echte Webhooks hinterlegst.


## Smartphone / als App installieren

- Die App ist mobil nutzbar und responsiv.
- Nach dem Deployment kann sie auf dem Smartphone im Browser geöffnet werden.
- Auf Android: in Chrome `Zum Startbildschirm hinzufügen` wählen.
- Auf iPhone: in Safari `Teilen` → `Zum Home-Bildschirm`.
- Durch das Web-App-Manifest läuft sie dann wie eine installierbare App im Vollbild.
