# GigShield — Parametric Insurance Platform

**GigShield** is a parametric insurance platform designed for gig workers in India, providing affordable, accessible insurance coverage against weather-related disruptions and income loss. This is the **Phase 1 prototype** frontend built with React and Next.js.

## 🚀 Features

### For Workers
- **Seamless Onboarding** — 4-step enrollment process (profile → risk assessment → policy selection → dashboard)
- **Live Weather Monitoring** — Real-time weather data with heat stress indicators
- **AI Chat Assistant** — Claude-powered policy guidance contextual to your profile
- **Claims Dashboard** — Easy claim submission and history tracking
- **Payment Integration** — UPI-based premium payments and payouts
- **WhatsApp Integration** — Policy enrollment and claim updates via WhatsApp

### For Insurers / Admin
- **Fraud Detection** — ML-powered fraud scoring using Isolation Forest algorithm
- **Risk Analytics** — Zone-based risk mapping across Indian cities
- **Claims Management** — Overview of claims, payouts, and fraud signals
- **Weather Forecasting** — Predictive models for seasonal disruption forecasting

## 🛠 Tech Stack

- **Frontend Framework** — Next.js 14 with React 18
- **UI Components** — Custom React components (SVG maps, gauges, animations)
- **Weather API** — OpenWeatherMap for live conditions
- **AI Integration** — Anthropic Claude for chat assistant
- **Payment Flow** — UPI payment pipeline simulation

## 📋 Quick Start

### Installation
```bash
npm install
npm run dev
```
App opens at **http://localhost:3000**

### Build for Production
```bash
npm run build
npm start
```

## 🏗 Project Architecture

### Worker User Flow
1. **OnboardingScreen** — Capture worker profile (name, platform, location, earnings)
2. **RiskScreen** — Display NFI (Non-Farm Income) risk gauge based on pin code and seasonal factors
3. **PolicyScreen** — Select insurance tier and preview weekly premium
4. **DashboardScreen** — Post-enrollment hub with 8 tabs:
   - 🌤 **Live Weather** — Real-time weather and heat stress index
   - 💬 **AI Chat** — Contextual policy Q&A with Claude
   - 🔥 **Heat Stress** — Manual heat stress calculator (Rothfusz formula)
   - 🗺 **Disruption Map** — Interactive India map with city-level disruption alerts
   - 📋 **Claims History** — Past 5 claims and total payouts
   - 🧾 **Policy Receipt** — Policy details with PDF export
   - 💬 **WhatsApp** — Enrollment and claims via WhatsApp
   - 💳 **UPI Payout** — Payment pipeline visualization

### Insurer/Admin Flow
- **Overview Tab** — KPIs: premium collected, claims paid, fraud cases
- **Fraud AI Tab** — Signal breakdown per claim using Isolation Forest scores
- **Zone Analytics** — Risk mapping by city and seasonal trends
- **Forecast Tab** — Predictions for seasonal disruptions

## 📁 Project Structure

```
src/
  app/
    layout.jsx              # HTML shell + metadata + favicons
    page.jsx                # Main app entry point (worker + insurer routes)
  components/
    ui/
      index.jsx             # Shared UI: Badge, StepDots, NFIGauge, styling
    worker/
      OnboardingScreen.jsx  # Step 1 — profile capture
      RiskScreen.jsx        # Step 2 — NFI gauge + premium breakdow
      PolicyScreen.jsx      # Step 3 — tier selection + calc
      DashboardScreen.jsx   # Step 4 — worker dashboard hub
      tabs/
        LiveWeatherWidget.jsx    # OpenWeatherMap API + fallback mock data
        AIChatAssistant.jsx      # Claude API integration (context-aware)
        HeatStressCard.jsx       # Heat stress calculator with Rothfusz formula
        DisruptionMap.jsx        # SVG India map with pulsing city alerts
        ClaimsHistory.jsx        # Past 5 claims summary + totals
        PolicyReceipt.jsx        # Policy card + PDF download simulation
        WhatsAppScreen.jsx       # Animated WhatsApp enrollment flow
        UPIPaymentFlow.jsx       # 4-stage UPI payout pipeline
    insurer/
      InsurerDashboard.jsx       # Admin dashboard (4 tabs)
      FraudScoreVisualiser.jsx   # Isolation Forest signal breakdown
  data/
    mockData.js             # Mock tiers, claims, fraud cases, disruptions
    pinRisk.js              # Risk scores for 15 Indian cities
  utils/
    premium.js              # Premium calculation, heat index, seasonal factors
  lib/
    utils.js                # Utility functions
```

## � Deploy to Vercel

