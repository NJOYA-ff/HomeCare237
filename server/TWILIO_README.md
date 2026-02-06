# Twilio endpoint (example)

This folder contains a minimal Node/Express example that can be used as a hosted
endpoint to send SMS via Twilio. It's provided as a scaffold you can deploy to
any Node host or adapt to a serverless platform (Vercel, Netlify functions,
AWS Lambda, Azure Functions).

## Files

- `twilio-function.js` - Express app with `/api/twilio/send` and
  `/api/twilio/send-appointment-status` POST endpoints.

## Required environment variables

- `TWILIO_ACCOUNT_SID` - your Twilio account SID
- EITHER:
  - `TWILIO_API_KEY` and `TWILIO_API_SECRET` (recommended)
    OR
  - `TWILIO_AUTH_TOKEN` (fallback)
- `TWILIO_PHONE_NUMBER` - your Twilio phone number in E.164 format (e.g. +1234567890)

## Deploy & run locally

1. Install deps (in `server/`):

```bash
npm install express body-parser twilio
```

2. Set environment variables (example on Windows PowerShell):

```powershell
$env:TWILIO_ACCOUNT_SID="AC..."
$env:TWILIO_API_KEY="SK..."
$env:TWILIO_API_SECRET="..."
$env:TWILIO_PHONE_NUMBER="+1234567890"
node twilio-function.js
```

3. The server will listen on http://localhost:3400 by default.

## Client usage

Point the app to the hosted endpoint rather than a local mock. Configure your
Vite env variable in the client (e.g. `.env`):

```
VITE_TWILIO_ENDPOINT_URL=https://your-host.example.com/api/twilio/send
```

Then, client code should POST JSON { to, body } to that URL. The example
server also accepts `/api/twilio/send-appointment-status` for convenience.

## Security note

- NEVER store Twilio credentials in client-side code or public repos.
- Use environment variables or your cloud provider's secret manager.
