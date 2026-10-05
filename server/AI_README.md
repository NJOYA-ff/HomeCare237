# AI Health Education tips (Google Gemini)

The patient **Health Education** page (`src/pages/Patient/Articles.tsx`) shows a
"Live health care tips" section that is refreshed by an online AI model. Tips
cover Cameroon-relevant diseases such as **mpox, malaria, cholera, typhoid,
dengue, diarrhoea, tuberculosis**, plus hygiene, nutrition, maternal & child
health and mental wellbeing.

## How it works

```
Patient app (Articles.tsx)
   │  POST /api/ai/health-tips  { topic, language, count }
   ▼
Local API server (server/twilio-function.cjs)   ← GEMINI_API_KEY lives here
   │  POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
   ▼
Google Gemini  →  JSON array of { title, detail }
```

The API key is **never** shipped to the browser: the app only talks to the local
API server. In development Vite proxies `/api` to `http://localhost:3400`
(see `vite.config.ts`).

## Setup (local)

1. Get a free API key at <https://aistudio.google.com/apikey>.
2. Add it to `.env` in the project root:

   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=gemini-2.0-flash
   GEMINI_FALLBACK_MODELS=gemini-flash-latest,gemini-1.5-flash
   ```

3. Start the app (API server + Vite together):

   ```bash
   npm run dev
   ```

   Or the API server alone:

   ```bash
   npm run start:api
   ```

4. Open **Patient → Health Education**. Pick a topic chip (e.g. *Mpox*) and the
   tips refresh; the refresh button re-generates them.

## Behaviour without a key / offline

The endpoint answers `503 { success: false, error: "AI_NOT_CONFIGURED" }`. The
page then shows the last successful tips cached in `localStorage`
(`hc_ai_tips_<lang>_<topic>`) plus a notice. Only assistant-generated tips are
displayed — no bundled/static tips are substituted when the assistant is
unreachable.

## Endpoint reference

`POST /api/ai/health-tips`

| Field | Type | Notes |
|---|---|---|
| `topic` | string | One of the `AI_TOPICS` keys: `general`, `mpox`, `malaria`, `cholera`, `typhoid`, `dengue`, `diarrhoea`, `tuberculosis`, `hygiene`, `nutrition`, `maternal`, `mental`. Unknown values fall back to `general`. |
| `language` | `"en"` \| `"fr"` | Output language. Defaults to `fr`. |
| `count` | number | 1–6 tips. Defaults to `4`. |

Success (`200`):

```json
{
  "success": true,
  "topic": "mpox",
  "language": "en",
  "generatedAt": "2026-01-01T10:00:00.000Z",
  "tips": [{ "title": "…", "detail": "…" }]
}
```

Errors: `503 AI_NOT_CONFIGURED`, `429 AI_RATE_LIMITED`, `502 AI_UPSTREAM_ERROR`,
`502 AI_EMPTY_RESPONSE`, `500 AI_UPSTREAM_ERROR`.

## Safety rules enforced by the prompt

The system instruction keeps the model in "health education only" territory:

- prevention, self-care and warning-sign advice only — **no diagnosis**;
- **no medicine names, dosages or prescriptions**;
- plain language, Cameroonian context (endemic malaria, cholera/mpox outbreaks,
  free treated nets, ORS + zinc, national vaccination campaigns);
- urgent warning signs escalate the reader to the nearest health facility;
- every response is labelled "not a diagnosis" in the UI.

`temperature: 0.6`, `maxOutputTokens: 900` and `BLOCK_ONLY_HIGH` safety settings
are applied; a per-IP limit of 30 generations / 5 minutes protects the free quota.

## Deploying / Capacitor builds

Relative `/api/...` calls only work on the web (via the Vite proxy). For the
Android/iOS build, point the client at a deployed API server:

```
VITE_API_BASE_URL=https://api.your-host.example
```

The server must be reachable over **HTTPS** (the Android scheme is `https`, see
`capacitor.config.ts`). The Gemini key stays on that server — keep it out of the
client bundle and out of source control.

> **Note:** the endpoint is currently unauthenticated (rate-limited only). Before a
> public deployment, put it behind the same auth mechanism as the rest of the
> API and consider a Firestore-backed per-user quota.

## Related files

- `server/twilio-function.cjs` — Express server + `/api/ai/health-tips`
- `src/components/Services/healthAiService.ts` — typed client + offline cache
- `src/pages/Patient/Articles.tsx` — the Health Education page UI
- `src/pages/Patient/data/articles.ts` — bundled articles + fallback tips
- `src/pages/Patient/__tests__/healthAiService.test.ts` — unit tests