export const TIERS = [
  { id: "basic",    name: "Basic",    base: 25, max: 500,  color: "#4CAF82", bg: "#E8F5EE",  coverage: ["Heavy rain", "Flooding"] },
  { id: "standard", name: "Standard", base: 45, max: 1000, color: "#F59E0B", bg: "#FEF3C7",  coverage: ["Rain", "Flooding", "AQI", "Curfew"] },
  { id: "premium",  name: "Premium",  base: 70, max: 2000, color: "#EF4444", bg: "#FEE2E2",  coverage: ["Rain", "Flooding", "AQI", "Curfew", "Heat Stress", "Platform outage"] },
];

export const DISRUPTION_FEED = [
  { id: 1, type: "rain",     icon: "🌧", title: "Heavy Rainfall Alert", desc: "58mm in 2 hrs — threshold crossed",      city: "Chennai",   time: "2 min ago",  severity: "high"   },
  { id: 2, type: "heat",     icon: "🌡", title: "Heat Stress Index",     desc: "Feels-like 44°C — outdoor work unsafe", city: "Hyderabad", time: "8 min ago",  severity: "high"   },
  { id: 3, type: "aqi",      icon: "💨", title: "Severe AQI Warning",    desc: "AQI 387 — Very Poor air quality",        city: "Delhi",     time: "15 min ago", severity: "medium" },
  { id: 4, type: "flood",    icon: "🌊", title: "Waterlogging Alert",    desc: "Pin-code 600028 — Red alert issued",     city: "Chennai",   time: "22 min ago", severity: "high"   },
  { id: 5, type: "platform", icon: "📵", title: "Platform Downtime",     desc: "Swiggy outage detected — 95 min",        city: "Mumbai",    time: "31 min ago", severity: "medium" },
  { id: 6, type: "curfew",   icon: "🚧", title: "Local Curfew",          desc: "Section 144 — Shahdara zone",            city: "Delhi",     time: "45 min ago", severity: "high"   },
];

export const CLAIMS_HISTORY = [
  { id: "CLM001", date: "Mar 12, 2025", trigger: "Heavy Rainfall",    city: "Chennai",   amount: 420 },
  { id: "CLM002", date: "Feb 28, 2025", trigger: "Heat Stress",       city: "Hyderabad", amount: 310 },
  { id: "CLM003", date: "Feb 10, 2025", trigger: "AQI Warning",       city: "Delhi",     amount: 190 },
  { id: "CLM004", date: "Jan 22, 2025", trigger: "Platform Downtime", city: "Mumbai",    amount: 250 },
  { id: "CLM005", date: "Jan 05, 2025", trigger: "Waterlogging",      city: "Chennai",   amount: 500 },
];

export const WHATSAPP_FLOW = [
  { from: "user", text: "Hi" },
  { from: "bot",  text: "Welcome to GigShield! Income protection for Zomato & Swiggy partners.\n\nReply with your name to get started." },
  { from: "user", text: "Ravi Kumar" },
  { from: "bot",  text: "Hi Ravi! Which platform do you ride for?\n\n1 Zomato\n2 Swiggy" },
  { from: "user", text: "1" },
  { from: "bot",  text: "Got it — Zomato\n\nShare your operating pin code so I can check your zone's risk score." },
  { from: "user", text: "600001" },
  { from: "bot",  text: "Anna Nagar, Chennai — NFI Risk Score: 72/100 (High)\n\nThis zone had 28 disruption days last year. Without coverage, you'd lose ~1,440/month.\n\nYour recommended plan: Standard (54/week)\n\nReply YES to activate" },
  { from: "user", text: "YES" },
  { from: "bot",  text: "GigShield Standard activated!\n\n- Weekly premium: 54 (debited every Monday)\n- Max payout: 1,000/week\n- Coverage: Rain, Flood, AQI, Curfew\n\nYou'll get alerts before disruptions and auto-payouts when triggers fire. Stay safe!" },
];

export const INSURER_STATS = {
  totalWorkers: 12847, activePolicies: 9234,
  premiumThisWeek: 487980, claimsThisWeek: 312,
  claimsPaid: 284700, lossRatio: 58.3, fraudFlagged: 14,
};

