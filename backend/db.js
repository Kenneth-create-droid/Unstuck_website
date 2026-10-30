import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

// Railway PostgreSQL when DATABASE_URL is configured.
// Otherwise, use local PostgreSQL.
const db = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
    })
  : new Pool({
      host: process.env.DB_HOST || "localhost",
      port: process.env.DB_PORT
        ? Number(process.env.DB_PORT)
        : 5432,
      database: process.env.DB_NAME || "course_help",
      user: process.env.DB_USER || "ken1",
      password: process.env.DB_PASSWORD,
    });

// Handle unexpected database connection errors.
db.on("error", (error) => {
  console.error("PostgreSQL connection error:", error);
});

export { db };
