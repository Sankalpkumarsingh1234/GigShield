import { query, healthCheck } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return POST();
}

export async function POST() {
  const results = [];
  const errors = [];

  // ── Health check first ─────────────────────────────────────────────────
  const health = await healthCheck();
  if (!health.ok) {
    return Response.json({
      success: false,
      error: `Cannot connect to Neon DB: ${health.error}`,
      hint: "Check DATABASE_URL in environment variables. Format: postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/dbname?sslmode=require",
    }, { status: 500 });
  }
  results.push(`✅ Neon DB connected — ${health.version?.split(" ")[0]} ${health.version?.split(" ")[1]}`);

  try {
    // ── Extensions ──────────────────────────────────────────────────────
    await query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`); // for text search
    results.push("✅ Extensions: pgcrypto, pg_trgm");

    // ── USERS ─────────────────────────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        name          VARCHAR(100) NOT NULL,
        email         VARCHAR(255),
        password_hash TEXT,
        phone         VARCHAR(30),
        platform      VARCHAR(20)  NOT NULL DEFAULT 'Zomato'
                        CHECK (platform IN ('Zomato', 'Swiggy')),
        pin_code      VARCHAR(10)  NOT NULL DEFAULT '600001',
        earnings      INT          NOT NULL DEFAULT 0 CHECK (earnings >= 0),
        nfi           INT          NOT NULL DEFAULT 55 CHECK (nfi BETWEEN 0 AND 100),
        role          VARCHAR(20)  NOT NULL DEFAULT 'worker'
                        CHECK (role IN ('worker', 'insurer', 'admin')),
        created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    // Idempotent column additions
    for (const col of [
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255)",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(30)",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'worker'",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()",
    ]) {
      await query(col).catch(() => {});
    }
    await query(`
      CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx
      ON users (LOWER(email)) WHERE email IS NOT NULL
    `);
    await query(`CREATE INDEX IF NOT EXISTS users_pin_code_idx ON users(pin_code)`);
    await query(`CREATE INDEX IF NOT EXISTS users_platform_idx ON users(platform)`);
    results.push("✅ users table + indexes");

    // ── POLICIES ──────────────────────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS policies (
        id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id           UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tier              VARCHAR(20) NOT NULL DEFAULT 'standard'
                            CHECK (tier IN ('basic', 'standard', 'premium')),
        premium           INT         NOT NULL CHECK (premium > 0),
        max_payout        INT         NOT NULL CHECK (max_payout > 0),
        coverage          TEXT[]      NOT NULL DEFAULT '{}',
        active            BOOLEAN     NOT NULL DEFAULT true,
        activated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        next_billing_date TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
        total_paid_in     INT         NOT NULL DEFAULT 0,
        total_paid_out    INT         NOT NULL DEFAULT 0,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    for (const col of [
      "ALTER TABLE policies ADD COLUMN IF NOT EXISTS coverage TEXT[] DEFAULT '{}'",
      "ALTER TABLE policies ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ DEFAULT NOW()",
      "ALTER TABLE policies ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')",
      "ALTER TABLE policies ADD COLUMN IF NOT EXISTS total_paid_in INT DEFAULT 0",
      "ALTER TABLE policies ADD COLUMN IF NOT EXISTS total_paid_out INT DEFAULT 0",
    ]) {
      await query(col).catch(() => {});
    }
    await query(`CREATE INDEX IF NOT EXISTS policies_user_id_idx ON policies(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS policies_active_idx ON policies(active) WHERE active = true`);
    await query(`CREATE INDEX IF NOT EXISTS policies_tier_idx ON policies(tier)`);
    results.push("✅ policies table + indexes");

    // ── CLAIMS ────────────────────────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS claims (
        id              SERIAL      PRIMARY KEY,
        claim_id        VARCHAR(40) UNIQUE NOT NULL,
        worker_id       VARCHAR(60) NOT NULL,
        policy_id       UUID        REFERENCES policies(id) ON DELETE SET NULL,
        trigger_type    VARCHAR(60) NOT NULL,
        trigger_value   DECIMAL(10,2),
        city            VARCHAR(60),
        pin_code        VARCHAR(10),
        amount          INT         NOT NULL CHECK (amount > 0),
        status          VARCHAR(20) NOT NULL DEFAULT 'paid'
                          CHECK (status IN ('paid','pending','rejected','processing')),
        upi_ref         VARCHAR(60),
        fraud_score     INT         CHECK (fraud_score BETWEEN 0 AND 100),
        paid_at         TIMESTAMPTZ,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    for (const col of [
      "ALTER TABLE claims ADD COLUMN IF NOT EXISTS policy_id UUID REFERENCES policies(id) ON DELETE SET NULL",
      "ALTER TABLE claims ADD COLUMN IF NOT EXISTS pin_code VARCHAR(10)",
      "ALTER TABLE claims ADD COLUMN IF NOT EXISTS upi_ref VARCHAR(60)",
      "ALTER TABLE claims ADD COLUMN IF NOT EXISTS fraud_score INT",
      "ALTER TABLE claims ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ",
    ]) {
      await query(col).catch(() => {});
    }
    await query(`CREATE INDEX IF NOT EXISTS claims_worker_id_idx ON claims(worker_id)`);
    await query(`CREATE INDEX IF NOT EXISTS claims_created_at_idx ON claims(created_at DESC)`);
    await query(`CREATE INDEX IF NOT EXISTS claims_trigger_type_idx ON claims(trigger_type)`);
    await query(`CREATE INDEX IF NOT EXISTS claims_city_idx ON claims(city)`);
    results.push("✅ claims table + indexes");

    // ── DISRUPTION EVENTS ─────────────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS disruption_events (
        id               SERIAL      PRIMARY KEY,
        event_type       VARCHAR(60) NOT NULL,
        city             VARCHAR(60),
        pin_code         VARCHAR(10),
        value            DECIMAL(10,2) NOT NULL,
        threshold        DECIMAL(10,2) NOT NULL,
        triggered        BOOLEAN     NOT NULL DEFAULT false,
        workers_affected INT         NOT NULL DEFAULT 0,
        total_payout     INT         NOT NULL DEFAULT 0,
        severity         VARCHAR(20) DEFAULT 'medium'
                           CHECK (severity IN ('low','medium','high')),
        source           VARCHAR(40) DEFAULT 'api',
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    for (const col of [
      "ALTER TABLE disruption_events ADD COLUMN IF NOT EXISTS total_payout INT DEFAULT 0",
      "ALTER TABLE disruption_events ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'medium'",
      "ALTER TABLE disruption_events ADD COLUMN IF NOT EXISTS source VARCHAR(40) DEFAULT 'api'",
    ]) {
      await query(col).catch(() => {});
    }
    await query(`CREATE INDEX IF NOT EXISTS disruption_events_city_idx ON disruption_events(city)`);
    await query(`CREATE INDEX IF NOT EXISTS disruption_events_triggered_idx ON disruption_events(triggered)`);
    await query(`CREATE INDEX IF NOT EXISTS disruption_events_created_at_idx ON disruption_events(created_at DESC)`);
    results.push("✅ disruption_events table + indexes");

    // ── FRAUD CASES ───────────────────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS fraud_cases (
        id              SERIAL      PRIMARY KEY,
        case_id         VARCHAR(30) UNIQUE NOT NULL,
        worker_name     VARCHAR(100),
        worker_id       VARCHAR(60),
        pin_code        VARCHAR(10),
        trigger_type    VARCHAR(60),
        fraud_score     INT         NOT NULL DEFAULT 0 CHECK (fraud_score BETWEEN 0 AND 100),
        signals         JSONB       NOT NULL DEFAULT '[]',
        status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','approved','rejected','escalated')),
        reviewed_by     VARCHAR(100),
        reviewed_at     TIMESTAMPTZ,
        claim_id        VARCHAR(40) REFERENCES claims(claim_id) ON DELETE SET NULL,
        claim_amount    INT,
        notes           TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    for (const col of [
      "ALTER TABLE fraud_cases ADD COLUMN IF NOT EXISTS worker_id VARCHAR(60)",
      "ALTER TABLE fraud_cases ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(100)",
      "ALTER TABLE fraud_cases ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ",
      "ALTER TABLE fraud_cases ADD COLUMN IF NOT EXISTS claim_id VARCHAR(40)",
      "ALTER TABLE fraud_cases ADD COLUMN IF NOT EXISTS claim_amount INT",
      "ALTER TABLE fraud_cases ADD COLUMN IF NOT EXISTS notes TEXT",
    ]) {
      await query(col).catch(() => {});
    }
    await query(`CREATE INDEX IF NOT EXISTS fraud_cases_status_idx ON fraud_cases(status)`);
    await query(`CREATE INDEX IF NOT EXISTS fraud_cases_score_idx ON fraud_cases(fraud_score DESC)`);
    await query(`CREATE INDEX IF NOT EXISTS fraud_cases_worker_id_idx ON fraud_cases(worker_id)`);
    results.push("✅ fraud_cases table + indexes");

    // ── PREMIUM PAYMENTS ──────────────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS premium_payments (
        id              SERIAL      PRIMARY KEY,
        payment_id      VARCHAR(40) UNIQUE NOT NULL,
        policy_id       UUID        NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
        worker_id       VARCHAR(60) NOT NULL,
        amount          INT         NOT NULL CHECK (amount > 0),
        status          VARCHAR(20) NOT NULL DEFAULT 'success'
                          CHECK (status IN ('success','failed','pending','refunded')),
        upi_ref         VARCHAR(60),
        billing_period  DATE,
        failure_reason  TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS premium_payments_policy_id_idx ON premium_payments(policy_id)`);
    await query(`CREATE INDEX IF NOT EXISTS premium_payments_worker_id_idx ON premium_payments(worker_id)`);
    await query(`CREATE INDEX IF NOT EXISTS premium_payments_created_at_idx ON premium_payments(created_at DESC)`);
    results.push("✅ premium_payments table + indexes");

    // ── TRIGGER ALERTS (live feed) ────────────────────────────────────────
    await query(`
      CREATE TABLE IF NOT EXISTS trigger_alerts (
        id              SERIAL      PRIMARY KEY,
        alert_id        VARCHAR(40) UNIQUE NOT NULL,
        alert_type      VARCHAR(40) NOT NULL,
        city            VARCHAR(60),
        pin_code        VARCHAR(10),
        severity        VARCHAR(20) NOT NULL DEFAULT 'medium'
                          CHECK (severity IN ('low','medium','high')),
        title           VARCHAR(200) NOT NULL,
        description     TEXT,
        value           DECIMAL(10,2),
        threshold       DECIMAL(10,2),
        triggered       BOOLEAN     NOT NULL DEFAULT false,
        resolved        BOOLEAN     NOT NULL DEFAULT false,
        resolved_at     TIMESTAMPTZ,
        source          VARCHAR(40) DEFAULT 'system',
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS trigger_alerts_city_idx ON trigger_alerts(city)`);
    await query(`CREATE INDEX IF NOT EXISTS trigger_alerts_triggered_idx ON trigger_alerts(triggered)`);
    await query(`CREATE INDEX IF NOT EXISTS trigger_alerts_created_at_idx ON trigger_alerts(created_at DESC)`);
    results.push("✅ trigger_alerts table + indexes");

    // ── AUTO-UPDATE TRIGGER ───────────────────────────────────────────────
    await query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER LANGUAGE plpgsql AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$
    `);
    for (const tbl of ["users", "policies"]) {
      await query(`DROP TRIGGER IF EXISTS set_updated_at_${tbl} ON ${tbl}`);
      await query(`
        CREATE TRIGGER set_updated_at_${tbl}
        BEFORE UPDATE ON ${tbl}
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      `);
    }
    results.push("✅ Auto-update triggers (users, policies)");

    // ── ANALYTICS VIEWS ───────────────────────────────────────────────────
    await query(`
      CREATE OR REPLACE VIEW insurer_kpi_view AS
      SELECT
        (SELECT COUNT(*) FROM users WHERE role = 'worker')::INT                                 AS total_workers,
        (SELECT COUNT(*) FROM policies WHERE active = true)::INT                                AS active_policies,
        (SELECT COALESCE(SUM(premium), 0) FROM policies WHERE active = true)::INT               AS weekly_premium_arr,
        (SELECT COUNT(*) FROM claims WHERE created_at >= NOW() - INTERVAL '7 days')::INT        AS claims_count_7d,
        (SELECT COALESCE(SUM(amount), 0) FROM claims WHERE created_at >= NOW() - INTERVAL '7 days')::INT AS claims_payout_7d,
        (SELECT COALESCE(SUM(amount), 0) FROM claims)::INT                                      AS total_payout_all_time,
        (SELECT COUNT(*) FROM fraud_cases WHERE status = 'pending')::INT                        AS fraud_pending,
        (SELECT COUNT(*) FROM fraud_cases WHERE fraud_score > 75 AND status = 'pending')::INT   AS fraud_high_risk,
        (SELECT COUNT(*) FROM disruption_events WHERE triggered AND created_at >= NOW() - INTERVAL '24 hours')::INT AS events_today,
        (SELECT COUNT(*) FROM disruption_events WHERE triggered)::INT                           AS total_events_triggered
    `);

    await query(`
      CREATE OR REPLACE VIEW zone_claims_view AS
      SELECT
        city,
        pin_code,
        COUNT(*)::INT                                 AS total_claims,
        COALESCE(SUM(amount), 0)::INT                 AS total_payout,
        AVG(amount)::INT                              AS avg_payout,
        COUNT(*) FILTER (WHERE status = 'paid')::INT  AS paid_claims,
        MAX(created_at)                               AS last_claim_at
      FROM claims
      GROUP BY city, pin_code
    `);

    await query(`
      CREATE OR REPLACE VIEW weekly_claims_view AS
      SELECT
        DATE_TRUNC('week', created_at)::DATE          AS week_start,
        COUNT(*)::INT                                  AS claim_count,
        COALESCE(SUM(amount), 0)::INT                  AS total_payout,
        AVG(amount)::INT                               AS avg_payout,
        COUNT(DISTINCT worker_id)::INT                 AS unique_workers
      FROM claims
      WHERE created_at >= NOW() - INTERVAL '12 weeks'
      GROUP BY DATE_TRUNC('week', created_at)
      ORDER BY week_start ASC
    `);
    results.push("✅ Analytics views: insurer_kpi_view, zone_claims_view, weekly_claims_view");

    // ── SEED DATA ─────────────────────────────────────────────────────────

    // Seed claims (only if empty)
    const { rows: claimCount } = await query(`SELECT COUNT(*) FROM claims`);
    if (parseInt(claimCount[0].count) === 0) {
      await query(`
        INSERT INTO claims
          (claim_id, worker_id, trigger_type, trigger_value, city, pin_code, amount, status, upi_ref, fraud_score, paid_at, created_at)
        VALUES
          ('CLM001','WRK-DEFAULT','Heavy Rainfall',   58.2,'Chennai',  '600028',420,'paid','GS8734621091',5, NOW()-INTERVAL '21 days', NOW()-INTERVAL '21 days'),
          ('CLM002','WRK-DEFAULT','Heat Stress',       44.1,'Hyderabad','500001',310,'paid','GS9823471023',8, NOW()-INTERVAL '32 days', NOW()-INTERVAL '32 days'),
          ('CLM003','WRK-DEFAULT','AQI Warning',       387,'Delhi',    '110092',190,'paid','GS1234567890',12,NOW()-INTERVAL '50 days', NOW()-INTERVAL '50 days'),
          ('CLM004','WRK-DEFAULT','Platform Downtime',  95,'Mumbai',   '400053',250,'paid','GS9876543210',3, NOW()-INTERVAL '70 days', NOW()-INTERVAL '70 days'),
          ('CLM005','WRK-DEFAULT','Waterlogging',       82,'Chennai',  '600028',500,'paid','GS1122334455',7, NOW()-INTERVAL '87 days', NOW()-INTERVAL '87 days')
        ON CONFLICT (claim_id) DO NOTHING
      `);
      results.push("✅ Seeded 5 demo claims");
    }

    // Seed disruption events
    const { rows: evtCount } = await query(`SELECT COUNT(*) FROM disruption_events`);
    if (parseInt(evtCount[0].count) === 0) {
      await query(`
        INSERT INTO disruption_events
          (event_type, city, pin_code, value, threshold, triggered, workers_affected, total_payout, severity, created_at)
        VALUES
          ('Heavy Rainfall',   'Chennai',   '600028', 58.2, 35,  true,  42, 17640, 'high',   NOW()-INTERVAL '2 minutes'),
          ('Heat Stress',      'Hyderabad', '500001', 44.1, 42,  true,  19,  5890, 'high',   NOW()-INTERVAL '8 minutes'),
          ('AQI Warning',      'Delhi',     '110092', 387,  350, true,  28,  5320, 'high',   NOW()-INTERVAL '15 minutes'),
          ('Waterlogging',     'Chennai',   '600028', 82,   35,  true,  42, 21000, 'high',   NOW()-INTERVAL '22 minutes'),
          ('Platform Downtime','Mumbai',    '400053', 95,   90,  true,  31,  7750, 'medium', NOW()-INTERVAL '31 minutes'),
          ('Zone Curfew',      'Delhi',     '110001',  1,    1,  true,  22,  4400, 'high',   NOW()-INTERVAL '45 minutes'),
          ('Heavy Rainfall',   'Mumbai',    '400012', 28,   35,  false,  0,     0, 'low',    NOW()-INTERVAL '1 hour'),
          ('Heat Stress',      'Jaipur',    '302001', 39,   42,  false,  0,     0, 'medium', NOW()-INTERVAL '2 hours'),
          ('AQI Warning',      'Bangalore', '560034', 180,  350, false,  0,     0, 'low',    NOW()-INTERVAL '3 hours'),
          ('Heavy Rainfall',   'Hyderabad', '500001', 41,   35,  true,  15,  4650, 'medium', NOW()-INTERVAL '4 hours')
        ON CONFLICT DO NOTHING
      `);
      results.push("✅ Seeded 10 disruption events");
    }

    // Seed fraud cases
    const { rows: fraudCount } = await query(`SELECT COUNT(*) FROM fraud_cases`);
    if (parseInt(fraudCount[0].count) === 0) {
      await query(`
        INSERT INTO fraud_cases
          (case_id, worker_name, pin_code, trigger_type, fraud_score, signals, status, claim_amount, created_at)
        VALUES
          ('FRD-041','Anand S.','600028','Waterlogging',87,
           '[{"label":"GPS vs flood zone","value":94,"desc":"Location 2.4km outside declared flood zone at trigger time","flag":true},{"label":"Claim frequency","value":62,"desc":"4th claim in 6 weeks — above zone average of 1.2","flag":true},{"label":"Activity pattern","value":71,"desc":"App showed active deliveries during claimed disruption","flag":true},{"label":"Historical baseline","value":38,"desc":"Prior claims aligned with zone disruptions","flag":false}]',
           'pending', 500, NOW()-INTERVAL '2 hours'),
          ('FRD-042','Priya M.','110001','AQI Warning',54,
           '[{"label":"GPS vs AQI zone","value":22,"desc":"Location matches AQI-affected zone accurately","flag":false},{"label":"Claim frequency","value":81,"desc":"3 claims in 8 days — statistical anomaly","flag":true},{"label":"Activity pattern","value":43,"desc":"App offline during trigger window — consistent","flag":false},{"label":"Duplicate check","value":66,"desc":"Similar claim pattern detected across 2 accounts","flag":true}]',
           'pending', 190, NOW()-INTERVAL '5 hours'),
          ('FRD-043','Mohan R.','400053','Platform Downtime',91,
           '[{"label":"Duplicate submission","value":98,"desc":"Identical claim submitted via 2 device fingerprints","flag":true},{"label":"GPS vs zone","value":88,"desc":"Location metadata inconsistent across submissions","flag":true},{"label":"Earnings baseline","value":74,"desc":"Claimed amount 3x higher than 12-week average earnings","flag":true},{"label":"Platform logs","value":55,"desc":"Partial platform activity logged during outage window","flag":true}]',
           'pending', 250, NOW()-INTERVAL '8 hours')
        ON CONFLICT (case_id) DO NOTHING
      `);
      results.push("✅ Seeded 3 fraud cases");
    }

    // Seed trigger alerts feed
    const { rows: alertCount } = await query(`SELECT COUNT(*) FROM trigger_alerts`);
    if (parseInt(alertCount[0].count) === 0) {
      await query(`
        INSERT INTO trigger_alerts
          (alert_id, alert_type, city, pin_code, severity, title, description, value, threshold, triggered, created_at)
        VALUES
          ('ALT001','rain',     'Chennai',   '600028','high',  'Heavy Rainfall Alert',  '58mm in 2 hrs — threshold crossed',      58.2, 35,  true,  NOW()-INTERVAL '2 min'),
          ('ALT002','heat',     'Hyderabad', '500001','high',  'Heat Stress Index',      'Feels-like 44°C — outdoor work unsafe',  44.1, 42,  true,  NOW()-INTERVAL '8 min'),
          ('ALT003','aqi',      'Delhi',     '110092','medium','Severe AQI Warning',     'AQI 387 — Very Poor air quality',        387,  350, true,  NOW()-INTERVAL '15 min'),
          ('ALT004','flood',    'Chennai',   '600028','high',  'Waterlogging Alert',     'Pin-code 600028 — Red alert issued',     82,   35,  true,  NOW()-INTERVAL '22 min'),
          ('ALT005','platform', 'Mumbai',    '400053','medium','Platform Downtime',      'Swiggy outage detected — 95 min',        95,   90,  true,  NOW()-INTERVAL '31 min'),
          ('ALT006','curfew',   'Delhi',     '110001','high',  'Local Curfew',           'Section 144 — Shahdara zone',            1,    1,   true,  NOW()-INTERVAL '45 min')
        ON CONFLICT (alert_id) DO NOTHING
      `);
      results.push("✅ Seeded 6 trigger alerts");
    }

    return Response.json({
      success: true,
      message: "GigShield Neon DB fully initialized and seeded",
      details: results,
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    console.error("DB setup error:", err);
    errors.push(err.message);
    return Response.json({
      success: false,
      error: err.message,
      completed: results,
      errors,
      hint: "Check the Neon console → Tables to see current state",
    }, { status: 500 });
  }
}