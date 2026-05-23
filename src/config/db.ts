import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 50,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on("connect", () => {
  console.log("PostgreSQL connected");
});

pool.on("error", (err) => {
  console.error("PostgreSQL error:", err);
  process.exit(-1);
});

export default pool;
