import { ingestLiveWeatherDisruptions } from "@/lib/showcase";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

function parseCities(searchParams) {
  const raw = searchParams.get("cities") || searchParams.get("city") || "";
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function GET(request) {
  return POST(request);
}

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const cities = parseCities(searchParams);
    const recordClaims = searchParams.get("record_claims") !== "false";

    const summary = await ingestLiveWeatherDisruptions(query, {
      apiKey: process.env.OPENWEATHER_API_KEY,
      cities: cities.length ? cities : undefined,
      recordClaims,
    });

    return Response.json({
      success: true,
      source: "openweathermap",
      recordClaims,
      ...summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Live disruption ingest failed:", error);
    return Response.json({
      success: false,
      error: error.message,
      hint: "Add OPENWEATHER_API_KEY and call /api/disruptions/ingest?cities=Chennai,Delhi",
    }, { status: 500 });
  }
}
