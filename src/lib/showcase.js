const CITY_FIXTURES = [
  { city: "Chennai", pinCodes: ["600028", "600001", "600020"], nfi: 78, weather: { temp: 33, humidity: 84, rain1h: 28, rain3h: 61, aqi: 118 } },
  { city: "Mumbai", pinCodes: ["400053", "400012", "400001"], nfi: 72, weather: { temp: 31, humidity: 86, rain1h: 18, rain3h: 42, aqi: 101 } },
  { city: "Delhi", pinCodes: ["110001", "110092", "110034"], nfi: 74, weather: { temp: 35, humidity: 48, rain1h: 0,  rain3h: 0,  aqi: 387 } },
  { city: "Hyderabad", pinCodes: ["500001", "500081", "500032"], nfi: 65, weather: { temp: 38, humidity: 57, rain1h: 6,  rain3h: 18, aqi: 92 } },
  { city: "Bangalore", pinCodes: ["560034", "560001", "560066"], nfi: 52, weather: { temp: 27, humidity: 69, rain1h: 4,  rain3h: 12, aqi: 84 } },
  { city: "Jaipur", pinCodes: ["302001", "302012", "302017"], nfi: 58, weather: { temp: 37, humidity: 36, rain1h: 0,  rain3h: 0,  aqi: 126 } },
  { city: "Ahmedabad", pinCodes: ["380015", "380009", "380001"], nfi: 63, weather: { temp: 39, humidity: 41, rain1h: 0,  rain3h: 0,  aqi: 148 } },
];

const NAME_POOL = [
  ["Aarav", "K."], ["Vihaan", "R."], ["Arjun", "S."], ["Reyansh", "P."],
  ["Aditya", "M."], ["Krishna", "T."], ["Ishaan", "N."], ["Rohan", "D."],
  ["Priya", "V."], ["Ananya", "L."], ["Kavya", "A."], ["Sneha", "J."],
  ["Meera", "C."], ["Nisha", "B."], ["Riya", "G."], ["Pooja", "H."],
];

const TIER_CONFIG = {
  basic: {
    premium: 29,
    maxPayout: 500,
    coverage: ["Heavy rain", "Flooding"],
    baseMultiplier: 0.35,
  },
  standard: {
    premium: 49,
    maxPayout: 1000,
    coverage: ["Rain", "Flooding", "AQI", "Curfew"],
    baseMultiplier: 0.42,
  },
  premium: {
    premium: 72,
    maxPayout: 2000,
    coverage: ["Rain", "Flooding", "AQI", "Curfew", "Heat Stress", "Platform outage"],
    baseMultiplier: 0.5,
  },
};

const SHOWCASE_EMAIL_DOMAIN = "demo.gigshield.local";

function calcHeatIndex(tempC, humidity) {
  const T = tempC;
  const R = humidity;
  const hi =
    -8.78469475556 +
    1.61139411 * T +
    2.3385491 * R -
    0.14611605 * T * R -
    0.012308094 * T * T -
    0.016424828 * R * R +
    0.002211732 * T * T * R +
    0.00072546 * T * R * R -
    0.000003582 * T * T * R * R;
  return Math.round(Math.max(tempC, hi) * 10) / 10;
}

function toOpenWeatherAqiNumber(owmAqi) {
  const mapping = { 1: 25, 2: 75, 3: 150, 4: 250, 5: 400 };
  return mapping[owmAqi] || 50;
}

function computePremium(tier, nfi, hasClaimDiscount) {
  const cfg = TIER_CONFIG[tier] || TIER_CONFIG.standard;
  const seasonal = nfi >= 70 ? 6 : 2;
  const risk = Math.round((nfi / 100) * 12);
  const discount = hasClaimDiscount ? Math.round(cfg.premium * 0.12) : 0;
  return Math.max(cfg.premium, cfg.premium + risk + seasonal - discount);
}

