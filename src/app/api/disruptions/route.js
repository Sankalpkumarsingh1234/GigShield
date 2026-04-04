import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

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

    const { rows: alerts } = await query(
      `
      SELECT
        id, alert_id, alert_type, city, pin_code, severity,
        title, description, value, threshold, triggered, resolved,
        created_at
      FROM trigger_alerts
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIdx}
    `,
      params
    );

    const { rows: events } = await query(`
      SELECT
        id, event_type, city, pin_code, value, threshold,
        triggered, workers_affected, total_payout, severity,
        created_at
      FROM disruption_events
      ORDER BY created_at DESC
      LIMIT 10
    `);

    const feed = alerts.map((alert) => ({
      id: alert.id,
      type: alert.alert_type,
      icon: getIcon(alert.alert_type),
      title: alert.title,
      desc: alert.description,
      city: alert.city,
      pinCode: alert.pin_code,
      time: timeAgo(alert.created_at),
      severity: alert.severity,
      triggered: alert.triggered,
      value: alert.value,
    }));

    return Response.json({
      feed,
      events,
      meta: {
        total: feed.length,
        triggered: feed.filter((item) => item.triggered).length,
        cities: [...new Set(feed.map((item) => item.city))],
      },
    });
  } catch (error) {
    console.error("Disruptions feed error:", error);
    return Response.json({
      feed: [],
      events: [],
      error: error.message,
      _fallback: false,
    });
  }
}

function getIcon(type) {
  const icons = {
    rain: "🌧",
    heat: "🌡",
    aqi: "💨",
    flood: "🌊",
    platform: "📵",
    curfew: "🚧",
    outage: "📵",
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
