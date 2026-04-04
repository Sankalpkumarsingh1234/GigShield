import { query, healthCheck, withTransaction } from "@/lib/db";
import { seedShowcaseData } from "@/lib/showcase";

export const dynamic = "force-dynamic";

export async function GET(request) {
  return POST(request);
}

export async function POST(request) {
  const results = [];
  const errors = [];
  const { searchParams } = new URL(request.url);
  const forceReseed = ["1", "true", "yes"].includes((searchParams.get("force") || "").toLowerCase());

  const health = await healthCheck();
  if (!health.ok) {
    return Response.json({
      success: false,
      error: `Cannot connect to Neon DB: ${health.error}`,
      hint: "Check DATABASE_URL in environment variables. Format: postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/dbname?sslmode=require",
    }, { status: 500 });
  }
  results.push(`DB connected: ${health.version?.split(" ")[0]} ${health.version?.split(" ")[1]}`);

  try {
    await query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);
    results.push("Extensions ready: pgcrypto, pg_trgm");

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
    results.push("users table ready");

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
      "ALTER TABLE policies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()",
    ]) {
      await query(col).catch(() => {});
    }
    await query(`CREATE INDEX IF NOT EXISTS policies_user_id_idx ON policies(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS policies_active_idx ON policies(active) WHERE active = true`);
    await query(`CREATE INDEX IF NOT EXISTS policies_tier_idx ON policies(tier)`);
    results.push("policies table ready");

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
    results.push("claims table ready");

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
    results.push("disruption_events table ready");

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
    results.push("fraud_cases table ready");

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
    results.push("premium_payments table ready");

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
    for (const col of [
      "ALTER TABLE trigger_alerts ADD COLUMN IF NOT EXISTS resolved BOOLEAN DEFAULT false",
      "ALTER TABLE trigger_alerts ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ",
      "ALTER TABLE trigger_alerts ADD COLUMN IF NOT EXISTS source VARCHAR(40) DEFAULT 'system'",
    ]) {
      await query(col).catch(() => {});
    }
    await query(`CREATE INDEX IF NOT EXISTS trigger_alerts_city_idx ON trigger_alerts(city)`);
    await query(`CREATE INDEX IF NOT EXISTS trigger_alerts_triggered_idx ON trigger_alerts(triggered)`);
    await query(`CREATE INDEX IF NOT EXISTS trigger_alerts_created_at_idx ON trigger_alerts(created_at DESC)`);
    results.push("trigger_alerts table ready");

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
    results.push("auto-update triggers ready");

    await query(`
      CREATE OR REPLACE VIEW insurer_kpi_view AS
      SELECT
        (SELECT COUNT(*) FROM users WHERE role = 'worker')::INT AS total_workers,
        (SELECT COUNT(*) FROM policies WHERE active = true)::INT AS active_policies,
        (SELECT COALESCE(SUM(premium), 0) FROM policies WHERE active = true)::INT AS weekly_premium_arr,
        (SELECT COUNT(*) FROM claims WHERE created_at >= NOW() - INTERVAL '7 days')::INT AS claims_count_7d,
        (SELECT COALESCE(SUM(amount), 0) FROM claims WHERE created_at >= NOW() - INTERVAL '7 days')::INT AS claims_payout_7d,
        (SELECT COALESCE(SUM(amount), 0) FROM claims)::INT AS total_payout_all_time,
        (SELECT COUNT(*) FROM fraud_cases WHERE status = 'pending')::INT AS fraud_pending,
        (SELECT COUNT(*) FROM fraud_cases WHERE fraud_score > 75 AND status = 'pending')::INT AS fraud_high_risk,
        (SELECT COUNT(*) FROM disruption_events WHERE triggered AND created_at >= NOW() - INTERVAL '24 hours')::INT AS events_today,
        (SELECT COUNT(*) FROM disruption_events WHERE triggered)::INT AS total_events_triggered
    `);

    await query(`
      CREATE OR REPLACE VIEW zone_claims_view AS
      SELECT
        city,
        pin_code,
        COUNT(*)::INT AS total_claims,
        COALESCE(SUM(amount), 0)::INT AS total_payout,
        AVG(amount)::INT AS avg_payout,
        COUNT(*) FILTER (WHERE status = 'paid')::INT AS paid_claims,
        MAX(created_at) AS last_claim_at
      FROM claims
      GROUP BY city, pin_code
    `);

    await query(`
      CREATE OR REPLACE VIEW weekly_claims_view AS
      SELECT
        DATE_TRUNC('week', created_at)::DATE AS week_start,
        COUNT(*)::INT AS claim_count,
        COALESCE(SUM(amount), 0)::INT AS total_payout,
        AVG(amount)::INT AS avg_payout,
        COUNT(DISTINCT worker_id)::INT AS unique_workers
      FROM claims
      WHERE created_at >= NOW() - INTERVAL '12 weeks'
      GROUP BY DATE_TRUNC('week', created_at)
      ORDER BY week_start ASC
    `);
    results.push("analytics views ready");

    const showcaseSummary = await withTransaction((txQuery) =>
      seedShowcaseData(txQuery, { force: forceReseed })
    );
    results.push(
      `showcase seeded: ${showcaseSummary.workers} workers, ${showcaseSummary.policies} policies, ${showcaseSummary.payments} payments, ${showcaseSummary.claims} claims, ${showcaseSummary.fraudCases} fraud cases, ${showcaseSummary.disruptions} disruption events, ${showcaseSummary.alerts} alerts`
    );
