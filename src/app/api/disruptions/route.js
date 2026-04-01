import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/disruptions — live disruption feed for worker/insurer dashboards
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city");
    const limit = parseInt(searchParams.get("limit") || "20");
    const triggeredOnly = searchParams.get("triggered") === "true";

    let whereClause = "WHERE 1=1";
    const params = [];
    let paramIdx = 1;

    if (city) {
      whereClause += ` AND city = $${paramIdx++}`;
      params.push(city);
    }
    if (triggeredOnly) {
      whereClause += ` AND triggered = true`;
    }

    params.push(Math.min(limit, 50));

    const { rows: alerts } = await query(`
      SELECT
        id, alert_id, alert_type, city, pin_code, severity,
        title, description, value, threshold, triggered, resolved,
        created_at
      FROM trigger_alerts
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIdx}
    `, params);

    // Also get recent disruption events for the feed
    const { rows: events } = await query(`
      SELECT
        id, event_type, city, pin_code, value, threshold,
        triggered, workers_affected, total_payout, severity,
        created_at
      FROM disruption_events
      ORDER BY created_at DESC
      LIMIT 10
    `);

    // Merge and format for the frontend feed format
    const feed = alerts.map(a => ({
      id: a.id,
      type: a.alert_type,
      icon: getIcon(a.alert_type),
      title: a.title,
      desc: a.description,
      city: a.city,
      pinCode: a.pin_code,
      time: timeAgo(a.created_at),
      severity: a.severity,
      triggered: a.triggered,
      value: a.value,
    }));

    return Response.json({
      feed,
      events,
      meta: {
        total: feed.length,
        triggered: feed.filter(f => f.triggered).length,
        cities: [...new Set(feed.map(f => f.city))],
      },
    });
  } catch (err) {
    console.error("Disruptions feed error:", err);
    // Return fallback mock feed
    return Response.json({
      feed: FALLBACK_FEED,
      events: [],
      _fallback: true,
    });
  }
}

function getIcon(type) {
  const icons = {
    rain: "🌧", heat: "🌡", aqi: "💨", flood: "🌊",
    platform: "📵", curfew: "🚧", outage: "📵",
  };
  return icons[type] || "⚡";
}

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} days ago`;
}

const FALLBACK_FEED = [
  { id: 1, type: "rain",     icon: "🌧", title: "Heavy Rainfall Alert",  desc: "58mm in 2 hrs — threshold crossed",      city: "Chennai",   time: "2 min ago",  severity: "high"   },
  { id: 2, type: "heat",     icon: "🌡", title: "Heat Stress Index",      desc: "Feels-like 44°C — outdoor work unsafe",  city: "Hyderabad", time: "8 min ago",  severity: "high"   },
  { id: 3, type: "aqi",      icon: "💨", title: "Severe AQI Warning",     desc: "AQI 387 — Very Poor air quality",         city: "Delhi",     time: "15 min ago", severity: "medium" },
  { id: 4, type: "flood",    icon: "🌊", title: "Waterlogging Alert",     desc: "Pin-code 600028 — Red alert issued",      city: "Chennai",   time: "22 min ago", severity: "high"   },
  { id: 5, type: "platform", icon: "📵", title: "Platform Downtime",      desc: "Swiggy outage detected — 95 min",         city: "Mumbai",    time: "31 min ago", severity: "medium" },
  { id: 6, type: "curfew",   icon: "🚧", title: "Local Curfew",           desc: "Section 144 — Shahdara zone",             city: "Delhi",     time: "45 min ago", severity: "high"   },
];