function calcPayout(tier, value, threshold) {
  const cfg = TIER_CONFIG[tier] || TIER_CONFIG.standard;
  const excessRatio = Math.max(0, (value - threshold) / threshold);
  const severityBonus = Math.min(0.35, excessRatio * 0.8);
  const multiplier = cfg.baseMultiplier + severityBonus;
  return Math.max(Math.round(cfg.maxPayout * 0.3), Math.min(cfg.maxPayout, Math.round(cfg.maxPayout * multiplier)));
}

function eventTitle(type, city) {
  return {
    rain: `Heavy Rainfall Alert - ${city}`,
    heat: `Heat Stress Alert - ${city}`,
    aqi: `Severe AQI Warning - ${city}`,
    flood: `Waterlogging Alert - ${city}`,
    outage: `Platform Downtime - ${city}`,
    curfew: `Zone Curfew - ${city}`,
  }[type] || `Disruption Alert - ${city}`;
}

function eventDescription(type, value, threshold, city, pinCode) {
  switch (type) {
    case "rain":
      return `${value}mm rain equivalent in ${city} exceeded the ${threshold}mm threshold.`;
    case "heat":
      return `Feels-like temperature reached ${value}C in ${city}, above the ${threshold}C worker safety threshold.`;
    case "aqi":
      return `AQI hit ${value} in ${city}, above the severe threshold of ${threshold}.`;
    case "flood":
      return `Waterlogging risk is elevated in ${pinCode} with rainfall accumulation at ${value}mm.`;
    case "outage":
      return `Platform outage persisted for ${value} minutes in ${city}, breaching the ${threshold}-minute SLA.`;
    case "curfew":
      return `Section 144 style civic restriction marked for ${pinCode}, enabling a parametric payout review.`;
    default:
      return `${city} event recorded at ${value} against threshold ${threshold}.`;
  }
}

function recentIso(offsetHours) {
  return new Date(Date.now() - offsetHours * 60 * 60 * 1000).toISOString();
}

function seededSignals(score, triggerType, city) {
  return [
    {
      label: "GPS vs event zone",
      value: Math.min(98, score + 8),
      desc: `Location ping showed edge-of-zone behavior for ${city} during ${triggerType}.`,
      flag: score >= 75,
    },
    {
      label: "Claim frequency",
      value: Math.max(18, score - 6),
      desc: "Recent claim frequency compared against zone baseline.",
      flag: score >= 68,
    },
    {
      label: "Activity pattern",
      value: Math.max(24, score - 12),
      desc: "Platform activity partially overlapped with the disruption window.",
      flag: score >= 82,
    },
    {
      label: "Earnings baseline",
      value: Math.max(16, score - 18),
      desc: "Claimed amount measured against trailing earnings average.",
      flag: score >= 88,
    },
  ];
}

async function ensureUser(q, user) {
  const existing = await q(
    `SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
    [user.email]
  );

  if (existing.rows[0]?.id) {
    await q(
      `UPDATE users
       SET name = $1, phone = $2, platform = $3, pin_code = $4, earnings = $5, nfi = $6, role = $7, updated_at = NOW()
       WHERE id = $8`,
      [user.name, user.phone, user.platform, user.pin_code, user.earnings, user.nfi, user.role || "worker", existing.rows[0].id]
    );
    return existing.rows[0].id;
  }

  const inserted = await q(
    `INSERT INTO users (name, email, password_hash, phone, platform, pin_code, earnings, nfi, role)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [user.name, user.email, user.password_hash || null, user.phone, user.platform, user.pin_code, user.earnings, user.nfi, user.role || "worker"]
  );
  return inserted.rows[0].id;
}

