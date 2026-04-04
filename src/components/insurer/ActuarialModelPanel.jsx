// src/components/insurer/ActuarialModelPanel.jsx
"use client";
import { useState, useEffect } from "react";
import {
  EXCLUSION_CATEGORIES,
  EXCLUSION_SEVERITY_META,
  LOSS_TRIANGLE,
  PREMIUM_ADEQUACY,
  RETURN_PERIODS,
} from "@/data/exclusions";

// ── Sub-component: Exclusions Browser ───────────────────────────────────────

function ExclusionsBrowser() {
  const [openCat, setOpenCat] = useState("force_majeure");
  const [openExcl, setOpenExcl] = useState(null);
  const totalExclusions = EXCLUSION_CATEGORIES.reduce((s, c) => s + c.exclusions.length, 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1512" }}>📋 Standard Exclusions Schedule</div>
          <div style={{ fontSize: 11, color: "#9B9589" }}>IRDAI-compliant · {totalExclusions} exclusions across {EXCLUSION_CATEGORIES.length} categories</div>
        </div>
        <div style={{ padding: "3px 8px", background: "#FEF2F2", borderRadius: 6, fontSize: 10, fontWeight: 700, color: "#DC2626" }}>
          LEGALLY BINDING
        </div>
      </div>

      {/* Category tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
        {EXCLUSION_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => { setOpenCat(cat.id); setOpenExcl(null); }}
            style={{
              padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 600,
              border: `1.5px solid ${openCat === cat.id ? cat.color : "#E0D9D0"}`,
              background: openCat === cat.id ? cat.bg : "#FAFAF8",
              color: openCat === cat.id ? cat.color : "#6B6258",
              cursor: "pointer", transition: "all 0.15s",
            }}
          >
            {cat.icon} {cat.label.split(" & ")[0]}
          </button>
        ))}
      </div>

      {/* Active category */}
      {EXCLUSION_CATEGORIES.filter((c) => c.id === openCat).map((cat) => (
        <div key={cat.id}>
          <div style={{ fontSize: 11, fontWeight: 700, color: cat.color, marginBottom: 8, padding: "6px 10px", background: cat.bg, borderRadius: 8, border: `1px solid ${cat.border}` }}>
            {cat.icon} {cat.label}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {cat.exclusions.map((excl) => {
              const isOpen = openExcl === excl.id;
              const meta = EXCLUSION_SEVERITY_META[excl.severity];
              return (
                <div
                  key={excl.id}
                  style={{ border: `1.5px solid ${isOpen ? cat.color : "#E0D9D0"}`, borderRadius: 10, overflow: "hidden", transition: "border 0.2s" }}
                >
                  <div
                    onClick={() => setOpenExcl(isOpen ? null : excl.id)}
                    style={{ padding: "10px 12px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", background: isOpen ? cat.bg : "#fff" }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#1A1512" }}>{excl.title}</div>
                      <div style={{ fontSize: 10, color: "#9B9589", marginTop: 1 }}>{excl.triggerImpact}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, color: meta.color, background: meta.bg }}>
                        {meta.label}
                      </span>
                      <span style={{ fontSize: 11, color: "#9B9589" }}>{isOpen ? "▲" : "▼"}</span>
                    </div>
                  </div>
                  {isOpen && (
                    <div style={{ padding: "10px 12px", borderTop: `1px solid ${cat.border}`, background: "#FAFAF8" }}>
                      <p style={{ fontSize: 11, color: "#6B6258", lineHeight: 1.6, marginBottom: 8 }}>{excl.desc}</p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                        <div style={{ padding: "6px 8px", background: "#fff", borderRadius: 7, border: "1px solid #E0D9D0" }}>
                          <div style={{ fontSize: 9, color: "#9B9589", marginBottom: 2 }}>IRDAI / Regulatory Ref</div>
                          <div style={{ fontSize: 10, fontWeight: 600, color: "#1A1512" }}>{excl.irdaiRef}</div>
                        </div>
                        <div style={{ padding: "6px 8px", background: "#fff", borderRadius: 7, border: "1px solid #E0D9D0" }}>
                          <div style={{ fontSize: 9, color: "#9B9589", marginBottom: 2 }}>Actuarial Rationale</div>
                          <div style={{ fontSize: 10, fontWeight: 600, color: cat.color }}>{excl.riskReason}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Sub-component: Loss Development Triangle ────────────────────────────────

function LossTriangle() {
  const [hovered, setHovered] = useState(null);
  const { periods, development, data } = LOSS_TRIANGLE;

  function cellColor(val) {
    if (val === null) return "transparent";
    if (val > 100) return "#EF4444";
    if (val > 85)  return "#F97316";
    if (val > 70)  return "#F59E0B";
    if (val > 55)  return "#84CC16";
    return "#4CAF82";
  }

  function cellTextColor(val) {
    if (val === null) return "#E0D9D0";
    return "#fff";
  }

  // Chain-ladder link ratios (col-to-col averages)
  const linkRatios = development.slice(0, -1).map((_, devIdx) => {
    const pairs = data.filter((row) => row[devIdx] !== null && row[devIdx + 1] !== null);
    if (!pairs.length) return null;
    const ratio = pairs.reduce((s, row) => s + row[devIdx + 1] / row[devIdx], 0) / pairs.length;
    return ratio.toFixed(3);
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1512" }}>📐 Loss Development Triangle</div>
          <div style={{ fontSize: 11, color: "#9B9589" }}>Chain-ladder method · Cumulative loss ratios (%) · 12-month run-off</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[["#4CAF82", "<55%"], ["#84CC16", "55-70%"], ["#F59E0B", "70-85%"], ["#EF4444", ">100%"]].map(([c, l]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <div style={{ width: 7, height: 7, borderRadius: 2, background: c }} />
              <span style={{ fontSize: 9, color: "#9B9589" }}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ overflowX: "auto", marginBottom: 10 }}>
        <table style={{ borderCollapse: "collapse", fontSize: 10, width: "100%" }}>
          <thead>
            <tr>
              <th style={{ padding: "4px 8px", textAlign: "left", fontSize: 9, color: "#9B9589", fontWeight: 600, whiteSpace: "nowrap" }}>Accident Period</th>
              {development.map((d) => (
                <th key={d} style={{ padding: "4px 5px", textAlign: "center", fontSize: 9, color: "#9B9589", fontWeight: 600 }}>Dev {d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIdx) => (
              <tr key={rowIdx}>
                <td style={{ padding: "3px 8px", fontSize: 9, fontWeight: 600, color: "#6B6258", whiteSpace: "nowrap" }}>
                  {periods[rowIdx]}
                </td>
                {row.map((val, colIdx) => (
                  <td
                    key={colIdx}
                    onMouseEnter={() => setHovered({ row: rowIdx, col: colIdx })}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      padding: "3px 5px",
                      textAlign: "center",
                      background: val !== null ? cellColor(val) : "#F5F0EB",
                      color: val !== null ? cellTextColor(val) : "#D0C9C0",
                      fontSize: 9,
                      fontWeight: 600,
                      borderRadius: 3,
                      cursor: val !== null ? "pointer" : "default",
                      transition: "opacity 0.1s",
                      opacity: hovered && hovered.row === rowIdx && hovered.col === colIdx ? 0.75 : 1,
                      minWidth: 36,
                    }}
                  >
                    {val !== null ? val.toFixed(1) : "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td style={{ padding: "6px 8px", fontSize: 9, fontWeight: 700, color: "#1A1512" }}>Link Ratio</td>
              {linkRatios.map((r, i) => (
                <td key={i} style={{ padding: "4px 5px", textAlign: "center", fontSize: 9, fontWeight: 700, color: r > 1.05 ? "#F59E0B" : "#4CAF82" }}>
                  {r ? `×${r}` : "—"}
                </td>
              ))}
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Monsoon spike callout */}
      <div style={{ padding: "8px 12px", background: "#FFF8F0", border: "1px solid #FFD4BE", borderRadius: 8, fontSize: 11, color: "#92400E" }}>
        ⚠ Jul-Aug accident periods show loss ratios exceeding 100% — monsoon concentration risk. Exclusion of <strong>force majeure cascade events</strong> is critical during these months.
      </div>
    </div>
  );
}

// ── Sub-component: Premium Adequacy Heatmap ─────────────────────────────────

function PremiumAdequacy() {
  const [activeTier, setActiveTier] = useState("standard");
  const tierData = PREMIUM_ADEQUACY.tiers[activeTier];
  const bands = PREMIUM_ADEQUACY.bands;

  function adequacyColor(val) {
    if (val >= 1.15) return "#4CAF82";
    if (val >= 1.08) return "#84CC16";
    if (val >= 1.00) return "#F59E0B";
    return "#EF4444";
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1512" }}>⚖ Premium Adequacy Model</div>
          <div style={{ fontSize: 11, color: "#9B9589" }}>Target loss ratio · Expense load · Cat buffer · Adequacy ratio by NFI band</div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {["basic", "standard", "premium"].map((t) => (
            <button
              key={t}
              onClick={() => setActiveTier(t)}
              style={{
                padding: "3px 9px", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer",
                border: "1px solid",
                borderColor: activeTier === t ? "#FF6B35" : "#E0D9D0",
                background: activeTier === t ? "#FFF0EB" : "#FAFAF8",
                color: activeTier === t ? "#FF6B35" : "#6B6258",
              }}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Load breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 12 }}>
        {[
          { label: "Target Loss Ratio",  value: `${(tierData.targetLossRatio * 100).toFixed(0)}%`, color: "#3B82F6" },
          { label: "Expense Ratio",      value: `${(tierData.expenseRatio * 100).toFixed(0)}%`,    color: "#F59E0B" },
          { label: "Profit Load",        value: `${(tierData.profitLoad * 100).toFixed(0)}%`,      color: "#4CAF82" },
          { label: "Cat Loading",        value: `${(tierData.cat_loading * 100).toFixed(0)}%`,     color: "#EF4444" },
        ].map((item, i) => (
          <div key={i} style={{ padding: "8px", background: "#FAFAF8", borderRadius: 8, border: "1px solid #E0D9D0", textAlign: "center" }}>
            <div style={{ fontFamily: "serif", fontSize: 17, color: item.color }}>{item.value}</div>
            <div style={{ fontSize: 9, color: "#9B9589", marginTop: 2 }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Band-level adequacy */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {bands.map((band, i) => {
          const adequacy = tierData.adequacy[i];
          const premium = tierData.premiumByBand[i];
          const breakeven = tierData.breakEvenByBand[i];
          const color = adequacyColor(adequacy);
          return (
            <div key={i} style={{ padding: "10px 12px", background: "#FAFAF8", border: "1px solid #E0D9D0", borderRadius: 10, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#1A1512", marginBottom: 2 }}>{band}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ fontSize: 10, color: "#6B6258" }}>Premium: <strong style={{ color: "#FF6B35" }}>₹{premium}/wk</strong></span>
                  <span style={{ fontSize: 10, color: "#6B6258" }}>Break-even: <strong style={{ color: "#1A1512" }}>₹{breakeven}/wk</strong></span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "serif", fontSize: 20, color }}>×{adequacy.toFixed(2)}</div>
                <div style={{ fontSize: 9, color: "#9B9589" }}>adequacy ratio</div>
              </div>
              <div style={{ width: 4, height: 36, borderRadius: 2, background: color }} />
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 10, padding: "8px 12px", background: "#F0FDF4", borderRadius: 8, fontSize: 10, color: "#166534" }}>
        ✓ All tiers show adequacy ratio &gt;1.0 — premiums exceed expected costs at current loss assumptions. Cat loading of {(tierData.cat_loading * 100).toFixed(0)}% absorbs 1-in-25 year scenarios without insolvency.
      </div>
    </div>
  );
}

// ── Sub-component: Return Period Stress Test ────────────────────────────────

function ReturnPeriodTable() {
  const [selected, setSelected] = useState(null);

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1512" }}>🌊 Catastrophe Return Period Analysis</div>
        <div style={{ fontSize: 11, color: "#9B9589" }}>Solvency II SCR framework · 200-year PML reference point</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {RETURN_PERIODS.map((rp, i) => {
          const isSelected = selected === i;
          const lrPct = rp.lossRatio * 100;
          const barColor = lrPct > 130 ? "#EF4444" : lrPct > 100 ? "#F97316" : lrPct > 80 ? "#F59E0B" : "#4CAF82";
          const isBreached = rp.lossRatio > 1.0;

          return (
            <div
              key={i}
              onClick={() => setSelected(isSelected ? null : i)}
              style={{ padding: "9px 12px", background: isSelected ? "#FAFAF8" : "#fff", border: `1.5px solid ${isSelected ? barColor : "#E0D9D0"}`, borderRadius: 10, cursor: "pointer", transition: "border 0.15s" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ minWidth: 64 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: barColor }}>{rp.period}</div>
                  <div style={{ fontSize: 9, color: "#9B9589" }}>{rp.label}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ height: 6, background: "#EEE8E0", borderRadius: 3 }}>
                    <div style={{ width: `${Math.min(100, lrPct / 2.1)}%`, height: "100%", background: barColor, borderRadius: 3, transition: "width 0.4s" }} />
                  </div>
                </div>
                <div style={{ minWidth: 48, textAlign: "right" }}>
                  <div style={{ fontFamily: "serif", fontSize: 15, color: barColor }}>{lrPct.toFixed(0)}%</div>
                  <div style={{ fontSize: 9, color: "#9B9589" }}>loss ratio</div>
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: isBreached ? "#EF4444" : "#4CAF82", minWidth: 48, textAlign: "right" }}>
                  {isBreached ? "⚠ BREACH" : "✓ SAFE"}
                </div>
              </div>
              {isSelected && (
                <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", padding: "7px 10px", background: "#fff", borderRadius: 8, border: "1px solid #E0D9D0", animation: "slideIn 0.2s ease" }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#1A1512" }}>Scenario</div>
                    <div style={{ fontSize: 11, color: "#6B6258" }}>{rp.scenario}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#1A1512" }}>Premium Impact</div>
                    <div style={{ fontSize: 11, color: isBreached ? "#EF4444" : "#4CAF82", fontWeight: 700 }}>{rp.premiumImpact}</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 10, padding: "8px 12px", background: "#FEF2F2", borderRadius: 8, fontSize: 10, color: "#991B1B", border: "1px solid #FECACA" }}>
        ⚠ Loss ratios &gt;100% at 1-in-25 year events — <strong>reinsurance XL treaties essential</strong>. Exclusions for war, pandemic, and force majeure directly prevent 1-in-50 to 1-in-200 tail scenarios from triggering insolvency.
      </div>
    </div>
  );
}

// ── Main panel ───────────────────────────────────────────────────────────────

const ACTUARY_TABS = [
  { id: "exclusions",  label: "Exclusions",     icon: "📋" },
  { id: "triangle",   label: "Loss Triangle",   icon: "📐" },
  { id: "adequacy",   label: "Premium Model",   icon: "⚖" },
  { id: "cat",        label: "Cat Stress Test", icon: "🌊" },
];

export default function ActuarialModelPanel() {
  const [tab, setTab] = useState("exclusions");
  const totalExclusions = EXCLUSION_CATEGORIES.reduce((s, c) => s + c.exclusions.length, 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1512" }}>🧮 Actuarial & Underwriting Model</div>
          <div style={{ fontSize: 11, color: "#9B9589" }}>
            {totalExclusions} exclusions · Loss triangles · Premium adequacy · Cat loading
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "#EDE9FE", borderRadius: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#7C3AED" }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: "#7C3AED" }}>IRDAI Compliant</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 14, overflowX: "auto" }}>
        {ACTUARY_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600,
              border: `1px solid ${tab === t.id ? "#1A1512" : "#E0D9D0"}`,
              background: tab === t.id ? "#1A1512" : "#FAFAF8",
              color: tab === t.id ? "#fff" : "#6B6258",
              cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap", flexShrink: 0,
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === "exclusions" && <ExclusionsBrowser />}
      {tab === "triangle"   && <LossTriangle />}
      {tab === "adequacy"   && <PremiumAdequacy />}
      {tab === "cat"        && <ReturnPeriodTable />}
    </div>
  );
}