export const ZONE_RISK_MAP = [
  { city: "Chennai",   pin: "600028", nfi: 81, workers: 1420, activeClaims: 42 },
  { city: "Delhi",     pin: "110092", nfi: 77, workers:  980, activeClaims: 28 },
  { city: "Chennai",   pin: "600001", nfi: 72, workers: 1780, activeClaims: 38 },
  { city: "Mumbai",    pin: "400053", nfi: 74, workers: 2100, activeClaims: 31 },
  { city: "Hyderabad", pin: "500001", nfi: 69, workers:  870, activeClaims: 19 },
  { city: "Delhi",     pin: "110001", nfi: 65, workers: 1340, activeClaims: 22 },
  { city: "Bangalore", pin: "560034", nfi: 55, workers:  920, activeClaims: 11 },
  { city: "Jaipur",    pin: "302001", nfi: 52, workers:  540, activeClaims:  8 },
  { city: "Bangalore", pin: "560001", nfi: 38, workers: 1100, activeClaims:  6 },
  { city: "Mumbai",    pin: "400050", nfi: 28, workers:  890, activeClaims:  3 },
];

export const FRAUD_CASES = [
  {
    id: "FRD-041", worker: "Anand S.", pin: "600028", trigger: "Waterlogging", score: 87,
    signals: [
      { label: "GPS vs flood zone",   value: 94, desc: "Location 2.4km outside declared flood zone at trigger time", flag: true  },
      { label: "Claim frequency",     value: 62, desc: "4th claim in 6 weeks — above zone average of 1.2",           flag: true  },
      { label: "Activity pattern",    value: 71, desc: "App showed active deliveries during claimed disruption",      flag: true  },
      { label: "Historical baseline", value: 38, desc: "Prior claims aligned with zone disruptions",                  flag: false },
    ],
  },
  {
    id: "FRD-042", worker: "Priya M.", pin: "110001", trigger: "AQI Warning", score: 54,
    signals: [
      { label: "GPS vs AQI zone",  value: 22, desc: "Location matches AQI-affected zone accurately",    flag: false },
      { label: "Claim frequency",  value: 81, desc: "3 claims in 8 days — statistical anomaly",         flag: true  },
      { label: "Activity pattern", value: 43, desc: "App offline during trigger window — consistent",   flag: false },
      { label: "Duplicate check",  value: 66, desc: "Similar claim pattern detected across 2 accounts", flag: true  },
    ],
  },
  {
    id: "FRD-043", worker: "Mohan R.", pin: "400053", trigger: "Platform Downtime", score: 91,
    signals: [
      { label: "Duplicate submission", value: 98, desc: "Identical claim submitted via 2 device fingerprints",    flag: true },
      { label: "GPS vs zone",          value: 88, desc: "Location metadata inconsistent across submissions",       flag: true },
      { label: "Earnings baseline",    value: 74, desc: "Claimed amount 3x higher than 12-week average earnings", flag: true },
      { label: "Platform logs",        value: 55, desc: "Partial platform activity logged during outage window",   flag: true },
    ],
  },
];

export const CITY_WEATHER_IDS = {
  Chennai: "Chennai,IN", Mumbai: "Mumbai,IN", Delhi: "Delhi,IN",
  Bangalore: "Bangalore,IN", Hyderabad: "Hyderabad,IN",
  Jaipur: "Jaipur,IN", Ahmedabad: "Ahmedabad,IN",
};

export const MOCK_WEATHER = {
  Chennai:   { temp: 34, humidity: 78, feels: 41, desc: "Partly cloudy", wind: 14, aqi: 82  },
  Mumbai:    { temp: 31, humidity: 82, feels: 38, desc: "Humid",          wind: 18, aqi: 95  },
  Delhi:     { temp: 29, humidity: 45, feels: 31, desc: "Hazy sunshine",  wind:  9, aqi: 187 },
  Hyderabad: { temp: 37, humidity: 55, feels: 43, desc: "Hot & sunny",    wind: 11, aqi: 74  },
  Bangalore: { temp: 26, humidity: 68, feels: 28, desc: "Overcast",       wind:  8, aqi: 61  },
  Jaipur:    { temp: 35, humidity: 38, feels: 37, desc: "Sunny & dry",    wind: 12, aqi: 110 },
  Ahmedabad: { temp: 38, humidity: 42, feels: 42, desc: "Very hot",       wind:  7, aqi: 128 },
};