async function ensurePolicy(q, userId, tier, premium, activatedAt) {
  const active = await q(
    `SELECT id FROM policies WHERE user_id = $1 AND active = true ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  const cfg = TIER_CONFIG[tier] || TIER_CONFIG.standard;

  if (active.rows[0]?.id) {
    await q(
      `UPDATE policies
       SET tier = $1, premium = $2, max_payout = $3, coverage = $4, activated_at = $5, next_billing_date = $5::timestamptz + INTERVAL '7 days', updated_at = NOW()
       WHERE id = $6`,
      [tier, premium, cfg.maxPayout, cfg.coverage, activatedAt, active.rows[0].id]
    );
    return active.rows[0].id;
  }

  const inserted = await q(
    `INSERT INTO policies
      (user_id, tier, premium, max_payout, coverage, active, activated_at, next_billing_date, total_paid_in, total_paid_out)
     VALUES ($1, $2, $3, $4, $5, true, $6, $6::timestamptz + INTERVAL '7 days', 0, 0)
     RETURNING id`,
    [userId, tier, premium, cfg.maxPayout, cfg.coverage, activatedAt]
  );
  return inserted.rows[0].id;
}

function buildShowcaseWorkers() {
  const workers = [];

  for (let i = 0; i < 28; i++) {
    const cityFixture = CITY_FIXTURES[i % CITY_FIXTURES.length];
    const [first, suffix] = NAME_POOL[i % NAME_POOL.length];
    const citySlug = cityFixture.city.toLowerCase();
    const tier = i % 6 === 0 ? "premium" : i % 3 === 0 ? "basic" : "standard";
    const hasClaimDiscount = i % 4 !== 0;
    workers.push({
      index: i + 1,
      name: `${first} ${suffix}`,
      email: `worker${String(i + 1).padStart(2, "0")}@${SHOWCASE_EMAIL_DOMAIN}`,
      phone: `+91-90000${String(1000 + i).slice(-4)}`,
      platform: i % 2 === 0 ? "Zomato" : "Swiggy",
      city: cityFixture.city,
      pin_code: cityFixture.pinCodes[i % cityFixture.pinCodes.length],
      earnings: 4200 + (i % 7) * 650 + Math.floor(i / 7) * 450,
      nfi: Math.min(92, cityFixture.nfi + (i % 5) * 3 - 4),
      tier,
      premium: computePremium(tier, cityFixture.nfi + (i % 5) * 3, hasClaimDiscount),
      citySlug,
      riskWeather: cityFixture.weather,
    });
  }

  return workers;
}

function buildScenarioEvents() {
  return [
    { key: "rain", label: "Heavy Rainfall", city: "Chennai", pin_code: "600028", value: 58.2, threshold: 35, severity: "high", source: "showcase_seed", triggered: true, offsetHours: 0.2 },
    { key: "flood", label: "Waterlogging", city: "Chennai", pin_code: "600028", value: 82, threshold: 35, severity: "high", source: "showcase_seed", triggered: true, offsetHours: 2 },
    { key: "aqi", label: "AQI Warning", city: "Delhi", pin_code: "110092", value: 387, threshold: 350, severity: "high", source: "showcase_seed", triggered: true, offsetHours: 3.5 },
    { key: "heat", label: "Heat Stress", city: "Hyderabad", pin_code: "500001", value: 44.1, threshold: 42, severity: "high", source: "showcase_seed", triggered: true, offsetHours: 5 },
    { key: "outage", label: "Platform Downtime", city: "Mumbai", pin_code: "400053", value: 95, threshold: 90, severity: "medium", source: "showcase_seed", triggered: true, offsetHours: 7 },
    { key: "curfew", label: "Zone Curfew", city: "Delhi", pin_code: "110001", value: 1, threshold: 1, severity: "high", source: "showcase_seed", triggered: true, offsetHours: 9 },
    { key: "rain", label: "Heavy Rainfall", city: "Mumbai", pin_code: "400012", value: 28, threshold: 35, severity: "low", source: "showcase_seed", triggered: false, offsetHours: 12 },
    { key: "heat", label: "Heat Stress", city: "Ahmedabad", pin_code: "380015", value: 41.1, threshold: 42, severity: "medium", source: "showcase_seed", triggered: false, offsetHours: 18 },
    { key: "aqi", label: "AQI Warning", city: "Bangalore", pin_code: "560034", value: 180, threshold: 350, severity: "low", source: "showcase_seed", triggered: false, offsetHours: 24 },
    { key: "rain", label: "Heavy Rainfall", city: "Hyderabad", pin_code: "500081", value: 41, threshold: 35, severity: "medium", source: "showcase_seed", triggered: true, offsetHours: 30 },
  ];
}

async function reseedCleanup(q) {
  await q(`DELETE FROM fraud_cases WHERE case_id LIKE 'DEMO-%' OR case_id LIKE 'LIVE-%'`);
  await q(`DELETE FROM claims WHERE claim_id LIKE 'DEMO-%' OR claim_id LIKE 'LIVE-%'`);
  await q(`DELETE FROM premium_payments WHERE payment_id LIKE 'DEMO-%'`);
  await q(`DELETE FROM trigger_alerts WHERE alert_id LIKE 'DEMO-%' OR alert_id LIKE 'LIVE-%' OR source IN ('showcase_seed', 'live_weather')`);
  await q(`DELETE FROM disruption_events WHERE source IN ('showcase_seed', 'live_weather')`);
  await q(`DELETE FROM policies WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)`, [`%@${SHOWCASE_EMAIL_DOMAIN}`]);
  await q(`DELETE FROM users WHERE email LIKE $1`, [`%@${SHOWCASE_EMAIL_DOMAIN}`]);
}

export async function seedShowcaseData(q, options = {}) {
  const { force = false } = options;
  const summary = {
    workers: 0,
    policies: 0,
    payments: 0,
    claims: 0,
    fraudCases: 0,
    disruptions: 0,
    alerts: 0,
  };

  if (force) {
    await reseedCleanup(q);
  }

  const workers = buildShowcaseWorkers();
  const scenarios = buildScenarioEvents();
  const workerRecords = [];

  for (const worker of workers) {
    const userId = await ensureUser(q, {
      name: worker.name,
      email: worker.email,
      phone: worker.phone,
      platform: worker.platform,
      pin_code: worker.pin_code,
      earnings: worker.earnings,
      nfi: worker.nfi,
      role: "worker",
    });
    summary.workers += 1;

    const activatedAt = new Date(Date.now() - (worker.index + 21) * 24 * 60 * 60 * 1000).toISOString();
    const policyId = await ensurePolicy(q, userId, worker.tier, worker.premium, activatedAt);
    summary.policies += 1;

    workerRecords.push({ ...worker, userId, policyId });

    for (let week = 0; week < 8; week++) {
      const paymentDate = new Date(Date.now() - (7 - week) * 7 * 24 * 60 * 60 * 1000);
      await q(
        `INSERT INTO premium_payments
          (payment_id, policy_id, worker_id, amount, status, upi_ref, billing_period, created_at)
         VALUES ($1, $2, $3, $4, 'success', $5, $6, $7)
         ON CONFLICT (payment_id) DO NOTHING`,
        [
          `DEMO-PAY-${String(worker.index).padStart(2, "0")}-${week + 1}`,
          policyId,
          userId,
          worker.premium,
          `GS${String(5000000000 + worker.index * 100 + week).slice(-10)}`,
          paymentDate.toISOString().slice(0, 10),
          paymentDate.toISOString(),
        ]
      );
      summary.payments += 1;
    }
  }

  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i];
    const createdAt = recentIso(scenario.offsetHours);
    const workersInCity = workerRecords.filter((w) => w.city === scenario.city);
    const affectedWorkers = scenario.triggered ? Math.min(workersInCity.length, 3 + (i % 4)) : 0;
    const avgPayout = scenario.triggered
      ? workersInCity.slice(0, affectedWorkers).reduce((sum, worker) => sum + calcPayout(worker.tier, scenario.value, scenario.threshold), 0)
      : 0;

    await q(
      `INSERT INTO disruption_events
        (event_type, city, pin_code, value, threshold, triggered, workers_affected, total_payout, severity, source, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        scenario.label,
        scenario.city,
        scenario.pin_code,
        scenario.value,
        scenario.threshold,
        scenario.triggered,
        affectedWorkers,
        avgPayout,
        scenario.severity,
        scenario.source,
        createdAt,
      ]
    );
    summary.disruptions += 1;

    await q(
      `INSERT INTO trigger_alerts
        (alert_id, alert_type, city, pin_code, severity, title, description, value, threshold, triggered, source, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (alert_id) DO NOTHING`,
      [
        `DEMO-ALT-${String(i + 1).padStart(3, "0")}`,
        scenario.key,
        scenario.city,
        scenario.pin_code,
        scenario.severity,
        eventTitle(scenario.key, scenario.city),
        eventDescription(scenario.key, scenario.value, scenario.threshold, scenario.city, scenario.pin_code),
        scenario.value,
        scenario.threshold,
        scenario.triggered,
        scenario.source,
        createdAt,
      ]
    );
    summary.alerts += 1;
  }

  let claimSerial = 1;
  let fraudSerial = 1;

  for (const worker of workerRecords) {
    const relevantScenarios = scenarios.filter((scenario) => scenario.city === worker.city && scenario.triggered);
    const claimCount = worker.index % 5 === 0 ? 3 : worker.index % 2 === 0 ? 2 : 1;
    let totalPaidOut = 0;

    for (let j = 0; j < Math.min(claimCount, relevantScenarios.length); j++) {
      const scenario = relevantScenarios[j];
      const triggerValue = scenario.key === "heat"
        ? calcHeatIndex(worker.riskWeather.temp + j, worker.riskWeather.humidity)
        : scenario.value;
      const amount = calcPayout(worker.tier, triggerValue, scenario.threshold);
      const claimDate = new Date(Date.now() - (claimSerial * 5 + worker.index) * 24 * 60 * 60 * 1000).toISOString();
      const claimId = `DEMO-CLM-${String(claimSerial).padStart(4, "0")}`;
      const fraudScore = (worker.index + j) % 7 === 0 ? 82 : 12 + ((worker.index * 9 + j * 11) % 46);

      await q(
        `INSERT INTO claims
          (claim_id, worker_id, policy_id, trigger_type, trigger_value, city, pin_code, amount, status, upi_ref, fraud_score, paid_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'paid', $9, $10, $11, $12)
         ON CONFLICT (claim_id) DO NOTHING`,
        [
          claimId,
          String(worker.userId),
          worker.policyId,
          scenario.label,
          triggerValue,
          worker.city,
          worker.pin_code,
          amount,
          `GS${String(7000000000 + claimSerial * 17).slice(-10)}`,
          fraudScore,
          claimDate,
          claimDate,
        ]
      );
      summary.claims += 1;
      totalPaidOut += amount;

      if (fraudScore >= 75) {
        await q(
          `INSERT INTO fraud_cases
            (case_id, worker_name, worker_id, pin_code, trigger_type, fraud_score, signals, status, claim_id, claim_amount, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9, $10)
           ON CONFLICT (case_id) DO NOTHING`,
          [
            `DEMO-FRD-${String(fraudSerial).padStart(3, "0")}`,
            worker.name,
            String(worker.userId),
            worker.pin_code,
            scenario.label,
            fraudScore,
            JSON.stringify(seededSignals(fraudScore, scenario.label, worker.city)),
            claimId,
            amount,
            claimDate,
          ]
        );
        summary.fraudCases += 1;
        fraudSerial += 1;
      }

      claimSerial += 1;
    }

    await q(
      `UPDATE policies
       SET total_paid_in = $1, total_paid_out = $2, updated_at = NOW()
       WHERE id = $3`,
      [worker.premium * 8, totalPaidOut, worker.policyId]
    );
  }

  return summary;
}

