// src/data/exclusions.js
// Standard parametric insurance exclusions with actuarial metadata
// Based on ISO/Lloyd's parametric guidelines and Indian IRDAI regulations

export const EXCLUSION_CATEGORIES = [
  {
    id: "force_majeure",
    label: "Force Majeure & Catastrophic Events",
    icon: "☢",
    color: "#DC2626",
    bg: "#FEF2F2",
    border: "#FECACA",
    exclusions: [
      {
        id: "war",
        title: "War & Armed Conflict",
        desc: "Direct losses caused by declared or undeclared war, invasion, acts of foreign enemies, civil war, rebellion, revolution, insurrection, military or usurped power.",
        triggerImpact: "ALL triggers suspended",
        irdaiRef: "IRDAI/REG/2016-17/139",
        riskReason: "Uncorrelated, systemic, uninsurable tail risk",
        active: true,
        severity: "absolute",
      },
      {
        id: "nuclear",
        title: "Nuclear, Radiological & Chemical Events",
        desc: "Ionizing radiation or radioactive contamination. Chemical, biological, radiological or nuclear weapons. Government-ordered evacuations due to such events.",
        triggerImpact: "ALL triggers suspended",
        irdaiRef: "IRDAI/REG/2016-17/139",
        riskReason: "Catastrophic correlation across entire portfolio",
        active: true,
        severity: "absolute",
      },
      {
        id: "pandemic_declared",
        title: "WHO-Declared Pandemic",
        desc: "Disruptions solely attributable to a WHO Phase 6 pandemic declaration. AQI, heat, or platform triggers activated during a declared pandemic are still eligible if causally unrelated to the pandemic.",
        triggerImpact: "Payout suspended unless causal independence proven",
        irdaiRef: "IRDAI Circular 2020-04",
        riskReason: "Simultaneous claim surge destroys solvency margin",
        active: true,
        severity: "conditional",
      },
      {
        id: "terrorism",
        title: "Terrorism & Politically Motivated Acts",
        desc: "Losses directly resulting from acts of terrorism as defined under India's Unlawful Activities (Prevention) Act. Platform outages caused by government-directed shutdowns following terrorist events.",
        triggerImpact: "Platform Outage & Curfew triggers suspended",
        irdaiRef: "IRDAI/REG/Terrorism/2019",
        riskReason: "Government pool covers; duplicative coverage disallowed",
        active: true,
        severity: "absolute",
      },
    ],
  },
  {
    id: "government_action",
    label: "Government & Regulatory Actions",
    icon: "🏛",
    color: "#7C3AED",
    bg: "#F5F3FF",
    border: "#DDD6FE",
    exclusions: [
      {
        id: "planned_curfew",
        title: "Planned / Scheduled Curfews",
        desc: "Section 144 orders issued with more than 48 hours notice for festivals, elections, VIP visits, or scheduled civic events. Only unplanned emergency curfews trigger payouts.",
        triggerImpact: "Curfew trigger requires <48hr notice",
        irdaiRef: "GigShield Parametric Schedule v2.1",
        riskReason: "Workers can plan around known disruptions; moral hazard",
        active: true,
        severity: "conditional",
      },
      {
        id: "platform_regulation",
        title: "Regulatory Platform Shutdowns",
        desc: "Outages mandated by DPIIT, CCI, or state food safety authorities under regulatory action. Differs from commercial outages — these reflect policy risk, not operational risk.",
        triggerImpact: "Platform Outage trigger suspended",
        irdaiRef: "IT Act Sec 69A compliant",
        riskReason: "Regulatory events cluster — single order affects all policyholders",
        active: true,
        severity: "absolute",
      },
      {
        id: "internet_shutdown",
        title: "Government-Ordered Internet Shutdowns",
        desc: "Platform downtime arising solely from internet shutdowns ordered under Section 144 CrPC or Temporary Suspension of Telecom Services Rules 2017.",
        triggerImpact: "Platform Outage trigger suspended; AQI data gaps noted",
        irdaiRef: "DoT Circular 2020-23",
        riskReason: "100% geographic correlation — all platform triggers fire simultaneously",
        active: true,
        severity: "absolute",
      },
    ],
  },
  {
    id: "fraud_misrepresentation",
    label: "Fraud & Misrepresentation",
    icon: "🔍",
    color: "#D97706",
    bg: "#FFFBEB",
    border: "#FDE68A",
    exclusions: [
      {
        id: "location_fraud",
        title: "GPS Spoofing & Location Fraud",
        desc: "Claims where GPS metadata indicates the worker was more than 3km outside the declared operating pin-code at trigger time, with location confidence score <70%.",
        triggerImpact: "ALL triggers voided; fraud score >75 auto-flags",
        irdaiRef: "GigShield Anti-Fraud Policy v1.4",
        riskReason: "Isolation Forest signals: 94% precision on GPS anomalies",
        active: true,
        severity: "void",
      },
      {
        id: "false_declaration",
        title: "Material Misrepresentation at Enrollment",
        desc: "Deliberate misrepresentation of operating zone, earnings, or platform affiliation at policy inception. Discovered mismatches between declared pin-code and >60% of GPS pings void coverage retroactively.",
        triggerImpact: "Policy voidable ab initio; premiums not refunded",
        irdaiRef: "Insurance Act 1938, Sec 45",
        riskReason: "Adverse selection destroys risk pool integrity",
        active: true,
        severity: "void",
      },
      {
        id: "collusion",
        title: "Organized Claim Collusion",
        desc: "Coordinated fraudulent claims by two or more persons sharing device fingerprints, IP addresses, or GPS clusters inconsistent with genuine delivery activity.",
        triggerImpact: "ALL claims from linked accounts suspended pending investigation",
        irdaiRef: "IPC Sec 420/468 referral",
        riskReason: "Network fraud detected via graph-based anomaly model",
        active: true,
        severity: "void",
      },
    ],
  },
  {
    id: "data_quality",
    label: "Data & Sensor Integrity",
    icon: "📡",
    color: "#0891B2",
    bg: "#ECFEFF",
    border: "#A5F3FC",
    exclusions: [
      {
        id: "sensor_failure",
        title: "Weather Station Sensor Failure",
        desc: "Trigger measurements from stations flagged as malfunctioning by IMD quality control. Backup stations within 15km are used; if none available, trigger suspended for that window.",
        triggerImpact: "Trigger delayed until valid data restored (max 6hr window)",
        irdaiRef: "IMD Data Quality Protocol",
        riskReason: "Erroneous payouts from faulty readings undermine actuarial models",
        active: true,
        severity: "delay",
      },
      {
        id: "api_outage",
        title: "Data Provider API Outage (>4hr)",
        desc: "Extended OpenWeatherMap, CPCB AQI, or Swiggy/Zomato platform data outages exceeding 4 hours that prevent trigger evaluation. The trigger window extends, not expires.",
        triggerImpact: "Trigger evaluation window extended by outage duration",
        irdaiRef: "GigShield SLA v3.0",
        riskReason: "Prevents phantom triggers from data gaps; preserves parity",
        active: true,
        severity: "delay",
      },
      {
        id: "retroactive_data",
        title: "Retroactive Data Amendments",
        desc: "IMD or CPCB data revisions made more than 72 hours after the original measurement. Trigger evaluations are locked at T+72hr based on data available at that time.",
        triggerImpact: "Payouts not revised after 72hr data lock",
        irdaiRef: "GigShield Parametric Schedule v2.1",
        riskReason: "Operational certainty required; retrospective adjustments create disputes",
        active: true,
        severity: "lock",
      },
    ],
  },
  {
    id: "policy_conditions",
    label: "Policy Conditions & Waiting Periods",
    icon: "📋",
    color: "#059669",
    bg: "#ECFDF5",
    border: "#A7F3D0",
    exclusions: [
      {
        id: "waiting_period",
        title: "3-Day Waiting Period",
        desc: "No payouts for triggers occurring within 72 hours of policy inception or reinstatement. Applies to new policies and lapsed policies reinstated after >30 days.",
        triggerImpact: "ALL triggers suspended for 72hr post-activation",
        irdaiRef: "IRDAI Health Circular 2020/14 (adapted)",
        riskReason: "Anti-selection: workers enrolling only when disruption imminent",
        active: true,
        severity: "conditional",
      },
      {
        id: "lapse",
        title: "Lapsed Policy (>7 Days Unpaid)",
        desc: "Coverage automatically suspends if weekly premium is not received within 7 days of billing date. A 24-hour grace period applies. Reinstatement requires payment + 72hr waiting period.",
        triggerImpact: "ALL triggers suspended until premium reinstated",
        irdaiRef: "GigShield Policy Terms Sec 8.3",
        riskReason: "Premium continuity is the quid pro quo for coverage continuity",
        active: true,
        severity: "suspend",
      },
      {
        id: "geographic_limit",
        title: "Outside Declared Operating Zone",
        desc: "Triggers only valid when the worker's GPS is within 5km of their declared operating pin-code centroid. Workers operating in multiple zones must declare all zones.",
        triggerImpact: "Trigger voided if GPS >5km from pin-code centroid",
        irdaiRef: "GigShield Schedule of Covered Zones",
        riskReason: "Risk premium is zone-specific; cross-zone arbitrage destroys NFI pricing",
        active: true,
        severity: "void",
      },
    ],
  },
];

