# GigShield — Frontend

React/Next.js frontend for the GigShield parametric insurance platform.

## Quick start

```bash
npm install
npm run dev
# → http://localhost:3000
```

## Project structure

```
src/
  app/                      # Next.js app router
    page.jsx                # Entry point — app shell
    layout.jsx              # HTML shell + metadata
  data/
    pinRisk.js              # Pin-code → NFI risk data (15 cities)
    mockData.js             # Tiers, disruptions, claims, fraud cases, weather
  utils/
    premium.js              # calcPremium(), calcHeatIndex(), getSeasonalFactor()
  components/
    ui/
      index.jsx             # Badge, StepDots, NFIGauge, shared styles
    worker/
      OnboardingScreen.jsx  # Step 1 — name, platform, pin code, earnings
      RiskScreen.jsx        # Step 2 — NFI gauge + premium factor breakdown
      PolicyScreen.jsx      # Step 3 — tier selection + weekly premium calc
      DashboardScreen.jsx   # Step 4 — worker dashboard (8 tabs)
      tabs/
        LiveWeatherWidget.jsx  # OpenWeatherMap live API + graceful fallback
        AIChatAssistant.jsx    # Claude-powered chat, policy-context aware
        HeatStressCard.jsx     # Rothfusz formula, live sliders
        DisruptionMap.jsx      # SVG India map with pulsing city alerts
        ClaimsHistory.jsx      # Past 5 claims with total
        PolicyReceipt.jsx      # Policy card + PDF download (simulated)
        WhatsAppScreen.jsx     # Animated WhatsApp enrollment flow
        UPIPaymentFlow.jsx     # 4-stage animated UPI payout pipeline
    insurer/
      InsurerDashboard.jsx   # Admin view (4 tabs — Overview/Fraud AI/Zones/Forecast)
      FraudScoreVisualiser.jsx # Isolation Forest signal breakdown per claim
```

## Environment variables

Create `.env.local` for API keys:

```env
# Optional — falls back to realistic mock data without a key
NEXT_PUBLIC_OPENWEATHER_API_KEY=your_key_here
```

> The AI Chat tab calls the Anthropic API from the client.  
> For production, proxy this through an API route to keep keys server-side.