const LIVE_CITY_COORDS = {
  Chennai: { lat: 13.0827, lon: 80.2707, pin_code: "600028", pin_codes: ["600028", "600001", "600020"] },
  Mumbai: { lat: 19.076, lon: 72.8777, pin_code: "400053", pin_codes: ["400053", "400012", "400001"] },
  Delhi: { lat: 28.7041, lon: 77.1025, pin_code: "110001", pin_codes: ["110001", "110092", "110034"] },
  Hyderabad: { lat: 17.385, lon: 78.4867, pin_code: "500001", pin_codes: ["500001", "500081", "500032"] },
  Bangalore: { lat: 12.9716, lon: 77.5946, pin_code: "560034", pin_codes: ["560034", "560001", "560066"] },
  Jaipur: { lat: 26.9124, lon: 75.7873, pin_code: "302001", pin_codes: ["302001", "302012", "302017"] },
  Ahmedabad: { lat: 23.0225, lon: 72.5714, pin_code: "380015", pin_codes: ["380015", "380009", "380001"] },
};

function liveScenariosFromWeather(city, weather, aqiNumber) {
  const feels = calcHeatIndex(weather.temp, weather.humidity);
  const rainEquivalent = Math.max((weather.rain1h || 0) * 2, Math.round(((weather.rain3h || 0) * 2) / 3 * 10) / 10);
  const scenarios = [
    {
      type: "heat",
      label: "Heat Stress",
      value: feels,
      threshold: 42,
      triggered: feels >= 42,
      severity: feels >= 46 ? "high" : feels >= 42 ? "medium" : "low",
    },
    {
      type: "aqi",
      label: "AQI Warning",
      value: aqiNumber,
      threshold: 350,
      triggered: aqiNumber > 350,
      severity: aqiNumber > 400 ? "high" : aqiNumber > 350 ? "medium" : "low",
    },
    {
      type: "rain",
      label: "Heavy Rainfall",
      value: rainEquivalent,
      threshold: 35,
      triggered: rainEquivalent > 35,
      severity: rainEquivalent > 60 ? "high" : rainEquivalent > 35 ? "medium" : "low",
    },
    {
      type: "flood",
      label: "Waterlogging",
      value: weather.rain3h || weather.rain1h || 0,
      threshold: 35,
      triggered: (weather.rain3h || 0) > 35 || (weather.rain1h || 0) > 20,
      severity: (weather.rain3h || 0) > 55 ? "high" : ((weather.rain3h || 0) > 35 || (weather.rain1h || 0) > 20) ? "medium" : "low",
    },
  ];

  return scenarios.map((scenario) => ({ ...scenario, city }));
}

