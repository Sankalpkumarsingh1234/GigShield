"use client";
import { useState } from "react";

const CITIES = [
  { name: "Delhi",     x: 285, y: 115, nfi: 71, alerts: 3, color: "#EF4444" },
  { name: "Jaipur",   x: 235, y: 148, nfi: 52, alerts: 1, color: "#F59E0B" },
  { name: "Ahmedabad",x: 185, y: 195, nfi: 63, alerts: 2, color: "#EF4444" },
  { name: "Mumbai",   x: 195, y: 245, nfi: 51, alerts: 2, color: "#F59E0B" },
  { name: "Hyderabad",x: 275, y: 285, nfi: 57, alerts: 2, color: "#F59E0B" },
  { name: "Bangalore",x: 255, y: 335, nfi: 47, alerts: 1, color: "#F59E0B" },
  { name: "Chennai",  x: 300, y: 330, nfi: 77, alerts: 4, color: "#EF4444" },
];

export default function DisruptionMap() {
  const [activeCity, setActiveCity] = useState(null);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#1A1512" }}>Live disruption map</span>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#EF4444", animation: "pulse 1.5s infinite" }} />
          <span style={{ fontSize: 11, color: "#9B9589" }}>Live</span>
        </div>
      </div>
      <div style={{ background: "#E8F4FD", borderRadius: 14, overflow: "hidden", position: "relative", border: "1px solid #E0D9D0" }}>
        <svg viewBox="0 0 400 420" style={{ width: "100%", display: "block" }}>
          <path d="M160,60 L180,50 L220,48 L260,55 L300,60 L330,80 L345,110 L350,140 L340,170 L330,200 L320,230 L310,260 L315,290 L305,320 L295,350 L285,370 L270,390 L255,400 L240,390 L230,370 L220,355 L210,340 L195,320 L180,300 L165,280 L155,260 L150,230 L145,200 L140,170 L138,140 L140,110 L148,85 Z" fill="#D6EAF8" stroke="#A9CCE3" strokeWidth="1.5" />
          {CITIES.map(c => (
            <g key={c.name} onClick={() => setActiveCity(activeCity === c.name ? null : c.name)} style={{ cursor: "pointer" }}>
              <circle cx={c.x} cy={c.y} r={14} fill={c.color} opacity={0.15} style={{ animation: "pulse 2s infinite" }} />
              <circle cx={c.x} cy={c.y} r={8}  fill={c.color} opacity={0.9} />
              <text x={c.x} y={c.y + 1} textAnchor="middle" dominantBaseline="middle" fontSize="9" fontWeight="700" fill="#fff">{c.alerts}</text>
              <text x={c.x} y={c.y + 20} textAnchor="middle" fontSize="9" fill="#1A1512" fontWeight="600">{c.name}</text>
            </g>
          ))}
        </svg>
        {activeCity && (() => {
          const c = CITIES.find(x => x.name === activeCity);
          return (
            <div style={{ position: "absolute", top: 10, right: 10, background: "#fff", borderRadius: 10, padding: "10px 12px", boxShadow: "0 2px 12px rgba(0,0,0,0.12)", minWidth: 140, animation: "slideIn 0.2s ease" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1512" }}>{c.name}</div>
              <div style={{ fontSize: 11, color: "#9B9589", marginBottom: 5 }}>{c.alerts} active alerts</div>
              <div style={{ fontSize: 12, color: c.color, fontWeight: 600 }}>NFI Score: {c.nfi}/100</div>
              <button onClick={() => setActiveCity(null)} style={{ marginTop: 5, fontSize: 10, color: "#9B9589", background: "none", border: "none", cursor: "pointer", padding: 0 }}>Close ✕</button>
            </div>
          );
        })()}
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
        {[["#EF4444","High (>65)"],["#F59E0B","Moderate"],["#4CAF82","Low (<40)"]].map(([col, label]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: col }} />
            <span style={{ fontSize: 10, color: "#9B9589" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