GigShield is ready for production deployment on Vercel:

### Step 1: Push Code to GitHub ✅ (Already Done)
Your code is on GitHub at: `https://github.com/Sankalpkumarsingh1234/GigShield`

### Step 2: Connect Vercel to GitHub
1. Go to [vercel.com](https://vercel.com) → **Sign Up** → **Continue with GitHub**
2. Authorize Vercel to access your repositories
3. Click **Add New Project** → Select **GigShield** from the list
4. Click **Import**

### Step 3: Configure Environment Variables (⚠️ Important)
After importing, Vercel opens the configuration page:

**Under "Environment Variables", add:**
```
OPENWEATHER_API_KEY = your_key_from_openweathermap.org
ANTHROPIC_API_KEY = your_key_from_console.anthropic.com
```

> Without these keys, the app falls back to mock data. API keys are **never** exposed to the browser — they stay server-side only.

### Step 4: Deploy
Click **Deploy** and wait 2-3 minutes. You'll get a live URL:
```
https://gigshield.vercel.app
```

### Step 5: Auto-Redeploy
Every push to `main` automatically triggers a new deployment! 🔄

---

## 🔐 Security: Backend API Routes

All sensitive API calls now go through secure backend routes:

- **Weather** — `/api/weather` proxies requests (API key server-side)
- **AI Chat** — `/api/chat` proxies Claude requests (API key server-side)

Frontend never sees your API keys! ✅

---

## 🔧 Environment Setup

Create `.env.local` in the project root for local development:

```env
# Optional API Keys (falls back to realistic mock data without them)
OPENWEATHER_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

> Note: `.env.local` is in `.gitignore` — never committed. Each environment (local, staging, production) has its own secrets via Vercel's environment variable dashboard.

---

## 📋 Running Locally

```bash
npm install
npm run dev
```

Visit **http://localhost:3000**

The app works fully on localhost even without API keys (uses mock data). Add keys to `.env.local` to test real APIs locally.

## 📊 Premium Calculation

The app includes a premium calculator based on:
- **Base Risk** — Determined by pin code (15 Indian cities with NFI data)
- **Seasonal Factor** — Adjusts premium based on season (monsoon higher risk)
- **Heat Index** — Uses Rothfusz formula for perceived temperature
- **Tier Selection** — Worker chooses coverage level (₹100–₹500/week)

See `src/utils/premium.js` for calculation logic.

## 🎨 UI Components

Custom reusable components in `src/components/ui/`:
- **Badge** — Styled status indicators
- **StepDots** — Progress indicator for onboarding
- **NFIGauge** — Radial risk gauge visualization
- **Global Styles** — Consistent theming across app

## 🐛 Debugging

### Mock Data
- Weather, claims, fraud cases, and disruptions all use mock data for development
- See `src/data/mockData.js` for sample datasets
- Easily swap mock data with API calls

### Console Logs
Enable debug mode in components for detailed logs:
```javascript
const DEBUG = true;
DEBUG && console.log("Debug info:", data);
```

## ⚙️ Available Scripts

```bash
npm run dev       # Start dev server on http://localhost:3000
npm run build     # Create optimized production build
npm start         # Run production build
npm run lint      # ESLint code quality check
```

## 🔮 Phase 1 Prototype Status

### ✅ Completed Features
- Complete worker onboarding flow (4-step process)
- Live weather integration (with graceful mock fallback)
- AI-powered policy chat via Claude (server-side API route)
- Claims and payout visualization
- Insurer fraud detection dashboard with Isolation Forest signals
- **NEW** Secure backend API routes (weather + chat) for Vercel deployment

### 🚧 In Progress / Planned
- Payment processing (UPI flow is UI mockup, not integrated)
- Database integration (all data currently in-memory)
- PDF export (policy receipt download is simulated)
- WhatsApp real-time updates (enrollment flow visible, not connected)
- Real payment gateway integration (Razorpay UPI)

---

## 📝 Next Steps for Production

1. **Authentication System** — Add:
   - User registration and login (OAuth or JWT)
   - Session management
   - Role-based access (worker vs. insurer)

2. **Database** — Connect to:
   - PostgreSQL for user profiles, policies, claims
   - Redis for caching and sessions

3. **Real Integrations**:
   - UPI payments via Razorpay API
   - WhatsApp Business API for notifications
   - SMS alerts (Twilio)
   - Email infrastructure (SendGrid / AWS SES)

## 📄 License

This project is private/proprietary. © 2026 GigShield.

## 🤝 Contributors

Built as a parametric insurance solution prototype for gig workers in India.
## 🔗 Live Demo
Check out the project here: https://gigshie.vercel.app