async function fetchCityWeather(apiKey, city) {
  const coords = LIVE_CITY_COORDS[city];
  const cityQuery = `${city},IN`;
  const [weatherRes, aqiRes] = await Promise.all([
    fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityQuery)}&appid=${apiKey}&units=metric`, { cache: "no-store" }),
    fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${coords.lat}&lon=${coords.lon}&appid=${apiKey}`, { cache: "no-store" }),
  ]);

  if (!weatherRes.ok) {
    throw new Error(`Weather fetch failed for ${city}: ${weatherRes.status}`);
  }

  const weatherData = await weatherRes.json();
  const aqiData = aqiRes.ok ? await aqiRes.json() : null;
  const aqi = aqiData?.list?.[0]?.main?.aqi || null;

  return {
    temp: Math.round((weatherData.main?.temp || 0) * 10) / 10,
    humidity: weatherData.main?.humidity || 0,
    rain1h: weatherData.rain?.["1h"] || 0,
    rain3h: weatherData.rain?.["3h"] || 0,
    aqiNumber: aqi ? toOpenWeatherAqiNumber(aqi) : 50,
  };
}

export async function ingestLiveWeatherDisruptions(q, options = {}) {
  const {
    apiKey,
    cities = Object.keys(LIVE_CITY_COORDS),
    recordClaims = true,
  } = options;

  if (!apiKey) {
    throw new Error("OPENWEATHER_API_KEY is required for live ingestion");
  }

  const summary = { checkedCities: 0, eventsInserted: 0, alertsUpserted: 0, claimsCreated: 0 };
  const now = new Date();
  const hourStamp = now.toISOString().slice(0, 13).replace(/[-T:]/g, "");

  for (const city of cities) {
    const coords = LIVE_CITY_COORDS[city];
    if (!coords) continue;

    const weather = await fetchCityWeather(apiKey, city);
    const scenarios = liveScenariosFromWeather(city, weather, weather.aqiNumber);
    summary.checkedCities += 1;

    for (const scenario of scenarios.filter((item) => item.triggered)) {
      const alertId = `LIVE-${city.toUpperCase()}-${scenario.type}-${hourStamp}`;
      const eventExists = await q(
        `SELECT id FROM disruption_events
         WHERE source = 'live_weather'
           AND city = $1
           AND event_type = $2
           AND created_at >= NOW() - INTERVAL '55 minutes'
         LIMIT 1`,
        [city, scenario.label]
      );

      if (!eventExists.rows[0]?.id) {
        await q(
          `INSERT INTO disruption_events
            (event_type, city, pin_code, value, threshold, triggered, workers_affected, total_payout, severity, source, created_at)
           VALUES ($1, $2, $3, $4, $5, true, 0, 0, $6, 'live_weather', NOW())`,
          [scenario.label, city, coords.pin_code, scenario.value, scenario.threshold, scenario.severity]
        );
        summary.eventsInserted += 1;
      }

      await q(
        `INSERT INTO trigger_alerts
          (alert_id, alert_type, city, pin_code, severity, title, description, value, threshold, triggered, resolved, source, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, false, 'live_weather', NOW())
         ON CONFLICT (alert_id) DO UPDATE SET
           severity = EXCLUDED.severity,
           title = EXCLUDED.title,
           description = EXCLUDED.description,
           value = EXCLUDED.value,
           threshold = EXCLUDED.threshold,
           triggered = true,
           resolved = false,
           resolved_at = NULL,
           source = 'live_weather',
           created_at = NOW()`,
        [
          alertId,
          scenario.type,
          city,
          coords.pin_code,
          scenario.severity,
          eventTitle(scenario.type, city),
          eventDescription(scenario.type, scenario.value, scenario.threshold, city, coords.pin_code),
          scenario.value,
          scenario.threshold,
        ]
      );
      summary.alertsUpserted += 1;

      if (!recordClaims) continue;

      const { rows: workers } = await q(
        `SELECT u.id, u.name, u.pin_code, p.id AS policy_id, p.tier
         FROM users u
         JOIN policies p ON p.user_id = u.id AND p.active = true
         WHERE u.pin_code = ANY($1::text[])`,
        [coords.pin_codes || [coords.pin_code]]
      ).catch(() => ({ rows: [] }));

      const workerRows = workers.length
        ? workers
        : (await q(
            `SELECT u.id, u.name, u.pin_code, p.id AS policy_id, p.tier
             FROM users u
             JOIN policies p ON p.user_id = u.id AND p.active = true
             WHERE u.pin_code = $1`,
            [coords.pin_code]
          )).rows;

      for (let i = 0; i < workerRows.slice(0, 4).length; i++) {
        const worker = workerRows[i];
        const claimId = `LIVE-CLM-${hourStamp}-${city.toUpperCase()}-${scenario.type}-${i + 1}`;
        const amount = calcPayout(worker.tier, scenario.value, scenario.threshold);

        await q(
          `INSERT INTO claims
            (claim_id, worker_id, policy_id, trigger_type, trigger_value, city, pin_code, amount, status, upi_ref, fraud_score, paid_at, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'paid', $9, 10, NOW(), NOW())
           ON CONFLICT (claim_id) DO NOTHING`,
          [
            claimId,
            String(worker.id),
            worker.policy_id,
            scenario.label,
            scenario.value,
            city,
            worker.pin_code || coords.pin_code,
            amount,
            `GS${String(8800000000 + i + summary.claimsCreated).slice(-10)}`,
          ]
        );

        await q(
          `UPDATE policies
           SET total_paid_out = total_paid_out + $1, updated_at = NOW()
           WHERE id = $2`,
          [amount, worker.policy_id]
        );
        summary.claimsCreated += 1;
      }
    }
  }

  return summary;
}
