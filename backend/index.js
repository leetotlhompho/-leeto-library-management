import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import booksRouter from "./routes/books.js";
import usersRouter from "./routes/users.js";
import transactionsRouter from "./routes/transactions.js";
import authRouter from "./routes/auth.js";
import { initDb } from "./initDb.js";

dotenv.config();

const app = express();

// Middleware required by the brief
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

app.get("/", (req, res) => res.json({ status: "Library API is running" }));

app.use("/books", booksRouter);
app.use("/users", usersRouter);
app.use("/transactions", transactionsRouter);
app.use("/auth", authRouter);

app.use((req, res) => res.status(404).json({ message: "Route not found." }));

// Central error handler: turns common database problems into a readable message
// (and prints the full error in this terminal).
const DB_HELP = {
  ECONNREFUSED: "Cannot connect to MySQL. Is the MySQL server running, and are DB_HOST / DB_PORT in backend/.env correct?",
  ER_ACCESS_DENIED_ERROR: "MySQL rejected the login. Check DB_USER and DB_PASSWORD in backend/.env.",
  ER_BAD_DB_ERROR: "Database not found. Restart the backend (it creates it) or run: npm run init-db",
  ER_NO_SUCH_TABLE: "A table is missing. Restart the backend (it creates the tables) or run: npm run init-db",
};
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: DB_HELP[err.code] || `Server error: ${err.code || err.message}` });
});

const PORT = process.env.PORT || 5000;

try {
  await initDb();
  console.log("Database and tables are ready.");
} catch (e) {
  console.error("\nCould not set up the database:", e.code, "-", e.message);
  console.error(DB_HELP[e.code] || "Check the MySQL settings in backend/.env.", "\n");
}

app.listen(PORT, () => console.log(`Library API listening on http://localhost:${PORT}`));
