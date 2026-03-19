// ── Premium calculation ────────────────────────────────────────────────────
export function calcPremium(base, nfi, seasonal, claimBonus) {
  const nfiAdd = Math.round((nfi / 100) * 12);
  const discount = claimBonus ? -Math.round(base * 0.12) : 0;
  return base + nfiAdd + seasonal + discount;
}

// ── Rothfusz Heat Index formula ────────────────────────────────────────────
// Returns "feels like" temperature given dry-bulb temp (°C) and relative humidity (%)
export function calcHeatIndex(tempC, humidity) {
  const hi =
    -8.78 +
    1.61 * tempC +
    2.34 * humidity -
    (0.146 * tempC * humidity) / 10 -
    (0.013 * tempC * tempC) / 10 -
    (0.016 * humidity * humidity) / 100 +
    (0.002 * tempC * tempC * humidity) / 1000 +
    (0.00086 * tempC * humidity * humidity) / 10000;
  return Math.round(Math.max(tempC, hi));
}

// ── Seasonal factor ────────────────────────────────────────────────────────
// Returns higher premium adder during monsoon months (June–October)
export function getSeasonalFactor() {
  const month = new Date().getMonth(); // 0-indexed
  return month >= 5 && month <= 9 ? 6 : 2;
}

// ── Shared inline styles ───────────────────────────────────────────────────
export const styles = {
  label: { display: "flex", flexDirection: "column", gap: 6 },
  labelText: { fontSize: 13, fontWeight: 600, color: "#1A1512" },
  input: {
    padding: "11px 14px",
    borderRadius: 10,
    border: "1.5px solid #E0D9D0",
    fontSize: 14,
    color: "#1A1512",
    background: "#FAFAF8",
    outline: "none",
    fontFamily: "inherit",
    transition: "border 0.2s",
  },
  ctaBtn: {
    width: "100%",
    padding: "14px",
    borderRadius: 12,
    border: "none",
    background: "#FF6B35",
    color: "#fff",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    transition: "opacity 0.2s",
    letterSpacing: "0.01em",
  },
};