////////////
    await query(`
      CREATE TABLE IF NOT EXISTS workers (
        id           SERIAL PRIMARY KEY,
        worker_id    VARCHAR(50) UNIQUE NOT NULL,
        name         VARCHAR(100),
        platform     VARCHAR(20),
        pin_code     VARCHAR(10),
        tier         VARCHAR(20),
        earnings     INT,
        premium      INT,
        nfi          INT,
        active       BOOLEAN DEFAULT true,
        created_at   TIMESTAMP DEFAULT NOW()
      )
    `);
 
    await query(`
      CREATE TABLE IF NOT EXISTS claims (
        id            SERIAL PRIMARY KEY,
        claim_id      VARCHAR(20) UNIQUE NOT NULL,
        worker_id     VARCHAR(50),
        trigger_type  VARCHAR(50),
        trigger_value DECIMAL,
        city          VARCHAR(50),
        amount        INT,
        status        VARCHAR(20) DEFAULT 'paid',
        payout_id     VARCHAR(100),
        paid_at       TIMESTAMP,
        created_at    TIMESTAMP DEFAULT NOW()
      )
    `);
 
    await query(`
      CREATE TABLE IF NOT EXISTS disruption_events (
        id               SERIAL PRIMARY KEY,
        event_type       VARCHAR(50),
        city             VARCHAR(50),
        pin_code         VARCHAR(10),
        value            DECIMAL,
        threshold        DECIMAL,
        triggered        BOOLEAN,
        workers_affected INT DEFAULT 0,
        created_at       TIMESTAMP DEFAULT NOW()
      )
    `);
 
    await query(`
      CREATE TABLE IF NOT EXISTS fraud_cases (
        id           SERIAL PRIMARY KEY,
        case_id      VARCHAR(20) UNIQUE NOT NULL,
        worker_name  VARCHAR(100),
        pin_code     VARCHAR(10),
        trigger_type VARCHAR(50),
        fraud_score  INT,
        signals      JSONB,
        status       VARCHAR(20) DEFAULT 'pending',
        created_at   TIMESTAMP DEFAULT NOW()
      )
    `);
 
    // NEW: Payments table for PhonePe tracking
    await query(`
      CREATE TABLE IF NOT EXISTS payments (
        id               SERIAL PRIMARY KEY,
        transaction_id   VARCHAR(100) UNIQUE NOT NULL,
        user_id          VARCHAR(100),
        amount           DECIMAL NOT NULL,
        tier_id          VARCHAR(20),
        policy_id        VARCHAR(100),
        gateway_txn_id   VARCHAR(100),
        status           VARCHAR(20) DEFAULT 'pending',
        created_at       TIMESTAMP DEFAULT NOW(),
        updated_at       TIMESTAMP DEFAULT NOW()
      )
    `);
 
    // Seed claims
    const { rows: claimCount } = await query(`SELECT COUNT(*) FROM claims`);
    if (parseInt(claimCount[0].count) === 0) {
      await query(`
        INSERT INTO claims (claim_id, worker_id, trigger_type, trigger_value, city, amount, status, created_at) VALUES
          ('CLM001', 'WRK-DEFAULT', 'Heavy Rainfall',    58.2, 'Chennai',   420, 'paid', '2025-03-12'),
          ('CLM002', 'WRK-DEFAULT', 'Heat Stress',       44.1, 'Hyderabad', 310, 'paid', '2025-02-28'),
          ('CLM003', 'WRK-DEFAULT', 'AQI Warning',      387,   'Delhi',     190, 'paid', '2025-02-10'),
          ('CLM004', 'WRK-DEFAULT', 'Platform Downtime', 95,   'Mumbai',    250, 'paid', '2025-01-22'),
          ('CLM005', 'WRK-DEFAULT', 'Waterlogging',       0,   'Chennai',   500, 'paid', '2025-01-05')
        ON CONFLICT (claim_id) DO NOTHING
      `);
    }
 
    // Seed fraud cases
    const { rows: fraudCount } = await query(`SELECT COUNT(*) FROM fraud_cases`);
    if (parseInt(fraudCount[0].count) === 0) {
      await query(`
        INSERT INTO fraud_cases (case_id, worker_name, pin_code, trigger_type, fraud_score, signals, status) VALUES
          ('FRD-041', 'Anand S.', '600028', 'Waterlogging', 87,
           '[{"label":"GPS vs flood zone","value":94,"desc":"Location 2.4km outside declared flood zone at trigger time","flag":true},{"label":"Claim frequency","value":62,"desc":"4th claim in 6 weeks — above zone average of 1.2","flag":true},{"label":"Activity pattern","value":71,"desc":"App showed active deliveries during claimed disruption","flag":true},{"label":"Historical baseline","value":38,"desc":"Prior claims aligned with zone disruptions","flag":false}]',
           'pending'),
          ('FRD-042', 'Priya M.', '110001', 'AQI Warning', 54,
           '[{"label":"GPS vs AQI zone","value":22,"desc":"Location matches AQI-affected zone accurately","flag":false},{"label":"Claim frequency","value":81,"desc":"3 claims in 8 days — statistical anomaly","flag":true},{"label":"Activity pattern","value":43,"desc":"App offline during trigger window — consistent","flag":false},{"label":"Duplicate check","value":66,"desc":"Similar claim pattern detected across 2 accounts","flag":true}]',
           'pending'),
          ('FRD-043', 'Mohan R.', '400053', 'Platform Downtime', 91,
           '[{"label":"Duplicate submission","value":98,"desc":"Identical claim submitted via 2 device fingerprints","flag":true},{"label":"GPS vs zone","value":88,"desc":"Location metadata inconsistent across submissions","flag":true},{"label":"Earnings baseline","value":74,"desc":"Claimed amount 3x higher than 12-week average earnings","flag":true},{"label":"Platform logs","value":55,"desc":"Partial platform activity logged during outage window","flag":true}]',
           'pending')
        ON CONFLICT (case_id) DO NOTHING
      `);
    }
 
    return Response.json({ success: true, message: "Database initialized with payments table" });
  } catch (err) {
    console.error("DB setup error:", err);
    errors.push(err.message);
    return Response.json({
      success: false,
      error: err.message,
      completed: results,
      errors,
      hint: "Check the Neon console -> Tables to see current state",
    }, { status: 500 });
  }
}
