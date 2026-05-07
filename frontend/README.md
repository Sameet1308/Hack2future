# Glass Box AI — Frontend

Vite + React 18 + Tailwind. Hosts both surfaces from one Static Web App:

- **Customer Mobile App** — `/customer/*` — Sarah's FNOL journey (8 phone screens, "Sara" avatar)
- **Adjuster Console** — `/handler/*` — claims queue + claim review + Glass Box audit trail
- **Landing** — `/` — choose-your-side splash

The customer surface is a simulated mobile app (rendered inside a phone-frame at any viewport size). The handler surface is a desktop web app.

## Run locally

```bash
cd frontend
npm install
npm run dev
```

Opens at http://localhost:5173.

## Build for production

```bash
npm run build
```

Output goes to `frontend/dist/`. Azure Static Web Apps deployment uses `app_location: "frontend"` and `output_location: "dist"`.

## Pages

| Route | What |
|---|---|
| `/` | Landing — pick customer or handler |
| `/customer/login` | Sign in with Policy # + OTP |
| `/customer/dashboard` | Recent claims + "File new claim" |
| `/customer/initiate` | Sara avatar greeting |
| `/customer/loss-type` | Loss-type selector |
| `/customer/questions` | Mandatory questions (universal + collision) |
| `/customer/documents` | Upload evidence with auto-validation |
| `/customer/review` | Quick review + Glass Box consent |
| `/customer/success` | Claim # + live progress + "Sara is on it" |
| `/handler/signin` | Mock SSO (production uses Microsoft Entra ID) |
| `/handler/queue` | All claims, sorted by tier |
| `/handler/claim/:id` | Full claim review with Glass Box audit panel |

## Authentication for handler routes

**Hackathon mode** (current): clicking "Sign in with Microsoft" stamps a fake handler session in `localStorage` and routes to `/handler/queue`. No real auth.

**Production** (one-config-file change): `staticwebapp.config.json` already contains the production snippet under the `_PRODUCTION_SSO_SNIPPET_READY_TO_PASTE` key. Move it to the top-level `auth` and `routes` keys, set the `AAD_CLIENT_ID` and `AAD_CLIENT_SECRET` app settings in Azure Portal → Static Web Apps → Configuration, and SWA enforces Entra ID SSO on `/handler/*` automatically. Frontend reads the role from `/.auth/me`.

## Connecting to the backend

This frontend is currently fully mocked (`src/data/mockClaims.js`). To wire to the real Glass Box AI backend:

1. **Customer FNOL submission** — replace the `navigate('/customer/success')` in `Review.jsx` with a `fetch()` to a Power Automate HTTP-trigger flow URL (the "Create Claim" flow). Returns the new claim ID, which you display on the success screen.
2. **Customer chat (optional, replaces forms)** — embed the Bot Framework Web Chat library in `Initiate.jsx`, fetch a token from the existing `api/getToken` route (per `docs/frontend_integration.md`), point it at the Copilot Studio Direct Line.
3. **Adjuster queue** — replace `mockClaims` import with a `fetch()` to a Power Automate HTTP-trigger flow that returns active claims from Dataverse (filter by `Tier in (2, 3)`).
4. **Adjuster decision** — wire the Approve/Deny/Adjust/More-Info buttons to a flow that updates the Claim row in Dataverse, then writes a Glass Box entry.

## Folder structure

```
frontend/
├── package.json, vite.config.js, tailwind.config.js, postcss.config.js
├── index.html, staticwebapp.config.json
├── public/favicon.svg
├── mockup.html              ← original static HTML mockup (preserved for reference)
└── src/
    ├── main.jsx, App.jsx, index.css, Landing.jsx
    ├── components/          ← shared (PhoneFrame, SaraHeader, ProgressBar)
    ├── customer/            ← 8 customer screens
    ├── handler/             ← Sign-in, Layout, Queue, ClaimDetail, GlassBoxPanel
    └── data/                ← mockClaims.js (3 demo claims, one per tier)
```
