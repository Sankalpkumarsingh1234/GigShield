import { query } from "@/lib/db";

const THRESHOLDS = {
  rain:   { value: 35,  unit: "mm/2hr",  label: "Heavy Rainfall"    },
  heat:   { value: 42,  unit: "°C",      label: "Heat Stress"       },
  aqi:    { value: 350, unit: "AQI",     label: "AQI Warning"       },
  outage: { value: 90,  unit: "minutes", label: "Platform Downtime" },
};

function calcHeatIndex(tempC, humidity) {
  const T = tempC, R = humidity;
  const hi =
    -8.78469475556 +
    1.61139411 * T +
    2.3385491  * R -
    0.14611605 * T * R -
    0.012308094 * T * T -
    0.016424828 * R * R +
    0.002211732 * T * T * R +
    0.00072546  * T * R * R -
    0.000003582 * T * T * R * R;
  return Math.round(Math.max(tempC, hi));
}

// GET /api/triggers/check — return available thresholds
export async function GET() {
  return Response.json({
    thresholds: THRESHOLDS,
    usage: "POST with { type: 'rain'|'heat'|'aqi'|'outage', value: number, humidity?: number, city?, pin_code?, worker_id?, tier? }",
  });
}

// POST /api/triggers/check — evaluate a trigger and optionally record a claim
export async function POST(request) {
  try {
    const body = await request.json();
    const { type, value, humidity, city, pin_code, worker_id, tier } = body;

    if (!type || value == null) {
      return Response.json({ error: "type and value are required" }, { status: 400 });
    }

    const threshold = THRESHOLDS[type];
    if (!threshold) {
      return Response.json(
        { error: `Unknown trigger type: ${type}. Valid types: rain, heat, aqi, outage` },
        { status: 400 }
      );
    }

    let effectiveValue = value;
    let triggered = false;
    let triggerDetail = "";

    if (type === "heat") {
      effectiveValue = calcHeatIndex(value, humidity || 70);
      triggered = effectiveValue >= threshold.value;
      triggerDetail = `Temp ${value}°C + Humidity ${humidity || 70}% → Feels-like ${effectiveValue}°C (threshold: ${threshold.value}°C)`;
    } else {
      triggered = effectiveValue > threshold.value;
      triggerDetail = `${threshold.label}: ${effectiveValue}${threshold.unit} (threshold: ${threshold.value}${threshold.unit})`;
    }

    const MAX_PAYOUT = { basic: 500, standard: 1000, premium: 2000 };
    const tierMax = MAX_PAYOUT[tier] || 1000;
    const payoutAmount = triggered
      ? Math.round(tierMax * (0.4 + Math.random() * 0.3))
      : 0;

    // Log the disruption event
    try {
      await query(
        `INSERT INTO disruption_events
           (event_type, city, pin_code, value, threshold, triggered, workers_affected)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          threshold.label,
          city || "Unknown",
          pin_code || "000000",
          effectiveValue,
          threshold.value,
          triggered,
          triggered ? Math.floor(Math.random() * 500 + 50) : 0,
        ]
      );
    } catch (_) { /* non-critical, don't fail the request */ }

    // Auto-record claim if triggered and worker_id provided
    if (triggered && worker_id) {
      const claimId = `CLM-${Date.now()}`;
      try {
        await query(
          `INSERT INTO claims
             (claim_id, worker_id, trigger_type, trigger_value, city, amount, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'paid')
           ON CONFLICT (claim_id) DO NOTHING`,
          [claimId, worker_id, threshold.label, effectiveValue, city || "Unknown", payoutAmount]
        );
      } catch (_) { /* non-critical */ }
    }

    return Response.json({
      triggered,
      type,
      threshold_label: threshold.label,
      value: effectiveValue,
      threshold: threshold.value,
      unit: threshold.unit,
      trigger_detail: triggerDetail,
      payout_amount: payoutAmount,
      message: triggered
        ? `✅ Trigger fired: ${threshold.label}. ${triggerDetail}. Auto-payout: ₹${payoutAmount}.`
        : `✗ No trigger: ${triggerDetail}. ${threshold.value - effectiveValue}${threshold.unit} below threshold.`,
    });
  } catch (err) {
    console.error("Trigger check error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}