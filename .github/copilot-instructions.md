## Quick orientation for code-generating agents

This repository is an Ionic + React (Vite + TypeScript) app with Capacitor and several realtime/third-party integrations. The goal of these notes is to give an AI coding agent the concrete facts and conventions needed to be productive immediately.

Key tech & commands
- Framework: React + Ionic (Ionic React components used heavily). Build with Vite.
- Native support: Capacitor is present (`ionic.config.json`, `@capacitor/*` deps). Typical flow: `npm run build` -> `npx cap sync` -> `npx cap open <platform>` (don’t run native build unless asked).
- Scripts (use these exact npm scripts): `npm run dev` (vite dev), `npm run build` (tsc + vite build), `npm run preview`, `npm run test.unit` (vitest), `npm run test.e2e` (cypress), `npm run lint`.

High-level architecture (what to know)
- Role-based UI: the app routes are split by role in `src/App.tsx` — Patient, Doctor, Admin. Each role uses a different sidebar/menu (`src/components/Menu.tsx`, `MenuDoctor.tsx`, `MenuAdmin.tsx`) and a different router outlet id (`main`, `main_2`, `main_3`). Keep role routing consistent.
- Firebase is the primary backend for auth and data (`src/firebaseconfig.ts`). Auth flow and Firestore lookups are implemented in `src/App.tsx` (AuthService singleton pattern). When modifying auth, update `findUserInCollections` usage and collection names: `patients`, `doctors`, `admins`, `users`.
- Realtime/comms: Twilio and WebRTC are used for voice/video. Look at `src/components/Services/twilioService.ts` and `src/components/Services/WebRTCService.ts`.
  - Twilio token acquisition expects a backend endpoint `POST /api/twilio/token` (see `getCallToken`). Do not hardcode tokens — assume backend dependency.
  - `WebRTCService` contains an intentionally generic signalingChannel abstraction (placeholder). Any changes that assume a specific signaling protocol (socket.io, firebase, etc.) must also add or update a backend or coordination layer.
- AI/voice integrations: `src/components/Services/AiModelService.ts` contains a VoiceFlow-style client. Treat it as an external API integration; changes require API key and runtime testing.

Project-specific conventions and quirks
- Services location: service modules live under `src/components/Services` (not `src/services`). When adding new services follow this location.
- Routing uses React Router v5 style (`<Route>`, `<Redirect>`, `exact` props). Do not migrate to v6 patterns without a full app-wide change.
- Ionic usage: UI components and layout use `IonSplitPane`, `IonRouterOutlet`, and `Tabs` (see `src/components/Tabs.tsx`). When changing layout, preserve `contentId` values (`main`, `main_2`, `main_3`) used by menus.
- Phone normalization: Twilio service includes Cameroon-specific formatting (`formatCameroonNumber`). Reuse or respect that helper if modifying calling flows.
- TypeScript: `tsconfig.json` is strict. New code should be typed; however some service files intentionally use `any` to avoid runtime conflicts with external SDKs — follow existing patterns and add narrow types when safe.

Integration & risk areas (do not change lightly)
- Firebase config lives in `src/firebaseconfig.ts` (project keys are present here). Don’t rotate or remove this without CI/ops coordination.
- Twilio: `twilioService` expects a runtime `Device` on `window` and a backend token endpoint. Changing the Twilio flow requires backend updates.
- Signaling: `WebRTCService.createSignalingChannel()` is a placeholder; any change that tight-couples signaling must include backend changes and tests.

Concrete examples to reference
- Auth & role routing: `src/App.tsx` — follow the AuthService pattern and role checks.
- Firebase bootstrapping: `src/firebaseconfig.ts` — import `db`, `auth`, `storage` where needed.
- Twilio usage: `src/components/Services/twilioService.ts` — shows token fetch and Cameroon number formatting.
- WebRTC: `src/components/Services/WebRTCService.ts` — shows how local/remote streams and signaling are expected to behave.

How to contribute safe changes
- When modifying runtime integrations (Twilio, WebRTC, VoiceFlow, Firebase), add a small README or comments describing any backend endpoints required and include a minimal stub/mock for unit tests.
- Add unit tests with Vitest. Vite is configured to run tests with jsdom and `src/setupTests.ts` is the setup file (see `vite.config.ts`).
- Preserve routing and `IonSplitPane` semantics; UI regressions are common if `contentId` or route paths change.

If something is unclear or you need credentials/backends
- Ask for the backend API spec or a sample token endpoint. Do not invent token endpoints or API keys.

Next step if asked to implement features
- 1) Identify which role(s) are impacted (App.tsx routing). 2) Update service under `src/components/Services`. 3) Add unit tests (Vitest) and, if applicable, a small e2e Cypress test. 4) Run `npm run test.unit` and `npm run test.e2e` locally.

If you want changes to this guidance, point to a specific section to refine.