// ── Actuarial constants ─────────────────────────────────────────────────────

export const EXCLUSION_SEVERITY_META = {
  absolute:    { label: "Absolute Exclusion",    color: "#DC2626", bg: "#FEF2F2" },
  conditional: { label: "Conditional Exclusion",  color: "#D97706", bg: "#FFF7ED" },
  void:        { label: "Voids Coverage",         color: "#7C3AED", bg: "#F5F3FF" },
  delay:       { label: "Delays Trigger",         color: "#0891B2", bg: "#ECFEFF" },
  suspend:     { label: "Suspends Coverage",      color: "#6B7280", bg: "#F9FAFB" },
  lock:        { label: "Locks Evaluation",       color: "#059669", bg: "#ECFDF5" },
};

// ── Loss development triangle (12-month run-off, standard actuarial) ────────
// Rows = accident months, Cols = development months 1-12
// Values = cumulative paid loss ratio (%)

export const LOSS_TRIANGLE = {
  periods: ["Apr '24", "May '24", "Jun '24", "Jul '24", "Aug '24", "Sep '24", "Oct '24", "Nov '24", "Dec '24", "Jan '25", "Feb '25", "Mar '25"],
  development: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  data: [
    [38.2, 44.1, 48.7, 51.2, 53.1, 54.4, 55.0, 55.6, 55.9, 56.1, 56.2, 56.3],
    [41.7, 47.3, 52.1, 55.0, 57.2, 58.8, 59.4, 60.1, 60.5, 60.7, 60.8, null],
    [35.4, 39.8, 43.6, 46.1, 48.0, 49.2, 49.9, 50.4, 50.7, 50.9, null, null],
    [62.3, 71.4, 78.2, 82.5, 85.6, 87.8, 89.1, 89.9, 90.4, null, null, null], // monsoon spike
    [71.2, 81.8, 89.5, 94.3, 97.8, 100.2, 101.4, 102.1, null, null, null, null], // heavy monsoon
    [58.3, 66.9, 73.2, 77.3, 80.2, 82.3, 83.6, null, null, null, null, null],
    [29.1, 33.4, 36.6, 38.7, 40.2, 41.3, null, null, null, null, null, null],
    [31.8, 36.5, 40.1, 42.4, 44.0, null, null, null, null, null, null, null],
    [44.2, 50.8, 55.7, 58.8, null, null, null, null, null, null, null, null],
    [38.9, 44.7, 49.0, null, null, null, null, null, null, null, null, null],
    [51.6, 59.3, null, null, null, null, null, null, null, null, null, null],
    [47.3, null, null, null, null, null, null, null, null, null, null, null],
  ],
};

