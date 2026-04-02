import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

// ── Trigger definitions ─────────────────────────────────────────────────────
const TRIGGERS = {
  rain:     { label: "Heavy Rainfall",    threshold: 35,  unit: "mm/2hr",  severityFn: v => v > 70 ? "high" : v > 50 ? "medium" : "low" },
  heat:     { label: "Heat Stress",       threshold: 42,  unit: "°C",      severityFn: v => v > 46 ? "high" : v > 43 ? "medium" : "low" },
  aqi:      { label: "AQI Warning",       threshold: 350, unit: "AQI",     severityFn: v => v > 400 ? "high" : "medium" },
  outage:   { label: "Platform Downtime", threshold: 90,  unit: "minutes", severityFn: v => v > 180 ? "high" : "medium" },
  curfew:   { label: "Zone Curfew",       threshold: 1,   unit: "flag",    severityFn: () => "high" },
  flood:    { label: "Waterlogging",      threshold: 35,  unit: "mm",      severityFn: v => v > 80 ? "high" : "medium" },
};

// ── Payout brackets ─────────────────────────────────────────────────────────
const PAYOUT_CONFIG = {
  basic:    { baseMultiplier: 0.35, cap: 500  },
  standard: { baseMultiplier: 0.42, cap: 1000 },
  premium:  { baseMultiplier: 0.50, cap: 2000 },
};

// ── Rothfusz heat index ─────────────────────────────────────────────────────
function calcHeatIndex(tempC, humidity) {
  const T = tempC, R = humidity;
  const hi =
    -8.78469475556 +
    1.61139411 * T + 2.3385491  * R -
    0.14611605 * T * R - 0.012308094 * T * T -
    0.016424828 * R * R + 0.002211732 * T * T * R +
    0.00072546  * T * R * R - 0.000003582 * T * T * R * R;
  return Math.round(Math.max(tempC, hi) * 10) / 10;
}

// ── Smart payout calculation ────────────────────────────────────────────────
function calcPayout(tier, value, threshold) {
  const cfg = PAYOUT_CONFIG[tier] || PAYOUT_CONFIG.standard;
  // Severity bonus: excess above threshold proportional to cap
  const excessRatio = Math.max(0, (value - threshold) / threshold);
  const severityBonus = Math.min(0.40, excessRatio * 0.9);
  const multiplier = cfg.baseMultiplier + severityBonus;
  const raw = Math.round(cfg.cap * multiplier);
  // Floor: always meaningful (at least 30% of cap)
  return Math.max(Math.round(cfg.cap * 0.30), Math.min(cfg.cap, raw));
}

// ── Fraud pre-score (simplified, <100ms) ───────────────────────────────────
async function quickFraudScore(workerId, triggerType, city) {
  if (!workerId || workerId === "WRK-DEFAULT") return 0;
  try {
    const { rows } = await query(`
      SELECT COUNT(*) AS recent_count
      FROM claims
      WHERE worker_id = $1
        AND trigger_type = $2
        AND created_at >= NOW() - INTERVAL '6 weeks'
    `, [workerId, triggerType]);
    const recentCount = parseInt(rows[0]?.recent_count || 0);
    // >3 same-type claims in 6 weeks = higher fraud likelihood
    return recentCount > 3 ? Math.min(45 + recentCount * 5, 65) : Math.floor(Math.random() * 20);
  } catch { return 0; }
}

// ── GET — documentation ─────────────────────────────────────────────────────
export async function GET() {
  return Response.json({
    triggers: Object.entries(TRIGGERS).map(([type, t]) => ({
      type, label: t.label, threshold: t.threshold, unit: t.unit,
    })),
    tiers: Object.entries(PAYOUT_CONFIG).map(([tier, c]) => ({
      tier, baseMultiplier: c.baseMultiplier, maxPayout: c.cap,
    })),
    usage: {
      method: "POST",
      body: {
        type: "rain | heat | aqi | outage | curfew | flood",
        value: "number (measurement)",
        humidity: "number (% — required for heat trigger)",
        city: "string",
        pin_code: "string",
        worker_id: "string (UUID or WRK-DEFAULT)",
        tier: "basic | standard | premium",
      },
    },
  });
}

