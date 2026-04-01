import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return POST();
}

export async function POST() {
  const results = [];

  try {
    // ── Extensions ─────────────────────────────────────────────────────────
    await query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    results.push("✅ pgcrypto extension ready");

    // ── USERS ──────────────────────────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name          VARCHAR(100)  NOT NULL,
        email         VARCHAR(255),
        password_hash TEXT,
        phone         VARCHAR(30),
        platform      VARCHAR(20)   NOT NULL DEFAULT 'Zomato',
        pin_code      VARCHAR(10)   NOT NULL DEFAULT '600001',
        earnings      INT           NOT NULL DEFAULT 0,
        nfi           INT           NOT NULL DEFAULT 55,
        role          VARCHAR(20)   NOT NULL DEFAULT 'worker',
        created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      )
    `);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255)`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(30)`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'worker'`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`);
    await query(`
      CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx 
      ON users (LOWER(email)) WHERE email IS NOT NULL
    `);
    results.push("✅ users table ready");

    // ── POLICIES ───────────────────────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS policies (
        id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id           UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tier              VARCHAR(20)  NOT NULL CHECK (tier IN ('basic', 'standard', 'premium')),
        premium           INT          NOT NULL,
        max_payout        INT          NOT NULL,
        coverage          TEXT[]       NOT NULL DEFAULT '{}',
        active            BOOLEAN      NOT NULL DEFAULT true,
        activated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        next_billing_date TIMESTAMPTZ  NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
        total_paid_in     INT          NOT NULL DEFAULT 0,
        total_paid_out    INT          NOT NULL DEFAULT 0,
        created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await query(`ALTER TABLE policies ADD COLUMN IF NOT EXISTS coverage TEXT[] DEFAULT '{}'`);
    await query(`ALTER TABLE policies ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ DEFAULT NOW()`);
    await query(`ALTER TABLE policies ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')`);
    await query(`ALTER TABLE policies ADD COLUMN IF NOT EXISTS total_paid_in INT DEFAULT 0`);
    await query(`ALTER TABLE policies ADD COLUMN IF NOT EXISTS total_paid_out INT DEFAULT 0`);
    await query(`
      CREATE INDEX IF NOT EXISTS policies_user_id_idx ON policies(user_id)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS policies_active_idx ON policies(active) WHERE active = true
    `);
    results.push("✅ policies table ready");

    // ── CLAIMS ─────────────────────────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS claims (
        id              SERIAL        PRIMARY KEY,
        claim_id        VARCHAR(30)   UNIQUE NOT NULL,
        worker_id       VARCHAR(50)   NOT NULL,
        policy_id       UUID          REFERENCES policies(id),
        trigger_type    VARCHAR(50)   NOT NULL,
        trigger_value   DECIMAL,
        city            VARCHAR(50),
        pin_code        VARCHAR(10),
        amount          INT           NOT NULL,
        status          VARCHAR(20)   NOT NULL DEFAULT 'paid'
                          CHECK (status IN ('paid', 'pending', 'rejected', 'processing')),
        upi_ref         VARCHAR(50),
        paid_at         TIMESTAMPTZ,
        created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      )
    `);
    await query(`ALTER TABLE claims ADD COLUMN IF NOT EXISTS policy_id UUID REFERENCES policies(id)`);
    await query(`ALTER TABLE claims ADD COLUMN IF NOT EXISTS pin_code VARCHAR(10)`);
    await query(`ALTER TABLE claims ADD COLUMN IF NOT EXISTS upi_ref VARCHAR(50)`);
    await query(`ALTER TABLE claims ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ`);
    await query(`CREATE INDEX IF NOT EXISTS claims_worker_id_idx ON claims(worker_id)`);
    await query(`CREATE INDEX IF NOT EXISTS claims_created_at_idx ON claims(created_at DESC)`);
    results.push("✅ claims table ready");

    // ── DISRUPTION EVENTS ──────────────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS disruption_events (
        id               SERIAL       PRIMARY KEY,
        event_type       VARCHAR(50)  NOT NULL,
        city             VARCHAR(50),
        pin_code         VARCHAR(10),
        value            DECIMAL      NOT NULL,
        threshold        DECIMAL      NOT NULL,
        triggered        BOOLEAN      NOT NULL DEFAULT false,
        workers_affected INT          NOT NULL DEFAULT 0,
        total_payout     INT          NOT NULL DEFAULT 0,
        severity         VARCHAR(20)  DEFAULT 'medium'
                           CHECK (severity IN ('low', 'medium', 'high')),
        created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await query(`ALTER TABLE disruption_events ADD COLUMN IF NOT EXISTS total_payout INT DEFAULT 0`);
    await query(`ALTER TABLE disruption_events ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'medium'`);
    await query(`CREATE INDEX IF NOT EXISTS disruption_events_city_idx ON disruption_events(city)`);
    await query(`CREATE INDEX IF NOT EXISTS disruption_events_created_at_idx ON disruption_events(created_at DESC)`);
    results.push("✅ disruption_events table ready");

    // ── FRAUD CASES ────────────────────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS fraud_cases (
        id              SERIAL       PRIMARY KEY,
        case_id         VARCHAR(20)  UNIQUE NOT NULL,
        worker_name     VARCHAR(100),
        worker_id       VARCHAR(50),
        pin_code        VARCHAR(10),
        trigger_type    VARCHAR(50),
        fraud_score     INT          NOT NULL CHECK (fraud_score BETWEEN 0 AND 100),
        signals         JSONB        NOT NULL DEFAULT '[]',
        status          VARCHAR(20)  NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'approved', 'rejected', 'escalated')),
        reviewed_by     VARCHAR(100),
        reviewed_at     TIMESTAMPTZ,
        claim_amount    INT,
        notes           TEXT,
        created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await query(`ALTER TABLE fraud_cases ADD COLUMN IF NOT EXISTS worker_id VARCHAR(50)`);
    await query(`ALTER TABLE fraud_cases ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(100)`);
    await query(`ALTER TABLE fraud_cases ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ`);
    await query(`ALTER TABLE fraud_cases ADD COLUMN IF NOT EXISTS claim_amount INT`);
    await query(`ALTER TABLE fraud_cases ADD COLUMN IF NOT EXISTS notes TEXT`);
    await query(`CREATE INDEX IF NOT EXISTS fraud_cases_status_idx ON fraud_cases(status)`);
    await query(`CREATE INDEX IF NOT EXISTS fraud_cases_score_idx ON fraud_cases(fraud_score DESC)`);
    results.push("✅ fraud_cases table ready");

    // ── PREMIUM PAYMENTS ───────────────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS premium_payments (
        id              SERIAL       PRIMARY KEY,
        payment_id      VARCHAR(30)  UNIQUE NOT NULL,
        policy_id       UUID         NOT NULL REFERENCES policies(id),
        worker_id       VARCHAR(50)  NOT NULL,
        amount          INT          NOT NULL,
        status          VARCHAR(20)  NOT NULL DEFAULT 'success'
                          CHECK (status IN ('success', 'failed', 'pending')),
        upi_ref         VARCHAR(50),
        billing_period  DATE,
        created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS premium_payments_policy_id_idx ON premium_payments(policy_id)`);
    results.push("✅ premium_payments table ready");

    // ── TRIGGER ALERTS (real-time feed) ────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS trigger_alerts (
        id              SERIAL       PRIMARY KEY,
        alert_id        VARCHAR(30)  UNIQUE NOT NULL,
        alert_type      VARCHAR(50)  NOT NULL,
        city            VARCHAR(50),
        pin_code        VARCHAR(10),
        severity        VARCHAR(20)  NOT NULL DEFAULT 'medium',
        title           VARCHAR(200) NOT NULL,
        description     TEXT,
        value           DECIMAL,
        threshold       DECIMAL,
        triggered       BOOLEAN      NOT NULL DEFAULT false,
        resolved        BOOLEAN      NOT NULL DEFAULT false,
        resolved_at     TIMESTAMPTZ,
        created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS trigger_alerts_city_idx ON trigger_alerts(city)`);
    await query(`CREATE INDEX IF NOT EXISTS trigger_alerts_created_at_idx ON trigger_alerts(created_at DESC)`);
    results.push("✅ trigger_alerts table ready");

    // ── UPDATED_AT TRIGGER FUNCTION ────────────────────────────────────────
    await query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);
    await query(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users
    `);
    await query(`
      CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
    await query(`
      DROP TRIGGER IF EXISTS update_policies_updated_at ON policies
    `);
    await query(`
      CREATE TRIGGER update_policies_updated_at
        BEFORE UPDATE ON policies
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
    results.push("✅ auto-update triggers ready");

    // ── SEED: Claims ───────────────────────────────────────────────────────
    const { rows: claimCount } = await query(`SELECT COUNT(*) FROM claims`);
    if (parseInt(claimCount[0].count) === 0) {
      await query(`
        INSERT INTO claims
          (claim_id, worker_id, trigger_type, trigger_value, city, pin_code, amount, status, upi_ref, paid_at, created_at)
        VALUES
          ('CLM001','WRK-DEFAULT','Heavy Rainfall',   58.2,'Chennai',  '600028',420,'paid','GS'||extract(epoch from now())::bigint,'2025-03-12','2025-03-12'),
          ('CLM002','WRK-DEFAULT','Heat Stress',       44.1,'Hyderabad','500001',310,'paid','GS'||extract(epoch from now())::bigint,'2025-02-28','2025-02-28'),
          ('CLM003','WRK-DEFAULT','AQI Warning',      387,  'Delhi',    '110092',190,'paid','GS'||extract(epoch from now())::bigint,'2025-02-10','2025-02-10'),
          ('CLM004','WRK-DEFAULT','Platform Downtime', 95,  'Mumbai',   '400053',250,'paid','GS'||extract(epoch from now())::bigint,'2025-01-22','2025-01-22'),
          ('CLM005','WRK-DEFAULT','Waterlogging',       82,  'Chennai',  '600028',500,'paid','GS'||extract(epoch from now())::bigint,'2025-01-05','2025-01-05')
        ON CONFLICT (claim_id) DO NOTHING
      `);
      results.push("✅ seed claims inserted");
    }

    // ── SEED: Disruption events ────────────────────────────────────────────
    const { rows: devCount } = await query(`SELECT COUNT(*) FROM disruption_events`);
    if (parseInt(devCount[0].count) === 0) {
      await query(`
        INSERT INTO disruption_events
          (event_type, city, pin_code, value, threshold, triggered, workers_affected, total_payout, severity, created_at)
        VALUES
          ('Heavy Rainfall',   'Chennai',   '600028', 58.2, 35,  true,  42, 17640,'high',  NOW() - INTERVAL '2 minutes'),
          ('Heat Stress',      'Hyderabad', '500001', 44.1, 42,  true,  19,  5890,'high',  NOW() - INTERVAL '8 minutes'),
          ('AQI Warning',      'Delhi',     '110092',387,   350, true,  28,  5320,'high',  NOW() - INTERVAL '15 minutes'),
          ('Waterlogging',     'Chennai',   '600028', 82,   35,  true,  42, 21000,'high',  NOW() - INTERVAL '22 minutes'),
          ('Platform Downtime','Mumbai',    '400053', 95,   90,  true,  31,  7750,'medium', NOW() - INTERVAL '31 minutes'),
          ('Zone Curfew',      'Delhi',     '110001',  1,    1,  true,  22,  4400,'high',  NOW() - INTERVAL '45 minutes'),
          ('Heavy Rainfall',   'Mumbai',    '400012', 28,   35,  false,  0,     0,'low',   NOW() - INTERVAL '1 hour'),
          ('Heat Stress',      'Jaipur',    '302001', 39,   42,  false,  0,     0,'medium', NOW() - INTERVAL '2 hours')
        ON CONFLICT DO NOTHING
      `);
      results.push("✅ seed disruption events inserted");
    }

    // ── SEED: Fraud cases ──────────────────────────────────────────────────
    const { rows: fraudCount } = await query(`SELECT COUNT(*) FROM fraud_cases`);
    if (parseInt(fraudCount[0].count) === 0) {
      await query(`
        INSERT INTO fraud_cases
          (case_id, worker_name, pin_code, trigger_type, fraud_score, signals, status, claim_amount)
        VALUES
          ('FRD-041','Anand S.','600028','Waterlogging',87,
           '[
             {"label":"GPS vs flood zone","value":94,"desc":"Location 2.4km outside declared flood zone at trigger time","flag":true},
             {"label":"Claim frequency","value":62,"desc":"4th claim in 6 weeks — above zone average of 1.2","flag":true},
             {"label":"Activity pattern","value":71,"desc":"App showed active deliveries during claimed disruption","flag":true},
             {"label":"Historical baseline","value":38,"desc":"Prior claims aligned with zone disruptions","flag":false}
           ]','pending', 500),
          ('FRD-042','Priya M.','110001','AQI Warning',54,
           '[
             {"label":"GPS vs AQI zone","value":22,"desc":"Location matches AQI-affected zone accurately","flag":false},
             {"label":"Claim frequency","value":81,"desc":"3 claims in 8 days — statistical anomaly","flag":true},
             {"label":"Activity pattern","value":43,"desc":"App offline during trigger window — consistent","flag":false},
             {"label":"Duplicate check","value":66,"desc":"Similar claim pattern detected across 2 accounts","flag":true}
           ]','pending', 190),
          ('FRD-043','Mohan R.','400053','Platform Downtime',91,
           '[
             {"label":"Duplicate submission","value":98,"desc":"Identical claim submitted via 2 device fingerprints","flag":true},
             {"label":"GPS vs zone","value":88,"desc":"Location metadata inconsistent across submissions","flag":true},
             {"label":"Earnings baseline","value":74,"desc":"Claimed amount 3x higher than 12-week average earnings","flag":true},
             {"label":"Platform logs","value":55,"desc":"Partial platform activity logged during outage window","flag":true}
           ]','pending', 250)
        ON CONFLICT (case_id) DO NOTHING
      `);
      results.push("✅ seed fraud cases inserted");
    }

    // ── SEED: Trigger alerts feed ──────────────────────────────────────────
    const { rows: alertCount } = await query(`SELECT COUNT(*) FROM trigger_alerts`);
    if (parseInt(alertCount[0].count) === 0) {
      await query(`
        INSERT INTO trigger_alerts
          (alert_id, alert_type, city, pin_code, severity, title, description, value, threshold, triggered, created_at)
        VALUES
          ('ALT001','rain',     'Chennai',   '600028','high',  'Heavy Rainfall Alert',  '58mm in 2 hrs — threshold crossed',       58,  35,  true,  NOW() - INTERVAL '2 min'),
          ('ALT002','heat',     'Hyderabad', '500001','high',  'Heat Stress Index',      'Feels-like 44°C — outdoor work unsafe',   44,  42,  true,  NOW() - INTERVAL '8 min'),
          ('ALT003','aqi',      'Delhi',     '110092','medium','Severe AQI Warning',     'AQI 387 — Very Poor air quality',         387, 350, true,  NOW() - INTERVAL '15 min'),
          ('ALT004','flood',    'Chennai',   '600028','high',  'Waterlogging Alert',     'Pin-code 600028 — Red alert issued',      82,  35,  true,  NOW() - INTERVAL '22 min'),
          ('ALT005','platform', 'Mumbai',    '400053','medium','Platform Downtime',      'Swiggy outage detected — 95 min',         95,  90,  true,  NOW() - INTERVAL '31 min'),
          ('ALT006','curfew',   'Delhi',     '110001','high',  'Local Curfew',           'Section 144 — Shahdara zone',             1,   1,   true,  NOW() - INTERVAL '45 min')
        ON CONFLICT (alert_id) DO NOTHING
      `);
      results.push("✅ seed trigger alerts inserted");
    }

    // ── VIEWS for analytics ─────────────────────────────────────────────────
    await query(`
      CREATE OR REPLACE VIEW insurer_stats_view AS
      SELECT
        (SELECT COUNT(*) FROM users WHERE role = 'worker') AS total_workers,
        (SELECT COUNT(*) FROM policies WHERE active = true) AS active_policies,
        (SELECT COALESCE(SUM(premium), 0) FROM policies WHERE active = true) AS weekly_premium_run_rate,
        (SELECT COUNT(*) FROM claims WHERE created_at >= NOW() - INTERVAL '7 days') AS claims_this_week,
        (SELECT COALESCE(SUM(amount), 0) FROM claims WHERE created_at >= NOW() - INTERVAL '7 days') AS claims_paid_this_week,
        (SELECT COUNT(*) FROM fraud_cases WHERE status = 'pending') AS fraud_pending,
        (SELECT COUNT(*) FROM fraud_cases WHERE fraud_score > 75 AND status = 'pending') AS fraud_high_risk
    `);
    results.push("✅ insurer_stats_view created");

    await query(`
      CREATE OR REPLACE VIEW zone_risk_view AS
      SELECT
        pin_code,
        city,
        COUNT(*) AS total_claims,
        SUM(amount) AS total_payout,
        AVG(amount)::INT AS avg_payout,
        MAX(created_at) AS last_claim_at
      FROM claims
      GROUP BY pin_code, city
    `);
    results.push("✅ zone_risk_view created");

    return Response.json({
      success: true,
      message: "All tables, indexes, triggers, views, and seed data ready",
      details: results,
    });
  } catch (err) {
    console.error("DB setup error:", err);
    return Response.json({
      success: false,
      error: err.message,
      completed: results,
    }, { status: 500 });
  }
}