// ── Premium adequacy model (per tier, per NFI band) ─────────────────────────

export const PREMIUM_ADEQUACY = {
  bands: ["NFI 0-30", "NFI 31-50", "NFI 51-65", "NFI 66-80", "NFI 81-100"],
  tiers: {
    basic: {
      targetLossRatio: 0.60,
      expenseRatio:    0.22,
      profitLoad:      0.08,
      cat_loading:     0.10,
      premiumByBand:   [18, 22, 27, 32, 38],
      breakEvenByBand: [16, 20, 24, 29, 35],
      adequacy:        [1.13, 1.10, 1.13, 1.10, 1.09], // >1.0 = adequate
    },
    standard: {
      targetLossRatio: 0.58,
      expenseRatio:    0.20,
      profitLoad:      0.10,
      cat_loading:     0.12,
      premiumByBand:   [32, 39, 48, 57, 68],
      breakEvenByBand: [29, 35, 43, 52, 62],
      adequacy:        [1.10, 1.11, 1.12, 1.10, 1.10],
    },
    premium: {
      targetLossRatio: 0.55,
      expenseRatio:    0.18,
      profitLoad:      0.12,
      cat_loading:     0.15,
      premiumByBand:   [52, 63, 77, 92, 110],
      breakEvenByBand: [46, 56, 69, 83, 99],
      adequacy:        [1.13, 1.13, 1.12, 1.11, 1.11],
    },
  },
};

// ── Return period table (for catastrophe loading) ────────────────────────────

export const RETURN_PERIODS = [
  { period: "1-in-2",   label: "Annual",       lossRatio: 0.58, premiumImpact: "+0%",  scenario: "Normal monsoon, avg AQI" },
  { period: "1-in-5",   label: "5-Year",       lossRatio: 0.74, premiumImpact: "+12%", scenario: "Heavy monsoon + heat spike" },
  { period: "1-in-10",  label: "10-Year",      lossRatio: 0.89, premiumImpact: "+18%", scenario: "Chennai 2015-scale floods" },
  { period: "1-in-25",  label: "25-Year",      lossRatio: 1.08, premiumImpact: "+28%", scenario: "Multi-city simultaneous triggers" },
  { period: "1-in-50",  label: "50-Year",      lossRatio: 1.31, premiumImpact: "+38%", scenario: "War/pandemic exclusion stress test" },
  { period: "1-in-100", label: "100-Year",     lossRatio: 1.62, premiumImpact: "+52%", scenario: "Worst-case climate scenario" },
  { period: "1-in-200", label: "200-Year PML", lossRatio: 2.04, premiumImpact: "+68%", scenario: "Solvency II SCR reference point" },
];