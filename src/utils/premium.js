/**
 * Calculate weekly premium from base tier + NFI risk factors.
 * @param {number} base       - Tier base premium (₹)
 * @param {number} nfi        - Pin-code NFI score (0–100)
 * @param {number} seasonal   - Seasonal add-on (₹)
 * @param {boolean} claimBonus - Whether the worker qualifies for no-claim loyalty discount
 * @returns {number} Final weekly premium (₹)
 */
export function calcPremium(base, nfi, seasonal, claimBonus) {
  const nfiAdd = Math.round((nfi / 100) * 12);
  const discount = claimBonus ? -Math.round(base * 0.12) : 0;
  return base + nfiAdd + seasonal + discount;
}

/**
 * Compute Heat Index using the Rothfusz regression formula.
 * Triggers a GigShield payout when result >= 42°C.
 * @param {number} tempC      - Actual temperature in Celsius
 * @param {number} humidity   - Relative humidity (%)
 * @returns {number} Feels-like temperature in Celsius (rounded)
 */
export function calcHeatIndex(tempC, humidity) {
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
  return Math.round(Math.max(tempC, hi));
}

/**
 * Returns the current seasonal premium add-on based on the month.
 * Monsoon months (June–September) carry a higher surcharge.
 * @returns {number} Seasonal premium add-on (₹)
 */
export function getSeasonalFactor() {
  const month = new Date().getMonth(); // 0-indexed
  return month >= 5 && month <= 9 ? 6 : 2;
}

/**
 * Returns an NFI risk label and colour for a given score.
 * @param {number} score - NFI score (0–100)
 * @returns {{ label: string, color: string }}
 */
export function getNFIRiskMeta(score) {
  if (score > 65) return { label: "High Risk",  color: "#EF4444" };
  if (score > 40) return { label: "Moderate",   color: "#F59E0B" };
  return              { label: "Low Risk",   color: "#4CAF82" };
}
