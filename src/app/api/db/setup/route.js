import { query } from "@/lib/db";

export async function POST() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS workers (
        id           SERIAL PRIMARY KEY,
        worker_id    VARCHAR(20) UNIQUE NOT NULL,
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
        id           SERIAL PRIMARY KEY,
        claim_id     VARCHAR(20) UNIQUE NOT NULL,
        worker_id    VARCHAR(20),
        trigger_type VARCHAR(50),
        trigger_value DECIMAL,
        city         VARCHAR(50),
        amount       INT,
        status       VARCHAR(20) DEFAULT 'paid',
        created_at   TIMESTAMP DEFAULT NOW()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS disruption_events (
        id           SERIAL PRIMARY KEY,
        event_type   VARCHAR(50),
        city         VARCHAR(50),
        pin_code     VARCHAR(10),
        value        DECIMAL,
        threshold    DECIMAL,
        triggered    BOOLEAN,
        workers_affected INT DEFAULT 0,
        created_at   TIMESTAMP DEFAULT NOW()
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

    const { rows: claimCount } = await query(`SELECT COUNT(*) FROM claims`);
    if (parseInt(claimCount[0].count) === 0) {
      await query(`
        INSERT INTO claims (claim_id, worker_id, trigger_type, trigger_value, city, amount, status, created_at) VALUES
          ('CLM001', 'WRK-DEFAULT', 'Heavy Rainfall',    58.2, 'Chennai',   420, 'paid', '2025-03-12'),
          ('CLM002', 'WRK-DEFAULT', 'Heat Stress',       44.1, 'Hyderabad', 310, 'paid', '2025-02-28'),
          ('CLM003', 'WRK-DEFAULT', 'AQI Warning',      387,   'Delhi',     190, 'paid', '2025-02-10'),
          ('CLM004', 'WRK-DEFAULT', 'Platform Downtime', 95,   'Mumbai',    250, 'paid', '2025-01-22'),
          ('CLM005', 'WRK-DEFAULT', 'Waterlogging',      0,    'Chennai',   500, 'paid', '2025-01-05')
        ON CONFLICT (claim_id) DO NOTHING
      `);
    }

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

    return Response.json({ success: true, message: "Database initialized" });
  } catch (err) {
    console.error("DB setup error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
