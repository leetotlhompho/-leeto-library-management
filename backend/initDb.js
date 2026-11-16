// Creates the database + tables from schema.sql.
// Runs automatically when the server starts, or manually with:  npm run init-db
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();
const dir = path.dirname(fileURLToPath(import.meta.url));

export async function initDb() {
  const sql = fs.readFileSync(path.join(dir, "schema.sql"), "utf8");
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    multipleStatements: true,
  });
  try {
    await conn.query(sql);
  } finally {
    await conn.end();
  }
}

// When run directly (npm run init-db)
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  initDb()
    .then(() => console.log("Database and tables are ready."))
    .catch((e) => { console.error("init-db failed:", e.code, e.message); process.exit(1); });
}
