import { Pool } from "pg";

/**
 * Neon PostgreSQL connection pool.
 * Neon requires SSL and has specific connection string format:
 * postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/dbname?sslmode=require
 *
 * Set DATABASE_URL in your environment variables.
 */

let pool;

export function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error(
        "DATABASE_URL is not set. Add your Neon connection string to environment variables."
      );
    }

    // Neon requires SSL — detect and configure correctly
    const isNeon = connectionString.includes("neon.tech");
    const isLocalhost = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");

    pool = new Pool({
      connectionString,
      ssl: isLocalhost
        ? false
        : {
            rejectUnauthorized: !isNeon, // Neon uses self-signed in some regions
            sslmode: "require",
          },
      // Neon serverless: keep pool small to avoid "too many connections"
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      // Neon cold-start can take ~2s on free tier
      statement_timeout: 15000,
    });

    pool.on("error", (err) => {
      console.error("Unexpected DB pool error:", err);
    });

    pool.on("connect", () => {
      if (process.env.NODE_ENV !== "production") {
        console.log("✅ DB pool: new connection to Neon established");
      }
    });
  }

  return pool;
}

/**
 * Execute a parameterized query with automatic retry on connection failure.
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @param {number} retries - Number of retries (default 2)
 */
export async function query(text, params, retries = 2) {
  const client = getPool();

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await client.query(text, params);
      return result;
    } catch (err) {
      const isRetryable =
        err.code === "ECONNRESET" ||
        err.code === "ETIMEDOUT" ||
        err.code === "ENOTFOUND" ||
        err.message?.includes("connection") ||
        err.message?.includes("timeout");

      if (isRetryable && attempt < retries) {
        const delay = (attempt + 1) * 500;
        console.warn(`DB query failed (attempt ${attempt + 1}), retrying in ${delay}ms:`, err.message);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      throw err;
    }
  }
}

/**
 * Execute multiple queries in a transaction.
 * @param {Function} fn - Async function receiving a `queryFn` for transactional queries
 */
export async function withTransaction(fn) {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await fn((text, params) => client.query(text, params));
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Health check — verifies DB connection is alive.
 */
export async function healthCheck() {
  try {
    const { rows } = await query("SELECT NOW() as time, version() as version");
    return { ok: true, time: rows[0].time, version: rows[0].version };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}