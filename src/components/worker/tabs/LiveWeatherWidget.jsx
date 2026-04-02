"use client";
import { useState, useEffect, useCallback } from "react";
import { MOCK_WEATHER } from "@/data/mockData";

const TRIGGER_THRESHOLDS = {
  heat: 42, aqi: 350, rain1h: 15, rain3h: 35,
};

export default function LiveWeatherWidget({ city }) {
  const [weather, setWeather]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [lastUpdated, setLast]  = useState(null);

  const fetchWeather = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/weather?city=${encodeURIComponent(city)}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setWeather(data);
      setLast(new Date());
    } catch (e) {
      console.warn("Weather fetch failed:", e.message);
      // Rich mock fallback
      const mock = MOCK_WEATHER[city] || MOCK_WEATHER.Chennai;
      setWeather({ ...mock, _source: "mock" });
      setLast(new Date());
    } finally {
      setLoading(false);
    }
  }, [city]);

  useEffect(() => {
    fetchWeather();
    // Refresh every 15 minutes
    const interval = setInterval(fetchWeather, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchWeather]);

  if (loading && !weather) {
    return (
      <div style={{ padding: "14px 16px", background: "#F0F9FF", border: "1.5px solid #BAE6FD", borderRadius: 14, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#3B82F6", animation: "pulse 1s infinite" }} />
          <span style={{ fontSize: 12, color: "#6B6258" }}>Fetching live weather for {city}…</span>
        </div>
      </div>
    );
  }

  if (!weather) return null;

  const heatTriggered  = weather.heatTriggered   || weather.feels >= TRIGGER_THRESHOLDS.heat;
  const aqiTriggered   = weather.aqiTriggered    || weather.aqi > TRIGGER_THRESHOLDS.aqi;
  const rainWarning    = weather.rainAlertPending || weather.rain1h > TRIGGER_THRESHOLDS.rain1h;
  const anyAlert       = heatTriggered || aqiTriggered || rainWarning;

  const borderColor = heatTriggered ? "#EF4444" : aqiTriggered ? "#8B5CF6" : rainWarning ? "#3B82F6" : "#BAE6FD";
  const bgColor     = heatTriggered ? "#FFF5F5" : aqiTriggered ? "#FAF5FF" : "#F0F9FF";

  function aqiColor(aqi) {
    if (aqi > 400) return "#DC2626";
    if (aqi > 350) return "#EF4444";
    if (aqi > 200) return "#F97316";
    if (aqi > 100) return "#F59E0B";
    return "#22C55E";
  }

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ padding: "14px 16px", background: bgColor, border: `1.5px solid ${borderColor}`, borderRadius: 14 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {weather.iconUrl ? (
                <img src={weather.iconUrl} alt={weather.desc} width={28} height={28} style={{ borderRadius: 6 }} />
              ) : (
                <span style={{ fontSize: 22 }}>🌤</span>
              )}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1512" }}>
                  Live Weather · {weather._city || city}
                </div>
                <div style={{ fontSize: 11, color: "#6B6258", textTransform: "capitalize" }}>{weather.desc}</div>
              </div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "serif", fontSize: 30, color: heatTriggered ? "#EF4444" : "#1A1512", lineHeight: 1 }}>
              {weather.temp}°C
            </div>
            <div style={{ fontSize: 9, color: "#9B9589" }}>actual temperature</div>
          </div>
        </div>

        {/* Metrics grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 10 }}>
          {[
            {
              label: "Feels like", value: `${weather.feels}°C`,
              alert: heatTriggered, color: heatTriggered ? "#EF4444" : "#1A1512",
              bg: heatTriggered ? "#FEF2F2" : "#fff", border: heatTriggered ? "#FECACA" : "#E0D9D0",
              badge: heatTriggered ? "⚡ TRIGGER" : null,
            },
            {
              label: "Humidity",   value: `${weather.humidity}%`,
              alert: weather.humidity > 80, color: "#1A1512",
              bg: weather.humidity > 80 ? "#FFFBEB" : "#fff", border: weather.humidity > 80 ? "#FDE68A" : "#E0D9D0",
            },
            {
              label: "Wind",       value: `${weather.wind} km/h`,
              alert: false, color: "#1A1512", bg: "#fff", border: "#E0D9D0",
            },
            {
              label: "AQI",        value: weather.aqi,
              alert: aqiTriggered, color: aqiColor(weather.aqi),
              bg: aqiTriggered ? "#FAF5FF" : "#fff", border: aqiTriggered ? "#C4B5FD" : "#E0D9D0",
              badge: aqiTriggered ? "⚡ TRIGGER" : null,
            },
          ].map((m, i) => (
            <div key={i} style={{ padding: "7px 6px", background: m.bg, borderRadius: 8, textAlign: "center", border: `1px solid ${m.border}` }}>
              <div style={{ fontFamily: "serif", fontSize: 15, color: m.color, fontWeight: 700 }}>{m.value}</div>
              <div style={{ fontSize: 9, color: "#9B9589", marginTop: 1 }}>{m.label}</div>
              {m.badge && (
                <div style={{ fontSize: 7, fontWeight: 700, color: "#EF4444", marginTop: 1 }}>{m.badge}</div>
              )}
            </div>
          ))}
        </div>

        {/* Extended metrics row (if available) */}
        {(weather.rain1h != null || weather.pressure || weather.pm25 != null) && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 10 }}>
            {[
              { label: "Rain 1h", value: weather.rain1h != null ? `${weather.rain1h} mm` : "–", alert: weather.rain1h > 15 },
              { label: "Rain 3h", value: weather.rain3h != null ? `${weather.rain3h} mm` : "–", alert: weather.rain3h > 35 },
              { label: "PM2.5",   value: weather.pm25 != null ? `${Math.round(weather.pm25)} µg` : "–", alert: weather.pm25 > 60 },
            ].map((m, i) => (
              <div key={i} style={{ padding: "5px 6px", background: m.alert ? "#FEF3C7" : "#FAFAF8", borderRadius: 6, textAlign: "center", border: `1px solid ${m.alert ? "#FDE68A" : "#E0D9D0"}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: m.alert ? "#92400E" : "#1A1512" }}>{m.value}</div>
                <div style={{ fontSize: 9, color: "#9B9589" }}>{m.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Active trigger alerts */}
        {anyAlert && (
          <div style={{ padding: "9px 11px", background: heatTriggered ? "#FEE2E2" : aqiTriggered ? "#EDE9FE" : "#DBEAFE", borderRadius: 10, fontSize: 12, fontWeight: 600, color: heatTriggered ? "#991B1B" : aqiTriggered ? "#5B21B6" : "#1E40AF", marginBottom: 8 }}>
            {heatTriggered && `🌡 Heat Index ${weather.feels}°C exceeds 42°C threshold → payout active`}
            {!heatTriggered && aqiTriggered && `💨 AQI ${weather.aqi} exceeds 350 threshold → payout active`}
            {!heatTriggered && !aqiTriggered && rainWarning && `🌧 Rain ${weather.rain1h}mm/hr — approaching 35mm/2hr threshold`}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 9, color: "#9B9589" }}>
            {weather._source === "openweathermap" ? "🟢 Live · OpenWeatherMap" : "⚠ Mock data (add OPENWEATHER_API_KEY)"}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 9, color: "#9B9589" }}>
              {lastUpdated ? lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
            </span>
            <button
              onClick={fetchWeather}
              disabled={loading}
              style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, border: "1px solid #E0D9D0", background: "#fff", color: "#6B6258", cursor: "pointer" }}
            >
              {loading ? "…" : "↺"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}