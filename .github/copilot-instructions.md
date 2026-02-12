## Quick orientation for code-generating agents

**HomeCare237** is an Ionic + React telemedicine app (Vite + TypeScript) with Capacitor native support, Firebase backend, and Twilio/WebRTC integrations. This guide helps AI agents be immediately productive.

### Essential commands

```bash
npm run dev          # Vite dev server (proxy to /api → http://localhost:3000)
npm run build        # TypeScript compile + Vite build
npm run test.unit    # Vitest (jsdom, setupTests.ts)
npm run test.e2e     # Cypress e2e
npm start:api        # Local Twilio server (node server/twilio-server.js)
npx cap sync         # Sync Capacitor native code
npx cap open ios/android  # Open native IDE
```

### Architecture overview

**Role-based routing** (`src/App.tsx`):

- Three role types: Patient, Doctor, Admin (enum `UserRole`)
- Each role has its own sidebar menu (Menu.tsx, MenuDoctor.tsx, MenuAdmin.tsx)
- Each role routes to a different `IonRouterOutlet` with contentId: `main`, `main_2`, `main_3`
- AuthService (singleton) bootstraps auth state and calls `findUserInCollections()` to locate user across collections: `patients`, `doctors`, `admins`, `users`

**Data layer** (Firebase):

- Auth: `src/firebaseconfig.ts` exports `db`, `auth`, `storage`
- Firestore collections: `patients`, `doctors`, `admins`, `users` (role-specific), plus `chats`, `notifications`, `appointments`
- Real-time: `onSnapshot()` for live chat/notifications; `collection()` + `query()` for typed reads
- NotificationContext (`src/context/NotificationContext.tsx`) manages app-wide toast notifications and unread badge

**Communications**:

- **Twilio Voice**: `src/components/Services/twilioService.ts` (phone calls)
  - Requires backend endpoint `POST /api/twilio/token` (local: http://localhost:3000)
  - Device setup expects Twilio SDK on `window.Device` (loaded externally, not in npm deps)
  - Cameroon-specific number formatting via `formatCameroonNumber()`
- **SMS**: `src/components/Services/twilioServiceMs.ts` exports `sendSMS()` and `sendAppointmentStatusSMS()` — calls backend `/api/twilio/send` endpoint
- **WebRTC**: `src/components/Services/WebRTCService.ts` (video, placeholder signaling)
  - `createSignalingChannel()` is generic; backend must provide socket/Firebase signaling
- **AI/Voice**: `src/components/Services/AiModelService.ts` (VoiceFlow-style client, external API key needed)

### Project conventions

- **Services location**: all service modules live in `src/components/Services/` (NOT `src/services/`)
- **Routing**: React Router v5 style (`<Route>`, `<Redirect>`, `exact`); do not upgrade to v6 without full migration
- **UI patterns**: wraps in `IonPage` → `IonHeader` + `IonContent`; preserve `contentId` values for split-pane layouts
- **State management**: Context API for notifications; AuthService singleton for auth; local Firestore hooks for data
- **TypeScript**: strict mode; some service files use `any` to avoid SDK conflicts — stay consistent
- **Styling**: SCSS modules per page (e.g., `Page.scss`, `Admin.scss`); global theme in `src/theme/variables.css`

### Common patterns & examples

1. **Auth check in component**:

   ```tsx
   const authService = AuthService.getInstance();
   if (
     !authService.currentUser ||
     authService.currentUser.role !== UserRole.Patient
   ) {
     return <Redirect to="/login" />;
   }
   ```

2. **Firestore real-time chat query**:

   ```tsx
   const chatsRef = collection(db, "chats");
   onSnapshot(q, (snapshot) => {
     setChats(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
   });
   ```

3. **Send SMS via backend**:

   ```tsx
   import { sendSMS } from "../components/Services/twilioServiceMs";
   await sendSMS({
     phoneNumber: "+237XXXXXXXXX",
     message: "Hello",
     patientId: user.id,
   });
   ```

4. **Toast notification**:
   ```tsx
   const { sendLocalNotification } = useNotifications();
   await sendLocalNotification("Success", "Appointment booked");
   ```

### Integration risk areas — do not change lightly

- **Firebase config** (`src/firebaseconfig.ts`): contains live project keys; changes require ops coordination
- **Collection names** (`patients`, `doctors`, `admins`, `users`, `chats`, `notifications`): hardcoded in multiple places; refactor carefully with grep
- **Twilio flow**: backend token endpoint (`/api/twilio/token`) and SMS endpoint (`/api/twilio/send`) are required; changing caller ID or auth method requires backend changes
- **WebRTC signaling**: currently a placeholder; tight-coupling signaling to a backend protocol requires both frontend + backend tests
- **Role routing**: `contentId` + outlet mapping; UI breaks if routes or IDs change

### When adding features

1. **Identify impact**: which roles are affected? Check role enum and routing in `src/App.tsx`
2. **Data layer**: add Firestore collections/fields if needed; document new fields in comments
3. **Service layer**: create/update service in `src/components/Services/`; add backend endpoint stub in `server/` if needed
4. **UI**: add page(s) under `src/pages/{Role}/`; preserve role-specific routing
5. **Tests**: Vitest for unit tests (`src/App.test.tsx` example); Cypress for e2e (`cypress/e2e/test.cy.ts`)
6. **Backend**: if Twilio, SMS, or WebRTC, confirm backend endpoint exists and is documented

### When unsure

- Ask for backend API specs, Twilio tokens, or Firebase schema before implementing
- Do not invent token endpoints or hardcode secrets
- Check `server/TWILIO_README.md` for local SMS/voice setup
- Use existing service patterns (e.g., `twilioServiceMs.sendSMS`) rather than inventing new integration patterns
