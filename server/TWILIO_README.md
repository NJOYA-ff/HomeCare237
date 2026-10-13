# Twilio Voice & Video (HomeCare237)

The API server in `server/twilio-function.cjs` mints Twilio JWTs and serves the
Voice TwiML webhook used by patient ↔ doctor calls.

## Required `.env` variables (server-only)

Never prefix these with `VITE_` — that would expose secrets to the browser.

```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_API_KEY=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_SECRET=your_api_secret
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_TWIML_APP_SID=APxxxxxxxxxxxxxxxxxxxxxxxxxxxx

VITE_API_BASE_URL=http://localhost:3400
```

| Variable | Used for |
|---|---|
| `TWILIO_ACCOUNT_SID` | Account that owns Voice/Video |
| `TWILIO_API_KEY` + `TWILIO_API_SECRET` | Signing Voice & Video Access Tokens (required) |
| `TWILIO_AUTH_TOKEN` | SMS REST API (preferred; restricted API keys often cannot send SMS) |
| `TWILIO_PHONE_NUMBER` | Caller ID for outbound PSTN / SMS |
| `TWILIO_TWIML_APP_SID` | Voice SDK outbound dialing (required for audio) |

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/twilio/video-token` | Twilio Video JWT (`{ identity, roomName }`) |
| POST | `/api/twilio/voice-token` | Twilio Voice JWT (`{ identity }`) |
| POST | `/api/twilio/token` | Unified token (`type: "voice" \| "video"`) |
| POST | `/api/twilio/voice` | TwiML App webhook — dials phone or `client:` identity |
| POST | `/api/twilio/send` | SMS |

## Voice TwiML App setup

1. Twilio Console → **Voice** → **TwiML Apps** → Create
2. **Voice Request URL**: `https://YOUR_PUBLIC_HOST/api/twilio/voice` (HTTP POST)
   - Locally, expose the API with ngrok / Cloudflare Tunnel, e.g.
     `https://abc123.ngrok.io/api/twilio/voice`
3. Copy the App SID (`AP…`) into `TWILIO_TWIML_APP_SID`
4. Restart `npm run start:api`

In-app audio dials Twilio Client identities (`doctor_<uid>`, `patient_<uid>`).
PSTN numbers are also supported when a phone destination is passed.

## Video rooms

Patient and doctor join the same stable room name:

`consult_<sortedPatientId>_<sortedDoctorId>`

`VideoChatModal` requests a JWT from `/api/twilio/video-token` when opened.

## Run locally

```bash
npm run start:api   # http://localhost:3400
npm run dev         # Vite on :8100 proxies /api → :3400
```

Health check: `GET http://localhost:3400/` → `twilio.videoReady` / `twilio.voiceReady`.

## Security

- Keep Twilio secrets in `.env` / `.env.local` only (gitignored).
- Rotate any key that was ever committed or shared with a `VITE_` prefix.
