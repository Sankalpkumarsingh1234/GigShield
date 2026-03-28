// src/app/auth/page.jsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUpWithEmail, signInWithEmail, createUserProfile } from "@/lib/supabase";
import { PIN_RISK } from "@/data/pinRisk";

// ── Shared styles (matches existing GigShield design tokens) ───────────────
const inputStyle = {
  padding: "11px 14px",
  borderRadius: 10,
  border: "1.5px solid #E0D9D0",
  fontSize: 14,
  color: "#1A1512",
  background: "#FAFAF8",
  outline: "none",
  fontFamily: "inherit",
  width: "100%",
  transition: "border 0.2s",
};

const labelStyle = { display: "flex", flexDirection: "column", gap: 6 };
const labelText  = { fontSize: 13, fontWeight: 600, color: "#1A1512" };

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

const ctaBtn = {
  width: "100%",
  padding: "14px",
  borderRadius: 12,
  border: "none",
  background: "#FF6B35",
  color: "#fff",
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
  letterSpacing: "0.01em",
  transition: "opacity 0.2s",
};

// ── Sign In Form ─────────────────────────────────────────────────────────────
function SignInForm({ onSwitch }) {
  const router = useRouter();
  const [form,    setForm]    = useState({ email: "", password: "" });
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const normalizedForm = {
      ...form,
      email: normalizeEmail(form.email),
    };

    const { error } = await signInWithEmail(normalizedForm);
    if (error) {
      console.error("Supabase sign-in error:", error);
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/");
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <label style={labelStyle}>
        <span style={labelText}>Email address</span>
        <input
          style={inputStyle}
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          required
        />
      </label>

      <label style={labelStyle}>
        <span style={labelText}>Password</span>
        <input
          style={inputStyle}
          type="password"
          placeholder="••••••••"
          value={form.password}
          onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
          required
        />
      </label>

      {error && (
        <div style={{ padding: "10px 12px", background: "#FEE2E2", borderRadius: 8, fontSize: 13, color: "#991B1B" }}>
          ⚠ {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{ ...ctaBtn, opacity: loading ? 0.6 : 1 }}
      >
        {loading ? "Signing in…" : "Sign in →"}
      </button>

      <div style={{ textAlign: "center", fontSize: 13, color: "#6B6258" }}>
        Don't have an account?{" "}
        <button
          type="button"
          onClick={onSwitch}
          style={{ background: "none", border: "none", color: "#FF6B35", fontWeight: 700, cursor: "pointer", fontSize: 13 }}
        >
          Sign up
        </button>
      </div>
    </form>
  );
}

// ── Sign Up Form ─────────────────────────────────────────────────────────────
function SignUpForm({ onSwitch }) {
  const router = useRouter();
  const [step,    setStep]    = useState(1); // 1 = account, 2 = profile
  const [form,    setForm]    = useState({
    name: "", email: "", password: "", confirmPassword: "",
    phone: "", platform: "Zomato", pin: "", earnings: "",
  });
  const [pinData,  setPinData]  = useState(null);
  const [pinError, setPinError] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  function handlePin(val) {
    const cleaned = val.replace(/\D/g, "");
    setForm(f => ({ ...f, pin: cleaned }));
    if (cleaned.length === 6) {
      const data = PIN_RISK[cleaned];
      if (data) { setPinData(data); setPinError(""); }
      else      { setPinData(null); setPinError("Pin code not in network yet — using city average."); }
    } else {
      setPinData(null);
      setPinError("");
    }
  }

  function step1Valid() {
    return (
      form.name.trim() &&
      form.email.trim() &&
      form.password.length >= 6 &&
      form.password === form.confirmPassword
    );
  }

  function step2Valid() {
    return form.pin.length === 6 && form.earnings;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (step === 1) { setStep(2); return; }

    setError("");
    setLoading(true);
    const email = normalizeEmail(form.email);

    // 1. Create Supabase auth user
    const { data: authData, error: authError } = await signUpWithEmail({
      email,
      password: form.password,
      name: form.name,
      platform: form.platform,
      phone: form.phone,
    });

    if (authError) {
      console.error("Supabase sign-up error:", authError);
      setError(authError.message);
      setLoading(false);
      return;
    }

    const userId = authData?.user?.id;
    if (!userId) {
      setError("Account created — please check your email to confirm.");
      setLoading(false);
      return;
    }

    // 2. Create user profile in database
    const nfi = pinData?.nfi || 55;
    const { error: profileError } = await createUserProfile({
      userId,
      name: form.name,
      platform: form.platform,
      phone: form.phone,
      pinCode: form.pin,
      earnings: form.earnings,
      nfi,
    });

    if (profileError) {
      console.warn("Profile creation failed:", profileError.message);
      // Non-fatal: auth succeeded, profile can be created later
    }

    router.push("/");
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Step indicator */}
      <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
        {[1, 2].map(s => (
          <div
            key={s}
            style={{
              flex: 1, height: 3, borderRadius: 2,
              background: s <= step ? "#FF6B35" : "#E0D9D0",
              transition: "background 0.3s",
            }}
          />
        ))}
      </div>
      <div style={{ fontSize: 11, color: "#9B9589", marginTop: -8 }}>
        Step {step} of 2 — {step === 1 ? "Account details" : "Rider profile"}
      </div>

      {step === 1 && (
        <>
          <label style={labelStyle}>
            <span style={labelText}>Full name</span>
            <input
              style={inputStyle}
              placeholder="e.g. Ravi Kumar"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
            />
          </label>

          <label style={labelStyle}>
            <span style={labelText}>Email address</span>
            <input
              style={inputStyle}
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required
            />
          </label>

          <label style={labelStyle}>
            <span style={labelText}>Phone number (optional)</span>
            <input
              style={inputStyle}
              type="tel"
              placeholder="+91 98765 43210"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            />
          </label>

          <label style={labelStyle}>
            <span style={labelText}>Password</span>
            <input
              style={inputStyle}
              type="password"
              placeholder="Min. 6 characters"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required
              minLength={6}
            />
          </label>

          <label style={labelStyle}>
            <span style={labelText}>Confirm password</span>
            <input
              style={inputStyle}
              type="password"
              placeholder="Repeat password"
              value={form.confirmPassword}
              onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
              required
            />
            {form.confirmPassword && form.password !== form.confirmPassword && (
              <span style={{ fontSize: 11, color: "#EF4444" }}>Passwords don't match</span>
            )}
          </label>
        </>
      )}

      {step === 2 && (
        <>
          <label style={labelStyle}>
            <span style={labelText}>Platform</span>
            <div style={{ display: "flex", gap: 8 }}>
              {["Zomato", "Swiggy"].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, platform: p }))}
                  style={{
                    flex: 1, padding: "10px", borderRadius: 10, cursor: "pointer",
                    border: "1.5px solid",
                    borderColor: form.platform === p ? "#FF6B35" : "#E0D9D0",
                    background: form.platform === p ? "#FFF0EB" : "#FAFAF8",
                    color: form.platform === p ? "#FF6B35" : "#6B6258",
                    fontWeight: 600, fontSize: 14, transition: "all 0.2s",
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </label>

          <label style={labelStyle}>
            <span style={labelText}>Operating pin code</span>
            <input
              style={inputStyle}
              placeholder="e.g. 600001"
              maxLength={6}
              value={form.pin}
              onChange={e => handlePin(e.target.value)}
              required
            />
            {pinData && (
              <div style={{ padding: "8px 12px", background: "#E8F5EE", borderRadius: 8, fontSize: 12, color: "#2D6B4A" }}>
                📍 {pinData.zone}, {pinData.city} — {pinData.reason}
              </div>
            )}
            {pinError && (
              <span style={{ fontSize: 11, color: "#B45309" }}>{pinError}</span>
            )}
          </label>

          <label style={labelStyle}>
            <span style={labelText}>Average weekly earnings (₹)</span>
            <input
              style={inputStyle}
              placeholder="e.g. 6000"
              type="number"
              value={form.earnings}
              onChange={e => setForm(f => ({ ...f, earnings: e.target.value }))}
              required
            />
          </label>

          {pinData && (
            <div style={{ padding: "10px 12px", background: "#FFF8F5", border: "1px solid #FFD4BE", borderRadius: 10, fontSize: 12, color: "#7C3D1F" }}>
              <strong>NFI Risk Score: {pinData.nfi}/100</strong> — {pinData.zone} had{" "}
              <strong>{Math.round(pinData.nfi * 0.4)} disruption days</strong> in the past year.
            </div>
          )}
        </>
      )}

      {error && (
        <div style={{ padding: "10px 12px", background: "#FEE2E2", borderRadius: 8, fontSize: 13, color: "#991B1B" }}>
          ⚠ {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || (step === 1 ? !step1Valid() : !step2Valid())}
        style={{
          ...ctaBtn,
          opacity: loading || (step === 1 ? !step1Valid() : !step2Valid()) ? 0.45 : 1,
        }}
      >
        {loading ? "Creating account…" : step === 1 ? "Continue →" : "Create account →"}
      </button>

      {step === 2 && (
        <button
          type="button"
          onClick={() => setStep(1)}
          style={{ background: "none", border: "none", color: "#6B6258", fontSize: 13, cursor: "pointer", textDecoration: "underline" }}
        >
          ← Back
        </button>
      )}

      <div style={{ textAlign: "center", fontSize: 13, color: "#6B6258" }}>
        Already have an account?{" "}
        <button
          type="button"
          onClick={onSwitch}
          style={{ background: "none", border: "none", color: "#FF6B35", fontWeight: 700, cursor: "pointer", fontSize: 13 }}
        >
          Sign in
        </button>
      </div>
    </form>
  );
}

// ── Main Auth Page ────────────────────────────────────────────────────────────
export default function AuthPage() {
  const [mode, setMode] = useState("signup"); // "signup" | "signin"

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F5F0EB",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: "#fff",
          borderRadius: 24,
          boxShadow: "0 4px 40px rgba(0,0,0,0.08)",
          overflow: "hidden",
        }}
      >
        {/* Top bar — matches GigShield brand header */}
        <div
          style={{
            padding: "14px 20px",
            background: "#1A1512",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: "#FF6B35",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16,
            }}
          >
            🛵
          </div>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>GigShield</div>
            <div style={{ color: "#9B8E84", fontSize: 11 }}>
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "24px 22px 28px" }}>
          {/* Hero text */}
          <div style={{ marginBottom: 24 }}>
            <h2
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: 24,
                color: "#1A1512",
                margin: "0 0 6px",
              }}
            >
              {mode === "signup" ? "Set up your shield" : "Sign in"}
            </h2>
            <p style={{ fontSize: 13, color: "#6B6258", margin: 0 }}>
              {mode === "signup"
                ? "Protect your income from disruptions in 2 minutes."
                : "Access your GigShield dashboard and claims."}
            </p>
          </div>

          {mode === "signup" ? (
            <SignUpForm onSwitch={() => setMode("signin")} />
          ) : (
            <SignInForm onSwitch={() => setMode("signup")} />
          )}

          {/* Trust badges */}
          <div
            style={{
              marginTop: 20,
              paddingTop: 16,
              borderTop: "1px solid #F5F0EB",
              display: "flex",
              justifyContent: "center",
              gap: 16,
            }}
          >
            {["🔒 Secure", "⚡ Instant payouts", "✓ No documents"].map((b, i) => (
              <span key={i} style={{ fontSize: 10, fontWeight: 600, color: "#9B9589" }}>{b}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
