# GigShield — Income Protection for Delivery Partners

AI-powered parametric insurance for Zomato & Swiggy gig workers. Instant automatic payouts when disruptions strike (rain, heat, AQI, platform outages).

## Tech Stack

- **Framework**: Next.js 14.2.29 (App Router), React 18
- **Database**: PostgreSQL (Replit managed) via `pg` driver
- **AI**: Groq API (`llama-3.3-70b-versatile`) for the AI chat assistant
- **Styling**: Plain CSS-in-JS inline styles + `src/app/globals.css` for global/fonts
- **Package manager**: npm

## Running the App

```bash
npm run dev   # dev server on port 5000 (0.0.0.0)
npm run build # production build
npm run start # production server on port 5000 (0.0.0.0)
```

## Environment Variables / Secrets

| Key | Purpose |
|-----|---------|
| `GROQ_API_KEY` | Groq AI API key (free at console.groq.com) — powers AI chat |
| `DATABASE_URL` | Replit PostgreSQL connection string (auto-managed) |
| `PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE` | Individual PG credentials (auto-managed) |

## Project Structure

```
src/
  app/
    layout.jsx          # Root layout (imports globals.css)
    page.jsx            # Main app entry (4-step worker onboarding flow)
    globals.css         # Global styles + Google Fonts
    api/
      chat/route.js         # Groq AI chat proxy (server-side, reads DB claims)
      claims/route.js       # GET/POST claims from PostgreSQL
      triggers/check/route.js  # Parametric trigger evaluation engine
      fraud-cases/route.js  # GET/PATCH fraud cases from PostgreSQL
      weather/route.js      # OpenWeatherMap proxy
      db/setup/route.js     # DB schema init + seed (GET or POST /api/db/setup)
  components/
    worker/
      OnboardingScreen.jsx  # Step 1: name/platform/pin/earnings
      RiskScreen.jsx        # Step 2: NFI risk score display
      PolicyScreen.jsx      # Step 3: tier selection + premium calc
      DashboardScreen.jsx   # Step 4: main dashboard with tabs
      tabs/
        AIChatAssistant.jsx   # Groq-powered AI chat (sends workerId for DB context)
        ClaimsHistory.jsx     # Claims from DB (falls back to mock)
        LiveWeatherWidget.jsx # Weather via /api/weather
        HeatStressCard.jsx    # Interactive Rothfusz heat index slider
        DisruptionMap.jsx     # Zone risk map
        PolicyReceipt.jsx     # Policy PDF-style view
        UPIPaymentFlow.jsx    # UPI payment simulation
        WhatsAppScreen.jsx    # WhatsApp onboarding flow mock
    insurer/
      InsurerDashboard.jsx   # Insurer admin view (KPIs, tabs)
      FraudScoreVisualiser.jsx  # Fraud cases from DB, approve/reject
  data/
    mockData.js    # Static fallback data (tiers, claims, fraud cases, etc.)
    pinRisk.js     # Pin-code → city/zone/NFI/lat-lng lookup
  lib/
    db.js          # PostgreSQL pool singleton
  utils/
    premium.js     # calcPremium(), calcHeatIndex() (Rothfusz), getSeasonalFactor()
```

## Parametric Trigger Logic (`/api/triggers/check`)

All triggers are evaluated server-side with no manual claims required:

| Trigger | Threshold | Formula |
|---------|-----------|---------|
| Rain | >35mm in 2 hours | Direct measurement |
| Heat Stress | Feels-like >42°C | Rothfusz heat index (full 9-term polynomial) |
| AQI | >350 (Severe) | Direct measurement |
| Platform Outage | >90 minutes continuous | Duration tracking |

POST `{ type, value, humidity?, city?, pin_code?, worker_id?, tier? }` → returns `{ triggered, payout_amount, message, ... }`

## Database Schema

- **workers** — worker profiles
- **claims** — auto-paid claims with trigger type/value, amount, status
- **disruption_events** — all trigger evaluation events (triggered or not)
- **fraud_cases** — flagged claims with 4-signal Isolation Forest scores + JSONB signals

Initialize/seed: `GET /api/db/setup`

## Fraud Detection Model

4-signal Isolation Forest anomaly scoring (0–100):
1. GPS vs declared event zone
2. Claim frequency vs zone average
3. Activity pattern during disruption window
4. Historical earnings baseline

Score >75 → High risk (red). Score 51-75 → Medium (amber). Score ≤50 → Low (green).
Insurer can approve or reject via the Fraud AI tab → updates DB via PATCH `/api/fraud-cases`.

## AI Chat

- Model: `llama-3.3-70b-versatile` via Groq
- System prompt enriched with: worker profile, real claim history from DB, all trigger thresholds, fraud model explanation
- Falls back to informative demo message if GROQ_API_KEY is missing
- Max 300 tokens, temperature 0.65 for consistent, concise answers