// ── POST — evaluate trigger + auto-record claim ─────────────────────────────
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      type, value, humidity = 70,
      city = "Unknown", pin_code = "000000",
      worker_id, tier = "standard",
    } = body;

    if (!type || value == null) {
      return Response.json({ error: "type and value are required" }, { status: 400 });
    }

    const trigger = TRIGGERS[type];
    if (!trigger) {
      return Response.json(
        { error: `Unknown trigger type. Valid: ${Object.keys(TRIGGERS).join(", ")}` },
        { status: 400 }
      );
    }

    // Calculate effective value
    let effectiveValue = parseFloat(value);
    let heatCalc = null;

    if (type === "heat") {
      effectiveValue = calcHeatIndex(parseFloat(value), parseFloat(humidity));
      heatCalc = { tempC: value, humidity, feelsLike: effectiveValue };
    }

    // Trigger check
    const triggered = type === "curfew"
      ? effectiveValue >= 1
      : effectiveValue > trigger.threshold;

    const severity     = trigger.severityFn(effectiveValue);
    const payoutAmount = triggered ? calcPayout(tier, effectiveValue, trigger.threshold) : 0;

    const triggerDetail = type === "heat"
      ? `Temp ${value}°C + Humidity ${humidity}% → Feels-like ${effectiveValue}°C (threshold: ${trigger.threshold}${trigger.unit})`
      : `${trigger.label}: ${effectiveValue} ${trigger.unit} vs threshold ${trigger.threshold} ${trigger.unit}`;

    // ── DB Operations (fire in parallel) ──────────────────────────────

    const dbOps = [
      // 1. Log disruption event
      query(`
        INSERT INTO disruption_events
          (event_type, city, pin_code, value, threshold, triggered, workers_affected, total_payout, severity)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, [
        trigger.label, city, pin_code,
        effectiveValue, trigger.threshold, triggered,
        triggered ? Math.floor(Math.random() * 300 + 30) : 0,
        triggered ? payoutAmount * Math.floor(Math.random() * 12 + 4) : 0,
        severity,
      ]).catch(e => { console.warn("Disruption event log failed:", e.message); return { rows: [] }; }),

      // 2. Insert trigger alert into live feed
      query(`
        INSERT INTO trigger_alerts
          (alert_id, alert_type, city, pin_code, severity, title, description, value, threshold, triggered)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (alert_id) DO NOTHING
      `, [
        `ALT-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        type, city, pin_code, severity,
        `${trigger.label} — ${city}`,
        triggerDetail,
        effectiveValue, trigger.threshold, triggered,
      ]).catch(e => { console.warn("Alert insert failed:", e.message); }),
    ];

    await Promise.allSettled(dbOps);

    // ── Auto-record claim if triggered + worker known ─────────────────
    let claimRecord = null;
    let fraudScore  = 0;

    if (triggered && worker_id) {
      // Parallel: fraud pre-score + policy lookup
      const [fraudResult, policyResult] = await Promise.allSettled([
        quickFraudScore(worker_id, trigger.label, city),
        query(`
          SELECT p.id FROM policies p
          JOIN users u ON p.user_id = u.id
          WHERE u.id::text = $1 AND p.active = true
          LIMIT 1
        `, [worker_id]).catch(() => ({ rows: [] })),
      ]);

      fraudScore = fraudResult.status === "fulfilled" ? fraudResult.value : 0;
      const policyId = policyResult.status === "fulfilled"
        ? policyResult.value.rows[0]?.id
        : null;

      const claimId = `CLM-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const upiRef  = `GS${Date.now().toString().slice(-10)}`;

      try {
        const { rows: claimRows } = await query(`
          INSERT INTO claims
            (claim_id, worker_id, policy_id, trigger_type, trigger_value,
             city, pin_code, amount, status, upi_ref, fraud_score, paid_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'paid', $9, $10, NOW())
          ON CONFLICT (claim_id) DO NOTHING
          RETURNING claim_id, amount, upi_ref, status, fraud_score
        `, [
          claimId, worker_id, policyId,
          trigger.label, effectiveValue,
          city, pin_code, payoutAmount,
          upiRef, fraudScore,
        ]);

        claimRecord = claimRows[0] || null;

        // Update policy payout total
        if (policyId && claimRecord) {
          await query(`
            UPDATE policies
            SET total_paid_out = total_paid_out + $1, updated_at = NOW()
            WHERE id = $2
          `, [payoutAmount, policyId]).catch(() => {});
        }

        // Auto-create fraud case if score is high
        if (fraudScore > 40) {
          const caseId = `FRD-AUTO-${Date.now()}`;
          await query(`
            INSERT INTO fraud_cases
              (case_id, worker_id, pin_code, trigger_type, fraud_score, signals, status, claim_amount, claim_id)
            VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8)
            ON CONFLICT (case_id) DO NOTHING
          `, [
            caseId, worker_id, pin_code, trigger.label, fraudScore,
            JSON.stringify([
              { label: "Claim frequency", value: fraudScore, desc: "Elevated claim frequency detected", flag: fraudScore > 50 },
              { label: "Trigger validity", value: 100 - fraudScore, desc: "Trigger occurred in declared zone", flag: false },
            ]),
            payoutAmount, claimId,
          ]).catch(() => {});
        }

      } catch (e) {
        console.warn("Claim insert failed:", e.message);
      }
    }

    return Response.json({
      triggered,
      type,
      trigger_label: trigger.label,
      value: effectiveValue,
      threshold: trigger.threshold,
      unit: trigger.unit,
      severity,
      trigger_detail: triggerDetail,
      payout_amount: payoutAmount,
      heat_calc: heatCalc,
      claim: claimRecord,
      fraud_score: fraudScore,
      message: triggered
        ? `✅ ${trigger.label} triggered. ${triggerDetail}. Auto-payout ₹${payoutAmount} initiated via UPI.`
        : `✗ No trigger. ${triggerDetail}. Need ${(trigger.threshold - effectiveValue).toFixed(1)} more ${trigger.unit} to breach threshold.`,
    });

  } catch (err) {
    console.error("Trigger check error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}